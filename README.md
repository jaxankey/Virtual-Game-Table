# Virtual Game Table
A general-purpose, browser-based game table for you and your friends. 

![Strategy Game Screenshot](https://github.com/jaxankey/Virtual-Game-Table/blob/master/common_images/screenshot.png)

The client software is currently compatible with Chrome, and the server (requires [https://nodejs.org/](Node.js)) has been tested on Linux and Windows. 

To start a server on Linux, open a terminal in one of the game directories, and run `./start-server-linux`. Then connect in one or more chrome windows to `localhost:37777` to see how it works. In principle the process is the same on Windows but you just double-click `start-server-windows.bat` (I haven't tested this in awhile, and I think this may require some additional library files on hand).

The games I have coded thus far include:
 * Checkers
 * Chess
 * Go
 * My own strategy game
 * Puerto Rico (but I can't publish those images!)

Each of these games illustrates the functionalities of `browser.js` and `server.js`. So, if you're interested in writing your own games, I recommend playing with these to see what's possible, then looking at the `game.js` code for each to see how things are actually implemented.

Feel free to pester me if something isn't clear. I will be slow to respond, but believe in this project and will gladly update the comments in the code to make life easier.

More documentation to come...
