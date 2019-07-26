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
  response.sendFile(game_directory + '/images/'+request.params.image) });




// Last known board configuration

// Piece positions. These lists should match in length!
last_indices        = []; // List of last known piece indices
last_xs             = []; // list of last known piece x-coordinates
last_ys             = []; // list of last known piece y-coordinates
last_rs             = []; // list of last known piece rotations
last_active_images  = []; // list of last known active image indices

// Client information. These lists should match in length!
// We break these into lists so the data is easy to send.
last_client_id      = 0;
client_ids          = []; // list of unique ids for each socket
client_sockets      = []; // sockets
client_names        = []; // names associated with each socket
client_teams        = []; // team numbers associated with each socket
client_held_pieces  = []; // lists of last known held piece indices for each socket

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
 * Mouse event
 *  'm' (n, x, y, h, dx, dy, r)
 *    n     : index of client or team (forgot)
 *    x, y  : new mouse location
 *    h     : index of held piece (or 0 if none)
 *    dx, dy: location of piece relative to mouse
 *    r     : rotation of board (hand)  
 * 
 * Coordinates of multiple pieces
 *  'u' (indices, xs, ys, rs, active_images, clear)  
 * 
 * Piece selected 
 *  's' (piece_ids, team_number)
 *    piece_ids   : list of indices of piece ids.
 *    team_number : team that selected (or deselected) the piece
 *  On the client side, selected_pieces is a per-team list of indices.
 *  Meanwhile, the held_pieces data (not implemented) should be a per-client list of indices.
*/

// Thread for what to do with new client
io.on('connection', function(socket) {
  
  // update the global list of clients
  client_ids        .push(++last_client_id);
  client_sockets    .push(socket);  // each client gets a socket
  client_names      .push("n00b");  // each client gets a name string
  client_teams      .push(0);       // each client gets a team index
  client_held_pieces.push([]);      // each client gets a list of held pieces 
  
  log("New client id: ", last_client_id, ', sockets: '+client_sockets.length, client_teams);

  // Tell this user their id.
  socket.emit('id', last_client_id);

  // send last full update
  if(last_indices.length) {
    log('sending last known config:', last_indices.length, "pieces")
    socket.emit('u', last_indices, last_xs, last_ys, last_rs, last_active_images)
  }
  
  // Welcome them to the server.
  socket.emit('chat', '<b>Server:</b> Welcome!');
  
  // INCOMING DATA HANDLING

  // received a name or team change triggers a rather large update
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
    io.emit('users', client_ids, client_names, client_teams, client_held_pieces);
  });

  // received a chat message
  socket.on('chat', function(msg) {

    // update log
    log('chat:', msg);

    // send the message to everyone
    io.emit('chat', msg);
  });

  // someone is moving their mouse on the canvas
  socket.on('m', function(n, x, y, h, dx, dy, r) {

    // update log
    log('m:', n, x, y, h, dx, dy, r);

    // send messages to everyone but this socket
    socket.broadcast.emit('m', n, x, y, h, dx, dy, r);
  });

  // someone sent the a few pieces to the server for distribution
  socket.on('u', function(indices, xs, ys, rs, active_images, clear) {

    // get rid of the pieces in memory
    if(clear==true) {
      
      // I know this is weird, but javascript garbage collection will apparently handle it.
      last_indices        .length = 0;
      last_xs             .length = 0;
      last_ys             .length = 0;
      last_rs             .length = 0;
      last_active_images  .length = 0;
    }
  
    // find or push the information to the last known lists
    for(n=0; n<indices.length; n++) {
      
      // get the supplied index, x, y, and active images
      i = indices[n];
      x = xs[n];
      y = ys[n];
      r = rs[n];
      a = active_images[n];
      
      // search for it
      m = last_indices.indexOf(i);
      
      // if we didn't find it, push it
      if(m<0) {
        // push all the new data
        last_indices  .push(i);
        last_xs       .push(x);
        last_ys       .push(y);
        last_rs       .push(r);
        last_active_images.push(a);
      } 
      
      // otherwise, just update it
      else {
        last_indices[m] = i;
        last_xs[m]      = x;
        last_ys[m]      = y;
        last_rs[m]      = r;
        last_active_images[m] = a;
      }
    }
  
    // pieces is a list
    log('u:', indices.length, 'pieces');

    // emit to the rest
    socket.broadcast.emit('u', indices, xs, ys, rs, active_images);

  });

  // Deal with selection changes at the team level, 
  // and held piece changes at the client level.

  // someone sent a selection change
  socket.on('s', function(piece_ids, team_number) {

    // pieces is a list
    log('s:', piece_ids, team_number);

    // emit to everyone else
    socket.broadcast.emit('s', piece_ids, team_number);
  });

  // someone sent a held pieces change
  socket.on('h', function(piece_ids) {

    // Get the client index
    client_number = client_sockets.indexOf(socket);

    // pieces is a list
    log('h:', piece_ids, client_number);

    // emit to everyone else
    socket.broadcast.emit('h', piece_ids, client_number);
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
    client_held_pieces.splice(i,1);
    
    // tell the world!
    io.emit('users', client_ids, client_names, client_teams, client_held_pieces);
  });

}); // end of io



// actually start listening for requests
http.listen(port, function() {
  log('listening on port '+String(port));
});
