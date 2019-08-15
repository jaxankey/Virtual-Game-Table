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

// port upon which the server listens
var port = 37777

// find out if a port was supplied
if (process.argv.length > 2) port = parseInt(process.argv[2]);

// requirements
var app  = require('express')();        // routing handler
var http = require('http').Server(app); // listening
var io   = require('socket.io')(http);  // fast input/output

function get_date_string() {
  
  // get the date
  var today = new Date();
  var ss = today.getSeconds();
  var mm = today.getMinutes();
  var hh = today.getHours();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //January is 0!
  var yyyy = today.getFullYear();
  
  // format the string
  if(ss<10) ss='0'+ss;
  if(hh<10) hh='0'+hh
  if(dd<10) dd='0'+dd;
  if(mm<10) mm='0'+mm;
  
  // return formatted
  return yyyy+'-'+mm+'-'+dd+' '+hh+':'+mm+'.'+ss+' - '
}

function log() {
  // prepend the date
  arguments[0] = get_date_string()+String(arguments[0]);
  
  // forward the arguments to the log.
  console.log.apply(this, arguments);
}
    
// get the game directory
game_directory = process.cwd();

// change to the root directory
process.chdir('../..');
log(process.cwd());

// File requests
app.get('/', function(request, response) {
  response.sendFile(game_directory + '/index.html'); } );

app.get('/rules/', function(request, response) {
  response.sendFile(game_directory + '/rules.html'); } );

app.get('/controls/', function(request, response) {
  response.sendFile(process.cwd() + '/controls.html'); } );
    
app.get('/game.js', function(request, response) {
  response.sendFile(game_directory + '/game.js'); } );

app.get('/browser.js', function(request, response) {
  response.sendFile(process.cwd() + '/browser.js') } );
  
app.get('/socket.io.js', function(request, response) {
  response.sendFile(process.cwd() + '/external_scripts/socket.io-1.2.0.js'); } );

app.get('/jquery.js', function(request, response) {
  response.sendFile(process.cwd() + '/external_scripts/jquery-1.11.1.js'); } );
  
app.get('/images/:image', function(request, response) {
  response.sendFile(game_directory + '/images/'+request.params.image); });

app.get('/images/:directory/:image', function(request, response) {
  response.sendFile(game_directory + '/images/' + request.params.directory + '/' +request.params.image); });

app.get('/images/:dir1/:dir2/:image', function(request, response) {
  response.sendFile(game_directory + '/images/' + request.params.dir1 + '/' + request.params.dir2 + '/' +request.params.image); });
  
app.get('/rules.pdf', function(request, response) {
  response.sendFile(game_directory + '/rules.pdf'); });
  
// Last known board configuration

// Piece information
pieces = [];
/** each piece contains 
 * id   piece id
 * x    x position
 * y    y position
 * r    rotation
 * i    active image index
 * n    position in main stack
*/

//team_zones = null;
/** each team zone contains
 * draw_mode
 * grab_mode
 * r
 * team_index
 * x1,x2,x3,x4,y1,y2,y3,y4
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
client_held_piece_ids     = []; // lists of last known held piece indices for each socket
client_selected_piece_ids = []; // Lists of the last known selected pieces for each socket
client_drag_offsets       = []; // list of [dx,dy] offset coordinates for each held piece

/**
 * Data sent by clients:
 * 
 * Disconnecting
 *  'disconnect' ()
 * 
 * User information
 *  'user' (name, team) 
 * 
 * Chat message 
 *  'chat' (msg)
 *  
 * 
 * Coordinates of multiple pieces
 *  'u' (incoming_pieces, clear)  
 * 
 * Piece selected 
 *  's' (piece_ids, team_number)
 *    piece_ids   : list of piece ids (different than piece indices).
 *    team_number : team that selected (or deselected) the piece
 *  On the client side, selected_pieces is a per-team list of indices.
 *  Meanwhile, the held_piece_ids data (not implemented) should be a per-client list of indices.
*/

// Thread for what to do with new client
io.on('connection', function(socket) {
  
  // update the global list of clients
  client_ids           .push(++last_client_id);
  client_sockets       .push(socket);  // each client gets a socket
  client_names         .push("n00b");  // each client gets a name string
  client_teams         .push(0);       // each client gets a team index
  client_held_piece_ids.push([]);      // each client gets a list of held pieces 
  client_selected_piece_ids.push([]);  // each client gets a list of selected pieces
  client_drag_offsets  .push([]);      // for each held piece, there is a list of [dx,dy] offsets

  log("New client id: ", last_client_id, ', sockets: '+client_sockets.length, client_teams);

  // Tell this user their id.
  socket.emit('id', last_client_id);

  // send last full update -- now handled by client query.
  //log('sending last known config:', pieces.length, "pieces");
  //socket.emit('u', pieces);
  
  // Welcome them to the server.
  socket.emit('chat', '<b>Server:</b> Welcome!');
  
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

    // Send the team zones
    /*socket.emit('tz', team_zones);*/
  });

  /* socket.on('tz', function(incoming_team_zones) {
    
    log('tz:', incoming_team_zones);
    team_zones = [...incoming_team_zones];

    // send messages to everyone but this socket
    socket.broadcast.emit('tz', team_zones);
  });*/

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
    
    // Send a chat with this information
    if(old_name != client_names[i] && old_name != 'n00b') 
      socket.broadcast.emit('chat', '<b>Server:</b> '+old_name+' is now '+client_names[i]);
    
    if(old_team != client_teams[i]) 
      socket.broadcast.emit('chat', '<b>Server:</b> '+client_names[i]+" joins Team "+String(team));
    
    // tell everyone about the current list.
    io.emit('users', client_ids, client_names, client_teams, client_held_piece_ids, client_selected_piece_ids);
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
    log('m:', client_id, x, y, hp_ids, hp_coords, client_r, selection_box);
    
    // send messages to everyone but this socket
    socket.broadcast.emit('m', client_id, x, y, hp_ids, hp_coords, client_r, selection_box);
  });

  socket.on('test', function(x) {
    
    // Figure out the client
    client_index = client_sockets.indexOf(socket);
    log('test:', x);
    
    // send messages to everyone but this socket
    socket.emit('test', x);
  });

  /**
   * Someone sent information about a bunch of pieces.
   */
  socket.on('u', function(incoming_pieces, clear) {

    // pieces is a list
    log('u:', incoming_pieces.length, 'pieces');

    // emit to the rest
    socket.broadcast.emit('u', incoming_pieces);

    // Now update our private memory to match!

    // If we're supposed to, get rid of the pieces in memory
    if(clear==true) pieces.length=0;
  


    // Now we wish to overwrite all the existing pieces with the new ones,
    // and make sure they're in the right places.

    // Sort the piece datas by n's (must be increasing!)
    incoming_pieces.sort(function(a, b){return a.n-b.n});

    // run through the list of ids, find the index m in the stack of the pieces by id
    for(var i in incoming_pieces) {
      pd = incoming_pieces[i];
      
      // find the current index
      var m = find_piece(pd.id);
      
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
      p = incoming_pieces[i];

      // insert the piece at it's index
      pieces.splice(p.n, 0, p);

      // increment the subsequent piece indices
      for(var j=p.n+1; j<pieces.length; j++) pieces[j].n++;
    }
    
  });

  // Deal with selection changes at the team level, 
  // and held piece changes at the client level.

  // someone sent a selection change
  socket.on('s', function(piece_ids) {
    
    // get the client id
    var client_index = client_sockets.indexOf(socket);
    var client_id    = client_ids[client_index];

    // pieces is a list
    log('s: client', client_id, piece_ids.length, 'pieces');

    // emit to everyone else
    socket.broadcast.emit('s', piece_ids, client_id);
  });

  // someone sent a held pieces change
  socket.on('h', function(is_holding) {

    // get the client id
    var client_index = client_sockets.indexOf(socket);
    var client_id    = client_ids[client_index];

    // pieces is a list
    log('h:', client_id, 'is_holding =', is_holding);

    // emit to everyone else
    socket.broadcast.emit('h', client_id, is_holding);
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
    client_held_piece_ids.splice(i,1);
    client_selected_piece_ids.splice(i,1);
    
    // tell the world!
    io.emit('users', client_ids, client_names, client_teams, client_held_piece_ids, client_selected_piece_ids);
  });

}); // end of io



// actually start listening for requests
http.listen(port, function() {
  log('listening on port '+String(port));
});
