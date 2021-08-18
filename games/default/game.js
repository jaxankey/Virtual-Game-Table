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
var sound_list = {
  
    // Simple sounds 
    'beamdown': ['sounds/beamdown.ogg', 0.5],

    // Multi-take groups
    'splat' : { 
        'splat1' : ['sounds/splat1.ogg', 0.15],
        'splat2' : ['sounds/splat2.ogg', 0.15],
        'splat3' : ['sounds/splat3.ogg', 0.15],
        'splat4' : ['sounds/splat4.ogg', 0.15],
    },

    'pop' : {
        'pop1' : ['sounds/pop1.mp3', 0.35],
        'pop2' : ['sounds/pop2.mp3', 0.35],
        'pop3' : ['sounds/pop3.mp3', 0.35],
        'pop4' : ['sounds/pop4.mp3', 0.35],
    },

    'drip' : {
        'drip1' : ['sounds/drip1.mp3', 0.15],
        'drip2' : ['sounds/drip2.mp3', 0.15],
        'drip3' : ['sounds/drip3.mp3', 0.15],
        'drip4' : ['sounds/drip4.mp3', 0.15],
    },
} // End of sound_list

// Master list of all images. This is needed for the preloader to work.
var image_paths = {
    root : 'images',
    list : [
        'hands/hand.png',
        'hands/fist.png',
        'cards/sj.png',
        'cards/bj.png',
        'cards/1h.png',
        'cards/2h.png',
        'cards/3h.png',
        'cards/4h.png',
        'cards/5h.png',
        'cards/6h.png',
        'cards/7h.png',
        'cards/8h.png',
        'cards/9h.png',
        'cards/10h.png',
        'cards/back.png',
    ],
    full: null,
}

// Create an instance of the Game object (stores itself in VGT)
new VGT.Game();

// Create pieces
var defaults = {texture_root:'cards', s:0.8};
var p = [];
p[0] = new VGT.Piece({...defaults, texture_paths:[['sj.png', 'back.png']]});
for(var n=1; n<=4; n++) p[n] = new VGT.Piece({...defaults, texture_paths:[[String(n)+'h.png', 'back.png']]});

defaults = {texture_root:'cards', s:1.2, layer:'2', local_snaps:[{}]};
for(var n=5; n<=9; n++) p[n] = new VGT.Piece({...defaults, texture_paths:[[String(n)+'h.png', 'back.png']]});




/** Function to start a new game */ 
function new_game() { log('new_game()');

} // End of new_game()