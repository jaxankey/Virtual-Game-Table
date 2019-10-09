/**
 * This file is part of the Virtual Game Table distribution 
 * (https://github.com/jaxankey/Virtual-Game-Table).
 * Copyright (c) 2015-2019 Jack Childress (Sankey).
 * 
 * This program is free software: you can redistribute it and/or modify  
 * it under the terms of the GNU General Public License as published by  
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but 
 * WITHOUT ANY WARRANTY; without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License 
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

// Versions included in external_scripts
jquery_version    = 'jquery-1.11.1.js'
socket_io_version = 'socket.io-1.2.0.js'

// port upon which the server listens
var game_name = 'cards';
var port      = 37777;
console.log('\nArguments:');
for(var n in process.argv) console.log(process.argv[n]);

// find out if a game name and port was supplied
if (process.argv.length > 2) game_name = process.argv[2];
if (process.argv.length > 3) port = parseInt(process.argv[3]);

// requirements
var fs   = require('fs');               // file system stuff
var app  = require('express')();        // routing handler
var http = require('http').Server(app); // listening
var io   = require('socket.io')(http);  // fast input/output

// Generates a date string for logs
function get_date_string() {
  
  // get the date
  var today = new Date();
  var ss = today.getSeconds();
  var mm = today.getMinutes();
  var hh = today.getHours();
  var dd = today.getDate();
  var MM = today.getMonth()+1; //January is 0!
  var yyyy = today.getFullYear();
  
  // format the string
  if(ss<10) ss='0'+ss;
  if(hh<10) hh='0'+hh
  if(dd<10) dd='0'+dd;
  if(mm<10) mm='0'+mm;
  if(MM<10) MM='0'+MM;
  
  // return formatted
  return yyyy+'-'+MM+'-'+dd+' '+hh+':'+mm+'.'+ss+' - '
}


// Logs events prepended by the date string
function log() {
  // prepend the date
  arguments[0] = get_date_string()+String(arguments[0]);
  
  // forward the arguments to the log.
  console.log.apply(this, arguments);
}

// get the directories
var root_directory     = process.cwd();

// This is the order of searching for files.
var private_directory  = root_directory + '/private/'  + game_name
var games_directory    = root_directory + '/games/'    + game_name;
var common_directory   = root_directory + '/common';


// change to the root directory
console.log('\nSearch Order:');
console.log('  '+private_directory);
console.log('  '+games_directory);
console.log('  '+common_directory);
console.log('  '+root_directory+'\n');

// Get the images from the avatars folder
function get_avatars() {
  common_avatars  = fs.readdirSync(common_directory +'/avatars');
  if(fs.existsSync(root_directory+'/private/avatars/')) private_avatars = fs.readdirSync(root_directory+'/private/avatars/');
  else                                                  private_avatars = [];

  // Get all the avatar paths
  avatars = [];
  for(var n in common_avatars)  avatars.push('common/avatars/'+common_avatars[n]);
  for(var n in private_avatars) avatars.push('private/avatars/'+private_avatars[n]);

  return avatars;
}




/**
 * See if the full path exists.
 * @param {string} path 
 */
function file_exists(path) {
  return fs.existsSync(path);
}

/**
 * Returns the path to the appropriate file, following the priority
 * private_directory, games_directory, common_directory
 */
function find_file(path) {
  //console.log(' Searching for', path, 'in');
  var paths = [
    private_directory +'/'+path,
    games_directory   +'/'+path,
    common_directory  +'/'+path,
    root_directory    +'/'+path
  ] 
  
  for(var n in paths) {
    //console.log('  ', paths[n]);
    if(file_exists(paths[n])) return paths[n];
  }
  console.log('  FILE NOT FOUND:', path);
  return common_directory+'/images/nofile.png';
}


/**
 * Searches for the path, and, if found, sends it using the response object
 * @param {response} response
 * @param {path-like string} path 
 */
function send(response, path) {
  var full_path = find_file(path);
  if(full_path) response.sendFile(full_path);
}

// File requests
app.get('/external_scripts/socket.io.js', function(request, response) {
  response.sendFile(root_directory + '/external_scripts/' + socket_io_version); } );

app.get('/external_scripts/jquery.js', function(request, response) {
  response.sendFile(root_directory + '/external_scripts/' + jquery_version); } );

app.get('/',          function(request, response) {send(response, 'index.html')    ;} );
app.get('/rules/',    function(request, response) {send(response, 'rules.html')    ;} );
app.get('/controls/', function(request, response) {send(response, 'controls.html') ;} );
app.get('/:f',        function(request, response) {send(response, request.params.f);} );

app.get('/images/:i',       function(request, response) {send(response, 'images/'+request.params.i                                          );} );
app.get('/images/:d/:i',    function(request, response) {send(response, 'images/'+request.params.d+'/'+request.params.i                     );} );
app.get('/images/:a/:b/:c', function(request, response) {send(response, 'images/'+request.params.a+'/'+request.params.b+'/'+request.params.c);} );
app.get('/common/avatars/:i', function(request, response) {send(response, 'common/avatars/' +request.params.i);} );
app.get('/private/avatars/:i',function(request, response) {send(response, 'private/avatars/'+request.params.i);} );
  
// Last known board configuration
pieces = [];
/** each piece contains 
 * id   piece id
 * x    x position
 * y    y position
 * r    rotation
 * i    active image index
 * n    position in main stack
*/

/**
 * Find and return the index of the supplied piece id.
 * @param {int} id 
 */
function find_piece(id) {
  for(var n in pieces) {
    if(pieces[n].id == id) return n;
  }
  return -1;
}

// Client information. These lists should match in length!
// We break these into lists so the data is easy to send.
last_client_id            = 0;
client_ids                = []; // list of unique ids for each socket
client_sockets            = []; // sockets
client_names              = []; // names associated with each socket
client_teams              = []; // team numbers associated with each socket
client_is_holding         = []; // lists of last known held piece indices for each socket
client_selected_piece_ids = []; // Lists of the last known selected pieces for each socket
client_drag_offsets       = []; // list of [dx,dy] offset coordinates for each held piece


///////////////////////////////////////////
// Thread for what to do with new client //
///////////////////////////////////////////
io.on('connection', function(socket) {
  
  // update the global list of clients
  client_ids           .push(++last_client_id);
  client_sockets       .push(socket);  // each client gets a socket
  client_names         .push("n00b");  // each client gets a name string
  client_teams         .push(0);       // each client gets a team index
  client_is_holding    .push(false);   // each client gets a list of held pieces 
  client_selected_piece_ids.push([]);  // each client gets a list of selected pieces
  client_drag_offsets  .push([]);      // for each held piece, there is a list of [dx,dy] offsets

  log("New client id: ", last_client_id, ', sockets: '+client_sockets.length, client_teams);

  // Tell this user their id.
  socket.emit('id', last_client_id);
  
  // Welcome them to the server.
  socket.emit('chat', '<b>Server:</b> Welcome!');
  
  ////////////////////////////
  // Queries
  ////////////////////////////

  // Query for avatar paths
  socket.on('avatars?', function() {
    // get the client id
    var client_index = client_sockets.indexOf(socket);
    var client_id    = client_ids[client_index];

    log('Received "avatars?" from client', client_id, client_index);
    avatars = get_avatars();
    log('Sending avatar image path list:', avatars.length, 'items');
    socket.emit('avatars', avatars);
  });

  // Received a "ready to go" query
  socket.on('?', function() {
    // get the client id
    var client_index = client_sockets.indexOf(socket);
    var client_id    = client_ids[client_index];

    // Log it
    log('Received "?" from client', client_id, client_index);
    
    // Send the last known config
    log('Sending last known config:', pieces.length, "pieces");
    socket.emit('u', pieces);

    // Send the selected pieces of all the other clients
    for(var n in client_selected_piece_ids) 
      if(n != client_index) socket.emit('s', client_selected_piece_ids[n], client_ids[n]);
  });

  // Received a name or team change triggers a full user information dump, including held pieces.
  socket.on('user', function(name, team) {
    
    // get the client index
    i = client_sockets.indexOf(socket);
    
    // Make sure the team is at least 0. Sometimes a -1 comes in from the html initializing.
    if(team < 0) team = 0;

    // update client names & teams
    old_name        = client_names[i];
    old_team        = client_teams[i];
    client_names[i] = name.substring(0,24);
    client_teams[i] = team;
    log('User index', i, 'change:', old_name + " -> " + client_names[i], ' and ' + old_team, '->', team);
    
    // Send a chat to everyone with this information
    if(old_name != client_names[i] && old_name != 'n00b') 
      io.emit('chat', '<b>Server:</b> '+old_name+' is now '+client_names[i]);
    
    if(old_team != client_teams[i]) 
      io.emit('chat', '<b>Server:</b> '+client_names[i]+" joins Team "+String(team));
    
    // tell everyone about the current list.
    io.emit('users', client_ids, client_names, client_teams, client_is_holding, client_selected_piece_ids);
  });

  // received a chat message
  socket.on('chat', function(msg) {

    // update log
    log('chat:', msg);

    // send the message to everyone
    io.emit('chat', msg);
  });

  /** 
   * Someone is moving their mouse on the canvas. 
   * Incoming data:
   *  client_id
   *  x,y           Mouse's x and y coordinates
   *  hp_ids        List of this client's held piece ids
   *  hp_coords     List of [dx,dy,r] coordinates, one for each hp_id. dx and dy are relative to x and y
   *  client_r      Rotation of the client (for drawing the hand orientation)
   *  selection_box Selection box for this client {x0_target, y0_target, x1_target, y1_target, r_target}
   */
  socket.on('m', function(x, y, hp_ids, hp_coords, client_r, selection_box) {
    
    // Figure out the client
    client_index = client_sockets.indexOf(socket);
    client_id    = client_ids[client_index];
    log('m:', client_id, x, y, hp_ids.length, hp_coords.length, client_r, selection_box);
    
    // This information will never be sent by another client, because it only 
    // comes from the person holding the pieces. As such, send messages to everyone ELSE only.
    socket.broadcast.emit('m', client_id, x, y, hp_ids, hp_coords, client_r, selection_box);
  });

  /**
   * Someone sent information about a bunch of pieces.
   */
  socket.on('u', function(incoming_pieces, clear) {

    // pieces is a list
    client_index = client_sockets.indexOf(socket);
    log(client_index, 'u:', incoming_pieces.length, 'pieces');

    // Emit to EVERYONE, including the original client, to resolve collisions.
    // The client software should ignore data about pieces they're holding.
    io.emit('u', incoming_pieces); 

    // Now update our private memory to match!

    // If we're supposed to, get rid of the pieces in memory
    if(clear==true) pieces.length=0;

    // Now we wish to overwrite all the existing pieces with the new ones,
    // and make sure they're in the right places.

    // Sort the piece datas by n's (must be increasing!)
    incoming_pieces.sort(function(a, b){return a.n-b.n});

    // run through the list of ids, find the index m in the stack of the pieces by id
    for(var i in incoming_pieces) {
      pd = incoming_pieces[i]; // incoming piece
      
      // find the current index
      var m = find_piece(pd.id); // index of incoming piece
      
      // if the piece exists, pop it (to be replaced below) and update the rest
      if(m>=0) {
        
        // Remove it
        pieces.splice(m,1);

        // Decrement the indices of the subsequent pieces
        for(var j=m; j<pieces.length; j++) pieces[j].n--;
      }
    } // end of loop over supplied pieces

    // Loop over the pieces again to insert them into the main stack, which currently should not contain them. We do this 
    // in separate loops so that pieces removed from random locations and sent to 
    // random locations do not interact. The value of ns is the final value in the pieces array.
    for(var i in incoming_pieces) {
      p = incoming_pieces[i]; // incoming piece

      // insert the piece at it's index (WHAT IF THIS IS HIGHER THAN THE SIZE OF THE STACK?)
      pieces.splice(p.n, 0, p);
      
      // increment the subsequent piece indices
      for(var j=p.n+1; j<pieces.length; j++) pieces[j].n++;
    }
  });

  // Deal with selection changes at the team level, 
  // and held piece changes at the client level.

  // someone sent a selection change
  socket.on('s', function(piece_ids, client_id) {
    
    // Optional client_id supplied by user
    if(client_id == undefined) {
      // get the client id
      var client_index = client_sockets.indexOf(socket);
      var client_id    = client_ids[client_index];
    }

    // pieces is a list
    log('s: client', client_id, piece_ids.length, 'pieces');

    // emit to EVERYONE, including the sender
    io.emit('s', piece_ids, client_id);
  });

  // someone sent a held pieces change
  socket.on('h', function(is_holding) {

    // get the client id
    var client_index = client_sockets.indexOf(socket);
    var client_id    = client_ids[client_index];

    // pieces is a list
    log('h:', client_id, 'is_holding =', is_holding);

    // emit to EVERYONE, including the sender (avoids network lag issues)
    io.emit('h', client_id, is_holding);
  });
  



  // Test function to ping back.
  socket.on('ping', function(x) {
    
    // Figure out the client
    client_index = client_sockets.indexOf(socket);
    log('ping:', x);
    
    // send messages to just this socket
    socket.emit('ping', x);
  });




  // handle the disconnect
  socket.on('disconnect', function() {
    
    // find the client index
    i = client_sockets.indexOf(socket);
    log("Client", i, "/", client_sockets.length-1, "disconnecting.");
    
    // pop the client
    client_ids        .splice(i,1);
    client_sockets    .splice(i,1);
    client_names      .splice(i,1);
    client_teams      .splice(i,1);
    client_is_holding .splice(i,1);
    client_selected_piece_ids.splice(i,1);
    
    // tell the world! TO DO!
    io.emit('users', client_ids, client_names, client_teams, client_is_holding, client_selected_piece_ids);
  });

}); // end of io



// actually start listening for requests
http.listen(port, function() {
  log('listening on port '+String(port));
});
