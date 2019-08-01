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

/////// CHESS

// needed to differentiate games in cookies
board.game_name = "chess";

// Paint the table
board.set_background_image('board.png');

// Add some people
board.add_team('observer',  ['hand_white.png', 'fist_white.png'],   '#BBBBBB');
board.add_team('red',       ['hand_red.png',   'fist_red.png'],     '#FF8888');
board.add_team('blue',      ['hand_blue.png',  'fist_blue.png'],    '#8888FF');

// Add an 8x8 snap grid with 64px square width
w = 64; 
snappy = board.add_snap_grid(
  -w*4,   -w*4,   // upper left corner 
   w*8,    w*8,   // width and height
  -w*3.5, -w*3.5, // origin of grid
   w,      0,     // basis vector 1
   0,      w);    // basis vector 2

// Set the defaults for new pieces
board.new_piece_snap_index = snappy;
board.new_piece_r_target   = 0;
board.new_piece_r_step     = 45;
   
// Add all the blue pieces (no particular place)
kb  = board.add_piece(['king_blue.png'  ]); 
qb  = board.add_piece(['queen_blue.png' ]); 
bb1 = board.add_piece(['bishop_blue.png']); 
nb1 = board.add_piece(['knight_blue.png']); 
rb1 = board.add_piece(['rook_blue.png'  ]);  
bb2 = board.add_piece(['bishop_blue.png']); 
nb2 = board.add_piece(['knight_blue.png']); 
rb2 = board.add_piece(['rook_blue.png'  ]); 

// Add all the red pieces (no particular place)
kr  = board.add_piece(['king_red.png'  ]); 
qr  = board.add_piece(['queen_red.png' ]);
br1 = board.add_piece(['bishop_red.png']); 
nr1 = board.add_piece(['knight_red.png']);
rr1 = board.add_piece(['rook_red.png'  ]); 
br2 = board.add_piece(['bishop_red.png']); 
nr2 = board.add_piece(['knight_red.png']); 
rr2 = board.add_piece(['rook_red.png'  ]); 

// pawns
pbs = board.add_pieces(8, ['pawn_blue.png']); 
prs = board.add_pieces(8, ['pawn_red.png' ]);  

// define the setup
function setup() {
  
  // blue power pieces
  kb .set_target_grid(4,7).set_rotation(0); 
  qb .set_target_grid(3,7).set_rotation(0);
  bb1.set_target_grid(5,7).set_rotation(0);
  bb2.set_target_grid(2,7).set_rotation(0);
  nb1.set_target_grid(6,7).set_rotation(0);
  nb2.set_target_grid(1,7).set_rotation(0);
  rb1.set_target_grid(0,7).set_rotation(0);
  rb2.set_target_grid(7,7).set_rotation(0);
  
  // red power pieces
  kr .set_target_grid(4,0).set_rotation(0); 
  qr .set_target_grid(3,0).set_rotation(0);
  br1.set_target_grid(5,0).set_rotation(0);
  br2.set_target_grid(2,0).set_rotation(0);
  nr1.set_target_grid(6,0).set_rotation(0);
  nr2.set_target_grid(1,0).set_rotation(0);
  rr1.set_target_grid(0,0).set_rotation(0);
  rr2.set_target_grid(7,0).set_rotation(0);
  
  // pawns
  for (i=0; i<8; i++) {
    prs[i].set_target_grid(i,1).set_rotation(0);
    pbs[i].set_target_grid(i,6).set_rotation(0);
  }
}

// recall previous user settings
board.load_cookies();
