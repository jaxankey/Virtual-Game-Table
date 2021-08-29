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

// Master list of all sounds. Needed for the pre-loader to work.
var sound_list = {};

// Master list of all images. This is needed for the preloader to work.
var images = {
  root : 'images',
  list : [
    'hands/hand.png',
    'hands/fist.png',

    'build-cityhall.png',
    'tile-sugar.png',
    'build-customshouse.png',
    'role-trader.png',
    'governor.png',
    'tile-quarry.png',
    'tradinghouse.png',
    'build-indigo.png',
    'build-residence.png',
    'tile-back.png',
    'build-indigo-small.png',
    'role-captain.png',
    'tile-indigo.png',
    'victory-1.png',
    'tile-tobacco.png',
    'build-fortress.png',
    'build-factory.png',
    'build-wharf.png',
    'doubloon-1.png',
    'goods-indigo.png',
    'role-settler.png',
    'doubloon-5.png',
    'build-coffee.png',
    'build-constructionhut.png',
    'build-warehouse-small.png',
    'goods-corn.png',
    'build-market-large.png',
    'board-supply.png',
    'build-hospice.png',
    'role-builder.png',
    'colonist.png',
    'build-university.png',
    'role-mayor.png',
    'build-hacienda.png',
    'build-tobacco.png',
    'build-sugar.png',
    'tile-coffee.png',
    'build-market-small.png',
    'splash.png',
    'tile-corn.png',
    'ship-4.png',
    'ship-6.png',
    'ship-7.png',
    'ship-8.png',
    'victory-5.png',
    'board-player.png',
    'victory-back.png',
    'ship-5.png',
    'build-sugar-small.png',
    'ship-colonist.png',
    'role-prospector.png',
    'build-guildhall.png',
    'role-craftsman.png',
    'goods-tobacco.png',
    'build-office.png',
    'goods-coffee.png',
    'build-harbor.png',
    'goods-sugar.png',
    'build-warehouse-large.png',
  ],
}

// Create an instance of the Game object (stores itself in VGT.game)
game = new VGT.Game({
  name           : 'Puerto Rico',
  setups         : ['3 Players', '4 Players', '5 Players'],
  nameplate_xyrs : [0,-460,0,1],
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
  images: 'board-supply.png', 
  
  // Coordinates and scale
  x: 0,
  y: 0,
  r: 0,
  s: 0.5,
}
P.board = new VGT.Piece(settings);





///////////////////////////// PLAYER BOARDS
var settings = {
  layer:  1,                 // Layer of these pieces
  groups: ['boards'],        // List of groups to which this piece belongs
  shovel: ['pieces'],        // Which groups this piece will shovel when selecting
  
  // List of lists of images to use for each of the piece's internal layers
  images: 'board-player.png', 
  
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
P.player_boards = VGT.add_pieces(5, settings);





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
      y0: 19,      // Center, y-coordinate                   
      radius: 50,  // Radius of snap region
    },
  ]
}; // end of settings

// Create pieces
P.haciendas        = VGT.add_pieces(2, settings, 'build-hacienda.png');
P.constructionhuts = VGT.add_pieces(2, settings, 'build-constructionhut.png');
P.factories        = VGT.add_pieces(2, settings, 'build-factory.png');
P.harbors          = VGT.add_pieces(2, settings, 'build-harbor.png');
P.hospices         = VGT.add_pieces(2, settings, 'build-hospice.png');
P.largemarkets     = VGT.add_pieces(2, settings, 'build-market-large.png');
P.smallmarkets     = VGT.add_pieces(2, settings, 'build-market-small.png');
P.offices          = VGT.add_pieces(2, settings, 'build-office.png');
P.universities     = VGT.add_pieces(2, settings, 'build-university.png');
P.largewarehouses  = VGT.add_pieces(2, settings, 'build-warehouse-large.png');
P.smallwarehouses  = VGT.add_pieces(2, settings, 'build-warehouse-small.png');
P.wharfs           = VGT.add_pieces(2, settings, 'build-wharf.png');





////////////////////////////////// LARGE BUILDINGS
var settings = {
  layer:  2,                             // Layer of these pieces
  groups: ['pieces', 'large_buildings'], // List of groups to which this piece belongs
  shovel: ['colonists'],                   // Which groups this piece will shovel when selecting

  // Coordinates and scale
  x: 400,
  y: -200,
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
P.cityhall     = VGT.add_piece(settings, 'build-cityhall.png');
P.fortress     = VGT.add_piece(settings, 'build-fortress.png');
P.guildhall    = VGT.add_piece(settings, 'build-guildhall.png');
P.residence    = VGT.add_piece(settings, 'build-residence.png');
P.customshouse = VGT.add_piece(settings, 'build-customshouse.png');





///////////////////////////////////// TILES
var settings = {
  layer:  2,                   // Layer of these pieces
  groups: ['pieces', 'tiles'], // List of groups to which this piece belongs
  shovel: ['colonists'],         // Which groups this piece will shovel when selecting

  // Coordinates and scale
  x: 400,
  y: 0,
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
P.tiles_quarry  = VGT.add_pieces(8,  settings, ['tile-back.png', 'tile-quarry.png']);
P.tiles_coffee  = VGT.add_pieces(8,  settings, ['tile-back.png', 'tile-coffee.png']);
P.tiles_tobacco = VGT.add_pieces(9,  settings, ['tile-back.png', 'tile-tobacco.png']);
P.tiles_corn    = VGT.add_pieces(10, settings, ['tile-back.png', 'tile-corn.png']);
P.tiles_sugar   = VGT.add_pieces(11, settings, ['tile-back.png', 'tile-sugar.png']);
P.tiles_indigo  = VGT.add_pieces(12, settings, ['tile-back.png', 'tile-indigo.png']);
P.tiles = [...P.tiles_corn, ...P.tiles_indigo, ...P.tiles_tobacco, ...P.tiles_coffee, ...P.tiles_sugar, ...P.tiles_quarry];





//////////////////////////////////// COLONISTS
var settings = {
  layer:  3,                     // Layer of these pieces
  groups: ['pieces', 'colonists'], // List of groups to which this piece belongs
  shape: 'circle',               // Shape of the pieces

  // Coordinates and scale
  x: 400,
  y: 150,
  r: 0,
  s: 0.5, 

}; // end of settings

// Create pieces
P.colonists = VGT.add_pieces(100, settings, 'colonist.png');






//////////////////////////////////// GOODS
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
P.coffee  = VGT.add_pieces(9,  settings, 'goods-coffee.png');
P.tobacco = VGT.add_pieces(9,  settings, 'goods-tobacco.png');
P.corn    = VGT.add_pieces(10, settings, 'goods-corn.png');
P.sugar   = VGT.add_pieces(11, settings, 'goods-sugar.png');
P.indigo  = VGT.add_pieces(12, settings, 'goods-indigo.png');





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
P.doubloon1s = VGT.add_pieces(46, settings, 'doubloon-1.png');
P.doubloon5s = VGT.add_pieces( 8, settings, 'doubloon-5.png');

settings.x = -400;
P.vp1s = VGT.add_pieces(32, settings, ['victory-1.png', 'victory-back.png'])
P.vp5s = VGT.add_pieces(18, settings, ['victory-5.png', 'victory-back.png'])





/////////////////////////////////// SPECIAL CARDS
var settings = {
  layer:  2,                     // Layer of these pieces
  groups: ['pieces', 'special'], // List of groups to which this piece belongs
  shovel: ['pieces'],            // Which groups this piece will shovel when selecting

  // Coordinates and scale
  x: -400,
  y: -350,
  r: 0,
  s: 0.5,

}; // end of settings

// Create the cards
P.builder     = VGT.add_piece(settings, 'role-builder.png');
P.captain     = VGT.add_piece(settings, 'role-captain.png');
P.craftsman   = VGT.add_piece(settings, 'role-craftsman.png');
P.mayor       = VGT.add_piece(settings, 'role-mayor.png');
P.settler     = VGT.add_piece(settings, 'role-settler.png');
P.trader      = VGT.add_piece(settings, 'role-trader.png');
P.prospector1 = VGT.add_piece(settings, 'role-prospector.png');
P.prospector2 = VGT.add_piece(settings, 'role-prospector.png');
P.governor    = VGT.add_piece(settings, 'governor.png');

settings.y = -125;
P.ship_colonist = VGT.add_piece(settings, 'ship-colonist.png');
P.ship4         = VGT.add_piece(settings, 'ship-4.png');
P.ship5         = VGT.add_piece(settings, 'ship-5.png');
P.ship6         = VGT.add_piece(settings, 'ship-6.png');
P.ship7         = VGT.add_piece(settings, 'ship-7.png');
P.ship8         = VGT.add_piece(settings, 'ship-8.png');

settings.y = 100;
P.trading_house = VGT.add_piece(settings, 'tradinghouse.png');













//////////////////////////////////// NEW GAME SETUP
function new_game() { 
  console.log('\n------- NEW GAME: '+ VGT.html.setups.value +' -------\n\n');




} // End of new_game()
