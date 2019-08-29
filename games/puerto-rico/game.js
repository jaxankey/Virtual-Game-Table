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
// PUERTO RICO
//////////////////////////

// short name needed for differentiating the games in the cookies
board.game_name = 'puerto-rico';

// set the allowed rotations and initial zoom (out)
board.z_target = 50;
board.r_step   = 60;

// Collection and expansion settings
board.new_piece_collect_offset_x = -2;
board.new_piece_collect_offset_y =  2;
board.collect_r_piece  =  null;
board.collect_r_stack  =  null;
board.expand_spacing_x =  100;
board.expand_spacing_y =  100;

// Add some teams
board.add_team('observer', ['hand_white.png', 'fist_white.png' ], '#cccccc');
board.add_team('red',      ['hand_red.png',   'fist_red.png'   ], '#ff2a2a'); 
board.add_team('blue',     ['hand_blue.png',  'fist_blue.png'  ], '#5599ff'); 
board.add_team('violet',   ['hand_violet.png','fist_violet.png'], '#d62cff'); 
board.add_team('orange',   ['hand_orange.png','fist_orange.png'], '#ff6600'); 
board.add_team('gray',     ['hand_gray.png',  'fist_gray.png'  ], '#808080'); 
board.add_team('manager',  ['hand_white.png', 'fist_white.png' ], '#cccccc');

// team zone coordinates
x1 = 700; y1 = 1450; 
x3 = 780; y3 = 1590;
team_angles = [-120, -60, 0, 60, 120];

board.set_team_zone(1, -x1,y1, x1,y1, x3,y3, -x3,y3, team_angles[0], 1, 0, 1);
board.set_team_zone(2, -x1,y1, x1,y1, x3,y3, -x3,y3, team_angles[1], 1, 0, 1);
board.set_team_zone(3, -x1,y1, x1,y1, x3,y3, -x3,y3, team_angles[2], 1, 0, 1);
board.set_team_zone(4, -x1,y1, x1,y1, x3,y3, -x3,y3, team_angles[3], 1, 0, 1);
board.set_team_zone(5, -x1,y1, x1,y1, x3,y3, -x3,y3, team_angles[4], 1, 0, 1);

// Locations to go to when hitting the number keys
board.shortcut_coordinates = [
  [0, -2200, 50, -120],
  [0, -2200, 50,  -60],
  [0, -2200, 50,    0],
  [0, -2200, 50,   60],
  [0, -2200, 50,  120],
  [0,    0,  25,    0],
  [board.box_x, -board.box_y, 25,0]];



/////////////
// PIECES  
/////////////

// BOARDS
board.new_piece_rotates_with_canvas = true;
board.new_piece_r_step              = 60;
board.new_piece_movable_by          = [6];
player_boards = [];
for(n=0; n<5; n++) player_boards[n] = board.add_piece(['board-player.jpg']);
board_supply = board.add_piece(['board-supply.jpg']);

// BOATS AND MARKET
boats = [];
boats.push(board.add_piece(['ship-colonist.jpg']));
boats.push(board.add_piece(['ship-4.jpg']));
boats.push(board.add_piece(['ship-5.jpg']));
boats.push(board.add_piece(['ship-6.jpg']));
boats.push(board.add_piece(['ship-7.jpg']));
boats.push(board.add_piece(['ship-8.jpg']));
market = board.add_piece(['tradinghouse.jpg']);

// That's the end of the pieces we can't move.
// Set the bottom index so pieces aren't sent below the above items!
board.bottom_index = board.pieces.length;


// ROLE CARDS
board.new_piece_movable_by = null;
board.new_piece_is_tray    = true;
roles    = []
roles.push(board.add_piece(['role-builder.jpg']));
roles.push(board.add_piece(['role-captain.jpg']));
roles.push(board.add_piece(['role-craftsman.jpg']));
roles.push(board.add_piece(['role-mayor.jpg']));
roles.push(board.add_piece(['role-settler.jpg']));
roles.push(board.add_piece(['role-trader.jpg']));
roles.push(board.add_piece(['role-prospector.jpg']));
roles.push(board.add_piece(['role-prospector.jpg']));
governor = board.add_piece(['governor.jpg']);

// PLANTATIONS & QUARRIES
plantations = board.add_pieces(
  10, ['tile-back.jpg', 'tile-corn.jpg'],
  12, ['tile-back.jpg', 'tile-indigo.jpg'],
  8,  ['tile-back.jpg', 'tile-coffee.jpg'],
  9,  ['tile-back.jpg', 'tile-tobacco.jpg'],
  11, ['tile-back.jpg', 'tile-sugar.jpg']);

// used for initial setup
special_corn1 = plantations[0];
special_corn2 = plantations[1];
special_indigo1 = plantations[11];
special_indigo2 = plantations[12];
special_indigo3 = plantations[13];

quarries = board.add_pieces(8, ['tile-quarry.jpg']);

// BUILDINGS
large_buildings = [];
large_buildings.push(board.add_piece(['build-guildhall.jpg']));
large_buildings.push(board.add_piece(['build-residence.jpg']));
large_buildings.push(board.add_piece(['build-fortress.jpg']));
large_buildings.push(board.add_piece(['build-customshouse.jpg']));
large_buildings.push(board.add_piece(['build-cityhall.jpg']));

building_indigo_small = board.add_pieces(4, ['build-indigo-small.jpg']);
building_indigo       = board.add_pieces(3, ['build-indigo.jpg']);
building_sugar_small  = board.add_pieces(3, ['build-sugar-small.jpg']);
building_sugar        = board.add_pieces(3, ['build-sugar.jpg']);
building_tobacco      = board.add_pieces(3, ['build-tobacco.jpg']);
building_coffee       = board.add_pieces(3, ['build-coffee.jpg']);

buildings_1 = board.add_pieces(
  2, ['build-market-small.jpg'],
  2, ['build-hacienda.jpg'],
  2, ['build-constructionhut.jpg'],
  2, ['build-warehouse-small.jpg']);

buildings_2 = board.add_pieces(
  2, ['build-hospice.jpg'],
  2, ['build-office.jpg'],
  2, ['build-market-large.jpg'],
  2, ['build-warehouse-large.jpg']);

buildings_3 = board.add_pieces(
  2, ['build-factory.jpg'],
  2, ['build-university.jpg'],
  2, ['build-harbor.jpg'],
  2, ['build-wharf.jpg']);

// No more pieces that hold other pieces
board.new_piece_is_tray = false;
  
// ROUND STUFF
board.new_piece_physical_shape = "outer_circle";
  
// DOUBLOONS
doubloons1 = [];
doubloons5 = [];
for(n=0; n<46; n++) doubloons1.push(board.add_piece(['doubloon-1.png']));
for(n=0; n<8;  n++) doubloons5.push(board.add_piece(['doubloon-5.png']));

// VICTORY POINTS
victory1 = [];
victory5 = [];
for(n=0; n<32; n++) victory1.push(board.add_piece(['victory-1.png', 'victory-back.png']));
for(n=0; n<18; n++) victory5.push(board.add_piece(['victory-5.png', 'victory-back.png']));

// COLONISTS
colonists = [];
for(n=0; n<95; n++) colonists.push(board.add_piece(['colonist.png']));

// GOODS
corn    = board.add_pieces(10, ['goods-corn.png']);
coffee  = board.add_pieces(9,  ['goods-coffee.png']);
tobacco = board.add_pieces(9,  ['goods-tobacco.png']);
sugar   = board.add_pieces(11, ['goods-sugar.png']);
indigo  = board.add_pieces(11, ['goods-indigo.png']);


/////////////
// SETUP
/////////////

// stack for special starting pieces
specials = [];

// find and pop a piece from an array
function find_and_pop(piece, array) {
  n = array.indexOf(piece);
  return array.splice(n,1)[0];
}

// setup the board with N players
function setup(N) {
  
  // put the specials back in the stack
  for(n in specials) plantations.push(specials[n]);
  specials = [];
  
  // start with the N==3 conditions
  specials.push(find_and_pop(special_indigo1, plantations));
  specials.push(find_and_pop(special_indigo2, plantations));
  specials.push(find_and_pop(special_corn1,   plantations));
  
  // depending on the number of players, set aside some corn and indigo
  if(N>3) specials.push(find_and_pop(special_corn2, plantations));
  if(N>4) specials.splice(0,0,find_and_pop(special_indigo3, plantations));
  
  // put some items away by default
  for(n in player_boards) player_boards[n].put_away();
  for(n in roles)         roles[n]        .put_away();
  for(n in plantations)   plantations[n]  .put_away().set_active_image(0);
  for(n in boats)         boats[n]        .put_away();
  for(n in colonists)     colonists[n]    .put_away();
  
  // BUILDINGS
  for(n in large_buildings)       large_buildings[n]      .set_target( 440-1*n,   -560+305*n, 0);
  
  for(n in building_indigo_small) building_indigo_small[n].set_target(-430-5*n,     -638-5*n,   0);
  for(n in building_sugar_small)  building_sugar_small[n] .set_target(-430-5*n,     -483-5*n,   0);
  for(n in buildings_1)           buildings_1[n]          .set_target(-430-5*(n%2)-0.5*n, -330-5*(n%2)+153*Math.floor(n/2), 0);

  for(n in building_indigo)       building_indigo[n]      .set_target(-140-5*n, -636-5*n,   0);
  for(n in building_sugar)        building_sugar[n]       .set_target(-140-5*n, -481-5*n,   0);
  for(n in buildings_2)           buildings_2[n]          .set_target(-140-5*(n%2)-0.5*n, -330-5*(n%2)+153*Math.floor(n/2), 0);
  
  for(n in building_tobacco)      building_tobacco[n]     .set_target( 150-5*n, -634-5*n,   0);
  for(n in building_coffee)       building_coffee[n]      .set_target( 150-5*n, -479-5*n,   0);
  for(n in buildings_3)           buildings_3[n]          .set_target( 150-5*(n%2)-0.5*n, -330-5*(n%2)+153*Math.floor(n/2), 0);
  
  // GOODS
  for(n in corn   ) corn   [n].set_target(-1430+rand_int(-70,70),-100 + rand_int(-70,70), rand_int(-180/15,180/15)*15*0+240)
  for(n in indigo ) indigo [n].set_target(-1430+rand_int(-70,70), 100 + rand_int(-70,70), rand_int(-180/15,180/15)*15*0+240)
  for(n in tobacco) tobacco[n].set_target(-1230+rand_int(-70,70),-200 + rand_int(-70,70), rand_int(-180/15,180/15)*15*0+240)
  for(n in sugar  ) sugar  [n].set_target(-1230+rand_int(-70,70), 0   + rand_int(-70,70), rand_int(-180/15,180/15)*15*0+240)
  for(n in coffee ) coffee [n].set_target(-1230+rand_int(-70,70), 200 + rand_int(-70,70), rand_int(-180/15,180/15)*15*0+240)
  
  // BOATS AND MARKET
  market                         .set_target(820,  2  *254, -90);
  boats[0]                       .set_target(820,  1  *254, -90);
  for(n=0; n<3; n++) boats[n+N-2].set_target(820, (0-n)*254, -90);
  
  // COLONISTS
  if(N==3) for(n=0; n<55; n++) colonists[n].set_target(1140+rand_int(-70,70), 254+rand_int(-70,70), rand_int(-180/15,180/15)*15)
  if(N==4) for(n=0; n<75; n++) colonists[n].set_target(1140+rand_int(-70,70), 254+rand_int(-70,70), rand_int(-180/15,180/15)*15)
  if(N==5) for(n=0; n<95; n++) colonists[n].set_target(1140+rand_int(-70,70), 254+rand_int(-70,70), rand_int(-180/15,180/15)*15)
  
  // VICTORY POINTS
  for(n in victory1) victory1[n].set_target(1140+rand_int(-60,60), -254+rand_int(-60,60), rand_int(-180/15,180/15)*15);
  for(n in victory5) victory5[n].set_target(1140+rand_int(-60,60),      rand_int(-60,60), rand_int(-180/15,180/15)*15);
  if(N<5) {
    for(n=0; n<3; n++) victory5[n].put_away();
    for(n=0; n<7; n++) victory1[n].put_away();
  }
  if(N<4) {
    for(n=3; n<6;  n++) victory5[n].put_away();
    for(n=7; n<17; n++) victory1[n].put_away();
  }
  
  // PLANTATIONS AND QUARRIES
  shuffle_pieces(plantations);
  for(n=0;   n<N+1; n++)                plantations[n].set_target(-500+170*(n+1),     970,    0).set_active_image(1);
  for(n=N+1; n<plantations.length; n++) plantations[n].set_target(-500-1*n,           970-1*n,0);
  for(n in quarries)                       quarries[n].set_target(-500+170*(N+2)-2*n, 970-2*n,0);
  
  // DOUBLOONS
  for(n in doubloons1) doubloons1[n].set_target(-200-5*n*Math.random(), 700- 5*n*Math.random(), rand_int(-180/15,180/15)*15);
  for(n in doubloons5) doubloons5[n].set_target( 50-20*n*Math.random(), 500-20*n*Math.random(), rand_int(-180/15,180/15)*15);
  
  // ROLE CARDS
  for(n=0; n<4; n++) roles[n].set_target(-750,  (n-1.5)*400, 0);
  for(n=4; n<6; n++) roles[n].set_target(-1004, (n-5.5)*400, 0);
  if(N>3)            roles[6].set_target(-1004, (6-5.5)*400, 0);
  if(N>4)            roles[7].set_target(-1004, (7-5.5)*400, 0);
  if(N<5)  governor.set_target(350, 1550, 0, 60);
  if(N==5) governor.set_target(350, 1550, 0, 120);
  
  // MAIN BOARD
  board_supply.set_target(0,0,0);
  
  // Loop over N players, taking out what's necessary
  for(n=0; n<N; n++) {
    angle = (n-Math.floor(N/2))*60;
  
    // PLANTATIONS
    console.log(specials);
    specials[N-n-1].set_target(78, 2486, 0, angle).set_active_image(1);
  
    // DOUBLOONS
    v = rotate_vector(580, 1800, angle);
    doubloons1[n*4]          .set_target(v.x+80*Math.random(), v.y+80*Math.random(), rand_int(-180/15,180/15)*15);
    doubloons1[n*4+1]        .set_target(v.x+80*Math.random(), v.y+80*Math.random(), rand_int(-180/15,180/15)*15);
    if(N>3) doubloons1[n*4+2].set_target(v.x+80*Math.random(), v.y+80*Math.random(), rand_int(-180/15,180/15)*15);
    if(N>4) doubloons1[n*4+3].set_target(v.x+80*Math.random(), v.y+80*Math.random(), rand_int(-180/15,180/15)*15);
  
    // PLAYER BOARDS
    v = rotate_vector(0, 2200, angle);
    player_boards[n].set_target(v.x, v.y, -angle);
    
  } // end of loop over 5 players
  
  
}


// Start the show!
board.go();