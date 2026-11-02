(() => {
  'use strict';

  window.BattleshipConfig = Object.freeze({
    COLS: 15,
    ROWS: 10,
    LETTERS: 'ABCDEFGHIJKLMNO',
    SHIP_SPECS: [
      { id: 'carrier', name: 'Aircraft Carrier', short: 'Carrier', length: 5 },
      { id: 'battleship', name: 'Battleship', short: 'Battleship', length: 4 },
      { id: 'weapons', name: 'Weapons Platform', short: 'Weapons Plat.', length: 3 },
      { id: 'submarine', name: 'Submarine', short: 'Submarine', length: 3 },
      { id: 'patrol', name: 'Patrol Boat', short: 'Patrol Boat', length: 2 }
    ],
    ORIENTATIONS: [
      { label: 'Vertical', arrow: '↓', dx: 0, dy: 1 },
      { label: 'Diagonal', arrow: '↘', dx: 1, dy: 1 },
      { label: 'Diagonal', arrow: '↙', dx: -1, dy: 1 }
    ],
    TERRAIN: {
      player1: [
        [1, 1], [2, 1], [1, 2], [2, 2], [7, 2], [8, 2], [8, 3],
        [12, 1], [13, 1], [12, 2], [4, 6], [5, 6], [4, 7], [5, 7], [10, 8], [11, 8], [11, 9]
      ],
      player2: [
        [2, 3], [3, 3], [2, 4], [7, 1], [8, 1], [7, 2], [8, 2],
        [11, 4], [12, 4], [12, 5], [1, 8], [2, 8], [1, 9], [13, 7], [14, 7], [13, 8], [14, 8]
      ]
    },
    FACTIONS: {
      usa: {
        name: 'United States Navy', short: 'USN', badge: 'USN',
        ships: {
          carrier: { name: 'Essex-class aircraft carrier', short: 'Essex', icon: 'aircraft-carrier' },
          battleship: { name: 'Iowa-class battleship', short: 'Iowa', icon: 'battleship' },
          weapons: { name: 'Baltimore-class heavy cruiser', short: 'Baltimore', icon: 'cruiser' },
          submarine: { name: 'Gato-class submarine', short: 'Gato', icon: 'submarine' },
          patrol: { name: 'Fletcher-class destroyer', short: 'Fletcher', icon: 'destroyer' }
        }
      },
      uk: {
        name: 'Royal Navy', short: 'ROYAL NAVY', badge: 'RN',
        ships: {
          carrier: { name: 'Illustrious-class aircraft carrier', short: 'Illustrious', icon: 'aircraft-carrier' },
          battleship: { name: 'King George V-class battleship', short: 'KGV', icon: 'battleship' },
          weapons: { name: 'Belfast / Town-class cruiser', short: 'Belfast', icon: 'cruiser' },
          submarine: { name: 'T-class submarine', short: 'T-class', icon: 'submarine' },
          patrol: { name: 'Tribal-class destroyer', short: 'Tribal', icon: 'destroyer' }
        }
      },
      japan: {
        name: 'Imperial Japanese Navy', short: 'IJN', badge: 'IJN',
        ships: {
          carrier: { name: 'Shōkaku-class aircraft carrier', short: 'Shōkaku', icon: 'aircraft-carrier' },
          battleship: { name: 'Yamato-class battleship', short: 'Yamato', icon: 'battleship' },
          weapons: { name: 'Mogami-class cruiser', short: 'Mogami', icon: 'cruiser' },
          submarine: { name: 'Type B1 submarine (I-15)', short: 'I-15', icon: 'submarine' },
          patrol: { name: 'Kagerō-class destroyer', short: 'Kagerō', icon: 'destroyer' }
        }
      },
      germany: {
        name: 'Kriegsmarine', short: 'KRIEGSMARINE', badge: 'KM',
        note: 'Germany had no completed WWII aircraft carrier; Bismarck fills the five-cell slot.',
        ships: {
          carrier: { name: 'Bismarck-class battleship', short: 'Bismarck', icon: 'battleship' },
          battleship: { name: 'Scharnhorst-class battleship', short: 'Scharnhorst', icon: 'battleship' },
          weapons: { name: 'Admiral Hipper-class heavy cruiser', short: 'Adm. Hipper', icon: 'cruiser' },
          submarine: { name: 'Type VII U-boat', short: 'Type VII', icon: 'submarine' },
          patrol: { name: 'Schnellboot (S-boot)', short: 'S-boot', icon: 'patrol-boat' }
        }
      },
      soviet: {
        name: 'Soviet Navy', short: 'SOVIET NAVY', badge: 'VMF',
        note: 'The Soviet fleet had no WWII aircraft carrier; Marat fills the five-cell slot.',
        ships: {
          carrier: { name: 'Marat / Gangut-class battleship', short: 'Marat', icon: 'battleship' },
          battleship: { name: 'Kirov-class cruiser', short: 'Kirov', icon: 'cruiser' },
          weapons: { name: 'Tashkent destroyer leader', short: 'Tashkent', icon: 'destroyer' },
          submarine: { name: 'Shchuka-class submarine', short: 'Shchuka', icon: 'submarine' },
          patrol: { name: 'G-5 torpedo boat', short: 'G-5', icon: 'patrol-boat' }
        }
      }
    }
  });
})();
