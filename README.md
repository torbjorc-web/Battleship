# Battleships — Rescue Mission

A local browser game based on the island-map rules in the [Hasbro instruction sheet](https://www.hasbro.com/common/documents/430e4f3f6bfd10148a8ef35124427085/D58EFD5350569047F55BF8E284269834.pdf).

## Start the game

In a new VS Code terminal, type `Battleship`. The launcher opens `index.html` in your default browser. You can also run `Battleship.cmd` from the project folder.

## Play

Player 1 chooses whether Player 2 is a human or the computer. Computer difficulty options are Easy, Medium, Hard, and Extra hard. Extra hard learns locally from the human's shot patterns and confirmed ship locations, then adapts its targeting and fleet placement across matches.

Players can choose WWII fleets from the United States, United Kingdom, Japan, Germany, or the Soviet Union. The roster uses different historical ship classes and silhouettes for each navy. Ship lengths are balanced for play and are not scaled to real vessel lengths. Germany and the Soviet Union did not field a completed WWII aircraft carrier, so their five-cell ship is a battleship.

Each human player deploys five ships vertically or diagonally on sea squares and chooses an island for their captured sailor. Between human turns, the board is covered until the next player presses the handoff button. Sink the opposing fleet, then search the islands for the sailor.

The optional turn timer defaults to Off. If enabled, it starts after a player enters their turn; a timeout passes the turn without a shot. Hit and sinking sounds are generated in the browser and can be toggled off.

## Project layout

- `index.html` — game page and layout
- `styles/main.css` — interface, ocean, and ship styles
- `js/config.js` — board maps, ship definitions, and WWII fleet data
- `js/game.js` — game flow and interface
- `js/ai.js` — computer strategies and Extra hard learning
- `js/audio.js` — generated sound effects
- `js/timer.js` — optional turn countdown
- `assets/ships/` — original vector silhouettes
- `.vscode/settings.json` — adds the workspace to the integrated terminal's command path

## Historical references

- [U.S. Naval History and Heritage Command: USS Essex](https://www.history.navy.mil/browse-by-topic/ships/aircraft-carriers/uss-essex.html) and [USS Iowa](https://www.history.navy.mil/our-collections/photography/us-navy-ships/battleships/iowa-bb-61.html)
- [German Federal Archives: Reichs- and Kriegsmarine combat ships](https://www.bundesarchiv.de/im-archiv-recherchieren/archivgut-recherchieren/nach-themen/schwere-und-mittlere-kampfschiffe-der-reichs-und-kriegsmarine-1919-1945/)
- [Central Naval Museum: Soviet Navy in the Second World War](https://navalmuseum.ru/exposition/GWP/events_of_war)
- [Yamato Museum: battleship Yamato](https://yamato-museum.com/%E5%A4%A7%E5%92%8C%E3%83%9F%E3%83%A5%E3%83%BC%E3%82%B8%E3%82%A2%E3%83%A0%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6/10%E5%88%86%E3%81%AE1%E6%88%A6%E8%89%A6%E3%80%8C%E5%A4%A7%E5%92%8C%E3%80%8D/)
- [UK Government: HMS Illustrious](https://www.gov.uk/government/news/former-hms-illustrious-set-to-sail-on-her-final-voyage) and [Royal Navy: HMS Belfast](https://www.royalnavy.mod.uk/news/2021/may/20/20210520-belfast-back)
