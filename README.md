# Virtual Game Table
This is a general-purpose, browser-based board game table, aimed at online game nights and rapid game development. No rules will ever be hard coded, so you can play however you like. The purpose of this is only to provide an intuitive, synchronized game table in everyone's browser.

## Starting and testing a server

This program runs directly from the source code (see [Releases](https://github.com/jaxankey/Virtual-Game-Table/releases)) so no compiling or binaries are required, other than downloading / installing [Node.js](https://nodejs.org/). This server has been tested on Linux & Windows, but should work on OSX as well.

Linux
 1. Install [Node.js](https://nodejs.org/): For me, this meant downloading the binaries, unpacking them in a convenient folder, adding the binary path to `.profile` (with a line like `PATH=$PATH:/path/to/node/bin`) then logging out & back in.
 2. From a console in the Virtual-Game-Table folder, run `start-server-linux` from the terminal. You can optionally specify a game and port, e.g., `start-server-linux poker 37000`.
 
Windows
 1. Install [Node.js](https://nodejs.org/): Download the appropriate windows installer and run it.
 2. Double-click `start-server-windows.bat` and optionally type the game name and port when prompted.
 
You can also launch a server directly with a command similar to `node server.js cards 37777`. A successfully booted server should declare something like `listening on port 37777` after initializing. At this point, you can test the server by opening a few browser windows side-by-side and typing in the address `localhost:37777`. Things moving around in one window should also move around in the other. Push a few buttons, click a few things, see what happens. 

You can do most things with the mouse and "shift" button, but it is *well* worth your time to learn the keyboard shortcuts. They make navigation effortless.

## A Minimal Game

To give a sense of how the engine works, here is the minimal code required to make a basic checkers game (see `games/minimal/game.js`):

```javascript
// Master list of all images. 
VGT.images = { paths: {
  hand          : 'images/hands/hand.png',             // Required for player hands
  fist          : 'images/hands/fist.png',             // Required for player hands
  board         : 'images/checkers/board.png',         // Checkered board
  checker_black : 'images/checkers/checker_black.png', // Black checker
  king_black    : 'images/checkers/king_black.png',    // Black king
  checker_red   : 'images/checkers/checker_red.png',   // Red checker
  king_red      : 'images/checkers/king_red.png',      // Red king
}}

// Create the Game instance
var game  = new VGT.Game();

// Add the game board to layer 0, and allow only the manager to move it
game.add_piece({layer:0, teams:['Manager']}, 'board');

// Add some checkers with a king symbol on the "back side" to layer 1
game.add_pieces(12, {layer:1}, ['checker_red',   'king_red'  ])
game.add_pieces(12, {layer:1}, ['checker_black', 'king_black'])

// Define the function that is called when someone clicks the 'new game' button.
// The file 'setup-standard.txt' was created by manually setting things up in the
// browser and pushing the 'save' button
function new_game() { game.load_state_from_server('setup-standard.txt') }
```

Even for the more complicated games (poker, e.g.), making the images usually takes more time than writing the code.


## Games

The games I have coded thus far include some basics:
 * `checkers`: Checkers & board (double-click pieces to king them)
 * `chess`: Chess pieces & board
 * `cards`: A standard deck of cards with 8 private viewing zones
 * `poker`: Same as cards, but with poker chips on the table and related functionality
 
and some more complicated systems:
 * `puerto-rico`: Puerto Rico (can't publish images, but you can find / scan them)

## Roadmap
 * Help page with keyboard controls. For now:
   * pan with `W` `A` `S` `D` 
   * rotate with `Q` `E` 
   * rotate pieces with `Shift`-`W` `A` `S` `D`
   * collect pieces with `C`
   * expand pieces with `X` (sort with `Shift`-`X`)
   * shuffle with `Z`
   * roll (like dice) with `R`
   * Save view with `Shift`-`1` to `9`, load view with `1` to `9`
   * Throw a tantrum with `Shift`-`End`
   * Poker: hover over buttons for hotkeys, and use `B` or `T` to bet/toss things into the pot
 * `arkham-horror`: Arkham Horror base set (can't publish images, but you can find / scan them)
 * `pandemic`: Pandemic base set plus some other stuff.
 * Go: Stones and a board
 * Chess clock object for timed games

Each of these games illustrate the functionalities of the main workhorse code in `browser.js` and `server.js`. So, if you're interested in writing your own games, I recommend playing with these to see what's possible, then looking at the `game.js` code for each to see how things are actually implemented. In particular, I would monkey with `minimal/game.js` first, since it's by far the simplest (see below)! Then check out `checkers`, `chess`, and (quite complex) `poker` or `puerto-rico`.

## Known issues
 * Firefox on Linux has horrible rendering speed that can grind to a halt, likely due to the webGL context being immediately lost for some reason, or the browser thinking things are not hardware accelerated. Recommend using chrome on Linux. Firefox works great on Windows.
 * Looks distorted on phones, not that this is intended for phones (yet?)

## Here to Help
Feel free to pester me if something isn't clear. I will likely be a bit slow to respond, but I believe in this project and will gladly update the comments in the code or help out within reason.

Things I will _never_ do:
 * Hard-code any rules or anti-cheat measures. You will _always_ be able to look at your oponent's hidden pieces or move them around when they are taking a poo. 
 * Convince my friends and family that the games I personally invent are worth playing.

More to come...
