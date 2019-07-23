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


//// OPTIONS

var stream_interval_ms = 150;   // how often to send a stream update (ms)
var update_interval_ms = 10000; // how often to send a full update (ms)
var draw_interval_ms   = 10;    // how often to draw the canvas (ms)

if(!window.chrome || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  document.getElementById("everything").innerHTML = "Sorry, this requires the non-mobile Chrome web browser to run.<br><br>xoxoxo,<br>Jack";}


/**
 * USEFUL FUNCTIONS
 */

// get the user's selected team number
function get_team_number()  {return document.getElementById("teams").selectedIndex;}
function set_team_number(n) {return document.getElementById("teams").selectedIndex = n;}

// get the user's name
function get_name()     {return document.getElementById("name").value;}
function set_name(name) {return document.getElementById("name").value = name;}

// see if the peak box is checked
function get_peak() {return document.getElementById("peak").checked;}

// returns default_a if a is undefined
function or_default(a, default_a) {
  if(a !== undefined) return a;
  return default_a;
}

/**
 * Rotates the supplied x,y vector by angle r_deg, 
 * returning a dictionary with the rotated 'x' and 'y'.
 * @param {float} x x coordinate to rotate
 * @param {float} y y coordinate to rotate
 * @param {float} r angle with which to rotate (degrees)
 */
function rotate_vector(x,y,r) {
  // convert to radians
  var rr = r*Math.PI/180.0;

  // rotate coordinates
  var cos_r = Math.cos(rr);
  var sin_r = Math.sin(rr);
  var x2 =  cos_r*x + sin_r*y;
  var y2 = -sin_r*x + cos_r*y;

  return({x:x2, y:y2});
}

// randomizes the order of the supplied array (in place)
function shuffle_array(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// turns integer into location (in units of basis vectors), hexagonally spiralling out from the center
function hex_spiral(n) {

  // return the origin to avoid explosions if n=0
  if(n==0) return {n:0, m:0}

  // get the index of the shell
  s = Math.ceil(Math.sqrt(0.25+n/3.0)-0.5);

  // zero index of this shell
  n0 = 6*s*(s-1)/2+1;

  // depending which of the 6 legs we're on get the vectors
  leg = Math.floor((n-n0)/s);
  switch(leg) {
    case 0: x0 =  s; y0 =  0; dx0 = -1;  dy0 =  1; break;
    case 1: x0 =  0; y0 =  s; dx0 = -1;  dy0 =  0; break;
    case 2: x0 = -s; y0 =  s; dx0 =  0;  dy0 = -1; break;
    case 3: x0 = -s; y0 =  0; dx0 =  1;  dy0 = -1; break;
    case 4: x0 =  0; y0 = -s; dx0 =  1;  dy0 =  0; break;
    case 5: x0 =  s; y0 = -s; dx0 =  0;  dy0 =  1; break;
  }

  // which element of the 6 legs we're on
  i = n-n0-leg*s;

  // assemble the grid snap
  return {n:x0+i*dx0, m:y0+i*dy0};
}

// returns a random integer over the specified bounds
function rand_int(m,n) { return Math.floor(Math.random()*(1+n-m))+m; }

// returns true if (x,y) is below / to the left of the line defined by (x1,y1) and (x2,y2)
function is_below_line(x,y, x1,y1, x2,y2) {

  // if the slope is infinite
  if(x1==x2) return x < x1;
  
  // if the slope is zero
  if(y1==y2) return y < y1;
  
  // see if it's below the line (depends on sign of slope)
  if( (y2-y1)/(x2-x1) > 0 ) return ( y < (y2-y1)*(x-x1)/(x2-x1) + y1 && x > (x2-x1)*(y-y1)/(y2-y1) + x1 );
  else                      return ( y < (y2-y1)*(x-x1)/(x2-x1) + y1 && x < (x2-x1)*(y-y1)/(y2-y1) + x1 );
}




///////////////////
// PIECE OBJECT
///////////////////

// Constructor
function PIECE(board, piece_index, image_paths, private_image_paths) {

  // by default, use the same set of image paths
  private_image_paths = or_default(private_image_paths, image_paths);
  
  console.log("Adding piece", String(piece_index), String(image_paths), String(private_image_paths))

  // equivalent of storing object properties (or defaults)
  this.board               = board;
  this.piece_index         = piece_index;
  this.image_paths         = image_paths;
  this.private_image_paths = private_image_paths;
  this.owners              = this.board.new_piece_owners;
  
  // automatic defaults
  this.x_target         = this.board.new_piece_x_target;
  this.y_target         = this.board.new_piece_y_target;
  this.r_target         = this.board.new_piece_r_target;
  this.r_step           = this.board.new_piece_r_step;
  
  this.x = this.board.new_piece_x;
  this.y = this.board.new_piece_y;
  this.r = 2*(180-360*Math.random()); // snazzy first load
  
  this.t_fade_ms        = this.board.new_piece_t_fade_ms;
  this.snap_index       = this.board.new_piece_snap_index;
  this.movable_by       = this.board.new_piece_movable_by;
  this.peakable_by      = this.board.new_piece_peakable_by;
  this.active_image     = this.board.new_piece_active_image;
  this.alpha            = this.board.new_piece_alpha;
  
  // where it belongs in the box
  this.box_x = this.board.new_piece_box_x;
  this.box_y = this.board.new_piece_box_y;
  
  // Whether or not the rotation / zoom affects the piece.
  this.rotates_with_canvas = this.board.new_piece_rotates_with_canvas;
  this.zooms_with_canvas   = this.board.new_piece_zooms_with_canvas;
  
  // set the default physical shape
  switch(this.board.new_piece_physical_shape) {
    case "ellipse":       
      this.physical_shape = this.ellipse; 
      break;
    case "rectangle":     
      this.physical_shape = this.rectangle; 
      break;
    case "outer_circle":  
      this.physical_shape = this.outer_circle;
      break;
    case "inner_circle":  
      this.physical_shape = this.inner_circle;
      break;
  }
  
  // images associated with this piece
  this.images         = [];
  this.private_images = [];

  // loop over the paths and load up the images
  for (var i=0; i<this.image_paths.length; i++) {

    // make sure we haven't loaded it already
    if( this.image_paths[i] in this.board.images ) {
      
      // use the existing image
      this.images.push(this.board.images[this.image_paths[i]]);
    
    // otherwise we need to load it
    } else {
    
      // tell Jack that we're loading it...
      console.log("  loading /images/"+this.image_paths[i]);

      // create the image object
      I = new Image();
      this.images.push(I);
      I.src = '/images/'+this.image_paths[i];
      
      // store this image for the future
      this.board.images[this.image_paths[i]] = I;
    }
  }
  
  // loop over the private image paths and load up the images
  for (var i=0; i<this.private_image_paths.length; i++) {

    // make sure we haven't loaded it already
    if( this.private_image_paths[i] in this.board.images ) {
      
      // use the existing image
      this.private_images.push(this.board.images[this.private_image_paths[i]]);
    
    // otherwise we need to load it
    } else {
    
      // tell Jack that we're loading it...
      console.log("  loading /images/"+this.private_image_paths[i]);

      // create the image object
      I = new Image();
      this.private_images.push(I);
      I.src = '/images/'+this.private_image_paths[i];
      
      // store this image for the future
      this.board.images[this.private_image_paths[i]] = I;
    }
  }

  // current velocity of motion (to add momentum)
  this.vx = 0;
  this.vy = 0;
  this.vr = 0;

  // last time this piece was moved / drawn
  this.t_previous_draw = Date.now();
  this.t_previous_move = this.t_previous_draw;
  
  // keep track of the previous target to reduce reduntant server info
  this.previous_x = this.x_target;
  this.previous_y = this.y_target;
  this.previous_r = this.r_target;
  this.previous_active_image = this.active_image;
}

// Methods
PIECE.prototype.send_update     = function() {

  // sends information about the piece
  console.log('sending "u"', [this.piece_index], [this.x_target], [this.y_target], [this.r_target], [this.active_image]);
  our_socket.emit('u', [this.piece_index], [this.x_target], [this.y_target], [this.r_target], [this.active_image]);
}

// Bring the piece to the top of the pile
PIECE.prototype.send_to_top = function() {

  // find this piece;
  this.board.pop_piece(this.board.pieces.indexOf(this));
  this.board.push_piece(this);
  
  return this;
}

// Put it in its box;
PIECE.prototype.put_away = function() {
  
  this.set_target(this.board.box_x+this.box_x, this.board.box_y+this.box_y, 0);
  return this;
}

// set the image by index
PIECE.prototype.set_active_image = function(i) {
  this.active_image = i;
  return this;
}

// Increment the active image
PIECE.prototype.increment_active_image = function() {
  this.active_image++;
  if(this.active_image >= this.images.length) this.active_image = 0;
}

// set the target location and rotation all then rotated by angle
PIECE.prototype.set_target = function(x,y,r,angle,disable_snap,immediate) {
  
  // Set default argument values
  r         = or_default(r, null);
  angle     = or_default(angle, null);
  immediate = or_default(immediate, false);
  
  // if we're supposed to transform the coordinates
  if(angle != null) {
    v = rotate_vector(x, y, angle);
    r = r-angle;
    x = v.x;
    y = v.y;
  }
  
  // default is to snap
  disable_snap = or_default(disable_snap, false);
  
  // if we're supposed to snap
  if(this.snap_index != null && !disable_snap) {
    
    // apply the snap (Note I did NOT say "Awww SNAP". Wait. Shit.)
    snapped = this.board.snap_grids[this.snap_index].get_snapped_coordinates(x,y);
    x = snapped.x;
    y = snapped.y;
  }
  
  // set the target
  this.x_target = x;
  this.y_target = y;
  
  // if immediate, go there without animation
  if (immediate) {
    this.x = x;
    this.y = y;
  }

  // set the rotation if not null
  if(r != null) this.set_rotation(r, immediate); // not immediate
  
  // reset the clock & trigger a redraw
  this.t_previous_draw = Date.now();
  this.t_previous_move = this.t_previous_draw;
  this.board.trigger_redraw = true;
  
  // return the handle to the piece
  return this;
}
PIECE.prototype.set_target_grid = function(n,m,r_deg) {
  
  // defaults
  r_deg = or_default(r_deg, null);
  
  // get the grid
  g = this.board.snap_grids[this.snap_index];
  
  if(g != null) this.set_target(g.x0+n*g.dx1+m*g.dx2, 
                                g.y0+n*g.dy1+m*g.dy2, r_deg, null, true);
  
  return this;
}
PIECE.prototype.set_rotation = function(r_deg, immediate) {
  immediate = or_default(immediate, false);
  
  // set the target
  this.r_target         = r_deg;
  if (immediate) this.r = r_deg;
  
  // reset the clock & trigger a redraw
  this.t_previous_draw = Date.now();
  this.t_previous_move = this.t_previous_draw;
  this.board.trigger_redraw = true;
  
  // return the handle to the piece
  return this;
}
PIECE.prototype.rotate = function(r_deg) {
  
  // rotates the piece (relative)
  this.set_rotation(r_deg + this.r_target);
}
PIECE.prototype.ellipse  = function(x, y) {
  
  // if this piece has an angle, do the transform
  var r_deg = this.r;
  
  // if this piece does not rotate with the board
  if (!this.rotates_with_board) r_deg = r_deg-this.board.r;
  
  // get rotated coordinates
  d = rotate_vector(x-this.x, y-this.y, r_deg);
  
  // get width and height
  w = 0.5*this.images[this.active_image].width;
  h = 0.5*this.images[this.active_image].height;
  
  // elliptical bounds
  return d.x*d.x/(w*w) + d.y*d.y/(h*h) <= 1;
}
PIECE.prototype.outer_circle  = function(x, y) {
  
  // if this piece has an angle, do the transform
  var r_deg = this.r;
  
  // if this piece does not rotate with the board
  if (!this.rotates_with_board) r_deg = r_deg-this.board.r;
  
  // get rotated coordinates
  d = rotate_vector(x-this.x, y-this.y, r_deg);
  
  // get width
  w = Math.max(0.5*this.images[this.active_image].width, 
               0.5*this.images[this.active_image].height);
  
  // circular bounds
  return d.x*d.x + d.y*d.y <= w*w;
}
PIECE.prototype.inner_circle  = function(x, y) {
  
  // if this piece has an angle, do the transform
  var r_deg = this.r;
  
  // if this piece does not rotate with the board
  if (!this.rotates_with_board) r_deg = r_deg-this.board.r;
  
  // get rotated coordinates
  d = rotate_vector(x-this.x, y-this.y, r_deg);
  
  // get width
  w = Math.min(0.5*this.images[this.active_image].width, 
               0.5*this.images[this.active_image].height);
  
  // circular bounds
  return d.x*d.x + d.y*d.y <= w*w;
}
PIECE.prototype.rectangle  = function(x, y) {
  
  // if this piece has an angle, do the transform
  var r_deg = this.r;
  
  // if this piece does not rotate with the board
  if (!this.rotates_with_board) r_deg = r_deg-this.board.r;
  
  // get rotated coordinates
  d = rotate_vector(x-this.x, y-this.y, r_deg);
  
  // rectangular bounds
  return (Math.abs(d.x) <= 0.5*this.images[this.active_image].width 
       && Math.abs(d.y) <= 0.5*this.images[this.active_image].height);
}
PIECE.prototype.contains        = function(x, y) {
  
  // Determine if a point is inside the PIECE's bounds
  if(this.images[this.active_image]) return this.physical_shape(x,y);
  else return false
}
PIECE.prototype.on_image_load   = function(e) {
    
    return;
    
}
PIECE.prototype.needs_redraw    = function() {
  
  // PIECE needs a draw if its coordinates are not equal to the target values
  return (this.x != this.x_target ||
          this.y != this.y_target ||
          this.r != this.r_target ||
          Date.now()-this.t_previous_move <= this.t_fade_ms);
}

// draws the selection rectangle or whatever around the piece.
PIECE.prototype.draw_selection = function() {
  
  context = this.board.context;
  
  // get the piece dimensions
  w = this.images[this.active_image].width;
  h = this.images[this.active_image].height;
  
  switch(this.physical_shape) {
    
    case this.rectangle:
      this.board.context.strokeRect(-0.5*w,-0.5*h, w, h);
      break;

    case this.outer_circle:
    case this.ellipse:
      context.beginPath();
      context.arc(0,0, Math.max(w,h)*0.5, 0, 2*Math.PI);
      context.stroke();
      break;
   
    case this.inner_circle:
      context.beginPath();
      context.arc(0,0, Math.min(w,h)*0.5, 0, 2*Math.PI);
      context.stroke();
      break;
  }
}

PIECE.prototype.move_and_draw   = function() {
  
  // Draws this PIECE to the context
  context = this.board.context;
  
  // dynamics
  speed = this.board.transition_speed;
  accel = this.board.transition_acceleration;
  snap  = this.board.transition_snap;
  
  // update the time and time since last draw
  t  = Date.now();
  dt = t - this.t_previous_draw;
  this.t_previous_draw = t;

  // calculate the target velocity
  vx_target = (this.x_target - this.x)*speed;
  vy_target = (this.y_target - this.y)*speed;
  vr_target = (this.r_target - this.r)*speed;

  // calculate the actual velocity after acceleration
  this.vx = (vx_target - this.vx)*accel;
  this.vy = (vy_target - this.vy)*accel;
  this.vr = (vr_target - this.vr)*accel;
  
  // adjust the step size
  dx = this.vx * dt/draw_interval_ms;
  dy = this.vy * dt/draw_interval_ms;
  dr = this.vr * dt/draw_interval_ms;

  // make sure it's not too big
  if (Math.abs(dx) > Math.abs(this.x_target-this.x)) dx = this.x_target-this.x;
  if (Math.abs(dy) > Math.abs(this.y_target-this.y)) dy = this.y_target-this.y;
  if (Math.abs(dr) > Math.abs(this.r_target-this.r)) dr = this.r_target-this.r;
  
  // Calculate the new coordinates
  this.x = dx + this.x;
  this.y = dy + this.y;
  this.r = dr + this.r;

  // round to the nearest pixel if we've hit the target
  if ( Math.abs(this.x-this.x_target) < snap && Math.abs(this.y-this.y_target) < snap) {
    this.x = this.x_target;
    this.y = this.y_target;
  }
  if ( Math.abs(this.r-this.r_target) < snap) this.r = this.r_target;
  
  // change the active image if it's peakable
  if (this.peakable_by != null){ // if this is a peakable piece
    
    // if our team is in the peak list, set the index by the mode
    if( this.peakable_by.indexOf(get_team_number())>=0 && get_peak()) 
      this.active_image = 1;
    
    // otherwise set to zero
    else this.active_image = 0; 
  }
  
  // by default, use the public image set
  var images = this.images;
  
  // if the team number is in this piece's owners array, use the private images
  if(this.owners != null && 
     this.owners.indexOf(get_team_number()) > -1) {
	 images = this.private_images;
	 //console.log(get_team_number(), this.owners, this.owners.indexOf(get_team_number()));
  } 
  
  // otherwise, loop over the team zones to see if we should use private images.
  else {
	  for(n=0; n<this.board.team_zones.length; n++) {

		  // if the piece is in our own team zone, use the private images
		  if(n == get_team_number() 	      && 
			 this.board.team_zones[n] != null && 
			 this.board.team_zones[n].contains(this.x, this.y)) {
			 
			// switch image sets 
			images = this.private_images;
			break;
		  }
	  }
  } 
  
  // draw it.
  if(this.active_image != null && images[this.active_image]) {
    
    // Calculate the new alpha.
    if(this.t_fade_ms) {
      // if we moved this time
      if(dx || dy) this.t_previous_move = t;

      // calculate the new alpha
      dt = t-this.t_previous_move;

      // smooth fade function
      if(dt > this.t_fade_ms) a = 0;
      else                    a = this.alpha*(1.0 - Math.pow(1.0-Math.pow(dt/this.t_fade_ms-1.0, 2),8));

    } else a = this.alpha;

    // set the alpha
    context.globalAlpha = a;
    
    // get the piece dimensions
    var w = images[this.active_image].width;
    var h = images[this.active_image].height;
    
    // if we're not allowed to zoom
    if(!this.zooms_with_canvas) {
      w = w*100.0/this.board.z;
      h = h*100.0/this.board.z;
    }
    
    // shift to where we're drawing the piece
    context.translate(this.x,this.y);
    
    // set the internal rotation
    context.rotate(this.r*Math.PI/180.0);
    
    // If the piece is not supposed to rotate, transform
    if(!this.rotates_with_canvas) context.rotate(-this.board.r*Math.PI/180.0);
    
    // draw the piece
	context.drawImage(images[this.active_image], -0.5*w, -0.5*h, w, h);
    
    // unrotate
    context.rotate(-this.r*Math.PI/180.0);
    
    // If the piece is not allowed to rotate, undo the transform
    if(!this.rotates_with_canvas) context.rotate(this.board.r*Math.PI/180.0);
    
    // unshift
    context.translate(-this.x,-this.y);
    
    // reset the alpha
    context.globalAlpha = 1.0;
  }
  
 
}


/**
 * Object for drawing team zones and hiding pieces within said zone.
 * @param {BOARD} board instance of the BOARD object 
 * @param {int} team_index index of the team
 * @param {float} x1 coordinates of the first corner
 * @param {float} y1 
 * @param {float} x2 coordinates of the second corner
 * @param {float} y2 
 * @param {float} x3 coordinates of the third corner
 * @param {float} y3 
 * @param {float} x4 coordinates of the fourth corner
 * @param {float} y4 
 * @param {float} r  angle (deg) of team zone
 * @param {float} alpha how opaque to make it (0-1)
 * @param {int} mode draw mode: 0=bottom, 1=top
 */
function TEAMZONE(board, team_index, x1,y1, x2,y2, x3,y3, x4,y4, r, alpha, mode) {

  // internal data
  this.board      = board;
  this.team_index = team_index;
  this.mode       = or_default(mode, 1);  // 0 = draw on bottom (table), 1 = draw on top (opaque)
  
  this.x1 = x1; this.y1 = y1;
  this.x2 = x2; this.y2 = y2;
  this.x3 = x3; this.y3 = y3;
  this.x4 = x4; this.y4 = y4;
  
  this.r     = or_default(r, 0);
  this.alpha = alpha;
  
  console.log('New Team Zone:', team_index, x1,y1, x2,y2, x3,y3, x4,y4, r, alpha, mode);
}
TEAMZONE.prototype.contains = function(x,y) {
  
  // rotate into the team zone's coordinates
  v = rotate_vector(x,y, -this.r);
  
  // checks whether it is bounded by the four lines (look for zero slope!)
  return ( !is_below_line(v.x,v.y, this.x1,this.y1, this.x2,this.y2) &&
           !is_below_line(v.x,v.y, this.x2,this.y2, this.x3,this.y3) &&
            is_below_line(v.x,v.y, this.x3,this.y3, this.x4,this.y4) &&
           !is_below_line(v.x,v.y, this.x4,this.y4, this.x1,this.y1));
}

TEAMZONE.prototype.draw = function() {

  // draw the polygon defining the team zone; it is assumed that this occurs after the z / pan / rotation
  // has been applied to the canvas (i.e. like how pieces are drawn)
  c = this.board.context;
  
  // save and set the alpha
  old_alpha     = c.globalAlpha;
  c.globalAlpha = this.alpha;
  
  // rotate
  c.rotate(-this.r*Math.PI/180.0);
  
  // draw the polygon
  c.strokeStyle = this.board.team_colors[this.team_index];
  c.fillStyle   = this.board.team_colors[this.team_index];
  c.lineWidth   = 4*100.0/this.board.z;
  
  c.beginPath();
  c.moveTo(this.x1, this.y1);
  c.lineTo(this.x2, this.y2);
  c.lineTo(this.x3, this.y3);
  c.lineTo(this.x4, this.y4);
  c.closePath();
  c.fill();
  
  // reset the alpha
  c.globalAlpha = old_alpha;
  
  // unrotate
  c.rotate(this.r*Math.PI/180.0);
}

//// SNAP GRID OBJECT

// Constructor
function SNAPGRID(x_left, y_top, width, height, x0, y0, dx1, dy1, dx2, dy2) {
  
  console.log("Creating snap grid...")
  
  // region
  this.x_left   = or_default(x_left, 10);
  this.y_top    = or_default(y_top,  10);
  this.width    = or_default(width,  100);  
  this.height   = or_default(height, 100);

  // origin of grid
  this.x0       = or_default(x0, 0);   
  this.y0       = or_default(y0, 0);
  
  // basis vectors
  this.dx1      = or_default(dx1, 10);   
  this.dy1      = or_default(dy1, 0);

  this.dx2      = or_default(dx2, 0);
  this.dy2      = or_default(dy2, 10);
  
}

// Methods
SNAPGRID.prototype.get_snapped_coordinates = function(x,y) {
  
  
  // make sure we're within the bounds
  if (x >= this.x_left && x-this.x_left <= this.width
   && y >= this.y_top  && y-this.y_top  <= this.height) {
    
    // shift coordinates relative to the origin
    x = x - this.x0;
    y = y - this.y0;
    
    // find the number of basis vectors required to get there
    N1 = (x*this.dy2-y*this.dx2) / (this.dx1*this.dy2-this.dy1*this.dx2);
    N2 = (x*this.dy1-y*this.dx1) / (this.dx2*this.dy1-this.dy2*this.dx1);
    
    // Snap it
    N1 = Math.round(N1);
    N2 = Math.round(N2);
    
    // update coordinates
    x = this.x0 + N1*this.dx1 + N2*this.dx2;
    y = this.y0 + N1*this.dy1 + N2*this.dy2;
  }
  
  return { x:x, y:y };
  
}



//// BOARD OBJECT

// Constructor
function BOARD(canvas) {

  console.log("Creating a new board...")
  
  //// options
  this.hand_fade_ms            = 1000;  // how long before motionless hands disappear
  this.transition_speed        = 0.35;  // max rate of piece motion
  this.transition_acceleration = 0.15;  // rate of acceleration
  this.transition_snap         = 0.1;   // how close to be to snap to the final result
  
  // needed to distinguish cookies from different games
  this.game_name = 'default';
  
  // defaults for new pieces
  this.new_piece_x_target            = 0;
  this.new_piece_y_target            = 0;
  this.new_piece_x                   = 0;
  this.new_piece_y                   = 0;
  this.new_piece_r_target            = 0;
  this.new_piece_r_step              = 90;
  this.new_piece_t_fade_ms           = 0;
  this.new_piece_snap_index          = null;
  this.new_piece_movable_by          = null;
  this.new_piece_peakable_by         = null;
  this.new_piece_active_image        = 0;
  this.new_piece_rotates_with_canvas = false;
  this.new_piece_zooms_with_canvas   = true;
  this.new_piece_physical_shape      = 'rectangle';
  this.new_piece_alpha               = 1.0;
  this.new_piece_box_x               = 0;
  this.new_piece_box_y               = 0;
  this.new_piece_owners              = null;
  
  // master list of all image names and objects, used to prevent double-loading
  this.images = {};
  
  
  //// INTERNAL DATA
  
  // canvas and context for drawing
  this.canvas  = canvas;
  this.context = canvas.getContext('2d');

  // lists of pieces and hands
  this.pieces          = [];    // the collection of things to be drawn
  this.hands           = [];    // keep the hands separate from the pieces
  
  // one border, held, and selected piece for each team
  this.team_colors = [];
  this.selected_border_width    = 4;
  this.held_pieces              = [];
  this.snap_grids               = [];
  this.team_zones               = [];  
  this.selected_pieces          = [];
  this.previous_selected_pieces = [];
  
  // the box coordinates for all the unused game pieces
  this.box_x = 0;
  this.box_y = -3000;
  
  // default shortcut keys (1-9) locations
  this.shortcut_coordinates = [
    [0,0,100,0],   // 1
    [0,0,100,45],  // 2
    [0,0,100,90],  // 3
    [0,0,100,135], // 4
    [0,0,100,180], // 5
    [0,0,100,225], // 6
    [0,0,100,270], // 7
    [0,0,100,315], // 8
    [0,0,100,0],   // 9
  ]

  // where we clicked relative to the selected piece center
  this.drag_offset_x   = null;    // where the mouse down happened relative
  this.drag_offset_y   = null;    // to the piece coordinates

  // we use this to recognize when the mouse state has changed 
  // (avoids sending too many events too quickly to the server)
  this.mouse          = {x:0, y:0};
  this.previous_mouse = {x:0, y:0};
  
  // keeps track of the index for new pieces & hands
  this.next_piece_index = 0;
  this.next_hand_index  = 0;
  
  // background image
  this.background_image        = new Image();
  this.background_image.onload = this.on_background_image_load.bind(this);
  
  // keep track of the last update
  this.last_update_ms = Date.now();
  
  // keep track of whether we're in peak mode
  this.peak_image_index = 0;

  // zoom pan rotate snap variables
  this.z_max        = 200;
  this.z_min        = 12.5;
  this.z_step       = Math.pow(2,0.25);
  this.z_target     = 100;
  this.r_step       = 45;
  this.r_target     = 0;  // setpoint
  this.r_home       = 0;  // where the escape key will take you
  this.p_step       = 100;
  this.previous_r   = this.r_target;
  
  // current values
  this.z   = 0.25*this.z_target; // start this way to zoom fancy initially
  this.vz  = 0;
  this.r   = 0;
  this.vr  = 0;
  
  this.px  = -window.innerWidth*0.13;
  this.py  = 0;
  this.px_target = this.px;
  this.py_target = 0;
  
  this.vpx = 0;
  this.vpy = 0;
  
  this.t_previous_draw = Date.now();
  
  //// EVENTS 
  
  // eliminates text selection on the canvas
  canvas.addEventListener('selectstart', this.event_selectstart .bind(this), false);
  
  // mouse & keyboard events
  canvas.addEventListener('mousedown',   this.event_mousedown .bind(this), true); 
  canvas.addEventListener('mousemove',   this.event_mousemove .bind(this), true); 
  canvas.addEventListener('mouseup',     this.event_mouseup   .bind(this), true); 
  canvas.addEventListener('dblclick',    this.event_dblclick  .bind(this), true); 
  canvas.addEventListener('mousewheel',  this.event_mousewheel.bind(this), true);
  
  $(document.body).on('keydown', this.event_keydown.bind(this));
  
  
  //// TIMERS 
  
  // timers for sending updates and redrawing the canvas
  setInterval(this.send_stream_update .bind(this), stream_interval_ms);
  setInterval(this.send_full_update   .bind(this), update_interval_ms);
  setInterval(this.draw               .bind(this), draw_interval_ms);
  
  //// COOKIE STUFF
  this.cookie_expire_days = 28;
}

// cookie stuff
BOARD.prototype.set_cookie = function(key, value) {
  
  // get the expiration date
  var d = new Date();
  d.setTime(d.getTime() + (this.cookie_expire_days*24*60*60*1000));
  
  // now write the cookie string
  document.cookie = this.game_name+"_"+key + '=' + value + '; expires=' + d.toUTCString();
  
  // print the cookie
  //console.log(document.cookie);
}


BOARD.prototype.load_cookies = function() {
  
  // get a list of the cookie elements
  var cs = document.cookie.split(';');

  // loop over the elements
  for(var i=0; i<cs.length; i++) {
    
    // split by "=" sign
    s = cs[i].split('=');

    // strip white space
    while (s[0].charAt(0)==' ') s[0] = s[0].substring(1);
        
    // take action
    send_user_info = false;
    switch(s[0]) {
      
      case this.game_name+'_name': 
        set_name(s[1]);
        send_user_info = true;
        break;
      
      case this.game_name+'_team': 
        set_team_number(parseInt(s[1]));
        send_user_info = true;
        break;
      
      case this.game_name+'_z_target':
        this.set_zoom(parseInt(s[1]));
        break;
      
      case this.game_name+'_r_target':
        this.set_rotation(parseFloat(s[1])%360, true); // also updates the cookie date
        break;
      
      case this.game_name+'_px_target':
        px = parseFloat(s[1]);
        this.px_target = px;
        this.px        = px;
        this.set_cookie('px_target', px); // updates the cookie date
        break;
      
      case this.game_name+'_py_target':
        py = parseFloat(s[1]);
        this.py_target = py;
        this.py        = py;
        this.set_cookie('py_target', py); // updates the cookie date
        break;
      
      case this.game_name+'_shortcut_coordinates':
        
        // Parse and generate the new coordinates
        ss        = s[1].split(',');
        new_pants = [];
        for(j=0; j<ss.length/4; j++) new_pants.push([parseFloat(ss[4*j]), parseFloat(ss[4*j+1]), parseFloat(ss[4*j+2]), parseFloat(ss[4*j+3])]);

        // Update the current coordinates
        this.shortcut_coordinates = new_pants;
        
        // update the cookie date
        this.set_cookie('shortcut_coordinates', this.shortcut_coordinates);
        break;

    } // end of switch
    
    // update server with user info if we're supposed to
    if (send_user_info == true) our_socket.emit('user', get_name(), get_team_number());
  }
}
  
  


// Floaters
BOARD.prototype.add_snap_grid = function(x_left, y_top, width, height, x0, y0, dx1, dy1, dx2, dy2) {
  
  // add the snap grid to the array
  this.snap_grids.push( new SNAPGRID(x_left, y_top, width, height, x0, y0, dx1, dy1, dx2, dy2) );
  
  // return the index
  return this.snap_grids.length-1;
}
BOARD.prototype.add_team      = function(name, image_paths, color) {
  
  // add team to list
  var teams  = document.getElementById("teams");
  var option = document.createElement("option");
  option.text = name;
  teams.add(option);
  
  // add hand
  this.add_hand(image_paths, this.hand_fade_ms);
  
  // add border color, held, selected pieces, and team zones
  this.team_colors.push(color);
  this.held_pieces.push(null);
  this.selected_pieces.push(null);
  this.previous_selected_pieces.push(null);
  this.team_zones.push(null);
}
BOARD.prototype.add_hand      = function(image_paths, t_fade_ms) {
  
  // create the hand
  h = new PIECE(this, this.next_hand_index, image_paths);
  h.t_fade_ms           = this.hand_fade_ms;
  h.zooms_with_canvas   = false;
  h.rotates_with_canvas = true;
  
  // make sure it starts faded.
  h.t_previous_move   = Date.now()-h.t_fade_ms*2;
  
  // push the specified piece onto the stack
  this.hands.push(h);
  
  // increment the piece index
  this.next_hand_index++;
  
  return h;
}

// add a piece to this.pieces
BOARD.prototype.add_piece = function(image_paths, private_image_paths) {
  
  // by default, use the same image paths for public and private images
  immediate = or_default(private_image_paths, image_paths);
  
  // create the piece 
  p = new PIECE(board, this.next_piece_index, image_paths, private_image_paths);
  
  // push the specified piece onto the stack
  this.pieces.push(p);
  
  // increment the piece index
  this.next_piece_index++;
  
  return p;
}

// add multiple copies of pieces; arguments are N, [images], N, [images]...
BOARD.prototype.add_pieces = function() {
  
  // create an array and add multiple copies of the piece
  ps = [];
  
  // loop over the supplied pairs of arguments
  for(n=0; n<arguments.length; n+=2) 
    for(m=0; m<arguments[n]; m++) 
      ps.push(this.add_piece(arguments[n+1]));
  
  return ps;
}


BOARD.prototype.push_piece    = function(piece) {
  this.pieces.push(piece);
}
BOARD.prototype.pop_piece     = function(i) {
  return this.pieces.splice(i,1)[0];
}
BOARD.prototype.find_piece    = function(piece_index) {
  // find a piece by piece_index
  
  // loop from top to bottom (most commonly on top) to find the supplied index
  for (var m=this.pieces.length-1; m>=0; m--) {

    // if we've found the right piece
    if (this.pieces[m].piece_index == piece_index) return this.pieces[m];
  }
  // otherwise return null
  return null;
}
BOARD.prototype.find_top_piece_at_location = function(x,y) {
  
  // loop over the list of pieces from top to bottom
  for (var i = this.pieces.length-1; i >= 0; i--) {
    // on success, return the index
    if (this.pieces[i].contains(x, y)) return i;
  }

  // FAIL. NOFRIENDS.
  return -1;
}

// Background
BOARD.prototype.on_background_image_load = function() {
  //this.canvas.width  = this.background_image.width;
  //this.canvas.height = this.background_image.height;
}
BOARD.prototype.set_background_image = function(image_path) {
  
  // set the image's path
  this.background_image.src = '/images/'+image_path;
}

// Mouse methods
BOARD.prototype.get_mouse_coordinates = function(e) {
  // Gets the mouse coordinates with respect to the canvas.

  // get the bounding rectangle of the canvas
  var rect = this.canvas.getBoundingClientRect();

    // figure out the center of the board
    var cx = Math.round(this.canvas.width  / 2);
    var cy = Math.round(this.canvas.height / 2);

    // set the new zoom/rotation/pan
    var sin_r = Math.sin(this.r*Math.PI/180.0);
    var cos_r = Math.cos(this.r*Math.PI/180.0);
    
    // zoom and pan
    
    // raw coordinates
    xr = (e.offsetX-cx-this.px)/(this.z*0.01);
    yr = (e.offsetY-cy-this.py)/(this.z*0.01);
    
  // return the transformed mouse coordinates
  return {
    //x: (e.clientX - rect.left - this.px)*100.0/this.z,
    //y: (e.clientY - rect.top  - this.py)*100.0/this.z
    x:  cos_r*xr + sin_r*yr,
    y: -sin_r*xr + cos_r*yr
  };
}
BOARD.prototype.event_selectstart     = function(e) { 
  // fixes a text-selecting problem with mouse dragging
  
  // prevents the default behavior
  e.preventDefault(); 
}

// Find out if the coordinates x,y are in someone else's team zone
BOARD.prototype.in_team_zone = function(x,y) {
  
  for(n=0; n<this.team_zones.length; n++){
    
    // If this is not our team zone and we're in it
    if(this.team_zones[n] != null 
      && this.team_zones[n].contains(x, y))
      // FOUND IT!
      return n;
  }
  // FAIL. NO FRIENDS.
  return -1;
}

// whenever someone clicks the mouse
BOARD.prototype.event_mousedown = function(e) {
  
  // trigger redraw to be safe
  this.trigger_redraw = true;

  // get the mouse coordinates & team
  var mouse  = this.get_mouse_coordinates(e);
  team = get_team_number();
  
  // report the coordinates
  console.log("event_mousedown", mouse);
  
  // If we're not in someone else's team zone, see if we selected a piece.
  team_zone = this.in_team_zone(mouse.x, mouse.y)
  if(team_zone == team || team_zone < 0) {
    
    // loop over the list of pieces from top to bottom
    for (var i = this.pieces.length-1; i >= 0; i--) {

      // see if the mouse down happened within the piece
      // on success, quits out of the loop!
      if (this.pieces[i].contains(mouse.x, mouse.y) && 
         (this.pieces[i].movable_by == null ||
          this.pieces[i].movable_by.indexOf(team)>=0)) {

        // pull the piece out and put it on top
        p = this.pop_piece(i);
        this.push_piece(p);
      
        // Keep track of where in the object we clicked
        this.drag_offset_x  = mouse.x - p.x;
        this.drag_offset_y  = mouse.y - p.y;
        
        // Check and see if someone else has this piece selected.
        team2 = this.selected_pieces.indexOf(p);
        
        // If someone else had this selected, remove their selection
        if(team2 >= 0 && team2 != team) this.selected_pieces[team2] = null;
        
        // Select the piece
        this.selected_pieces[team] = p;
        this.held_pieces    [team] = p;
        
        // quit out of the loop
        return;
      }
    } // end of loop over pieces
  }

  // If we got this far, it means we haven't found a selection
  // If there was an object selected, we deselect it
  this.selected_pieces[get_team_number()] = null;
  this.held_pieces    [get_team_number()] = null;
  
  // store the drag offset for canvas motion
  this.drag_offset_x = mouse.x;
  this.drag_offset_y = mouse.y;
}

// whenever the mouse moves in the canvas
BOARD.prototype.event_mousemove = function(e) { 
  
  // trigger redraw to be safe
  this.trigger_redraw = true;

  // if we're holding a piece
  hp = this.held_pieces[get_team_number()];
  if(hp != null && (hp.movable_by == null || hp.movable_by.indexOf(get_team_number())>=0) ) {
      
      // get the new mouse coordinates; the timer will handle the data sending
      this.mouse  = this.get_mouse_coordinates(e);

      // We want to drag it from where we clicked.
      hp.set_target(this.mouse.x - this.drag_offset_x,
                    this.mouse.y - this.drag_offset_y, null, null, true) // disable snap
      
      // make sure it immediately moves there while we're holding it
      hp.x = hp.x_target;
      hp.y = hp.y_target;
  }
  
  // if we're dragging the canvas
  else if (this.drag_offset_x != null && this.drag_offset_y != null) {
    
    // update the pan coordinates (immediate=true)
    this.set_pan(this.px + e.movementX, this.py + e.movementY, true);
  }
  
  // otherwise we're just moving around
  else this.mouse  = this.get_mouse_coordinates(e);

}
BOARD.prototype.event_mouseup         = function(e) {
  // prevents default
  e.preventDefault();
  
  // trigger redraw to be safe
  this.trigger_redraw = true;

  // set the coordinates (will snap if necessary)
  hp = this.held_pieces[get_team_number()];
  if(hp!=null) {
    // set the target (will snap if necessary)
    hp.set_target(hp.x_target, hp.y_target);
  }
  
  // remove it from our hand
  this.held_pieces[get_team_number()] = null;
  
  // null out the drag offset so we know not to carry the canvas around
  this.drag_offset_x = null;
  this.drag_offset_y = null;

}
BOARD.prototype.event_dblclick = function(e) {
  
  // prevents default
  e.preventDefault();
    
  // trigger redraw to be safe
  this.trigger_redraw = true;

  // If we're not in someone else's team zone, look for a piece at the mouse location
  p = null; i = -1; // defaults = no piece worth double clicking
  team_zone = this.in_team_zone(this.mouse.x, this.mouse.y);
  if(get_team_number() == team_zone || team_zone < 0)
  {
    i = this.find_top_piece_at_location(this.mouse.x, this.mouse.y);
    if(i >= 0) p = this.pieces[i];
  }

  // if we found it, run the game script on it
  console.log("DBLCLICK EVENT", i);
  event_dblclick(e,p,i);
  
}
BOARD.prototype.event_mousewheel = function(e) {
  // prevents default
  e.preventDefault();
  
  // find our selected piece
  sp = this.selected_pieces[get_team_number()];  
    
  // trigger redraw to be safe
  this.trigger_redraw = true;

  // if shift is held, rotate canvas
  if (e.shiftKey || e.ctrlKey) {
    // rotate
    if     (e.wheelDelta > 0) this.set_rotation(this.r_target-this.r_step);
    else if(e.wheelDelta < 0) this.set_rotation(this.r_target+this.r_step);
  }
  
  // if ctrl is held, zoom canvas
  else if (e.ctrlKey || sp == null) {    

    // zoom in
    if(e.wheelDelta > 0) this.zoom_in();
    
    // zoom out
    else if(e.wheelDelta < 0) this.zoom_out();
  }
  
  // otherwise, if a piece is selected, rotate it.
  else if (sp != null) {
    if      (e.wheelDelta < 0) sp.rotate( sp.r_step);
    else if (e.wheelDelta > 0) sp.rotate(-sp.r_step);
  }
  
  // reset the timer
  this.t_previous_draw = Date.now();
  
  console.log('mousewheel', e.wheelDelta);
}

// whenever someone pushes down a keyboard button
BOARD.prototype.event_keydown = function(e) {

  // trigger redraw to be safe
  this.trigger_redraw = true;
  this.t_previous_draw = Date.now();

  // do the default stuff, but only if the canvas has focus
  if(document.activeElement == document.getElementById('table')) {
    
    // find our selected piece
    sp = this.selected_pieces[get_team_number()];      
          
    console.log('KEYCODE',e.keyCode);
    switch (e.keyCode) {
      
      // Rotate CW
      case 69: // E
        this.set_rotation(this.r_target+this.r_step);
        break;
      
      // Rotate CCW
      case 81: // Q
        this.set_rotation(this.r_target-this.r_step);
        break;
      
      // Pan right or rotate CW
      case 68: // D
      case 39: // RIGHT
        if(e.ctrlKey || e.shiftKey) this.set_rotation(this.r_target+this.r_step);
        else {
          // if there is a selected piece, rotate it.
          if (sp != null) sp.rotate(sp.r_step);
          
          // otherwise pan
          else this.set_pan(this.px_target-this.p_step, this.py_target);
        }
        break;
      
      // Pan left or rotate CCW
      case 65: // A
      case 37: // LEFT
        if(e.ctrlKey || e.shiftKey) this.set_rotation(this.r_target-this.r_step);
        else {
          
          // if there is a selected piece, rotate it.
          if (sp != null) sp.rotate(-sp.r_step);
          
          // otherwise pan
          else this.set_pan(this.px_target+this.p_step, this.py_target);
        }
        break;
      
      // Zoom out
      case 70:  // F
      case 189: // MINUS
        // zoom out
        this.zoom_out();
        break;
      
      // Zoom in
      case 82:  // R
      case 187: // PLUS
        // zoom in
        this.zoom_in();
        break;
      
      // Pan up or zoom in
      case 87: // W
      case 38: // UP
        // zoom
        if (e.ctrlKey || e.shiftKey) this.zoom_in();
        
        // pan
        else if (sp == null) this.set_pan(this.px_target, this.py_target+this.p_step);
        break;
      
      // Pan down or zoom out
      case 83: // S
      case 40: // DOWN
        // zoom
        if(e.ctrlKey || e.shiftKey) this.zoom_out();
        
        // pan
        else if (sp == null) this.set_pan(this.px_target, this.py_target-this.p_step);
        break;
      
      case 48:  // 0
      case 192: // tilde
      case 27:  // ESCAPE
        // return home
        this.set_pan(0,0);
        this.set_rotation(this.r_home);
        break;
      
      case 49: // 1
      case 50: // 2
      case 51: // 3
      case 52: // 4
      case 53: // 5
      case 54: // 6
      case 55: // 7
      case 56: // 8
      case 57: // 9

        // Get the index
        i = e.keyCode - 49

        // Save the current view
        if(e.ctrlKey || e.shiftKey) {
          ratio = 100.0/this.z_target;
          this.shortcut_coordinates[i] = [this.px*ratio, this.py*ratio, this.z_target, this.r_target];
          this.set_cookie('shortcut_coordinates', this.shortcut_coordinates)
        }

        // Get the coordinates
        else if(this.shortcut_coordinates[i]) {
          [x,y,z,r] = this.shortcut_coordinates[i];
          ratio = z/100.0;
          this.set_pan(x*ratio,y*ratio);
          this.set_zoom(z);
          this.set_rotation(r);
        }
        break;

      case 32: // SPACE
        // Find a piece if there is one
        // By default we use the selected piece
        piece = this.selected_pieces[get_team_number()];
        
        // Otherwise we use the one just under the mouse.
        if(piece == null)
        {  
          // Only do so if we're not in someone else's team zone
          team_zone = this.in_team_zone(this.mouse.x, this.mouse.y);
          if(team_zone < 0 || team_zone == get_team_number()) {
            i = this.find_top_piece_at_location(this.mouse.x, this.mouse.y);
            if(i >= 0) piece = this.pieces[i];
          }
        }  
      
        // Cycle the piece if there is one
        if(piece != null) piece.increment_active_image();
        break;
    }

    // See if there is a piece underneath
    i = this.find_top_piece_at_location(this.mouse.x, this.mouse.y);
    if(i >= 0) piece = this.pieces[i];

    // at this point, we call the user-override function
    event_keydown(e,p,i);
  } // end of canvas has focus
}

// User functions
event_keydown = function(event_data, piece, piece_index) {
  console.log("event_keydown(e,p,i): Feel free to overwrite this function for your game!" );
}

// called when someone double clicks. Feel free to overwrite this!
function event_dblclick(event_data, piece, piece_index) {
  
  // default behavior: cycle through the piece image
  if(piece != null) piece.increment_active_image();
}

// set the size of the canvas
BOARD.prototype.set_size = function(width, height) {
  // sets the dimensions of the board
  this.canvas.width  = width;
  this.canvas.height = height;
}

// set the zoom level of the board
BOARD.prototype.set_zoom = function(z, immediate) {
  
  // defaults
  immediate = or_default(immediate, false);
  
  // check the bounds
  if(z > this.z_max) z=this.z_max;
  if(z < this.z_min) z=this.z_min;
  
  // sets the target rotation
  console.log('setting zoom to', z);
  this.z_target = z;
    
  // if it's immediate, set the current value too
  if(immediate) this.z = z_target;
  
  // trigger a redraw
  this.trigger_redraw  = true;
  this.t_previous_draw = Date.now();
  
  // store the setting for next time
  this.set_cookie('z_target', this.z_target);
}


// set the orientation of the board
BOARD.prototype.set_rotation = function(r_deg, immediate) {
  
  // defaults
  immediate = or_default(immediate, false);
  
  // sets the target rotation
  this.r_target = r_deg;
    
  // if it's immediate, set the current value too
  if(immediate) this.r = r_deg;
  
  // trigger a redraw
  this.trigger_redraw  = true;
  this.t_previous_draw = Date.now();
  
  // store the setting for next time
  this.set_cookie('r_target', this.r_target);
}

// zoom in
BOARD.prototype.zoom_in = function() {
  
  // increment
  z0 = this.z_target;
  z1 = this.z_target*this.z_step;
  if(z1 > this.z_max) z1=this.z_max;

  // set the zoom
  this.set_zoom(z1);
  
  // get the ratio and adjust the pan as well
  ratio = z1/z0;
  this.set_pan(this.px_target*ratio, this.py_target*ratio);
}

// zoom out
BOARD.prototype.zoom_out = function() {
  
  // decrement
  z0 = this.z_target;
  z1 = this.z_target/this.z_step;
  if(z1 < this.z_min) z1=this.z_min;

  // set the zoom
  this.set_zoom(z1);
  
  // get the ratio and adjust the pan as well
  ratio = z1/z0;
  this.set_pan(this.px_target*ratio, this.py_target*ratio);
}

// set the orientation of the board
BOARD.prototype.set_pan = function(px, py, immediate) {
  
  // defaults
  immediate = or_default(immediate, false);
  
  // sets the target rotation
  this.px_target = px;
  this.py_target = py;
    
  // if it's immediate, set the current value too
  if(immediate) {
    this.px = px;
    this.py = py;
  }
  
  // trigger a redraw
  this.trigger_redraw  = true;
  this.t_previous_draw = Date.now();
  
  this.set_cookie('px_target', px);
  this.set_cookie('py_target', py);
}

// set the team zone polygon
BOARD.prototype.set_team_zone = function(team_index, x1,y1, x2,y2, x3,y3, x4,y4, r, alpha, mode) {

  // create a team zone object
  this.team_zones[team_index] = new TEAMZONE(this, team_index, x1,y1, x2,y2, x3,y3, x4,y4, r, alpha, mode);
}
function setup() {
  console.log("function setup(): OVERWRITE ME!")
}
BOARD.prototype.setup = function() {
  
  // setup the pieces
  setup.apply(this, arguments);
  
  // send a full update
  this.send_full_update(true);
}
BOARD.prototype.tantrum = function() {
  
  // loop over all pieces and send them in random directions
  for (n=0; n<this.pieces.length; n++) {
  
    u1 = Math.random();
    u2 = Math.random();
    
    x = Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)*1000.0
    y = Math.sqrt(-2*Math.log(u1))*Math.sin(2*Math.PI*u2)*1000.0
    r = Math.random()*5000-2500;
    
    p = this.pieces[n];
    p.set_target(p.x_target+x,p.y_target+y,r,null,true);
    
  }
  
  // send a full update
  this.send_full_update(true);
}

BOARD.prototype.needs_redraw       = function() {
  // Determine whether any piece requires a redraw

  // if we've automatically triggered a redraw
  if (this.trigger_redraw) return (true);

  // see if our z etc is off
  if (this.z  != this.z_target ||
      this.r  != this.r_target                 ||
      this.px != this.px_target                ||
      this.py != this.py_target) return true;

  
  // see if any of the hands need a redraw
  for (i=0; i<this.hands.length; i++) {
    if (this.hands[i].needs_redraw()) return true;
  }

  // see if any of the pieces need a redraw
  for (i=0; i<this.pieces.length; i++) {
    if (this.pieces[i].needs_redraw()) return true
  }
  
  // nothing needs an update
  return (false);
}
BOARD.prototype.draw = function() {
  // Redraw the entire canvas. This is only called if something changes

  // if our state is invalid, redraw and validate!
  // JACK: Performance boost by only redrawing a local region?
  if (this.needs_redraw()) {
    
    // reset the trigger
    this.trigger_redraw = false;
    
    //// Zoom/pan/rotate dynamics
    t  = Date.now();
    dt = t - this.t_previous_draw;
    this.t_previous_draw = t;

    // get the target
    ztarget  = this.z_target;
    rtarget  = this.r_target;
    pxtarget = this.px_target;
    pytarget = this.py_target;
    
    // calculate the target velocity
    vztarget  = (ztarget  - this.z) *this.transition_speed;
    vrtarget  = (rtarget  - this.r) *this.transition_speed;
    vpxtarget = (pxtarget - this.px)*this.transition_speed;
    vpytarget = (pytarget - this.py)*this.transition_speed;
    
    // calculate the actual velocity after acceleration
    this.vz  = (vztarget  - this.vz) *this.transition_acceleration;
    this.vr  = (vrtarget  - this.vr) *this.transition_acceleration;
    this.vpx = (vpxtarget - this.vpx)*this.transition_acceleration;
    this.vpy = (vpytarget - this.vpy)*this.transition_acceleration;
    
    // adjust the step size
    dz  = this.vz  * dt/draw_interval_ms;
    dr  = this.vr  * dt/draw_interval_ms;
    dpx = this.vpx * dt/draw_interval_ms;
    dpy = this.vpy * dt/draw_interval_ms;
    
    // make sure we don't overshoot
    if (Math.abs(dz)  > Math.abs(ztarget -this.z )) dz  = ztarget -this.z;
    if (Math.abs(dr)  > Math.abs(rtarget -this.r )) dr  = rtarget -this.r;
    if (Math.abs(dpx) > Math.abs(pxtarget-this.px)) dpx = pxtarget-this.px;
    if (Math.abs(dpy) > Math.abs(pytarget-this.py)) dpy = pytarget-this.py;
    
    // Calculate the new coordinates
    this.z  = this.z +dz;
    this.r  = this.r +dr; 
    this.px = this.px+dpx;
    this.py = this.py+dpy;
    
    // round to the nearest pixel if we've hit the target
    if ( Math.abs(this.z - ztarget) < this.transition_snap) this.z  = ztarget;
    if ( Math.abs(this.r - rtarget) < this.transition_snap) this.r  = rtarget;
    if ( Math.abs(this.px-pxtarget) < this.transition_snap) this.px = pxtarget;
    if ( Math.abs(this.py-pytarget) < this.transition_snap) this.py = pytarget;
    

    
    var context = this.context;
    var pieces  = this.pieces;
    var hands   = this.hands;
    
    // set the size to match the window
    context.canvas.width  = window.innerWidth;
    context.canvas.height = window.innerHeight;
    
    // clears the canvas
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // figure out the center of the board
    var cx = Math.round(this.canvas.width  / 2);
    var cy = Math.round(this.canvas.height / 2);

    // set the new z/r/pan
    var sin_r = this.z*0.01*Math.sin(this.r*Math.PI/180.0);
    var cos_r = this.z*0.01*Math.cos(this.r*Math.PI/180.0);
    
    // set the actual transform
    this.context.setTransform(cos_r, sin_r, -sin_r, cos_r, 
                              this.px+cx, this.py+cy);
    
    // JACK: also look up requestAnimationFrame API for faster rendering

    // draw the background image
    if (this.background_image != null) context.drawImage(this.background_image, -this.background_image.width*0.5, -this.background_image.height*0.5);
    
    // draw the team zones below everything
    for (var i = 0; i < this.team_zones.length; i++) {
      // If the team zone exists and either is the current team number
      // or is mode 0 (supposed to be on the bottom)
      if (this.team_zones[i] != null 
       && (i == get_team_number() 
          || this.team_zones[i].mode == 0)) this.team_zones[i].draw();
    }
    
    
    
    
    
    // draw all pieces
    for (var i = 0; i < pieces.length; i++) {

      // We can skip the drawing of elements that have moved off the screen:
      if (pieces[i].x > this.width      || pieces[i].y > this.height ||
          pieces[i].x + pieces[i].w < 0 || pieces[i].y + pieces[i].h < 0) continue;

      // otherwise actually do the drawing
      pieces[i].move_and_draw();
    } // end of piece draw loop

    // draw selection rectangles
    for (i=0; i<this.selected_pieces.length; i++) {
      
      // get the piece
      sp = this.selected_pieces[i];
      
      // if the piece is selected, draw the rectangle
      if (sp != null && sp.active_image != null) {
        
        // get the width and height 
        var w = sp.images[sp.active_image].width+4;
        var h = sp.images[sp.active_image].height+4;
        
        // if we're not allowed to zoom, adjust the size
        if(!sp.zooms_with_canvas) {
          w = w*100.0/this.z;
          h = h*100.0/this.z;
        }
        
        // shift to piece coordinates
        context.translate(sp.x, sp.y);
        
        // include piece's internal rotation
        context.rotate(sp.r*Math.PI/180.0);
        
        // if we're not allowed to rotate, transform
        if(!sp.rotates_with_canvas) context.rotate(-this.r*Math.PI/180.0);
        
        // draw white background of the border
        context.lineWidth   = this.selected_border_width*100.0/this.z;
        context.strokeStyle = "#FFF";
        sp.draw_selection();
        
        // draw the border
        context.lineWidth   = this.selected_border_width*50.0/this.z;
        context.strokeStyle = this.team_colors[i];
        sp.draw_selection();
        
        // if we're not allowed to rotate, transform
        if(!sp.rotates_with_canvas) context.rotate(this.r*Math.PI/180.0);
        
        // unrotate
        context.rotate(-sp.r*Math.PI/180.0);
        
        // shift back
        context.translate(-sp.x, -sp.y);
      }
    }
    
    
    
    // draw all hands
    for (var i = 0; i < hands.length; i++) {

      // see if it's holding something
      if (this.held_pieces[i] != null) hands[i].active_image = 1;
      else                             hands[i].active_image = 0;
    
      // otherwise actually do the drawing
      hands[i].move_and_draw();
      
    } // end of piece draw loop

    // draw the team zones on top of everything
    for (var i = 0; i < this.team_zones.length; i++) {
      // If the team zone exists, is not the current team number
      // and is mode 1 (supposed to be on top)
      if (this.team_zones[i] != null 
       && i != get_team_number() 
       && this.team_zones[i].mode == 1) this.team_zones[i].draw();
    }

  } // end of needs redraw
}

// Timer: often send changes to the server
BOARD.prototype.send_stream_update = function() {
 
  // sends quick and small information about mouse movement, etc
  
  // get the held and selected piece
  hp = this.held_pieces    [get_team_number()];
  
  // if a selection has changed
  for (n=0; n<this.previous_selected_pieces.length; n++) {
    
    // get the selected piece
    sp = this.selected_pieces[n];
    
    // see if it's changed
    if (sp != this.previous_selected_pieces[n]) {
      
      // emit the selection changed event
      console.log('selection change');
      if (sp == null) i = -1;
      else            i = sp.piece_index;
      our_socket.emit('s', i, n);

      // remember the change
      this.previous_selected_pieces[n] = sp;   
    }
  } // end of selection changes
  

  
  // updating the mouse coordinates (if they're different!)
  if (this.mouse.x != this.previous_mouse.x || 
      this.mouse.y != this.previous_mouse.y || 
      this.r_target != this.previous_r) {
    
    // come up with an index to send for the held piece
    if (hp == null) {
      i  = -1;
      dx = 0;   // offset
      dy = 0;   // offset
    }
      
    else {
      i  = hp.piece_index;
      dx = this.drag_offset_x;
      dy = this.drag_offset_x;
    }
    
    // emit the mouse update event
    our_socket.emit('m', get_team_number(), this.mouse.x, this.mouse.y, i, dx, dy, this.r_target); 
  
    // store this info
    this.previous_mouse = this.mouse;
    this.previous_r     = this.r_target;
    
  } // end of updating mouse coordinates
  
  
  
  // loop over all the pieces to see if their coordinates have changed
  indices = [];
  xs = [];
  ys = [];
  rs = [];
  active_images = [];
  for (n=0; n<this.pieces.length; n++) {
    
    p = this.pieces[n];
    
    // if anything has changed
    if (p.previous_x != p.x_target ||
        p.previous_y != p.y_target ||
        p.previous_r != p.r_target ||
        p.previous_active_image != p.active_image) {
      
      // populate the list
      indices.push(p.piece_index);
      xs.push(p.x_target);
      ys.push(p.y_target);
      rs.push(p.r_target);
      active_images.push(p.active_image);
      
      // reset the previous values
      p.previous_x = p.x_target;
      p.previous_y = p.y_target;
      p.previous_r = p.r_target;
      p.previous_active_image = p.active_image;
    }
  } // end of piece change search
  
  // if we found something, send it
  if (xs.length > 0) {
    console.log('sending "u" with', xs.length, 'pieces');
    our_socket.emit('u', indices, xs, ys, rs, active_images);
  }
}

// Timer: occasionally sends all piece coordinates to the server
BOARD.prototype.send_full_update   = function(force) {
  
  // normally we only send an update if we haven't had one in awhile
  // "force" allows you to make sure it gets sent
  force = or_default(force, false); 
  
  // check if we should send an update
  if (!force && Date.now()-this.last_update_ms < update_interval_ms) return 0;
  this.last_update_ms = Date.now();

  // assemble the data to send to the server
  var indices       = [];
  var xs            = [];
  var ys            = [];
  var rs            = [];
  var active_images = [];

  // loop over all pieces
  for(var i=0; i<this.pieces.length; i++) {
    
    // get the piece object
    p = this.pieces[i];

    // add to all the arrays
    indices.       push(p.piece_index);
    xs.            push(p.x_target);
    ys.            push(p.y_target);
    rs.            push(p.r_target);
    active_images. push(p.active_image);
    
    // reset the previous values
    p.previous_x = p.x_target;
    p.previous_y = p.y_target;
    p.previous_r = p.r_target;
    p.previous_active_image = p.active_image;
  }

  console.log('sending full update:', indices.length, 'pieces');
  our_socket.emit('u', indices, xs, ys, rs, active_images, true); // true clears the old values from the server's memory

}



//// COMMUNICATION

// socket object for communication
var our_socket = io();
our_socket.emit('user', get_name(), get_team_number());

// functions for handling incoming server messages
server_chat = function(msg){
  // server sent a "chat"

  // messages div object
  m = $('#messages');

  // look for the tag "messages" in the html and append a <li> object to it
  m.append($('<li>').html(msg));

  // scroll to the bottom of the history
  m.animate({ scrollTop: m.prop("scrollHeight") - m.height() }, 'slow');

}
our_socket.on('chat', server_chat);

server_users = function(names, teams){
  console.log("Received users:", names, teams);
  
  // loop over them and refill the ul for it.
  clients = $('#clients');
  clients.empty();
  
  for (i=0; i<names.length; i++) {
    
    // figure out the team name
    if(teams[i] < 0) teams[i] = 0;
    team_name = document.getElementById("teams").options[teams[i]].text;
    
    clients.append($('<li>').html(names[i]+' ('+team_name+')'));
  }
}
our_socket.on('users', server_users);

server_mousemove = function(n, x, y, i, dx, dy, r){
  // server has sent a "mouse move"
  
  console.log('received m:', n, x, y, i, dx, dy, r);

  // set the hand's target location
  board.hands[n].set_target(x, y, null, null, true); // disable snap
  board.hands[n].set_rotation(-r);
  
  // set the held piece location (if any)
  if (i >= 0) {
        
    // find the piece
    hp = board.find_piece(i);
    
    // update the held_pieces array
    board.held_pieces[n] = hp;
    
    // set its coordinates
    hp.set_target(x-dx, y-dy, null, null, true); // disable snap
  }
  
  // otherwise release the piece
  else board.held_pieces[n] = null;
}
our_socket.on('m',    server_mousemove);

server_selectionchange = function(piece_index,team_number){
  // server sent a selection change
  
  // update the selection
  console.log('s:', piece_index, team_number);
  p = board.find_piece(piece_index);
  board.selected_pieces[team_number]          = p;
  board.previous_selected_pieces[team_number] = p;

  // trigger a redraw
  board.trigger_redraw = true;
}
our_socket.on('s',    server_selectionchange);


// Function to handle when the server sends a piece update ('u')
server_update = function(indices, xs, ys, rs, active_images){
  
  // server has sent a pieces update
  console.log('received update:', indices.length, 'pieces');
  board.last_update_ms = Date.now();

  // run through the partial list, find the pieces by index, and stick them
  // on top, in order (JACK: This is SLOW, especially for a full update)
  for(var n=0; n<indices.length; n++) {

    // loop from top to bottom (most commonly on top) to find the supplied index
    for (var m=board.pieces.length-1; m>=0; m--) {

      // if we've found the right piece and it's not a held piece
      if  (board.pieces[m].piece_index == indices[n]
        && !board.held_pieces.includes[board.pieces[m]]) {
      
        // remove it, update coordinates, and stick it on top
        p = board.pop_piece(m);
        
        // set the new values
        p.set_target(xs[n], ys[n], rs[n], null, true); // disable snap
        p.active_image = active_images[n];
        
        // store the new coordinates so we don't re-update the server!
        p.previous_x = p.x_target;
        p.previous_y = p.y_target;
        p.previous_r = p.r_target;
        p.previous_active_image = p.active_image;
        
        // place this on top
        board.push_piece(p);

        // quit the search!
        break;
      } // end of piece check
    } // end of piece search
  } // end of loop over supplied pieces
}
our_socket.on('u', server_update);

// action when we click "send chat"
form_submit = function(){

  // emit a "chat message" event with the value from the text box "m"
  our_socket.emit('chat', "<b>"+get_name()+":</b> "+$('#chat-box').val());

  // clear the text box
  $('#chat-box').val('');

  // false means no error I suppose
  return false;
}
$('form').submit(form_submit);

window.onresize = function(event) {
  board.trigger_redraw = true;
};


//// CONTROL EVENTS
function name_onchange() {
  console.log("New name:", get_name());
  board.set_cookie('name', get_name());
  our_socket.emit('user', get_name(), get_team_number());
}
function team_onchange() {
  console.log("New team:", get_team_number());
  board.set_cookie('team', get_team_number());
  our_socket.emit('user', get_name(), get_team_number());
  board.trigger_redraw = true;
}
function peak_onchange() { board.trigger_redraw = true; }

// create the board
var board = new BOARD(document.getElementById('table'));



