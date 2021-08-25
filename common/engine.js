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
   the changes are added to (or updated in) an outbound queue.

2. All incoming packets from the server to us are similarly queued into an inbound queue.

3. These queues are dealt with all at once every quarter second or so. 
   First the inbound queue is processed, then outbound is sent to the server.

4. The server adds all such updates to a master list, then relays each incoming queue packet to everyone.
   This includes returning it to the sender, to avoid lag-induced desync; the latest server state is sent to EVERYONE
   as it's updated.

5. Upon receiving updated pieces, clients will NOT update those pieces they are holding, because that's interferes with 
   their local reality (they have control!). The exception to this rule is if someone else says they're holding it.
   If two people grab the same piece, the server enforces that the first one holds it.
   There is a guaranteed update sent when pieces are released, so it cannot get too out of sync.

6. Clients only update each piece attribute if either the sender is NOT us, 
   or if it IS us AND we haven't sent a more recent update. (Each outbound packet also has a packet index (nq) that increments.)

7. On connection, the server sends all the latest information in one big packet, like a big queue update.

IDEAS 

ISSUES

OTHER PARADIGMS & APPROACHES
 * Each client keeps track of what the server has, and loops over everything to send a delta.

NET OPTIMIZATIONS

CURRENTLY

*/

// Object that holds all the relevant namespace for a game designer.
var VGT = {};

// Object for interacting with the html page.
class _Html {
  
  constructor() {
    
    // Handles
    this.gameboard = document.getElementById('gameboard');
    this.loader    = document.getElementById('loader');
    this.volume    = document.getElementById('volume');
    this.controls  = document.getElementById('controls');
    this.messages  = document.getElementById('messages');
    this.setups    = document.getElementById('setups');
  
  } // End of constructor

  // Quick functions
  hide_controls()    {this.controls.hidden = true;}
  show_controls()    {this.controls.hidden = false;}
  toggle_controls()  {this.controls.hidden = !this.controls.hidden;}
  controls_visible() {return !this.controls.hidden}
  controls_hidden()  {return  this.controls.hidden}

  /**
   * Updates the chat box with the supplied name and message.
   */
  chat(name, message) {
    // messages div object
    var m = VGT.html.messages;

    // append a <li> object to it
    var li = document.createElement("li");
    li.insertAdjacentHTML('beforeend', '<b>' + name + ':</b> ' + message)
    m.append(li);

    // scroll to the bottom of the history
    m.scrollTop = m.scrollHeight;
  }

  // Updates the client information in the GUI
  rebuild_client_table() {
    log('VGT.html.rebuild_client_table()');

    // Clear out the clients table
    var clients_table = document.getElementById('clients');
    clients_table.innerHTML = '';

    // Loop over the supplied clients
    for(var id in VGT.net.clients) {
      var c = VGT.net.clients[id];
      log('  ', c.id, c.name, c.team);

      // Get the "safe" name & team
      var name = html_encode(c.name);
      var team = html_encode(c.team);
      if(id == VGT.net.id) {
        save_cookie('name', name);
        save_cookie('team', team);
      }

      // Create the row for this client, as long as it's not me.
      if(id != VGT.net.id) var row = clients_table.insertRow(-1);
      else             var row = clients_table.insertRow(0);
      var cell_name = row.insertCell(0);
      var cell_team = row.insertCell(1);

      // If it's VGT.net.me, the name should be editable, otherwise, not
      if(id == VGT.net.id) cell_name.innerHTML = '<input id="name" onchange="VGT.interaction.onchange_name(event)" value="'+name+'" />';
      else                 cell_name.innerHTML = '<input class="othername" readonly value="'+name+'" />';

      // Now create the team selector
      var s = document.createElement("select");
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
      if(0.2126*rgb[0] + 0.7152*rgb[1] + 0.0722*rgb[2] > 0.7) s.style.color='black';
      else                                                    s.style.color='white'; // = 'color: white;';
      
      // Finally, append it to the team cell
      cell_team.appendChild(s);
      
    } // End of loop over clients

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
    this.q_pieces_out   = {}; 
    this.q_hands_out    = {}; 
    this.q_z_out        = []; // Ordered list of requested z-operations

    // Queue of inbound information for the next housekeeping.
    this.q_pieces_in    = {}; 
    this.q_hands_in     = {};
    this.q_z_in         = []; // Ordered list of z-operations to implement
    
    // Last sent q packet number
    this.nq = 0;  

    // Defines all the functions for what to do with incoming packets.
    this.setup_listeners();

  } // End of constructor()

  /** Deals with the incoming AND outbound packets. */
  process_queues() {
    if(!this.ready) return;
    var c, p, n, l;
    
    /////////////////////////////////////////
    // INBOUND

    // object, indexed by layer, of lists of piece datas having z-order to set
    var zs = {}; 

    // Loop over the pieces in the q to handle 'simple' quantities
    for(var id_piece in this.q_pieces_in) { 
      c = this.q_pieces_in[id_piece]; // incoming changes for this thing
      p = VGT.pieces.all[id_piece];   // the actual piece object

      // If it's a valid piece
      if(p) {
        
        // Put it in the z-order
        if(c.z != undefined && c.l != undefined) { 

          // Give easy access to the piece object
          c.piece = p; 
          c.id = id_piece;
          
          // Make sure we have a list for this layer
          if(!zs[c.l]) zs[c.l] = [];

          // Add to the list for this layer
          zs[c.l].push(c); 
        } 

        // We do not want to let the server change anything about the pieces we're holding, 
        // UNLESS it's overriding our hold status, for example, when someone else grabbed it first. 
        // As such, we should update the hold status first!
        //
        // If two clients grab the same piece at nearly the same time, 
        //   - Their packets (sender net ids ih.i = 1 and 2, say) will reach the server at nearly the same time. 
        //   - The server will update the hold status of the piece based on the first-arriving packet (ih.i=ih=1, say).
        //     The second-arriving packet (ih.i=ih=2) should be corrected (ih.i=2, ih.i=1 or ih.i=ih=undefined) 
        //     to have the first person holding it (or no information) before re-broadcast
        //       During this round-trip time, the second person will be able to move the piece around until the first packet arrives.
        //         This packet will have ih=ih.i=1 the holder should be switched to the first player.
        //   - The second packet, with the corrected (or absent) change of who is holding will arrive next.
        //         This packet will have ih=1 or undefined and ih.i=2 or undefined
        //
        
        // All attributes have 
        //   - their value, e.g. 'ih' for the id of the holder
        //   - the id of the sender, e.g. 'ih.i' for the holder sender
        //   - the sender's incrementing packet index, e.g. 'ih.n'

        // Before deciding what to do with the other attributes, we need to
        // update the holder id if necessary. The server's job is to ensure that it relays the correct holder always.
        // ALSO we should ensure that, if it's either someone else's packet, or it's ours and we 
        // have not since queued a newer packet updating the hold status
        if(c['ih'] != undefined && (c['ih.i'] != VGT.net.id || c['ih.n'] >= p.last_nqs['ih'])) {
          p.hold(c.ih, true, true); // client_id, force, do_not_update_q_out)
        } 

        // Now update the different attributes only if we're not holding it (our hold supercedes everything)
        if(p.id_client_hold != VGT.net.id) {

          // Only update the attribute if the updater is NOT us, or it IS us AND there is an nq AND we haven't sent a more recent update          immediate, do_not_update_q_out, do_not_reset_R
          if(c['x']  != undefined && (c['x.i']  != VGT.net.id || c['x.n']  >= p.last_nqs['x'] )) p.set_xyrs(c.x, undefined, undefined, undefined, false, true, true);
          if(c['y']  != undefined && (c['y.i']  != VGT.net.id || c['y.n']  >= p.last_nqs['y'] )) p.set_xyrs(undefined, c.y, undefined, undefined, false, true, true);
          if(c['r']  != undefined && (c['r.i']  != VGT.net.id || c['r.n']  >= p.last_nqs['r'] )) p.set_xyrs(undefined, undefined, c.r, undefined, false, true, true);
          if(c['s']  != undefined && (c['s.i']  != VGT.net.id || c['s.n']  >= p.last_nqs['s'] )) p.set_xyrs(undefined, undefined, undefined, c.s, false, true, true);
          if(c['R']  != undefined && (c['R.i']  != VGT.net.id || c['R.n']  >= p.last_nqs['R'] )) p.set_R   (c.R,                                  false, true);
          if(c['n']  != undefined && (c['n.i']  != VGT.net.id || c['n.n']  >= p.last_nqs['n'] )) p.set_texture_index(c.n, true);
          if(c['ts'] != undefined && (c['ts.i'] != VGT.net.id || c['ts.n'] >= p.last_nqs['ts'])) p.select(c.ts, true);

        } // End of we are not holding this.
      
      } // End of valid piece
    
    }; // End of loop over q_pieces_in
    
    // Clear out the piece queue
    this.q_pieces_in = {}; 
  
    // Loop over the layers, sorting by the desired z, and then sending to that z
    for(l in zs) { if(zs[l].length == 0) continue;

      // Sort by z
      sort_objects_by_key(zs[l], 'z');
      
      // Now insert them from bottom to top.
      for(n in zs[l]) zs[l][n].piece._set_z(zs[l][n].z);
    }

    // Loop over the hands in the input queue
    for(var id_hand in this.q_hands_in) {
      c = this.q_hands_in[id_hand]; // Incoming changes
      p = VGT.hands.all[id_hand];       // Actual hand

      // Visually update the hand's position (x,y,r,s), texture (n), and mousedown table coordinates (vd) if it's not our hand
      if(p && p.id_client != VGT.net.id){
      
        // Undefined quantities do nothing to these functions
        p        .set_xyrs(c.x, c.y, c.r, c.s,       false, true);
        p.polygon.set_xyrs(c.x, c.y, c.r, undefined, false, true); 
        p.set_texture_index(c.n, true);
        
        // vd should be null or [x,y] for the down click coordinates
        if(c.vd != undefined) p.vd = c.vd;
      }
    } // End of loop over hands
    
    // Clear out the hands queue.
    this.q_hands_in = {}; // End of loop over q_hands_in

    
    


    /////////////////////////////////////////////////
    // OUTBOUND

    // Send the outbound information
    if(Object.keys(this.q_pieces_out).length 
    || Object.keys(this.q_hands_out ).length) {

      // Send the outbound information and clear it.
      this.nq++;
      log(    'NETS_q_'+String(VGT.net.id), this.nq, this.q_pieces_out, this.q_hands_out);
      this.io.emit('q', [this.nq, this.q_pieces_out, this.q_hands_out]);
      this.q_pieces_out = {};
      this.q_hands_out  = {};
    }

  } // End of process_queues()

  // Processes the inbound and outbound z queues
  process_q_z_out() {
    if(this.q_z_out.length) {
      this.io.emit('z', this.q_z_out);
      this.q_z_out.length = 0;
    }
  }

  // Transfers information from q_source to q_target, with id_client
  transfer_to_q_in(q_source, q_target, id_client, nq) { //log('transfer_to_q_in', q_source, q_target, id_client, nq)

    // Loop over pieces in source queue
    for(var id in q_source) {
          
      // Make sure the target has a place for the data
      if(!q_target[id]) q_target[id] = {}
        
      // Update each attribute
      for(var k in q_source[id]) q_target[id][k] = q_source[id][k]; 

      // Keep track of who is requesting the change and their q packet number
      q_target[id]['id_client_sender'] = id_client;
      q_target[id]['nq']               = nq;
        
    } // End of loop over things in q_pieces
  }

  // Server relayed a z command [id,z,id,z,id,z,...]
  on_z(data) { if(!this.ready) return; log('NETR_z', data);

    // Set the z locally
    for(var n=0; n<data.length; n+=2) VGT.pieces.all[data[n]]._set_z(data[n+1]);
  }

  /** We receive a queue of piece information from the server. */
  on_q(data) { if(!this.ready) return; log('NETR_q_'+String(data[0]), data[1], data);
  
    // Unpack
    var id_client = data[0];
    var nq        = data[1];
    var q_pieces  = data[2];
    var q_hands   = data[3];  

    // Update the q's
    this.transfer_to_q_in(q_pieces, this.q_pieces_in, id_client, nq);
    this.transfer_to_q_in(q_hands,  this.q_hands_in,  id_client, nq);
  
  } // end of on_q

  /** First thing to come back after 'hallo' is the full game state. */
  on_state(data) { if(!this.ready) return; log('NETR_state', data);
      
    // Get our client id and the server state
    var id           = data[0];
    var server_state = data[1];
    
    // If there are no pieces on the server, send all of the layer and z data
    if(Object.keys(data[1].pieces).length != VGT.pieces.all.length) {
      log('  NETR_state: Mismatched number of pieces; sending layer and z info...');
      for(var n in VGT.pieces.all) 
        VGT.pieces.all[n].update_q_out('z').update_q_out('l');
    }

    // Store all the info we need to keep locally
    this.clients = server_state.clients;

    // The server assigned VGT.net.me a unique id
    this.id = parseInt(id);

    // Send client information to the gui (rebuilds the HTML), and the clients object
    VGT.clients.rebuild();

    // Transfer / initialize the input queue, then process it.
    this.q_pieces_in = server_state['pieces'];
    this.q_hands_in  = server_state['hands'];
    this.process_queues();

    // Now show controls
    VGT.html.loader.style.visibility  = 'hidden';

    // Say hello
    VGT.html.chat('Server', 'Welcome, '+ VGT.net.clients[VGT.net.id].name + '!')
  
  } // End of on_state

  /** Someone sends the client table data. */
  on_clients(data) { if(!VGT.net.ready) return; log('NETR_clients', data);

    // Update the state
    this.clients = data;

    // Rebuild gui and clients list
    VGT.clients.rebuild();

  } // End of on_clients

  /** Server boots you. */
  on_yabooted() {
    log('NETR_yabooted');
    document.body.innerHTML = 'Booted. Reload page to rejoin.'
    document.body.style.color = 'white';
  } // End of on_yabooted

  /** Someone plays a sync'd sound */
  on_say(data) { if(!VGT.net.ready) return;
    log('NETR_say', data);

    // Say it
    //clients[data[0]].say(data[1], data[2], data[3]);
  } // End of on_say

  /** Someone sends a chat. */
  on_chat(data) {if(!VGT.net.ready) return;
      
    var id = data[0];
    var message = data[1];
    log('NETR_chat', id, message);

    // Safe-ify the name
    message = html_encode(message);
    
    // Get the name
    if(id == 0) var name = 'Server'
    else        var name = this.clients[id].name
    
    // Update the interface
    VGT.html.chat(name, message);
  
  } // End of on_chat

  /** Define what server messages to expect, and how to handle them. */
  setup_listeners() {
  
    this.io.on('z',        this.on_z       .bind(this));
    this.io.on('q',        this.on_q       .bind(this));
    this.io.on('state',    this.on_state   .bind(this));
    this.io.on('clients',  this.on_clients .bind(this));
    this.io.on('yabooted', this.on_yabooted.bind(this));
    this.io.on('say',      this.on_say     .bind(this)); 
    this.io.on('chat',     this.on_chat    .bind(this));
  
  } // End of setup_listeners()

  /**
   * Connect to the server (don't do this until Pixi is ready)
   */
  connect_to_server() {
    log('connect_to_server()', this);
  
    // Get name to send to server with hallo.
    var name = load_cookie('name'); 
    var team = parseInt(load_cookie('team'));
    if(isNaN(team)) team = 0;

    // Ask for the game state.
    log(    'NETS_hallo', [name, team]);
    this.io.emit('hallo', [name, team]);
  
    // Ready to receive packets now!
    VGT.net.ready = true; 
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
      autoResize: true, 
      resolution: devicePixelRatio, 
      antialias: true, 
      transparent: false,
    });

    // Add the canvas that Pixi automatically created for you to the HTML document
    VGT.html.gameboard.appendChild(this.app.view);

    // Aliases
    this.loader      = PIXI.Loader.shared,
    this.resources   = PIXI.Loader.shared.resources,
    this.stage       = this.app.stage;
    this.renderer    = this.app.renderer;

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
  
    // Assemble the full image path list
    image_paths.full = [];
    image_paths.root = finish_directory_path(image_paths.root); // Adds the '/' "smartly".
    for(var n=0; n<image_paths.list.length; n++) image_paths.full.push(image_paths.root + image_paths.list[n]);

    // Send these paths to the loader and tell it what to do when complete.
    this.loader.add(image_paths.full).load(this.loader_oncomplete.bind(this)); 
  
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
    log('   _add_thing()', thing.id_thing, 'to layer', thing.settings.layer);

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
    log('loader_oncomplete()', e);

    // Now that we have all the resources, dump the thing queue into pixi.
    while(this.queue.length) this._add_thing(this.queue.shift())
    
    // Let the world know pixi is ready.
    this.ready = true;

    // Resize the window, which sets up the table
    VGT.interaction.onresize_window();

    // Start the game loop
    log('Starting game loop...');
    VGT.pixi.app.ticker.add(delta => VGT.pixi.game_loop(delta)); 
    
    // Hide the loader so users can actually interact with the game
    VGT.html.loader.hidden = true;
  }

  /**
   * Called whenever the image loader makes some progress.
   * @param {*} loader   // loader instance
   * @param {*} resource // resource that was just loaded
   */
  loader_onprogress(loader, resource) {
    log('progress: loaded', resource.url, loader.progress, '%');

      // Update the loader progress in the html
      VGT.html.loader.innerHTML = '<h1>Loaded: ' + loader.progress.toFixed(0) + '%</h1><br>' + resource.url;
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
    VGT.tabletop.animate_xyrs(delta);
    
  } // End of game_loop

} // End of MyPixi



// A quantity that is animated
class _Animated {

  default_settings = {
    t_transition   : 200, // Time to transition coordinates at full speed
    t_acceleration : 100, // Time to get to full speed   
    damping        : 0.03, // Velocity damping coefficient
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
    
    // Use the current location and target location to determine
    // the target velocity. Target velocity should be proportional to the distance.
    // We want it to arrive in t_transition / (16.7 ms) frames
    var a = (delta*16.7)/this.settings.t_transition; // inverse number of transition frames at max velocity 
    var velocity_target = a*(this.target - this.value);
    
    // Adjust the velocity as per the acceleration
    var b = (delta*16.7)/this.settings.t_acceleration; // inverse number of frames to get to max velocity
    var acceleration = b*(velocity_target - this.velocity);
    
    // If we're slowing down, do it FASTER to avoid overshoot
    //if(Math.sign(acceleration) != Math.sign(this.velocity)) acceleration = acceleration*2;

    // Increment the velocity
    this.velocity += acceleration-this.velocity*this.settings.damping;
    this.value    += this.velocity;

    return this.velocity;
  }
}





// Tabletop for simplifying pan and zoom (basically a fancy container)
class _Tabletop {

  constructor() {

    this.settings = {
      pan_step: 0.2, // Fraction of width or height when panning 1 step
      r_step:    45, // Degrees for table rotation steps
      s_step:   1.2, // Fraction for each zoom step.
      s_max:    2.5, // Largest zoom-in level
      s_min:    0.25, // Max zoom-out
    }

    // Create the container to hold all the layers.
    this.container = new PIXI.Container();
    VGT.pixi.stage.addChild(this.container);
    
    // Targets equal actual, with zero velocity
    this.x = new _Animated(0);
    this.y = new _Animated(0);
    this.r = new _Animated(0);
    this.s = new _Animated(1); 
    this.container.rotation = this.r.value*0.01745329251; // to radians
    this.container.scale.y  = this.container.scale.x = this.s.value;
    this.vx = this.vy = this.vr = this.vs = 0;

    // center the container within the window
    this.container.x = 0.5*window.innerWidth;  
    this.container.y = 0.5*window.innerHeight;

    this.LAYER_HANDS      = -1; // Constant for denoting the hands layer. Normal layers are positive integers.
    this.LAYER_SELECT     = -2; // Layer just below the hands for selection rectangles
    this.LAYER_NAMEPLATES = -3; // Layer just below selection rectangles for nameplates.
    this.layers           = []; // List of containers for each layer
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
    var v = rotate_vector(
      [x1/this.container.scale.x,
       y1/this.container.scale.y],
         -r_deg);
    return {x:v[0], y:v[1]}
  }

  /**
   * Updates the actual tabletop location / geometry via the error decay animation, 
   * and should be called once per frame.
   */
   animate_xyrs(delta) { if(!delta) delta = 1;
    
    // Update the internal quantities
    this.x.animate(delta);
    this.y.animate(delta);
    this.r.animate(delta);
    var vs = this.s.animate(delta); // vs used for scaling below

    // Set the actual position, rotation, and scale
    this.container.pivot.x  = -this.x.value;
    this.container.pivot.y  = -this.y.value;
    this.container.rotation =  this.r.value*0.01745329251; // to radians
    this.container.scale.x  =  this.s.value;
    this.container.scale.y  =  this.s.value;

    // Update the mouse position
    if(Math.abs(this.x.value-this.x.target) > 0.1/this.s.value
    || Math.abs(this.y.value-this.y.target) > 0.1/this.s.value
    || Math.abs(this.r.value-this.r.target) > 0.001/this.s.value
    || Math.abs(this.s.value-this.s.target) > 0.001/this.s.value) 
      VGT.interaction.onpointermove(VGT.interaction.last_pointermove_e);

    // Set the hand scale
    VGT.hands.set_scale(1.0/this.s.value);

    // Redraw selection graphics if the scale is still changing (gets heavy with lots of selection; why scale?)
    /*if(Math.abs(vs) > 1e-6)
      for(var t in VGT.things.selected) 
        for(var i in VGT.things.selected[t])
          VGT.things.selected[t][i].draw_select_graphics(t); */
  }

  /**
   * Returns an object with x, y, r, and s.
   */
  get_xyrs() {return {x:this.x.value, y:this.y.value, r:this.r.value, s:this.s.value}}

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
  }
  
  // Panning the view
  pan_up() { 
    var dr = this.settings.pan_step*window.innerHeight/this.s.value;
    var dx = dr*Math.sin(this.r.value);
    var dy = dr*Math.cos(this.r.value);
    this.set_xyrs(
      -this.container.pivot.x + dx, 
      -this.container.pivot.y + dy,
      undefined, undefined);
  }
  pan_down() { 
    var dr = this.settings.pan_step*window.innerHeight/this.s.value;
    var dx = dr*Math.sin(this.r.value);
    var dy = dr*Math.cos(this.r.value);
    this.set_xyrs(
      -this.container.pivot.x - dx, 
      -this.container.pivot.y - dy,
      undefined, undefined);
  }
  pan_left() { 
    var dr = this.settings.pan_step*window.innerHeight/this.s.value;
    var dx =  dr*Math.cos(this.r.value);
    var dy = -dr*Math.sin(this.r.value);
    this.set_xyrs(
      -this.container.pivot.x + dx, 
      -this.container.pivot.y + dy,
      undefined, undefined);
  }
  pan_right() { 
    var dr = this.settings.pan_step*window.innerHeight/this.s.value;
    var dx =  dr*Math.cos(this.r.value);
    var dy = -dr*Math.sin(this.r.value);
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


  zoom(factor) {

    // Keep it within bounds
    if(this.s.target*factor > this.settings.s_max
    || this.s.target*factor < this.settings.s_min) return;
    
    // Set the target zoom
    this.set_xyrs(
      undefined, undefined, undefined,
      this.s.target * factor);
  }

  zoom_in()  {this.zoom(this.settings.s_step);}
  zoom_out() {this.zoom(1.0/this.settings.s_step);}
} // End of _Tabletop





////////////////////////
// Interactions
////////////////////////
// INTERACTION MANAGER
class _Interaction {
  
  constructor() {
    
    // Which mouse button is down
    this.button = -1;

    // Shortcuts
    this.actions = {
      pan_left  : VGT.tabletop.pan_left.bind(VGT.tabletop),
      pan_right : VGT.tabletop.pan_right.bind(VGT.tabletop),
      pan_up    : VGT.tabletop.pan_up.bind(VGT.tabletop),
      pan_down  : VGT.tabletop.pan_down.bind(VGT.tabletop),
      
      rotate_left  : VGT.tabletop.rotate_left.bind(VGT.tabletop),
      rotate_right : VGT.tabletop.rotate_right.bind(VGT.tabletop),
      
      zoom_in  : VGT.tabletop.zoom_in.bind(VGT.tabletop),
      zoom_out : VGT.tabletop.zoom_out.bind(VGT.tabletop),

      rotate_selected_left      : VGT.tabletop.rotate_selected_left.bind(VGT.tabletop),
      rotate_selected_right     : VGT.tabletop.rotate_selected_right.bind(VGT.tabletop),
      rotate_selected_to_hand   : VGT.tabletop.rotate_selected_to_hand.bind(VGT.tabletop),
      rotate_selected_to_table  : VGT.tabletop.rotate_selected_to_table.bind(VGT.tabletop),

      collect_selected_to_mouse : this.collect_selected_to_mouse.bind(this),
      expand_selected_to_mouse  : this.expand_selected_to_mouse.bind(this),
      start_shuffle                   : this.start_shuffle.bind(this),

      start_roll                : this.start_roll.bind(this),
      roll                      : this.roll.bind(this),
    }

    // Dictionary of functions for each key
    this.key_functions = {

      // Pan view
      KeyADown:       this.actions.pan_left,
      ArrowLeftDown:  this.actions.pan_left,
      Numpad4Down:    this.actions.pan_left,
      
      KeyDDown:       this.actions.pan_right,
      ArrowRightDown: this.actions.pan_right,
      Numpad6Down:    this.actions.pan_right,
      
      KeyWDown:       this.actions.pan_up,
      ArrowUpDown:    this.actions.pan_up,
      Numpad8Down:    this.actions.pan_up,

      KeySDown:       this.actions.pan_down,
      ArrowDownDown:  this.actions.pan_down,
      Numpad5Down:    this.actions.pan_down,
      Numpad2Down:    this.actions.pan_down,

      // Rotate view
      ShiftKeyQDown:      this.actions.rotate_left,
      KeyQDown:           this.actions.rotate_left,
      ShiftNumpad7Down:   this.actions.rotate_left,
      Numpad7Down:        this.actions.rotate_left,

      ShiftKeyEDown:      this.actions.rotate_right,
      KeyEDown:           this.actions.rotate_right,
      ShiftNumpad9Down:   this.actions.rotate_right,
      Numpad9Down:        this.actions.rotate_right,

      // Rotate selected pieces
      ShiftKeyADown:      this.actions.rotate_selected_left,
      ShiftArrowLeftDown: this.actions.rotate_selected_left,
      ShiftNumpad4Down:   this.actions.rotate_selected_left,

      ShiftKeyWDown:      this.actions.rotate_selected_to_table,
      ShiftArrowUpDown:   this.actions.rotate_selected_to_table,
      ShiftNumpad8Down:   this.actions.rotate_selected_to_table,
      
      ShiftKeyDDown:      this.actions.rotate_selected_right,
      ShiftArrowRightDown:this.actions.rotate_selected_right,
      ShiftNumpad6Down:   this.actions.rotate_selected_right,
      
      ShiftKeySDown:      this.actions.rotate_selected_to_hand,
      ShiftArrowDownDown: this.actions.rotate_selected_to_hand,
      ShiftNumpad5Down:   this.actions.rotate_selected_to_hand,

      // Zoom
      EqualDown:          this.actions.zoom_in,
      NumpadAddDown:      this.actions.zoom_in,
      MinusDown:          this.actions.zoom_out,
      NumpadSubtractDown: this.actions.zoom_out,

      // Collect, expand, shuffle
      KeyCDown:      this.actions.collect_selected_to_mouse,
      ShiftKeyCDown: this.actions.collect_selected_to_mouse,
      KeyXDown:      this.actions.expand_selected_to_mouse,
      ShiftKeyXDown: this.actions.expand_selected_to_mouse,
      KeyZDown:      this.actions.start_shuffle,
      ShiftKeyZDown: this.actions.start_shuffle,
      KeyRDown:      this.actions.start_roll,
      KeyRUp:        this.actions.roll,

      // Cycle images
      SpaceDown: this.increment_selected_textures,
    }

    // Event listeners
    document.addEventListener('contextmenu', e => {e.preventDefault();}); 
    window  .addEventListener('resize',  this.onresize_window);
    window  .addEventListener('keydown', this.onkey.bind(this), true);
    window  .addEventListener('keyup',   this.onkey.bind(this), true);

    // Pointer interactions
    // Using the surface and objects with the built-in hit test is rough, because it
    // does it for every mouse move, etc. Also, I can't seem to get the button number
    // this way in PixiJS 6.
    //VGT.pixi.surface.interactive = true;
    //VGT.pixi.surface.on('pointerdown', this.surface_pointerdown);
    VGT.pixi.app.view.onpointerdown = this.onpointerdown.bind(this);
    VGT.pixi.app.view.onpointermove = this.onpointermove.bind(this);
    VGT.pixi.app.view.onpointerup   = this.onpointerup  .bind(this);
    VGT.pixi.app.view.onpointerout  = this.onpointerup  .bind(this);
    VGT.pixi.app.view.onwheel       = this.onwheel      .bind(this);
  }

  increment_selected_textures(e) {
    log('VGT.interaction.increment_selected_textures()', e);

    // Loop over the selected items
    for(var id_thing in VGT.things.selected[VGT.clients.me.team]) 
      VGT.things.selected[VGT.clients.me.team][id_thing].increment_texture();
  }

  /**
   * Find the topmost thing at the specified tabletop location x,y, or return null
   * The thing must be within the non-special layers.
   * @param {number} x // tabletop x-coordinate
   * @param {number} y // tabletop y-coordinate
   * @returns 
   */
  find_thing_at(x,y) {

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
       
        // Get the scaled bounds and test
        if(container.thing.contains(x,y)) return container.thing;
      
      } // End of things in layer loop

    } // End of all layers loop
    return null;
  }

  // Starts the shuffle animation
  start_shuffle(e) {

    // Get the list of things we're shuffling
    this.shuffling = Object.values(VGT.things.selected[VGT.clients.me.team]);

    // Send out the cards
    VGT.things.sneeze_things(this.shuffling, this.xm_tabletop, this.ym_tabletop, 1, 0.7); 

    // Has ugly "pop" when shuffled at the end (too much overlap)
    /*var v, p;
    for(var n in this.shuffling) {
      p = this.shuffling[n];
      v = get_random_location_disc(Math.max(p.width, p.height));
      p.set_xyrs(this.xm_tabletop+v.x, this.ym_tabletop+v.y, v.r);
    }*/

    // Start the finish shuffle (cancel any existing one)
    clearTimeout(this.timer_shuffling);
    this.timer_shuffling = setTimeout(this.finish_shuffle, 500, e, this.xm_tabletop, this.ym_tabletop, true);
  }

  // Called a bit after the shuffle animation; actually shuffles and collects cards at the specified coordinates
  finish_shuffle(e, x, y, center_on_top) {

    // team index
    var team = VGT.clients.me.team; 

    // Last mouse move tabletop coordinates
    var r = VGT.clients.me.hand.r.value;       

    // Get the unsorted pieces list
    var pieces = Object.values(VGT.things.selected[team]);

    // Shuffle z
    var shuffled = VGT.things.shuffle_z(pieces);

    // If we're not holding shift, collect them too
    if(!e.shiftKey) VGT.things.collect(shuffled, x, y, r, r, undefined, undefined, center_on_top, true)
  }

  // Draws the pieces to the hand and starts the animation
  start_roll(e) { log('start_roll()');

    // Ignore subsequent keys
    if(this.rolling) return;

    // Collect to the starting mouse position, with offset (set to true to remove offset)
    this.collect_selected_to_mouse(e,false);
    this.xroll = this.xm_tabletop;
    this.yroll = this.ym_tabletop;

    // Let us know that we're rolling
    this.rolling = {...VGT.things.selected[VGT.clients.me.team]};

  }

  // Throws the held pieces out
  roll(e) {

    // If rolling
    if(this.rolling) {

      // Distribute them around the mouse
      VGT.things.scramble_things(Object.values(this.rolling), this.xm_tabletop, this.ym_tabletop);

      // Not rolling
      this.rolling.length = 0;
      this.rolling = false;
    }
  }

  // Sends selected pieces to a neat stack below the mouse
  collect_selected_to_mouse(e, no_offsets) {
    
    // team index
    var team = VGT.clients.me.team; 
    
    // Last mouse move tabletop coordinates
    var x = this.xm_tabletop;       
    var y = this.ym_tabletop;
    var r = VGT.clients.me.hand.r.value;       

    // Get the unsorted pieces list
    var pieces = Object.values(VGT.things.selected[team]);

    // Do the collection
    if(e.shiftKey || no_offsets) VGT.things.collect(pieces, x, y, r, r, 0,         0,         true);
    else                         VGT.things.collect(pieces, x, y, r, r, undefined, undefined, true);
  }

  // Expands the selected pieces in a grid below the mouse
  expand_selected_to_mouse(e) {

    // team index
    var team = VGT.clients.me.team; 
    
    // Last mouse move tabletop coordinates
    var x = this.xm_tabletop;       
    var y = this.ym_tabletop;       
    var r = VGT.clients.me.hand.r.value;

    // Get the unsorted pieces list
    var pieces = Object.values(VGT.things.selected[team]);

    // Do the collection
    VGT.things.expand(pieces, x, y, r, r, e.shiftKey);
  }

  // Pointer touches the underlying surface.
  onpointerdown(e) {
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

    // Holding, so close fist
    var hand=null;
    if(VGT.clients && VGT.clients.me && VGT.clients.me.hand) { hand = VGT.clients.me.hand; hand.close(); }

    // Find the top thing under the pointer
    log('onpointerdown()', [e.clientX, e.clientY], '->', v, e.button, this.tabletop_xd, this.tabletop_yd);

    // Find a thing under the pointer if there is one.
    var thing = this.find_thing_at(v.x,v.y);

    // If it's not null, handle this
    if(thing != null) {
      
      // Get the coordinates on the thing
      var a = thing.xy_tabletop_to_local(v.x, v.y); console.log('     on piece:', a);

      // The piece we click is the snap leader
      thing.is_snap_leader = true;

      // If we're not holding shift and it's not already a thing we've selected, 
      // unselect everything.
      if(!e.shiftKey && thing.team_select != VGT.clients.me.team) VGT.things.unselect_all(VGT.clients.me.team);
      
      // If we're holding shift and it's already selected, and we're not deselect
      if(e.shiftKey && thing.team_select == VGT.clients.me.team) thing.unselect()

      // Otherwise, select it and hold everything, sending it to the top or bottom.
      else {
        thing.select(VGT.clients.me.team); // send q, shovel
        thing.shovel_select(VGT.clients.me.team);
        VGT.things.hold_selected(VGT.net.id, false);

        // Send the selection to the top or bottom, depending on button etc
        if     (e.button == 0) VGT.things.send_selected_to_top(VGT.clients.me.team);
        else if(e.button == 2) VGT.things.send_selected_to_bottom(VGT.clients.me.team);
      }

    } // End of "found thing under pointer"

    // Otherwise, we have hit the table top. 
    else {
     
      // If we're clicking the tabletop without shift, unselect everything
      if(!e.shiftKey) VGT.things.unselect_all(VGT.clients.me.team);

      // If we're going to start dragging the rectangle, send the table coordinates of the click
      if(e.button == 2 && hand) { 

        // Keep the coordinates of the click (starting coordinates of the box), and tell everyone
        hand.vd = v; 
        hand.update_q_out('vd'); 

        // Remember the originally selected items if we're holding shift
        if(e.shiftKey) hand.originally_selected = Object.values(VGT.things.selected[VGT.clients.me.team]);
      }
    }
  } // End of onpointerdown

  // Pointer has moved around.
  onpointermove(e) { //log('onpointermove()', e.button);
    this.last_pointermove_e = e;
    
    // Get the tabletop coordinates
    var v = VGT.tabletop.xy_stage_to_tabletop(e.clientX, e.clientY);
    
    // Save the coordinates of this move event
    this.xm_client = e.clientX;
    this.ym_client = e.clientY;
    this.xm_tabletop = v.x;
    this.ym_tabletop = v.y;
    this.rm_tabletop = VGT.tabletop.r.value;

    // Move my hand and polygon
    var hand = null;
    if(VGT.clients && VGT.clients.me && VGT.clients.me.hand) { hand = VGT.clients.me.hand
      hand        .set_xyrs(this.xm_tabletop, this.ym_tabletop, -this.rm_tabletop, 1.0/VGT.tabletop.s.value, true);
      hand.polygon.set_xyrs(this.xm_tabletop, this.ym_tabletop, -this.rm_tabletop, undefined,                true);
    }

    // Only do stuff if the mouse is down
    if(this.button >= 0) {
      
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
      } 
      
      // Otherwise, if it's the left mouse, pan the board.
      else if(this.button == 0) {
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
      }
    
    } // End of 'button down'
    
  } // End of onpointermove

  onpointerup(e) { log('onpointerup()', e.button);

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
    VGT.things.release_all(VGT.net.id, false, false);

    // If we have a hand, store the down click and update the outbound q
    var hand = null; if(VGT.clients && VGT.clients.me && VGT.clients.me.hand) hand = VGT.clients.me.hand;

    // Releasing, so open fist, clear the polygon, and update vd so others know to do the same.
    if(hand) {
      hand.open();
      hand.vd = false; hand.update_q_out('vd');
    }
  }
  
  onwheel(e) {log('_Interaction.onwheel()', e);

    // If shift is down, rotate
    if(e.shiftKey) {
      if(e.deltaY > 0) this.actions.rotate_left();
      else             this.actions.rotate_right();
    }
     
    // Otherwise, zoom
    else {
      if(e.deltaY > 0) this.actions.zoom_out();
      else             this.actions.zoom_in();
    }

  }

  // Whenever a key is pressed or released.
  onkey(e) {
    this.last_onkey = e;

    // Special case for observers too: Escape toggles controls
    if(e.code == 'Escape' && e.type == 'keydown') VGT.html.toggle_controls();

    // If we're not ready, not supposed to interact with the game,
    // toggling full screen (F11), or using an input, don't 
    // change the default behavior of the keys.
    if(// !net.me.ready 
    e.code == 'F11'
    || document.activeElement.id == 'name' 
    || document.activeElement.id == 'team' 
    || document.activeElement.id == 'chat-box') return;

    // Prevent the key's normal response.
    e.preventDefault();
    
    // If the function exists, call it with the event
    var code = e.code;
    if(e.shiftKey && code.substring(0,5)!='Shift') code = 'Shift'+code;
    if(e.type == 'keyup') code = code + 'Up';
    else                  code = code + 'Down';

    // Log it
    log('onkey()', code, e.repeat);
    if(this.key_functions[code]) this.key_functions[code](e);

  } // End of onkey()

  onchange_team(e) {
    log('onchange_team()', e.target.id, e.target.selectedIndex, e.target.value);

    // Remember the team
    if(String(VGT.net.id) == e.target.id) save_cookie('team', e.target.value);

    // Update the clients list and send to server
    VGT.net.clients[e.target.id].team = e.target.selectedIndex;
    log(   'NETS_clients', VGT.net.clients);
    VGT.net.io.emit('clients', VGT.net.clients);

  } // End of onchange_team()

  // When we change our name
  onchange_name(e) {
    log('onchange_name()', e.target.id, e.target.value);

    // Remember my own name, but not others
    if(String(VGT.net.id) == e.target.id) save_cookie('name', e.target.value);

    // Update the clients list
    VGT.net.clients[VGT.net.id].name = e.target.value;
    log(   'NETS_clients', VGT.net.clients);
    VGT.net.io.emit('clients', VGT.net.clients);
  } // End of onchange_name()

  // When the volume changes.
  onchange_volume(e) {

    var v = parseInt(VGT.html.volume.value)*0.01*1.0;
    
    log('onchange_volume()', VGT.html.volume.value, v);
    
    // Change the master volume
    Howler.volume(v);
    
    // Remember the value
    save_cookie('volume',       VGT.html.volume.value);
  } // end of onchange_volume()

  /** Called when someone hits enter in the chat box.
   *  Sends a chat message to everyone else.
   */
  onchat() {
    log('onchat()');

    // Get the chat text and clear it
    var chat_box = document.getElementById('chat-box')
    var message  = html_encode(chat_box.value);
    chat_box.value = '';

    // Send a chat.
    log(   'NETS_chat', message);
    VGT.net.io.emit('chat', message);
  } // end of onchat()

  
  // Auto-adjusting VGT.pixi.app size to available space
  onresize_window(e) {
    
    // Resize the renderer
    VGT.pixi.app.renderer.resize(window.innerWidth, window.innerHeight);

    // Resize the surface
    VGT.pixi.surface.scale.x = window.innerWidth;
    VGT.pixi.surface.scale.y = window.innerHeight;

    // Shift the center to the center of the view
    log('  ', VGT.tabletop.container.x, window.innerWidth*0.5);
    VGT.tabletop.container.x += -VGT.tabletop.container.x+window.innerWidth*0.5;
    VGT.tabletop.container.y += -VGT.tabletop.container.y+window.innerHeight*0.5;
    
    log('onresize_window()');
  }
  



  // 
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
    log('SoundLibrary constructor()', specs);

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
    log('SoundLibrary loaded', key, specs, percent);

    // If we hit 100%, load the volume slider
    if(percent == 100) {
    
      // Load the sound settings.
      VGT.html.volume.value = load_cookie('volume');
      
      // Send em.
      VGT.interaction.onchange_volume();
    }
  } // End of onprogress()

  // Play a sound by spec path. Returns [key, id]
  play(path, x, y, rate) {

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
    x0: 0,              // Snap x value target; undefined = no snap
    y0: 0,              // Snap y value target; undefined = no snap
    r: undefined,      // Snap r value target; undefined = no snap
    s: undefined,      // Snap s value target; undefined = no snap
    radius: 50,        // Radius within which snapping occurs
    groups: [],        // List of group names (strings) other than 'all' to which this snap should be added in VGT.snaps upon creation
  }

  constructor(settings) {
   
    // Store the settings, starting with defaults then overrides.
    this.settings = {...this.default_settings, ...settings};

    // Add it to the master group
    VGT.snaps.add_snap(this);
  }

  // Returns a distance score (usually distance squared for speed reasons) between the thing target and the snap
  get_relationship(thing) {

    var v, x, y, r, parent = this.settings.parent;

    // If the parent is the piece or the parent is held, do nothing
    // Note checking if the piece is held here would randomly prevent snapping
    // to released pieces, because they're released one at a time. 
    // Could add 'things to avoid' list or something.
    if(parent == thing) return false;

    // If the parent is the tabletop, use the tabletop coordinates
    else if(parent == undefined || parent == VGT.tabletop) {
      x = thing.x.target;
      y = thing.y.target;
    }

    // Otherwise, the parent is a Thing, so use the parent's coordinates
    else {
      v = parent.xy_tabletop_to_local(thing.x.target, thing.y.target); //container.localTransform.applyInverse( new PIXI.Point( thing.x.target, thing.y.target ) )
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
        v = parent.xy_local_to_tabletop(x,y); //.container.localTransform.apply( new PIXI.Point( x, y ) )
        x = v.x;
        y = v.y;
        if(r == undefined) r = 0;
        r += parent.r.target + parent.R.target;
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

  // Returns a distance score (usually distance squared for speed reasons) between the thing target and the snap
  get_relationship(thing) {

    var parent = this.settings.parent;

    // If the parent is the piece or the parent is held, do nothing
    // Note checking if the piece is held here would randomly prevent snapping
    // to released pieces, because they're released one at a time. 
    // Could add 'things to avoid' list or something.
    if(parent == thing) return false;

    // If the parent is the tabletop, use the tabletop coordinates
    else if(parent == undefined || parent == VGT.tabletop) {
      var x = thing.x.target;
      var y = thing.y.target;
    }

    // Otherwise, the parent is a Thing, so use the parent's coordinates
    else {
      var v = parent.xy_tabletop_to_local(thing.x.target, thing.y.target); //container.localTransform.applyInverse( new PIXI.Point( thing.x.target, thing.y.target ) )
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
        var vs = parent.xy_local_to_tabletop(xs,ys); //container.localTransform.apply( new PIXI.Point( xs, ys ) )
        xs = vs.x;
        ys = vs.y;
        if(r == undefined) r = 0;
        r += parent.r.target + parent.R.target;
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
    image_paths   : null,             // paths relative to the root, with each sub-list being a layer (can animate), e.g. [['a.png','b.png'],['c.png']]
    image_root    : '',               // Sub-folder in the search directories (path = image_paths.root + image_root + path), e.g. images/
    shape         : 'rectangle',      // Hitbox shape; could be 'rectangle' or 'circle' or 'circle_outer' currently. See this.contains();
    type          : null,             // User-defined types of thing, stored in this.settings.type. Could be "card" or 32, e.g.
    sets          : [],               // List of other sets (e.g. VGT.Pieces, VGT.Hands) to which this thing can belong
    r_step        : 45,               // How many degrees to rotate when taking a rotation step.
    rotate_with_view : false,         // Whether the piece should retain its orientation with respect to the screen when rotating the view / table

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
    collect_dx: 2,         // px shift in x-direction for collecting
    collect_dy: -2,        // px shift in y-direction for collecting
    expand_Nx : 10,        // number of columns when expanding
    expand_dx : undefined, // px shift for expanding in the x-direction; undefined is 'automatic'
    expand_dy : undefined, // px shift for expanding in the y-direction; undefined is 'automatic'

    // Text layer?
    text: false 
  };

  constructor(settings) {
    this.type = 'Thing';

    // This piece is not ready yet, until initializing / doing pixi stuff later.
    this.ready = false;

    // Store the settings, starting with defaults then overrides.
    this.settings = {...this.default_settings, ...settings};
    
    // Make sure the paths end with a /
    this.settings.image_root = finish_directory_path(this.settings.image_root);

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
    this.t_last_move    = 0;
    this.t_last_texture = 0;
    this.t_last_hold    = 0; // Last time we held the piece

    // Texture parameters
    this._n = 0;             // Current texture index

    // List of the q_out indices (nq's), indexed by key,
    // e.g., this.last_nqs['ts'] will be q_out index of the last update
    this.last_nqs = {
      x:-1,
      y:-1,
      r:-1,
      s:-1,
      ts:-1,
      ih:-1,
    }
    
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
      this.text.anchor.set(0.5,0.5);
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

  // Whether the supplied table coordinates are contained within the object
  contains(x,y) { 

    // Transform table coordinates to local coordinates
    var v = this.xy_tabletop_to_local(x,y); //container.localTransform.applyInverse(new PIXI.Point(x,y));
    
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

  /** Sets the tint of all the textures */
  set_tint(tint) {
    this.tint = tint; 
    for(var n in this.sprites) 
      this.sprites[n].tint = tint; 
  }
  get_tint() { return this.tint; }

  _initialize_pixi() {
    
    // Make sure the paths end with a /
    image_paths.root = finish_directory_path(image_paths.root);
    
    // Keep a list of texture lists for reference, one texture list for each layer. 
    this.textures = [];
    
    // If image_paths = null, no textures. sprites will stay empty too.
    if(this.settings.image_paths != null) {

      var path, texture; // reused in loop
      for(var n=0; n<this.settings.image_paths.length; n++) {
        
        // One list of frames per layer; these do not have to match length
        this.textures.push([]); 
        for(var m = 0; m<this.settings.image_paths[n].length; m++) {
          
          // Add the actual texture object
          path = image_paths.root + this.settings.image_root + this.settings.image_paths[n][m];
          if(VGT.pixi.resources[path]) {
            texture = VGT.pixi.resources[path].texture;

            // Add it to the list
            this.textures[n].push(texture);
          }
          else throw 'No resource for '+ path +'. Usually this is because one of the image_paths provided upon piece creation does not match one of those in image_paths.list.';
        }
      } // Done with loop over image_paths.
    }
      
    // Loop over the layers, creating one sprite per layer
    for(var n in this.textures) {

      // Create the layer sprite with the zeroth image by default
      var sprite = new PIXI.Sprite(this.textures[n][0])
      
      // Center the image
      sprite.anchor.set(0.5, 0.5);
    
      // Keep it in our personal list, and add it to the container
      this.sprites.push(sprite);
    }

    // Update the text for the first time
    if(this.settings.text) this.set_text(this.settings.text);

    // Add the sprites to the container (can be overloaded); also gets width and height
    this.refill_container();

    // This piece is ready for action.
    this.ready = true;
  }

  /**
   * Sets the controller id. 0 means no one is in control (server).
   */
  hold(id_client, force, do_not_update_q_out) { // log('thing.hold()', this.id_thing, id_client, force, this.id_client_hold);

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
   * Uncontrols a thing.
   */
  release(id_client, force, do_not_update_q_out) { //log('thing.release()', this.id_thing, id_client, force, do_not_update_q_out, this.id_client_hold);

    // If we're already not holding
    // or there is a valid holder that is different from the requestor (and we aren't overriding this)
    // do nothing.
    if(this.id_client_hold == 0
    || Object.keys(VGT.clients.all).includes(String(this.id_client_hold))
    && this.id_client_hold != id_client
    && !force) return;

    // Snap leader should be a piece that is grabbed by me
    if(this.is_snap_leader) {

      // Find the closest snap point, if any, and set it
      var a = this.get_best_snap_relationship();
      if(a) {
        // Get the difference so we can similarly shift the other formerly held pieces
        var dx = a.x - this.x.target;
        var dy = a.y - this.y.target;

        // Now loop over the releasing piece list and update the coordinates
        var p;
        for(var id in VGT.things._releasing) { 
          p = VGT.things._releasing[id];
          p.set_xyrs(p.x.target+dx, p.y.target+dy, a.r, a.s); // Animate, tell the world, and do reset R.
        }
      } // End of "found snap point"
    } // End of "is snap leader"

    // Reset the snap leader flag
    this.is_snap_leader = undefined;

    // Remove it from the list
    delete VGT.things.held[this.id_client_hold][this.id_thing];

    // If it was me holding it, remember the time I let go.
    if(this.id_client_hold == VGT.net.id) this.t_last_hold = Date.now();
    this.id_client_hold = 0;

    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('id_client_hold', 'ih', do_not_update_q_out);
  }

  draw_select_graphics(team) {
    
    // Clear whatever is there
    this.graphics.clear();

    // Add the selection box
    var w = this.width;
    var h = this.height;
    if(this.settings.shape == 'circle' || this.settings.shape == 'circle_inner') var r = Math.min(w,h)*0.5;
    else if(this.settings.shape == 'circle_outer')                               var r = Math.max(w,h)*0.5; 

    var t1 = 8/this.s.value;
    var t2 = 3/this.s.value;
    var c1 = VGT.game.get_team_color(team);
    var c2 = 0xFFFFFF;
    var a  = 0.7;
    if(get_luma_ox(c1) > 0.9) {
      c2 = 0x000000;
      a  = 0.4;
    }

    // Drawing a circle
    if(['circle', 'circle_outer', 'circle_inner'].includes(this.settings.shape)) {
      this.graphics.lineStyle(t1, c1);
      this.graphics.drawCircle(0, 0, r);
      this.graphics.lineStyle(t2, c2, a);
      this.graphics.drawCircle(0, 0, r);
    }

    // Drawing an ellipse
    else if(this.settings.shape == 'ellipse') {
      this.graphics.lineStyle(t1, c1);
      this.graphics.drawEllipse(0, 0, this.width*0.5, this.height*0.5);
      this.graphics.lineStyle(t2, c2, a);
      this.graphics.drawEllipse(0, 0, this.width*0.5, this.height*0.5);
    }

    // Drawing a rectangle
    else { 
      this.graphics.lineStyle(t1, c1);
      this.graphics.drawRect(-w*0.5, -h*0.5, w, h);
      this.graphics.lineStyle(t2, c2, a);
      this.graphics.drawRect(-w*0.5, -h*0.5, w, h);
    }
  }

  /**
   * Selects the thing visually and adds it to the approriate list of selected things.
   */
  select(team, do_not_update_q_out) { //log('thing.select()', this.id_thing, team, do_not_update_q_out, this.team_select, this.id_client_hold);

    // If team is not specified (used by process_queues()), there is no change, or
    // it is being held by someone who is not on the same team, do nothing.
    if(team == undefined || team == this.team_select 
    || this.id_client_hold && VGT.clients.all[this.id_client_hold] 
       && VGT.clients.all[this.id_client_hold].team != team) return;

    // If team is -1, unselect it and poop out
    if(team < 0) return this.unselect(do_not_update_q_out);

    // If there is any team selecting this already, make sure to unselect it to remove it
    // from other lists! (Do not send a network packet for this).
    if(this.team_select != -1) this.unselect(true); 

    // Keep track of the selected team.
    this.team_select = team;

    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('team_select', 'ts', do_not_update_q_out);

    // Make sure there is an object to hold selected things for this id
    if(VGT.things.selected[team] == undefined) VGT.things.selected[team] = {};

    // Select it
    VGT.things.selected[team][this.id_thing] = this;

    // Draw selection graphics
    this.draw_select_graphics(team);
    
  } // End of select()


  /**
   * Unselects thing. This will not unselect anything held by someone else.
   */
  unselect(do_not_update_q_out) { //log('thing.unselect()', this.id_thing, this.selected_id);

    // If we're already unselected, or it is held by someone do nothing
    if(this.team_select < 0 && this.id_client_hold) return;

    // Remove it from the list
    if(VGT.things.selected[this.team_select] &&
       VGT.things.selected[this.team_select][this.id_thing])
        delete VGT.things.selected[this.team_select][this.id_thing];
    this.team_select = -1;

    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('team_select', 'ts', do_not_update_q_out);

    // Remove rectangle
    this.graphics.clear();
  } // End of unselect()

  // Selects all the pieces on this piece
  shovel_select(team) {

    // If it's a "shovel" piece and we're selecting, select all the pieces in its hitbox also
    if(this.settings.shovel && this.settings.shovel.length) {
      
      // Loop over the shovel group names
      var group, piece;
      for(var n in this.settings.shovel) { group  = this.settings.shovel[n];
        
        // Loop over the pieces in this group
        for(var m in VGT.pieces[group])   { piece = VGT.pieces[group][m];
          
          // If this piece contains the current values of this piece (and it's higher), select it
          if( this.contains(piece.x.value, piece.y.value)
          && piece.is_higher_than(this) ) piece.select(team);
        
        } // End of loop over pieces in group
      
      } // End of loop over shovel groups
    
    } // End of "is shovel"
  
  } // End of shovel_select()

 

  /* Sends data associated with key (this[key]) to the associated VGT.net.q_pieces_out[this.id_thing][qkey]. */
  update_q_out(key, qkey, only_if_exists) { 
    //log('Thing.update_q_out()', key, qkey, only_if_exists);
    
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
    if(['x','y','r','R','s'].includes(qkey)) q_out[id][qkey] = this[key].target;
    else if(qkey == 'z')                     q_out[id][qkey] = this.get_z();
    else if(qkey == 'l')                     q_out[id][qkey] = Math.round(this.settings.layer);
    else                                     q_out[id][qkey] = this[key];

    // Remember the index that will be attached to this on the next process_qs
    this.last_nqs[qkey] = VGT.net.nq+1;
    return this;
  }

  // Returns the z-order index (pieces with lower index are behind this one)
  get_z() {

    // Get the parent of the container
    var parent = this.container.parent;
    
    // If it exists, find the child.
    if(parent) return parent.children.indexOf(this.container);
    else       return -1;
  }

  // User function for setting the z-index of this piece.
  // This will do NOTHING locally, waiting instead for the server
  // to tell us what to do with it. Here we just send a z request to the server immediately.
  set_z(z) { 
    VGT.net.q_z_out.push(this.id_piece);
    VGT.net.q_z_out.push(z);

    //log('NETS_z_'+String(VGT.net.id), [this.id_piece, z]);
    //VGT.net.io.emit('z', [this.id_piece, z]);
  }

  // Set the z-order index; only actually performed when server says it's ok (otherwise, ordering nightmare)
  _set_z(z) {
    // Get the parent of the container
    var parent = this.container.parent;
    
    // Get the current index
    var n_old = this.get_z();

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
  }

  send_to_top() {

    // Get the parent of the container
    var parent = this.container.parent;
    
    // If it exists, send it to the top of the parent's list.
    if(parent) this.set_z(parent.children.length-1);
  }

  send_to_bottom() {this.set_z(0);}

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
    this.container.addChild(this.graphics);

    // Add the text layers
    if(this.text) {
      this.container.addChild(this.text_graphics);
      this.container.addChild(this.text);
    }

    // Update the dimensions
    [this.width, this.height] = this.get_dimensions();
  }

  /** Returns teh largest width and height [w,h] */
  get_dimensions() {
    var w = 0, h = 0;

    // Loop over the layers, keeping the largest dimensions
    for(var l=0; l<this.sprites.length; l++) {
      var s = this.sprites[l];
      w = Math.max(w, s.width);
      h = Math.max(h, s.height);
    }

    // If we have a text layer check that too
    if(this.text) {
      w = Math.max(w, this.text.width,  this.text_graphics.width);
      h = Math.max(h, this.text.height, this.text_graphics.height);
    }

    return [w,h];
  }

  /** Sets the text and redraws */
  set_text(text, style, background_color) {
    // Default style
    var style_default = {fontFamily : 'Arial', fontSize: 48, fill : 0x000000, align : 'center'}
    style = {...style_default, ...style}

    // Set the text
    if(text)  this.text.text = text;
    if(style) for(var k in style) this.text.style[k] = style[k];
    if(background_color) {
      var w = this.text.width;
      var h = this.text.height;
      var d = h*0.25

      this.text_graphics.clear();
      this.text_graphics.beginFill(background_color, 1);
      this.text_graphics.drawRoundedRect(-0.5*w-2*d, -0.5*h-d, w+4*d, h+2*d, d);
      this.text_graphics.endFill(); 
    }

    // Update the width / height of the total object
    [this.width, this.height] = this.get_dimensions();
  }

  /**
   * Sets the texture index and resets the clock.
   */
  set_texture_index(n, do_not_update_q_out) {
    if(n == undefined) return;

    // Loop over the layers, setting the texture of each
    for(var l=0; l<this.sprites.length; l++) {
        
      // Figure out the valid index (make sure there's a texture!)
      var n_valid = n % this.textures[l].length;
      
      // Set the texture to a valid one.
      this.sprites[l].texture = this.textures[l][n_valid];
    }

    // Remember the index we're on for cycling purposes
    this._n = n_valid;
    //log('_Piece.set_texture_index()', this._n, do_not_update_q_out);

    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('_n', 'n', do_not_update_q_out);

    // Record the time of this switch for animation purposes
    this.t_last_texture = Date.now();

    // Finish this function for function finishing purposes
  }
  
  // Increment the texture
  increment_texture() {
    log('_Piece.increment_texture()', this.id, this._n+1);
    this.set_texture_index(this._n+1);
  }

  // Increment the texture if we've passed a certain amount of time
  increment_texture_delayed() {
    if(Date.now() - this.t_last_texture > this.t_texture_delay)
      this.increment_texture();
  }

  // Randomizes the shown texture
  randomize_texture_index(do_not_update_q_out) { this.set_texture_index(random_integer(0,this.textures[0].length-1), do_not_update_q_out); }

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

  is_enabled()  {return  this.container.visible;}
  is_disabled() {return !this.container.visible;}

  // Returns true if this thing is in a higher layer or higher index than the supplied thing
  is_higher_than(thing) {

    // Higher or lower layer
    if(this.settings.layer > thing.settings.layer) return true;
    if(this.settings.layer < thing.settings.layer) return false;

    // Equal layer
    if(this.get_z() > thing.get_z()) return true;
    else                             return false;
  }

  /**
   * Converts the tabletop coordinates (x,y) to "local" coordinates.
   * @param {float} x x-coordinate in the tabletop's coordinate system
   * @param {float} y y-coordinate in the tabletop's coordinate system
   */
  xy_tabletop_to_local(x,y) {
      var v = this.container.localTransform.applyInverse(new PIXI.Point(x,y));
      return v;
    }

  /**
   * Converts the "local" coordinates (x,y) to tabletop coordinates.
   * @param {float} x x-coordinate in this thing's coordinate system
   * @param {float} y y-coordinate in this thing's coordinate system
   */
  xy_local_to_tabletop(x,y) {
    var v = this.container.localTransform.apply(new PIXI.Point(x,y));
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
  set_xyrs(x, y, r, s, immediate, do_not_update_q_out, do_not_reset_R) { 

    // Now for each supplied coordinate, update and send
    if(x!=undefined && x != this.x.target) {this.x.set(x,immediate); this.update_q_out('x', 'x', do_not_update_q_out);}
    if(y!=undefined && y != this.y.target) {this.y.set(y,immediate); this.update_q_out('y', 'y', do_not_update_q_out);}
    if(r!=undefined && r != this.r.target) {
      this.r.set(r,immediate); 
      this.update_q_out('r', 'r', do_not_update_q_out);
      if(!do_not_reset_R) {this.set_R(0, immediate, do_not_update_q_out);}
    }
    if(s!=undefined && s != this.s.target) {this.s.set(s,immediate); this.update_q_out('s', 's', do_not_update_q_out);}
    this.t_last_move = Date.now();
  }

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
    var v = thing.xy_local_to_tabletop(x,y); //container.localTransform.apply(new PIXI.Point(x,y));
    
    // Get the relative rotation
    if(r != undefined) r += thing.r.target + thing.R.target;

    // Now update the thing
    this.set_xyrs(v.x,v.y,r,s,immediate,do_not_update_q_out,do_not_reset_R);
  }

  // Sets the auxiliary rotation
  set_R(R, immediate, do_not_update_q_out) {
    this.R.set(R,immediate);
    this.update_q_out('R','R', do_not_update_q_out);
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

    return best;
  }

  /**
   * Updates the actual sprite location / geometry via the error decay animation, 
   * and should be called once per frame.
   */
  animate_xyrs(delta) { if(!delta) delta = 1;
    
    // Don't do anything until it's been initialized / added to pixi.
    if(!this.ready) {return;}
    //if(VGT.pixi.N_loop == 1 && this.id_thing > 2) log('N_loop ==',VGT.pixi.N_loop,':', this.vr, this);

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
  }

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

  // Collect things into a pile
  collect(things, x, y, r, r_stack, dx, dy, center_on_top, supplied_order) {

    // Get an object, indexed by layer with lists of things, sorted by z
    if(!supplied_order) var sorted = VGT.things.sort_by_z(things); 
    else                var sorted = things; 

    // Loop over layers and stack at the mouse coordinates
    var p, n=0, dx0, dy0, v;
    for(var k in sorted) { p = sorted[k];
      if(dx == undefined) dx0 = p.settings.collect_dx;
      else                dx0 = dx;
      
      if(dy == undefined) dy0 = p.settings.collect_dy;
      else                dy0 = dy;

      if(center_on_top) v = rotate_vector([(n-sorted.length+1)*dx0, (n-sorted.length+1)*dy0], r_stack);
      else              v = rotate_vector([ n                 *dx0,  n                 *dy0], r_stack);

      // Set the location and then increment the offset integer.
      p.set_xyrs(x+v[0], y+v[1], r);
      n++;
    }
  }

  // Expand these into a grid
  expand(things, x, y, r, r_stack, sort) { log('expand()', things.length, x, y, r, sort);
    
    // If we're supposed to sort by z; this sends the request for z sorting,
    // but relies on the server's response to actually do it.
    if(sort) var sorted = this.sort_z_by_id(things);

    // Get an object, indexed by layer with lists of things, sorted by z
    else var sorted = VGT.things.sort_by_z(things);

    // Get the row count from the first element
    var Nx = sorted[0].settings.expand_Nx;
    var dx = sorted[0].settings.expand_dx;
    var dy = sorted[0].settings.expand_dy;
    if(!Nx) Nx = 10;
    if(!dx) dx = sorted[0].width;
    if(!dy) dy = sorted[0].height;

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
    var x0 = -(Nx-1)             *0.5*dx;
    var y0 = -(expanded.length-1)*0.5*dy;
    
    // Start positioning things
    var v;
    for(var i in expanded) for(var j in expanded[i]) {


      v = rotate_vector([-(expanded[i].length-1)*0.5*dx + j*dx, y0+i*dy], r_stack);
      expanded[i][j].set_xyrs(x+v[0], y+v[1], r);
    }
      
  }

  // Resets coordinates
  reset() {for(var n in this.all) this.all[n].reset(); }

  /** Releases all things with the supplied client id. */
  release_all(id_client, force, do_not_update_q_out) { log('_Things.release_all()', id_client, this.held[id_client]);
    
    // If we have a held list for this client id
    if(this.held[id_client]) {
      
      // Remember the previously held pieces so they know what to do
      this._releasing = {...this.held[id_client]};
      
      // Loop over the list and reset the id_client_hold
      for(var id_thing in this.held[id_client]) this.held[id_client][id_thing].release(id_client, force, do_not_update_q_out);
     
      // Forget the previously held pieces
      delete this._releasing;

      // Delete the list
      delete this.held[id_client];
    }
  }

  // Shuffles the z-order of the supplied list of things
  shuffle_z(things) {

    // Make a copy for in-place shuffling
    var shuffled = [...things];
    shuffle_array(shuffled);
    for(var n in shuffled) shuffled[n].send_to_top();

    return shuffled;
  }

  /**
   * "Sneezes" the supplied list of things at random locations and rotations 
   * around the specified coordinates in a randomly populated
   * hex grid. Does not randomize z or the image indices. See also "scramble_things()"
   * 
   * @param {array} things list of things to sneeze out on the table
   * @param {float} x      x-coordinate to center the scramble on
   * @param {float} y      y-coordinate to center the scramble on
   * @param {int}   space  average lattice sites per piece (on hex grid) (default 1.5)
   * @param {float} scale  scale for spacing of hex grid (default 1)
   */
  sneeze_things(things, x, y, space, scale) {

    // Bonk out and handle defaults
    if(!things || things.length==0 || x==undefined || y==undefined) return;
    if(space == undefined) space = 1.5;
    if(scale == undefined) scale = 1;

    // Now find the basis vectors based on the biggest radius of the last piece
    var D  = scale*Math.max(things[things.length-1].width, things[things.length-1].height);
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
      var v = get_random_location_disc(0.25*D); // Small deviation from lattice
      
      // Set the random location, orientation, and image
      p.set_xyrs(x + d.n*a[0] + d.m*b[0] + v.x, 
                 y + d.n*a[1] + d.m*b[1] + v.y, 
                 v.r * 7);
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
   */
  scramble_things(things, x, y, space, scale, do_not_randomize_texture) {
    
    // Bonk out and handle defaults
    if(!things || things.length==0 || x==undefined || y==undefined) return;
    if(space == undefined) space = 1.5;
    if(scale == undefined) scale = 1;

    // Shuffle z, sneeze them out around the x, y coordinates, and randomize each texture
    this.shuffle_z(things);
    this.sneeze_things(things, x, y, space, scale);
    for(var n in things) things[n].randomize_texture_index();
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
  sort_by_z(things, descending) { 

    // First sort by layers
    var sorted = {}, layer;
    for(var n in things) { 

      // Attach its z-value for easy sorting
      things[n]._z = things[n].get_z();

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

  // Sends all selected things to the top.
  send_selected_to_top(team) { 

    // If we have a held list for this client id
    if(this.selected[team]) {
      
      // Get the sorted held objects, indexed by layer
      var sorted = this.sort_by_z(Object.values(this.selected[team]));
      
      // Send them to the top, bottom first
      for(var k in sorted) sorted[k].send_to_top();
    }
  }


  // Sends all selected things to the bottom.
  send_selected_to_bottom(team) { 

    // If we have a held list for this client id
    if(this.selected[team]) {
      
      // Get the sorted held objects
      var sorted = this.sort_by_z(Object.values(this.selected[team]), true);
      
      // Send them to the top, bottom first
      for(var k in sorted) sorted[k].send_to_bottom();
    }
  }


  /**
   * Sets up the drag for all selected things for this team
   * @param {int} team 
   */
  hold_selected(id_client, force, do_not_update_q_out) { log('VGT.things.hold_selected()', id_client, force);

    // Loop over the selected things and hold whatever isn't already held by someone else.
    for(var k in this.selected[VGT.clients.all[id_client].team]) 
      this.selected[VGT.clients.all[id_client].team][k].hold(id_client, force, do_not_update_q_out);
  }

  /**
   * unselect all things for this team.
   */
  unselect_all(team) { log('VGT.things.unselect_all()', team);

    // If no team, use our team
    if(team == undefined) team = VGT.clients.me.team;

    // Loop over all the selected things and pop them.
    for(var k in this.selected[team]) this.selected[team][k].unselect(); 
  }

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

  constructor(vs, settings) {

    if(!settings) settings = {};
    settings.image_paths = null; // No textures, just GL drawing.

    // Run the usual thing initialization
    super(settings);

    // Remember the type
    this.type = 'Polygon';

    // List of vertices, each coordinate of which is animated
    this.vertices = [];

    // If we supplied vertices, add them
    if(vs) this.add_vertices(vs);

    // If we're supposed to redraw
    this.needs_redraw = false;
  }

  // Adds a vertex, e.g., [27,289]
  add_vertex(v) { this.vertices.push([new _Animated(v[0]), new _Animated(v[1])]); }

  // Adds a list of vertices, e.g. [[100,10],[50,50],[32,37],...]
  add_vertices(vs) { for(var n in vs) this.add_vertex(vs[n]); }

  // Sets the coordinates of vertex n to v, e.g. [32,27]
  set_vertex(n, v, immediate) { 
    this.vertices[n][0].set(v[0], immediate); 
    this.vertices[n][1].set(v[1], immediate); 
    if(immediate) this.needs_redraw = true;

    this.update_q_out(n);
  }

  // Sets the coordinates of many vertices, e.g. [[100,10],[50,50],[32,37],...]
  set_vertices(vs, immediate) { for(var n in vs) this.set_vertex(n,vs[n],immediate); }

  // Returns a Polygon of the same vertices in the *tabletop* coordinates
  get_tabletop_polygon() {
    var vs = [];

    // Loop over the vertices and transform them into the tabletop frame
    for(var n in this.vertices)
      vs.push(this.xy_local_to_tabletop(
        this.vertices[n][0].value, 
        this.vertices[n][1].value));

    // Make the pixi polygon
    return new PIXI.Polygon(...vs);
  }

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

    // No need to redraw; that's the whole point.
    this.needs_redraw = false;
  }

  // Clear and redraw the whole thing
  redraw() {

    // Get the list of pixi points with the most recent value
    var ps = [];
    for(var n in this.vertices) ps.push(new PIXI.Point(this.vertices[n][0].value, this.vertices[n][1].value));
    
    this.graphics.clear();
    this.graphics.beginFill(this.get_tint(), 1);
    this.graphics.drawPolygon(ps);
    this.graphics.endFill();

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

/** Floating hand on top of everything. */
class _Hand extends _Thing {

  constructor() {

    // Create the settings for a hand
    var settings = {
      image_paths : [['hand.png', 'fist.png']], // paths relative to the root
      image_root  : 'hands',                    // Image root path.
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
    this.polygon = new _Polygon([[0,0],[0,0],[0,0],[0,0]], {layer: VGT.tabletop.LAYER_SELECT}); 
    this.polygon.container.alpha = 0.4;

    // Create a nameplate with the hand
    this.nameplate = new _Piece({text:'player', layer: VGT.tabletop.LAYER_NAMEPLATES});
  }

  /** Sets the tint of all the textures AND the selection box */
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
  close() {this.set_texture_index(1);}
  open()  {this.set_texture_index(0);}
  
  /** Whether the hand is open or closed. */
  is_closed() {return this._n == 1;}
  is_open()   {return this._n == 0;}

  /** Sets t_last_move to the current time to show the hand. */
  ping() {this.t_last_move = Date.now();}

  /** Other animations associate with the hand. */
  animate_other(delta) { 
    
    // If it has vd set to a vector (not false or undefined), update the multi-piece selection rectangle
    if(this.vd) {

      // Get the distance vector traveled since the pointer came down
      var v = rotate_vector([this.x.value - this.vd.x, this.y.value - this.vd.y], -this.r.value);
      var vs = [ [0,0], [-v[0],0], [-v[0],-v[1]], [0,-v[1]] ];
      
      // If I have a hand, update the selection rectangle to extend back to where the click originated
      this.polygon.set_vertices(vs, true, true ); // immediate, do_not_update_q_out (if I end up coding this...)
    
      // At a reduced frame rate, check for pieces within the polygon
      if(VGT.pixi.n_loop % 1 == 0 && this.is_me()) {

        // Get the polygon in tabletop coordinates
        var poly = this.polygon.get_tabletop_polygon();

        // Loop over the pieces and select those that are in it.
        var p;
        for(var n in VGT.pieces.all) { p = VGT.pieces.all[n];
          if(poly.contains(p.x.value, p.y.value)) 
            p.select(VGT.clients.me.team);
          else if(this.originally_selected && !this.originally_selected.includes(p))
            p.unselect();
        }
        
      } // End of reduced frame rate
    } // End of if(vd)

    // Otherwise, clear it
    else this.polygon.clear();

    // Time of most recent last change
    var t0 = Math.max(this.t_last_texture, this.t_last_move);

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
  free_all_hands() { for(var l in this.all) this.all[l].id_client = 0; }

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

  /** Rebuilds the client list and GUI based on VGT.net.clients. */
  rebuild() {
    log('VGT.clients.rebuild()');

    // Clear out the list
    this.all = {};

    // Unassign all hands (sets id_client to 0)
    VGT.hands.free_all_hands();

    // Loop over the client list
    for (var k in VGT.net.clients) {var c = VGT.net.clients[k];
      log('  client', c.id, c.name, c.team, VGT.game.settings.teams[c.team]);
    
      // Store everything for this client.
      this.all[c.id] = {
        name  : c.name,
        team  : c.team, // index
        color : VGT.game.get_team_color(c.team),
        hand  : VGT.hands.get_unused_hand(),
        id_client : c.id,
      }
      this.all[c.id].nameplate = this.all[c.id].hand.nameplate;

      // Set the hand id_client
      this.all[c.id].hand.id_client = c.id;
      
      // Show all hands but my own
      if(c.id == VGT.net.id) this.all[c.id].hand.show();
      else                   this.all[c.id].hand.show();

      // Update the hand color
      this.all[c.id].hand.set_tint(this.all[c.id].color);

    } // End of loop over client list

    // Keep track of me
    this.me = this.all[VGT.net.id];

    // Update the nameplate and colors
    var color = this.all[c.id].color;
    // If the color is too bright (per ITU-R BT.709 definition of luma), go black with the text
    if(get_luma_ox(color) > 0.7) var text_color = 'black';
    else                         var text_color = 'white';
    this.all[c.id].nameplate.set_text(c.name, {fill:text_color}, color);

    // For nameplates, add a drop shadow
    //this.all[c.id].nameplate.text_graphics.filters = [new PIXI.filters.DropShadowFilter({quality:3, distance:0})];
    // new PIXI.filters.BlurFilter({strength:1}), 

    // Finally, using the current VGT.net.clients, rebuild the html table.
    VGT.html.rebuild_client_table();
  }
}
VGT.clients = new _Clients();

/** Class that holds all the game info: things, teams, rules, etc. */
class _Game {

  // Default minimal settings that can be overridden.
  default_settings = {

    background_color : 0xf9ecec, // Tabletop background color

    // Available teams for clients and their colors.
    teams : {
      Observer : 0xFFFFFF,
      Red      : 0xFF2A2A,
      Gray     : 0x808080,
      Yellow   : 0xFFE84B,
      Orange   : 0xFF6600,
      Blue     : 0x5599FF,
      Green    : 0x118855,
      Violet   : 0xD62CFF,
      Brown    : 0x883300,
      Manager  : 0x333333
    },

    // Available game setup modes
    setups : ['Standard'],  // Populates the pull-down menu next to the "New Game" button

    // How long to wait in between housekeepings.
    t_housekeeping   : 100, // For moving pieces around (already locally responsive)
    t_housekeeping_z : 10,  // For asking the server's permission to change z-values (needs to be ~immediate but not spam the server with individual requests)
  }

  constructor(settings) {
    
    // Store the settings, starting with defaults then overrides.
    this.settings = {...this.default_settings, ...settings};

    // Create the big objects that depend on game stuff.
    VGT.game        = this;
    VGT.pixi        = new _Pixi();
    VGT.tabletop    = new _Tabletop();
    VGT.interaction = new _Interaction();
    VGT.sounds      = new _Sounds(sound_list);
    
    // Add elements to the setups combo box
    for (var k in this.settings.setups) {
        var o = document.createElement("option");
        o.value = this.settings.setups[k];
        o.text  = this.settings.setups[k];
        VGT.html.setups.appendChild(o);
    }

    // Start the slow housekeeping
    setInterval(this.housekeeping.bind(this), this.settings.t_housekeeping);

    // Start the fast housekeeping for z-stuff
    setInterval(this.housekeeping_z.bind(this), this.settings.t_housekeeping_z);
  }

  /** Gets the team name from the list index. */
  get_team_name(n) {return Object.keys(this.settings.teams)[n];}

  /** Gets the team index from the name. Returns -1 for "not in list" */
  get_team_index(name) {return Object.keys(this.settings.teams).indexOf(name);  }

  /** Gets the color from the index */
  get_team_color(n) {return this.settings.teams[Object.keys(this.settings.teams)[n]]; }

  /** Function called every quarter second to do housekeeping. */
  housekeeping(e) {

    // If Pixi has finally finished loading, we still haven't connected, 
    // and everything is loaded, connect to server
    if(VGT.pixi.ready && !VGT.net.ready && VGT.pixi.queue.length==0) VGT.net.connect_to_server();

    // If we're rolling dice, do the animation, just before telling everyone
    if(VGT.interaction.rolling) 
      var d;
      for(var n in VGT.interaction.rolling) {

        // Randomize the shown image
        VGT.interaction.rolling[n].randomize_texture_index();

        // Randomize the location around the hand
        d = get_random_location_disc(Math.min(VGT.interaction.rolling[n].width, VGT.interaction.rolling[n].height));
        VGT.interaction.rolling[n].set_xyrs(VGT.interaction.xroll+d.x, VGT.interaction.yroll+d.y, d.r*4);
      }
    // Process net queues.
    VGT.net.process_queues();

  } // End of housekeeping.

  // Function called very often to send the z-queues
  housekeeping_z(e) {
    // Process z queues
    VGT.net.process_q_z_out();
  }

} // End of Game
VGT.Game = _Game;






























