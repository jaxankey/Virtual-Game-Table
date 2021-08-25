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

// Game Boards
var settings = {
  layer:1,             // Layer of these pieces
  shovel:true,         // Whether selecting this piece up also selects those on top of it
  local_snaps:[        // List of snap specification objects
    {        
      ax:10,
      ay:0,
      bx:0,
      by:10,
      type:VGT.SnapGrid, 
      boundary: [-75,-75, 75,-75, 75,75, -75,75],
    }, 
  ]
}; // end of piece settings

// Create the boards
var player_boards = [];
for(var n=0; n<5; n++) player_boards.push(new VGT.Piece({...settings, image_paths:[['board-player.jpg']]}));




/** Function to start a new game */ 
function new_game() { 
  log('\n\n------- NEW GAME -------');

} // End of new_game()