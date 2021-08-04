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
 * Find a JACK comment and fix that too.

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
  hide_controls() {this.controls.hidden = true;}
  show_controls() {this.controls.hidden = false;}
  toggle_controls() {this.controls.hidden = !this.controls.hidden;}
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
      else             cell_name.innerHTML = '<input class="othername" readonly value="'+name+'" />';

      // Now create the team selector if it's me
      var s = document.createElement("select");
      s.id  = String(id); 
      s.onchange = VGT.interaction.onchange_team;

      // Create and append the options
      for (var k in VGT.game.settings.teams) {
          var o = document.createElement("option");
          o.value = k;
          o.text  = k;
          s.appendChild(o);
      }

      // Set the team
      s.selectedIndex = team;

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
    
    this.q_pieces_out = {}; // Queue of outbound information for the next housekeeping.
    this.q_pieces_in  = {}; // Queue of inbound information for the next housekeeping.

    this.q_hands_out  = {}; // Queue of outbound information for the next housekeeping.
    this.q_hands_in   = {}; // Queue of inbound information for the next housekeeping.

    this.nq           = 0;  // Last sent q packet number

    // Defines all the functions for what to do with incoming packets.
    this.setup_listeners();

  } // End of constructor()

  /** Deals with the incoming AND outbound packets. */
  process_queues() {
    if(!this.ready) return;
    var c, p;
    
    /////////////////////////////////////////
    // INBOUND

    // Loop over the pieces in the q
    for(var id in this.q_pieces_in) { 
      c = this.q_pieces_in[id]; // incoming changes for this thing
      p = VGT.pieces.all[id];       // the actual piece object

      // If it's a valid piece
      if(p) {
        
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

        // JACK: Need to send the piece's z-index I think.
        
        // All attributes have 
        //   - their value, e.g. 'ih' for the id of the holder
        //   - the id of the sender, e.g. 'ih.i' for the holder sender
        //   - the sender's incrementing packet index, e.g. 'ih.n'

        // Before deciding what to do with the other attributes, we need to
        // update the holder id if necessary. The server's job is to ensure that it relays the correct holder always.
        // ALSO we should ensure that, if it's either someone else's packet, or it's ours and we 
        // have not since queued a newer packet updating the hold status
        console.log('  c.id', id, 'c.ih', c.ih, 'c.ih.i', c['ih.i'], 'VGT.net.id', VGT.net.id);
        if(c['ih'] != undefined && (c['ih.i'] != VGT.net.id || c['ih.n'] >= p.last_nqs['ih'])) {
          console.log('  setting hold to', c.ih);
          p.hold(c.ih, true, true); // client_id, force, do_not_send)
          console.log('    set to', p.id_client_hold);
        } 

        // Now update the different attributes only if we're not holding it (our hold supercedes everything)
        if(p.id_client_hold != VGT.net.id) {

          if(p.id_client_hold) log('HAY', p.id_client_hold, VGT.net.id, c.id_client_sender, c.nq, p.last_nqs['ts']);

          // Only update the attribute if the updater is NOT us, or it IS us AND there is an nq AND we haven't sent a more recent update
          if(c['x.i']  != VGT.net.id || c['x.n']  >= p.last_nqs['x'])  p.set_xyrs(c.x, undefined, undefined, undefined, false, true);
          if(c['y.i']  != VGT.net.id || c['y.n']  >= p.last_nqs['y'])  p.set_xyrs(undefined, c.y, undefined, undefined, false, true);
          if(c['r.i']  != VGT.net.id || c['r.n']  >= p.last_nqs['r'])  p.set_xyrs(undefined, undefined, c.r, undefined, false, true);
          if(c['s.i']  != VGT.net.id || c['s.n']  >= p.last_nqs['s'])  p.set_xyrs(undefined, undefined, undefined, c.s, false, true);
          if(c['n.i']  != VGT.net.id || c['n.n']  >= p.last_nqs['n'])  p.set_texture_index(c.n, true);
          if(c['ts.i'] != VGT.net.id || c['ts.n'] >= p.last_nqs['ts']) p.select(c.ts, true);

        } // End of we are not holding this.
      
      } // End of valid piece
    
    }; // End of loop over q_pieces_in
    
    // Clear out the piece queue
    this.q_pieces_in = {}; 
  
    // Loop over the hands in the input queue
    for(var id in this.q_hands_in) {
      c = this.q_hands_in[id]; // Incoming changes
      p = VGT.hands.all[id];       // Actual hand

      // Visually update the object
      if(p){

        // Discard info if it's our hand
        if(p.id_client != VGT.net.id) {
          p.set_xyrs(c.x, c.y, c.r, c.s, false, true);
          p.set_texture_index(c.n, true);
        }
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
      log(    'NETS_q_'+String(VGT.net.id), [this.nq, this.q_pieces_out, this.q_hands_out]);
      this.io.emit('q', [this.nq, this.q_pieces_out, this.q_hands_out]);
      this.q_pieces_out = {};
      this.q_hands_out  = {};
    }

  } // End of process_queues()

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

  /** We receive a queue of piece information from the server. */
  on_q(data) { if(!this.ready) return; log('NETR_q_'+String(data[0]), data);
  
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
    this.surface = new PIXI.Graphics().beginFill(0xF4EFEE).drawRect(0, 0, 1, 1);
    this.stage.addChild(this.surface);

    // Set up loading progress indicator, which happens pre PIXI start
    this.loader.onProgress.add(this.loader_onprogress.bind(this));
  
    // Assemble the full image path list
    image_paths.full = [];
    image_paths.root = finish_directory_path(image_paths.root);
    for(var n=0; n<image_paths.list.length; n++) image_paths.full.push(image_paths.root+image_paths.list[n]);

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
        VGT.tabletop.container.addChild(l);

        // Update the layer's coordinates / scale.
        l.x=0; l.y=0; l.rotation=0; l.scale.x=1; l.scale.y=1;
      }

      // Add the hand
      VGT.tabletop.layer_hands.addChild(thing.container);
    }

    // If the thing has a "normal" layer, the settings.layer is an integer >= 0
    else {

      // If the tabletop does not contain this layer yet, create this layer.
      if(!VGT.tabletop.layers[thing.settings.layer]) {
        
        // Create the new layer and add it to the tabletop
        var l = new PIXI.Container();
        VGT.tabletop.layers[thing.settings.layer] = l;
        VGT.tabletop.container.addChild(l);

        // Find the layer_hands and pop it to the top.
        if(VGT.tabletop.layer_hands) {
          VGT.tabletop.container.removeChild(VGT.tabletop.layer_hands);
          VGT.tabletop.container.addChild(VGT.tabletop.layer_hands);
        }

        // Update the layer's coordinates / scale.
        l.x=0; l.y=0; l.rotation=0; l.scale.x=1; l.scale.y=1;
      }

      // Add the thing to the layer
      VGT.tabletop.layers[thing.settings.layer].addChild(thing.container);

    } // End of "normal" layer

    
  }

  loader_oncomplete(e) {
    console.log('loader_oncomplete()', e);

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
      VGT.html.loader.innerHTML = '<h1>Loading: ' + loader.progress.toFixed(0) + '%</h1><br>' + resource.url;
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
    t_transition   : 300, // Time to transition coordinates at full speed
    t_acceleration : 200, // Time to get to full speed   
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
    // We want it to arrive in (game.t_transition) / (16.7 ms) frames
    var a = (delta*16.7)/this.settings.t_transition; // inverse number of transition frames at max velocity 
    var velocity_target = a*(this.target - this.value);
    
    // Adjust the velocity as per the acceleration
    var b = (delta*16.7)/this.settings.t_acceleration; // inverse number of frames to get to max velocity
    var acceleration = b*(velocity_target - this.velocity);
    
    // If we're slowing down, do it FASTER to avoid overshoot
    if(Math.sign(acceleration) != Math.sign(this.velocity)) acceleration = acceleration*2;

    // Increment the velocity
    this.velocity += acceleration;
    this.value    += this.velocity;
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
    this.container.rotation = this.r.value;
    this.container.scale.y  = this.container.scale.x = this.s.value;
    this.vx = this.vy = this.vr = this.vs = 0;

    // center the container within the window
    this.container.x = 0.5*window.innerWidth;  
    this.container.y = 0.5*window.innerHeight;

    this.LAYER_HANDS = -1; // Constant for denoting the hands layer. Normal layers are positive integers.
    this.layers      = []; // List of containers for each layer
  }

  /**
   * Converts x,y from the stage surface (e.g. from a mouse event) to tabletop coordinates.
   * @param {number} x 
   * @param {number} y 
   * @returns 
   */
  xy_stage_to_tabletop(x,y) {
    
    // Undo the shift of the table top center
    var x1 = x - this.container.x + (this.container.pivot.x*Math.cos(this.container.rotation) - this.container.pivot.y*Math.sin(this.container.rotation))*this.container.scale.x;
    var y1 = y - this.container.y + (this.container.pivot.x*Math.sin(this.container.rotation) + this.container.pivot.y*Math.cos(this.container.rotation))*this.container.scale.x;
    
    // Undo the rotation and scale of the tabletop
    return rotate_vector(
      [x1/this.container.scale.x,
       y1/this.container.scale.y],
         -this.container.rotation);
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
    this.s.animate(delta);

    // Set the actual position, rotation, and scale
    this.container.pivot.x  = -this.x.value;
    this.container.pivot.y  = -this.y.value;
    this.container.rotation =  this.r.value;
    this.container.scale.x  =  this.s.value;
    this.container.scale.y  =  this.s.value;

    // Update the mouse position
    if(Math.abs(this.x.value-this.x.target) > 0.1/this.s.value
    || Math.abs(this.y.value-this.y.target) > 0.1/this.s.value
    || Math.abs(this.r.value-this.r.target) > 0.001/this.s.value
    || Math.abs(this.s.value-this.s.target) > 0.001/this.s.value) VGT.interaction.onpointermove(VGT.interaction.last_pointermove_e);
  }

  /**
   * Returns an object with x, y, r, and s.
   */
  get_xyrs() {return {x:this.x.value, y:this.y.value, r:this.r.value, s:this.s.value}}

  /** 
  * Sets the target x,y,r,s for the sprite.
  * 
  */
  set_xyrs(x,y,r,s,immediate) { 

    // Now for each supplied coordinate, update and send
    if(x!=undefined && x != this.x.target) {this.x.set(x, immediate);}// if(immediate) {this.container.pivot.x = -x;} }
    if(y!=undefined && y != this.y.target) {this.y.set(y, immediate);}// if(immediate) {this.container.pivot.y = -y;} }
    if(r!=undefined && r != this.r.target) {this.r.set(r, immediate);}// if(immediate) {this.container.r       =  r;} }
    if(s!=undefined && s != this.s.target) {this.s.set(s, immediate);}// if(immediate) {this.container.scale.x = s; this.container.scale.y = s}; }
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
    this.set_xyrs(
      undefined, undefined,
      this.r.target + dr,
      undefined);
    if(VGT.clients && VGT.clients.me && VGT.clients.me.hand) VGT.clients.me.hand.set_xyrs(undefined,undefined,-this.r.target);
  }
  rotate_left()  {this.rotate(-this.settings.r_step*Math.PI/180.0);}
  rotate_right() {this.rotate( this.settings.r_step*Math.PI/180.0);}

  zoom_in() {
    if(this.s.target*this.settings.s_step > this.settings.s_max) return;
    this.set_xyrs(
      undefined, undefined, undefined,
      this.s.target * this.settings.s_step);
  }
  zoom_out() {
    if(this.s.value*this.settings.s_step < this.settings.s_min) return;
    this.set_xyrs(
      undefined, undefined, undefined,
      this.s.value / this.settings.s_step);
  }
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
      ShiftKeyADown:      this.actions.rotate_left,
      KeyQDown:           this.actions.rotate_left,
      ShiftArrowLeftDown: this.actions.rotate_left,
      ShiftNumpad4Down:   this.actions.rotate_left,
      Numpad7Down:        this.actions.rotate_left,

      ShiftKeyDDown:      this.actions.rotate_right,
      KeyEDown:           this.actions.rotate_right,
      ShiftArrowRightDown:this.actions.rotate_right,
      ShiftNumpad6Down:   this.actions.rotate_right,
      Numpad9Down:        this.actions.rotate_right,

      // Zoom
      EqualDown:          this.actions.zoom_in,
      NumpadAddDown:      this.actions.zoom_in,
      MinusDown:          this.actions.zoom_out,
      NumpadSubtractDown: this.actions.zoom_out,

      // Cycle images
      SpaceDown: this.increment_selected_textures,
    }

    // Basic shapes for general-purpose use
    this.ellipse   = new PIXI.Ellipse(0,0,1,1);   // center x, y, x-radius, y-radius
    this.circle    = new PIXI.Circle(0,0,1);      // center x, y, radius
    this.rectangle = new PIXI.Rectangle(0,0,1,1); // top left x, y, width, height

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
    var layer, container, x0, y0;

    // Loop over the layers from top to bottom
    for(var n=VGT.tabletop.layers.length-1; n>=0; n--) {
      layer = VGT.tabletop.layers[n];
      
      // Loop over the things in this layer from top to bottom.
      for(var m=layer.children.length-1; m>=0; m--) {

        // container of thing
        container = layer.children[m]; 
       
        // Undo the container shift and scale
        x0 = (x-container.x)/container.scale.x; 
        y0 = (y-container.y)/container.scale.y;

        // Undo the container rotation
        [x0,y0] = rotate_vector([x0,y0],-container.rotation);

        // Get the scaled bounds and test
        if(container.getLocalBounds().contains(x0,y0)) return container.thing;
      
      } // End of things in layer loop

    } // End of all layers loop
    return null;
  }

  // Pointer touches the underlying surface.
  onpointerdown(e) {
    this.last_pointerdown = e;

    // Get the tabletop coordinates
    var v = VGT.tabletop.xy_stage_to_tabletop(e.clientX, e.clientY);
    
    // Save the information
    this.button = e.button;

    // Location of the down in the two coordinate systems
    this.xd_client = e.clientX;
    this.yd_client = e.clientY;
    this.xd_tabletop = v[0];
    this.yd_tabletop = v[1];

    // TEST: Move the pivot to the pointer and compensate with the position.
    //VGT.tabletop.container.x = v[0];
    //VGT.tabletop.set_xyrs(VGT.tabletop.x-v[0],undefined,undefined,undefined,true);

    // Location of the tabletop at down.
    this.tabletop_xd = -VGT.tabletop.container.pivot.x;
    this.tabletop_yd = -VGT.tabletop.container.pivot.y;

    // Find the top thing under the pointer
    log('onpointerdown()', [e.clientX, e.clientY], '->', v, e.button, this.tabletop_xd, this.tabletop_yd);

    // Find a thing under the pointer if there is one.
    var thing = this.find_thing_at(v[0],v[1]);

    // If it's not null, handle this
    if(thing != null) {
      
      // Send to top or bottom, depending on button etc
      if     (e.button == 0) thing.send_to_top();
      else if(e.button == 2) thing.send_to_bottom();
      
      // If we're not holding shift and it's not already a thing we've selected, 
      // unselect everything.
      if(!e.shiftKey && thing.team_select != VGT.clients.me.team) VGT.things.unselect_all(VGT.clients.me.team);
      
      // If we're holding shift and it's already selected, deselect
      if(e.shiftKey && thing.team_select == VGT.clients.me.team) thing.unselect()

      // Otherwise, select it and hold everything.
      else {
        thing.select(VGT.clients.me.team); 
        VGT.things.hold_selected(VGT.net.id, false);
      }

      // Holding, so close fist
      if(VGT.clients && VGT.clients.me && VGT.clients.me.hand) VGT.clients.me.hand.close();

    } // End of "found thing under pointer"

    // Otherwise, we have hit the table top. unselect everything
    else VGT.things.unselect_all(VGT.clients.me.team);
  }

  // Pointer has moved around.
  onpointermove(e) { //log('onpointermove()', e.button);
    this.last_pointermove_e = e;
    
    // Get the tabletop coordinates
    var v = VGT.tabletop.xy_stage_to_tabletop(e.clientX, e.clientY);
    
    // Save the coordinates of the move
    this.xm_client = e.clientX;
    this.ym_client = e.clientY;
    this.xm_tabletop = v[0];
    this.ym_tabletop = v[1];

    // Move my hand
    if(VGT.clients && VGT.clients.me && VGT.clients.me.hand) {
      VGT.clients.me.hand.set_xyrs(this.xm_tabletop, this.ym_tabletop, undefined, undefined, true);
    }

    // Only do stuff if the mouse is down
    if(this.button >= 0) {
      
      // If we have held stuff, move them around.
      if(VGT.things.held[VGT.net.id]) {
        
        // loop over our held things and move them.
        var thing;
        for(var k in VGT.things.held[VGT.net.id]) {
          thing = VGT.things.held[VGT.net.id][k];
          
          var dx0 = this.xm_tabletop - this.xd_tabletop;
          var dy0 = this.ym_tabletop - this.yd_tabletop;
          var dx = -dx0*Math.cos(VGT.tabletop.r) + dy0*Math.sin(VGT.tabletop.r);
          var dy =  dx0*Math.cos(VGT.tabletop.r) + dy0*Math.sin(VGT.tabletop.r);

          // Do the actual move, immediately
          thing.set_xyrs(
            thing.xh + dx0,
            thing.yh + dy0,
            undefined, undefined, true);
        }
      } 
      
      // Otherwise pan the board.
      else {
        var dx0 = (this.xm_client - this.xd_client)/VGT.tabletop.s.value;
        var dy0 = (this.ym_client - this.yd_client)/VGT.tabletop.s.value;
        var dx =  dx0*Math.cos(VGT.tabletop.r.value) + dy0*Math.sin(VGT.tabletop.r.value);
        var dy = -dx0*Math.sin(VGT.tabletop.r.value) + dy0*Math.cos(VGT.tabletop.r.value);
        
        VGT.tabletop.set_xyrs(
          this.tabletop_xd + dx,
          this.tabletop_yd + dy, 
          undefined, undefined, true); // immediate
      }
    }

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
    this.xu_tabletop = v[0];
    this.yu_tabletop = v[1];

    // Location of tabletop center at up.
    this.tabletop_xu = -VGT.tabletop.container.pivot.x;
    this.tabletop_yu = -VGT.tabletop.container.pivot.y;

    // Save the information
    this.button = -1;

    // Stop holding VGT.things
    VGT.things.release_all(VGT.net.id, false, false);

    // Releasing, so open fist
    if(VGT.clients && VGT.clients.me && VGT.clients.me.hand) VGT.clients.me.hand.open();
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
    console.log('  ', VGT.tabletop.container.x, window.innerWidth*0.5);
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
      







/////////////////////////////
// THINGS                  //
/////////////////////////////

// Basic interactive object
class _Thing {
  
  // Default settings for a new object
  default_settings = {
    'texture_paths' : [['nofile.png']], // paths relative to the root, with each sub-list being a layer (can animate), e.g. [['a.png','b.png'],['c.png']]
    'texture_root'  : '',               // Sub-folder in the search directories (path = image_paths.root + texture_root + path), e.g. images/
    'shape'         : 'rectangle',      // Hitbox shape.
    'type'          : null,             // User-defined types of thing, stored in this.settings.type. Could be "card" or 32, e.g.
    'sets'          : [],               // List of other sets to which this thing can belong (pieces, hands, ...)

    // Targeted x, y, r, and s
    'x' : 0,
    'y' : 0, 
    'r' : 0,
    's' : 1,

    // Layer
    'layer' : 0,
  };

  constructor(settings) {
    this.type = 'Thing';

    // This piece is not ready yet, until initializing / doing pixi stuff later.
    this.ready = false;

    // Store the settings, starting with defaults then overrides.
    this.settings = {...this.default_settings, ...settings};
    
    // Make sure the paths end with a /
    this.settings.texture_root = finish_directory_path(this.settings.texture_root);

    // Add to a user-supplied sets
    for(var n in this.settings.sets) this.settings.sets[n].add_thing(this);

    // Net id of who is selecting and controlling
    this.team_select    = -1; // Default is "unselected"
    this.id_client_hold = 0;  // Server / no client is 0

    // Shape of hitbox
    this.shape = eval('VGT.interaction.'+this.settings.shape);

    // Targeted location and geometry. Current locations are in the container.x, container.y, container.rotation, and container.scale.x
    this.x = this.settings.x;
    this.y = this.settings.y;
    this.r = this.settings.r;
    this.s = this.settings.s;

    // Current velocities
    this.vx = 0;
    this.vy = 0;
    this.vr = 0;
    this.vs = 0;

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

    // Everything is added to the VGT.things list
    VGT.things.add_thing(this);

    // Add this to the pixi instance (or queue)
    // The pixi-related stuff must be called after pixi loads.
    VGT.pixi.add_thing(this);

  } // End of constructor.

  /** Sets the tint of all the textures */
  set_tint(color) { for(var n in this.sprites) this.sprites[n].tint = color; }
  get_tint()      { return this.sprites[0].tint; }

  _initialize_pixi() {
    
    // Make sure the paths end with a /
    image_paths.root = finish_directory_path(image_paths.root);
    
    // Keep a list of texture lists for reference, one texture list for each layer. 
    this.textures = [];
    var path; // reused in loop
    for(var n=0; n<this.settings.texture_paths.length; n++) {
      
      // One list of frames per layer; these do not have to match length
      this.textures.push([]); 
      for(var m = 0; m<this.settings.texture_paths[n].length; m++) {
        
        // Add the actual texture object
        path = image_paths.root + this.settings.texture_root + this.settings.texture_paths[n][m];
        if(VGT.pixi.resources[path]) this.textures[n].push(VGT.pixi.resources[path].texture);
        else throw 'No resource for '+ path;
      }
    }
      
    // Create a container for the stack of sprites
    this.container = new PIXI.Container();
    this.sprites   = [];
    
    // Shortcuts
    this.container.thing = this;
    
    // Loop over the layers, creating one sprite per layer
    for(var n in this.textures) {

      // Create the layer sprite with the zeroth image by default
      var sprite = new PIXI.Sprite(this.textures[n][0])
      
      // Center the image
      sprite.anchor.set(0.5, 0.5);
    
      // Keep it in our personal list, and add it to the container
      this.sprites.push(sprite);
    }

    // Add the sprites to the container (can be overloaded)
    this.fill_container();

    // This piece is ready for action.
    this.ready = true;

    // Update the coordinates
    this.animate_xyrs();
  }

  /**
   * Sets the controller id. 0 means no one is in control (server).
   */
  hold(id_client, force, do_not_send) { // log('thing.hold()', this.id_thing, id_client, force, this.id_client_hold);

    // If the id is undefined (used by process_queues), there is no change, 
    // or it is already being held by any valid client (and no force), do nothing.
    if(id_client == undefined || id_client == this.id_client_hold
    || Object.keys(VGT.clients.all).includes(String(this.id_client_hold))
    && !force) return;

    // If it's the server holding, this is equivalent to a release
    else if(id_client == 0) this.release(id_client, force, do_not_send);

    // Otherwise, if it's not being held already (or the client is invalid), or we're forcing hold it.
    else if(this.id_client_hold == 0 || VGT.clients.all[this.id_client_hold] == undefined || force) {
      
      // If it is already in a held list, delete that
      if(VGT.things.held[this.id_client_hold]) delete VGT.things.held[this.id_client_hold][this.id_thing];

      // Update the holder
      this.id_client_hold = id_client;

      // Remember the initial coordinates
      this.xh = this.x;
      this.yh = this.y;
      this.rh = this.r;
      this.sh = this.s;    

      // Make sure there is an object to hold the held things for this id.
      if(VGT.things.held[id_client] == undefined) VGT.things.held[id_client] = {};

      // Control it
      VGT.things.held[id_client][this.id_thing] = this;

      // If we're supposed to send an update, make sure there is an entry in the queue
      this.update_q_out('id_client_hold', 'ih', do_not_send);
    } 
  } // End of hold

  /**
   * Uncontrols a thing.
   */
  release(id_client, force, do_not_send) { //log('thing.release()', this.id_thing, id_client, force, do_not_send, this.id_client_hold);

    // If we're already not holding
    // or there is a valid holder that is different from the requestor (and we aren't overriding this)
    // do nothing.
    if(this.id_client_hold == 0
    || Object.keys(VGT.clients.all).includes(String(this.id_client_hold))
    && this.id_client_hold != id_client
    && !force) return;

    // Remove it from the list
    delete VGT.things.held[this.id_client_hold][this.id_thing];

    // If it was me holding it, remember the time I let go.
    if(this.id_client_hold == VGT.net.id) this.t_last_hold = Date.now();
    this.id_client_hold = 0;

    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('id_client_hold', 'ih', do_not_send);
  }

  /**
   * Selects the thing visually and adds it to the approriate list of selected things.
   */
  select(team, do_not_send) { //log('thing.select()', this.id_thing, team, do_not_send, this.team_select, this.id_client_hold);

    // If team is not specified (used by process_queues()), there is no change, or
    // it is being held by someone who is not on the same team, do nothing.
    if(team == undefined || team == this.team_select 
    || this.id_client_hold && VGT.clients.all[this.id_client_hold] 
       && VGT.clients.all[this.id_client_hold].team != team) return;

    // If team is -1, unselect it and poop out
    if(team < 0) return this.unselect(do_not_send);

    // If there is any team selecting this already, make sure to unselect it to remove it
    // from other lists! (Do not send a network packet for this).
    if(this.team_select != -1) this.unselect(true); 

    // Keep track of the selected team.
    this.team_select = team;

    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('team_select', 'ts', do_not_send);

    // Make sure there is an object to hold selected things for this id
    if(VGT.things.selected[team] == undefined) VGT.things.selected[team] = {};

    // Select it
    VGT.things.selected[team][this.id_thing] = this;
    this.container.filters = [new __filters.GlowFilter({
      distance:20,
      outerStrength:5,
      innerStrength:1,
      color:VGT.game.get_team_color(team),
      quality:0.1,
    })];
  } // End of select()

  /**
   * Unselects thing. This will not unselect anything held by someone else.
   */
  unselect(do_not_send) { //log('thing.unselect()', this.id_thing, this.selected_id);

    // If we're already unselected, or it is held by someone do nothing
    if(this.team_select < 0 && this.id_client_hold) return;

    // Remove it from the list
    if(VGT.things.selected[this.team_select] &&
       VGT.things.selected[this.team_select][this.id_thing])
        delete VGT.things.selected[this.team_select][this.id_thing];
    this.team_select = -1;

    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('team_select', 'ts', do_not_send);

    // Unglow it
    this.container.filters = [];

  } // End of unselect()

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

    // If we are only updating what exists, look for the key
    if(only_if_exists) {

      // If the piece or qkey doesn't exist already, we're done!
      if(!q_out[id])       return;
      if(!q_out[id][qkey]) return;
    }

    // Otherwise, make sure the queue has an object to hold this data
    else if(!q_out[id]) q_out[id] = {};

    // Update the attribute
    q_out[id][qkey] = this[key];

    // Remember the index that will be attached to this on the next process_qs
    this.last_nqs[qkey] = VGT.net.nq+1;
  }

  // Returns the z-order index (pieces with lower index are behind this one)
  get_z_index() {
    // Get the parent of the container
    var parent = this.container.parent;
    
    // If it exists, find the child.
    if(parent) return parent.children.indexOf(this.container);
    else       return -1;
  }

  // Set the z-order index
  // JACK: Add this info (z) to queue and handle with rest.
  set_z_index(n, do_not_send) {
    // Get the parent of the container
    var parent = this.container.parent;
    
    // Get the current index
    var n_old = this.get_z_index();

    // If it's in the list, pop it out and stick it where it belongs
    if(n_old >= 0) {

      // Remove it
      var c = parent.removeChildAt(n_old);

      // Make sure we have a valid index
      if(n > parent.children.length) n = parent.children.length;
      if(n < 0)                      n = 0;

      // stuff it back in
      parent.addChildAt(c, n);
    }
  }

  send_to_top(do_not_send) {

    // Get the parent of the container
    var parent = this.container.parent;
    
    // If it exists, send it to the top of the parent's list.
    if(parent) this.set_z_index(parent.children.length-1, do_not_send);
  }

  send_to_bottom(do_not_send) {this.set_z_index(0, do_not_send);}

  /**
   * Fills the container with all the sprites. This can be overloaded for more complex
   * Things.
   */
  fill_container() {
    for(var i=0; i<this.sprites.length; i++) 
      this.container.addChild(this.sprites[i]);
  }

  get_dimensions() {
    var w = 0, h = 0;

    // Loop over the layers, keeping the largest dimensions
    for(var l=0; l<this.sprites.length; l++) {
      var s = this.sprites[l];
      if(s.width  > w) w = s.width;
      if(s.height > h) h = s.height;
    }
    return [w,h];
  }

  /**
   * Sets the texture index and resets the clock.
   */
  set_texture_index(n, do_not_send) {
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
    //log('_Piece.set_texture_index()', this._n, do_not_send);

    // If we're supposed to send an update, make sure there is an entry in the queue
    this.update_q_out('_n', 'n', do_not_send);

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

  /**
   * Returns an object with x, y, r, and s.
   */
  get_xyrs() {return {x:this.x, y:this.y, r:this.r, s:this.s}}

  /** 
   * Sets the target x,y,r,s for the sprite.
   * 
   */
  set_xyrs(x,y,r,s,immediate,do_not_send) { 

    // Now for each supplied coordinate, update and send
    if(x!=undefined && x != this.x) {this.x = x; if(immediate) this.container.x = x; this.update_q_out('x', 'x', do_not_send);}
    if(y!=undefined && y != this.y) {this.y = y; if(immediate) this.container.y = y; this.update_q_out('y', 'y', do_not_send);}
    if(r!=undefined && r != this.r) {this.r = r; if(immediate) this.container.r = r; this.update_q_out('r', 'r', do_not_send);}
    if(s!=undefined && s != this.s) {
      this.s = s; if(immediate) {this.container.scale.x = s; this.container.scale.y = s}; 
      this.update_q_out('s', 's', do_not_send);
    }
    this.t_last_move = Date.now();
  }

  /**
   * Updates the actual sprite location / geometry via the error decay animation, 
   * and should be called once per frame.
   */
  animate_xyrs(delta) { if(!delta) delta = 1;
    
    // Don't do anything until it's been initialized / added to pixi.
    if(!this.ready) {return;}

    //if(VGT.pixi.N_loop == 1 && this.id_thing > 2) log('N_loop ==',VGT.pixi.N_loop,':', this.vr, this);

    // Use the current location and target location to determine
    // the target velocity. Target velocity should be proportional to the distance.
    // We want it to arrive in (game.t_transition) / (16.7 ms) frames
    var a = (delta*16.7)/VGT.game.settings.t_transition; // inverse number of frames at max velocity 
    var vx_target = a*(this.x - this.container.x);
    var vy_target = a*(this.y - this.container.y);
    var vr_target = a*(this.r - this.container.rotation);
    var vs_target = a*(this.s - this.container.scale.x);

    // Adjust the velocity as per the acceleration
    var b = (delta*16.7)/VGT.game.settings.t_acceleration; // inverse number of frames to get to max velocity
    var Ax = b*(vx_target - this.vx);
    var Ay = b*(vy_target - this.vy);
    var Ar = b*(vr_target - this.vr);
    var As = b*(vs_target - this.vs);
    
    // If we're slowing down, do it MORE to avoid overshoot
    if(Math.sign(Ax)!=Math.sign(this.vx)) Ax = Ax*2;
    if(Math.sign(Ay)!=Math.sign(this.vy)) Ay = Ay*2;
    if(Math.sign(Ar)!=Math.sign(this.vr)) Ar = Ar*2;
    if(Math.sign(As)!=Math.sign(this.vs)) As = As*2;

    this.vx += Ax;
    this.vy += Ay;
    this.vr += Ar;
    this.vs += As;

    // Set the actual position, rotation, and scale
    this.container.x        += this.vx;
    this.container.y        += this.vy;
    this.container.rotation += this.vr;
    this.container.scale.x  += this.vs;
    this.container.scale.y  += this.vs;
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

  /** Releases all things with the supplied client id. */
  release_all(id_client, force, do_not_send) { log('_Things.release_all()', id_client, this.held[id_client]);
    
    // If we have a held list for this client id
    if(this.held[id_client]) {
      
      // Loop over the list and reset the id_client_hold
      for(var id_thing in this.held[id_client]) this.held[id_client][id_thing].release(id_client, force, do_not_send);

      // Delete the list
      delete this.held[id_client];
    }
  }

  /** Adds a _Thing to the list, and queues it for addition to the table. */
  add_thing(thing) {

    // Assign the thing id, and add it to the global lookup table
    thing.id_thing = this.all.length;
    this.all.push(thing);
  }

  /**
   * Sets up the drag for all selected things for this team
   * @param {int} team 
   */
  hold_selected(id_client, force, do_not_send) { log('VGT.things.hold_selected()', id_client, force);

    // Loop over the selected things and hold whatever isn't already held by someone else.
    for(var k in this.selected[VGT.clients.all[id_client].team]) 
      this.selected[VGT.clients.all[id_client].team][k].hold(id_client, force, do_not_send);
  }

  /**
   * unselect all things for this team.
   */
  unselect_all(team) { log('VGT.things.unselect_all()', team);

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
class _Pieces { constructor() {this.all = [];}

  // Adds a thing to the list, and queues it for addition to the table. 
  add_thing(piece) {
    piece.id_piece = this.all.length;
    this.all.push(piece);
  }
}
VGT.pieces = new _Pieces();
VGT.Piece  = _Piece;

/** Floating hand on top of everything. */
class _Hand extends _Thing {

  constructor() {

    // Create the settings for a hand
    var settings = {
      texture_paths : [['hand.png', 'fist.png']], // paths relative to the root
      texture_root     : 'hands',                   // Image root path.
      layer         : VGT.tabletop.LAYER_HANDS,       // Hands layer.
      t_pause       : 1200,                       // How long to wait since last move before faiding out.
      t_fade        : 500,                        // Time to fade out.
      sets          : [VGT.hands],                    // Other sets it belongs to
    }

    // Run the usual thing initialization
    super(settings);

    // Remember the type
    this.type = 'Hand';

    // id of client this hand belongs to
    this.id_client = 0;

    log('new _Hand()', this.vx, this.x); VGT.pixi.N_loop = 0;
  }

  /** Closes / opens the hand */
  close() {this.set_texture_index(1);}
  open()  {this.set_texture_index(0);}
  is_closed() {return this._n == 1;}
  is_open()   {return this._n == 0;}

  /** Sets t_last_move to the current time to show the hand. */
  ping() {this.t_last_move = Date.now();}

  /** Other animations, like sprite image changes etc, to be overloaded. */
  animate_other(delta) { if(!delta) delta = 1;
    
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
    for(var l in this.all) { 

      // If we found a free one, use it
      if(this.all[l].id_client == 0) return this.all[l];

    } // End of loop over hands
    
    // If we haven't returned yet, we need a new one
    return new _Hand();
  }

  /** Frees all hands from ownership */
  free_all_hands() { for(var l in this.all) this.all[l].id_client = 0; }

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
      }

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

    // Finally, using the current VGT.net.clients, rebuild the html table.
    VGT.html.rebuild_client_table();
  }
}
VGT.clients = new _Clients();

/** Class that holds all the game info: things, teams, rules, etc. */
class _Game {

  // Default minimal settings that can be overridden.
  default_settings = {

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
    setups : ['Standard'],

    // How long to wait in between housekeepings.
    t_housekeeping : 250,
    t_hold_block   : 550,
    t_transition   : 300, // Time to transition coordinates at full speed
    t_acceleration : 200, // Time to get to full speed    
  }

  constructor(settings) {
    
    // Store the settings, starting with defaults then overrides.
    this.settings = {...this.default_settings, ...settings};

    // Create the big objects that depend on game stuff.
    VGT.pixi        = new _Pixi();
    VGT.tabletop    = new _Tabletop();
    VGT.interaction = new _Interaction();
    VGT.sounds      = new _Sounds(sound_list);
    VGT.game        = this;

    // Add elements to the setups combo box
    for (var k in this.settings.setups) {
        var o = document.createElement("option");
        o.value = this.settings.setups[k];
        o.text  = this.settings.setups[k];
        VGT.html.setups.appendChild(o);
    }

    // Start the quarter-second housekeeping
    setInterval(this.housekeeping.bind(this), this.settings.t_housekeeping);
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

    // Process net queues.
    VGT.net.process_queues();

  } // End of housekeeping.

} // End of Game
VGT.Game = _Game;






























