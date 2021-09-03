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
VGT.images = {

    // Base path relative to private/game/, game/, or common/ folders (listed in search order)
    root: 'images',

    paths: {

      // Required for 
      'hand': 'hands/hand.png',
      'fist': 'hands/fist.png',

      'board' : 'chess/board.png',
      'pawn'  : 'chess/pawn.png',
      'rook'  : 'chess/rook.png',
      'knight': 'chess/knight.png',
      'bishop': 'chess/bishop.png',
      'king'  : 'chess/king.png',
      'queen' : 'chess/queen.png',

    } // End of paths
}

// Create the Game instance (also stores itself in VGT.game)
game = new VGT.Game({
  name           : 'Chess',        // Game name
  setups         : ['Standard'],   // List of setups
  nameplate_xyrs : [480, 0, 0, 1], // Spawn point for new nameplates
  background_color: 0x777777,
});



///////////////////////////// GAME BOARD
var settings = {
  
  layer:  0,   // Number of layer in which this piece lives
  teams:  [],  // Which teams can grab / move this piece

  // List of lists of image keys to use for each of the piece's internal layers,
  // or a list of image keys, or an image key.
  images: 'board', 
  
  // List of snap object; in this case a single square grid for pieces
  snaps: [
    { // Small buildings grid 
      type: VGT.SnapGrid, // class used to create this snap
      groups: ['pieces'], // list of groups that will snap
      x0: -224,              // Origin of grid, x-coordinate
      y0: -224,              // Origin of grid, y-coordinate                   
      ax: 64,             // Basis vector 'a', x-coordinate
      ay: 0,              // Basis vector 'a', y-coordinate
      bx: 0,              // Basis vector 'b', x-coordinate
      by: 64,             // Basis vector 'b', y-coordinate
      r : 0,              // Rotation when snapped
      boundary: [-256,-256, 256,-256, 256,256, -256,256], // Polygon boundary points
    },
  ], // End of snaps

} // End of settings
var board = game.add_piece(settings)



/////////////////////////////// PIECES
var settings = {
  layer:  1,              // Layer of the piece
  groups: ['pieces'],     // Groups to which this piece belongs
  rotate_with_view: true, // Piece always keeps its orientation relative to the screen when we rotate the board
  width:  64,
  height: 64,
}

// White pieces
settings.tint = 0xFAF2E1
var w_pawns   = game.add_pieces(8, settings, 'pawn')
var w_rooks   = game.add_pieces(2, settings, 'rook')
var w_knights = game.add_pieces(2, settings, 'knight')
var w_bishops = game.add_pieces(2, settings, 'bishop')
var w_queen   = game.add_piece(    settings, 'queen')
var w_king    = game.add_piece(    settings, 'king')

// Black pieces
settings.tint = 0xCC4422
var b_pawns   = game.add_pieces(8, settings, 'pawn')
var b_rooks   = game.add_pieces(2, settings, 'rook')
var b_knights = game.add_pieces(2, settings, 'knight')
var b_bishops = game.add_pieces(2, settings, 'bishop')
var b_queen   = game.add_piece(    settings, 'queen')
var b_king    = game.add_piece(    settings, 'king')


//////////////////////////////////// NEW GAME SETUP

function new_game() { 
  console.log('\n------- NEW GAME: '+ VGT.html.setups.value +' -------\n\n');

  game.load_state_from_server('setup-standard.txt')

} // End of new_game()

