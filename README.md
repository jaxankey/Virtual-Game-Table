# Virtual Game Table
This is a general-purpose, browser-based board game table, aimed at online game nights and rapid game development. No rules will ever be hard coded, so you can play however you like. The purpose of this is only to provide a simple, intuitive, synchronized game table in everyone's browser.

![Strategy Game Screenshot](https://github.com/jaxankey/Virtual-Game-Table/blob/master/common/screenshots/strategy.png)

The client software currently requires [Chrome](https://www.google.com/chrome/) to run. 

## Starting and testing a server

This program runs directly from the source code, so no compiling or binaries are required (other than downloading / installing [https://nodejs.org/](Node.js)!). This server has been tested on Linux & Windows, but should work on OSX as well.

Linux
 1. Install [https://nodejs.org/](Node.js): For me, this meant downloading the binaries, unpacking them in a convenient folder, adding the binary path to `.profile` (with a line like `PATH=$PATH:/home/jack/Applications/node-v10.16.0-linux-x64/bin`) then logging out back in.
 2. Run `start-server-linux` from the terminal. 
 
Windows
 1. Install [https://nodejs.org/](Node.js): Download the appropriate windows installer and run it.
 2. Double-click `start-server-windows.bat` in one of the game directories. 
 
These scripts will prompt you for a game name, and you can type any of the subdirectory names in either `games/` or `private/` (which you must create). They will then ask for a port number, and you can provide any valid port, e.g., `37777`. You can also launch a server directly with a command similar to `node server.js cards 37777`. 

A successfully booted server should declare something like `listening on port 37777` after initializing. At this point, you can test the server by opening a few Chrome browser windows side-by-side and typing in the address `localhost:37777`. Things moving around in one window should also move around in the other. Push a few buttons (especially the `New Game` or `Setup` buttons, click a few things, see what happens. 

Definitely take a look at the "controls" link in the upper right to see what kind of keyboard shortcuts you have access to. It is well worth your time to learn a few of these!

## Games
The games I have coded thus far include:
 * `checkers`: Checkers & board (double-click pieces to king them)
 * `chess`: Chess pieces & board
 * `go`: Go table & board
 * `cards`: A standard deck of cards with 8 private viewing zones
 * `poker`: Same as cards, but with poker chips
 * `roll`: All the nerd-dice and a few more pieces (press / hold `r` to roll)
 * `strategy`: Pieces for my own strategy game
 * `puerto-rico`: Puerto Rico (can't publish images; check vassal and `image_list.txt`?)
 * `arkham-horror`: Arkham Horror base set (can't publish images; check vassal and `image_list.txt`)

Each of these games illustrate the functionalities of the main workhorse code in `browser.js` and `server.js`. So, if you're interested in writing your own games, I recommend playing with these to see what's possible, then looking at the `game.js` code for each to see how things are actually implemented. In particular, I would monkey with `checkers/game.js` first, since it's by far the simplest!

## Here to Help
Feel free to pester me if something isn't clear. I will likely be slow to respond, but I believe in this project and will gladly update the comments in the code or help out within reason.

My next goals (if I ever find time) include:
 * Pandemic
 * Power Grid
 * Chess clock

Things I will _never_ do:
 * Hard-code any rules or anti-cheat measures. You will _always_ be able to look at your oponent's hidden pieces or move them around when they are taking a poo. 
 * Convince my friends and family that the games I invent are worth playing.

More documentation to come...
