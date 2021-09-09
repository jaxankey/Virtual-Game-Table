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

    // Keys and paths relative to the root directory. Keys are used to create pieces below.
    paths: {

      // Required for player hands
      'hand': 'hands/hand.png',
      'fist': 'hands/fist.png',

      'board'         : 'checkers/board.png',
      'checker_black' : 'checkers/checker_black.png',
      'king_black'    : 'checkers/king_black.png',
      'checker_red'   : 'checkers/checker_red.png',
      'king_red'      : 'checkers/king_red.png',
    
    } // End of paths
}

// Create the Game instance (also stores itself in VGT.game)
game = new VGT.Game({
  name             : 'Checkers',     // Game name
  nameplate_xyrs   : [480, 0, 0, 1], // Spawn point for new nameplates
  background_color : 0xBBBBBB,       // Background color of the tabletop
});



///////////////////////////// GAME BOARD
var settings = {

  layer:  0,       // Number of layer in which this piece lives
  teams:  [],      // Which teams can grab / move this piece
  images: 'board', // Images specifier (can be a list or list of lists)
  
  // List of snap objects; in this case a single square grid for pieces
  snaps: [{ 
      type: VGT.SnapGrid, // class used to create this snap
      groups: ['pieces'], // list of groups that will snap
      x0: -224, y0: -224, // Origin of the grid                   
      ax: 64,   ay: 0,    // Basis vector 'a'
      bx: 0,    by: 64,   // Basis vector 'b'
      r : 0,              // Rotation when snapped
      boundary: [-256,-256, 256,-256, 256,256, -256,256], // Polygon boundary points
    }], 

} // End of settings
var board = game.add_piece(settings)



/////////////////////////////// PIECES
var settings = {
  layer:  1,              // Layer of the piece
  groups: ['pieces'],     // Groups to which this piece belongs
  rotate_with_view: true, // Piece always keeps its orientation relative to the screen when we rotate the board
  shape: 'circle',        // Shape of hitbox for clicking & for drawing the selection
  width: 64, height: 64,  // Override the image width and height for the hitbox
}

// Add the pieces
var reds   = game.add_pieces(12, settings, ['checker_red'  , 'king_red'  ])
var blacks = game.add_pieces(12, settings, ['checker_black', 'king_black'])

//////////////////////////////////// NEW GAME SETUP

function new_game() { 
  console.log('\n------- NEW GAME: '+ VGT.html.select_setups.value +' -------\n\n');

  game.load_state_from_server('setup-standard.txt')

} // End of new_game()

