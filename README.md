# Virtual Game Table
This is a general-purpose, browser-based board game table, aimed at online game nights and rapid game development. No rules will ever be hard coded, so you can play however you like. The purpose of this is only to provide a simple, intuitive, synchronized game table in everyone's browser.

![Strategy Game Screenshot](https://github.com/jaxankey/Virtual-Game-Table/blob/master/common_images/screenshot.png)

The client software currently requires [Chrome](https://www.google.com/chrome/) to run, and the server has been tested on Linux and Windows (but should work on osx). 

## Starting a server

### Linux
 1. Install [https://nodejs.org/](Node.js): For me, this meant downloading the binaries, unpacking them in a convenient folder, adding the binary path to `.bashrc`.
 2. Open a terminal in one of the game directories, and run `./start-server-linux`. 
 
### Windows
 1. Install [https://nodejs.org/](Node.js): Download the appropriate windows installer and run it.
 2. Double-click `start-server-windows.bat` in one of the game directories.

A successfully booted server should declare something like `listening on port 37777`. At this point, open up a few Chrome windows side-by-side and point them at the address `localhost:37777`. Things moving around in one window should also move around in the other. Push a few buttons, click a few things, see what happens. Click the "controls" link in the upper right to see some of the keyboard shortcuts.

## Games
The games I have coded thus far include:
 * Checkers
 * Chess
 * Go
 * Cards & Poker
 * My own strategy game
 * Puerto Rico (can't publish!)
 * Arkham Horror (can't publish!)

Each of these games illustrate the functionalities of the main workhorse code in `browser.js` and `server.js`. So, if you're interested in writing your own games, I recommend playing with these to see what's possible, then looking at the `game.js` code for each to see how things are actually implemented. I'd play with `checkers/game.js` first, since it's by far the simplest!

## Here to Help
Feel free to pester me if something isn't clear. I will be slow to respond, but I believe in this project and will gladly update the comments in the code or help out within reason.

My next goals (if I ever find time) include:
 * Pandemic
 * Power Grid
 * Chess clock

Things I will _never_ do:
 * Hard-code any rules or anti-cheat measures. You will _always_ be able to look at your oponent's hidden pieces or move them around when they are taking a poo. 
 * Convince my friends and family that the games I invent are worth playing.

More documentation to come...
