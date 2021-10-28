/**
 * This file is part of the Virtual Game Table distribution.
 * Copyright (c) 2015-2021 Jack Childress (Sankey).
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

/* 
METHODOLOGY
1. Whenever certain attributes (e.g. position, image index) of our local Things are updated, 
   the changes are added to (or updated in) an outbound queue, e.g. q_pieces_out.

2. All incoming packets from the server to us are similarly queued into an inbound queue.

3. These queues are dealt with all at once every quarter second or so. 
   First the inbound queue is processed, then outbound is sent to the server.

4. The server adds all such updates to a master list, then relays each incoming queue packet to everyone.
   This includes returning it to the sender, to avoid lag-induced desync; the latest server state is sent to EVERYONE
   as it's updated. The server also reconciles who is holding it, and if someone not holding tries something,
   the server instead overwrites that incoming data with the server state and re-sends it.

5. Upon receiving updated pieces, clients will NOT update those pieces they are holding, because that's interferes with 
   their local responsive reality (they have control!). The exception to this rule is if the server says someone else is 
   holding it. If two people grab the same piece, the server enforces that the first one holds it.
   There is a guaranteed update sent when pieces are released, so it cannot get too out of sync.

6. Clients only update each piece attribute if we haven't seen or sent a more recent update (this is the _N[key] business) 

7. On connection, the server sends all the latest information in one big packet, like a big queue update.

IDEAS 

ISSUES

OTHER PARADIGMS & APPROACHES
 * Each client keeps track of what the server has, and loops over everything to send a delta.

NET OPTIMIZATIONS

CURRENTLY

*/

// Troubleshooting logger
function _l() { log('   _l', ...arguments) }

// Holds the user name space
var VGT = {
  
  // Setting the log level
  log_level: 1,
  log() { if(this.log_level) log(...arguments); },

  add_script(path) {
    var s = document.createElement('script')
    s.type = 'text/javascript'
    s.src  = path
    document.body.appendChild(s);
    return s;
  },

  // Resources
  sounds: {},
  images: {},
};

// Object for interacting with the html page.
class _Html {
  
  constructor() {
    
    // Handles
    this.div_gameboard = document.getElementById('gameboard');
    this.div_loader    = document.getElementById('loader');
    this.div_volume_container = document.getElementById('volume_container')
    this.div_special   = document.getElementById('special');
    this.div_special_title = document.getElementById('special_title');
    this.div_special_controls = document.getElementById('special_controls');
    
    this.div_controls_button = document.getElementById('controls_button');
    this.div_controls        = document.getElementById('controls');
    
    this.div_help_button = document.getElementById('help_button')
    this.div_help        = document.getElementById('help');
    
    this.ul_messages   = document.getElementById('messages');
    
    this.input_volume  = document.getElementById('volume');
    this.input_chat    = document.getElementById('chat-box');
    
    this.select_setups = document.getElementById('setups');
    
    this.button_rules  = document.getElementById('rules');
    this.button_new    = document.getElementById('new');
    this.button_save   = document.getElementById('save');
    this.button_load   = document.getElementById('load');
  
  } // End of constructor

  // Shrink the help menu
  hide_help() {
    this.div_help.style.clipPath = 'inset(100% 100% -1em -1em)'
    this.div_help.style.opacity = 0;
    this.div_help_button.style.opacity = 1;
    //this.save_cookie('saw_help', true);
  }
  show_help() {
    this.div_help.style.clipPath = 'inset(-1em -1em -1em -1em)'
    this.div_help.style.opacity = 1;
    this.div_help_button.style.opacity = 0;
  }
  toggle_help() {
    if(this.div_help.style.opacity == '1') this.hide_help();
    else                                   this.show_help();
  }

  // Hide controls etc
  hide_controls() {
    this.div_controls.style.opacity  = 0;
    this.div_controls.style.clipPath ='inset(-1em 100% 100% -1em)';
    this.div_controls_button.style.opacity = 1;
  }
  show_controls() {
    this.div_controls.style.opacity  = 1;
    this.div_controls.style.clipPath = 'inset(-1em -1em -1em -1em)';
    this.div_controls_button.style.opacity = 0;
  }
  toggle_controls() {
    if(this.div_controls.style.opacity == '1') this.hide_controls();
    else                                       this.show_controls();
  }

  // Fading elements out
  fade_element_out(e) {
    e.ontransitionend = function() {this.style.display = 'none';}
    e.style.opacity = 0;
  }
  
  // Fading an element in
  fade_element_in(e, display) {
    e.ontransitionend = undefined;
    if(!display) e.style.display = 'flex';
    else         e.style.display = display;
    e.style.opacity = 1;
  }

  // Returns the cookie value or undefined
  load_cookie(key) { 
    key = encodeURIComponent(key);
    
    // get a list of the cookie elements
    var cs = document.cookie.split(';');

    // Default is empty string
    var value = '';

    // Loop over elements to find the key
    for(var i=0; i<cs.length; i++) {

        // split by "=" sign
        var s = cs[i].split('=');

        // strip white space
        while (s[0].charAt(0)==' ') s[0] = s[0].substring(1);

        // If it's our key
        if(s[0] == VGT.game.settings.name+'_'+key) {
            value = decodeURIComponent(s[1]);
            break;
        };
    }

    return value;
  }

  // Saves a cookie
  save_cookie(key, value, expire_days) { 
    if(expire_days==undefined) expire_days=28;

    // Get rid of weird key characters
    key   = encodeURIComponent(key);
    value = encodeURIComponent(value);

    // get the expiration date
    var d = new Date();
    d.setTime(d.getTime() + (expire_days*24*60*60*1000));
    
    // now write the cookie string
    document.cookie = VGT.game.settings.name+'_'+key + '=' + value + '; expires=' + d.toUTCString() + '; SameSite=Lax';
  }

  string_to_html(s) {
    var e = document.createElement('div');
    e.innerText = s;
    return e.innerHTML;
  }

  html_to_string(s) {
    var e = document.createElement('div');
    e.innerHTML = s;
    return e.innerText;
  }

  /**
   * Updates the chat box with the supplied name and message.
   */
  chat(name, message) { VGT.log('Html.chat()', name, message);

    name = this.string_to_html(name);
    message = this.string_to_html(message);
    
    // Add links
    //
    // loop over each word, looking for a dot followed by a character
    var s = message.split(' ');
    for(var i in s) {

      // Split by dots and see if the last element is something.
      var p = s[i].split('.'); 
      if(p.length > 1 && p[p.length-1] != '') {

        // link variable should be properly formed
        var l = s[i];
        if(l.indexOf('://') < 0) l = 'http://'+s[i];
        if(l.indexOf('@')  >= 0) l = 'mailto:'+s[i];
        s[i] = '<a href="'+l+'" target="new">'+s[i]+'</a>';
      } 
    }
    message = s.join(' ');


    // messages div object
    var m = VGT.html.ul_messages;

    // append a <li> object to it
    var li = document.createElement("li");
    li.innerHTML = '<b>' + name + ':</b> ' + unescape(message);
    m.append(li);

    // scroll to the bottom of the history
    m.scrollTop = m.scrollHeight;

    // Show the controls
    this.show_controls();
  }

  // Updates the client information in the GUI
  rebuild_client_table() {
    VGT.log('Html.rebuild_client_table()');

    // Clear out the clients table
    var clients_table = document.getElementById('clients');
    clients_table.innerHTML = '';

    // Loop over the supplied clients
    var row, rows = [];
    for(var id in VGT.net.clients) {
      var c = VGT.net.clients[id];
      VGT.log('  ', c.id, c.name, c.team);

      // Get the "safe" name & team
      var name = html_encode(c.name);
      var team = html_encode(c.team);
      if(id == VGT.net.id) {
        VGT.html.save_cookie('name', name);
        VGT.html.save_cookie('team', team);
      }

      // Create the row for this client
      row = document.createElement('div'); row.classList.add('row_left');

      // If it's me, put it at the top of this list, otherwise push
      if(id == VGT.net.id) rows.splice(0,0,row);
      else                 rows.push(row);

      // If it's me, make it an editable name box
      if(id == VGT.net.id) row.innerHTML = '<input id="name" class="name" onchange="VGT.interaction.onchange_name(event)" value="'+name+'" />';
      else                 row.innerHTML = '<input class="othername" readonly value="'+name+'" />';

      // Now create the team selector
      var s = document.createElement("select"); s.classList.add('team_name');
      s.id  = String(id); 
      s.onchange = VGT.interaction.onchange_team;

      // Create and append the options
      var color, rgb;
      for (var k in VGT.game.settings.teams) {
          var o = document.createElement("option");
          o.value = k;
          o.text  = k;

          // Match the color
          color = VGT.game.settings.teams[k];
          o.style = 'background-color: #'+color.toString(16)+'FF;';
          
          // If the color is too bright (per ITU-R BT.709 definition of luma), go black with the text
          if(get_luma_ox(color) > 0.7) o.style.color='black';
          else                         o.style.color='white';
          
          // Add it to the list
          s.appendChild(o);
      }

      // Set the team
      s.selectedIndex = team;
      var team_name = Object.keys(VGT.game.settings.teams)[team];

      // Set the background color of the visible element
      color = VGT.game.settings.teams[team_name]
      s.style.backgroundColor = '#'+color.toString(16);

      // Set the text to white or black, depending on how light it is
      rgb = ox_to_rgb(color);
      if(get_luma_ox(color) > 0.7) s.style.color='black';
      else                         s.style.color='white';
      
      // Finally, append it to the team cell
      row.appendChild(s);
      
    } // End of loop over clients

    // Now add the rows in order
    for(var n in rows) clients_table.append(rows[n]);

    // Show the controls
    this.show_controls();

  } // End of rebuild_client_table()

} // End of _Html
VGT.html = new _Html();




// Netcode
class _Net {

  constructor() {

    this.io = io();         // Network object
    this.id = 0;            // My client id.
    this.ready = false;     // Whether we pay attention to the network traffic yet
    this.clients      = {}; // Client objects by client id
    
    // Queue of outbound information for the next housekeeping.
    this.q_pieces_out     = {};
    this.q_hands_out      = {}; 
    this.q_nameplates_out = {}; 
    this.q_sounds_out     = []; // List of sound play info
    this.q_z_out          = []; // Ordered list of requested z-operations
    
    // Queue of inbound information for the next housekeeping.
    this.q_pieces_in     = {}; 
    this.q_hands_in      = {};
    this.q_nameplates_in = {};
    this.q_sounds_in     = []; // List of sound play info
    this.q_z_in          = []; // Ordered list of z-operations to implement
    
    // Defines all the functions for what to do with incoming packets.
    this.setup_listeners();

  } // End of constructor()

  /** Deals with the incoming AND outbound packets. */
  process_queues(immediate) {
    if(!this.ready) return;
    var c, p, n, l;
    
    /////////////////////////////////////////
    // INBOUND

    // object, indexed by layer, of lists of piece datas having z-order to set
    var zs = {}; 

    //// SOUNDS
    for(var n in this.q_sounds_in) VGT.game.sounds.play(...this.q_sounds_in[n], true);
    this.q_sounds_in.length=0;

    //// PIECES
    for(var id_piece in this.q_pieces_in) { 
      c = this.q_pieces_in[id_piece]; // incoming changes for this thing
      p = VGT.pieces.all[id_piece];   // the actual piece object

      // If it's a valid piece
      if(p) {
        
        // If the incoming piece has z data (small changes may not)
        if(c.z != undefined && c.l != undefined) { 

          // Give easy access to the piece object
          c.piece = p; 
          c.id = id_piece;
          
          // Make sure we have a list for this layer
          if(!zs[c.l]) zs[c.l] = [];

          // Add to the list for this layer
          zs[c.l].push(c); 
        } 

        // Process the data for this piece, determine and set holder, selected, xyrs, etc.
        p.process_q_data(c, immediate);
      
      } // End of valid piece
    
    }; // End of loop over q_pieces_in
    
    // Clear out the piece queue
    this.q_pieces_in = {}; 
  
    // Loop over the layers, sorting by the desired z, and then sending to that z
    for(l in zs) { if(zs[l].length == 0) continue;

      // Sort by z
      sort_objects_by_key(zs[l], 'z');
      
      // Now insert them from bottom to top.
      for(n in zs[l]) zs[l][n].piece._set_z_value(zs[l][n].z);
    }

  


    //// NAMEPLATES (No z-processing)
    for(var id_nameplate in this.q_nameplates_in) { 
      c = this.q_nameplates_in[id_nameplate]; // incoming changes for this thing
      p = VGT.nameplates.all[id_nameplate];   // the actual piece object

      // If it's a valid piece (sometimes it might be a fluctuating piece id, like nameplates)
      // Determine and set the holder, selection, xyrs, etc
      if(p) p.process_q_data(c, immediate);
          
    }; // End of loop over q_nameplates_in
    
    // Clear out the piece queue
    this.q_nameplates_in = {}; 
  


    // Loop over the hands in the input queue
    for(var id_hand in this.q_hands_in) {
      c = this.q_hands_in[id_hand]; // Incoming changes
      p = VGT.hands.all[id_hand];   // Actual hand

      // Visually update the hand's position (x,y,r,s), image (n), and mousedown table coordinates (vd) if it's not our hand
      if(p && p.id_client != VGT.net.id) { 

        // Replacement process_q_data for hands; could move this to an overload function...
        
        // If we're overriding the server's immediate
        if(immediate != undefined) c['now'] = true;
        
        // Force-set the position etc (we will never be holding or send others' hand info)
        p.set_packet_attributes(['x','y','r','n'], c);
        
        // vd should be null or [x,y] for the down click coordinates
        if(c.vd != undefined) p.vd = c.vd;
      }
    } // End of loop over hands
    
    // Clear out the hands queue.
    this.q_hands_in = {}; // End of loop over q_hands_in

    
    


    /////////////////////////////////////////////////
    // OUTBOUND

    // Send the outbound information
    if(Object.keys(this.q_pieces_out    ).length 
    || Object.keys(this.q_hands_out     ).length
    || Object.keys(this.q_nameplates_out).length
    || this.q_sounds_out.length) {

      // Send the outbound information and clear it.
      //VGT.log(    'NETS_q_'+String(VGT.net.id), this.q_pieces_out, this.q_hands_out, this.q_nameplates_out, this.q_sounds_out);
      VGT.log('NETS_q_'+String(VGT.net.id), Object.keys(this.q_pieces_out).length, Object.keys(this.q_hands_out).length, Object.keys(this.q_nameplates_out).length, this.q_sounds_out.length);
      this.io.emit('q', [this.q_pieces_out, this.q_hands_out, this.q_nameplates_out, this.q_sounds_out]);
      this.q_pieces_out     = {};
      this.q_hands_out      = {};
      this.q_nameplates_out = {};
      this.q_sounds_out.length = 0;
    }
  } // End of process_queues()

  // Processes outbound z queues. Incoming z is handled immediately.
  process_q_z_out() {
    if(this.q_z_out.length) {
      this.io.emit('z', this.q_z_out);
      this.q_z_out.length = 0;
      
      // Order of operations matters for z, so we can't have 
      // the next full update ordering them before we receive
      // the ping-back.
      //
      // This flag causes the z-information to be stripped from the
      // next full update.
      this.skip_next_z = true;  
    }
  }

  // Transfers information from q_source to q_target, with id_client
  transfer_to_q_in(q_source, q_target) { //VGT.log('transfer_to_q_in', q_source, q_target)

    // Loop over pieces in source queue
    for(var id in q_source) {
          
      // Make sure the target has a place for the data
      if(!q_target[id]) q_target[id] = {}
        
      // Update each attribute
      for(var k in q_source[id]) q_target[id][k] = q_source[id][k]; 
 
    } // End of loop over things in q_pieces
  }

  // Server relayed a z command [id,z,id,z,id,z,...]
  on_z(data) { if(!this.ready) return; VGT.log('NETR_z', data.length);

    // Set the z locally
    for(var n=0; n<data.length; n+=2) VGT.pieces.all[data[n]]._set_z_value(data[n+1]);
  }

  /** We receive a queue of piece information from the server. */
  on_q(data) { if(!this.ready) return; VGT.log('NETR_q', data);
  
    // Incoming q's are objects with id-indexed objects containing piece parameters or changes in those.
    
    // Element 3 is true (not undefined). If this is a full update and we're supposed to skip the z information
    // strip away the z stuff!
    if(data[3] && this.skip_next_z) {

      // Loop over the pieces data[0] and strip all the z-info
      for(var i in data[0]) {delete data[0][i].z}
      
      // No need to do this again until we alter z.
      this.skip_next_z = false;
    }

    // Update the q's
    this.transfer_to_q_in(data[0], this.q_pieces_in);
    this.transfer_to_q_in(data[1], this.q_hands_in);
    this.transfer_to_q_in(data[2], this.q_nameplates_in);
    
  } // end of on_q

  on_sounds(data) { if(!this.ready) return; VGT.log('NETR_sounds', data);
    for(var n in data) this.q_sounds_in.push(data[n]);
  }

  /** First thing to come back after 'hallo' is the full game state. */
  on_state(data) { VGT.log('NETR_state', data);

    // This assumes 'id' and 'clients' packet has already arrived.

    // Get the enabled piece count
    var count = 0;
    for(var k in VGT.pieces.all) if(!VGT.pieces.all[k].is_disabled) count++;
    
    // If there are no or too few pieces on the server, initialize / create entries the server's state with layer and z data
    // This should only actually happen if the server has NO pieces, and we're just creating our z-data for it.
    if(Object.keys(data.pieces).length != count) {
      VGT.log('  NETR_state: Mismatched number of pieces; sending layer and z info...');
      var p;
      for(var n in VGT.pieces.all) { p = VGT.pieces.all[n];
        p.update_q_out('z');
        p.update_q_out('l');
        p._z_target = p.get_z_value();   // The other place this "engine tracking" z is set is when the server sends us info, in process_queues
        //p.update_q_out('ih');            // Also update the holder so there's at least a number associated with the piece.
      }
    }

    // After a disconnect, there can be leftover lists like things.selected and things.held that need fixing. 
    VGT.game.unselect_all_teams(VGT.things.all, true); // Start in a state where nothing is selected locally, and let the incoming data tell us everything else.
    // Things.held should be corrected on the first click.

    // Regardless of the z-fix above, process rest of the incoming piece data (xyrs, etc), ignoring the nameplates and hands
    this.q_pieces_in = data['pieces'];
    //this.q_nameplates_in = data['nameplates']; // Nameplates are not even assigned yet
    //this.q_hands_in      = data['hands'];      // We should update these when people move.
    this.process_queues(true); // immediate

    // Make sure all the hands are initially faded out
    for(var n in VGT.hands.all) VGT.hands.all[n].t_last_image = VGT.hands.all[n].t_last_move = 0;

    // Now (delayed, so pieces can snap to their starting locations) hide the loader page so the user can interact
    VGT.html.fade_element_out(VGT.html.div_loader);

    // Reset the fade-in ticker
    VGT.tabletop._t0_fade_in = Date.now();

    // Ready to receive all the other packets now. The next one should be clients.
    VGT.net.ready = true; 
    delete this._connecting_to_server;

    // Set the tab title
    document.title = VGT.game.settings.name;
    
  } // End of on_state

  /** Someone sends [id, clients] table data. */
  on_clients(data) { if(!this.ready) return; VGT.log('NETR_clients', data);

    // IMPORTANT: This can happen when the server reboots and we are still "connected".
    // In this case, VGT.net.id is stale and will not match. See VGT.clients.rebuild()

    // Get my VGT.net.id and update the clients list, then rebuild the data and html
    this.id      = parseInt(data[0]);
    this.clients = data[1];
    VGT.clients.rebuild();

  } // End of on_clients

  /** Server boots you. */
  on_yabooted() {
    VGT.log('NETR_yabooted');
    document.body.innerHTML = 'Booted. Reload page to rejoin.'
    document.body.style.color = 0xFFFFFF;
  } // End of on_yabooted

  /** Someone plays a sync'd sound */
  on_say(data) { if(!VGT.net.ready) return;
    VGT.log('NETR_say', data);

    // Say it
    //clients[data[0]].say(data[1], data[2], data[3]);
  } // End of on_say

  /** Someone sends a chat. */
  on_chat(data) {if(!VGT.net.ready) return;
      
    var id = data[0];
    var message = data[1];
    VGT.log('NETR_chat', id, message);

    // Safe-ify the message
    message = html_encode(message);
    
    // Get the name
    if(id == 0) var name = 'Server'
    else        var name = html_encode(this.clients[id].name);
    
    // Update the interface
    VGT.html.chat(unescape(name), unescape(message));
  
  } // End of on_chat

  /** Someone kills our undos. Important for tantrums. */
  on_kill_undos(data) {if(!VGT.net.ready) return;
    if(VGT.game._undos) VGT.game._undos.length = 0;
    if(VGT.game._redos) VGT.game._redos.length = 0;
  }

  // Server connection error; just reload so things don't get out of sync and the user is 
  // accutely aware of what's happening!
  on_connect_error() { location.reload(); }

  /** Define what server messages to expect, and how to handle them. */
  setup_listeners() {
  
    this.io.on('z',             this.on_z         .bind(this));
    this.io.on('q',             this.on_q         .bind(this));
    this.io.on('sounds',        this.on_sounds    .bind(this));
    this.io.on('clients',       this.on_clients   .bind(this));
    this.io.on('state',         this.on_state     .bind(this));
    this.io.on('yabooted',      this.on_yabooted  .bind(this));
    this.io.on('say',           this.on_say       .bind(this)); 
    this.io.on('chat',          this.on_chat      .bind(this));
    this.io.on('kill_undos',    this.on_kill_undos.bind(this));
    this.io.on('connect_error', this.on_connect_error.bind(this));

  } // End of setup_listeners()

  /**
   * Connect to the server (don't do this until Pixi is ready)
   */
  connect_to_server() {

    // If we're already trying to connect, poop out.
    if(this._connecting_to_server) return;
    this._connecting_to_server = true; // Prevent housekeeping from connecting repeatedly
    
    VGT.log('connect_to_server()', this);
  
    // Get name to send to server with hallo.
    var name = VGT.html.html_to_string(VGT.html.load_cookie('name'));
    

    var team = parseInt(VGT.html.load_cookie('team'));
    if(isNaN(team)) team = 0;

    // Ask for the game state.
    VGT.log(    'NETS_hallo', [name, team]);
    this.io.emit('hallo', [name, team]);
  }
} // End of _Net
VGT.net = new _Net();


////////////////////////////////////
// PIXI SETUP                     //
////////////////////////////////////

/**
 * Holds all the pixi stuff.
 */
class _Pixi {

  constructor() {

    // Let's the rest of the world know the pixi stage is ready.
    this.ready = false;
    this.queue = [];

    // Create the app instance
    this.app = new PIXI.Application({
      autoResize:  true, 
      resolution:  devicePixelRatio, 
      antialias:   true, 
      transparent: false,
    });

    // Add the canvas that Pixi automatically created for you to the HTML document
    VGT.html.div_gameboard.appendChild(this.app.view);

    // Aliases
    this.loader      = PIXI.Loader.shared,
    this.resources   = PIXI.Loader.shared.resources,
    this.stage       = this.app.stage;
    this.renderer    = this.app.renderer;

    // Seeing if this prevents a garbage collection from causing the context lost error.
    this.canvas      = this.renderer.view;
    this.context     = this.renderer.context; 

    // Set up the renderer
    this.renderer.backgroundColor     = 0x000000;
    this.renderer.autoDensity         = true;
    this.renderer.view.style.position = "absolute";
    this.renderer.view.style.display  = "block";

    // Add the touchable 'surface' with the background color
    this.surface = new PIXI.Graphics().beginFill(VGT.game.settings.background_color).drawRect(0, 0, 1, 1);
    this.stage.addChild(this.surface);

    // Set up loading progress indicator, which happens pre PIXI start
    this.loader.onProgress.add(this.loader_onprogress.bind(this));

    // Fix the root path to have the correct connecting character
    VGT.images.root = finish_directory_path(VGT.images.root);

    // Create a list of paths to send to the pre-loader
    var full_paths = [];
    
    for(var k in VGT.images.paths) full_paths.push(VGT.images.root + VGT.images.paths[k]);
    this.loader.add(full_paths).load(this.loader_oncomplete.bind(this)); 
  
    // Game loop counter
    this.n_loop = 0;
    this.N_loop = 0;
  }

  /** Add a thing to the queue it for when it's ready */
  add_thing(thing) { 

    // If pixi is ready, initialize / add the thing.
    if(this.ready) this._add_thing(thing);
    
    // Otherwise, push it to the queue.
    else this.queue.push(thing);
  }

  /** Internally called when pixi is ready. Actually initializes / adds the thing to the layer etc. */
  _add_thing(thing) {
    VGT.log('   _add_thing()', thing.id_thing, 'to layer', thing.settings.layer);

    // Do the pixi initialization
    thing._initialize_pixi();

    // Check special layers first

    // HANDS layer
    if(thing.settings.layer == VGT.tabletop.LAYER_HANDS) {

      // Make sure the layer exists
      if(!VGT.tabletop.layer_hands) {
        
        // Create the new layer and add it to the tabletop
        var l = new PIXI.Container();
        VGT.tabletop.layer_hands = l;
        
        // Update the layer's coordinates / scale.
        l.x=0; l.y=0; l.rotation=0; l.scale.x=1; l.scale.y=1;

        // Rebuild the layer order
        VGT.pixi.rebuild_layers();
      }

      // Add the hand 
      VGT.tabletop.layer_hands.addChild(thing.container);
    }

    // HAND SELECTION RECTANGLE layer
    else if(thing.settings.layer == VGT.tabletop.LAYER_SELECT) {
      
      // Make sure the layer exists
      if(!VGT.tabletop.layer_select) {
        
        // Create the new layer and add it to the tabletop
        var l = new PIXI.Container();
        VGT.tabletop.layer_select = l;
        
        // Update the layer's coordinates / scale.
        l.x=0; l.y=0; l.rotation=0; l.scale.x=1; l.scale.y=1;

        // Rebuild the layer order
        VGT.pixi.rebuild_layers();
      }

      // Add the polygon
      VGT.tabletop.layer_select.addChild(thing.container);
    }

    // NAMEPLATES layer
    else if(thing.settings.layer == VGT.tabletop.LAYER_NAMEPLATES) {
      
      // Make sure the layer exists
      if(!VGT.tabletop.layer_nameplates) {
        
        // Create the new layer and add it to the tabletop
        var l = new PIXI.Container();
        VGT.tabletop.layer_nameplates = l;
        
        // Update the layer's coordinates / scale.
        l.x=0; l.y=0; l.rotation=0; l.scale.x=1; l.scale.y=1;

        // Rebuild the layer order
        VGT.pixi.rebuild_layers();
      }

      // Add the nameplate
      VGT.tabletop.layer_nameplates.addChild(thing.container);
    }

    // If the thing has a "normal" layer, the settings.layer is an integer >= 0
    else {

      // If the tabletop does not contain this layer yet, create this layer.
      if(!VGT.tabletop.layers[thing.settings.layer]) {
        
        // Create the new layer and add it to the tabletop
        var l = new PIXI.Container();
        VGT.tabletop.layers[thing.settings.layer] = l;

        // Update the layer's coordinates / scale.
        l.x=0; l.y=0; l.rotation=0; l.scale.x=1; l.scale.y=1;

        // Remove all the layers and add them in order
        this.rebuild_layers();
      }

      // Add the thing to the layer
      VGT.tabletop.layers[thing.settings.layer].addChild(thing.container);

    } // End of "normal" layer

  } // End of _add_thing

  /**
   * Removes and re-adds all the layers in order.
   */
  rebuild_layers() {

    // Remove all layers and add them in order
    VGT.tabletop.container.removeChildren();

    // Now add them again in order
    for(var n in VGT.tabletop.layers) if(VGT.tabletop.layers[n]) 
      VGT.tabletop.container.addChild(VGT.tabletop.layers[n]);

    // Find the selection rectangle and hands layers and put them on last.
    if(VGT.tabletop.layer_nameplates) VGT.tabletop.container.addChild(VGT.tabletop.layer_nameplates);
    if(VGT.tabletop.layer_select)     VGT.tabletop.container.addChild(VGT.tabletop.layer_select);
    if(VGT.tabletop.layer_hands)      VGT.tabletop.container.addChild(VGT.tabletop.layer_hands);
  }

  loader_oncomplete(e) {
    VGT.log('loader_oncomplete()', e);

    // Now that we have all the resources, dump the thing queue into pixi.
    while(this.queue.length) this._add_thing(this.queue.shift())
    
    // Let the world know pixi is ready.
    this.ready = true;

    // Resize the window, which sets up the table
    VGT.interaction.onresize_window();

    // Start the game loop
    VGT.log('Starting game loop...');
    VGT.pixi.app.ticker.add(delta => VGT.pixi.game_loop(delta)); 
  }

  /**
   * Called whenever the image loader makes some progress.
   * @param {*} loader   // loader instance
   * @param {*} resource // resource that was just loaded
   */
  loader_onprogress(loader, resource) {
    VGT.log('progress: loaded', resource.url, loader.progress, '%');

      // Update the loader progress in the html
      VGT.html.div_loader.innerHTML = '<div id="progress">Loaded: ' + loader.progress.toFixed(0) + '%</div><div id="progress_path">' + resource.url + '</div>';
  }

  /** Called every 1/60 of a second (roughly).
   * @param {float} delta // Fraction of 1/60 second since last frame.
   */
  game_loop(delta) {
    
    // Used for printing log files (slowly), etc
    this.N_loop++;
    this.n_loop++;
    this.n_loop = this.n_loop % 60;
    if(!this.n_loop) {} // log ever so often

    // Animate thing & hand movement and other internal animations
    for(var id_thing in VGT.things.all) {
      VGT.things.all[id_thing].animate_xyrs(delta);
      VGT.things.all[id_thing].animate_other(delta);
    }

    // Animate the table
    VGT.tabletop.animate(delta);
    
    // Process z queues (we want this to be responsive)
    VGT.net.process_q_z_out();

  } // End of game_loop

} // End of _Pixi



// A quantity that is animated
class _Animated {

  default_settings = {
    t_transition   : 200, // Time to transition coordinates at full speed
    t_acceleration : 100, // Time to get to full speed   
    damping        : 0.05, // Velocity damping coefficient
  }

  constructor(value, settings) {

    // Store the settings
    this.settings = {...this.default_settings, ...settings};

    // Target value, current value, velocity, and acceleration
    this.target   = value;
    this.value    = value;
    this.velocity = 0;
  }

  // Set the target value
  set(target, immediate) {
    this.target = target;
    if(immediate) {
      this.value = target;
      this.velocity = 0;
    }
  }

  // Run the transition dynamics for a single frame of duration delta/(60 Hz)
  animate(delta) {
    // If we're there, poop out
    if(this.value == this.target) return 0;

    // Use the current location and target location to determine
    // the target velocity. Target velocity should be proportional to the distance.
    // We want it to arrive in t_transition / (16.7 ms) frames
    var a = (delta*16.7)/this.settings.t_transition; // inverse number of transition frames at max velocity 
    var velocity_target = a*(this.target - this.value);
    
    // Adjust the velocity as per the acceleration
    var b = (delta*16.7)/this.settings.t_acceleration; // inverse number of frames to get to max velocity
    var acceleration = b*(velocity_target - this.velocity);
    
    // Increment the velocity
    this.velocity += acceleration-this.velocity*this.settings.damping;

    // If the velocity is larger than the distance to the target, adjust
    //if(this.velocity >= this.target - this.value) this.velocity = 0.9*(this.target-this.value);

    // Send it.
    this.value += this.velocity;

    // If we're close enough, snap
    if(Math.abs(this.velocity) < 1e-8) {
      this.value = this.target;
      this.velocity = 0;
    }

    return this.velocity;
  }
}





// Tabletop for simplifying pan and zoom (basically a fancy container)
class _Tabletop {

  default_settings = {
    pan_step: 0.2, // Fraction of width or height when panning 1 step
    r_step:    45, // Degrees for table rotation steps
    s_step:   1.2, // Fraction for each zoom step.
    s_max:    4,   // Largest zoom-in level
    s_min:    0.1, // Max zoom-out
    s_start:  1,   // Starting zoom level
  }

  constructor(settings) {

    this.settings = {...this.default_settings, ...settings}
    
    // Create the container to hold all the layers.
    this.container = new PIXI.Container();
    VGT.pixi.stage.addChild(this.container);
    
    // Targets equal actual, with zero velocity
    this.x = new _Animated(0);
    this.y = new _Animated(0);
    this.r = new _Animated(0);
    this.s = new _Animated(this.settings.s_start); 
    
    // Load the last view immediately
    this.load_view('last', true);

    // Update the 
    this.container.rotation = this.r.value*0.01745329251; // to radians
    this.container.scale.y  = this.container.scale.x = this.s.value;

    // center the container within the window
    this.container.x = 0.5*window.innerWidth;  
    this.container.y = 0.5*window.innerHeight;

    this.LAYER_HANDS      = -1; // Constant for denoting the hands layer. Normal layers are positive integers.
    this.LAYER_SELECT     = -2; // Layer just below the hands for selection rectangles
    this.LAYER_NAMEPLATES = -3; // Layer just below selection rectangles for nameplates.
    this.layers           = []; // List of containers for each layer

    this._t0_fade_in = 0; // Start time for fade-in. Will be reset when everything is ready
  }

  /**
   * Converts x,y from the stage surface (e.g. from a mouse event) to tabletop coordinates.
   * @param {number} x 
   * @param {number} y 
   * @returns 
   */
  xy_stage_to_tabletop(x,y) {
    
    var r_rad = this.container.rotation;
    var r_deg = r_rad / 0.01745329251;

    // Undo the shift of the table top center
    var x1 = x - this.container.x + (this.container.pivot.x*Math.cos(r_rad) - this.container.pivot.y*Math.sin(r_rad))*this.container.scale.x;
    var y1 = y - this.container.y + (this.container.pivot.x*Math.sin(r_rad) + this.container.pivot.y*Math.cos(r_rad))*this.container.scale.x;
    
    // Undo the rotation and scale of the tabletop
    var v = rotate_vector( [x1/this.container.scale.x, y1/this.container.scale.y], -r_deg);
    return {x:v[0], y:v[1]}
  }

  /**
   * Updates the actual tabletop location / geometry via the error decay animation, 
   * and should be called once per frame.
   */
   animate(delta) { if(!delta) delta = 1;
    
    // Update the internal quantities
    var vx = this.x.animate(delta);
    var vy = this.y.animate(delta);
    var vr = this.r.animate(delta);
    var vs = this.s.animate(delta); // vs used for scaling below

    // Set the actual position, rotation, and scale
    this.container.pivot.x  = -this.x.value;
    this.container.pivot.y  = -this.y.value;
    this.container.rotation =  this.r.value*0.01745329251; // to radians
    this.container.scale.x  =  this.s.value;
    this.container.scale.y  =  this.s.value;
    this.container.alpha    = 1-fader_smooth(500+this._t0_fade_in, 700)
    
    // Update the mouse position
    if( (Math.abs(this.x.value-this.x.target) > 0.1/this.s.value
      || Math.abs(this.y.value-this.y.target) > 0.1/this.s.value
      || Math.abs(this.r.value-this.r.target) > 0.001/this.s.value
      || Math.abs(this.s.value-this.s.target) > 0.001/this.s.value)
      && VGT.interaction.last_pointermove_e ) 
      VGT.interaction.onpointermove(VGT.interaction.last_pointermove_e);

    // Set the hand scale
    if(Math.abs(vs) > 1e-8) VGT.hands.set_scale(1.0/this.s.value);


    // Redraw selection graphics if the scale is still changing (gets heavy with lots of selection; why scale?)
    /*if(Math.abs(vs) > 1e-6)
      for(var t in VGT.things.selected) 
        for(var i in VGT.things.selected[t])
          VGT.things.selected[t][i].draw_select_graphics(t); */
  }

  /** 
  * TABLETOP Sets the target x,y,r,s for the tabletop.
  * 
  */
  set_xyrs(x,y,r,s,immediate) { 

    // Now for each supplied coordinate, update and send
    if(x!=undefined && x != this.x.target) {this.x.set(x, immediate);}
    if(y!=undefined && y != this.y.target) {this.y.set(y, immediate);}
    if(r!=undefined && r != this.r.target) {this.r.set(r, immediate);}
    if(s!=undefined && s != this.s.target) {this.s.set(s, immediate);}
    this.t_last_move = Date.now();

    // Remember the last view
    this.save_view('last');
  }
  
  // Panning the view
  pan_up(e) { 
    var scale = 1; if(e && e.altKey) scale = 0.02;
    var dr = scale*this.settings.pan_step*window.innerHeight/this.s.value;
    var dx = dr*Math.sin(this.r.value*0.01745329251);
    var dy = dr*Math.cos(this.r.value*0.01745329251);
    this.set_xyrs(
      -this.container.pivot.x + dx, 
      -this.container.pivot.y + dy,
      undefined, undefined);
  }
  pan_down(e) { 
    var scale = 1; if(e && e.altKey) scale = 0.02;
    var dr = scale*this.settings.pan_step*window.innerHeight/this.s.value;
    var dx = dr*Math.sin(this.r.value*0.01745329251);
    var dy = dr*Math.cos(this.r.value*0.01745329251);
    this.set_xyrs(
      -this.container.pivot.x - dx, 
      -this.container.pivot.y - dy,
      undefined, undefined);
  }
  pan_left(e) { 
    var scale = 1; if(e && e.altKey) scale = 0.02;
    var dr = scale*this.settings.pan_step*window.innerHeight/this.s.value;
    var dx =  dr*Math.cos(this.r.value*0.01745329251);
    var dy = -dr*Math.sin(this.r.value*0.01745329251);
    this.set_xyrs(
      -this.container.pivot.x + dx, 
      -this.container.pivot.y + dy,
      undefined, undefined);
  }
  pan_right(e) { 
    var scale = 1; if(e && e.altKey) scale = 0.02;
    var dr = scale*this.settings.pan_step*window.innerHeight/this.s.value;
    var dx =  dr*Math.cos(this.r.value*0.01745329251);
    var dy = -dr*Math.sin(this.r.value*0.01745329251);
    this.set_xyrs(
      -this.container.pivot.x - dx, 
      -this.container.pivot.y - dy,
      undefined, undefined);
  }

  rotate(dr) {

    // Set the table rotation target
    this.set_xyrs(undefined, undefined, this.r.target + dr);
  }
  rotate_left()  {this.rotate(-this.settings.r_step);}
  rotate_right() {this.rotate( this.settings.r_step);}

  // Rotates the selected things by their angle settings
  rotate_selected(scale) {
    var dr, thing;
    for(var id_thing in VGT.things.selected[VGT.clients.me.team]) {
      thing = VGT.things.selected[VGT.clients.me.team][id_thing];
      dr    = -scale*thing.settings.r_step;
      
      // We update the target of the auxiliary rotation
      thing.R.target += dr;
      thing.update_q_out('R','R');
    }
  }
  rotate_selected_left()    {this.rotate_selected(1);}
  rotate_selected_right()   {this.rotate_selected(-1);}
  rotate_selected_to_hand() {
    var thing;
    for(var id_thing in VGT.things.selected[VGT.clients.me.team]) {
      thing = VGT.things.selected[VGT.clients.me.team][id_thing];
      thing.R.target = -thing.r.target - VGT.tabletop.r.target; 
      thing.update_q_out('R','R');
    }
  }
  rotate_selected_to_table() {
    var thing;
    for(var id_thing in VGT.things.selected[VGT.clients.me.team]) {
      thing = VGT.things.selected[VGT.clients.me.team][id_thing];
      thing.R.target = -thing.r.target;
      thing.update_q_out('R','R');
    }
  }

  /**
   * Saves the current view as a cookie with the specified key name
   * @param {string} key String identifier for the view
   */
  save_view(key) {
    VGT.html.save_cookie(key, [this.x.target, this.y.target, this.r.target, this.s.target]);
  }

  /**
   * Loads the view cookie with the specified key
   * @param {string} key String identifier for the view
   * @param {boolean} immediate Do this immediately
   * @returns 
   */
  load_view(key, immediate) {
    var c = VGT.html.load_cookie(key);
    if(c == '') this.set_xyrs(0,0,0,this.settings.s_start);
    else { 
      // Get [x,y,r,s]
      var v = eval('['+c+']');

      // Set it
      this.set_xyrs(...v, immediate);
    }
  }

  zoom(factor) {

    // Keep it within bounds
    if(this.s.target*factor > this.settings.s_max
    || this.s.target*factor < this.settings.s_min) return;
    
    // Set the target zoom
    this.set_xyrs(
      undefined, undefined, undefined,
      this.s.target * factor);
  }

  zoom_in(e) {_l(e)
    if(e && e.shiftKey) this.zoom(Math.pow(this.settings.s_step, 0.25));
    else                this.zoom(this.settings.s_step);
  }
  zoom_out(e) {
    if(e && e.shiftKey) this.zoom(Math.pow(1.0/this.settings.s_step, 0.25));
    else                this.zoom(1.0/this.settings.s_step);
  }
} // End of _Tabletop





////////////////////////
// Interactions
////////////////////////
// INTERACTION MANAGER
class _Interaction {

  constructor() {
    
    // Which mouse button is down
    this.button = undefined;

    // Dictionary of functions for each key
    this._key_functions = {}

    // Other functions to call for mouse buttons
    this._pointerdown_functions = {};

    ////////////// KEYS

    // Controls and help
    this.bind_key('Escape|Down', VGT.html.toggle_controls.bind(VGT.html));
    this.bind_key('F1|Down',     VGT.html.toggle_help    .bind(VGT.html));

    // Pan view
    this.bind_key(['KeyA|Down', 'ArrowLeft|Down',  'Numpad4|Down'],                 VGT.tabletop.pan_left .bind(VGT.tabletop));
    this.bind_key(['KeyD|Down', 'ArrowRight|Down', 'Numpad6|Down'],                 VGT.tabletop.pan_right.bind(VGT.tabletop));
    this.bind_key(['KeyW|Down', 'ArrowUp|Down',    'Numpad8|Down'],                 VGT.tabletop.pan_up   .bind(VGT.tabletop));
    this.bind_key(['KeyS|Down', 'ArrowDown|Down',  'Numpad5|Down', 'Numpad2|Down'], VGT.tabletop.pan_down .bind(VGT.tabletop));

    // Rotate view
    this.bind_key(['KeyQ|Down', 'Numpad7|Down'], VGT.tabletop.rotate_left .bind(VGT.tabletop));
    this.bind_key(['KeyE|Down', 'Numpad9|Down'], VGT.tabletop.rotate_right.bind(VGT.tabletop));

    // Zoom
    this.bind_key(['Equal|Down', 'NumpadAdd|Down',      'Shift|Equal|Down', 'Shift|NumpadAdd|Down'],      VGT.tabletop.zoom_in .bind(VGT.tabletop));
    this.bind_key(['Minus|Down', 'NumpadSubtract|Down', 'Shift|Minus|Down', 'Shift|NumpadSubtract|Down'], VGT.tabletop.zoom_out.bind(VGT.tabletop));

    // Save/Load views
    this.bind_key([
      'Backquote|Down', 
      'Digit1|Down', 'Digit2|Down', 'Digit3|Down', 'Digit4|Down',
      'Digit5|Down', 'Digit6|Down', 'Digit7|Down', 'Digit8|Down',
      'Digit9|Down', 'Digit0|Down'], this.load_view.bind(this));
    this.bind_key([
      'Shift|Digit1|Down', 'Shift|Digit2|Down', 'Shift|Digit3|Down', 'Shift|Digit4|Down',
      'Shift|Digit5|Down', 'Shift|Digit6|Down', 'Shift|Digit7|Down', 'Shift|Digit8|Down',
      'Shift|Digit9|Down', 'Shift|Digit0|Down'], this.save_view.bind(this));

    // Rotate selected pieces
    this.bind_key(['Shift|KeyA|Down', 'Shift|ArrowLeft|Down',  'Shift|Numpad4|Down'], VGT.tabletop.rotate_selected_left    .bind(VGT.tabletop));
    this.bind_key(['Shift|KeyD|Down', 'Shift|ArrowRight|Down', 'Shift|Numpad6|Down'], VGT.tabletop.rotate_selected_right   .bind(VGT.tabletop));
    this.bind_key(['Shift|KeyW|Down', 'Shift|ArrowUp|Down',    'Shift|Numpad8|Down'], VGT.tabletop.rotate_selected_to_table.bind(VGT.tabletop));
    this.bind_key(['Shift|KeyS|Down', 'Shift|ArrowDown|Down',  'Shift|Numpad5|Down', 'Shift|Numpad2|Down'], VGT.tabletop.rotate_selected_to_hand .bind(VGT.tabletop));
    
    // Align / distribute selected pieces
    this.bind_key(['KeyH|Down', 'KeyV|Down', 'Shift|KeyH|Down', 'Shift|KeyV|Down'], this.align_distribute_selected.bind(this));

    // Collect, expand, shuffle
    this.bind_key(['KeyC|Down', 'Shift|KeyC|Down'], this.collect_selected_to_mouse .bind(this));
    this.bind_key(['KeyX|Down', 'Shift|KeyX|Down'], this. expand_selected_to_mouse .bind(this));
    this.bind_key(['KeyZ|Down', 'Shift|KeyZ|Down'], this.start_shuffle_or_undo_redo.bind(this));
    this.bind_key(['KeyR|Down'], this.start_roll.bind(this));
    this.bind_key(['KeyR|Up'],   this.roll.bind(this));

    // Count
    this.bind_key(['Enter|Down', 'NumpadEnter|Down'], this.count_selected.bind(this));

    // Cycle images
    this.bind_key(['Space|Down', 'Period|Down', 'Shift|Space|Down'], this.increment_selected_images.bind(this));
    this.bind_key(['Comma|Down'],                                    this.decrement_selected_images.bind(this));

    // Tantrum
    this.bind_key(['Shift|Escape|Down'], this.tantrum.bind(this));

    // Event listeners
    document.addEventListener('contextmenu', e => {e.preventDefault();}); 
    window  .addEventListener('resize',  this.onresize_window);
    
    // Starting values
    this.xm_tabletop = 0;
    this.ym_tabletop = 0;

    // Pointer interactions
    // Using the surface and objects with the built-in hit test is rough, because it
    // does it for every mouse move, etc. Also, I can't seem to get the button number
    // this way in PixiJS 6.
    VGT.pixi.app.view.onpointerdown = this.onpointerdown.bind(this);
    VGT.pixi.app.view.onpointermove = this.onpointermove.bind(this);
    VGT.pixi.app.view.onpointerup   = this.onpointerup  .bind(this);
    VGT.pixi.app.view.onpointerout  = this.onpointerup  .bind(this);
    VGT.pixi.app.view.onwheel       = this.onwheel      .bind(this);
    VGT.pixi.app.view.ondblclick    = this.ondblclick   .bind(this);

    // Keys
    window.addEventListener('keydown', this.onkey.bind(this));
    window.addEventListener('keyup',   this.onkey.bind(this));
  }

  /**
   * Connects the supplied key string (e.g. 'ShiftBackspaceDown'; see browser console when hitting keys for these names)
   * to the supplied function f
   * @param {string} keys  Key string (or list of strings) to bind to the function
   * @param {function}  f  Function; first argument must be the key event.
   */
  bind_key(keys, f) { 
    if(typeof keys == 'string') keys = [keys];
    for(var n in keys) this._key_functions[keys[n]] = f; 
  }

  /**
   * Binds the supplied mouse button to the supplied function
   * @param {int or list} buttons 
   * @param {function} f 
   */
  bind_pointerdown_button(buttons, f) {
    if(typeof keys == 'number') buttons = [buttons];
    for(var n in buttons) this._pointerdown_functions[buttons[n]] = f;
  }
  

  // Tantrum
  tantrum(e) {

    // loop over all pieces and send them in random directions
    var p, u1, u2, x, y, r;
    for (var n in VGT.pieces.all) { p = VGT.pieces.all[n];
     
      // If it's hidden don't bother
      if(p.is_hidden()) continue;

      // Get the starting random
      u1 = Math.random();
      u2 = Math.random();
      
      // Get it into a gaussian distribution
      x = Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)*400/VGT.tabletop.s.target;
      y = Math.sqrt(-2*Math.log(u1))*Math.sin(2*Math.PI*u2)*400/VGT.tabletop.s.target;
      r = Math.random()*5000-2500;
      p.set_xyrs(p.x.value+x,p.y.value+y,r).randomize_image_index();
    }

    // Kill everyone's undos
    VGT.net.io.emit('kill_undos');
  }

  // Count the selected items
  count_selected(e) {

    // Get the count object [pieces, worths]
    VGT.game.count(VGT.things.selected[VGT.clients.me.team], true);
  }

  // Loads the view associated with the pressed key
  load_view(e) {
    VGT.log('load_view()', e.code);

    // Load the cookie
    VGT.tabletop.load_view('view'+e.code);
  }

  // Saves the view associated with the pressed key
  save_view(e) {
    VGT.log('save_view()', e.code);

    // Save the cookie
    VGT.tabletop.save_view('view'+e.code);
  }

  increment_selected_images(e) {
    VGT.log('VGT.interaction.increment_selected_images()', e);

    // Now do the incrementing
    if(e.shiftKey) VGT.game.      set_image_indices(VGT.game.get_selected(), 0) 
    else           VGT.game.increment_image_indices(VGT.game.get_selected(undefined, true));
  }

  decrement_selected_images(e) {
    VGT.log('VGT.interaction.decrement_selected_images()', e);

    // Increment all the images
    VGT.game.decrement_image_indices(VGT.game.get_selected(undefined, true));
  }

  zero_selected_images(e) {
    VGT.log('VGT.interaction.zero_selected_images()', e);

    // Set all images to 0
    VGT.game.set_image_indices(VGT.game.get_selected(undefined, true), 0);
  }

  
  // Undo / redo
  undo_redo(e) {
    if(e.shiftKey) VGT.game.redo();
    else           VGT.game.undo();
  }

  // Starts the shuffle animation
  start_shuffle_or_undo_redo(e) {
    
    // Undo / redo
    if(e && e.ctrlKey) {
      this.undo_redo(e);
      return;
    }

    // Shuffle selected
    else this.start_shuffle(e);
  }

  start_shuffle(e) {

    // Nothing selected to shuffle
    if(VGT.things.selected[VGT.clients.me.team] == undefined) return;
    
    // Get the list of things we're shuffling
    var shuffling = Object.values(VGT.things.selected[VGT.clients.me.team]);

    // Start the shuffle
    VGT.game.start_shuffle(shuffling, this.xm_tabletop, this.ym_tabletop, VGT.clients.me.hand.r.value, undefined, true);

  }

  // Draws the pieces to the hand and starts the animation
  start_roll(e) { VGT.log('start_roll()');

    // Ignore subsequent keys
    if(this._rolling) return;

    // Collect to the starting mouse position, with offset (set to true to remove offset)
    this.collect_selected_to_mouse(e,false);
    this.xroll = this.xm_tabletop;
    this.yroll = this.ym_tabletop;

    // Remember that we're rolling
    this._rolling = VGT.game.get_selected();
  }

  // Throws the rolling pieces out (if any)
  roll(e) {

    // If rolling
    if(this._rolling) {

      // Distribute them around the mouse
      VGT.game.scramble(Object.values(this._rolling), this.xm_tabletop, this.ym_tabletop, 1.5, 1.4);

      // Not rolling
      this._rolling.length = 0;
      this._rolling = false;
    }
  }

  // Sends selected pieces to a neat stack below the mouse
  collect_selected_to_mouse(e, no_offsets) {
    
    // team index
    var team = VGT.clients.me.team; 
    if(!VGT.things.selected[team]) return

    // Last mouse move tabletop coordinates
    var x = this.xm_tabletop;       
    var y = this.ym_tabletop;
    var r = VGT.clients.me.hand.r.value;       

    // Get the unsorted pieces list
    var pieces = Object.values(VGT.things.selected[team]);

    // Do the collection
    if(e.shiftKey || no_offsets) VGT.game.collect(pieces, x, y, r, r, 0, 0);
    else                         VGT.game.collect(pieces, x, y, r, r, undefined, undefined, true);
  }

  // Expands the selected pieces in a grid below the mouse
  expand_selected_to_mouse(e) {

    // team index
    var team = VGT.clients.me.team; 
    if(!VGT.things.selected[team]) return

    // Last mouse move tabletop coordinates
    var x = this.xm_tabletop;       
    var y = this.ym_tabletop;       
    var r = VGT.clients.me.hand.r.value;

    // Get the unsorted pieces list
    var pieces = Object.values(VGT.things.selected[team]);

    // Do the collection
    VGT.game.expand(pieces, x, y, r, r, e.shiftKey);
  }

  align_distribute_selected(e) {
    VGT.log('align_distribute_selected()', e.key);

    // team index
    var team = VGT.clients.me.team; 
    if(!VGT.things.selected[team]) return

    // Get the unsorted pieces list
    var pieces = Object.values(VGT.things.selected[team]);


    // Do nothing if there are no selected pieces.
    if(!pieces || !pieces.length) return;

    // Give each a simple key for x and y targets, for sorting
    for(var n in pieces) { pieces[n]._x_target = pieces[n].x.target; pieces[n]._y_target = pieces[n].y.target; }
    
    // Horizontal alignment
    if(e.key == 'h') {
      // Get the mean and set all to this
      var x_sum = 0;
      for(var n in pieces) x_sum += pieces[n].x.target;
      var x_mean = x_sum / pieces.length;
      for(var n in pieces) pieces[n].set_xyrs(x_mean, undefined);
    }

    // Vertical alignment
    else if (e.key == 'v') {
      // Get the mean and set all to this
      var y_sum = 0;
      for(var n in pieces) y_sum += pieces[n].y.target;
      var y_mean = y_sum / pieces.length;
      for(var n in pieces) pieces[n].set_xyrs(undefined, y_mean);
    }

    // Horizontal distribution
    else if(e.key == 'H') {

      // Sort pieces by x values
      sort_objects_by_key(pieces, '_x_target');
      
      // Loop over them, setting the x-value appropriately
      var N  = pieces.length-1;
      var x0 = pieces[0].x.target;
      var xN = pieces[N].x.target;
      for(var n in pieces) pieces[n].set_xyrs(x0 + n*(xN-x0)/N, undefined);
    }

    // Vertical distribution
    else if (e.key == 'V') {

      // Sort pieces by x values
      sort_objects_by_key(pieces, '_y_target');

      // Loop over them, setting the x-value appropriately
      var N  = pieces.length-1;
      var y0 = pieces[0].y.target;
      var yN = pieces[N].y.target;
      for(var n in pieces) pieces[n].set_xyrs(undefined, y0 + n*(yN-y0)/N);
    }
  }

  // Pointer touches the underlying surface.
  onpointerdown(e) { 
    e.preventDefault();
    this.last_pointerdown = e;

    // Get the tabletop coordinates
    var v = VGT.tabletop.xy_stage_to_tabletop(e.clientX, e.clientY);
    
    // Save the information
    this.button = e.button;

    // Location of the down in the two coordinate systems (and original rotation)
    this.xd_client = e.clientX;
    this.yd_client = e.clientY;
    this.xd_tabletop = v.x;
    this.yd_tabletop = v.y;
    this.rd_tabletop = VGT.tabletop.r.value;
    
    // Location of the tabletop at down.
    this.tabletop_xd = -VGT.tabletop.container.pivot.x;
    this.tabletop_yd = -VGT.tabletop.container.pivot.y;

    // Check for non-standard mouse buttons
    if(!([0,2].includes(e.button))) {
      if(VGT.interaction._pointerdown_functions[e.button]) VGT.interaction._pointerdown_functions[e.button](e);
      return
    }
    // The rest is for right and left clicks

    // Close fist
    var hand=null;
    if(VGT.clients && VGT.clients.me && VGT.clients.me.hand) { hand = VGT.clients.me.hand; hand.close(); }

    // Find a thing under the pointer if there is one.
    var thing = VGT.game.get_top_thing_at(v.x,v.y);

    VGT.log('onpointerdown()', [e.clientX, e.clientY], '->', v, e.button, this.tabletop_xd, this.tabletop_yd, thing);

    // If it's not null and we can grab it
    if(thing != null && thing.is_grabbable_by_me()) {
      
      // Get the coordinates on the thing
      var a = thing.xy_tabletop_to_local(v.x, v.y); VGT.log('     piece coordinates:', a, 'piece:', thing);

      // The piece we click is the snap leader
      thing.is_snap_leader = true;

      // If we're not holding shift and it's not already a thing we've selected, 
      // unselect everything.
      if(!e.shiftKey && thing.team_select != VGT.clients.me.team) VGT.game.unselect(undefined, VGT.clients.me.team);
      
      // If we're holding shift and it's already selected, and we're not deselect
      if(e.shiftKey && thing.team_select == VGT.clients.me.team) thing.unselect()
      //
      // Otherwise, select it and hold everything, sending it to the top or bottom.
      else {
        thing.select(VGT.clients.me.team); // send q, shovel
        if(!e.shiftKey) thing.shovel_select(VGT.clients.me.team);
        VGT.game.hold_selected(VGT.net.id, false);

        // Send the selection to the top or bottom, depending on button etc
        if     (e.button == 0) VGT.game.send_selected_to_top(VGT.clients.me.team);
        else if(e.button == 2) VGT.game.send_selected_to_bottom(VGT.clients.me.team);
      }

    } // End of "found thing under pointer"

    // Otherwise, we have hit the table top. 
    else {
     
      // If we're clicking the tabletop without shift, unselect everything for our team
      if(!e.shiftKey) VGT.game.unselect();

      // If we're going to start dragging the rectangle, send the table coordinates of the click
      if((e.button == 2 || e.button == 0 && e.shiftKey) && hand) { 

        // Keep the coordinates of the click (starting coordinates of the box), and tell everyone
        hand.vd = v; 
        hand.update_q_out('vd'); 

        // Remember the originally selected items if we're holding shift
        if(e.shiftKey && VGT.things.selected[VGT.clients.me.team]) hand._originally_selected = Object.values(VGT.things.selected[VGT.clients.me.team]);
      }
    }

  } // End of onpointerdown

  // Double click
  ondblclick(e) { VGT.log('ondblclick()', e);
    e.preventDefault();

    this.increment_selected_images(e);
  }

  // Pointer has moved around.
  onpointermove(e) { //VGT.log('onpointermove()', e.button);
    this.last_pointermove_e = e;
    
    // Let the body take focus
    document.activeElement.blur();

    // Get the tabletop coordinates
    var v = VGT.tabletop.xy_stage_to_tabletop(e.clientX, e.clientY);
    
    // Save the coordinates of this move event
    this.xm_client = e.clientX;
    this.ym_client = e.clientY;
    this.xm_tabletop = v.x;
    this.ym_tabletop = v.y;
    this.rm_tabletop = VGT.tabletop.r.value;

    // And for the user
    VGT.game.mouse = {x:v.x, y:v.y, r:this.rm_tabletop}
    
    // Whether we are dragging the table
    var dragging_table = false;
    
    // Only do stuff if the mouse is down
    if(this.button != undefined && this.button >= 0 
      || document.getElementById('debug').checked) {
      
      // If we have held stuff, move them around.
      if(VGT.things.held[VGT.net.id]) {
        
        // loop over our held things and move them.
        var thing;
        for(var k in VGT.things.held[VGT.net.id]) {
          thing = VGT.things.held[VGT.net.id][k];
          
          // The coordinates we know are 
          //   * Where the mouse clicked: xd_, yd_, rd_
          //   * Where the mouse is now:  xm_, ym_, rm_
          //   * Where each piece was when the mouse clicked (hold): thing.xh, thing.yh, thing.rh
          //
          // So we must translate each piece by dx0, dy0 (shift with mouse) and then
          // rotate their positions around the mouse

          // Center shift since drag start
          var x0 = this.xm_tabletop - this.xd_tabletop; 
          var y0 = this.ym_tabletop - this.yd_tabletop;
          
          // Rotation since drag start
          var r0 = -this.rm_tabletop + this.rd_tabletop;

          // Vector relative to the center of rotation
          var dx0 = thing.xh + x0 - this.xm_tabletop;
          var dy0 = thing.yh + y0 - this.ym_tabletop;
          
          // Rotated vector
          var dx1, dy1;
          [dx1,dy1] = rotate_vector([dx0,dy0], r0);
          //var dx1 = dx0*Math.cos(r0) - dy0*Math.sin(r0);
          //var dy1 = dx0*Math.sin(r0) + dy0*Math.cos(r0);

          // Rotation vector
          var dxr = dx1-dx0;
          var dyr = dy1-dy0;
          
          // If we're holding a rotate-with-view piece
          if(thing.settings.rotate_with_view) var r = thing.r.target;
          else                                var r = thing.rh + r0;

          // Do the actual move
          thing.set_xyrs(
            thing.xh + x0 + dxr,
            thing.yh + y0 + dyr,
            r,                // updates the rotation with how much the hand has rotated
            undefined,        // Not scaling
            true,             // immediately, so that they stay rigid with the mouse
            false,            // do_not_update_q_out (we want to send this info)
            true);            // do_not_reset_R (we don't want to mess with aux rotation for this; it may be animating)
        }
      } // End of "if held"
      
      // Otherwise, if it's the left mouse, pan the board.
      else if(this.button == 0 && !e.shiftKey) {
        
        var dx0 = (this.xm_client - this.xd_client)/VGT.tabletop.s.value;
        var dy0 = (this.ym_client - this.yd_client)/VGT.tabletop.s.value;
        
        var dx,dy;
        [dx,dy] = rotate_vector([dx0,dy0], -VGT.tabletop.r.value);
        //var dx =  dx0*Math.cos(VGT.tabletop.r.value) + dy0*Math.sin(VGT.tabletop.r.value);
        //var dy = -dx0*Math.sin(VGT.tabletop.r.value) + dy0*Math.cos(VGT.tabletop.r.value);
        
        VGT.tabletop.set_xyrs(
          this.tabletop_xd + dx,
          this.tabletop_yd + dy, 
          undefined, undefined, true); // immediate

        dragging_table = true;
      }
    
    } // End of 'button down'
    
    // Move my hand and polygon, but only if we're not dragging the table
    if(!dragging_table && VGT.clients && VGT.clients.me && VGT.clients.me.hand)
      VGT.clients.me.hand.set_xyrs(this.xm_tabletop, this.ym_tabletop, -this.rm_tabletop, 1.0/VGT.tabletop.s.value, true);

  } // End of onpointermove

  onpointerup(e) { VGT.log('onpointerup()', e.button);

    // Make one last mousemove to make sure the things are where we let go of them.
    this.onpointermove(e);

    // Remember the last event
    this.last_pointerup = e;

    // Get the tabletop coordinates of this event
    var v = VGT.tabletop.xy_stage_to_tabletop(e.clientX, e.clientY);
    
    // Location of the up in two coordinate systems
    this.xu_client = e.clientX;
    this.yu_client = e.clientY;
    this.xu_tabletop = v.x;
    this.yu_tabletop = v.y;

    // Location of tabletop center at up.
    this.tabletop_xu = -VGT.tabletop.container.pivot.x;
    this.tabletop_yu = -VGT.tabletop.container.pivot.y;

    // Save the information
    this.button = -1;

    // Stop holding VGT.things
    VGT.game.client_release(VGT.net.id, false, false);

    // If we have a hand, store the down click and update the outbound q
    var hand = null; if(VGT.clients && VGT.clients.me && VGT.clients.me.hand) hand = VGT.clients.me.hand;

    // Releasing, so open fist, clear the polygon, and update vd so others know to do the same.
    if(hand) {
      hand.open();
      hand.vd = false; hand.update_q_out('vd');

      // Remove the selection lists
      hand._newly_selected      = {};
      hand._originally_selected = [];
    }
  }
  
  onwheel(e) {VGT.log('_Interaction.onwheel()', e);

    if(this._t_last_wheel && Date.now()-this._t_last_wheel < 100) return
    this._t_last_wheel = Date.now();

    // If shift is down, rotate
    if(e.shiftKey) {
      if(e.deltaY > 0) VGT.tabletop.rotate_left();
      else             VGT.tabletop.rotate_right();
    }
     
    // Otherwise, zoom
    else {
      if(e.deltaY > 0) VGT.tabletop.zoom_out();
      else             VGT.tabletop.zoom_in();
    }

  }

  // Whenever a key is pressed or released.
  onkey(e) {
    this.last_onkey = e;

    // If we're not ready, not supposed to interact with the game,
    // toggling full screen (F11), or using an input, don't 
    // change the default behavior of the keys.
    if(// !net.me.ready 
    e.code == 'F11' || e.ctrlKey
    || document.activeElement.id == 'name' 
    || document.activeElement.id == 'team') return;
    if(document.activeElement.id == 'chat-box') {
      if(e.key == 'Enter' && e.type == 'keydown') this.onchat();
      return;
    }

    // Prevent the key's normal response.
    e.preventDefault();
    
    // If the function exists, call it with the event
    var code = e.code;
    if(e.shiftKey && code.substring(0,5)!='Shift') code = 'Shift|'+code;
    if(e.type == 'keyup') code = code + '|Up';
    else                  code = code + '|Down';

    // Log it
    VGT.log('onkey()', code, e.repeat);
    if(this._key_functions[code]) this._key_functions[code](e);

  } // End of onkey()

  onchange_team(e) {
    VGT.log('onchange_team()', e.target.id, e.target.selectedIndex, e.target.value);

    // Remember the team
    if(String(VGT.net.id) == e.target.id) VGT.html.save_cookie('team', e.target.value);

    // Update the clients list and send to server
    VGT.net.clients[e.target.id].team = e.target.selectedIndex;
    VGT.log(   'NETS_clients', VGT.net.clients);
    VGT.net.io.emit('clients', VGT.net.clients);

  } // End of onchange_team()

  // When we change our name
  onchange_name(e) {
    VGT.log('onchange_name()', e.target.id, e.target.value);

    // Remember my own name, but not others
    if(String(VGT.net.id) == e.target.id) VGT.html.save_cookie('name', e.target.value);

    // Update the clients list
    VGT.net.clients[VGT.net.id].name = e.target.value;
    VGT.log(   'NETS_clients', VGT.net.clients);
    VGT.net.io.emit('clients', VGT.net.clients);
  } // End of onchange_name()

  // When someone changes the setups pull-down
  onchange_setups(e) {
    var v = VGT.html.select_setups.value;
    VGT.log('onchange_setups()', v);
    VGT.html.save_cookie('setups.value', v);
  }

  // When the volume changes.
  onchange_volume(e) {

    var v = parseInt(VGT.html.input_volume.value)*0.01*1.0;
    
    VGT.log('onchange_volume()', VGT.html.input_volume.value, v);
    
    // Change the master volume
    Howler.volume(v);
    
    // Remember the value
    VGT.html.save_cookie('volume',       VGT.html.input_volume.value);
  } // end of onchange_volume()

  /** Called when someone hits enter in the chat box.
   *  Sends a chat message to everyone else.
   */
  onchat() {
    VGT.log('onchat()');

    // Get the chat text and clear it
    var chat_box = document.getElementById('chat-box')
    var message  = chat_box.value;
    if(message == '') return;
    chat_box.value = '';

    // Send a chat.
    VGT.log(   'NETS_chat', message);
    VGT.net.io.emit('chat', escape(message));
  } // end of onchat()

  
  // Auto-adjusting VGT.pixi.app size to available space
  onresize_window(e) {
    
    // Resize the renderer
    VGT.pixi.app.renderer.resize(window.innerWidth, window.innerHeight);

    // Resize the surface
    VGT.pixi.surface.scale.x = window.innerWidth;
    VGT.pixi.surface.scale.y = window.innerHeight;

    // Shift the center to the center of the view
    VGT.log('  ', VGT.tabletop.container.x, window.innerWidth*0.5);
    VGT.tabletop.container.x += -VGT.tabletop.container.x+window.innerWidth*0.5;
    VGT.tabletop.container.y += -VGT.tabletop.container.y+window.innerHeight*0.5;
    
    VGT.log('onresize_window()');
  }

} // End of _Interaction


////////////////////////////
// SOUNDS                 //
////////////////////////////

class _Sound {

  // Constructor just registers the sound and records the time
  constructor(path, volume) {
    
    // Create the howl
    this.howl = new Howl({
      src:    [path], 
      volume: volume
    });
    
    // Internal settings
    this.path = path;
  }

  // Play the sound immediately
  play(x,y,rate) {
    
    // If no click yet, can't play, so don't play
    if(VGT.interaction.button == undefined) return

    // Start play and adjust for that instance
    var id = this.howl.play();
    
    //this.howl.pos(xn, 0.5*yn, 1, id); // Requires a model to be set.
    //this.howl.stereo(0.7*xn, id); //p/Math.sqrt(1+p*p),  id);

    // Adjust the playback speed
    if(rate) this.howl.rate(rate, id);

    // return the id
    return id;
  }
}

// Library of all sounds with progress and after_loaded() function
class _Sounds {

  // Constructor sets up internal data structures
  // Paths should be an object with sound options, e.g.
  // {'key':['/path/to/sound',volume], 'key2': ...}
  constructor(specs) {
    VGT.log('SoundLibrary constructor()', specs);

    // keep an eye on specs
    this.specs  = specs;
    
    // Object to remember all sounds by keys
    this.sounds = {};

    // Count the number of sounds
    this.length = 0;
    this._count(specs); 
    
    // Loop over all the specs, loading one sound per path
    this.n=0;
    this._load(specs);
    
    // Hide the volume slider if no sounds loaded
    if(this.length==0) VGT.html.div_volume_container.style.display = 'none'; 
  }

  // Function to recursively count the sounds in a group
  _count(object) {

    // Loop over the keys
    for(var key in object) {

      // Normal sound
      if(Array.isArray(object[key])) this.length++;
      
      // Object
      else this._count(object[key]);
    }
  }

  // Function to recursively load the sounds in a group
  _load(object) {

    // Loop over the keys
    for(var key in object) {

      // Normal sound
      if(Array.isArray(object[key])) {
        
        // Counter for progress bar.
        this.n++;
        
        // Make the new Howl to play this sound
        this.sounds[key] = new _Sound(object[key][0], object[key][1]);
      
        // What to do when it loads
        this.sounds[key].howl.once('load', this._onprogress(key, object[key], Math.round(100*this.n/this.length)));
      }

      // Object. Run the load recursively.
      else this._load(object[key]);
    }
  }

  // Function called when a Howl has finished loading
  _onprogress(key, specs, percent) {
    VGT.log('SoundLibrary loaded', key, specs, percent);

    // If we hit 100%, load the volume slider
    if(percent == 100) {
    
      // Load the sound settings.
      VGT.html.input_volume.value = VGT.html.load_cookie('volume');
      
      // Send em.
      VGT.interaction.onchange_volume();
    }
  } // End of onprogress()

  // Play a sound by spec path. Returns [key, id]
  play(path, x, y, rate, do_not_update_q_out) {

    // Split the key by '/'
    var keys = path.split('/');
    
    // loop and get the spec
    var spec = this.specs;
    for(var n=0; n<keys.length; n++) spec = spec[keys[n]];

    // If spec is an array, e.g., ['spec/path/to/soundname',1], just use the last key for the name.
    if(Array.isArray(spec)) var key = keys[n-1];
    
    // Otherwise we need to pick a random key
    else var key = random_array_element(Object.keys(spec));

    // Play it and return [key,id]
    var id = this.sounds[key].play(x,y,rate);

    // Tell everyone
    if(!do_not_update_q_out) VGT.net.q_sounds_out.push([path,x,y,rate]);
    
    return [key,id];
  }

  // Old method; plays a random selection, returning [key, id]
  play_random(keys, x, y, rate) {

    var key = random_array_element(keys);
    var id  = this.sounds[key].play(x,y,rate); 
    return [key, id];
  }

  mute() {
    Howler.volume(0);
  }
  unmute() {
    VGT.interaction.onchange_volume();
  }
  set_mute(mute) {
    if(mute) this.mute();
    else     this.unmute();
  }

} // End of _Sounds


// A single snap point; if a thing is dropped near it and this point is in its group, the xyrs coordinates will adjust
class _SnapCircle {

  default_settings = {
    parent: undefined, // Parent Thing or Tabletop defining the coordinate system; undefined = tabletop
    x0: 0,             // Snap x value target; undefined = no snap
    y0: 0,             // Snap y value target; undefined = no snap
    r: undefined,      // Snap r value target; undefined = no snap
    s: undefined,      // Snap s value target; undefined = no snap
    radius: 50,        // Radius within which snapping occurs
    groups: [],        // List of group names (strings) other than 'all' to which this snap should be added in VGT.snaps upon creation
    //max_occupancy: 1,  // Number of pieces that can occupy a snap. 0 or null = infinite
  }

  constructor(settings) {
   
    // Store the settings, starting with defaults then overrides.
    this.settings = {...this.default_settings, ...settings};

    // Add it to the master group
    VGT.snaps.add_snap(this);
  }

  // Returns a distance score (usually distance squared for speed reasons) between the thing target and the snap
  get_relationship(thing, do_not_check_occupancy) {
    
    var v, x, y, r, parent = this.settings.parent;

    // If the parent is the piece or the parent is held, do nothing
    // Note checking if the piece is held here would randomly prevent snapping
    // to released pieces, because they're released one at a time. 
    // Could add 'things to avoid' list or something.
    if(parent == thing) return false;
    
    // First, if we have an occupancy, make sure it's below this number
    /*if(this.settings.max_occupancy && !do_not_check_occupancy) {

      // UPDATE: We should just use get_relationship with do_not_check_occupancy=true, 
      // and use the 0 values to update the count. The below is old code for reference...
      
      // Loop over all the pieces and count those having exactly these coordinates
      var occupancy = 0;
      var p;
      for(var n in VGT.things.all) { p = VGT.things.all[n];

        // If this is in the right group, check it
        if(this.settings.x0 == p.x.target && this.settings.y0 == p.y.target 
        && arrays_have_common_element(this.settings.groups, p.settings.groups)) {
          occupancy++;
        }
      }
      
    } // End of occupancy check*/


    // If the parent is the tabletop, use the tabletop coordinates
    else if(parent == undefined || parent == VGT.tabletop) {
      x = thing.x.target;
      y = thing.y.target;
    }

    // Otherwise, the parent is a Thing, so use the parent's coordinates
    else {
      v = parent.xy_tabletop_to_local(thing.x.target, thing.y.target); 
      x = v.x;
      y = v.y;
    };

    // Get the distances
    var dx = x - this.settings.x0;
    var dy = y - this.settings.y0;
    var r2 = dx*dx + dy*dy;

    // If we're withing the radius of influence, return the info
    if(r2 <= this.settings.radius*this.settings.radius) {
      
      // Nominally tabletop coordinates
      x = this.settings.x0;
      y = this.settings.y0;
      r = this.settings.r;
      
      // If the parent is a piece, do the transform from local to tabletop coordinates
      if(parent != undefined && parent != VGT.tabletop) {
        v = parent.xy_local_to_tabletop(x,y); 
        x = v.x;
        y = v.y;
        if(r != undefined) r += parent.r.target + parent.R.target;
      }

      return {score:r2, x:x, y:y, r:r, s:this.settings.s};
    }
      
    
    // Otherwise return nothing.
    else return false;
  }
}
VGT.SnapCircle = _SnapCircle;

// A more efficient grid of snap points; if a thing is dropped within its boundary, the xyrs coordinates will adjust to the nearest grid point
class _SnapGrid {

  default_settings = {
    parent: undefined,   // Parent Thing or Tabletop defining the coordinate system; undefined = tabletop
    x0: 0,               // Origin x value
    y0: 0,               // Origin y value
    ax: 50,              // Basis vector a, x-component
    ay: 0,               // Basis vector a, y-component
    bx: 0,               // Basis vector b, x-component
    by: 50,              // Basis vector b, y-component
    r: undefined,        // Snap r value target; undefined = no snap
    s: undefined,        // Snap s value target; undefined = no snap
    boundary: undefined, // List of [x1,y1,x2,y2,...] sent to create a PIXI.Polygon (this.polygon), which defines the boundary in which the nearest grid point is returned
    groups: [],          // List of group names (strings) other than 'all' to which this snap should be added in VGT.snaps upon creation
  }

  constructor(settings) {
   
    // Store the settings, starting with defaults then overrides.
    this.settings = {...this.default_settings, ...settings};

    // Create the boundary polygon
    if(this.settings.boundary) this.boundary = new PIXI.Polygon(this.settings.boundary);
    else                       this.boundary = false;
    
    // Add it to the master list
    VGT.snaps.add_snap(this);
  }

  // Returns [x,y] of grid point n,m (integer lattice basis vector steps) relative to the origin x0, y0
  get_grid_xy(n,m) {
    return [
      this.settings.ax*n + this.settings.bx*m + this.settings.x0,
      this.settings.ay*n + this.settings.by*m + this.settings.y0,
    ]
  }

  // Sends the supplied piece to grid point n,m (integer lattice basis vector steps) relative to the origin x0, y0
  send_piece_to(piece, n, m) {
    var v = this.get_grid_xy(n,m);
    piece.set_xyrs(v[0], v[1]);
    return v;
  }

  // Returns a distance score (usually distance squared for speed reasons) between the thing target and the snap
  get_relationship(thing) {

    var parent = this.settings.parent;

    // Don't snap a thing to itself (!)
    if(parent == thing) return false;

    // If the parent is the tabletop, use the tabletop coordinates
    else if(parent == undefined || parent == VGT.tabletop) {
      var x = thing.x.target;
      var y = thing.y.target;
    }

    // Otherwise, the parent is a Thing, so use the parent's coordinates
    else {
      var v = parent.xy_tabletop_to_local(thing.x.target, thing.y.target); 
      var x = v.x;
      var y = v.y;
    };

    // If we're withing the polygon of influence, find the nearest vertex and return the info
    if(!this.boundary || this.boundary.contains(x,y)) {
      
      // Translated coordinates for the vector counting
      var xt = x - this.settings.x0;
      var yt = y - this.settings.y0;

      // Shortcuts
      var ax = this.settings.ax;
      var ay = this.settings.ay;
      var bx = this.settings.bx;
      var by = this.settings.by;

      // Find the number of basis vectors required to get to x,y
      var Na = Math.round( (xt*by-yt*bx) / (ax*by-ay*bx) );
      var Nb = Math.round( (xt*ay-yt*ax) / (bx*ay-by*ax) );

      // Get the snapped coordinates
      var xs = this.settings.x0 + Na*ax + Nb*bx;
      var ys = this.settings.y0 + Na*ay + Nb*by;

      // Get the difference vector for calculating the "score" below.
      var dx = x-xs;
      var dy = y-ys;

      // Get the rotation
      var r = this.settings.r;

      // If the parent is a thing, do the transform from local to tabletop coordinates
      if(parent != undefined && parent != VGT.tabletop) {
        var vs = parent.xy_local_to_tabletop(xs,ys); 
        xs = vs.x;
        ys = vs.y;
        if(r != undefined) r += parent.r.target + parent.R.target;
      }
      return {score:dx*dx+dy*dy, x:xs, y:ys, r:r, s:this.settings.s};
    }
    
    // Otherwise, we're not in the polygon, so return nothing.
    else return false;
  }
}
VGT.SnapGrid = _SnapGrid;

// Holds the SnapPoints and SnapGrids
class _Snaps {

  constructor() {
    this.all = [];
  }

  // Creates a new snap with the specified settings
  // The settings object should also contain a type, e.g. 'type: VGT.SnapCircle'
  // So it knows which constructor to use. If no settings or type is specified, uses VGT.SnapCircle
  new_snap(settings) { 
    if(!settings)      settings = {};
    if(!settings.type) settings.type = VGT.SnapCircle;
    return new settings.type(settings); 
  }

  // Sets the snap id and adds the object to the groups
  add_snap(snap) {

    // Set the snap id and add it to the 'all' group
    snap.id_snap = this.all.length;
    this.all.push(snap);

    // Add it to the (valid / created) groups
    var group;
    for(var l in snap.settings.groups) { 
      group = snap.settings.groups[l];
      if(!this[group]) this[group] = [];
      this[group].push(snap);
    }
  }
}
VGT.snaps = new _Snaps();


// Basic interactive object
class _Thing {
  
  // Default settings for a new object
  default_settings = {
    images           : null,          // Keys to images defined in VGT.images.paths with each sub-list being a layer (can animate), e.g. [['a','b'],['c']]
    images_private   : null,          // Same-structured image list for what we see when it's in our team zone.
    tint             : null,          // Tint to apply upon creation
    type             : null,          // User-defined types of thing, stored in this.settings.type. Could be "card" or 32, e.g.
    sets             : [],            // List of other sets (e.g. VGT.pieces, VGT.hands) to which this thing can belong
    teams            : null,          // List of team indices that can control this piece. Setting null means 'all of them', [] means 'none'.
    r_step           : 45,            // How many degrees to rotate when taking a rotation step.
    rotate_with_view : false,         // Whether the piece should retain its orientation with respect to the screen when rotating the view / table
    text             : false,         // Whether to include a text layer 
    anchor           : {x:0.5,y:0.5}, // Anchor point for the graphic
    worth            : 0,             // For counting.
    worth_prefix     : '',            // Prefix on the worth
    worth_suffix     : '',            // Suffix on the worth
    worth_decimals   : undefined,     // How many decimals precision when displaying

    // Geometry
    shape  : 'rectangle',      // Hitbox shape; could be 'rectangle' or 'circle' or 'circle_outer' currently. See this.contains();
    width  : null,             // Hitbox width; if null / false / undefined, defaults to image width
    height : null,             // Hitbox height; if null / false / undefined, defaults to image height

    // Targeted x, y, r, and s
    x : 0,
    y : 0, 
    r : 0,
    s : 1,

    // Layer
    layer : 0,

    // Groups, snapping, shoveling
    groups : [],   // List of groups (other than 'all') to which this thing belongs; used for snapping and shoveling
    snaps  : [],   // List of snap settings to send to VGT.snaps.new_snap() upon creation.
    shovel : [],   // List of groups this piece will shovel; e.g., true or ['all'] to shovel all pieces.

    // Collecting and expanding
    collect_dx  : 2,         // px shift in x-direction for collecting
    collect_dy  : -2,        // px shift in y-direction for collecting
    expand_Nx   : 10,        // number of columns when expanding
    expand_dx   : null,      // px shift for expanding in the x-direction; null is 'automatic'
    expand_dy   : null,      // px shift for expanding in the y-direction; null is 'automatic'
    pile_radius : null,      // radius of disc when scattering in a pile; null is 'automatic'

    render_graphics : false,  // If true, renders graphics to an image, which can be faster and smoother looking in some situations
  };

  constructor(settings) {

    // Fix up settings shortcuts
    
    // Make sure the image list is a list of lists of strings for layered sprites.
    if(typeof settings.images         == 'string') settings.images         = [[settings.images        ]];
    if(typeof settings.images_private == 'string') settings.images_private = [[settings.images_private]];
    if(settings.images         && typeof settings.images        [0] == 'string') settings.images         = [settings.images];
    if(settings.images_private && typeof settings.images_private[0] == 'string') settings.images_private = [settings.images_private];

    // Remember what this is for later checking
    this.type = 'Thing';

    // This piece is not ready yet, until initializing / doing pixi stuff later.
    this.ready = false;

    // Store the settings, starting with defaults then overrides.
    this.settings = {...this.default_settings, ...settings};
    
    // Add to a user-supplied sets
    for(var n in this.settings.sets) this.settings.sets[n].add_thing(this);

    // Net id of who is selecting and controlling
    this.team_select    = -1; // Default is "unselected"
    this.id_client_hold = 0;  // Server / no client is 0

    // Tint applied to everything
    this.tint = 0xFFFFFF;

    // Targeted location and geometry. Current locations are in the container.x, container.y, container.rotation, and container.scale.x
    this.x = new _Animated(this.settings.x); 
    this.y = new _Animated(this.settings.y);
    this.r = new _Animated(this.settings.r); 
    this.R = new _Animated(0);         
    this.s = new _Animated(this.settings.s);

    // Starting hold location
    this.xh = this.x;
    this.yh = this.y;
    this.rh = this.r;
    this.sh = this.s;

    // Time of last movement (used for fade out animation)
    this.t_last_move  = 0;
    this.t_last_image = 0;
    
    // image parameters
    this._n = 0;             // Current image index

    // List of best guess for the server's packet numbers for each attribute
    this._N = { 
      x:-1,
      y:-1,
      r:-1,
      R:-1,
      s:-1,
      n:-1,
      ts:-1,
      ih:-1,
    }
    this._T = {...this._N} // last time each attribute was updated
    
    // Create a container for the stack of sprites
    this.container = new PIXI.Container();
    this.sprites   = [];
    
    // Shortcuts
    this.container.thing = this;
    
    // Also create a graphics object; by default, this is on the bottom
    this.graphics = new PIXI.Graphics();

    // If there is the option of text, add that
    if(this.settings.text) {
      this.text_graphics = new PIXI.Graphics();
      this.text          = new PIXI.Text();
      this.text.anchor.set(this.settings.anchor.x, this.settings.anchor.y);
      this.text.scale.x = 0.5;
      this.text.scale.y = 0.5;
    }
    
    // Everything is added to the VGT.things list
    VGT.things.add_thing(this);

    // Add this to the pixi instance (or queue)
    // The pixi-related stuff must be called after pixi loads.
    VGT.pixi.add_thing(this);

    // Now add the local snaps as per the specifications
    this.snaps = [];
    for(var k in this.settings.snaps) {
      this.settings.snaps[k]['parent'] = this;
      this.snaps.push(VGT.snaps.new_snap(this.settings.snaps[k]))
    }

    // If "shovel" is set to true as a shorthand
    if(this.settings.shovel == true) this.settings.shovel = ['all'];

  } // End of constructor.


  // Called once when pixi resources are loaded.
  _initialize_pixi() { VGT.log('_initialize_pixi', this.id_thing);
  
    // Keep a list of image lists for reference, one image list for each layer. 
    this.textures = [];

    // If we have a different set of images to be seen when it's in our team zone, 
    // keep a similarly structured list of those textures
    if(this.settings.images_private) this.textures_private = [];
    
    // If images = null, no textures. sprites will stay empty too.
    if(this.settings.images != null) {

      var path; // reused in loop
      for(var n=0; n<this.settings.images.length; n++) {
        
        // One list of frames per layer (and the private textures if specified); these do not have to match length
        this.textures.push([]); 
        if(this.textures_private) this.textures_private.push([]);

        for(var m = 0; m<this.settings.images[n].length; m++) {
          
          // Add the actual texture object for the 'public' images
          path = VGT.images.root + VGT.images.paths[this.settings.images[n][m]];
          
          // If we have a resource for this key, add it to the list
          if(VGT.pixi.resources[path]) this.textures[n].push(VGT.pixi.resources[path].texture);
          else throw 'No resource for key '+ this.settings.images[n][m] +'. Usually this is because one of the image keys provided upon piece creation does not match one of the keys in VGT.images.paths';
        
          // If we have specified private images
          if(this.textures_private) {

            // Add the actual texture object for the private images if we have those
            path = VGT.images.root + VGT.images.paths[this.settings.images_private[n][m]];

            // If we have a resource for this key, add it to the list
            if(VGT.pixi.resources[path]) this.textures_private[n].push(VGT.pixi.resources[path].texture);
            else throw 'No resource for key '+ this.settings.images[n][m] +'. Usually this is because one of the image keys provided upon piece creation does not match one of the keys in VGT.images.paths';
          }

        } // End of loop over images in this layer
      } // Done with loop over images.
    }
      
    // Loop over the layers, creating one sprite per layer
    for(var n in this.textures) {

      // Create the layer sprite with the zeroth image by default
      var sprite = new PIXI.Sprite(this.textures[n][0]);
      
      // Center the image
      sprite.anchor.set(this.settings.anchor.x, this.settings.anchor.y);
    
      // Keep it in our personal list, and add it to the container
      this.sprites.push(sprite);
    }

    // Update the text for the first time
    if(this.settings.text) this.set_text(this.settings.text);

    // Add the sprites to the container (can be overloaded); also gets width and height
    this.refill_container();

    // Set the tint
    if(this.settings.tint != null) this.set_tint(this.settings.tint);

    // This piece is ready for action.
    this.ready = true;
  } // End of _initialize_pixi
  

  // Whether the supplied table coordinates are contained within the object
  contains(x,y) { 

    // Transform table coordinates to local coordinates relative to the anchor point
    var v = this.xy_tabletop_to_local(x,y); 

    // Shift v by the anchor point's distance from 0.5, 0.5
    v.x -= (0.5-this.settings.anchor.x)*this.width;
    v.y -= (0.5-this.settings.anchor.y)*this.height;

    // Inner circle: minimum of width and height
    if(this.settings.shape == 'circle_inner') {    
      var r = 0.5*Math.min(this.width, this.height);
      return v.x*v.x+v.y*v.y <= r*r;
    }

    // Outer circle: maximum of width and height
    else if(this.settings.shape == 'circle' || this.settings.shape == 'circle_outer') {
      var r = 0.5*Math.max(this.width, this.height);
      return v.x*v.x+v.y*v.y <= r*r;
    }

    else { // Rectangle by default
      var hw = this.width*0.5;
      var hh = this.height*0.5;
      return v.x >= -hw && v.x <= hw && v.y >= -hh && v.y <= hh;
    }
  
  } // End of contains()

  // Resets to the settings
  reset(immediate, do_not_update_q_out) {
    this.x.set(this.settings.x, immediate); this.x.velocity=0; this.update_q_out('x', 'x', do_not_update_q_out);
    this.y.set(this.settings.y, immediate); this.y.velocity=0; this.update_q_out('y', 'y', do_not_update_q_out);
    this.r.set(this.settings.r, immediate); this.r.velocity=0; this.update_q_out('r', 'r', do_not_update_q_out);
    this.s.set(this.settings.s, immediate); this.s.velocity=0; this.update_q_out('s', 's', do_not_update_q_out);
  }

  /** Sets the tint of all the images */
  set_tint(tint) {
    this.tint = tint; 
    for(var n in this.sprites) this.sprites[n].tint = tint; 
  }
  get_tint() { return this.tint; }


  /**
   * Sets the controller id. 0 means no one is in control (server).
   */
  hold(id_client, force, do_not_update_q_out) { // VGT.log('thing.hold()', this.id_thing, id_client, force, this.id_client_hold);

    // If the id is undefined (used by process_queues), there is no change, 
    // or it is already being held by any valid client (and no force), do nothing.
    if(id_client == undefined || id_client == this.id_client_hold
    || Object.keys(VGT.clients.all).includes(String(this.id_client_hold))
    && !force) return;

    // If it's the server holding, this is equivalent to a release
    else if(id_client == 0) this.release(id_client, force, do_not_update_q_out);

    // Otherwise, if it's not being held already (or the client is invalid), or we're forcing hold it.
    else if(this.id_client_hold == 0 || VGT.clients.all[this.id_client_hold] == undefined || force) {
      
      // If it is already in a held list, delete that
      if(VGT.things.held[this.id_client_hold]) delete VGT.things.held[this.id_client_hold][this.id_thing];

      // Update the holder
      this.id_client_hold = id_client;

      // Remember the initial coordinates
      this.xh = this.x.value;
      this.yh = this.y.value;
      this.rh = this.r.value;
      this.sh = this.s.value;    

      // Make sure there is an object to hold the held things for this id.
      if(VGT.things.held[id_client] == undefined) VGT.things.held[id_client] = {};

      // Add it to the client's hold list
      VGT.things.held[id_client][this.id_thing] = this;

      // If we're supposed to send an update, make sure there is an entry in the queue
      this.update_q_out('id_client_hold', 'ih', do_not_update_q_out);
    } 
  } // End of hold

  /**
   * Stops holding a thing
   * @param {int} id_client               Client id requesting release. Canceled if this doesn't match this.id_client_hold.
   * @param {boolean} force 
   * @param {boolean} do_not_update_q_out 
   * @param {boolean} do_not_snap 
   * @returns 
   */
  release(id_client, force, do_not_update_q_out, do_not_snap) { //VGT.log('thing.release()', this.id_thing, id_client, force, do_not_update_q_out, this.id_client_hold);

    // If we're already not holding
    // or there is a valid holder that is different from the requestor (and we aren't overriding this)
    // do nothing.
    if(this.id_client_hold == 0
    || Object.keys(VGT.clients.all).includes(String(this.id_client_hold))
    && this.id_client_hold != id_client
    && !force) return this;

    // Snap leader should be a piece that is grabbed by me
    if(this.is_snap_leader && !do_not_snap) {

      // Find the closest snap point, if any, and set it
      var a = this.get_best_snap_relationship();
      if(a) {
        
        // Get the difference so we can similarly shift the other formerly held pieces
        var dx = a.x - this.x.target;
        var dy = a.y - this.y.target;

        // Now loop over the releasing piece list and update the coordinates
        var p;
        for(var id in VGT.game._releasing) { 
          p = VGT.game._releasing[id];
          p.set_xyrs(p.x.target+dx, p.y.target+dy, a.r, a.s); // Animate, tell the world, and do reset R.
        }
      } // End of "found snap point"
    } // End of "is snap leader"

    // Reset the snap leader flag
    this.is_snap_leader = undefined;

    // Remove it from the list and Delete the empty lists
    delete VGT.things.held[this.id_client_hold][this.id_thing];
    if(Object.keys(VGT.things.held[this.id_client_hold]).length == 0) delete VGT.things.held[this.id_client_hold];
    this.id_client_hold = 0;

    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('id_client_hold', 'ih', do_not_update_q_out);

    return this
  }

  draw_select_graphics(team) {
    
    // Add the selection box
    var w = this.width;
    var h = this.height;
    var x0 = (0.5-this.settings.anchor.x)*w; // Shift v by the anchor point's distance from 0.5, 0.5
    var y0 = (0.5-this.settings.anchor.y)*h;
    
    if(this.settings.shape == 'circle' || this.settings.shape == 'circle_inner') var r = Math.min(w,h)*0.5;
    else if(this.settings.shape == 'circle_outer')                               var r = Math.max(w,h)*0.5; 

    var t1 = 8/this.s.value; // Thickness of first line
    var t2 = 2/this.s.value; // Thickness of second line
    var c1 = VGT.game.get_team_color(team);
    var aa = 0.4;            // Lightener alpha
    var c2 = 0xFFFFFF;
    var a  = 0.7;
    if(get_luma_ox(c1) > 0.8) {
      c2 = 0x000000;
      a  = 0.1;
    }

    // Clear whatever is there
    this.graphics.clear();

    // Drawing a circle
    if(['circle', 'circle_outer', 'circle_inner'].includes(this.settings.shape)) {
      this.graphics.lineStyle(t1, c1);
      this.graphics.drawCircle(x0, y0, r);
      this.graphics.lineStyle(t1, 0xFFFFFF, aa);
      this.graphics.drawCircle(x0, y0, r);
      this.graphics.lineStyle(t2, c2, a);
      this.graphics.drawCircle(x0, y0, r);
    }

    // Drawing an ellipse
    else if(this.settings.shape == 'ellipse') {
      this.graphics.lineStyle(t1, c1);
      this.graphics.drawEllipse(x0, y0, this.width*0.5, this.height*0.5);
      this.graphics.lineStyle(t1, 0xFFFFFF, aa);
      this.graphics.drawEllipse(x0, y0, this.width*0.5, this.height*0.5);
      this.graphics.lineStyle(t2, c2, a);
      this.graphics.drawEllipse(x0, y0, this.width*0.5, this.height*0.5);
    }

    // Drawing a rectangle
    else { 
      this.graphics.lineStyle(t1, c1);
      this.graphics.drawRect(x0-w*0.5, y0-h*0.5, w, h);
      this.graphics.lineStyle(t1, 0xFFFFFF, aa);
      this.graphics.drawRect(x0-w*0.5, y0-h*0.5, w, h);
      this.graphics.lineStyle(t2, c2, a);
      this.graphics.drawRect(x0-w*0.5, y0-h*0.5, w, h);
    }

    // Render this to a sprite for nicer-looking images
    if(this.settings.render_graphics) {
      if(this.graphics_sprite) this.graphics_sprite.destroy(true); delete this.graphics_sprite; // Prevent memory leak!
      this.graphics_sprite = new PIXI.Sprite(VGT.pixi.renderer.generateTexture(this.graphics)); 
      this.graphics_sprite.anchor.set(this.settings.anchor.x, this.settings.anchor.y);
    }

    // Rebuild everything.
    this.refill_container();
  }


  /**
   * Selects the thing visually and adds it to the approriate list of selected things.
   * @param {int} team Team index selecting the piece
   * @param {boolean} do_not_update_q_out whether to tell the server
   * @returns 
   */
  select(team, do_not_update_q_out) { //VGT.log('thing.select()', this.id_thing, team, do_not_update_q_out, this.team_select, this.id_client_hold);
    
    // If no action is required, poop out.
    if(team == undefined                                           // If team is not specified (used by process_queues())
    || team == this.team_select                                    // It is already selected by this team
    || this.id_client_hold && VGT.clients.all[this.id_client_hold] // Someone from another team is holding it
       && VGT.clients.all[this.id_client_hold].team != team        // ...
    || this.is_hidden())                                           // It's disabled
      return;

    // If team is -1, unselect it and poop out
    if(team < 0) return this.unselect(do_not_update_q_out);

    // If there is any team selecting this already, make sure to unselect it to remove it from other lists! 
    // Do NOT send a network packet for this (not a big deal, but the selection below will suffice), 
    // and make sure to force it, since we're DEFINITELY setting the selection!
    if(this.team_select != -1) this.unselect(true, true);

    // Make sure there is an object to hold selected things for this id.
    if(VGT.things.selected[team] == undefined) VGT.things.selected[team] = {};
    //
    // Do the selecting.
    VGT.things.selected[team][this.id_thing] = this;
    this.team_select = team;

    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('team_select', 'ts', do_not_update_q_out);

    // Draw selection graphics
    this.draw_select_graphics(team);
    
  } // End of select()


  /**
   * Unselects thing. This will not unselect anything held by someone else unless force=true
   */
  unselect(do_not_update_q_out, force) { //VGT.log('thing.unselect()', this.id_thing, this.selected_id);

    // If we're already unselected, or it is held by someone else do nothing
    if(this.team_select < 0 || !force && this.id_client_hold && this.id_client_hold != VGT.net.id) return;

    // Remove it from the list
    if(VGT.things.selected[this.team_select] && VGT.things.selected[this.team_select][this.id_thing]) 
      delete VGT.things.selected[this.team_select][this.id_thing];
    this.team_select = -1;


    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('team_select', 'ts', do_not_update_q_out);

    // Remove rectangle
    this.graphics.clear();
    
    // Render to a graphics sprite for refill
    if(this.graphics_sprite) this.graphics_sprite.destroy(true); delete this.graphics_sprite; // Prevent memory leak!
    this.refill_container();

  } // End of unselect()

  // Returns a list of shoveled pieces. Specifying target=true will use the piece target coordinates, rather than its value. 
  get_shoveled(target) {
    var shoveled = [], x, y;
    
    // If it's a "shovel" piece and we're selecting, select all the pieces in its hitbox also
    if(this.settings.shovel && this.settings.shovel.length) {
      
      // Loop over the shovel group names
      var group, piece;
      for(var n in this.settings.shovel) { group  = this.settings.shovel[n];
        
        // Loop over the pieces in this group
        for(var m in VGT.pieces[group])   { piece = VGT.pieces[group][m];
          
          // Target vs value
          if(target) { x = piece.x.target; y = piece.y.target; }
          else       { x = piece.x.value;  y = piece.y.value;  }

          // If this piece contains the current values of this piece (and it's higher), select it
          // NOTE: there is a delay between setting z and it arriving. This tests the VALUE, not TARGET
          if( this.contains(x,y) && piece.is_higher_than(this) ) shoveled.push(piece);
        
        } // End of loop over pieces in group
      
      } // End of loop over shovel groups
    
    } // End of "is shovel"

    return shoveled;
  } // End of get_shoveled

  // Selects all the pieces on this piece
  shovel_select(team) {

    var shoveled = this.get_shoveled();
    for(var n in shoveled) shoveled[n].select(team);
    
  } // End of shovel_select()

 

  /* Sends data associated with key (this[key]) to the associated VGT.net.q_pieces_out[this.id_thing][qkey]. */
  update_q_out(key, qkey, only_if_exists, immediate) { 
    
    // If disabled, no net stuff
    if(this.is_disabled) return;

    // If qkey is not supplied, use the key
    if(qkey == undefined) qkey = key;

    // Get the appropriate id and q.
    if(this.type == 'Piece') {
      var q_out = VGT.net.q_pieces_out;
      var id    = this.id_piece;
    }
    else if(this.type == 'Hand') {
      var q_out = VGT.net.q_hands_out;
      var id    = this.id_hand;
    }
    else if(this.type == 'NamePlate') {
      var q_out = VGT.net.q_nameplates_out;
      var id    = this.id_nameplate;
    }
    else return this;

    // If we are only updating what exists, look for the key
    if(only_if_exists) {

      // If the piece or qkey doesn't exist already, we're done!
      if(!q_out[id])       return this;
      if(!q_out[id][qkey]) return this;
    }

    // Otherwise, make sure the queue has an object to hold this data
    else if(!q_out[id]) q_out[id] = {};

    // Update the attribute

    // Update the q depending on the kind of data it is.
    if(['x','y','r','R','s'].includes(qkey)) q_out[id][qkey] = this[key].target;                // Animated quanties
    else if(qkey == 'z')                     q_out[id][qkey] = this.get_z_value();              // z-value request
    else if(qkey == 'l')                     q_out[id][qkey] = Math.round(this.settings.layer); // layer request
    else                                     q_out[id][qkey] = this[key];                       // Something else like _n

    // If the immediate flag is true
    if(immediate) q_out[id]['now'] = true;

    // Increment the last-known update number for this attribute
    this._N[qkey]++;
    this._T[qkey] = Date.now();

    return this;
  }

  /**
   * Import the data sent from the server for this piece
   * @param {object} d Data packet for this piece
   */
  process_q_data(d, immediate) { 

    // If we're overriding immediate
    if(immediate != undefined) d['now'] = immediate;

    // Special case: nameplate initialization -- show the nameplates if they have a 'now' attached to them.
    if(this.type=='NamePlate' && d['now']) this.show();

    // We do not want to let the server change anything about the pieces that it said we are holding, 
    // UNLESS it's overriding our hold status, for example, when someone else grabbed it first and our packets crossed paths. 
    // As such, we should update the hold status first!
    //
    // If two clients grab the same piece at nearly the same time, 
    //   - Their packets will reach the server at nearly the same time. 
    //   - The server will update the hold status of the piece based on the first-arriving packet.
    //     The second-arriving packet's data should be corrected to have the first person holding it (or no information) before re-broadcast
    //       During this round-trip time, the second person will be able to move the piece around until the first packet arrives.
    //         This packet will have ih=1 the holder should be switched to the first player.
    //   - The second packet, with the corrected (or absent) change of who is holding will arrive next.
    //         This packet will have ih=1 or undefined
    //
    
    // All attributes have 
    //   - their value, e.g. 'ih' for the id of the holder
    //   - The server's packet number, e.g., 'Nih' that increments with each server update (even if unsuccessful)
    
    // Before deciding what to do with the other attributes, we need to
    // update the holder id. The server's job is to ensure that it relays the correct holder always.
    // ALSO we should ensure that we have not since queued out a newer packet updating the hold status
    // Updates the holder regardless of who is holding it
    
    // Always update the holder information first!
    this.set_packet_attribute('ih', d);

    // Now update the different attributes only if we're not holding it (our hold supercedes everything)
    if(this.id_client_hold != VGT.net.id) this.set_packet_attributes(['x','y','r','s','R','n','ts'], d);
  }

  set_x(x, immediate, do_not_update_q_out)                 { this.set_xyrs(x,undefined,undefined,undefined, immediate, do_not_update_q_out) }
  set_y(y, immediate, do_not_update_q_out)                 { this.set_xyrs(undefined,y,undefined,undefined, immediate, do_not_update_q_out) }
  set_r(r, immediate, do_not_update_q_out, do_not_reset_R) { this.set_xyrs(undefined,undefined,r,undefined, immediate, do_not_update_q_out, do_not_reset_R) }
  set_s(s, immediate, do_not_update_q_out)                 { this.set_xyrs(undefined,undefined,undefined,s, immediate, do_not_update_q_out) }
  set_R(R, immediate, do_not_update_q_out)                 { this.R.set(R,immediate); this.update_q_out('R','R', do_not_update_q_out); }
  
  /**
   * Given packet data d, use netcode logic to set the piece data for the supplied key k.
   * @param {string} k Key, either 'ih', 'x', 'y', 'r', 's', 'R', 'n', 'ts'
   * @param {object} d Data packet, containing at least d[key], d['N'+k]
   * @param {boolean} immediate Whether to apply the change immediately
   * @param {boolean} do_not_update_q_out whether to update the outbound q
   * @param {boolean} do_not_reset_R whether to reset the aux rotation R
   */
  set_packet_attribute(k, d) {
    if(this.is_disabled || d[k] == undefined) return this; 

    // Helpful shortcut
    var Nk = 'N'+k;
    
    // If the server is telling us to change the holder, CHANGE THE HOLDER! It's like z. MUST defer to server.
    if(k=='ih') {
      this.hold(d[k], true, true);
      
      // JACK: Nih may not be necessary (not used!)
      // Remember the packet number and the time that this happened
      this._N[k] = d[Nk];
      this._T[k] = Date.now();
      // END OF UNNECESSARY?
    }

    // Otherwise, we update the value....
    //   IF the packet is newer than our estimate or it's time to give up and trust the server
    //   OR this piece is held and held by someone else (if I'm still holding it legally, screw the server)
    else if( ( d[Nk] >= this._N[k] || Date.now()-this._T[k] > 2000 ) 
    || this.id_client_hold > 0 && this.id_client_hold != VGT.clients.me.id_client) { 
    
      // Set the value
      if      (k=='x')  this.set_x(d[k], d['now'], true);       // value, immediate, do_not_update_q_out
      else if (k=='y')  this.set_y(d[k], d['now'], true);       // value, immediate, do_not_update_q_out
      else if (k=='r')  this.set_r(d[k], d['now'], true, true); // value, immediate, do_not_update_q_out, do_not_reset_R
      else if (k=='s')  this.set_s(d[k], d['now'], true);       // value, immediate, do_not_update_q_out
      else if (k=='R')  this.set_R(d[k], d['now'], true);       // value, immediate, do_not_update_q_out
      else if (k=='n')  this.set_image_index(d[k], true);       // index, do_not_update_q_out
      else if (k=='ts') this.select(d[k], true);                // id_team, do_not_update_q_out
      //else if (k=='ih') this.hold(d[k], true, true);            // id_client, force, do_not_update_q_out
      else return this;

      // Remember the packet number and the time that this happened
      this._N[k] = d[Nk];
      this._T[k] = Date.now();
    } // End of "we're allowed to set this"

    return this;

  } // End of set_packet_attribute()

  /** Sets all the supplied packet keys with this.set_packet_attribute. */
  set_packet_attributes(ks, d, force) { for(var n in ks) this.set_packet_attribute(ks[n],d,force); }

  // Returns the z-order index (pieces with lower index are behind this one)
  get_z_value() {

    // Get the parent of the container
    var parent = this.container.parent;
    
    // If it exists, find the child.
    if(parent) return parent.children.indexOf(this.container);
    else       return -1;
  }

  // User function for setting the z-index of this piece.
  // This will do NOTHING locally, waiting instead for the server
  // to tell us what to do with it. Here we just send a z request to the server immediately.
  set_z_target(z) { 
    if(this.is_disabled) return

    // Add it to the quick q
    VGT.net.q_z_out.push(this.id_piece);
    VGT.net.q_z_out.push(z);

    // For each piece, every time the server sends z information (process_q or process_z_q),
    // The pieces go through _set_z_target(), which shuffles them around and updates their 
    // this._z_target values to a well-ordered list. Before the server has data, _z_target is also set well.
    
    // Get this piece's zi (initial / current value) and zf (setpoint)
    var zi = this._z_target
    var zf = parseInt(z);

    // We follow the same numbering logic of the server:
    //
    // If zf > zi 
    //   p.z < zi         no change
    //   p.z == zi        set to zf
    //   zi < p.z <= zf   subtract one
    //   p.z > zf         no change
    
    // If zi > zf
    //   p.z < zf         no change
    //   zf <= p.z < zi   add one
    //   p.z == zi        set to zf
    //   p.x > zi         no change

    // Now that we have the zi and zf, loop over the pieces in this layer and update the z's according to the above.
    var p;
    for(var i in this.container.parent.children) { p = this.container.parent.children[i].thing;

      // Do different numbering depending on where the z is relative to the initial and final values.
      
      // No matter what, if the z matches the initial z (i.e., it is this piece), this is the one to set
      if(p == this) { p._z_target = zf; }
      
      // If zf > zi, we're moving it up in z order, so the middle numbers shift down.
      else if(zi < p._z_target && p._z_target <= zf) { p._z_target--; }

      // If zi > zf, we're moving it lower, so the middle numbers shift up
      else if(zf <= p._z_target && p._z_target < zi) { p._z_target++; }
    
    } // End of _z_target update loop
  
    return this;

  } // End of set_z_target

  // Set the z-order index; only actually performed when server says it's ok (otherwise, ordering nightmare)
  _set_z_value(z) {
    if(z == undefined) return;

    // Get the parent of the container
    var parent = this.container.parent;
    
    // Get the current index
    var n_old = this.get_z_value();

    // If it's in the list, pop it out and stick it where it belongs
    if(n_old >= 0) {

      // Remove it
      var c = parent.removeChildAt(n_old);

      // Make sure we have a valid index
      if(z > parent.children.length) z = parent.children.length;
      if(z < 0)                      z = 0;

      // stuff it back in
      parent.addChildAt(c, z);
    }

    // Update the z-values to a well-ordered list for this layer
    var p;
    for(var n in VGT.tabletop.layers[this.settings.layer].children) {
      p = VGT.tabletop.layers[this.settings.layer].children[n].thing;
      p._z_target = parseInt(n);
    }
  }

  send_to_top() { 

    // Get the parent of the container
    var parent = this.container.parent;
    
    // If it exists, send it to the top of the parent's list.
    if(parent) this.set_z_target(parent.children.length-1);

    return this;
  }

  send_to_bottom() {this.set_z_target(0); return this;}

  /**
   * Fills the container with all the sprites. This can be overloaded for more complex
   * Things.
   */
  refill_container() {

    // Remove everything
    this.container.removeChildren();

    // Add the sprites
    for(var i=0; i<this.sprites.length; i++) this.container.addChild(this.sprites[i]);

    // Add the graphics layer
    if(!this.settings.render_graphics) this.container.addChild(this.graphics); // Faster? Looks jankier.
    else if(this.graphics_sprite)      this.container.addChild(this.graphics_sprite);

    // Add the text layers
    if(this.text) {

      // Render to a texture to improve appearance / get rid of jankies
      if(!this.settings.render_graphics) this.container.addChild(this.text_graphics);
      else if(this.text_graphics_sprite) this.container.addChild(this.text_graphics_sprite);

      this.container.addChild(this.text);
    }

    // Update the dimensions
    [this.width, this.height] = this.get_dimensions();
  }

  /** Returns teh largest width and height [w,h] */
  get_dimensions() {
    


    // If there is a set width use this
    if(this.settings.width) var w = this.settings.width;
    
    // Otherwise use the biggest sprite dimension
    else {

      // Loop over the layers, keeping the largest dimensions
      var w = 0;
      for(var l=0; l<this.sprites.length; l++) {
        var s = this.sprites[l];
        w = Math.max(w, s.width);
      }

      // If we have a text layer check that too
      if(this.text) w = Math.max(w, this.text.width,  this.text_graphics.width);
    }



    // If there is a set height, use that
    if(this.settings.height) var h = this.settings.height;
    
    // Otherwise use the biggest sprite dimension
    else {

      // Loop over the layers, keeping the largest dimensions
      var h = 0;
      for(var l=0; l<this.sprites.length; l++) {
        var s = this.sprites[l];
        h = Math.max(h, s.height);
      }

      // If we have a text layer check that too
      if(this.text) h = Math.max(h, this.text.height, this.text_graphics.height);
    }

    return [w,h];
  }

  /** Sets the text and redraws */
  set_text(text, style, background_color) {

    // Default style
    var style_default = {fontFamily : 'Arial', fontSize: 48, fill : 0x000000, align : 'center', wordWrap: true, wordWrapWidth: 300}
    style = {...style_default, ...style}

    // Set the text
    if(text)  this.text.text = text;
    if(style) for(var k in style) this.text.style[k] = style[k];

    // Clear the text_graphics
    this.text_graphics.clear();

    // If we are doing a plate + drop shadow
    if(background_color) {
      var w = this.text.width;
      var h = this.text.height;
      var d = 8;

      // Add a less janky shadow; this will be rendered to a sprite whenever refill_container happens
      var a;
      for(var n=1; n<=50; n++) {
        a = (50-n)*0.016;
        this.text_graphics.beginFill(0x000000, 0.003*n);
        this.text_graphics.drawRoundedRect(-0.5*w-38*a, -0.5*h-25*a, w+76*a, h+50*a, 20*a);
        this.text_graphics.endFill();
      }
      
      // White (or light gray) border
      if(get_luma_ox(background_color) < 0.95) this.text_graphics.beginFill(0xFFFFFF, 1);
      else                                     this.text_graphics.beginFill(0xDDDDDD, 1);
      this.text_graphics.drawRect(-0.5*w-2.5*d, -0.5*h-1.5*d, w+5*d, h+3*d);
      this.text_graphics.endFill();
      
      // Main background
      this.text_graphics.beginFill(background_color, 1);
      this.text_graphics.drawRect(-0.5*w-2*d, -0.5*h-d, w+4*d, h+2*d);
      this.text_graphics.endFill();
    }

    // Update the width / height of the total object
    [this.width, this.height] = this.get_dimensions();

    // Render this to a sprite here, so it's not bogging down the refill_container calls.
    if(this.settings.render_graphics) {
      if(this.text_graphics_sprite) this.text_graphics_sprite.destroy(true); delete this.text_graphics_sprite // Prevent memory leak!
      this.text_graphics_sprite = new PIXI.Sprite(VGT.pixi.renderer.generateTexture(this.text_graphics)); 
      this.text_graphics_sprite.anchor.set(this.settings.anchor.x, this.settings.anchor.y);
    }

    // Refill the container
    this.refill_container();
  }

  /**
   * Sets the image index and resets the clock. With undefined, just check and toggle whether it's public or private and return
   */
  set_image_index(n, do_not_update_q_out) {
    
    // If undefined, just toggle whether it's public or private and do nothing else; this happens at the animation rate for everyone
    if(n == undefined) {
      
      // If we have no private images, return
      if(!this.textures_private) return;

      // Get the (valid) image index
      n = this.get_image_index();

      // Figure out which image set to use
      if(this.should_use_private_images()) var source = this.textures_private;
      else                                 var source = this.textures;

      // Loop over the layers, setting the texture of each
      for(var l=0; l<this.sprites.length; l++) this.sprites[l].texture = source[l][n];

      // Do nothing else; this is purely visual
      return;
    }

    // Loop over the layers, setting the texture of each
    for(var l=0; l<this.sprites.length; l++) {
        
      // Figure out the valid index (make sure there's a texture!)
      var n_valid = n % this.textures[l].length;
      
      // Set the texture to a valid one.
      this.sprites[l].texture = this.textures[l][n_valid];
    }

    // Remember the index we're on for cycling purposes
    this._n = n_valid;
    //VGT.log('_Piece.set_image_index()', this._n, do_not_update_q_out);

    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('_n', 'n', do_not_update_q_out);

    // Record the time of this switch for animation purposes
    this.t_last_image = Date.now();

    // Finish this function for function finishing purposes
  }

  // Returns the image index
  get_image_index() {return this._n;}
  
  // Increment the image by n (1 if not supplied)
  increment_image_index(n) {
    if(n==undefined) n = 1;
    //VGT.log('_Piece.increment_image_index()', this.id, this._n+n);
    this.set_image_index(this._n+1);
  }

  // Decrements the image by n (1 if not supplied)
  decrement_image_index(n) {
    if(n==undefined) n=1;
    this.increment_image_index(-n);
  }

  // Increment the image if we've passed a certain amount of time
  increment_image_index_delayed() {
    if(Date.now() - this.t_last_image > this.t_image_delay)
      this.increment_image_index();
  }

  // Randomizes the shown image
  randomize_image_index(do_not_update_q_out) { 
    if(this.textures != undefined && this.textures[0] != undefined) 
      this.set_image_index(random_integer(0,this.textures[0].length-1), do_not_update_q_out); 
  }

  // show / hide the sprite
  show(invert)  {
    if(invert) this.container.visible = false;
    else       this.container.visible = true;
  }
  hide(invert) {
    if(invert) this.container.visible = true;
    else       this.container.visible = false;
  }
  set_visible(enabled) {this.show(!enabled);}
  is_hidden() { return !this.container.visible; }
  is_showing(){ return  this.container.visible; }
  is_visible(){ return  this.container.visible; }

  // Disable the thing all together (no net stuff)
  disable() { this.hide(); this.is_disabled = true;      return this;}
  enable()  { this.show(); this.is_disabled = undefined; return this;}
  set_enabled(enabled) {
    if(enabled) this.enable();
    else        this.disable();
    return this;
  }

  // Returns true if it's ok for the team (index) to grab this thing.
  is_grabbable_by_team(team) { 
    
    // First make sure the team zones don't preclude grabbing
    var tz;
    for(var n in VGT.teamzones.all) { tz = VGT.teamzones.all[n] 
      
      // If this teamzone is relevant and precludes grabbing, poop out
      if(tz.has_grab_influence_over(this) && !tz.settings.teams_grab.includes(team)) return false 
    }
    // No objections from any team zones
    
    // Everyone can select this thing anywhere
    if(this.settings.teams == null) return true;
    
    // Otherwise it could be a list of team numbers
    if(this.settings.teams) return this.settings.teams.includes(team);

    // Otherwise, false or null or something.
    return false;
  }

  // If this pieces is allowed to be grabbed by me.
  is_grabbable_by_me() {

    // If it's my nameplate, I can always grab it.
    if(VGT.clients && VGT.clients.me && this == VGT.clients.me.nameplate) return true;

    // Check for my team
    return this.is_grabbable_by_team(VGT.clients.me.team);
  }

  // Whether this is in my 'seeing' team zone
  should_use_private_images() {

    // If we don't have a team, should not use private images
    if(!VGT.clients || !VGT.clients.me) return false

    // Loop over the teamzones, looking for one that allows us to see private
    var tz;
    for(var n in VGT.teamzones.all) { tz = VGT.teamzones.all[n];
      
      // If this teamzone has see influence and allows private images
      if(tz.has_see_influence_over(this) 
      && tz.settings.teams_see.includes(VGT.clients.me.team)) return true
    }

    // None found!
    return false
  }

  // Returns true if this thing is in a higher layer or higher index than the supplied thing
  // Note this tests the VALUE, not the TARGET z.
  is_higher_than(thing) {

    // Higher or lower layer
    if(this.settings.layer > thing.settings.layer) return true;
    if(this.settings.layer < thing.settings.layer) return false;

    // Equal layer
    if(this.get_z_value() > thing.get_z_value()) return true;
    else                             return false;
  }

  /**
   * Converts the tabletop coordinates (x,y) to "local" coordinates.
   * @param {float} x x-coordinate in the tabletop's coordinate system
   * @param {float} y y-coordinate in the tabletop's coordinate system
   */
  xy_tabletop_to_local(x,y) {
    var v = this.container.localTransform.applyInverse(new PIXI.Point(x,y)); // Possible memory leak
    return v;
  }

  /**
   * Converts the "local" coordinates (x,y) to tabletop coordinates.
   * @param {float} x x-coordinate in this thing's coordinate system
   * @param {float} y y-coordinate in this thing's coordinate system
   */
  xy_local_to_tabletop(x,y) {
    var v = this.container.localTransform.apply(new PIXI.Point(x,y)); // Possible memory leak
    return v;
  }

  /** 
   * Sets the target x,y,r,s for this thing. See also set_xyrs_relative_to();
   * @param {float} x                     x-coordinate
   * @param {float} y                     y-coordinate
   * @param {float} r                     rotation (degrees)
   * @param {float} s                     scale of the sprite
   * @param {boolean} immediate             if true, immediately set these parameters (not let them animate)
   * @param {boolean} do_not_update_q_out   if true, do not send this information to the server (useful on server updates)
   * @param {boolean} do_not_reset_R        if true, do not reset the auxiliary rotation thing.R when setting r.
   */
  set_xyrs(x, y, r, s, immediate, do_not_update_q_out, do_not_reset_R, force_update_q_out) { if(this.is_disabled) return this;
    
    // Now for each supplied coordinate, update and send
    if(x!=undefined && (x != this.x.target || force_update_q_out)) {this.x.set(x,immediate); this.update_q_out('x', 'x', do_not_update_q_out);}
    if(y!=undefined && (y != this.y.target || force_update_q_out)) {this.y.set(y,immediate); this.update_q_out('y', 'y', do_not_update_q_out);}
    if(r!=undefined && (r != this.r.target || force_update_q_out)) {
      this.r.set(r,immediate); 
      this.update_q_out('r', 'r', do_not_update_q_out);
      if(!do_not_reset_R) {this.set_R(0, immediate, do_not_update_q_out);}
    }
    if(s!=undefined && (s != this.s.target || force_update_q_out)) {this.s.set(s,immediate); this.update_q_out('s', 's', do_not_update_q_out);}
    this.t_last_move = Date.now();

    // Dummy function overloaded by sub-classes, e.g., NamePlate
    this.after_set_xyrs(x, y, r, s, immediate, do_not_update_q_out, do_not_reset_R, force_update_q_out);

    return this
  }

  // Called after set_xyrs(); dummy function to overload
  after_set_xyrs(x, y, r, s, immediate, do_not_update_q_out, do_not_reset_R, force_update_q_out) {};

  /**
   * Sets the x,y,r,s of this thing relative to the supplied thing's target coordinates.
   * @param {Thing} thing                 Thing whose position, orientation and scale define the coordinates below
   * @param {float} x                     x-coordinate relative to supplied thing
   * @param {float} y                     y-coordinate relative to supplied thing
   * @param {float} r                     rotation (degrees) relative to supplied thing
   * @param {float} s                     scale of the sprite NOT relative to the supplied thing
   * @param {boolean} immediate             if true, immediately set these parameters (not let them animate)
   * @param {boolean} do_not_update_q_out   if true, do not send this information to the server (useful on server updates)
   * @param {boolean} do_not_reset_R        if true, do not reset the auxiliary rotation thing.R when setting r.
   */
  set_xyrs_relative_to(thing, x, y, r, s, immediate, do_not_update_q_out, do_not_reset_R) {
    
    // First convert to tabletop {x:, y:}
    var v = thing.xy_local_to_tabletop(x,y);
    
    // Get the relative rotation
    if(r != undefined) r += thing.r.target + thing.R.target;

    // Now update the thing
    this.set_xyrs(v.x,v.y,r,s,immediate,do_not_update_q_out,do_not_reset_R);
  }


  // Returns an object with the lowest snap score from this.settings.groups with the score and targets {score, x, y, r, s}
  get_best_snap_relationship() { 

    // Loop over all the piece groups
    var group, relationship, best = false;
    for(var i in this.settings.groups) { group = this.settings.groups[i];
      
      // Loop over all the snaps for this group
      for(var n in VGT.snaps[group]) { 
        
        // Get the score object
        relationship = VGT.snaps[group][n].get_relationship(this);
        
        // If it's valid (within influence) and beats our current lowest score, remember this one
        if(relationship && (!best || relationship.score < best.score)) best = relationship;
      }
    }
    VGT.log('get_best_snap_relationship()', best);
    return best;
  }

  /**
   * Updates the actual sprite location / geometry via the error decay animation, 
   * and should be called once per frame. 
   */
  animate_xyrs(delta) { if(!delta) delta = 1;
    
    // Don't do anything until it's been initialized / added to pixi.
    if(!this.ready) {return;}
    //if(VGT.pixi.N_loop == 1 && this.id_thing > 2) VGT.log('N_loop ==',VGT.pixi.N_loop,':', this.vr, this);

    this.x.animate(delta);
    this.y.animate(delta);
    this.r.animate(delta); 
    this.R.animate(delta);
    this.s.animate(delta);

    // Set the actual position, rotation, and scale
    this.container.x        = this.x.value;
    this.container.y        = this.y.value;
    this.container.rotation = (this.r.value + this.R.value)*0.01745329251;
    if(this.settings.rotate_with_view) this.container.rotation -= VGT.tabletop.r.value*0.01745329251; 
    this.container.scale.x  = this.s.value;
    this.container.scale.y  = this.s.value;

    // If we have private images, make sure we're showing the right ones
    this.set_image_index(); // Just toggles between public and private

  } // End of animate_xyrs


  /** Other animations, like sprite image changes etc, to be overloaded. */
  animate_other(delta) { if(!delta) delta = 1;}

} // End of _Thing

class _Things {

  constructor() {

    // List of all things in order, such that the index is their id_thing.
    this.all      = [];
    this.selected = {}; // lists of things selected, indexed by team
    this.held     = {}; // lists of things held, indexed by client id
  }
  
  /** Adds a _Thing to the list, and queues it for addition to the table. */
  add_thing(thing) {

    // Assign the thing id, and add it to the global lookup table
    thing.id_thing = this.all.length;
    this.all.push(thing);

    // Loop over the other groups, and add them
    var group;
    for(var n in thing.settings.groups) { 
      group = thing.settings.groups[n];
      
      // Make sure the group list exists
      if(!this[group]) this[group] = [];

      // Add the thing to it
      this[group].push(thing);
    }
  } // End of Things.add_thing()

} // End of _Things
VGT.things = new _Things();
VGT.Thing = _Thing;

/** Selectable, manipulatable thing */
class _Piece extends _Thing {

  constructor(settings) { if(!settings) settings = {};

    // Include the sets and run the usual initialization
    settings.sets = [VGT.pieces];
    super(settings);

    // Remember what type of object this is.
    this.type = 'Piece';
  }

  /** Returns true if the piece is in the output q. If key is specified,
   * Returns true only if the piece and key are in the output q.
   */
  in_q_out(key) {
    
    // If the piece exists in the out q
    if(VGT.net.q_pieces_out[this.id_piece]) {

      // If key is undefined, return true
      if(key == undefined) return true;

      // Otherwise, if the value is undefined it's not in the q
      else if(VGT.net.q_pieces_out[this.id_piece][key] == undefined) return false

      // Gues the key is in the q, huh. Huh.
      else return true;
    }

    // No piece!
    else return false;
  }
}
// List of pieces for convenience
class _Pieces { 
  constructor() {
    this.all = [];
  }

  // PIECES: Adds a thing to the list, and queues it for addition to the table. 
  // this function cannot be 'add_piece' because it is called from a general constructor.
  add_thing(thing) {
    thing.id_piece = this.all.length;
    this.all.push(thing);

    // Loop over the other groups, and add them
    var group;
    for(var n in thing.settings.groups) { 
      group = thing.settings.groups[n];
      
      // Make sure the group list exists
      if(!this[group]) this[group] = [];

      // Add the thing to it
      this[group].push(thing);
    }
  }

  // Resets coordinates
  reset() {for(var n in this.all) this.all[n].reset(); }
}
VGT.pieces = new _Pieces();
VGT.Piece  = _Piece;

/** Animated Polygon */
class _Polygon extends _Thing { 

  default_settings = {
    vertices: undefined,    // List of vertices, e.g., [[0,0],[1,100],[0,100]
  }

  constructor(settings) {

    if(!settings) settings = {};
    settings.images = null; // No images, just GL drawing.

    // Run the usual thing initialization
    super(settings);

    // Remember the type
    this.type = 'Polygon';

    // List of vertices, each coordinate of which is animated
    this.vertices = [];

    // If we supplied vertices, add them
    if(settings.vertices) this.add_vertices(settings.vertices);

    // If we're supposed to redraw
    this.needs_redraw = false;
  }
  
  // Clear it out and make sure it doesn't draw again
  clear() {

    // Finish the animation so it doesn't trigger redraws
    var v;
    for(var n in this.vertices) { v = this.vertices[n];
      v[0].set(v[0].target, true);
      v[1].set(v[1].target, true);
    }

    // Clear the graphics
    this.graphics.clear();

    // Render to a graphics sprite for refill
    if(this.graphics_sprite) this.graphics_sprite.destroy(true); delete this.graphics_sprite; // Prevent memory leak!
    this.refill_container();

    // No need to redraw; that's the whole point.
    this.needs_redraw = false;
  }
  
  // Adds a vertex, e.g., [27,289]
  add_vertex(v) { this.vertices.push([new _Animated(v[0]), new _Animated(v[1])]); this.needs_redraw = true} // Possible memory leak

  // Adds a list of vertices, e.g. [[100,10],[50,50],[32,37],...]
  add_vertices(vs) { for(var n in vs) this.add_vertex(vs[n]); }

  // Sets the coordinates of vertex n to v, e.g. [32,27]
  set_vertex(n, v, immediate) { 
    this.vertices[n][0].set(v[0], immediate); 
    this.vertices[n][1].set(v[1], immediate); 
    this.needs_redraw = true;

    this.update_q_out(n);
  }

  // Sets the coordinates of many vertices, e.g. [[100,10],[50,50],[32,37],...]
  set_vertices(vs, immediate) { for(var n in vs) this.set_vertex(n,vs[n],immediate); }

  // Returns a Polygon of this.vertices
  get_polygon() {
    var vs = [];

    // Loop over the vertices and transform them into the tabletop frame
    for(var n in this.vertices)
      vs.push( // vertices for teamzones are tabletop coordinates
        this.vertices[n][0].value, 
        this.vertices[n][1].value);

    // Make the pixi polygon
    return new PIXI.Polygon(...vs); // Possible memory leak
  }

  // Returns a Polygon of the same vertices in the *tabletop* coordinates
  // Note this function may not be general / could break in a few situations, but it's used for the mouse selection, which currently works
  get_tabletop_polygon() {
    var vs = [];

    // Loop over the vertices and transform them into the tabletop frame
    for(var n in this.vertices)
      vs.push(this.xy_local_to_tabletop( 
        this.vertices[n][0].value, 
        this.vertices[n][1].value));

    // Make the pixi polygon
    return new PIXI.Polygon(...vs); // Possible memory leak
  }

  /**
   * Get the bounds of the polygon {xmin:, xmax:, ymin:, ymax:}
   * @param {string} mode can be either 'value' or 'target' (default is 'target')
   * @returns 
   */
  get_bounds(mode) {
    if(!mode) mode = 'target';

    var xmin, xmax, ymin, ymax, v;
  
    for(var n in this.vertices) { v = this.vertices[n];
    
      // Initialize
      if(n==0) {
        xmin = xmax = v[0][mode];
        ymin = ymax = v[1][mode];
      }
      else {
        xmax = Math.max(v[0][mode], xmax);
        ymax = Math.max(v[1][mode], ymax);
        xmin = Math.min(v[0][mode], xmin);
        ymin = Math.min(v[1][mode], ymin);
      }
    }

    return {xmin:xmin, xmax:xmax, ymin:ymin, ymax:ymax}
  }

  // Returns true if the supplied tabletop coordinates are within this polygon
  contains_tabletop_xy(x,y) { return this.get_polygon().contains(x,y); }

  // Whether this contains the 
  contains_thing(thing) { return this.contains_tabletop_xy(thing.x.value, thing.y.value); }

  // Animate the vertices
  animate_other(delta) {

    // Loop over the vertices and animate them
    var v, max_velocity = 0;
    for(var n in this.vertices) { v = this.vertices[n];
      v[0].animate(delta);
      v[1].animate(delta);
      max_velocity = Math.max(max_velocity, Math.abs(v[0].velocity), Math.abs(v[1].velocity));
    }

    // Now actually draw the thing, if anything moved substantially
    if(max_velocity > 1e-5 || this.needs_redraw) this.redraw();
  }

  // Clear and redraw the whole thing
  redraw() {

    // Get the list of pixi points with the most recent value
    var ps = [];
    for(var n in this.vertices) ps.push(new PIXI.Point(this.vertices[n][0].value, this.vertices[n][1].value)); // Possible memory leak
    this.graphics.clear();
    this.graphics.beginFill(this.get_tint(), 1);
    this.graphics.drawPolygon(ps);
    this.graphics.endFill();

    // Render it to a sprite for refill
    if(this.settings.render_graphics) {
      if(this.graphics_sprite) this.graphics_sprite.destroy(true); delete this.graphics_sprite; // Prevent memory leak!
      this.graphics_sprite = new PIXI.Sprite(VGT.pixi.renderer.generateTexture(this.graphics)); 
      this.graphics_sprite.anchor.set(this.settings.anchor.x, this.settings.anchor.y);
    }
    
    // Refill the cointainer.
    this.refill_container();
    
    // Don't need to do this again!
    this.needs_redraw = false;
  }
}
VGT.Polygon = _Polygon;

// List of polygons
class _Polygons {
  constructor() {
    this.all = [];
  }

  // Adds a thing to the list, and queues it for addition to the table. 
  add_thing(polygon) {
    polygon.id_polygon = this.all.length;
    this.all.push(polygon);
  }

  // Resets coordinates
  reset() {for(var n in this.all) this.all[n].reset(); }
}
VGT.polygons = new _Polygons();
VGT.Polygons = _Polygons;

/**
 * Polygon that determines which teams can grab or see what pieces when they're contained within. See Polygon for more settings, like vertices (!)
 */
class _TeamZone extends _Polygon {

  default_settings = {
    groups_grab:      null,   // List of piece groups whose grab behavior is influenced by this; null means all groups
    groups_see:       null,   // List of piece groups whose see behavior is influenced by this; null means "match groups_grab"

    teams_grab:       null,   // List of teams (indices) that can grab the pieces; null means everyone
    teams_see:        null,   // List of teams (indices) that can see the secret images; null means "match teams_grab"

    color_fill:       null,   // Hex color (e.g. 0x123456) of the fill; null means "automatic" (the color of the first team in the list)
    color_line:       null,   // Hex color (e.g. 0x123456) of the line; null means "match fill"

    alpha_fill:           1,  // Opacity of the fill for other teams
    alpha_line:         0.5,  // Opacity of the line for other teams
    
    alpha_fill_grab:   null,  // Opacity of the fill for the grab teams; null means match alpha_fill
    alpha_line_grab:   null,  // Opacity of the line for the grab teams; null means match alpha_line
    
    alpha_fill_see:    null,  // Opacity of the fill for the see teams; supercedes grab alpha; null means match grab value
    alpha_line_see:    null,  // Opacity of the line for the see teams; supercedes grab alpha; null means match grab value
    
    width_line:        2,       // Border width
  }

  constructor(settings) {
    if(!settings) settings = {}
    settings.type = 'TeamZone'
    settings.sets = [VGT.teamzones]
    
    // Run the default stuff
    super(settings);

    // Now override defaults
    for(var k in this.default_settings) 
      if(settings[k] != undefined) this.settings[k] = settings[k];
      else                         this.settings[k] = this.default_settings[k];

    // Deal with group nulls
    if(this.settings.groups_see == null) this.settings.groups_see = this.settings.groups_grab;

    // Deal with nulls (convert to a list [0,1,2,3...])
    if(this.settings.teams_grab == null) this.settings.teams_grab = [...Object.keys(VGT.game.settings.teams).keys()];
    if(this.settings.teams_see  == null) this.settings.teams_see  = [...this.settings.teams_grab];

    // Get the default color
    var default_color = 0xAAAAAA;
    if     (this.settings.teams_grab.length == 1) default_color = game.get_team_color(this.settings.teams_grab[0]);
    else if(this.settings.teams_see .length == 1) default_color = game.get_team_color(this.settings.teams_see [0]);
      
    // If we overrode the color, then the first color in the list, then the first team color
    if(this.settings.color_fill == null) this.settings.color_fill = default_color;
    if(this.settings.color_line == null) this.settings.color_line = default_color;

    // Opacities
    if(this.settings.alpha_fill_grab == null) this.settings.alpha_fill_grab = this.settings.alpha_fill;
    if(this.settings.alpha_line_grab == null) this.settings.alpha_line_grab = this.settings.alpha_line;
    if(this.settings.alpha_fill_see  == null) this.settings.alpha_fill_see  = this.settings.alpha_fill_grab;
    if(this.settings.alpha_line_see  == null) this.settings.alpha_line_see  = this.settings.alpha_line_grab;
  }

  // Whether this teamzone has any influence over the supplied thing, using the specified groups
  _has_influence_over(thing, groups) {

    // First make sure it's contained within this zone
    if(!this.contains_thing(thing)) return false;

    // I guess the thing is in this teamzone

    // Null means all groups
    if(!groups) return true;

    // Otherwise it's a list, so loop over it and return true if we find one.
    for(var n in groups) 
      if(thing.settings.groups.includes(groups[n])) return true;

    // Nothing found
    return false
  }

  // Whether this teamzone has grab influence over the supplied thing
  has_grab_influence_over(thing) {return this._has_influence_over(thing, this.settings.groups_grab)}

  // Whether this teamzone has see influence over the supplied thing
  has_see_influence_over(thing) {return this._has_influence_over(thing, this.settings.groups_see)}

  // Clear and redraw the whole thing
  redraw() {
    
    // If this team zone is our see zone
    if(this.settings.teams_see.includes(game.get_my_team_index())) {
      var alpha_fill = this.settings.alpha_fill_see;
      var alpha_line = this.settings.alpha_line_see;
    }

    // Otherwise if it's our grab zone, use that
    else if(this.settings.teams_grab.includes(game.get_my_team_index())) {
      var alpha_fill = this.settings.alpha_fill_grab;
      var alpha_line = this.settings.alpha_line_grab;
    }

    // Otherwise, we're "someone else"
    else {
      var alpha_fill = this.settings.alpha_fill;
      var alpha_line = this.settings.alpha_line;
    }

    // Clear the graphics
    this.graphics.clear();
    
    // Get the list of pixi points with the most recent value
    var ps = [];
    for(var n in this.vertices) ps.push(new PIXI.Point(this.vertices[n][0].value, this.vertices[n][1].value)); // Possible memory leak
    
    // Render the fill zone
    this.graphics.lineStyle({
      width: this.settings.width_line, 
      color: this.settings.color_line, 
      alpha: alpha_line,
      alignment: 0});
    this.graphics.beginFill(this.settings.color_fill, alpha_fill);
    this.graphics.drawPolygon(ps);
    this.graphics.endFill();

    // Render it to a sprite for refill
    if(this.settings.render_graphics) {
      if(this.graphics_sprite) this.graphics_sprite.destroy(true); delete this.graphics_sprite; // Prevent memory leak!
      this.graphics_sprite = new PIXI.Sprite(VGT.pixi.renderer.generateTexture(this.graphics)); 
      this.graphics_sprite.anchor.set(0.5, 0.5);

      // Also need to adjust the center location so that the supplied "tabletop" coordinates are actually the tabletop coordinates
      // The anchor is at the center of the bounds, so we need to shift it by the center
      var b = this.get_bounds('target');
      this.set_xyrs(0.5*(b.xmin+b.xmax), 0.5*(b.ymin+b.ymax));
    }

    // Refill the container
    this.refill_container();

    // Don't need to do this again!
    this.needs_redraw = false;
  }
  

}
VGT.TeamZone = _TeamZone;

// List of team zones
class _TeamZones {
  constructor() {
    this.all = [];
  }

  // Adds a thing to the list, and queues it for addition to the table. 
  add_thing(teamzone) {
    teamzone.id_teamzone = this.all.length;
    this.all.push(teamzone);
  }

  // Returns a list of teamzones containing table point x,y
  get_teamzones_containing_tabletop_xy(x,y) {

    // Loop over the team zones
    var tzs = [];
    for(var n in this.all) if(this.all[n].contains_tabletop_xy(x,y)) tzs.push(this.all[n]);
    return tzs;
  }

  // Returns lists of teams {teams_grab:[], teams_see:[]} for tabletop coordinates x,y; null for either means "everyone"
  get_allowed_teams_at_tabletop_xy(x,y) {

    // Lists to fill
    var teams_grab = [], teams_see = [];

    // Get all teamzones
    var tzs = this.get_teamzones_containing_tabletop_xy(x,y);
    
    // If we have NO teamzones, all teams are allowed
    if(!tzs.length) return {teams_grab:null, teams_see:null}

    // Loop over them, filling the lists
    for(var n in tzs) {

      // Check grabs and sees and fill the lists without duplicates
      for(var g in tzs[n].settings.teams_grab) if(!teams_grab.includes(tzs[n].settings.teams_grab[g])) teams_grab.push(tzs[n].settings.teams_grab[g]);
      for(var s in tzs[n].settings.teams_see ) if(!teams_see .includes(tzs[n].settings.teams_see [s])) teams_see .push(tzs[n].settings.teams_see [s]);
    }

    return {teams_grab:teams_grab, teams_see:teams_see}
  }

  // Resets coordinates
  reset() {for(var n in this.all) this.all[n].reset(); }
}
VGT.teamzones = new _TeamZones();
VGT.TeamZones = _TeamZones;


class _NamePlate extends _Thing {

  constructor(settings) { if(!settings) settings = {};
    if(settings.render_graphics == undefined) settings.render_graphics = true;   

    // Include the sets and run the usual initialization
    settings.sets = [VGT.nameplates];
    super(settings);

    // Remember the type
    this.type = 'NamePlate';
  }

  // NAMEPLATE: No z-setting or q for this; that's only for pieces
  set_z_target() {};

  // Called after set_xyrs(); here we just save our location with a cookie
  after_set_xyrs(x, y, r, s, immediate, do_not_update_q_out, do_not_reset_R) {
    
    // JACK: This happens many times for one xyrs call.
    // If it's associated with MY hand, save it
    if(this.hand && VGT.clients.me && this.hand.id_client == VGT.clients.me.id_client) 
        VGT.html.save_cookie('my_nameplate_xyrs', [this.x.target,this.y.target,this.r.target,this.s.target]);
  }
} // End of NamePlate

class _NamePlates {
  
  constructor() {
    this.all = [];
  }

  // Adds a thing to the list, and queues it for addition to the table. 
  add_thing(nameplate) {
    nameplate.id_nameplate = this.all.length;
    this.all.push(nameplate);
  }  
}
VGT.nameplates = new _NamePlates();
//VGT.NamePlates = _NamePlates;

/** Floating hand on top of everything. */
class _Hand extends _Thing {

  constructor() {

    // Create the settings for a hand
    var settings = {
      images        : [['hand', 'fist']], // paths relative to the root
      layer         : VGT.tabletop.LAYER_HANDS,   // Hands layer.
      t_pause       : 1200,                       // How long to wait since last move before faiding out.
      t_fade        : 500,                        // Time to fade out.
      sets          : [VGT.hands],                // Other sets it belongs to
    }

    // Run the usual thing initialization
    super(settings);

    // Remember the type
    this.type = 'Hand';

    // id of client this hand belongs to
    this.id_client = 0;

    // Create the selection rectangle, without adding it to the "playable" lists and q's
    this.polygon = new VGT.Polygon({vertices: [[0,0],[0,0],[0,0],[0,0]], layer: VGT.tabletop.LAYER_SELECT});
    this.polygon.container.alpha = 0.4;

    // Create a nameplate with the hand
    this.nameplate = new _NamePlate({text:'player', layer: VGT.tabletop.LAYER_NAMEPLATES});
    this.nameplate.hand = this;
    this.nameplate.hide(); // New Hands need to be hidden. The other thing that hides them is free_all_hands()

    // For selection rectangle dynamics
    this._originally_selected = [];
    this._newly_selected = {}; // indexed by key

    // Set the initial scale
    VGT.hands.set_scale(1.0/VGT.tabletop.s.value);
  }

  /** HAND: Sets the tint of all the images AND the polygon selection rectangle */
  set_tint(tint) {

    // Do the usual thing
    super.set_tint(tint);

    // Set the tint of the polygon, too
    this.polygon.set_tint(tint);
  }  

  // Whether this is my hand or not.
  is_me() {
    if(VGT.clients && VGT.clients.me) 
      return this.id_client == VGT.clients.me.id_client;
    else return false;
  }

  /** Closes / opens the hand */
  close() {this.set_image_index(1);}
  open()  {this.set_image_index(0);}
  
  /** Whether the hand is open or closed. */
  is_closed() {return this._n == 1;}
  is_open()   {return this._n == 0;}

  /** Sets t_last_move to the current time to show the hand. */
  ping() {this.t_last_move = Date.now();}

  // Sets the polygon location to be the same as the hand location; this shouldn't send data, since it's not a _Piece
  after_set_xyrs(x, y, r, s, immediate, do_not_update_q_out, do_not_reset_R, force_update_q_out) {
    this.polygon.set_xyrs(x, y, r, undefined, immediate, do_not_update_q_out, do_not_reset_R, force_update_q_out);
  }

  /** Other animations associate with the hand. */
  animate_other(delta) { 
    
    // If it has vd (vector of mouse down) set to a vector (not false or undefined), update the multi-piece selection rectangle
    if(this.vd) {

      // Get the distance vector traveled since the pointer came down
      var v = rotate_vector([this.x.value - this.vd.x, this.y.value - this.vd.y], -this.r.value);
      var vs = [ [0,0], [-v[0],0], [-v[0],-v[1]], [0,-v[1]] ];
      
      // If I have a hand, update the selection rectangle to extend back to where the click originated
      this.polygon.set_vertices(vs, true, true ); // immediate, do_not_update_q_out

      // Set the anchor for the generated image
      if(v[0] > 0) var xa = 1;
      else         var xa = 0;
      if(v[1] > 0) var ya = 1;
      else             ya = 0;
      this.polygon.settings.anchor = {x:xa,y:ya}
    
      // At a reduced frame rate, check for pieces within the polygon
      if(VGT.pixi.n_loop % 5 == 0 && this.is_me()) {

        // Get the polygon in tabletop coordinates
        var poly = this.polygon.get_tabletop_polygon(); 
        
        // Loop over the pieces and select those that are in it.
        var p;
        for(var n in VGT.pieces.all) { p = VGT.pieces.all[n];

          // If it's grabbable by me and in the bounds of the selection rectangle, select it.
          if(p.is_grabbable_by_me() && poly.contains(p.x.value, p.y.value)) {
            p.select(VGT.clients.me.team);
            this._newly_selected[p.id_piece] = true; // Remember this is part of the new batch
          }
          
          // Outside the bounds: If this is one of the newly selected pieces and it's NOT one of the originally selected, unselect 
          else if(Object.keys(this._newly_selected).includes(String(p.id_piece)) && !this._originally_selected.includes(p)) {
            p.unselect();
            delete this._newly_selected[p.id_piece];
          }
        }  
      } // End of reduced frame rate
    } // End of if(vd)

    // Otherwise, clear it
    else this.polygon.clear();

    // Time of most recent last change
    var t0 = Math.max(this.t_last_image, this.t_last_move);

    // All we do is fade it out after some time.
    if(this.is_open()) this.container.alpha = fader_smooth(t0+this.settings.t_pause, this.settings.t_fade);
    else               this.container.alpha = 1;
  }
} // End of _Hand

// List of hands for convenience
class _Hands { constructor() {this.all = [];}

  // Adds a thing to the list, and queues it for addition to the table. 
  add_thing(hand) {
    hand.id_hand = this.all.length;
    this.all.push(hand);
  }

  /** Finds a free hand or creates and returns one */ 
  get_unused_hand() {
    
    // Loop over hands trying to find a free one
    for(var l in this.all) if(this.all[l].id_client == 0) return this.all[l];

    // If we haven't returned yet, we need a new one
    return new _Hand();
  }

  /** Frees all hands from ownership */
  free_all_hands() { 

    // For each hand, set the client to 0 (server or no one),
    // And make the nameplate invisible
    for(var l in this.all) {
      this.all[l].id_client = 0; 
      this.all[l].nameplate.hide();                // Clears unassigned nameplates
    }
  }

  // Sets the scale target for all hands immediately without telling the net or changing the fade out
  set_scale(scale) { 
    var h, t0;
    for(var n in this.all) { h=this.all[n];
      t0 = h.t_last_move;
      this.all[n].set_xyrs(undefined,undefined,undefined,scale,true,true,true);
      h.t_last_move = t0;
    }
  }

  /** Just shows them all briefly */
  ping() {for(var l in this.all) this.all[l].ping();}
}
VGT.hands = new _Hands();

/** Keeps track of the client objects and information not sent over the net. */
class _Clients {

  constructor() {

    // list by net id of client stuff
    this.all = {};
  }

  /** CLIENTS Rebuilds the client list and GUI based on VGT.net.clients. */
  rebuild() {
    VGT.log('VGT.clients.rebuild()');

    // Clear out the list
    this.all = {};

    // Unassign all hands, hide at plates, sets id_client's to 0
    VGT.hands.free_all_hands();

    // Loop over the client list
    for (var k in VGT.net.clients) {var c = VGT.net.clients[k];
      VGT.log('  client', c.id, c.name, c.team, VGT.game.settings.teams[c.team]);
    
      // Store everything for this client.
      this.all[c.id] = {
        name  : c.name,
        team  : c.team, // index
        color : VGT.game.get_team_color(c.team),
        hand  : VGT.hands.get_unused_hand(),
        id_client : c.id,
      }
      
      // Set the hand id_client
      this.all[c.id].hand.id_client = c.id;
      
      // Show all hands but my own: JACK: this is where the checkbox check happens for showing my own hand.
      if(c.id == VGT.net.id) this.all[c.id].hand.hide();
      else                   this.all[c.id].hand.show();

      // Update the hand color
      this.all[c.id].hand.set_tint(this.all[c.id].color);

      // Get the nameplate
      this.all[c.id].nameplate = this.all[c.id].hand.nameplate;

      // Update the nameplate and colors
      var color = this.all[c.id].color;
      
      // If the color is too bright (per ITU-R BT.709 definition of luma), go black with the text
      if(get_luma_ox(color) > 0.7) var text_color = 0x888888;
      else                         var text_color = 0xFFFFFF;
      this.all[c.id].nameplate.set_text(c.name, {fill:text_color}, color);
      this.all[c.id].nameplate.unselect(); // Selection doesn't change shape yet, so we unselect it
      
    } // End of loop over client list

    // Keep track of me
    this.me = this.all[VGT.net.id];

    // Send my hand's rotation x, y, r, s, *immediate, do_not_update_q_out, do_not_reset_R, *force_update_q_out
    this.me.hand.set_xyrs(undefined, undefined, -VGT.tabletop.r.target, undefined, true, undefined, undefined, true);
    VGT.net.process_queues(true); // immediately process q's to avoid weird rotation animation as hands are swapped

    // Load my last nameplate position (everyone else does this), set it, and send to everyone.
    var s = VGT.html.load_cookie('my_nameplate_xyrs');

    // With a cookie, we use the cookie value
    if(s != "") var xyrs = eval('['+s+']');

    // Without a cookie, we need to move OUR nampelate to the starting position and tell everyone about it.
    else var xyrs = VGT.game.settings.nameplate_xyrs;

    // Fill out / fix the undefineds
    for(var n in xyrs) if(typeof xyrs[n] != 'number') xyrs[n] = 1;

    // Set the position with a snap and don't tell anyone yet
    VGT.log('Setting my nameplate xyrs to', xyrs[0], xyrs[1], xyrs[2], xyrs[3]);
    this.me.nameplate.set_xyrs(xyrs[0], xyrs[1], xyrs[2], xyrs[3], true, true); // immediate, do_not_update_q_out

    // Manually force the q update for MY nameplate in case the target matches the cookie value, and make it snap immediately for everyone else
    this.me.nameplate.update_q_out('x', undefined, undefined, true);
    this.me.nameplate.update_q_out('y', undefined, undefined, true);
    this.me.nameplate.update_q_out('r', undefined, undefined, true);
    this.me.nameplate.update_q_out('s', undefined, undefined, true);

    // Since we know we've got MINE in the right place, show it.
    // The other nameplates will be shown when we receive the first location.
    this.me.nameplate.show();

    // Housekeeping: clear out all the unused held pieces
    var client_ids = Object.keys(this.all)
    //
    // Loop over client ids (k = '10' e.g.)
    for(var k in VGT.things.held) {
      //
      // If the current list of clients doesn't include k, clear it out
      if(!client_ids.includes(k)) {
        //
        // Force release all of them associated with this client and then kill the object.
        for(var j in VGT.things.held[k]) VGT.things.held[k][j].release(0,true,false,true);
        delete VGT.things.held[k];
      }
    }


    // Finally, using the current VGT.net.clients, rebuild the html table.
    VGT.html.rebuild_client_table();

    // At this point, we have all the clients and their teams. Now redraw the team zones.
    for(var n in VGT.teamzones.all) VGT.teamzones.all[n].needs_redraw = true;
  }
}
VGT.clients = new _Clients();

/** Class that holds all the game info: things, teams, rules, etc. */
class _Game {

  // Default minimal settings that can be overridden.
  default_settings = {

    name: 'VGT',        // Game name
    rules: null,        // path (e.g. 'rules.pdf') to rules for this game
    undos: 500,         // Number of undos to remember (each 0.5 seconds minimum)
    default_zoom: 1,    // Default zoom level for new users

    background_color : 0xFFFAFA, // Tabletop background color

    // Available teams for clients and their colors.
    teams : {
      Observer : 0xFFFFFF,
      Red      : 0xFF2A2A,
      Orange   : 0xFF6600,
      Yellow   : 0xFFE84B,
      Green    : 0x118855,
      Blue     : 0x5599FF,
      Violet   : 0xD62CFF,
      Gray     : 0x808080,
      Brown    : 0x883300,
      Manager  : 0x333333
    },

    // Available game setup modes
    setups : ['Standard'],  // Populates the pull-down menu next to the "New Game" button

    // Locations of the nameplates
    nameplate_xyrs : [0,0,0,0],

    // How long to wait in between housekeepings.
    t_housekeeping   : 100, // For moving pieces around (already locally responsive)
  }

  constructor(settings) {
    
    // Store the settings, starting with defaults then overrides.
    this.settings = {...this.default_settings, ...settings};
    
    // Special override the name, for cookies etc
    if(VGT.game_name) this.settings.name = VGT.game_name; 

    // Create the big objects that depend on game stuff.
    VGT.game        = this;
    VGT.pixi        = new _Pixi();
    VGT.tabletop    = new _Tabletop({s_start: this.settings.default_zoom});
    VGT.interaction = new _Interaction();
    if(VGT.sound_list) VGT.sounds = new _Sounds(sound_list);
    
    // Add elements to the setups combo box
    for (var k in this.settings.setups) {
        var o = document.createElement("option");
        o.value = this.settings.setups[k];
        o.text  = this.settings.setups[k];
        VGT.html.select_setups.appendChild(o);
    }
    // Set the last known setups
    var c = VGT.html.load_cookie('setups.value');
    if(c != '') VGT.html.select_setups.value = c;

    // Make sure it was in the list!
    if(VGT.html.select_setups.value == '') VGT.html.select_setups.selectedIndex = 0;

    // If we have no rules, hide the button
    if(!this.settings.rules) VGT.html.button_rules.style.visibility='hidden';
    
    // FOR THE USER
    this.mouse = {x:0, y:0, r:0};
    this.html  = VGT.html;
    this.table = VGT.tabletop;
    this.pixi  = VGT.pixi;
    this.SnapGrid   = VGT.SnapGrid;
    this.SnapCircle = VGT.SnapCircle;
    
    // Fix the width of the chat box according to the current GUI.
    VGT.html.ul_messages.style.width = VGT.html.ul_messages.offsetWidth;

    // Load the sounds
    this.sounds = new _Sounds(VGT.sounds)

    // Start the slow housekeeping
    setInterval(this._housekeeping.bind(this), this.settings.t_housekeeping);

    // If the user is new, show the help
    //if(VGT.html.load_cookie('saw_help') == '') VGT.html.show_help();
    VGT.html.show_help();
  }

  // Sets the title of the special area and reveals it
  set_special_title(text) {
    VGT.html.div_special.style.display = 'block';
    VGT.html.div_special_title.innerText = text;
  }

  // Sets the special control area's html and reveals the special section and shows it
  set_special_html(html) {
    VGT.html.div_special.style.display = 'block';
    VGT.html.div_special.controls.innerHTML = html;
  }

  // Adds html to the special controls section and shows it
  add_special_html(html) {
    VGT.html.div_special.style.display = 'block';
    var a = VGT.html.div_special_controls;
    a.innerHTML = a.innerHTML + html;
  }

  /**
   * Creates and returns a new piece according to the specified settings
   * @param {object} settings       Piece specifications
   * @param {string} images         Optional images list (overwrites settings.images)
   * @param {string} images_private Optional images that we see when it's in our team zone. Must match the structure of images!
   * @returns _Piece
   */
  add_piece(settings, images, images_private) {
    if(images         != undefined) settings.images         = images;
    if(images_private != undefined) settings.images_private = images_private;
    return new VGT.Piece(settings)
  }
  
  /**
   * Creates and returns a list of new, identical pieces according to the specified settings.
   * @param {int} count             Number of copies to make 
   * @param {object} settings       Pieces specifications
   * @param {string} images         Optional images list (overwrites settings.images)
   * @param {string} images_private Optional images that we see when it's in our team zone. Must match the structure of images!
   */
  add_pieces(count, settings, images, images_private) { VGT.log('add_pieces()', count, settings, images);
    var pieces = [];
    for(var n=0; n<count; n++) pieces.push(this.add_piece(settings, images, images_private));
    return pieces;
  }
  
  /**
   * Creates and returns a VGT.SnapGrid object with the specified settings
   * @param {object} settings 
   */
  add_snap_grid(settings) { return new VGT.SnapGrid(settings); }

  /**
   * Creates and returns a VGT.SnapCircle object with the specified settings
   * @param {object} settings 
   */
  add_snap_circle(settings) { return new VGT.SnapCircle(settings); }

  /**
   * Adds a teamzone with the specified settings
   * @param {object} settings 
   */
  add_teamzone(settings) { VGT.log('add_teamzone()', settings);
    return new VGT.TeamZone(settings);
  }

  /**
   * Connects the supplied key string (e.g. 'ShiftBackspaceDown'; see browser console when hitting keys for these names)
   * to the supplied function f
   * @param {string} keys  Key string (or list of strings) to bind to the function
   * @param {function}  f  Function; first argument must be the key event.
   */
  bind_key(keys, f) { VGT.interaction.bind_key(keys, f); }

  /**
   * Binds the supplied mouse button to the supplied function
   * @param {int or list} buttons 
   * @param {function} f 
   */
  bind_pointerdown_button(buttons, f) { VGT.interaction.bind_pointerdown_button(buttons, f); }

  /**
   * Find the topmost thing at the specified tabletop location x,y, or return null
   * The thing must be within the non-special layers.
   * @param {number} x // tabletop x-coordinate
   * @param {number} y // tabletop y-coordinate
   * @returns 
   */
   get_top_thing_at(x,y) {

    // Get the full list of appropriate layers
    var layers = [...VGT.tabletop.layers];
    layers.push(VGT.tabletop.layer_nameplates);

    // Loop over the layers from top to bottom
    var layer, container;
    for(var n=layers.length-1; n>=0; n--) {
      layer = layers[n];
      if(!layer) continue;
      
      // Loop over the things in this layer from top to bottom.
      for(var m=layer.children.length-1; m>=0; m--) {

        // container of thing
        container = layer.children[m]; 
       
        // Get the scaled bounds and test (only include visible pieces)
        if(container.thing.is_showing() && container.thing.contains(x,y)) {
         
          // If our team is allowed to control this thing, return it
          if(container.thing.is_grabbable_by_me()) return container.thing;
          
          // Otherwise, return null so we don't get access to pieces below pieces (not intuitive)
          else return null
        }
      } // End of things in layer loop

    } // End of all layers loop
    return null;
  }


  /** Gets the team name from the list index. */
  get_team_name(n)   {return Object.keys(this.settings.teams)[n];}
  get_my_team_name() {return this.get_team_name(this.get_my_team_index());}

  /** Gets the team index from the name. Returns -1 for "not in list" */
  get_team_index(name) {return Object.keys(this.settings.teams).indexOf(name);  }

  /** Gets the client's team index for them. */
  get_my_team_index()  {
    if(VGT.clients && VGT.clients.me) return VGT.clients.me.team
    else                              return 0;
  }
  /** Gets a sorted list of participating team indices. */
  get_participating_team_indices() {
    var teams = [];
    for(var n in VGT.clients.all) 
      if(!teams.includes(VGT.clients.all[n].team)) teams.push(VGT.clients.all[n].team);
    teams.sort();
    return teams;
  }
  /** Returns true if the specified team index is participating. */
  team_is_participating(team) { return this.get_participating_team_indices().includes(team); }

  /** Gets the color from the index */
  get_team_color(n)   {return this.settings.teams[Object.keys(this.settings.teams)[n]]; }
  get_my_team_color() {
    if(VGT.clients && VGT.clients.me) return VGT.clients.me.color;
    else                              return 0;
  }

  // Returns the client id
  get_my_client_id() {return VGT.net.id;}

  /** Returns the selected list for the specified team. If under_mouse is true,
   * and no selection exists, returns a list containing the piece (if any) under the mouse.
  */
  get_selected(team, under_mouse) { 

    // If the team is undefined, use mine
    if(team == undefined) team = this.get_my_team_index();

    // Get the things to adjust
    var things = VGT.things.selected[team];
    if(things == undefined) things = {};          // Empty list
    else                    things = {...things}; // Make a copy so no one messes with it.

    // If there is nothing, use what's under the mouse
    if(!Object.keys(things).length && under_mouse) {
      var p = VGT.game.get_top_thing_at(VGT.game.mouse.x, VGT.game.mouse.y);
      if(!p) return {};
      things[p.id_thing] = p;
    }
    
    return things;
  }

  // Given a list of things, returns a list of those that are not held.
  get_unheld_things(things) {
    var unheld = [];
    for(var n in things) if(!things[n].id_client_hold) unheld.push(things[n]);
    return unheld;
  }

  /** Adds an undo level if something has changed */
  save_undo() {

    // Make sure we have the last undo time
    if(!this._t_last_save_undo) this._t_last_save_undo = Date.now();

    // If it hasn't been long enough for an undo, don't bother
    if(Date.now()-this._t_last_save_undo < 1000) return;

    // First make sure we have a list
    if(!this._undos) this._undos = [];

    // Get the state string
    var s = JSON.stringify(this.get_state());

    // If this state is different from the last undo, add another undo and clear the redos
    if(s != this._undos[0]) {

      // Add the new undo at the beginning of the array and reset the redos
      this._undos.splice(0, 0, s);
      if(this._redos) this._redos.length = 0;

      // Impose the maximum undos
      this._undos.length = Math.min(this._undos.length, this.settings.undos);

      // Prevent another undo for awhile
      this._t_last_save_undo = Date.now();

      VGT.log('save_undo()', this._undos.length, '(zero redos)');
    }
  }

  /** Restores an undo */
  undo() {

    // When we do a redo, we set block_next_undo = false, so 
    // the noticed changed state doesn't trigger one / remove the other redos
    if(this.block_next_undo) {
      this.block_next_undo = false;
      return;
    }

    // First make sure we have a list
    if(!this._undos) this._undos = [];

    // poop out if we have none
    if(!this._undos.length) return

    // Make sure we have a redos list
    if(!this._redos) this._redos = [];

    // The usual state of affairs should be the 0'th undo matching the current state.

    // Save the current state as a redo and trim the list
    this._redos.splice(0,0,JSON.stringify(this.get_state()));
    this._redos.length = Math.min(this._redos.length, this.settings.undos);

    // Pop the first one and use the "top" one
    if(this._undos.length > 1) this._undos.splice(0,1)[0];

    // Set the state to the most recent undo
    this.set_state(JSON.parse(this._undos[0]));

    VGT.log('undo()', this._undos.length, 'undos, ', this._redos.length, 'redos');
  }

  /** Undoes an undo */
  redo() {

    // First make sure we have a redo list
    if(!this._redos || !this._redos.length) return;

    // Make sure we have an undo list
    if(!this._undos) this._undos = [];

    // Pop off the redo and stick it at the top of the undos
    this._undos.splice(0,0,this._redos.splice(0,1));

    // Restore the top of the undos to make them match
    this.set_state(JSON.parse(this._undos[0]));
    this.block_next_undo; // So the redo doesn't become an undo / reset the process.

    VGT.log('redo()', this._undos.length, 'undos, ', this._redos.length, 'redos');
  }

  /** Returns an object for the current state of pieces etc. */
  get_state() {

    // State object for holding all the information
    var state = {pieces: {}};

    // Save the pieces
    var p;
    for(var id in VGT.pieces.all) { p = VGT.pieces.all[id];

      // Save the configuration
      state.pieces[id] = {
        x: p.x.target,
        y: p.y.target,
        r: p.r.target,
        R: p.R.target,
        s: p.s.target,
        n: p.get_image_index(),
        h: p.is_hidden(),
        ts: p.team_select,
        z: p.get_z_value(),
      }

    } // End of loop over pieces

    return state;
  }

  /**
   * Sets the state according to the specified object.
   * @param {object} state 
   * @param {function} after function to call when done (optional); argument is the state
   */
  set_state(state, after) {

    // Let's let process_queues handle it
    //VGT.net.q_pieces_in = state.pieces;
    
    // Restore the piece information
    var c, p;

    // Get a z-sorted list
    var pieces = []; // To be filled

    // Make sure the incoming piece data includes the id and is in the list
    for(var id in state.pieces) {
      state.pieces[id].id_piece = id; 
      pieces.push(state.pieces[id]);
    }
    
    // Make sure it has a z-value (just a fix for older saves)
    for(var n in pieces) if(pieces[n].z == undefined) pieces[n].z = 0;
    sort_objects_by_key(pieces, 'z');

    // loop over the incoming pieces of the state
    for(var n in pieces) { 

      // Get the incoming piece data and the real piece
      c = pieces[n];
      p = VGT.pieces.all[pieces[n].id_piece];

      // If it's a valid piece
      if(p) {
        p.set_xyrs(c.x, c.y, c.r, c.s);
        p.set_R(c.R);
        p.set_image_index(c.n);
        p.show(c.h);
        p.select(c.ts);
        p.send_to_top();
      }
    } // End of loop over pieces
    
    if(after) after(state);
  }


  /** Saves the current setup. */
  save_state() {
    
    // Convert the current configuration into a string.
    var text = JSON.stringify(this.get_state()); // JSON.parse to undo

    // Get the filename.
    var filename = get_date_string() + ' ' + this.settings.name + '.txt';

    // Create a link element for downloading
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);

    // Click it (download the file).
    element.click();

    // Clean up.
    document.body.removeChild(element);
  }

  /** Loads the state from a file we supply. */
  load_state_from_file() {

    // Create a temporary input element
    var input = document.createElement('input');
    input.type = 'file';

    // Code to grab the content of the file.
    input.onchange = e => { 

      // getting a hold of the file reference
      var file = e.target.files[0]; 

      // setting up the reader
      var reader = new FileReader();
      reader.readAsText(file,'UTF-8');

      // here we tell the reader what to do when it's done reading...
      reader.onload = readerEvent => {

          // Get the result string
          var s = readerEvent.target.result; 

          // now update the pieces
          this.set_state(JSON.parse(s));
      }
    }

    // Run it
    input.click();

    // Clean up (apparently not necessary; these don't accumulate like the 'a' does above)
    // document.body.removeChild(input); 
  }

  /**
   * Loads a state from a server file (txt, identical to those files saved in game).
   * Since this relies on promises and will be delayed, you can also specify a function 
   * to call after things are loaded and the state is set.
   * 
   * @param {string} filename Path to file
   * @param {function} after Function to call after setting the state
   */
  load_state_from_server(filename, after) {

    // Get the data
    fetch(filename, {method: 'GET'})
      .then((response) => response.json())
      .then((state   ) => this.set_state(state, after))
  }

  /** Opens the game.settings.rules in a new tab */
  open_rules() {
    window.open(this.settings.rules);
  }





  
  ///////////////////////////////////// PIECE MANIPULATIONS

  // Returns {count:, worth: } of the supplied list or object of pieces
  count(things, send_chat) {
    var worths = {};
    var key;
    var count = 0;
    for(var k in things) {

      // We try to make a unique key for each type of prefix/suffix
      key = things[k].settings.worth_prefix + '|' + things[k].settings.worth_suffix;

      // Make sure we have an initial value
      if(worths[key] == undefined) worths[key] = [0, things[k].settings.worth_decimals];

      // Increment
      worths[key][0] += things[k].settings.worth;
      count          += 1;
    }

    // Remove all zeros
    for(var k in worths) if(worths[k][0]==0) delete worths[k];

    if(send_chat) {

      if(Object.keys(worths).length) {
        var message = '('+String(count)+' items, '
        var s;
        for(var k in worths) {
          s = k.split('|'); // prefix|suffix
          if(s.length < 2) s.append('');
          message = message + s[0]+worths[k][0].toFixed(worths[k][1])+s[1]+', '
        }
      }
      else var message = '('+String(count)+' items  '
      
      VGT.net.io.emit('chat', message.slice(0,message.length-2)+')');
    }

    return {count: count, worths: worths}
  }

  // Collect things into a tidy stack; 
  // things should be an array.
  collect(things, x, y, r, r_stack, dx, dy, center_on_top, supplied_order) {

    // Do nothing with nothing.
    if(Object.keys(things).length == 0) return

    // Get list of things sorted by z
    if(!supplied_order) var sorted = VGT.game.sort_by_z_target(things); 
    else                var sorted = things; 

    // Figure out the dx and dy for the whole stack
    if(dx == undefined) dx = things[0].settings.collect_dx;
    if(dy == undefined) dy = things[0].settings.collect_dy;

    // Loop over layers and stack at the mouse coordinates
    var p, n=0, v;
    for(var k in sorted) { p = sorted[k];
      
      if(center_on_top) v = rotate_vector([(n-sorted.length+1)*dx, (n-sorted.length+1)*dy], r_stack);
      else              v = rotate_vector([ n                 *dx,  n                 *dy], r_stack);

      // Set the location and then increment the offset integer.
      p.set_xyrs(x+v[0], y+v[1], r);
      n++;
    }

    return sorted;
  }

  // Drop into a disordered heap of the specified radius
  pile(things, x, y, radius) {
    if(x == undefined) x = 0;
    if(y == undefined) y = 0;

    // Loop over the supplied things
    var p, v;
    for(var k in things) { p = things[k];

      // If no radius is given, use the piece's
      if(!radius) radius = p.settings.pile_radius;

      // If the piece is in auto mode
      if(!radius) radius = Math.min(p.width, p.height)*p.s.target;  
      
      // Get the random coordinate
      v = get_random_location_disc(radius);

      // Set it
      p.set_xyrs(x+v.x,y+v.y,v.r);
    }
  }

  // Expand these into a grid
  expand(things, x, y, r, r_stack, sort) { VGT.log('expand()', things.length, x, y, r, sort);
    
    // If we're supposed to sort by z; this sends the request for z sorting,
    // but delayed by the server's response to actually do it.
    if(sort) var sorted = this.sort_z_by_id(things);

    // Get an object, indexed by layer with lists of things, sorted by z
    else var sorted = VGT.game.sort_by_z_value(things);

    // Get the row count from the first element
    var n = sorted.length-1;
    var Nx = sorted[n].settings.expand_Nx;
    var dx = sorted[n].settings.expand_dx;
    var dy = sorted[n].settings.expand_dy;
    if(!Nx) Nx = 10;
    if(!dx) dx = sorted[n].width*sorted[n].s.target;
    if(!dy) dy = sorted[n].height*sorted[n].s.target;

    // Assemble a 2d array, one element per row
    var row=0;
    var expanded = [];
    for(var n in sorted) {
      // Make sure we have a sub-array
      if(!expanded[row]) expanded.push([]);
      
      // Add the element
      expanded[row].push(sorted[n]);

      // Make sure we don't need to start a new row
      if(expanded[row].length >= Nx) row++; 
    }
    
    // Calculate the upper left corner of the grid
    //var x0 = -(expanded[0].length-1)*0.5*dx; // Not needed because we use the row width to center things
    var y0 = -(expanded.length   -1)*0.5*dy;
    
    // Start positioning things
    var v;
    for(var i in expanded) for(var j in expanded[i]) {
      v = rotate_vector([-(expanded[i].length-1)*0.5*dx+j*dx, y0+i*dy], r_stack);
      expanded[i][j].set_xyrs(x+v[0], y+v[1], r);
    }
      
  }

  // Resets coordinates
  reset() {for(var n in VGT.things.all) VGT.things.all[n].reset(); }

  /** Releases all things with the supplied client id. */
  client_release(id_client, force, do_not_update_q_out) { 
    
    // If we have a held list for this client id
    if(VGT.things.held[id_client] != undefined) {
      VGT.log('client_release()', id_client, VGT.things.held[id_client].length);

      // Remember the previously held pieces so they know what to do with the snap etc
      this._releasing = {...VGT.things.held[id_client]};
      
      // Loop over the list and reset the id_client_hold
      for(var id_thing in VGT.things.held[id_client]) VGT.things.held[id_client][id_thing].release(id_client, force, do_not_update_q_out);
      
      // Forget the previously held pieces
      delete this._releasing;

      // Delete the list
      delete VGT.things.held[id_client];
    }
  }

  // Shuffles the z-order of the supplied list of things
  shuffle_z(things) {

    // Make a copy for in-place shuffling
    var shuffled = [...things];
    shuffle_array(shuffled);

    // Send each of these pieces to the top; this also ensures that the list is ordered by z target
    for(var n in shuffled) shuffled[n].send_to_top();

    // Return the list ordered by z target
    return shuffled;
  }

  /**
   * Starts the shuffling animation; cards will later be collected to x,y,r,r_stack using collect()
   * Function f will be called after the last step.
   * @param {array} things  List of things to shuffle
   * @param {float} x       x-coordinate to eventually collect them to
   * @param {float} y       y-coordinate to eventually colelct them to
   * @param {float} r       rotation of the pieces when collected
   * @param {float} r_stack rotation of the stack when collected; undefined means match r
   * @param {float} center_on_top whether to center the stack by the top card
   * @param {function} f    (optional) function to call after shuffling
   */
  start_shuffle(things, x, y, r, r_stack, center_on_top, f) { VGT.log('start_shuffle()', things.length);
    if(r_stack == undefined) r_stack = r;  

    // Shuffle z; doing this here helps with the visual popping
    things = VGT.game.shuffle_z(things);

    // Send out the cards
    this.pile(things, x, y, 30); 

    // Process the q immediately so z doesn't arrive very soon.
    VGT.net.process_queues();

    // Start the finish shuffle (cancel any existing one)
    clearTimeout(this._timer_shuffling);
    this._timer_shuffling = setTimeout(this._finish_shuffle.bind(this), 500, things, x, y, r, r_stack, center_on_top, f);
  }

  // Called a bit after the shuffle animation; actually shuffles and collects cards at the specified coordinates
  _finish_shuffle(shuffling, x, y, r, r_stack, center_on_top, f) { VGT.log('finish_shuffle()', shuffling.length);

    // Re-send these to the top in case the server has sent an update in between
    for(var n in shuffling) shuffling[n].send_to_top();

    // Collect them
    this.collect(shuffling, x, y, r, r_stack, undefined, undefined, center_on_top, true)

    // Call the function
    if(f) f();
  }

  // Sets the image index for the supplied list or object of things
  set_image_indices(things, n) { for(var k in things) things[k].set_image_index(n); }

  /** Increments the selected images by the given amount (undefined = 1) */
  increment_image_indices(things, n) {
    for(var id_thing in things) things[id_thing].increment_image_index(n);
  }

  /** Decrements the selected images by the given amount (undefined = 1) */
  decrement_image_indices(things, n) {
    if(n==undefined) n=1;
    this.increment_image_indices(things, -n);
  }

  /** Randomizes the image indices for the list or object of things. */
  randomize_image_indices(things) { for(var n in things) things[n].randomize_image_index(); }

  /**
   * "Sneezes" the supplied list of things at random locations and rotations 
   * around the specified coordinates in a randomly populated
   * hex grid. Does not randomize z or the image indices. See also "scramble()"
   * 
   * @param {array} things list of things to sneeze out on the table
   * @param {float} x      x-coordinate to center the scramble on
   * @param {float} y      y-coordinate to center the scramble on
   * @param {int}   space  average lattice sites per piece (on hex grid) (default 1.5)
   * @param {float} scale  scale for spacing of hex grid (default 1)
   * @param {float} deviation disorder in position around the lattice site
   * @param {float} rotation scale of random rotation
   */
  sneeze(things, x, y, space, scale, deviation, rotation) {

    // Bonk out and handle defaults
    if(!things || things.length==0 || x==undefined || y==undefined) return;
    if(space == undefined) space = 1.5;
    if(scale == undefined) scale = 1;
    if(deviation == undefined) deviation = 0.25;
    if(rotation == undefined) rotation = 7;

    // Now find the basis vectors based on the biggest radius of the last piece
    var p_top = things[things.length-1];
    var D  = scale*p_top.s.target*Math.max(p_top.width, p_top.height);
    var ax = D;
    var ay = 0;
    var bx = ax*0.5;
    var by = ax*0.5*Math.sqrt(3.0);

    // Rotate the basis vectors by a random angle
    var r = 360*Math.random();
    var a = rotate_vector([ax, ay], r);
    var b = rotate_vector([bx, by], r);

    // Generate all the available hex grid indices, skipping (0) at x,y.
    var spots =[]; for(var n=1; n<things.length*space+1; n++) spots.push(n);
    
    // Set the piece coordinates on the hex grid, plus a little randomness
    for(var n in things) {
      var p = things[n];
      var d = hex_spiral(spots.splice(random_integer(0, spots.length-1),1)); // Lattice integers
      var v = get_random_location_disc(deviation*D); // Small deviation from lattice
      
      // Set the random location, orientation, and image
      p.set_xyrs(x + d.n*a[0] + d.m*b[0] + v.x, 
                  y + d.n*a[1] + d.m*b[1] + v.y, 
                  v.r * rotation);
    }
  }
  
  /**
   * Scramble the supplied things, like rolling dice: randomizes locations in a pattern determined by the 
   * last piece's diameter, minimizing overlap. 
   * 
   * @param {array} things list of things to randomize
   * @param {float} x      x-coordinate to center the scramble on
   * @param {float} y      y-coordinate to center the scramble on
   * @param {int}   space  average lattice sites per piece (on hex grid) (default 1.5)
   * @param {float} scale  scale for spacing of hex grid (default 1)
   * @param {float} deviation fractional disorder in position around each lattice site.
   */
  scramble(things, x, y, space, scale, deviation, do_not_randomize_image) {
    
    // Bonk out and handle defaults
    if(!things || things.length==0 || x==undefined || y==undefined) return;
    if(space == undefined) space = 1.5;
    if(scale == undefined) scale = 1.4;

    // Shuffle z, sneeze them out around the x, y coordinates, and randomize each image
    this.shuffle_z(things);
    this.sneeze(things, x, y, space, scale, deviation);
    if(!do_not_randomize_image) this.randomize_image_indices(things);
  }

  // Sets the z of the supplied list of things in order of their id (and sends them to the top)
  sort_z_by_id(things, descending) {
    
    // Make a copy for in-place sorting
    var sorted = [...things];
    sort_objects_by_key(sorted, 'id_thing', descending);
    for(var n in sorted) sorted[n].send_to_top();

    return sorted;
  }

  // Given a list of things returns a list sorted by layer then z-index.
  // This is based on the current z value, not the target
  sort_by_z_value(things, descending) { 

    // First sort by layers
    var sorted = {}, layer;
    for(var n in things) { 

      // Attach its z-value for easy sorting
      things[n]._z = things[n].get_z_value();

      // If we don't have a list for this layer yet, make an empty one
      layer = things[n].settings.layer;
      if(!sorted[layer]) sorted[layer] = []; 

      // Stick it in the sorted list.
      sorted[layer].push(things[n]);
    }

    // Now loop over the sorted layers, and sort each array
    for(var k in sorted) sort_objects_by_key(sorted[k], '_z', descending);

    // Now loop over the sorted layers and assemble the master list
    var layers = Object.keys(sorted);
    if(descending) layers.sort(function(a, b) { return b - a; })
    else           layers.sort(function(a, b) { return a - b; });

    // Get the final result
    var result = [];
    for(var n in layers) for(var i in sorted[layers[n]]) result.push(sorted[layers[n]][i]);

    return result;
  }

  /**
   * Given a list of things returns a list sorted by layer then TARGETED z value, which can be
   * different than the current value when waiting for the server to send the next z update. */ 
  sort_by_z_target(things, descending) { 

    // First sort by layers
    var sorted = {}, layer;
    for(var n in things) { 

      // Attach its z-value for easy sorting; this will lead to duplicate z-values
      if(things[n]._z_target == undefined) {
        VGT.log("WEIRD: No z-target on piece", things.id_piece);
        things[n]._z_target = things[n].get_z_value();
      } 

      // If we don't have a list for this layer yet, make an empty one
      layer = things[n].settings.layer;
      if(!sorted[layer]) sorted[layer] = []; 

      // Stick it in the sorted list.
      sorted[layer].push(things[n]);
    }

    // Now loop over the sorted layers, and sort each array
    for(var k in sorted) sort_objects_by_key(sorted[k], '_z_target', descending);

    // Now loop over the sorted layers and assemble the master list
    var layers = Object.keys(sorted);
    if(descending) layers.sort(function(a, b) { return b - a; })
    else           layers.sort(function(a, b) { return a - b; });

    // Get the final result
    var result = [];
    for(var n in layers) for(var i in sorted[layers[n]]) result.push(sorted[layers[n]][i]);

    return result;
  }

  // Sends all selected things to the top.
  send_selected_to_top(team) { 

    // If we have a selected list for this team
    if(VGT.things.selected[team] != undefined) {
      
      // Get the sorted objects
      var sorted = this.sort_by_z_value(Object.values(VGT.things.selected[team]));
      
      // Send them to the top, bottom first
      for(var k in sorted) sorted[k].send_to_top();
    }
  }


  // Sends all selected things to the bottom.
  send_selected_to_bottom(team) { 

    // If we have a selected list for this team
    if(VGT.things.selected[team]) {
      
      // Get the sorted objects
      var sorted = this.sort_by_z_value(Object.values(VGT.things.selected[team]), true);
      
      // Send them to the top, bottom first
      for(var k in sorted) sorted[k].send_to_bottom();
    }
  }


  /**
   * Sets up the drag for all selected things for this team
   * @param {int} team 
   */
  hold_selected(id_client, force, do_not_update_q_out) { VGT.log('VGT.game.hold_selected()', id_client, force);

    // First release everything I might be holding already; ideally this step is not required, but in case it is
    var held = VGT.things.held[VGT.clients.me.id_client];
    if(held) {
      log('WEIRD: we are already holding', Object.keys(held).length, 'objects when calling game.hold_selected().', held)
      for(var i in held) held[i].release(undefined, true, undefined, true);
    }

    // Loop over the selected things and hold whatever isn't already held by someone else.
    for(var k in VGT.things.selected[VGT.clients.all[id_client].team]) 
      VGT.things.selected[VGT.clients.all[id_client].team][k].hold(id_client, force, do_not_update_q_out);
  }

  select(things, team) { VGT.log('VGT.game.select()', things.length, team);
    
    // If no team, use our team
    if(team == undefined) team = VGT.clients.me.team;

    // Select everything
    for(var k in things) things[k].select(team);
  }

  // Returns the number of teams
  get_team_count() {return Object.keys(this.settings.teams).length;}

  /**
   * Unselect supplied things (list or object) for this team.
   * If things==undefined, all things are included. Otherwise, you can restrict this to a list of things.
   */
  unselect(things, team, do_not_update_q_out) { VGT.log('VGT.game.unselect()', team);

    // If no team, use our team
    if(team == undefined) team = this.get_my_team_index();

    // It should be faster to loop over things, check if they're selected by the supplied team, and unselect them,
    // Rather than looping over the team's list and checking if each is in the supplied list.
    if(things == undefined) things = VGT.things.selected[team];
    for(var k in things) if(things[k].team_select == team) things[k].unselect(do_not_update_q_out);

    // Loop over all the selected things and pop them.
    //for(var k in VGT.things.selected[team]) VGT.things.selected[team][k].unselect(); 
  }

  // Unselects everything
  unselect_all_teams(things, do_not_update_q_out) { for(var team=0; team<this.get_team_count(); team++) this.unselect(things, team, do_not_update_q_out); }

  /** Function called every quarter second to do housekeeping. */
  _housekeeping() {
    
    // Save an undo if we're not holding pieces (and if it's been awhile, which is handled by the function itself)
    if(VGT.things.held[VGT.net.id] == undefined) this.save_undo();

    // If Pixi has finally finished loading, we still haven't connected, 
    // and everything is loaded, connect to server
    if(VGT.pixi.ready && !VGT.net.ready && VGT.pixi.queue.length==0) VGT.net.connect_to_server();

    // If we're rolling dice, do the animation, just before telling everyone
    if(VGT.interaction._rolling) 
      var d;
      for(var n in VGT.interaction._rolling) {

        // Randomize the shown image
        VGT.interaction._rolling[n].randomize_image_index();

        // Randomize the location around the hand
        d = get_random_location_disc(Math.min(VGT.interaction._rolling[n].width, VGT.interaction._rolling[n].height));
        VGT.interaction._rolling[n].set_xyrs(VGT.interaction.xroll+d.x, VGT.interaction.yroll+d.y, d.r*4);
      }

    // Process net queues.
    VGT.net.process_queues();

    // Custom housekeeping
    this.after_housekeeping();

  } // End of housekeeping.

  // Function to overload, e.g., dealing cards.
  after_housekeeping() {}

} // End of Game
VGT.Game = _Game;