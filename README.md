# Virtual Game Table
This is a general-purpose, browser-based board game table, aimed at online game nights and rapid game development. No rules will ever be hard coded, so you can play however you like. The purpose of this is only to provide an intuitive, synchronized game table in everyone's browser.

## Starting and testing a server

This program runs directly from the source code (see [Releases](https://github.com/jaxankey/Virtual-Game-Table/releases)) so no compiling or binaries are required, other than downloading / installing [Node.js](https://nodejs.org/). This server has been tested on Linux & Windows, but should work on OSX as well.

Linux
 1. Install [Node.js](https://nodejs.org/): For me, this meant downloading the binaries, unpacking them in a convenient folder, adding the binary path to `.profile` (with a line like `PATH=$PATH:/path/to/node/bin`) then logging out & back in.
 2. From a console in the Virtual-Game-Table folder, run `start-server-linux` from the terminal. You can optionally specify a game and port, e.g., `start-server-linux poker 37000`.
 
Windows
 1. Install [Node.js](https://nodejs.org/): Download the appropriate windows installer and run it.
 2. Run `start-server-windows.bat` and optionally type the game name and port when prompted.
 
You can also launch a server directly with a command similar to `node server.js cards 37777`. A successfully booted server should declare something like `listening on port 37777` after initializing. At this point, you can test the server by opening a few browser windows side-by-side and typing in the address `localhost:37777`. Things moving around in one window should also move around in the other. Push a few buttons, click a few things, see what happens. 

You can do most things with the mouse and "shift" button, but it is *well* worth your time to learn the keyboard shortcuts. They make navigation effortless.

## Games

The games I have coded thus far include some basics:
 * `checkers`: Checkers & board (double-click pieces to king them)
 * `chess`: Chess pieces & board
 * `cards`: A standard deck of cards with 8 private viewing zones
 * `poker`: Same as cards, but with poker chips on the table and related functionality
 
and some more complicated systems:
 * `puerto-rico`: Puerto Rico (can't publish images, but you can find / scan them)

Coming eventually:
 * `arkham-horror`: Arkham Horror base set (can't publish images, but you can find / scan them)
 * `pandemic`: Pandemic base set plus some other stuff.
 * Go: Stones and a board
 * Chess clock

Each of these games illustrate the functionalities of the main workhorse code in `browser.js` and `server.js`. So, if you're interested in writing your own games, I recommend playing with these to see what's possible, then looking at the `game.js` code for each to see how things are actually implemented. In particular, I would monkey with `minimal/game.js` first, since it's by far the simplest! Then check out `checkers`, `chess`, and (quite complex) `poker` or `puerto-rico`.

## Here to Help
Feel free to pester me if something isn't clear. I will likely be slow to respond, but I believe in this project and will gladly update the comments in the code or help out within reason.

Things I will _never_ do:
 * Hard-code any rules or anti-cheat measures. You will _always_ be able to look at your oponent's hidden pieces or move them around when they are taking a poo. 
 * Convince my friends and family that the games I personally invent are worth playing.

More to come...
