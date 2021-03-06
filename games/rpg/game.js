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

/**
 * TO DO:
 */

//////////////////////////
// Card Table With Chips
//////////////////////////

// short name needed for differentiating the games in the cookies
board.game_name  = 'RPG';
energies_per_team   = 8;
fancy_dice_per_team    = 4;
number_of_teams  = 8;

// set the allowed rotations and initial zoom (out)
board.z_target = 80;
board.r_step   = 45;
board.pan_step = 250;

// Collection and expansion settings
board.collect_r_piece  = null; // Rotates the piece to the current view
board.collect_r_stack  = null; // Rotates the stack offsets to the current view
board.expand_spacing_x = 47;
board.expand_spacing_y = 47;
board.expand_number_per_row = 8;

//////////////////////////
// TEAMS               
//////////////////////////

// Add some teams
board.add_team('observer', ['hand_white.png', 'fist_white.png' ], '#cccccc');
board.add_team('red',      ['hand_red.png',   'fist_red.png'   ], '#ff2a2a'); 
board.add_team('gray',     ['hand_gray.png',  'fist_gray.png'  ], '#808080'); 
board.add_team('yellow',   ['hand_yellow.png','fist_yellow.png'], '#ffe84b'); 
board.add_team('orange',   ['hand_orange.png','fist_orange.png'], '#ff6600'); 
board.add_team('blue',     ['hand_blue.png',  'fist_blue.png'  ], '#5599ff'); 
board.add_team('green',    ['hand_green.png', 'fist_green.png' ], '#118855'); 
board.add_team('violet',   ['hand_violet.png','fist_violet.png'], '#d62cff'); 
board.add_team('brown',    ['hand_brown.png', 'fist_brown.png' ], '#883300'); 
board.add_team('manager',  ['hand_white.png', 'fist_white.png' ], '#cccccc', true);

// Set up the team zones based on the number of seats
theta = 0.5*(360/number_of_teams)*Math.PI/180.0;  // Wedge angle in radians
R1    = 525;                                      // Inner radius of team zones
R2    = (R1*Math.cos(theta)+300)/Math.cos(theta); // Outer radius of team zones
board.r_step = 360.0/number_of_teams;

// Unrotated coordinates of the team zone (same for each team)
x1 = R1*Math.sin(theta); y1 = R1*Math.cos(theta); 
x3 = R2*Math.sin(theta); y3 = R2*Math.cos(theta); 

// Angles of each team
team_angles = [];
for(var n=0; n<number_of_teams; n++) team_angles.push(n*board.r_step);

// Default shortcut coordinates and team zones.
board.shortcut_coordinates.length = 0;
board.team_zones.length           = 0;
for(n=0; n<number_of_teams; n++) {
  //                  team_index, x1, y1, x2, y2, x3, y3,  x4, y4,       rotation, alpha, draw_mode, grab_mode
  board.add_team_zone(n+1,       -x1, y1, x1, y1, x3, y3, -x3, y3, team_angles[n], 0.5,   0);
  board.shortcut_coordinates.push([0, -y1+150, 100, team_angles[n]]);
}
// Full board view
board.shortcut_coordinates.push([0,0,50,0]);



/////////////
// PIECES  
/////////////

board.new_piece_rotates_with_canvas = true;
board.new_piece_r_step              = 45;
board.new_piece_movable_by          = null;

// CHIPS
board.new_piece_collect_offset_x = 2;
board.new_piece_collect_offset_y = 2;
board.new_piece_physical_shape = "inner_circle";
board.new_piece_scale = 0.9
energies = [];
for(n=0;n<number_of_teams*energies_per_team; n++) energies.push(board.add_piece(['dice/c6d6.png','dice/c6d5.png','dice/c6d4.png','dice/c6d3.png','dice/c6d2.png','dice/6d1.png']));

extra_energies = [];
for(n=0;n<number_of_teams*energies_per_team; n++) extra_energies.push(board.add_piece(['dice/c6d6.png','dice/c6d5.png','dice/c6d4.png','dice/c6d3.png','dice/c6d2.png','dice/6d1.png']));

regions = [];
for(n=0;n<number_of_teams*energies_per_team; n++) regions.push(board.add_piece(['dice/body6d6.png','dice/body6d5.png','dice/body6d4.png','dice/body6d3.png','dice/body6d2.png','dice/body6d1.png']));


board.new_piece_scale = 1.0;

// FANCY DICE
function add_dice(d, quantity) {
  var images = [];

  if(d == 90) for(var m=9; m>=0; m--) images.push('dice-fancy/90d'           +String(m)+'0.png');
  else        for(var m=d; m>=1; m--) images.push('dice-fancy/'+String(d)+'d'+String(m)+'.png');
  
  var dice   = [];
  for(var m=1; m<=quantity; m++) dice.push(board.add_piece(images));
  return dice;
}

d90s = add_dice(90, number_of_teams*fancy_dice_per_team);
d20s = add_dice(20, number_of_teams*fancy_dice_per_team);
d12s = add_dice(12, number_of_teams*fancy_dice_per_team);
d10s = add_dice(10, number_of_teams*fancy_dice_per_team);
d8s  = add_dice( 8, number_of_teams*fancy_dice_per_team);
d6s  = add_dice( 6, number_of_teams*fancy_dice_per_team);
d4s  = add_dice( 4, number_of_teams*fancy_dice_per_team);
//d2s  = add_dice( 2, number_of_teams*fancy_dice_per_team);
dice = d90s.concat(d20s).concat(d12s).concat(d10s).concat(d8s).concat(d6s).concat(d4s);

// Counters for your energy when recovering.
d12_counters = add_dice(12, number_of_teams)


/////////////////////
// FUNCTIONALITY
/////////////////////

function team_collect(n) {
  if(n==undefined) n = (8-get_team_number()+1)%8;
  if(n<0 || n>7) return;

  var x0 = 0;
  var y0 = y1+70;
  var r0 = -n*board.r_step;
  var dx = 77;
  var yoff = 185;

  // Place the region dice
  var d = rotate_vector(x0, y0+20, r0); board.expand_pieces(regions.slice(n*energies_per_team, (n+1)*energies_per_team), 8, d.x, d.y, board.expand_spacing_x, 65, 5, -r0, r0);
  
  // Place the extra energies stack
  d = rotate_vector(x0-40, y0+90, r0); board.collect_pieces(extra_energies.slice(n*energies_per_team, (n+1)*energies_per_team), d.x, d.y, false, 5, r0, r0);
  
  // Collect my energies and expand them for easy counting
  var my_energies = energies.slice(n*energies_per_team, n*energies_per_team+energies_per_team);
  d = rotate_vector(x0, y0-30, r0);
  board.expand_pieces(my_energies, 8, d.x, d.y, board.expand_spacing_x, 65, 5, r0, r0);
  //                 (pieces, number_per_row,  x,   y,      spacing_x,   spacing_y, active_image, r_piece, r_stack)
  
  // Disable those based on counter.
  var max_E = 12-d12_counters[n].active_image;
  for(var m=max_E; m<energies_per_team; m++) my_energies[m].set_active_image(1);
  
  // Collect the dice (pieces,x,y,shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top)
  d = rotate_vector(x0-dx*3, y0+yoff, r0); board.collect_pieces(d90s.slice(n*fancy_dice_per_team, (n+1)*fancy_dice_per_team), d.x, d.y, false, 0, r0, r0);
  d = rotate_vector(x0-dx*2, y0+yoff, r0); board.collect_pieces(d20s.slice(n*fancy_dice_per_team, (n+1)*fancy_dice_per_team), d.x, d.y, false, 0, r0, r0);
  d = rotate_vector(x0-dx*1, y0+yoff, r0); board.collect_pieces(d12s.slice(n*fancy_dice_per_team, (n+1)*fancy_dice_per_team), d.x, d.y, false, 0, r0, r0);
  d = rotate_vector(x0-dx*0, y0+yoff, r0); board.collect_pieces(d10s.slice(n*fancy_dice_per_team, (n+1)*fancy_dice_per_team), d.x, d.y, false, 0, r0, r0);
  d = rotate_vector(x0+dx*1, y0+yoff, r0); board.collect_pieces(d8s.slice(n*fancy_dice_per_team, (n+1)*fancy_dice_per_team), d.x, d.y, false, 0, r0, r0);
  d = rotate_vector(x0+dx*2, y0+yoff, r0); board.collect_pieces(d6s.slice(n*fancy_dice_per_team, (n+1)*fancy_dice_per_team), d.x, d.y, false, 0, r0, r0);
  d = rotate_vector(x0+dx*3, y0+yoff, r0); board.collect_pieces(d4s.slice(n*fancy_dice_per_team, (n+1)*fancy_dice_per_team), d.x, d.y, false, 0, r0, r0);

}


// setup the board with N players
function setup() {
  console.log('setup');

  // collect the energies way off to the side to start.
  //board.collect_pieces(energies,  0,0, false, 0, 0, 0);
  
  // distribute the energies to each team
  for(var n=0; n<number_of_teams; n++) {
    var y0 = y1+70;
  
    // Counters
    var d = rotate_vector(40, y0+85, -n*board.r_step);
    d12_counters[n].set_target(d.x,d.y,0+n*board.r_step).set_active_image(4);

    // Not persistent pieces
    team_collect(n);
  }

  // Deselect everything
  board.deselect_pieces();
}


/**
 * Throws selected pieces into the pot.
 */
function bet(R) {
  var R = or_default(R, 0.5);
  var minimum_distance = 40;

  // Throws in the piece under the mouse. If it's 
  // the fold plate, flip it and send all the cards.

  // Only do so if we're not in someone else's team zone
  team_zone = board.in_team_zone(board.mouse.x, board.mouse.y);
  if(team_zone < 0 || team_zone == get_team_number()) {
    var i = board.find_top_piece_at_location(board.mouse.x, board.mouse.y);
    
    // Found one!
    if(i >= 0) {

      // Send it to the top
      var p = board.pieces[i];

      // Get the new coordinates
      var x = p.x*R+(Math.random()-0.5)*20;
      var y = p.y*R+(Math.random()-0.5)*20;

      // If we have previous coordinates
      if(this.last_x != undefined) {

        // Get the distance
        var dx = x-this.last_x;
        var dy = y-this.last_y;

        // Make sure the distance is big enough.
        if(dx*dx+dy*dy < minimum_distance*minimum_distance) {
          var theta = 2*Math.PI*Math.random();
          dx = minimum_distance*Math.cos(theta);
          dy = minimum_distance*Math.sin(theta);
          x = this.last_x+dx;
          y = this.last_y+dy;
        }
      }

      // Remember the last value.
      this.last_x = x; 
      this.last_y = y;

      // See if it's a folder
      p.send_to_top();
      p.set_target(x, y, Math.random()*360);

      // Roll the die
      p.set_active_image(rand_int(0,p.images.length-1));

    } // End of "found a piece"
  } // End of if hovering in a grab zone
}



// Overloading keydown dummy function for our game-specific keys
function after_event_keydown(e) {
  switch (e.keyCode) {
    case 66: // B for bet.
    case 84: // T for toss
      bet();
    break;
    case 13: // ENTER for collect everything
      team_collect();
    break;

    case 219: // ] to increment image
      var sps = get_selected();
      for(var n=0; n<sps.length; n++) sps[n].increment_active_image()
    break;
    case 221: // [ to decrement image
      var sps = get_selected();
      for(var n=0; n<sps.length; n++) sps[n].decrement_active_image()
    break;
  }
}

function after_event_mousedown(e,mouse) {
  console.log('mouse button', e.button);
  if(e.ctrlKey) {
    if(e.button == 2) deal(e,true,true); // face up
    else              deal(e,true);
  }
  else if (e.button != 0 && e.button != 2) bet();
}






// Load cookies, ask for the config, and start accepting piece packets.
board.go();
