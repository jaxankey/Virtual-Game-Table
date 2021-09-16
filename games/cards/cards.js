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

// ASSUMES POKER IS LOADED ALREADY (see game.js)

// After poker loads and connects to the server, make some tweaks to it
VGT.game_is_ready = function() {
    for(var n in chips) for(var m in chips[n]) for(var k in chips[n][m]) chips[n][m][k].hide()
    game.set_special_title('Cards')
}

function new_game() { 
  console.log('\n------- NEW CARDS GAME: '+ game.html.select_setups.value +' -------\n\n')

  // All cards
  if(game.html.select_setups.selectedIndex == 0) get_shuffle_deck(undefined, 0, true)
  
  // No Jokers
  else {
    // Get all but jokers
    get_shuffle_deck(undefined, 0, cards.slice(0,52))

    // Send the jokers away
    cards[52].set_xyrs(y1*2, 0, Math.random()*1000).set_image_index(1)
    cards[53].set_xyrs(y1*2, 0, Math.random()*1000).set_image_index(1)
  }
  
  // Distribute the bars
  distribute_bars()

} // End of new_game()
