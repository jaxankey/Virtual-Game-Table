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
board.game_name = 'poker';

// set the allowed rotations and initial zoom (out)
board.z_target = 80;
board.r_step   = 45;
board.pan_step = 250;

// Collection and expansion settings
board.collect_r_piece  = null; // Rotates the piece to the current view
board.collect_r_stack  = null; // Rotates the stack offsets to the current view
board.expand_spacing_x = 35;
board.expand_spacing_y = 55;
board.expand_number_per_row = 10;

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
board.add_team('manager',  ['hand_white.png', 'fist_white.png' ], '#cccccc');

// Set up the team zones based on the number of seats
number_of_teams = 8;
theta = 0.5*(360/number_of_teams)*Math.PI/180.0;  // Wedge angle in radians
R1    = 500;                                      // Inner radius of team zones
R2    = (R1*Math.cos(theta)+250)/Math.cos(theta); // Outer radius of team zones
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
  board.set_team_zone(n+1,       -x1, y1, x1, y1, x3, y3, -x3, y3, team_angles[n], 0.5,   0);
  board.shortcut_coordinates.push([0, -y1+150, 100, team_angles[n]]);
}
// Full board view
board.shortcut_coordinates.push([0,0,50,0]);



/////////////
// PIECES  
/////////////

names = ['1s', 'ks', 'qs', 'js', '10s', '9s', '8s', '7s', '6s', '5s', '4s', '3s', '2s',
         '1h', 'kh', 'qh', 'jh', '10h', '9h', '8h', '7h', '6h', '5h', '4h', '3h', '2h',
         '1c', 'kc', 'qc', 'jc', '10c', '9c', '8c', '7c', '6c', '5c', '4c', '3c', '2c',
         '1d', 'kd', 'qd', 'jd', '10d', '9d', '8d', '7d', '6d', '5d', '4d', '3d', '2d',
         'bj', 'sj'];

// BOARDS
board.new_piece_rotates_with_canvas = true;
board.new_piece_r_step              = 45;
//board.set_background_image('table.png');
board.new_piece_movable_by = null;

// Add all the chips
board.new_piece_collect_offset_x = 2;
board.new_piece_collect_offset_y = 2;
board.new_piece_physical_shape = "inner_circle";
chips_black = []; for(n=0; n<40;  n++) chips_black .push(board.add_piece(['chips/chip_black.png']));
chips_blue  = []; for(n=0; n<40;  n++) chips_blue  .push(board.add_piece(['chips/chip_blue.png']));
chips_red   = []; for(n=0; n<80;  n++) chips_red   .push(board.add_piece(['chips/chip_red.png']));
chips_white = []; for(n=0; n<160; n++) chips_white .push(board.add_piece(['chips/chip_white.png']));
chips = chips_black.concat(chips_blue).concat(chips_red).concat(chips_white);

// Add all the cards
board.new_piece_collect_offset_x = 0.1;
board.new_piece_collect_offset_y = 0.1;
board.new_piece_physical_shape = "rectangle";
cards = [];
for(n in names) cards.push(board.add_piece(['cards/back.png', 'cards/'+names[n]+'.png'], ['cards/'+names[n]+'p.png', 'cards/'+names[n]+'.png']));



/////////////////////
// FUNCTIONALITY
/////////////////////



function collect_all_cards() {
  console.log('collect_all_cards');

  // Get my team number for collecting
  var team = get_team_number();

  // Unselect all cards from all clients
  for(n in cards) {
    var p = cards[n];
    
    // Loop over every client, making sure it's not in their selected pieces.
    for(var i in board.client_selected_pieces) {
      var j = board.client_selected_pieces[i].indexOf(p);
      if(j>=0) board.client_selected_pieces[i].splice(j,1);
    }
  }

  // Make them your selection if they're within R2 (so you can disable cards)
  var sps = board.client_selected_pieces[get_my_client_index()];
  sps.length = 0;
  for(var n in cards) {
    var c = cards[n];
    if(c.x*c.x+c.y*c.y <= R2*R2) sps.push(c)
  }

  // Get the target for the deck
  if(team == 0 || team == 9) d = rotate_vector(0, 0, 0);
  else                       d = rotate_vector(R1*0.3, R1*0.8, 45*(team-1));
  
  // collect the cards (pieces,x,y,shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top)
  board.collect_pieces(sps, d.x, d.y, true, 0, board.r_target, board.r_target);
}

/**
 * Sorts the selected items.
 */
function sort_selected() {
  // Get the selected pieces
  sps = board.client_selected_pieces[get_my_client_index()]
  
  // Sort them
  sps.sort(function(a, b){return a.piece_id-b.piece_id});

  // Loop over them, putting them on top of the stack
  for(n in sps) {
    p = sps[n];
    i = board.find_piece_index(p.piece_id);
    board.pop_piece(i);
    board.insert_piece(p, board.pieces.length);
  }
}


/**
 * Throws selected pieces into the pot.
 */
function bet() {
  // Get the selected pieces
  var sps = board.client_selected_pieces[get_my_client_index()];

  // By default we bet all selected pieces
  already_bet = false;
  for(var i in sps) 
  {
    // Only throw in the chips!
    if(chips.indexOf(sps[i]) >= 0) {
      sps[i].set_target(sps[i].x*0.5+(Math.random()-0.5)*20, 
                                      sps[i].y*0.5+(Math.random()-0.5)*20, 
                                      Math.random()*360);
      already_bet = true;
    }
  }
  
  // Clear the selection.
  sps.length=0;

  // Otherwise we use the one just under the mouse.
  if(!already_bet) {

    // Only do so if we're not in someone else's team zone
    team_zone = board.in_team_zone(board.mouse.x, board.mouse.y);
    if(team_zone < 0 || team_zone == get_team_number()) {
      var i = board.find_top_piece_at_location(board.mouse.x, board.mouse.y);
      
      // Found one!
      if(i >= 0) {
        // Fire it off
        board.pieces[i].set_target(board.pieces[i].x*0.5+(Math.random()-0.5)*20, 
                                   board.pieces[i].y*0.5+(Math.random()-0.5)*20,
                                   Math.random()*360);
        
        // Put it on top
        p = board.pop_piece(i);
        board.insert_piece(p, board.pieces.length);

      } // End of "found a piece"
    } // End of if hovering in a grab zone
  } // "haven't already bet, look under mouse"
}

// Find the free chips in the middle of the board
function get_free_chips() {
  free_chips = [];
  for(var n in chips) {
    if(board.in_team_zone(chips[n].x, chips[n].y) < 0 &&
       chips[n].x*chips[n].x + chips[n].y*chips[n].y <= R1*R1) 
       free_chips.push(chips[n]);
  }
  return free_chips;
}

function collect_pot() {

  // Get all the free chips
  free_chips = get_free_chips();

  for(var n in free_chips) {
    d = rotate_vector((Math.random()-0.5)*50, R2*0.7+(Math.random()-0.5)*50, (get_team_number()-1)*45);
    free_chips[n].set_target(d.x, d.y, (Math.random()-0.5)*360);
  }
}

function get_active_teams() {
  var teams = [];
  for(n in board.client_teams) {

    // If we don't already have this team and it's not the observer or admin, add it to the list!
    if(!teams.includes(board.client_teams[n]) && ![0,9].includes(board.client_teams[n]))
      teams.push(board.client_teams[n]);
  }
  return teams;
}

function deal(face_up) {
  console.log('deal');

  // Find which teams are in the game
  var teams = get_active_teams();

  // Find my selected pieces
  sps = board.client_selected_pieces[get_my_client_index()];

  // Throw the top card from my selected pieces to each team, popping them off my held pieces
  for(i in teams) {
    team = teams[i];

    if(sps.length) {
      // Get the rotated coordinate of the dealt card
      d = rotate_vector((Math.random()-0.5)*50,-R1*0.7+(Math.random()-0.5)*50,-(team-1)*45);

      // Pop it and send it
      p = sps.pop();
      p.set_target(d.x, -d.y, -(team-1)*45+720);

      if(face_up) p.active_image = 1;

      // Put it on top of the stack
      board.pop_piece(board.pieces.lastIndexOf(p));
      board.insert_piece(p, board.pieces.length);
    } 
  } // end of loop over active teams
}

// setup the board with N players
function setup() {
  console.log('setup');

  // collect the  cards (pieces,x,y,shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top)
  board.collect_pieces(   cards,0,0,   true,           0,      0,      0);
  
  // collect the chips way off to the side to start.
  board.collect_pieces(chips,   2*R2,0,   true,           0,      0,      0);
  
  // distribute the chips to each team
  for(var n=0; n<number_of_teams; n++) {
    
    var x0 = -175;
    var y0 = y3-40;
    var dx = -50;
    var r0 = -n*board.r_step;

    // Collect the black chips (pieces,x,y,shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top)
    d = rotate_vector(x0, y0, r0);
    board.collect_pieces(chips_black.slice(n*5, n*5+5), d.x, d.y, false, 0, 0, -n*board.r_step);
  
    // Collect the blue chips (pieces,x,y,shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top)
    d = rotate_vector(x0-dx, y0, r0);
    board.collect_pieces(chips_blue.slice(n*5, n*5+5), d.x, d.y, false, 0, 0, -n*board.r_step);
  
    // Collect the red chips (pieces,x,y,shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top)
    d = rotate_vector(x0-2*dx, y0, r0);
    board.collect_pieces(chips_red.slice(n*10, n*10+5), d.x, d.y, false, 0, 0, -n*board.r_step);
    
    d = rotate_vector(x0-3*dx, y0, r0);
    board.collect_pieces(chips_red.slice(n*10+5, n*10+10), d.x, d.y, false, 0, 0, -n*board.r_step);
  
    // Collect the white chips (pieces,x,y,shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top)  
    d = rotate_vector(x0-4*dx, y0, r0);
    board.collect_pieces(chips_white.slice(n*20, n*20+5), d.x, d.y, false, 0, 0, -n*board.r_step);

    d = rotate_vector(x0-5*dx, y0, r0);
    board.collect_pieces(chips_white.slice(n*20+5, n*20+10), d.x, d.y, false, 0, 0, -n*board.r_step);

    d = rotate_vector(x0-6*dx, y0, r0);
    board.collect_pieces(chips_white.slice(n*20+10, n*20+15), d.x, d.y, false, 0, 0, -n*board.r_step);

    d = rotate_vector(x0-7*dx, y0, r0);
    board.collect_pieces(chips_white.slice(n*20+15, n*20+20), d.x, d.y, false, 0, 0, -n*board.r_step);
  }

  
}


// Overloading keydown dummy function for our game-specific keys
function event_keydown(e, p, i) {
  switch (e.keyCode) {
    case 66: // B for bet.
      bet();
    break;
    case 76: // L for deaL
      deal(e.shiftKey);
    break;
  }
}

// Load cookies, ask for the config, and start accepting piece packets.
board.go();