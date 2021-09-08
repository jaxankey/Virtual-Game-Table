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

      // Card faces added below
      // Other images:
      'back'   : 'cards/back.png',   // Back of the cards
      'dealer' : 'cards/dealer.png', // Dealer plate

    } // End of paths
}

// Rather than listing all the images, build the paths entries with a loop
var values = ['1','2','3','4','5','6','7','8','9','10','j','q','k']
var suits  = ['c','d','s','h']
for(var m in suits) for(var n in values) VGT.images.paths[values[n]+suits[m]] = 'cards/'+values[n]+suits[m]+'.png'

// Create the Game instance (also stores itself in VGT.game)
game = new VGT.Game({
  name             : 'Cards',        // Game name
  nameplate_xyrs   : [0, 100, 0, 1], // Spawn point for new nameplates
});


/////////////////////////////// CARDS
var settings = {
  layer:  1,            // Layer of the piece
  groups: ['cards'],    // Groups to which this piece belongs
  expand_Nx  :  13,     // When expanding, how many to have in each row
  expand_dx  :  37,     // Offset in x-direction when expanding
  expand_dy  :  70,     // Offset in y-direction when expanding
  collect_dx :  0.2,    // x offset when collecting
  collect_dy : -0.2,    // y offset when collecting
}

// Get the cards
var cards = [];
for(var m in suits) for(var n in values) cards.push(game.add_piece(settings, ['back', values[n]+suits[m]]))

// Add a team zone
var tz = new VGT.TeamZone({teams_grab:[1]});
tz.add_vertices([[0,0], [500,0], [500,500], [0,500]])

//////////////////////////////////// NEW GAME SETUP

function new_game() { 
  console.log('\n------- NEW GAME: '+ VGT.html.setups.value +' -------\n\n');
} // End of new_game()

