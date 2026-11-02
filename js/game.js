(() => {
  'use strict';

  const { COLS, ROWS, LETTERS, SHIP_SPECS, ORIENTATIONS, TERRAIN, FACTIONS } = window.BattleshipConfig;
  const AI = window.BattleshipAI;
  const Audio = window.BattleshipAudio;
  const TurnTimer = window.BattleshipTimer;

  const ui = {
    app: document.querySelector('#app-shell'),
    gameModeLabel: document.querySelector('#game-mode-label'),
    handoff: document.querySelector('#handoff-screen'),
    handoffTitle: document.querySelector('#handoff-title'),
    handoffDescription: document.querySelector('#handoff-description'),
    handoffButton: document.querySelector('#handoff-button'),
    opponentType: document.querySelector('#opponent-type'),
    player1Navy: document.querySelector('#player1-navy'),
    player2Navy: document.querySelector('#player2-navy'),
    player2NavyLabel: document.querySelector('#player2-navy-label'),
    player2NavyControl: document.querySelector('#player2-navy-control'),
    navyNote: document.querySelector('#navy-note'),
    difficultyControl: document.querySelector('#difficulty-control'),
    computerDifficulty: document.querySelector('#computer-difficulty'),
    difficultyNote: document.querySelector('#difficulty-note'),
    turnTimer: document.querySelector('#turn-timer'),
    timerDisplay: document.querySelector('#turn-timer-display'),
    playerBoard: document.querySelector('#player-board'),
    enemyBoard: document.querySelector('#enemy-board'),
    ownTitle: document.querySelector('#own-title'),
    targetTitle: document.querySelector('#target-title'),
    ownKicker: document.querySelector('#own-kicker'),
    targetKicker: document.querySelector('#target-kicker'),
    ownStatus: document.querySelector('#own-status'),
    targetStatus: document.querySelector('#target-status'),
    ownBadge: document.querySelector('#own-badge'),
    targetBadge: document.querySelector('#target-badge'),
    message: document.querySelector('#game-message'),
    phase: document.querySelector('#phase-label'),
    turn: document.querySelector('#turn-indicator'),
    setup: document.querySelector('#fleet-setup'),
    setupPlayerTitle: document.querySelector('#setup-player-title'),
    roster: document.querySelector('#ship-roster'),
    progress: document.querySelector('#fleet-progress'),
    sailorProgress: document.querySelector('#sailor-progress'),
    orientationButton: document.querySelector('#orientation-button'),
    orientationArrow: document.querySelector('#orientation-arrow'),
    orientationLabel: document.querySelector('#orientation-label'),
    launch: document.querySelector('#launch-game'),
    randomize: document.querySelector('#randomize-fleet'),
    soundToggle: document.querySelector('#sound-toggle'),
    soundLabel: document.querySelector('#sound-label'),
    newGame: document.querySelector('#new-game'),
    fleetReport: document.querySelector('#fleet-report'),
    eventLog: document.querySelector('#event-log')
  };

  let boards = {};
  let ownBoard;
  let targetBoard;
  let activePlayer = 1;
  let selectedShip = 0;
  let orientationIndex = 0;
  let mode = 'setup';
  let screenCovered = true;
  let computerThinking = false;
  let winner = null;
  let logEntries = [];
  let computerMemory = AI.createMemory();
  let lastPreviewKey = '';

  function keyOf(x, y) { return `${x},${y}`; }
  function coordinatesLabel(x, y) { return `${LETTERS[x]}${y + 1}`; }
  function parseKey(key) { return key.split(',').map(Number); }
  function otherPlayer(player) { return player === 1 ? 2 : 1; }
  function computerMode() { return ui.opponentType.value === 'computer'; }
  function difficulty() { return ui.computerDifficulty.value; }
  function navyFor(player) { return player === 1 ? ui.player1Navy.value : ui.player2Navy.value; }
  function shipModel(spec, player) {
    const factionId = navyFor(player);
    return { ...spec, ...FACTIONS[factionId].ships[spec.id], id: spec.id, length: spec.length, factionId };
  }
  function fleetWithModels(fleet, player) {
    return fleet.map(ship => shipModel(ship, player));
  }

  function makeBoard(mapName, navy) {
    return {
      islands: new Set(TERRAIN[mapName].map(([x, y]) => keyOf(x, y))),
      navy,
      ships: [],
      shots: new Map(),
      man: null,
      manFound: false
    };
  }

  function syncBoards() {
    ownBoard = boards[activePlayer];
    targetBoard = boards[otherPlayer(activePlayer)];
  }

  function allCoordinates() {
    const cells = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) cells.push([x, y]);
    }
    return cells;
  }

  function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }
  function shipAt(board, x, y) { return board.ships.find(ship => ship.cells.includes(keyOf(x, y))); }
  function shipIsSunk(ship) { return ship.hits.size === ship.length; }
  function allShipsSunk(board) { return board.ships.length === SHIP_SPECS.length && board.ships.every(shipIsSunk); }
  function currentOrientation() { return ORIENTATIONS[orientationIndex]; }

  function shipCells(x, y, spec, orientation) {
    return Array.from({ length: spec.length }, (_, index) => keyOf(x + orientation.dx * index, y + orientation.dy * index));
  }

  function isValidPlacement(board, cells) {
    const occupied = new Set(board.ships.flatMap(ship => ship.cells));
    return cells.every(key => {
      const [x, y] = parseKey(key);
      return x >= 0 && x < COLS && y >= 0 && y < ROWS && !board.islands.has(key) && !occupied.has(key);
    });
  }

  function addLog(text, kind = 'normal') {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    logEntries.unshift({ time, text, kind });
    logEntries = logEntries.slice(0, 8);
    ui.eventLog.innerHTML = logEntries.map((entry, index) =>
      `<li class="${index === 0 ? 'latest' : ''} ${entry.kind}"><time>${entry.time}</time> · ${entry.text}</li>`
    ).join('');
  }

  function setMessage(text, phase) {
    ui.message.textContent = text;
    ui.phase.textContent = phase;
  }

  function updateTimerDisplay() {
    const remaining = TurnTimer.remaining();
    const visible = TurnTimer.isRunning() && mode === 'battle' && !screenCovered && !computerThinking;
    ui.timerDisplay.hidden = !visible;
    ui.timerDisplay.classList.toggle('urgent', visible && remaining <= 10);
    if (visible) {
      const minutes = Math.floor(remaining / 60);
      const seconds = String(remaining % 60).padStart(2, '0');
      ui.timerDisplay.textContent = `${minutes}:${seconds}`;
    }
  }

  function stopTurnTimer() {
    TurnTimer.stop();
    updateTimerDisplay();
  }

  function startTurnTimer() {
    stopTurnTimer();
    if (mode !== 'battle' || screenCovered || computerThinking || (computerMode() && activePlayer !== 1)) return;
    TurnTimer.start(Number(ui.turnTimer.value), updateTimerDisplay, handleTurnTimeout);
    updateTimerDisplay();
  }

  function handleTurnTimeout() {
    updateTimerDisplay();
    if (mode !== 'battle' || screenCovered) return;
    addLog(`Player ${activePlayer} ran out of time. The turn passes without a shot.`);
    if (computerMode() && activePlayer === 1) {
      beginComputerTurn();
    } else {
      showHandoff(otherPlayer(activePlayer), 'turn');
    }
  }

  function buildGrid(element, board, role) {
    const isTarget = role === 'target';
    const html = ['<span class="axis-label axis-corner" aria-hidden="true">·</span>'];
    for (let x = 0; x < COLS; x += 1) html.push(`<span class="axis-label" aria-hidden="true">${LETTERS[x]}</span>`);

    for (let y = 0; y < ROWS; y += 1) {
      html.push(`<span class="axis-label row-label" aria-hidden="true">${y + 1}</span>`);
      for (let x = 0; x < COLS; x += 1) {
        const key = keyOf(x, y);
        const isIsland = board.islands.has(key);
        const shot = board.shots.get(key);
        const ship = shipAt(board, x, y);
        const ownShip = !isTarget && Boolean(ship);
        const sunk = ship && shipIsSunk(ship);
        const manVisible = !isTarget && board.man === key && !board.manFound;
        const classes = ['cell', isIsland ? 'island' : 'sea'];
        if (ownShip) classes.push('own-ship', `ship-${ship.id}`, `model-${ship.icon}`, `navy-${board.navy}`);
        if (shot === 'hit') classes.push(sunk ? 'sunk' : 'hit');
        if (shot === 'miss') classes.push('miss');
        if (shot === 'rescue-miss') classes.push('rescue-miss');
        if (shot === 'rescue-hit') classes.push('rescue-hit');
        if (manVisible) classes.push('man-visible');

        const targetMode = isTarget && mode === 'battle' && !screenCovered && !computerThinking;
        const rescueMode = targetMode && allShipsSunk(board);
        const canTarget = targetMode && !shot && (rescueMode ? isIsland : !isIsland);
        if (canTarget) classes.push('targetable');
        const playerLabel = isTarget ? otherPlayer(activePlayer) : activePlayer;
        const label = `Player ${playerLabel}'s field ${coordinatesLabel(x, y)}, ${isIsland ? 'island' : 'sea'}${ownShip ? `, ${ship.name}` : ''}${manVisible ? ', captured sailor' : ''}${shot ? `, ${shot.replace('-', ' ')}` : ''}${canTarget ? ', available target' : ''}`;
        const disabled = isTarget ? !canTarget : mode !== 'setup' || screenCovered;
        html.push(`<button type="button" class="${classes.join(' ')}" data-x="${x}" data-y="${y}" data-role="${role}" role="gridcell" aria-label="${label}"${disabled ? ' disabled' : ''}></button>`);
      }
    }
    element.innerHTML = html.join('');
  }

  function renderRoster() {
    ui.roster.innerHTML = SHIP_SPECS.map((spec, index) => {
      const ship = ownBoard.ships.find(item => item.id === spec.id);
      const model = shipModel(spec, activePlayer);
      const selected = mode === 'setup' && !screenCovered && index === selectedShip && !ship;
      const className = ['roster-ship', `navy-${model.factionId}`, selected ? 'selected' : '', ship ? 'placed' : ''].filter(Boolean).join(' ');
      return `<div class="${className}" title="${model.name}" aria-label="${model.name}, ${ship ? 'placed' : 'not placed'}"><span class="ship-silhouette"><img class="ship-icon" src="assets/ships/${model.icon}.svg" alt="" aria-hidden="true"></span><span class="roster-name">${ship ? ship.short : model.short}<small>${ship ? 'DEPLOYED' : `${spec.length} CELLS`}</small></span></div>`;
    }).join('');

    const ready = ownBoard.ships.length === SHIP_SPECS.length && Boolean(ownBoard.man);
    const isComputer = computerMode();
    ui.setupPlayerTitle.textContent = `Player ${activePlayer}'s fleet`;
    ui.progress.textContent = `${ownBoard.ships.length} / ${SHIP_SPECS.length} PLACED`;
    ui.sailorProgress.textContent = ownBoard.man ? `SAILOR · ${coordinatesLabel(...parseKey(ownBoard.man))}` : 'SAILOR · CHOOSE ISLAND';
    const launchLabel = activePlayer === 1 && isComputer ? 'Start battle' : activePlayer === 1 ? 'Pass to Player 2' : 'Start battle';
    ui.launch.innerHTML = `${launchLabel} <span aria-hidden="true">→</span>`;
    ui.launch.disabled = !ready || mode !== 'setup' || screenCovered;
    ui.roster.setAttribute('aria-label', `Player ${activePlayer}: ${ownBoard.ships.length} of ${SHIP_SPECS.length} ships deployed`);
    ui.opponentType.disabled = mode !== 'setup' || activePlayer !== 1 || screenCovered;
    ui.computerDifficulty.disabled = !isComputer || mode !== 'setup' || activePlayer !== 1 || screenCovered;
    ui.turnTimer.disabled = mode !== 'setup' || activePlayer !== 1 || screenCovered;
    ui.player1Navy.disabled = mode !== 'setup' || activePlayer !== 1 || screenCovered || ownBoard.ships.length > 0;
    const canChoosePlayer2Navy = mode === 'setup' && !screenCovered && ((isComputer && activePlayer === 1) || (!isComputer && activePlayer === 2 && ownBoard.ships.length === 0));
    ui.player2Navy.disabled = !canChoosePlayer2Navy;
    ui.player2NavyLabel.textContent = isComputer ? 'COMPUTER NAVY' : 'PLAYER 2 NAVY';
    ui.difficultyControl.hidden = !isComputer;
    ui.difficultyNote.hidden = !isComputer || difficulty() !== 'extra-hard';
    const learnedGames = AI.learningGames();
    ui.difficultyNote.textContent = learnedGames
      ? `Learns locally from ${learnedGames} previous match${learnedGames === 1 ? '' : 'es'}.`
      : 'Learns locally from your shot and fleet patterns.';
    const notes = [FACTIONS[ui.player1Navy.value].note, FACTIONS[ui.player2Navy.value].note].filter(Boolean);
    ui.navyNote.textContent = notes.length ? `Historical model names; game-balanced lengths. ${[...new Set(notes)].join(' ')}` : 'Historical model names; grid lengths are balanced for play.';
  }

  function renderFleetReport() {
    const ownShips = SHIP_SPECS.map(spec => {
      const ship = ownBoard.ships.find(item => item.id === spec.id);
      const model = shipModel(spec, activePlayer);
      if (!ship) return `<div class="report-ship"><div class="report-name">${model.short}</div><div class="report-state">Not deployed</div></div>`;
      const state = shipIsSunk(ship) ? 'Sunk' : ship.hits.size ? `${ship.hits.size} hit${ship.hits.size > 1 ? 's' : ''}` : 'Operational';
      const statusClass = shipIsSunk(ship) ? 'sunk' : ship.hits.size ? 'damaged' : '';
      return `<div class="report-ship ${statusClass}"><div class="report-name">${ship.short}</div><div class="report-state">${state}</div></div>`;
    });
    const sunkShips = targetBoard.ships.filter(shipIsSunk).map(ship =>
      `<div class="report-ship sunk"><div class="report-name">P${otherPlayer(activePlayer)} · ${ship.short}</div><div class="report-state">Sunk</div></div>`
    );
    const unknownCount = Math.max(0, SHIP_SPECS.length - sunkShips.length);
    const unknownShips = Array.from({ length: unknownCount }, (_, index) =>
      `<div class="report-ship unknown"><div class="report-name">Enemy contact ${index + 1}</div><div class="report-state">Unidentified</div></div>`
    );
    ui.fleetReport.innerHTML = [...ownShips, ...sunkShips, ...unknownShips].join('');
  }

  function render() {
    boards[1].navy = ui.player1Navy.value;
    boards[2].navy = ui.player2Navy.value;
    syncBoards();
    const opponent = otherPlayer(activePlayer);
    const ownFaction = FACTIONS[ownBoard.navy];
    const targetFaction = FACTIONS[targetBoard.navy];
    ui.ownTitle.textContent = `Player ${activePlayer}'s field`;
    ui.targetTitle.textContent = `Player ${opponent}'s field`;
    ui.ownKicker.textContent = `PLAYER ${activePlayer} · ${ownFaction.short} · OPEN OCEAN`;
    ui.targetKicker.textContent = `PLAYER ${opponent} · ${targetFaction.short} · OPEN OCEAN`;
    ui.ownStatus.textContent = ownFaction.short;
    ui.targetStatus.textContent = `HIDDEN · ${targetFaction.short}`;
    ui.ownBadge.textContent = ownFaction.badge;
    ui.ownBadge.className = `navy-badge navy-${ownBoard.navy}`;
    ui.targetBadge.textContent = targetFaction.badge;
    ui.targetBadge.className = `navy-badge navy-${targetBoard.navy}`;
    ui.playerBoard.setAttribute('aria-label', `Player ${activePlayer}'s field`);
    ui.enemyBoard.setAttribute('aria-label', `Player ${opponent}'s field`);
    ui.gameModeLabel.textContent = computerMode() ? `PLAYER VS COMPUTER · ${difficulty().toUpperCase()}` : 'TWO PLAYERS · PASS AND PLAY';

    buildGrid(ui.playerBoard, ownBoard, 'own');
    buildGrid(ui.enemyBoard, targetBoard, 'target');
    renderRoster();
    renderFleetReport();
    ui.setup.hidden = mode !== 'setup' || screenCovered;
    ui.handoff.hidden = !screenCovered;
    ui.app.inert = screenCovered;
    ui.app.setAttribute('aria-hidden', String(screenCovered));
    updateTimerDisplay();

    if (mode === 'finished') {
      ui.turn.innerHTML = '<span class="status-light"></span> MISSION COMPLETE';
      const winnerName = computerMode() && winner === 2 ? 'Computer' : `Player ${winner}`;
      setMessage(`${winnerName} wins — the fleet is sunk and the sailor is rescued.`, 'VICTORY');
      return;
    }
    if (mode === 'setup') {
      ui.turn.innerHTML = `<span class="status-light"></span> PLAYER ${activePlayer} SETUP`;
      if (ownBoard.ships.length < SHIP_SPECS.length) {
        setMessage(`Player ${activePlayer}: deploy your ships on sea squares.`, 'FLEET DEPLOYMENT');
      } else if (!ownBoard.man) {
        setMessage(`Player ${activePlayer}: choose an island square for your captured sailor.`, 'PLACE THE SAILOR');
      } else {
        setMessage(`Player ${activePlayer}: fleet ready. Continue when you are ready.`, 'FLEET READY');
      }
      return;
    }

    if (computerThinking) {
      ui.turn.innerHTML = '<span class="status-light" style="background:var(--orange);box-shadow:0 0 9px rgba(255,150,112,.5)"></span> COMPUTER TURN';
      setMessage(`Computer is taking its ${difficulty()} turn…`, 'COMPUTER THINKING');
      return;
    }

    ui.turn.innerHTML = `<span class="status-light"></span> PLAYER ${activePlayer} TURN`;
    if (allShipsSunk(targetBoard)) {
      setMessage(`Player ${activePlayer}: the enemy fleet is down. Search the islands for the sailor.`, 'RESCUE THE SAILOR');
    } else {
      setMessage(`Player ${activePlayer}: choose an enemy sea square to fire.`, 'ATTACK · YOUR TURN');
    }
  }

  function clearPreview() {
    ui.playerBoard.querySelectorAll('.preview-valid, .preview-invalid').forEach(cell => {
      cell.classList.remove('preview-valid', 'preview-invalid');
    });
    lastPreviewKey = '';
  }

  function paintPreview(x, y) {
    if (mode !== 'setup' || screenCovered || ownBoard.ships.length === SHIP_SPECS.length) return;
    const origin = keyOf(x, y);
    if (lastPreviewKey === origin) return;
    clearPreview();
    lastPreviewKey = origin;
    const baseSpec = SHIP_SPECS[selectedShip];
    if (!baseSpec) return;
    const spec = shipModel(baseSpec, activePlayer);
    const cells = shipCells(x, y, spec, currentOrientation());
    const valid = isValidPlacement(ownBoard, cells);
    for (const key of cells) {
      const [cellX, cellY] = parseKey(key);
      const cell = ui.playerBoard.querySelector(`[data-x="${cellX}"][data-y="${cellY}"]`);
      if (cell) cell.classList.add(valid ? 'preview-valid' : 'preview-invalid');
    }
  }

  function selectNextUnplaced() {
    const next = SHIP_SPECS.findIndex(spec => !ownBoard.ships.some(ship => ship.id === spec.id));
    selectedShip = next < 0 ? SHIP_SPECS.length - 1 : next;
  }

  function placeShip(x, y) {
    if (mode !== 'setup' || screenCovered || ownBoard.ships.length >= SHIP_SPECS.length) return;
    const baseSpec = SHIP_SPECS[selectedShip];
    if (!baseSpec) return;
    const spec = shipModel(baseSpec, activePlayer);
    const cells = shipCells(x, y, spec, currentOrientation());
    if (!isValidPlacement(ownBoard, cells)) {
      setMessage('That ship does not fit there. Try another square or direction.', 'INVALID POSITION');
      return;
    }
    ownBoard.ships.push({ ...spec, cells, hits: new Set() });
    selectNextUnplaced();
    clearPreview();
    if (ownBoard.ships.length === SHIP_SPECS.length) {
      setMessage(`Player ${activePlayer}: choose an island square for your captured sailor.`, 'PLACE THE SAILOR');
    } else {
      setMessage(`Player ${activePlayer}: ${spec.name} placed. Deploy your next ship.`, 'FLEET DEPLOYMENT');
    }
    render();
  }

  function placeCapturedSailor(x, y) {
    if (mode !== 'setup' || screenCovered || ownBoard.ships.length !== SHIP_SPECS.length) return;
    const key = keyOf(x, y);
    if (!ownBoard.islands.has(key)) {
      setMessage('The captured sailor must be placed on an island square.', 'CHOOSE AN ISLAND');
      return;
    }
    ownBoard.man = key;
    ownBoard.manFound = false;
    setMessage(`Player ${activePlayer}: sailor positioned on ${coordinatesLabel(x, y)}. Continue when ready.`, 'SAILOR POSITIONED');
    render();
  }

  function autoDeploy() {
    if (mode !== 'setup' || screenCovered) return;
    const generatedFleet = AI.createFleet(ownBoard);
    if (!generatedFleet) {
      setMessage('Could not place this fleet. Start a new mission and try again.', 'DEPLOYMENT ERROR');
      return;
    }
    ownBoard.ships = fleetWithModels(generatedFleet, activePlayer);
    selectNextUnplaced();
    clearPreview();
    setMessage(`Player ${activePlayer}: fleet deployed. Choose an island for your captured sailor.`, 'FLEET READY');
    render();
  }

  function showHandoff(player, purpose) {
    stopTurnTimer();
    activePlayer = player;
    syncBoards();
    screenCovered = true;
    clearPreview();
    if (mode === 'setup') {
      selectNextUnplaced();
      orientationIndex = 0;
      ui.orientationLabel.textContent = ORIENTATIONS[orientationIndex].label;
      ui.orientationArrow.textContent = ORIENTATIONS[orientationIndex].arrow;
    }
    ui.handoffTitle.textContent = `Pass device to Player ${player}`;
    ui.handoffDescription.textContent = purpose === 'setup'
      ? `Player ${player}, press below when you are ready to set up your fleet.`
      : `Player ${player}, press below when you are ready to take your turn.`;
    ui.handoffButton.textContent = `Player ${player} — press to continue`;
    render();
    ui.handoffButton.focus();
  }

  function beginBattle() {
    mode = 'battle';
    computerThinking = false;
    computerMemory = AI.createMemory();
    AI.startMatch();
    addLog(computerMode() ? `Computer opponent ready: ${difficulty()} difficulty.` : 'Both fleets are ready. Player 1 has the first turn.');
    showHandoff(1, 'turn');
  }

  function finishSetup() {
    if (mode !== 'setup' || screenCovered || ownBoard.ships.length !== SHIP_SPECS.length || !ownBoard.man) return;
    addLog(`Player ${activePlayer} completed fleet setup.`);
    if (activePlayer === 1 && !computerMode()) {
      showHandoff(2, 'setup');
      return;
    }
    if (activePlayer === 1 && computerMode()) {
      const heatMap = difficulty() === 'extra-hard' ? AI.learningShotCounts() : null;
      const generatedFleet = AI.createFleet(boards[2], heatMap) || AI.createFleet(boards[2]) || [];
      boards[2].ships = fleetWithModels(generatedFleet, 2);
      boards[2].man = randomItem([...boards[2].islands]);
    }
    beginBattle();
  }

  function finishGame(winningPlayer, reason) {
    if (computerMode() && difficulty() === 'extra-hard') AI.finishMatch(boards[1]);
    mode = 'finished';
    winner = winningPlayer;
    activePlayer = computerMode() ? 1 : winningPlayer;
    computerThinking = false;
    screenCovered = false;
    stopTurnTimer();
    syncBoards();
    addLog(reason, 'victory');
    render();
  }

  function takeShot(attacker, board, x, y) {
    const key = keyOf(x, y);
    if (board.shots.has(key) || mode !== 'battle') return null;
    const defender = otherPlayer(attacker);

    if (allShipsSunk(board)) {
      if (!board.islands.has(key)) return null;
      if (key === board.man) {
        board.manFound = true;
        board.shots.set(key, 'rescue-hit');
        Audio.rescue();
        finishGame(attacker, `Player ${attacker} found Player ${defender}'s captured sailor at ${coordinatesLabel(x, y)}.`);
        return { result: 'rescue-hit', x, y };
      }
      board.shots.set(key, 'rescue-miss');
      addLog(`Player ${attacker} searched island ${coordinatesLabel(x, y)}. No sailor there.`);
      return { result: 'rescue-miss', x, y };
    }

    if (board.islands.has(key)) return null;
    const ship = shipAt(board, x, y);
    if (!ship) {
      board.shots.set(key, 'miss');
      addLog(`${computerMode() && attacker === 2 ? 'Computer' : `Player ${attacker}`} missed at ${coordinatesLabel(x, y)}.`);
      return { result: 'miss', x, y };
    }

    board.shots.set(key, 'hit');
    ship.hits.add(key);
    const sunk = shipIsSunk(ship);
    Audio.hit(sunk);
    const attackerName = computerMode() && attacker === 2 ? 'Computer' : `Player ${attacker}`;
    if (sunk) {
      addLog(`${attackerName} sank Player ${defender}'s ${ship.name} at ${coordinatesLabel(x, y)}.`, 'sink');
      if (allShipsSunk(board)) addLog(`${attackerName} destroyed the fleet. The sailor is on an island.`);
    } else {
      addLog(`${attackerName} scored a hit at ${coordinatesLabel(x, y)}.`, 'hit');
    }
    return { result: sunk ? 'sunk' : 'hit', x, y, ship };
  }

  function beginComputerTurn() {
    stopTurnTimer();
    computerThinking = true;
    render();
    window.setTimeout(computerTurn, 700);
  }

  function computerTurn() {
    if (mode !== 'battle' || !computerMode()) return;
    const target = AI.chooseTarget(boards[1], difficulty(), computerMemory);
    if (!target) {
      computerThinking = false;
      render();
      startTurnTimer();
      return;
    }
    const [x, y] = target;
    const result = takeShot(2, boards[1], x, y);
    if (result) {
      AI.observeShot(computerMemory, result, x, y);
      if (difficulty() === 'extra-hard' && (result.result === 'hit' || result.result === 'sunk')) {
        if (result.result === 'sunk' && result.ship) result.ship.cells.forEach(AI.recordHumanHit);
        else AI.recordHumanHit(keyOf(x, y));
      }
    }
    computerThinking = false;
    render();
    if (mode === 'battle') startTurnTimer();
  }

  function playerTarget(x, y) {
    if (mode !== 'battle' || screenCovered || computerThinking) return;
    const attacker = activePlayer;
    const result = takeShot(attacker, targetBoard, x, y);
    if (!result) return;
    if (computerMode() && difficulty() === 'extra-hard') AI.recordHumanShot(x, y);
    if (mode === 'finished') return;
    stopTurnTimer();
    if (computerMode() && attacker === 1) {
      beginComputerTurn();
    } else {
      showHandoff(otherPlayer(attacker), 'turn');
    }
  }

  function resetMission() {
    stopTurnTimer();
    boards = {
      1: makeBoard('player1', ui.player1Navy.value),
      2: makeBoard('player2', ui.player2Navy.value)
    };
    activePlayer = 1;
    selectedShip = 0;
    orientationIndex = 0;
    mode = 'setup';
    screenCovered = true;
    computerThinking = false;
    winner = null;
    logEntries = [];
    computerMemory = AI.createMemory();
    AI.startMatch();
    ui.orientationLabel.textContent = ORIENTATIONS[orientationIndex].label;
    ui.orientationArrow.textContent = ORIENTATIONS[orientationIndex].arrow;
    addLog('New mission ready. Player 1 sets up first.');
    syncBoards();
    ui.handoffTitle.textContent = 'Pass device to Player 1';
    ui.handoffDescription.textContent = 'Player 1, press below when you are ready to set up your fleet.';
    ui.handoffButton.textContent = 'Player 1 — press to continue';
    render();
    ui.handoffButton.focus();
  }

  ui.playerBoard.addEventListener('click', event => {
    const cell = event.target.closest('.cell');
    if (!cell || mode !== 'setup' || screenCovered) return;
    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);
    if (ownBoard.ships.length === SHIP_SPECS.length) placeCapturedSailor(x, y);
    else placeShip(x, y);
  });
  ui.playerBoard.addEventListener('pointerover', event => {
    const cell = event.target.closest('.cell');
    if (cell && mode === 'setup' && !screenCovered) paintPreview(Number(cell.dataset.x), Number(cell.dataset.y));
  });
  ui.playerBoard.addEventListener('pointerleave', clearPreview);
  ui.enemyBoard.addEventListener('click', event => {
    const cell = event.target.closest('.cell');
    if (cell && !cell.disabled) playerTarget(Number(cell.dataset.x), Number(cell.dataset.y));
  });
  ui.orientationButton.addEventListener('click', () => {
    if (mode !== 'setup' || screenCovered) return;
    orientationIndex = (orientationIndex + 1) % ORIENTATIONS.length;
    ui.orientationLabel.textContent = ORIENTATIONS[orientationIndex].label;
    ui.orientationArrow.textContent = ORIENTATIONS[orientationIndex].arrow;
    clearPreview();
  });
  ui.opponentType.addEventListener('change', render);
  ui.player1Navy.addEventListener('change', render);
  ui.player2Navy.addEventListener('change', render);
  ui.computerDifficulty.addEventListener('change', render);
  ui.turnTimer.addEventListener('change', updateTimerDisplay);
  ui.randomize.addEventListener('click', autoDeploy);
  ui.launch.addEventListener('click', finishSetup);
  ui.handoffButton.addEventListener('click', () => {
    screenCovered = false;
    render();
    if (mode === 'battle') startTurnTimer();
  });
  ui.newGame.addEventListener('click', resetMission);
  ui.soundToggle.addEventListener('click', () => {
    const enabled = !Audio.isEnabled();
    Audio.setEnabled(enabled);
    ui.soundToggle.setAttribute('aria-pressed', String(enabled));
    ui.soundToggle.setAttribute('aria-label', enabled ? 'Turn sound off' : 'Turn sound on');
    ui.soundLabel.textContent = enabled ? 'Sound on' : 'Sound off';
  });

  resetMission();
})();
