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
      'bj'     : 'cards/bj.png',     // Big joker
      'sj'     : 'cards/sj.png',     // Small joker
      'bjp'    : 'cards/bjp.png',    // Big joker private
      'sjp'    : 'cards/sjp/png',    // Small joker private

    } // End of paths
}

// Rather than listing all 52 other images, build the paths entries with a loop
var values = ['1','2','3','4','5','6','7','8','9','10','j','q','k']
var suits  = ['c','d','s','h']
for(var m in suits) for(var n in values) {
  VGT.images.paths[values[n]+suits[m]    ] = 'cards/'+values[n]+suits[m]+'.png'
  VGT.images.paths[values[n]+suits[m]+'p'] = 'cards/'+values[n]+suits[m]+'p.png'
}

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
  collect_dx :  0.15,    // x offset when collecting
  collect_dy : -0.15,    // y offset when collecting
}

// Add the cards
var cards = [];
for(var m in suits) for(var n in values) cards.push(game.add_piece(settings, ['back', values[n]+suits[m]], [values[n]+suits[m], values[n]+suits[m]+'p']))
cards.push(game.add_piece(settings, ['back', 'sj'], ['sj', 'sjp']))
cards.push(game.add_piece(settings, ['back', 'bj'], ['bj', 'bjp']))





////////////////////////////// TEAM ZONES

// Geometry specification
var y1 = 400 // Distance from center to inner edge
var y2 = 700 // Distance from center to outer edge
var N  = Object.keys(game.settings.teams).length - 2; // Number of playing teams (not observer or manager)

// Derived quantities
var s  = Math.tan(Math.PI/N) // slope of edge lines
var x1 = y1*s
var x2 = y2*s

// Create the team zones
var v1, v2, v3, v4
for(var n=0; n<N; n++) {
  v1 = rotate_vector([ x1,y1], n*360/N)
  v2 = rotate_vector([ x2,y2], n*360/N)
  v3 = rotate_vector([-x2,y2], n*360/N)
  v4 = rotate_vector([-x1,y1], n*360/N)
  var tz = game.add_teamzone({
    layer      : 0,
    vertices   : [[v1[0],v1[1]], [v2[0],v2[1]], [v3[0],v3[1]], [v4[0],v4[1]]],
    teams_grab : [n+1,N+1],
    teams_see  : [n+1],
    width_line : 0,
    color_line : game.settings.background_color, // blurs the edges a bit
    alpha_fill : 0.5,
    alpha_line : 0.5,
    render_graphics : false,
  })
}



//////////////////////////////////// NEW GAME SETUP

function new_game() { 
  console.log('\n------- NEW GAME: '+ VGT.html.setups.value +' -------\n\n');
} // End of new_game()

