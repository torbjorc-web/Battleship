(() => {
  'use strict';

  const { COLS, ROWS, SHIP_SPECS, ORIENTATIONS } = window.BattleshipConfig;
  const LEARNING_KEY = 'battleship-extra-hard-learning-v1';
  let learning = loadLearning();
  let confirmedHumanHits = new Set();
  let matchRecorded = false;

  function emptyLearning() {
    return { games: 0, humanShotCounts: Array(COLS * ROWS).fill(0), humanShipCounts: Array(COLS * ROWS).fill(0) };
  }

  function loadLearning() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(LEARNING_KEY) || 'null');
      if (!saved || !Array.isArray(saved.humanShotCounts) || !Array.isArray(saved.humanShipCounts)) return emptyLearning();
      return {
        games: Number.isFinite(saved.games) ? saved.games : 0,
        humanShotCounts: Array.from({ length: COLS * ROWS }, (_, index) => Number(saved.humanShotCounts[index]) || 0),
        humanShipCounts: Array.from({ length: COLS * ROWS }, (_, index) => Number(saved.humanShipCounts[index]) || 0)
      };
    } catch {
      return emptyLearning();
    }
  }

  function saveLearning() {
    try { window.localStorage.setItem(LEARNING_KEY, JSON.stringify(learning)); } catch { /* Keep learning in memory for this session. */ }
  }

  function coordinateIndex(key) {
    const [x, y] = key.split(',').map(Number);
    return y * COLS + x;
  }

  function keyOf(x, y) { return `${x},${y}`; }
  function parseKey(key) { return key.split(',').map(Number); }
  function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }
  function allCoordinates() {
    const cells = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) cells.push([x, y]);
    }
    return cells;
  }
  function allShipsSunk(board) {
    return board.ships.length === SHIP_SPECS.length && board.ships.every(ship => ship.hits.size === ship.length);
  }
  function shipCells(x, y, length, direction) {
    return Array.from({ length }, (_, index) => keyOf(x + direction.dx * index, y + direction.dy * index));
  }
  function isValidPlacement(board, cells, fleet) {
    const occupied = new Set(fleet.flatMap(ship => ship.cells));
    return cells.every(key => {
      const [x, y] = parseKey(key);
      return x >= 0 && x < COLS && y >= 0 && y < ROWS && !board.islands.has(key) && !occupied.has(key);
    });
  }

  function createFleet(board, avoidShotCounts = null) {
    let bestFleet = null;
    let bestScore = Infinity;
    const trials = avoidShotCounts ? 48 : 8;
    for (let attempt = 0; attempt < trials; attempt += 1) {
      const fleet = [];
      let failed = false;
      for (const spec of SHIP_SPECS) {
        let placed = false;
        for (let tries = 0; tries < 1800 && !placed; tries += 1) {
          const direction = randomItem(ORIENTATIONS);
          const x = Math.floor(Math.random() * COLS);
          const y = Math.floor(Math.random() * ROWS);
          const cells = shipCells(x, y, spec.length, direction);
          if (isValidPlacement(board, cells, fleet)) {
            fleet.push({ ...spec, cells, hits: new Set() });
            placed = true;
          }
        }
        if (!placed) {
          failed = true;
          break;
        }
      }
      if (failed) continue;
      if (!avoidShotCounts) return fleet;
      const score = fleet.flatMap(ship => ship.cells).reduce((sum, key) => sum + (avoidShotCounts[coordinateIndex(key)] || 0), 0);
      if (score < bestScore) {
        bestFleet = fleet;
        bestScore = score;
      }
    }
    return bestFleet;
  }

  function createMemory() {
    return { hits: new Set(), sunkLengths: [], sunkCells: new Set() };
  }

  function observeShot(memory, result, x, y) {
    const key = keyOf(x, y);
    if (result.result === 'hit') memory.hits.add(key);
    if (result.result === 'sunk' && result.ship) {
      memory.sunkLengths.push(result.ship.length);
      for (const cell of result.ship.cells) {
        memory.hits.delete(cell);
        memory.sunkCells.add(cell);
      }
    }
  }

  function availableTargets(board, rescueMode) {
    return allCoordinates().filter(([x, y]) => {
      const key = keyOf(x, y);
      return !board.shots.has(key) && (rescueMode ? board.islands.has(key) : !board.islands.has(key));
    });
  }

  function randomTarget(board, rescueMode) {
    const choices = availableTargets(board, rescueMode);
    return choices.length ? randomItem(choices) : null;
  }

  function mediumTarget(board, memory) {
    const choices = new Set();
    for (const hitKey of memory.hits) {
      const [x, y] = parseKey(hitKey);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nextX = x + dx;
          const nextY = y + dy;
          const nextKey = keyOf(nextX, nextY);
          if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS && !board.islands.has(nextKey) && !board.shots.has(nextKey)) choices.add(nextKey);
        }
      }
    }
    if (choices.size) return parseKey(randomItem([...choices]));
    return randomTarget(board, false);
  }

  function hardProbabilityMap(board, memory) {
    const remainingLengths = SHIP_SPECS.map(ship => ship.length);
    for (const length of memory.sunkLengths) {
      const index = remainingLengths.indexOf(length);
      if (index >= 0) remainingLengths.splice(index, 1);
    }
    const scores = new Map();
    for (const length of remainingLengths) {
      for (const direction of ORIENTATIONS) {
        for (let y = 0; y < ROWS; y += 1) {
          for (let x = 0; x < COLS; x += 1) {
            const cells = shipCells(x, y, length, direction);
            const fits = cells.every(key => {
              const [cellX, cellY] = parseKey(key);
              const shot = board.shots.get(key);
              return cellX >= 0 && cellX < COLS && cellY >= 0 && cellY < ROWS && !board.islands.has(key) && !memory.sunkCells.has(key) && shot !== 'miss' && shot !== 'rescue-miss';
            });
            if (!fits) continue;
            const weight = cells.some(key => memory.hits.has(key)) ? 6 : 1;
            for (const key of cells) {
              if (!board.shots.has(key)) scores.set(key, (scores.get(key) || 0) + weight);
            }
          }
        }
      }
    }
    return scores;
  }

  function hardTarget(board, memory, adaptive) {
    const scores = hardProbabilityMap(board, memory);
    const maxProbability = Math.max(0, ...scores.values());
    let bestScore = -1;
    let choices = [];
    for (const [key, probability] of scores) {
      let score = probability;
      if (adaptive && maxProbability > 0 && learning.games > 0) {
        const learned = learning.humanShipCounts[coordinateIndex(key)] || 0;
        score += (learned / learning.games) * maxProbability * .75;
      }
      if (score > bestScore) {
        bestScore = score;
        choices = [key];
      } else if (score === bestScore) {
        choices.push(key);
      }
    }
    if (choices.length) return parseKey(randomItem(choices));
    return mediumTarget(board, memory);
  }

  function chooseTarget(board, level, memory) {
    if (allShipsSunk(board)) return randomTarget(board, true);
    if (level === 'easy') return randomTarget(board, false);
    if (level === 'medium') return mediumTarget(board, memory);
    return hardTarget(board, memory, level === 'extra-hard');
  }

  function startMatch() {
    confirmedHumanHits = new Set();
    matchRecorded = false;
  }

  function recordHumanShot(x, y) {
    const index = y * COLS + x;
    learning.humanShotCounts[index] += 1;
    saveLearning();
  }

  function recordHumanHit(key) {
    if (confirmedHumanHits.has(key)) return;
    confirmedHumanHits.add(key);
    learning.humanShipCounts[coordinateIndex(key)] += 1;
    saveLearning();
  }

  function finishMatch(humanBoard) {
    if (matchRecorded) return;
    for (const ship of humanBoard.ships) {
      for (const key of ship.cells) {
        if (humanBoard.shots.get(key) === 'hit') recordHumanHit(key);
      }
    }
    learning.games += 1;
    matchRecorded = true;
    saveLearning();
  }

  window.BattleshipAI = {
    createFleet,
    createMemory,
    chooseTarget,
    observeShot,
    startMatch,
    recordHumanShot,
    recordHumanHit,
    finishMatch,
    learningGames: () => learning.games,
    learningShotCounts: () => [...learning.humanShotCounts]
  };
})();
