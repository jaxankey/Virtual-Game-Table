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
// Dice Table
//////////////////////////

// short name needed for differentiating the games in the cookies
board.game_name = 'roll';

// Paint the table
//board.set_background_image('chess/board.png');

// set the allowed rotations and initial zoom (out)
board.z_target = 80;
board.r_step   = 45;
board.pan_step = 250;

// Collection and expansion settings
board.collect_r_piece  = null; // Rotates the piece to the current view
board.collect_r_stack  = null; // Rotates the stack offsets to the current view
board.expand_spacing_x = 70;
board.expand_spacing_y = 70;
board.expand_number_per_row = 5;

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


/////////////
// PIECES  
/////////////
board.new_piece_rotates_with_canvas = true;
board.new_piece_movable_by          = null; // errbody

// Measurement tools
board.new_piece_r_step = 15;
grid1 = board.add_piece(['measurement/grid.png']);
ruler = board.add_piece(['measurement/ruler.png']);
board.new_piece_r_step = 5;
board.new_piece_physical_shape = 'inner_circle';
ring1 = board.add_piece(['measurement/rings.png']);
//ring2 = board.add_piece(['measurement/rings.png']);



// Add all the dice
board.new_piece_r_step = 45;
var number_of_each_die=10;
d90 = [];
for(var n=0; n<number_of_each_die; n++) 
  d90.push(board.add_piece([
    'dice-fancy/90d90.png', 'dice-fancy/90d80.png',
    'dice-fancy/90d70.png', 'dice-fancy/90d60.png',
    'dice-fancy/90d50.png', 'dice-fancy/90d40.png',
    'dice-fancy/90d30.png', 'dice-fancy/90d20.png',
    'dice-fancy/90d10.png', 'dice-fancy/90d00.png',
  ]));

function add_dice(sides, quantity) {
  var images = [];
  for(var m=sides; m>=1; m--) images.push('dice-fancy/'+String(sides)+'d'+String(m)+'.png');
  
  var dice   = [];
  for(var m=1; m<=quantity; m++) dice.push(board.add_piece(images));
  return dice;
}
d20 = add_dice(20, number_of_each_die);
d12 = add_dice(12, number_of_each_die);
d10 = add_dice(10, number_of_each_die);
d8  = add_dice(8,  number_of_each_die);
d6  = add_dice(6,  number_of_each_die);
d4  = add_dice(4,  number_of_each_die);
d2  = add_dice(2,  number_of_each_die);
dice = d20.concat(d12).concat(d10).concat(d8).concat(d6).concat(d4);

// Steal some chess pieces and checkers
function add_pieces(image_paths, quantity) {
  var pieces = [];
  for(n=0; n<quantity; n++) pieces.push(board.add_piece(image_paths));
  return pieces;
}
function get_piece_names(name) {
  var colors = ['white', 'red', 'blue'];
  var names = [];
  for(var n in colors) names.push(name+'_'+colors[n]+'.png');
  return names;
}
var number_of_each_piece=10;
pawns   = add_pieces(get_piece_names('chess/pawn'),   number_of_each_piece);
bishops = add_pieces(get_piece_names('chess/bishop'),   number_of_each_piece);
knights = add_pieces(get_piece_names('chess/knight'),   number_of_each_piece);
rooks   = add_pieces(get_piece_names('chess/rook'),   number_of_each_piece);
queens  = add_pieces(get_piece_names('chess/queen'),   number_of_each_piece);
kings   = add_pieces(get_piece_names('chess/king'),   number_of_each_piece);

black_chips = add_pieces(['chips/chip_black.png'], number_of_each_piece);
blue_chips  = add_pieces(['chips/chip_blue.png'],  number_of_each_piece);
red_chips   = add_pieces(['chips/chip_red.png'],   number_of_each_piece);
white_chips = add_pieces(['chips/chip_white.png'], number_of_each_piece);

// Add shapes
var number_of_each_shape = 10;
board.new_piece_r_step = 15;

function get_shape_names(name) {
  var colors = ['red', 'blue', 'orange', 'black'];
  var names = [];
  for(var n in colors) names.push(name+'-'+colors[n]+'.png');
  return names;
}
circle8s = add_pieces(get_shape_names('shapes/circle8'), number_of_each_shape);
circle4s = add_pieces(get_shape_names('shapes/circle4'), number_of_each_shape);
board.new_piece_physical_shape = 'rectangle';
square8s = add_pieces(get_shape_names('shapes/square8'), number_of_each_shape);
square4s = add_pieces(get_shape_names('shapes/square4'), number_of_each_shape);
log24s   = add_pieces(get_shape_names('shapes/log24'), number_of_each_shape);
log16s   = add_pieces(get_shape_names('shapes/log16'), number_of_each_shape);
log12s   = add_pieces(get_shape_names('shapes/log12'), number_of_each_shape);
log8s   = add_pieces(get_shape_names('shapes/log8'), number_of_each_shape);
log4s   = add_pieces(get_shape_names('shapes/log4'), number_of_each_shape);

/////////////////////
// FUNCTIONALITY
/////////////////////

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

function get_active_teams() {
  var teams = [];
  for(n in board.client_teams) {

    // If we don't already have this team and it's not the observer or admin, add it to the list!
    if(!teams.includes(board.client_teams[n]) && ![0,9].includes(board.client_teams[n]))
      teams.push(board.client_teams[n]);
  }
  return teams;
}

function sort_and_expand_dice() {
  for(var n=0; n<number_of_each_die; n++) 
    for(var m=0; m<6; m++) {
      var i = number_of_each_die*m+n;
      dice[i].set_target((n-number_of_each_die*0.5)*board.expand_spacing_x, 
                                 (m-3                     )*board.expand_spacing_y, 0);
      dice[i].active_image=0;
    }
}

function collect_dice() {
  // collect the dice into piles (pieces,x,y,shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top)
  var x=-510;
  var y=-350; 
  var dy=100;
  board.collect_pieces(d20, x, y     , false, 0, 0);
  board.collect_pieces(d12, x, y+dy  , false, 0, 0);
  board.collect_pieces(d90, x, y+2*dy, false, 0, 0);
  board.collect_pieces(d10, x, y+3*dy, false, 0, 0);
  board.collect_pieces(d8 , x, y+4*dy, false, 0, 0);
  board.collect_pieces(d6 , x, y+5*dy, false, 0, 0);
  board.collect_pieces(d4 , x, y+6*dy, false, 0, 0);
  board.collect_pieces(d2 , x, y+7*dy, false, 0, 0);
}

function collect_pieces() {
  var dx=70;
  var x=-520;
  var dy=70;
  var y=450;
  var first_row = [pawns, bishops, knights, rooks, queens, kings, black_chips, blue_chips, red_chips, white_chips];
  
  for(var n=first_row.length-1; n>=0; n--)  board.collect_pieces(first_row[n],  x-n*dx, y   , false, 0, 0);
}

function collect_boards() {
  ring1.set_target(-934, 950,  0);
  grid1.set_target(-934, 950,  0);
  ruler.set_target(-493, 950, 90);
}

function collect_shapes() {
  board.collect_pieces(log24s, -600, 0, false, 0, 90);
  board.collect_pieces(log4s,  -670, 289, false, 0, 90);
  board.collect_pieces(log16s, -670, -89, false, 0, 90);
  board.collect_pieces(log8s, -740, 223, false, 0, 90);
  board.collect_pieces(log12s, -740, -156, false, 0, 90);
  board.collect_pieces(square4s, -870, 286, false, 0, 90);
  board.collect_pieces(circle4s, -870, 120, false, 0, 90);
  board.collect_pieces(square8s, -1120, 220, false, 0, 90);
  board.collect_pieces(circle8s, -930, -100, false, 0, 90);
  
}

// setup the board with N players
function setup() {
  
  // Collect all four!
  collect_dice();
  collect_pieces();
  collect_boards();
  collect_shapes();

}

// Load cookies, ask for the config, and start accepting piece packets.
board.go();
