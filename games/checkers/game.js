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

/////// CHECKERS

// This is needed to differentiate the game cookies
board.game_name = "checkers";

// Paint the table
board.set_background_image('board.png');

// Add some people
board.add_team('observer',  ['hand_white.png', 'fist_white.png'],   '#BBB');
board.add_team('red',       ['hand_red.png',   'fist_red.png'],     '#F88');
board.add_team('blue',      ['hand_blue.png',  'fist_blue.png'],    '#88F');

// Add an 8x8 snap grid with 64px square width
w = 64; 
snappy = board.add_snap_grid(
  -w*4,   -w*4,   // upper left corner 
   w*8,    w*8,   // width and height
  -w*3.5, -w*3.5, // origin of grid
   w,      0,     // basis vector 1
   0,      w);    // basis vector 2

// Set new piece defaults
board.new_piece_snap_index = snappy; // new pieces will be linked to this grid

// Add all the pieces (no particular place)
reds   = board.add_pieces(12, ['checker_red.png', 'king_red.png' ]);
blues  = board.add_pieces(12, ['checker_blue.png','king_blue.png']);

// define the new game setup
function setup() {

  // loop over all the pieces
  for(i=0; i<4; i++){
  
    // use the basis vectors of the grid for setup, default rotation 0, not kinged
    reds[i]   .set_target_grid(2*i+1,0, 0).set_active_image(0);
    reds[i+4] .set_target_grid(2*i,  1, 0).set_active_image(0);
    reds[i+8] .set_target_grid(2*i+1,2, 0).set_active_image(0);
    blues[i+8].set_target_grid(2*i,  5, 0).set_active_image(0);
    blues[i]  .set_target_grid(2*i+1,6, 0).set_active_image(0);
    blues[i+4].set_target_grid(2*i,  7, 0).set_active_image(0);
  }
}

// Restore user settings (if any)
board.load_cookies();