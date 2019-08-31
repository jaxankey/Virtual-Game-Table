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

/////// GO

// This is needed to differentiate the game cookies
board.game_name = "go";

// Paint the table
board.set_background_image('go/board.png');

// set the allowed rotations and initial zoom (out)
board.z_target = 50;
board.r_step   = 45;

board.collect_r_piece = 0;    // All pieces collect with the same rotation
board.collect_r_stack = null; // Stacks are relative to the view

// Add some people
board.add_team('observer',  ['hand_blue.png',  'fist_blue.png'],   '#7777FF');
board.add_team('black',     ['hand_gray.png',  'fist_gray.png'],   '#444444');
board.add_team('white',     ['hand_white.png', 'fist_white.png'],  '#AAAAAA');

// Add an 8x8 snap grid with 64px square width
w = 50; 
snappy = board.add_snap_grid(
  -w*9.5, -w*9.5, // upper left corner 
   w*19,   w*19,  // width and height
   0,      0,     // origin of grid
   w,      0,     // basis vector 1
   0,      w);    // basis vector 2

// Set new piece defaults
board.new_piece_snap_index          = snappy; // new pieces will be linked to this grid
board.new_piece_physical_shape      = "inner_circle";
board.new_piece_rotates_with_canvas = false;

// Add all the pieces (no particular place)
blacks = board.add_pieces(180, ['go/stone_black.png']);
whites = board.add_pieces(180, ['go/stone_white.png']);

// define the new game setup
function setup() {
  for(n in blacks) blacks[n].set_target( 650+rand_int(-100,100),  350+rand_int(-100,100), 0)
  for(n in whites) whites[n].set_target(-650+rand_int(-100,100), -350+rand_int(-100,100), 0)
}

// Restore user settings (if any)
board.go();
