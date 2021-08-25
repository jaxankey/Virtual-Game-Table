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
var image_paths = {
  root : 'images',
  list : [
    'hands/hand.png',
    'hands/fist.png',

    'build-cityhall.jpg',
    'tile-sugar.jpg',
    'build-customshouse.jpg',
    'role-trader.jpg',
    'governor.jpg',
    'tile-quarry.jpg',
    'tradinghouse.jpg',
    'build-indigo.jpg',
    'build-residence.jpg',
    'tile-back.jpg',
    'build-indigo-small.jpg',
    'role-captain.jpg',
    'tile-indigo.jpg',
    'victory-1.png',
    'tile-tobacco.jpg',
    'build-fortress.jpg',
    'build-factory.jpg',
    'build-wharf.jpg',
    'doubloon-1.png',
    'goods-indigo.png',
    'role-settler.jpg',
    'doubloon-5.png',
    'build-coffee.jpg',
    'build-constructionhut.jpg',
    'build-warehouse-small.jpg',
    'goods-corn.png',
    'build-market-large.jpg',
    'board-supply.jpg',
    'build-hospice.jpg',
    'role-builder.jpg',
    'colonist.png',
    'build-university.jpg',
    'role-mayor.jpg',
    'build-hacienda.jpg',
    'build-tobacco.jpg',
    'build-sugar.jpg',
    'tile-coffee.jpg',
    'build-market-small.jpg',
    'splash.jpg',
    'tile-corn.jpg',
    'ship-4.jpg',
    'ship-6.jpg',
    'ship-7.jpg',
    'ship-8.jpg',
    'victory-5.png',
    'board-player.jpg',
    'victory-back.png',
    'ship-5.jpg',
    'build-sugar-small.jpg',
    'ship-colonist.jpg',
    'role-prospector.jpg',
    'build-guildhall.jpg',
    'role-craftsman.jpg',
    'goods-tobacco.png',
    'build-office.jpg',
    'goods-coffee.png',
    'build-harbor.jpg',
    'goods-sugar.png',
    'build-warehouse-large.jpg',
  ],
}

// Create an instance of the Game object (stores itself in VGT.game)
new VGT.Game({
  setups: ['3 Players', '4 Players', '5 Players'],
});

///////////////////////////// PLAYER BOARDS
var settings = {
  layer:  1,                 // Layer of these pieces
  groups: ['boards'],        // List of groups to which this piece belongs
  shovel: ['pieces'],        // Which groups this piece will shovel when selecting

  // Coordinates and scale
  x: 0,
  y: 0,
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

// Create the 5 player boards
var player_boards = [];
for(var n=0; n<5; n++) player_boards.push(new VGT.Piece({...settings, image_paths:[['board-player.jpg']]}));



////////////////////////////////// SMALL BUILDINGS
var settings = {
  layer:  2,                             // Layer of these pieces
  groups: ['pieces', 'small_buildings'], // List of groups to which this piece belongs
  shovel: ['workers'],                   // Which groups this piece will shovel when selecting

  // Coordinates and scale
  x: 0,
  y: 0,
  r: 0,
  s: 0.5,
}; // end of settings

// Create pieces
var haciendas = []; for(var n=0; n<2; n++) player_boards.push(new VGT.Piece({...settings, image_paths:[['build-hacienda.jpg']]}));


////////////////////////////////// LARGE BUILDINGS
var settings = {
  layer:  2,                             // Layer of these pieces
  groups: ['pieces', 'large_buildings'], // List of groups to which this piece belongs
  shovel: ['workers'],                   // Which groups this piece will shovel when selecting

  // Coordinates and scale
  x: 0,
  y: 0,
  r: 0,
  s: 0.5,
}; // end of settings

// Create pieces
var large_buildings = []; large_buildings.push(new VGT.Piece({...settings, image_paths:[['build-cityhall.jpg']]}));



///////////////////////////////////// TILES
var settings = {
  layer:  2,                   // Layer of these pieces
  groups: ['pieces', 'tiles'], // List of groups to which this piece belongs
  shovel: ['workers'],         // Which groups this piece will shovel when selecting

  // Coordinates and scale
  x: 0,
  y: 0,
  r: 0,
  s: 0.5,

  // List of snap specification objects
  snaps:[ 
    { // Worker dot
      type: VGT.SnapCirle, // class used to create this snap
      groups: ['workers'], // list of snap groups
      x0: -27,     // Center, x-coordinate
      y0: 22,      // Center, y-coordinate                   
      radius: 27,  // Radius of snap region
    },
  ]
}; // end of settings

// Create pieces
var tiles = [];
for(var n=0; n<5; n++) tiles.push(new VGT.Piece({...settings, image_paths:[['tile-corn.jpg']]}));



//////////////////////////////////// WORKERS
var settings = {
  layer:  3,                     // Layer of these pieces
  groups: ['pieces', 'workers'], // List of groups to which this piece belongs
  shape: 'circle',               // Shape of the pieces

  // Coordinates and scale
  x: 0,
  y: 0,
  r: 0,
  s: 0.5, 

}; // end of settings

// Create pieces
var workers = []; for(var n=0; n<5; n++) workers.push(new VGT.Piece({...settings, image_paths:[['colonist.png']]}));












//////////////////////////////////// NEW GAME SETUP
function new_game() { 
  log('\n\n------- NEW GAME -------');

} // End of new_game()

