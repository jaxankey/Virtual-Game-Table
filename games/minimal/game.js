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

// Master list of all images. 
VGT.images = { paths: {
  hand          : 'images/hands/hand.png',             // Required for player hands
  fist          : 'images/hands/fist.png',             // Required for player hands
  board         : 'images/checkers/board.png',         // Checkered board
  checker_black : 'images/checkers/checker_black.png', // Black checker
  king_black    : 'images/checkers/king_black.png',    // Black king
  checker_red   : 'images/checkers/checker_red.png',   // Red checker
  king_red      : 'images/checkers/king_red.png',      // Red king
}}

// Create the Game instance
var game  = new VGT.Game();

// Add the game board to layer 0, and allow only the manager to move it
game.add_piece({layer:0, teams:['Manager']}, 'board');

// Add some checkers with a king symbol on the "back side" to layer 1
game.add_pieces(12, {layer:1}, ['checker_red',   'king_red'  ])
game.add_pieces(12, {layer:1}, ['checker_black', 'king_black'])

// Define the function that is called when someone clicks the "new game" button.
function new_game() { game.load_state_from_server('setup-standard.txt') }