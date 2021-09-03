/**
 * This file is part of the Virtual Game Table distribution 
 * (https://github.com/jaxankey/Virtual-Game-Table).
 * Copyright (c) 2015-2021 Jack Childress (Sankey).
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
// Resource lists       //
//////////////////////////

// Master list of all images. This is needed for the preloader to work.
VGT.images = {

    // Base path relative to private/game/, game/, or common/ folders (listed in search order)
    root: 'images',

    paths: {

      // Required for 
      'hand': 'hands/hand.png',
      'fist': 'hands/fist.png',

      'board-supply'         : 'board-supply.png',
      'board-player'         : 'board-player.png',
      
      'tradinghouse'         : 'tradinghouse.png',
      'ship-colonist'        : 'ship-colonist.png',
      'ship-4'               : 'ship-4.png',
      'ship-5'               : 'ship-5.png',
      'ship-6'               : 'ship-6.png',
      'ship-7'               : 'ship-7.png',
      'ship-8'               : 'ship-8.png',
      
      'build-cityhall'       : 'build-cityhall.png',
      'build-coffee'         : 'build-coffee.png',
      'build-constructionhut': 'build-constructionhut.png',
      'build-customshouse'   : 'build-customshouse.png',
      'build-factory'        : 'build-factory.png',
      'build-fortress'       : 'build-fortress.png',
      'build-guildhall'      : 'build-guildhall.png',
      'build-hacienda'       : 'build-hacienda.png',
      'build-harbor'         : 'build-harbor.png',
      'build-hospice'        : 'build-hospice.png',
      'build-indigo-large'   : 'build-indigo.png',
      'build-indigo-small'   : 'build-indigo-small.png',
      'build-market-large'   : 'build-market-large.png',
      'build-market-small'   : 'build-market-small.png',
      'build-office'         : 'build-office.png',
      'build-residence'      : 'build-residence.png',
      'build-sugar-large'    : 'build-sugar.png',
      'build-sugar-small'    : 'build-sugar-small.png',
      'build-tobacco'        : 'build-tobacco.png',
      'build-university'     : 'build-university.png',
      'build-warehouse-large': 'build-warehouse-large.png',
      'build-warehouse-small': 'build-warehouse-small.png',
      'build-wharf'          : 'build-wharf.png',
      
      'governor'             : 'governor.png',
      'role-builder'         : 'role-builder.png',
      'role-captain'         : 'role-captain.png',
      'role-craftsman'       : 'role-craftsman.png',
      'role-mayor'           : 'role-mayor.png',
      'role-prospector'      : 'role-prospector.png',
      'role-settler'         : 'role-settler.png',
      'role-trader'          : 'role-trader.png',
      
      'tile-back'            : 'tile-back.png',
      'tile-coffee'          : 'tile-coffee.png',
      'tile-corn'            : 'tile-corn.png',
      'tile-indigo'          : 'tile-indigo.png',
      'tile-quarry'          : 'tile-quarry.png',
      'tile-sugar'           : 'tile-sugar.png',
      'tile-tobacco'         : 'tile-tobacco.png',
      
      'doubloon-1'           : 'doubloon-1.png',
      'doubloon-5'           : 'doubloon-5.png',
      'colonist'             : 'colonist.png',
      'goods-corn'           : 'goods-corn.png',
      'goods-coffee'         : 'goods-coffee.png',
      'goods-indigo'         : 'goods-indigo.png',
      'goods-sugar'          : 'goods-sugar.png',
      'goods-tobacco'        : 'goods-tobacco.png',
      'victory-back'         : 'victory-back.png',
      'victory-1'            : 'victory-1.png',
      'victory-5'            : 'victory-5.png',

    } // End of paths
}

// Create an instance of the Game object (stores itself in VGT.game)
game = new VGT.Game({
  name           : 'Puerto Rico',
  setups         : ['3 Players', '4 Players', '5 Players'],
  nameplate_xyrs : [0,480,0,1],
});

// My pieces object
var P = {};





///////////////////////////// GAME BOARD
var settings = {
  layer:  1,                 // Layer of these pieces
  groups: ['boards'],        // List of groups to which this piece belongs
  shovel: ['all'],           // Which groups this piece will shovel when selecting
  teams:  [],                // Which teams can grab / move this piece

  // List of lists of images to use for each of the piece's internal layers
  images: 'board-supply', 
  
  // Coordinates and scale
  x: 0,
  y: 0,
  r: 0,
  s: 0.5,
}
P.board = new VGT.Piece(settings);





///////////////////////////// PLAYER BOARDS
var settings = {
  layer:  1,                   // Layer of these pieces
  groups: ['boards'],          // List of groups to which this piece belongs
  shovel: ['pieces', 'cards'], // Which groups this piece will shovel when selecting
  
  // List of lists of images to use for each of the piece's internal layers
  images: 'board-player', 
  
  // Coordinates and scale
  x: 0,
  y: -800,
  r: 0,
  s: 0.5,

  snaps:[ // List of snap specification objects
    
    { // Small buildings grid 
      type: VGT.SnapGrid,          // class used to create this snap
      groups: ['small_buildings'], // list of snap groups
      x0: -695,     // Origin of grid, x-coordinate
      y0: -482,     // Origin of grid, y-coordinate                   
      ax: 248,   // Basis vector 'a', x-coordinate
      ay: 0,     // Basis vector 'a', y-coordinate
      bx: 0,     // Basis vector 'b', x-coordinate
      by: 146,   // Basis vector 'b', y-coordinate
      r : 0,     // Rotation when snapped
      boundary: [-819,-555, -819,-117, 173,-117, 173,-555], // Polygon boundary points
    }, 

    { // Large buildings grid 
      type: VGT.SnapGrid,          // class used to create this snap
      groups: ['large_buildings'], // list of snap groups
      x0: -695,     // Origin of grid, x-coordinate
      y0: -409,     // Origin of grid, y-coordinate                   
      ax: 248,   // Basis vector 'a', x-coordinate
      ay: 0,     // Basis vector 'a', y-coordinate
      bx: 0,     // Basis vector 'b', x-coordinate
      by: 146,   // Basis vector 'b', y-coordinate
      r : 0,     // Rotation when snapped
      boundary: [-819,-472, -819,-199, 173,-199, 173,-472], // Polygon boundary points
    }, 

    { // First column of tiles
      type: VGT.SnapGrid,          // class used to create this snap
      groups: ['tiles'], // list of snap groups
      x0: -571,     // Origin of grid, x-coordinate
      y0: 154,      // Origin of grid, y-coordinate                   
      ax: 500,   // Basis vector 'a', x-coordinate
      ay: 0,     // Basis vector 'a', y-coordinate
      bx: 0,     // Basis vector 'b', x-coordinate
      by: 164,   // Basis vector 'b', y-coordinate
      r : 0,     // Rotation when snapped
      boundary: [-652,72, -652,566, -489,566, -489,72], // Polygon boundary points
    }, 

    { // Second column of tiles
      type: VGT.SnapGrid,          // class used to create this snap
      groups: ['tiles'], // list of snap groups
      x0: -409,     // Origin of grid, x-coordinate
      y0: 82,      // Origin of grid, y-coordinate                   
      ax: 500,   // Basis vector 'a', x-coordinate
      ay: 0,     // Basis vector 'a', y-coordinate
      bx: 0,     // Basis vector 'b', x-coordinate
      by: 164,   // Basis vector 'b', y-coordinate
      r : 0,     // Rotation when snapped
      boundary: [-490,1, -490,493, -327,493, -327,1], // Polygon boundary points
    }, 

    { // Third column of tiles
      type: VGT.SnapGrid,          // class used to create this snap
      groups: ['tiles'], // list of snap groups
      x0: -246,     // Origin of grid, x-coordinate
      y0: 134,      // Origin of grid, y-coordinate                   
      ax: 500,   // Basis vector 'a', x-coordinate
      ay: 0,     // Basis vector 'a', y-coordinate
      bx: 0,     // Basis vector 'b', x-coordinate
      by: 164,   // Basis vector 'b', y-coordinate
      r : 0,     // Rotation when snapped
      boundary: [-328,52, -328,545, -165,545, -165,52], // Polygon boundary points
    }, 

    { // Fourth column of tiles
      type: VGT.SnapGrid,          // class used to create this snap
      groups: ['tiles'], // list of snap groups
      x0: -84,     // Origin of grid, x-coordinate
      y0: 212,      // Origin of grid, y-coordinate                   
      ax: 500,   // Basis vector 'a', x-coordinate
      ay: 0,     // Basis vector 'a', y-coordinate
      bx: 0,     // Basis vector 'b', x-coordinate
      by: 164,   // Basis vector 'b', y-coordinate
      r : 0,     // Rotation when snapped
      boundary: [-165,131, -165,459, -2,459, -2,131], // Polygon boundary points
    }, 

    { // Fifth "column" of tiles
      type: VGT.SnapGrid,          // class used to create this snap
      groups: ['tiles'], // list of snap groups
      x0: 78,    // Origin of grid, x-coordinate
      y0: 287,   // Origin of grid, y-coordinate                   
      ax: 500,   // Basis vector 'a', x-coordinate
      ay: 0,     // Basis vector 'a', y-coordinate
      bx: 0,     // Basis vector 'b', x-coordinate
      by: 164,   // Basis vector 'b', y-coordinate
      r : 0,     // Rotation when snapped
      boundary: [-2,205, -2,369, 160,369, 160,205], // Polygon boundary points
    }, 
  ]
}; // end of settings
P.player_boards = game.add_pieces(5, settings);





////////////////////////////////// SMALL BUILDINGS

// Snap grid just for placing pieces during setup. Doesn't snap anything
var grid_small_buildings = new VGT.SnapGrid({
  groups: [], // list of snap groups (no snaps)
  x0: -215, // Origin of grid, x-coordinate
  y0: -320,   // Origin of grid, y-coordinate                   
  ax: 145.5, // Basis vector 'a', x-coordinate
  ay: 0.2,      // Basis vector 'a', y-coordinate
  bx: -0.3,      // Basis vector 'b', x-coordinate
  by: 76.7,   // Basis vector 'b', y-coordinate
})

var settings = {
  layer:  2,                             // Layer of these pieces
  groups: ['pieces', 'small_buildings'], // List of groups to which this piece belongs
  shovel: ['colonists'],                   // Which groups this piece will shovel when selecting

  // Coordinates and scale
  x: 400,
  y: -400,
  r: 0,
  s: 0.5,

  // List of snap specification objects
  snaps:[ 
    { // Worker dot
      type: VGT.SnapCirle, // class used to create this snap
      groups: ['colonists'], // list of snap groups
      x0: -72,     // Center, x-coordinate
      y0: 16,      // Center, y-coordinate                   
      radius: 50,  // Radius of snap region
    },
  ]
}; // end of settings

// Create pieces
P.haciendas        = game.add_pieces(2, settings, 'build-hacienda');
P.construction_huts = game.add_pieces(2, settings, 'build-constructionhut');
P.factories        = game.add_pieces(2, settings, 'build-factory');
P.harbors          = game.add_pieces(2, settings, 'build-harbor');
P.hospices         = game.add_pieces(2, settings, 'build-hospice');
P.markets_large     = game.add_pieces(2, settings, 'build-market-large');
P.markets_small     = game.add_pieces(2, settings, 'build-market-small');
P.offices          = game.add_pieces(2, settings, 'build-office');
P.universities     = game.add_pieces(2, settings, 'build-university');
P.warehouses_large  = game.add_pieces(2, settings, 'build-warehouse-large');
P.warehouses_small  = game.add_pieces(2, settings, 'build-warehouse-small');
P.wharfs           = game.add_pieces(2, settings, 'build-wharf');

P.indigo_plants_small = game.add_pieces(2, settings, 'build-indigo-small');
P.sugar_plants_small  = game.add_pieces(2, settings, 'build-sugar-small');

// 2 spaces
settings.snaps.push({ // Second worker dot
    type: VGT.SnapCirle,   // class used to create this snap
    groups: ['colonists'], // list of snap groups
    x0: -13,               // Center, x-coordinate
    y0: 16,                // Center, y-coordinate                   
    radius: 50, })         // Radius of snap region
P.coffee_plants_large  = game.add_pieces(2, settings, 'build-coffee');

// 3 spaces
settings.snaps.push({ // Second worker dot
  type: VGT.SnapCirle,   // class used to create this snap
  groups: ['colonists'], // list of snap groups
  x0: 47,               // Center, x-coordinate
  y0: 16,                // Center, y-coordinate                   
  radius: 50, })         // Radius of snap region
P.indigo_plants_large = game.add_pieces(2, settings, 'build-indigo-large');
P.tobacco_plants      = game.add_pieces(2, settings, 'build-tobacco');
P.sugar_plants_large  = game.add_pieces(2, settings, 'build-sugar-large')



////////////////////////////////// LARGE BUILDINGS
var settings = {
  layer:  2,                             // Layer of these pieces
  groups: ['pieces', 'large_buildings'], // List of groups to which this piece belongs
  shovel: ['colonists'],                   // Which groups this piece will shovel when selecting

  // Coordinates and scale
  x: 400,
  y: -250,
  r: 0,
  s: 0.5,

  // List of snap specification objects
  snaps:[ 
    { // Worker dot
      type: VGT.SnapCirle, // class used to create this snap
      groups: ['colonists'], // list of snap groups
      x0: -72,     // Center, x-coordinate
      y0: 93,      // Center, y-coordinate                   
      radius: 50,  // Radius of snap region
    },
  ]
  
}; // end of settings

// Create pieces
P.cityhall     = game.add_piece(settings, 'build-cityhall');
P.fortress     = game.add_piece(settings, 'build-fortress');
P.guildhall    = game.add_piece(settings, 'build-guildhall');
P.residence    = game.add_piece(settings, 'build-residence');
P.customshouse = game.add_piece(settings, 'build-customshouse');





///////////////////////////////////// TILES
var settings = {
  layer:  2,                   // Layer of these pieces
  groups: ['pieces', 'tiles'], // List of groups to which this piece belongs
  shovel: ['colonists'],       // Which groups this piece will shovel when selecting
  collect_dx: 0.5,             // x-offset for pieces when collecting into a stack
  collect_dy: -0.5,            // y-offset for pieces when collecting into a stack

  // Coordinates and scale
  x: 400,
  y: -100,
  r: 0,
  s: 0.5,

  // List of snap specification objects
  snaps:[ 
    { // Worker dot
      type: VGT.SnapCirle, // class used to create this snap
      groups: ['colonists'], // list of snap groups
      x0: -27,     // Center, x-coordinate
      y0: 22,      // Center, y-coordinate                   
      radius: 50,  // Radius of snap region
    },
  ]
}; // end of settings

// Create pieces
P.tiles_quarry  = game.add_pieces(8,  settings, ['tile-quarry']);
P.tiles_coffee  = game.add_pieces(8,  settings, ['tile-back', 'tile-coffee']);
P.tiles_tobacco = game.add_pieces(9,  settings, ['tile-back', 'tile-tobacco']);
P.tiles_corn    = game.add_pieces(10, settings, ['tile-back', 'tile-corn']);
P.tiles_sugar   = game.add_pieces(11, settings, ['tile-back', 'tile-sugar']);
P.tiles_indigo  = game.add_pieces(12, settings, ['tile-back', 'tile-indigo']);
P.tiles = [...P.tiles_corn, ...P.tiles_indigo, ...P.tiles_tobacco, ...P.tiles_coffee, ...P.tiles_sugar, ...P.tiles_quarry];





//////////////////////////////////// COLONISTS
var settings = {
  layer:  3,                     // Layer of these pieces
  groups: ['pieces', 'colonists'], // List of groups to which this piece belongs
  shape: 'circle',               // Shape of the pieces

  // Coordinates and scale
  x: 400,
  y: 0,
  r: 0,
  s: 0.52, 

}; // end of settings

// Create pieces
P.colonists = game.add_pieces(100, settings, 'colonist');






//////////////////////////////////// GOODS
var settings = {
  layer:  3,                   // Layer of these pieces
  groups: ['pieces', 'goods'], // List of groups to which this piece belongs
  shape: 'circle',             // Shape of the pieces

  // Coordinates and scale
  x: 400,
  y: 150,
  r: 0,
  s: 0.5, 

}; // end of settings

// Create pieces
P.coffee  = game.add_pieces(9,  settings, 'goods-coffee');
P.tobacco = game.add_pieces(9,  settings, 'goods-tobacco');
P.corn    = game.add_pieces(10, settings, 'goods-corn');
P.sugar   = game.add_pieces(11, settings, 'goods-sugar');
P.indigo  = game.add_pieces(12, settings, 'goods-indigo');





//////////////////////////////////// DOUBLOONS & VP
var settings = {
  layer:  3,                   // Layer of these pieces
  groups: ['pieces', 'goods'], // List of groups to which this piece belongs
  shape: 'circle',             // Shape of the pieces

  // Coordinates and scale
  x: 400,
  y: 300,
  r: 0,
  s: 0.5, 

}; // end of settings

// Create pieces
settings.worth = 1; P.doubloon1s = game.add_pieces(46, settings, 'doubloon-1');
settings.worth = 5; P.doubloon5s = game.add_pieces( 8, settings, 'doubloon-5');

settings.x = -400;
settings.worth = 1; P.vp1s = game.add_pieces(32, settings, ['victory-1', 'victory-back'])
settings.worth = 5; P.vp5s = game.add_pieces(18, settings, ['victory-5', 'victory-back'])





/////////////////////////////////// SPECIAL CARDS
var settings = {
  layer:  2,             // Layer of these pieces
  groups: ['cards'],     // List of groups to which this piece belongs
  shovel: ['pieces'],    // Which groups this piece will shovel when selecting

  // Coordinates and scale
  x: -400,
  y: -350,
  r: 0,
  s: 0.5,

}; // end of settings

// Create the cards
P.builder     = game.add_piece(settings, 'role-builder');
P.captain     = game.add_piece(settings, 'role-captain');
P.craftsman   = game.add_piece(settings, 'role-craftsman');
P.mayor       = game.add_piece(settings, 'role-mayor');
P.settler     = game.add_piece(settings, 'role-settler');
P.trader      = game.add_piece(settings, 'role-trader');
P.prospector1 = game.add_piece(settings, 'role-prospector');
P.prospector2 = game.add_piece(settings, 'role-prospector');
P.governor    = game.add_piece(settings, 'governor');

settings.y = -125;
P.ship_colonist = game.add_piece(settings, 'ship-colonist');
P.ship4         = game.add_piece(settings, 'ship-4');
P.ship5         = game.add_piece(settings, 'ship-5');
P.ship6         = game.add_piece(settings, 'ship-6');
P.ship7         = game.add_piece(settings, 'ship-7');
P.ship8         = game.add_piece(settings, 'ship-8');

settings.y = 100;
P.trading_house = game.add_piece(settings, 'tradinghouse');













//////////////////////////////////// NEW GAME SETUP

function new_game() { 
  console.log('\n------- NEW GAME: '+ VGT.html.setups.value +' -------\n\n');

  // game.load_state_from_server() uses "promises", meaning it takes some time before
  // the state is downloaded and set up. As such, we do a basic load_state_from_server
  // and then use different functions for the small differences & randomization with 
  // each setup.
  
  // Setup for 5 players
  if(VGT.html.setups.value == '5 Players') game.load_state_from_server('setups/setup-5.txt', setup_5);
  if(VGT.html.setups.value == '4 Players') game.load_state_from_server('setups/setup-4.txt', setup_4);
  if(VGT.html.setups.value == '3 Players') game.load_state_from_server('setups/setup-3.txt', setup_3);


  

} // End of new_game()

function reset_buildings() {
  VGT.game.collect(P.indigo_plants_small, ...grid_small_buildings.get_grid_xy(0,0), 0, 0);
  VGT.game.collect(P.sugar_plants_small , ...grid_small_buildings.get_grid_xy(0,1), 0, 0);
  VGT.game.collect(P.markets_small      , ...grid_small_buildings.get_grid_xy(0,2), 0, 0);
  VGT.game.collect(P.haciendas          , ...grid_small_buildings.get_grid_xy(0,3), 0, 0);
  VGT.game.collect(P.construction_huts  , ...grid_small_buildings.get_grid_xy(0,4), 0, 0);
  VGT.game.collect(P.warehouses_small   , ...grid_small_buildings.get_grid_xy(0,5), 0, 0);
  VGT.game.collect(P.indigo_plants_large, ...grid_small_buildings.get_grid_xy(1,0), 0, 0);
  VGT.game.collect(P.sugar_plants_large , ...grid_small_buildings.get_grid_xy(1,1), 0, 0);
  VGT.game.collect(P.hospices           , ...grid_small_buildings.get_grid_xy(1,2), 0, 0);
  VGT.game.collect(P.offices            , ...grid_small_buildings.get_grid_xy(1,3), 0, 0);
  VGT.game.collect(P.markets_large      , ...grid_small_buildings.get_grid_xy(1,4), 0, 0);
  VGT.game.collect(P.warehouses_large   , ...grid_small_buildings.get_grid_xy(1,5), 0, 0);
  VGT.game.collect(P.tobacco_plants     , ...grid_small_buildings.get_grid_xy(2,0), 0, 0);
  VGT.game.collect(P.coffee_plants_large, ...grid_small_buildings.get_grid_xy(2,1), 0, 0);
  VGT.game.collect(P.factories          , ...grid_small_buildings.get_grid_xy(2,2), 0, 0);
  VGT.game.collect(P.universities       , ...grid_small_buildings.get_grid_xy(2,3), 0, 0);
  VGT.game.collect(P.harbors            , ...grid_small_buildings.get_grid_xy(2,4), 0, 0);
  VGT.game.collect(P.wharfs             , ...grid_small_buildings.get_grid_xy(2,5), 0, 0);
}

// Setup function for 5 teams.
function setup_5() {

  // The buildings are the same for every setup
  reset_buildings();

  // Tiles face up to start
  VGT.game.set_texture_indices(P.tiles, 1);

  // Special indigos and corns
  var b;
  b = P.player_boards[0]; P.tiles_indigo[0].set_xyrs(b.x.target,b.y.target,0);
  b = P.player_boards[3]; P.tiles_indigo[1].set_xyrs(b.x.target,b.y.target,0);
  b = P.player_boards[4]; P.tiles_indigo[2].set_xyrs(b.x.target,b.y.target,0);
  b = P.player_boards[1]; P.tiles_corn  [0].set_xyrs(b.x.target,b.y.target,0);
  b = P.player_boards[2]; P.tiles_corn  [1].set_xyrs(b.x.target,b.y.target,0);
  
  // 3 fewer indigo and 2 fewer corn
  var indigos = P.tiles_indigo.slice(3);
  var corns   = P.tiles_corn  .slice(2);

  // Assemble remaining tiles, shuffle,
  var tiles = [...corns, ...indigos, ...P.tiles_sugar, ...P.tiles_coffee, ...P.tiles_tobacco];
  tiles = VGT.game.shuffle_z(tiles);
  
  // Put out the 6 & quarries
  for(var n=0; n<6; n++) tiles[n].set_xyrs(-267+1.02*(n+1)*tiles[n].width*tiles[n].s.target,-490, 0); 
  VGT.game.collect(P.tiles_quarry, -267,-490, 0, 0);

  // Rest of pieces
  P.x = tiles.slice(6); 
  VGT.game.set_texture_indices(P.x, 0);
  n = 7; VGT.game.collect(P.x, -267+1.02*n*tiles[0].width*tiles[0].s.target,-490, 0, 0);
}

// Setup function for 5 teams.
function setup_4() {

  // The buildings are the same for every setup
  reset_buildings();

  // Tiles face up to start
  VGT.game.set_texture_indices(P.tiles, 1);

  // Special indigos and corns
  var b;
  b = P.player_boards[0]; P.tiles_indigo[0].set_xyrs(b.x.target,b.y.target,0);
  b = P.player_boards[3]; P.tiles_indigo[1].set_xyrs(b.x.target,b.y.target,0);
  //b = P.player_boards[4]; P.tiles_indigo[2].set_xyrs(b.x.target,b.y.target,0);
  b = P.player_boards[4]; P.tiles_corn  [0].set_xyrs(b.x.target,b.y.target,0);
  b = P.player_boards[2]; P.tiles_corn  [1].set_xyrs(b.x.target,b.y.target,0);
  
  // 3 fewer indigo and 2 fewer corn
  var indigos = P.tiles_indigo.slice(2);
  var corns   = P.tiles_corn  .slice(2);

  // Assemble remaining tiles, shuffle,
  var tiles = [...corns, ...indigos, ...P.tiles_sugar, ...P.tiles_coffee, ...P.tiles_tobacco];
  tiles = VGT.game.shuffle_z(tiles);
  
  // Put out the 6 & quarries
  for(var n=0; n<5; n++) tiles[n].set_xyrs(-267+1.02*(n+1)*tiles[n].width*tiles[n].s.target,-490, 0); 
  VGT.game.collect(P.tiles_quarry, -267,-490, 0, 0);

  // Rest of pieces
  P.x = tiles.slice(5); 
  VGT.game.set_texture_indices(P.x, 0);
  n = 6; VGT.game.collect(P.x, -267+1.02*n*tiles[0].width*tiles[0].s.target,-490, 0, 0);
}

// Setup function for 3 teams.
function setup_3() {

  // The buildings are the same for every setup
  reset_buildings();

  // Tiles face up to start
  VGT.game.set_texture_indices(P.tiles, 1);

  // Special indigos and corns
  var b;
  b = P.player_boards[4]; P.tiles_indigo[0].set_xyrs(b.x.target,b.y.target,0);
  b = P.player_boards[3]; P.tiles_indigo[1].set_xyrs(b.x.target,b.y.target,0);
  b = P.player_boards[2]; P.tiles_corn  [0].set_xyrs(b.x.target,b.y.target,0);
  
  // 3 fewer indigo and 2 fewer corn
  var indigos = P.tiles_indigo.slice(2);
  var corns   = P.tiles_corn  .slice(1);

  // Assemble remaining tiles, shuffle,
  var tiles = [...corns, ...indigos, ...P.tiles_sugar, ...P.tiles_coffee, ...P.tiles_tobacco];
  tiles = VGT.game.shuffle_z(tiles);
  
  // Put out the 6 & quarries
  for(var n=0; n<4; n++) tiles[n].set_xyrs(-267+1.02*(n+1)*tiles[n].width*tiles[n].s.target,-490, 0); 
  VGT.game.collect(P.tiles_quarry, -267,-490, 0, 0);

  // Rest of pieces
  P.x = tiles.slice(4); 
  VGT.game.set_texture_indices(P.x, 0);
  n = 5; VGT.game.collect(P.x, -267+1.02*n*tiles[0].width*tiles[0].s.target,-490, 0, 0);
}
