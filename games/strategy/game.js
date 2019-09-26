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

//////////////////////////
// STRATEGY GAME
//////////////////////////

console.log(this.document.cookie);

// short name needed for differentiating the games in the cookies
board.game_name = 'strategy';

// Some global geometry constants
R = 180; // space between tile centers
N = 3;   // board radius in number of tile (allows scaling to more tiles)

// set the allowed rotations and initial zoom (out)
board.r_step     = 60;
board.r_home     = 30; // Where the "escape" key will take you
board.r_target   = 30;

board.collect_r_piece = null;     // what rotation to apply to collected pieces (null means view rotation)
board.collect_r_stack = null;     // what rotation to apply to collected pieces (null means view rotation)
  


//////////////////////////
// TEAMS               
//////////////////////////

// Add some teams
board.add_team('observer', ['hand_white.png', 'fist_white.png' ], '#cccccc');
board.add_team('red',      ['hand_red.png',   'fist_red.png'   ], '#ff2a2a'); 
board.add_team('blue',     ['hand_blue.png',  'fist_blue.png'  ], '#5599ff'); 
board.add_team('violet',   ['hand_violet.png','fist_violet.png'], '#d62cff'); 
board.add_team('orange',   ['hand_orange.png','fist_orange.png'], '#ff6600'); 
board.add_team('gray',     ['hand_gray.png',  'fist_gray.png'  ], '#808080'); 
board.add_team('yellow',   ['hand_yellow.png','fist_yellow.png'], '#ffe84b'); 
board.add_team('manager',  ['hand_white.png', 'fist_white.png' ], '#cccccc');

// team zone and shortcut coordinates
x1 = 190*R/120*N/3; y1 = 490*R/120*N/3; 
x3 = x1+50;         y3 = y1+195;
team_angles = [30, 90, 150, 210, 270, 330];
board.shortcut_coordinates = [];
for(n=0; n<6; n++) {
  board.set_team_zone(n+1,-x1,y1,x1,y1,x3,y3,-x3,y3,      team_angles[n]);
  board.shortcut_coordinates.push([0, -405*R/120*N/3, 50, team_angles[n]]);
}

//////////////////////////
// HEX TILES
//////////////////////////

// Add a snap grid
snappy_tiles = board.add_snap_grid(
  -R*4,      -R*4,          // upper left corner
   R*8,       R*8,          // width and height
     0,         0,          // origin of grid
     0,         R,          // basis vector 1
   R*Math.sin(Math.PI/3.0), // basis vector 2 x
   R*Math.cos(Math.PI/3.0), // basis vector 2 y
);  

// Set the new piece defaults for hex tiles
board.new_piece_rotates_with_canvas = false;
board.new_piece_movable_by          = [7];
board.new_piece_snap_index          = snappy_tiles;
board.new_piece_r_target            = 0;
board.new_piece_r_step      		    = 60;
board.new_piece_physical_shape 		  = 'ellipse';

// add the hex tiles
hex_tiles = [];
for(n=0; n<10; n++) hex_tiles.push(board.add_piece(['hex_forest.png']));
for(n=0; n<4;  n++) hex_tiles.push(board.add_piece(['hex_city.png']));
for(n=0; n<8;  n++) hex_tiles.push(board.add_piece(['hex_water.png']));
for(n=0; n<10; n++) hex_tiles.push(board.add_piece(['hex_plains.png']));
for(n=0; n<5;  n++) hex_tiles.push(board.add_piece(['hex_mountains.png']));

// add the castles
//castle = board.add_piece(['castle.png']);
board.new_piece_rotates_with_canvas = true;
mini_castles = [
  board.add_piece(['mini_castle.png']),
  board.add_piece(['mini_castle.png']),
  board.add_piece(['mini_castle.png']),
  board.add_piece(['mini_castle.png']),
  board.add_piece(['mini_castle.png']),
  board.add_piece(['mini_castle.png'])];

// Set the bottom index so pieces aren't sent below the tiles!
board.bottom_index = board.pieces.length;

//////////////////////////
// PIECES
//////////////////////////

// reset the new piece defaults
board.new_piece_r_step      =  30;
board.new_piece_r_target    = -30;
board.new_piece_movable_by  = null;
board.new_piece_snap_index  = null;
board.new_piece_rotates_with_canvas = true;
board.new_piece_physical_shape = 'ellipse';

// add the action pieces for each player
places    = [];
attacks   = [];
defends   = [];
resources = [];
forts     = [];
walls_offense = [];
walls_defense = [];

// add all the generic pieces
for (n=0; n<6; n++) {
  
  // Rectangular stuff
  board.new_piece_physical_shape = "rectangle";
  board.new_piece_owners = [n+1];
  
  // add move pieces
  a = [];
  a.push(board.add_piece(['move_hidden.png', 'attack_3.png'], ['private_attack_3.png', 'attack_3.png']));
  a.push(board.add_piece(['move_hidden.png', 'attack_2.png'], ['private_attack_2.png', 'attack_2.png']));
  a.push(board.add_piece(['move_hidden.png', 'attack_2.png'], ['private_attack_2.png', 'attack_2.png']));
  a.push(board.add_piece(['move_hidden.png', 'attack_1.png'], ['private_attack_1.png', 'attack_1.png']));
  a.push(board.add_piece(['move_hidden.png', 'attack_1.png'], ['private_attack_1.png', 'attack_1.png']));
  a.push(board.add_piece(['move_hidden.png', 'attack_1.png'], ['private_attack_1.png', 'attack_1.png']));
  a.push(board.add_piece(['move_hidden.png', 'bluff.png'   ], ['private_bluff.png',    'bluff.png'   ]));
  attacks[n] = a;
  
  d = [];
  d.push(board.add_piece(['move_hidden.png', 'defend_3.png'], ['private_defend_3.png', 'defend_3.png']));
  d.push(board.add_piece(['move_hidden.png', 'defend_2.png'], ['private_defend_2.png', 'defend_2.png']));
  d.push(board.add_piece(['move_hidden.png', 'defend_2.png'], ['private_defend_2.png', 'defend_2.png']));
  d.push(board.add_piece(['move_hidden.png', 'defend_1.png'], ['private_defend_1.png', 'defend_1.png']));
  d.push(board.add_piece(['move_hidden.png', 'defend_1.png'], ['private_defend_1.png', 'defend_1.png']));
  d.push(board.add_piece(['move_hidden.png', 'defend_1.png'], ['private_defend_1.png', 'defend_1.png']));
  d.push(board.add_piece(['move_hidden.png', 'bluff.png'   ], ['private_bluff.png',    'bluff.png'   ]));
  defends[n] = d;
  
  // Round stuff
  board.new_piece_physical_shape = "outer_circle";
  
  // add walls
  wa = [];
  wd = [];
  for(m=0; m<7; m++) {
    wd.push(board.add_piece(['wall_defense.png']));
    wa.push(board.add_piece(['wall_offense.png']));
  }
  walls_offense[n] = wa;
  walls_defense[n] = wd;
  
  
  // add resources
  r = [];
  for(m=0; m<32; m++) r.push(board.add_piece(['resource.png']));
  resources[n] = r;
}

// add forts
f0=[]; f1=[]; f2=[]; f3=[]; f4=[]; f5=[];
for(n=0; n<20; n++) {
  f0.push(board.add_piece(['fort_red.png']));
  f1.push(board.add_piece(['fort_blue.png']));
  f2.push(board.add_piece(['fort_violet.png']));
  f3.push(board.add_piece(['fort_orange.png']));
  f4.push(board.add_piece(['fort_gray.png']));
  f5.push(board.add_piece(['fort_yellow.png']));
}
forts=[f0, f1, f2, f3, f4, f5];

// bomb cars
board.new_piece_rotates_with_canvas = false;
bombs = [
  board.add_piece(['bomb_red.png']),
  board.add_piece(['bomb_blue.png']),
  board.add_piece(['bomb_violet.png']),
  board.add_piece(['bomb_orange.png']),
  board.add_piece(['bomb_gray.png']),
  board.add_piece(['bomb_yellow.png'])]
  
// add place markers
board.new_piece_rotates_with_canvas = false;
poo  = board.add_piece(['toilet.png']);
king = board.add_piece(['king.png']);

board.new_piece_rotates_with_canvas = true;
board.new_piece_physical_shape = 'rectangle';

// add dice
dice = [];
for(n=0; n<5; n++) dice.push(board.add_piece(['dice/6d1.png','dice/6d2.png','dice/6d3.png','dice/6d4.png','dice/6d5.png','dice/6d6.png']));



/////////////////////
// AVATARS
/////////////////////
board.new_piece_scale               = 1;
board.new_piece_rotates_with_canvas = false;
board.new_piece_physical_shape      = 'inner_circle';
board.add_avatars();



//////////////////////////
// SETUP
//////////////////////////

// Collects all the pieces at setup and the end of a turn.
function collect_pieces(n) {
  console.log('collect()', n);
  
  n = or_default(n, get_team_number()-1);
  
  if (n<0 || n==undefined) return;
  
  // get a quick handle on the player pieces
  angle = team_angles[n];
  
  // RESOURCES
  r = resources[n];
  for (m=0; m<r.length; m++) {
    v = rotate_vector(R*1.25  + Math.random()*80-40, 
                      y1+100 + Math.random()*80-40, angle);
    r[m].set_target(v.x, v.y, -angle);
  }
  
  // ACTIONS
  e = attacks[n].concat(defends[n]);
  shuffle_array(e);
  a = e.slice(0,e.length/2)
  d = e.slice(e.length/2,e.length)
  
  // Distribute the top row
  for (m=0; m<a.length; m++) {
    v = rotate_vector((m-3)*42, y1+80, angle);
    a[m].set_target(v.x, v.y, -angle, null, true);
    a[m].active_image = 0;
  }

  // Distribute teh bottom row
  for (m=0; m<d.length; m++) {
    v = rotate_vector((m-3)*42, y1+120, angle);
    d[m].set_target(v.x, v.y, -angle, null, true);
    d[m].active_image = 0;
  }
}

// Initial setup of the whole board
function setup() {
  console.log('setup()');
  
  // shuffle the hex tiles
  shuffle_array(hex_tiles);

  // deal them out
  for(n=0; n<hex_tiles.length; n++) {

    // get the spiral grid coordinates
    s = hex_spiral(n);
    hex_tiles[n].set_target_grid(s.n, s.m, 30);
    
    // random rotation
    //hex_tiles[n].set_rotation(Math.floor(Math.random()*5)*60);
  }
    
  // now deal out the pieces by team
  for (n=0; n<6; n++) {
    
    // store the angle of the team
    angle = team_angles[n];
  
    // TURN PIECES
    collect_pieces(n);
    
    // MINICASTLE
    v = rotate_vector(0, 405*R/120*N/3, angle);
    mini_castles[n].set_target(v.x, v.y, 30-angle);
    
    // OCCUPATION MARKERS
    f  = forts[n];
    v = rotate_vector(0, 350*R/120*N/3, angle);
    for (m=0; m<f.length; m++) {
      v = rotate_vector(-R*1.15, y1+60-0.5*m, angle);
      f[m].set_target(v.x, v.y, -angle);
    }
    
    // BOMB CARS
    v = rotate_vector(-R*1.15, y1+140, angle);
    bombs[n].set_target(v.x, v.y, 0);
    
    // CORNER TOWERS
    wa = walls_offense[n];
    for (m=0; m<wa.length; m++) {
      v = rotate_vector((m-3)*42, y1+40, angle);
      wa[m].set_target(v.x, v.y, -angle);
    }
    wd = walls_defense[n];
    for (m=0; m<wd.length; m++) {
      v = rotate_vector((m-3)*42, y1+160, angle);
      wd[m].set_target(v.x, v.y, -angle);
    }

    
  } // end of dealing team pieces
  
  // special pieces
  poo .set_target(0, 470*R/120*N/3,0);
  king.set_target(0,-470*R/120*N/3,0);

  // put dice off to the side.
  for(n in dice) dice[n].set_target(120*(Math.random()-0.5), 
              470*R/120*N/3 + 200 + 120*(Math.random()-0.5), 
                                    720*(Math.random()-0.5));

  // Avatars          (pieces,        x,              y, shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top)
  board.collect_pieces(board.avatars, 0, -580*R/120*N/3, false,  0,           undefined, undefined, 1,1);

}

// recall previous settings
board.go();
