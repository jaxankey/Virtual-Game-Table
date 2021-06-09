![Screenshot](https://raw.githubusercontent.com/jaxankey/TA2/master/common/images/screenshot.png)

Onboard a cargo ship orbiting a distant planet:

First officer: "Wow this planet is *crawing* with aliens."

Down the hallway: "Wow, one of these crates is full of guns with unlimited ammo!"

Captain: "Excellent. We move *immediately*."

Helmsman: "Sir, there are absolutely no resources of value on that planet, and we are on a peaceful mission to -" (gun butt strikes forehead)

Captain: "We don't have time for this. LOCK AND LOAD!"

# Total A-Holes II

Shoot aliens in your browser, alone or with friends. The goal of this project is to realize satisfying gameplay that facilitates conversation. The controls are simple, so that you can hold a beer in one hand while playing:

![Controls](https://raw.githubusercontent.com/jaxankey/TA2/master/common/images/instructions-web.png)

No mouse, no complications, works on any laptop. You can also use `ijkl` or the arrow keys, and / or `shift` to shoot. The advanced player can (for the time being) use `Q` and `E` or `U` and `O` to switch handedness. 

This seemingly "funny" control scheme is inspired by [Phobia II](https://www.youtube.com/watch?v=XWGAd1dAPwQ), the greatest game ever made. It will take some getting used to, but, as it turns out, a 60-degree shooting angle is a beautiful thing. And you can drink.

Note this project is definitely in its "early" stages (I have *many* plans for it), but it has already provided me countless hours of laughter with my brother and friends. 

## Starting and testing a server

This program runs directly from the source code (see [Releases](https://github.com/jaxankey/TA2/releases)) so no compiling or binaries are required (other than downloading / installing [Node.js](https://nodejs.org/)). This server has been tested on Linux & Windows, but should work on OSX as well.

Linux
 1. Install [Node.js](https://nodejs.org/): For me, this meant downloading the binaries, unpacking them in a convenient folder, adding the binary path to `.profile` (with a line like `PATH=$PATH:/path/to/node/bin`) then logging out & back in.
 2. Run `./start-server-linux` (default settings) or `./start-server-linux TA2 <port>` from the terminal, where `<port>` is a TCP port, e.g., `37777`. 
 
Windows
 1. Install [Node.js](https://nodejs.org/): Download the appropriate windows installer and run it.
 2. Double-click `start-server-windows.bat`.
 3. Provide the game name and port as requested (or just hit enter a bunch to use the defaults).

A successfully booted server should declare something like `listening on port 37777` after initializing. At this point, you can test the server by opening a few Chrome browser windows side-by-side and typing in the address `localhost:37777`. 

More to come...
