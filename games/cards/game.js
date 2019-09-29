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
// Card Table
//////////////////////////

// short name needed for differentiating the games in the cookies
board.game_name = 'cards';
board.shuffle_distance = 50;

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

// Add all the cards
board.new_piece_collect_offset_x = 0.1;
board.new_piece_collect_offset_y = 0.1;
cards = [];
for(var n in names) cards.push(board.add_piece(['cards/back.png', 'cards/'+names[n]+'.png'], ['cards/'+names[n]+'.png', 'cards/'+names[n]+'p.png']));

// Dealer space
dealer = board.add_piece(['cards/dealer.png']);
dealer.is_tray = true;


/////////////////////
// AVATARS
/////////////////////
board.new_piece_scale               = 0.7;
board.new_piece_rotates_with_canvas = false;
board.new_piece_physical_shape      = 'inner_circle';
board.add_avatars();



/////////////////////
// FUNCTIONALITY
/////////////////////

// setup the board with N players
function setup() {
  
  // Dealer space underneath
  dealer.send_to_bottom();
  var d = rotate_vector(1,11, board.r_target);
  dealer.set_target(d.x,d.y,-board.r_target);
  
  // collect the cards (pieces,x,y,shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top)
  board.collect_pieces(cards, 0,0, true, 0, board.r_target, board.r_target);
      
  // Avatars
  board.expand_pieces(board.avatars, 8, 0, 1000, 100, 100, 0, 0, 0);
}

function collect_all_cards() {
  console.log('collect_all_cards');

  // Get my team number for collecting
  var team = get_team_number();

  // Unselect all cards from all clients
  for(n in cards) { var p = cards[n];
    
    // Loop over every client, making sure it's not in their selected pieces.
    for(var i in board.client_selected_pieces) {
      var j = board.client_selected_pieces[i].indexOf(p);
      if(j>=0) board.client_selected_pieces[i].splice(j,1);
    }
  }

  // Make them your selection if they're within R2 (so you can disable cards)
  var sps = [];
  for(var n in cards) {
    var c = cards[n];
    if(c.x*c.x+c.y*c.y <= R2*R2) sps.push(c)
  }

  // Get the target for the deck
  if(team == 0 || team == 9) {
    team_angle = board.r_target;
    var d = {x:0, y:0};
  }
  else {
    team_angle=45*(team-1);
    var d = rotate_vector(R1*0.289, R1*0.75, team_angle);
  }

  // collect the cards (pieces,x,y,shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top)
  board.collect_pieces(sps, d.x, d.y, true, 0, team_angle, team_angle);
  
  // Dealer space underneath
  dealer.send_to_bottom();
  var d = rotate_vector(R1*0.289, R1*0.77, team_angle);
  dealer.set_target(d.x,d.y,-team_angle);
}

// Dummy function only valid for poker.
function collect_pot() {return;}

// Deal the card with the supplied image index
function deal(event, single) {
  
  // First move the dealer rectangle to the bottom.
  dealer.send_to_bottom();
  
  // Select the pieces that are in the dealer tray
  var sps = [];
  for(var n=board.pieces.indexOf(dealer)+1; n<board.pieces.length; n++) {
    p = board.pieces[n];
    if(dealer.contains(p.x_target, p.y_target)) sps.push(p);
  }
  
  // Throw the top card to the mouse coordinates
  if(single) {
    var x = board.mouse.x;
    var y = board.mouse.y;
    var a = Math.atan2(y,x)*180.0/Math.PI;
    var ar = Math.round(a/45)*45;
    p = sps.pop();
    p.set_target(board.mouse.x+(Math.random()-0.5)*50, board.mouse.y+(Math.random()-0.5)*50, ar-90+720);
    if(event.shiftKey) p.active_image = 1;
    else               p.active_image = 0;
    p.send_to_top();
  }

  // Throw one card to each active team
  else {

    // Find which teams are in the game
    var teams = get_active_teams();
    console.log('deal', teams.length);

    // Throw the top card from my selected pieces to each team, popping them off my held pieces
    for(i in teams) {
      team = teams[i];

      if(sps.length) {
        // Get the rotated coordinate of the dealt card
        d = rotate_vector((Math.random()-0.5)*50,-R1*0.7+(Math.random()-0.5)*50,-(team-1)*45);

        // Pop it, send it to the player, and put it on top of the stack.
        p = sps.pop();
        p.set_target(d.x, -d.y, -(team-1)*45+720);
        if(event.shiftKey) p.active_image = 1;
        else               p.active_image = 0;
        p.send_to_top()
      } 
    } // end of loop over active teams
  }
}


// Overloading keydown dummy function for our game-specific keys
function after_event_keydown(e) {
  switch (e.keyCode) {
    case 66: // B for bet.
    case 84: // T for toss
      bet();
    break;
    case 76: // L for deaL
      deal(e);
    break;
    case 79: // O for deal One
      deal(e,true);
    break;
    case 90: // Z for shuffle
      if(board.client_selected_pieces[get_my_client_index()].length==0) shuffle();
    break;
    case 80: // P for Pot
      collect_pot();
    break;
    case 75: // Get dec(K)
      collect_all_cards();
    break;

  }
}

/**
 * Throws pieces under mouse into the pot.
 */
function bet() {
  // Get the selected pieces
  var sps = board.client_selected_pieces[get_my_client_index()];

  // By default we bet all selected pieces
  already_bet = false;
  
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
        board.pieces[i].set_target(board.pieces[i].x*0.25+(Math.random()-0.5)*20, 
                                   board.pieces[i].y*0.25+(Math.random()-0.5)*20,
                                   Math.random()*360);
        
        // Put it on top
        p = board.pop_piece(i);
        board.insert_piece(p, board.pieces.length);

      } // End of "found a piece"
    } // End of if hovering in a grab zone
  } // "haven't already bet, look under mouse"
}

// Overloading the mouse up function
function after_event_mouseup(e) {
  board.deselect_piece(dealer);
}

// Shuffle selection or cards on platter
function shuffle() {
  var my_index = get_my_client_index();
  var sps = board.client_selected_pieces[my_index];
  if(sps.length) shuffle_selected_pieces(0, null, null, 0.1, 0.1);
  else {
    // Select the pieces that are in the dealer tray
    var sps = [];
    for(var n=board.pieces.indexOf(dealer)+1; n<board.pieces.length; n++) {
      p = board.pieces[n];
      if(dealer.contains(p.x_target, p.y_target)) sps.push(p);
    }
    board.shuffle_pieces(sps, 0, dealer.r_target, -dealer.r_target, 0.1, 0.1);
  }
}

// Load cookies, ask for the config, and start accepting piece packets.
board.go();