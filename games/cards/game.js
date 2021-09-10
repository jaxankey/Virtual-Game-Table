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





/////////////////////////////////////// RESOURCES

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





///////////////////////////////////////// GAME

// Create the Game instance (also stores itself in VGT.game)
game = new VGT.Game({
  name             : 'Cards',        // Game name
  nameplate_xyrs   : [0, 100, 0, 1], // Spawn point for new nameplates
  teams : {                          // Available teams and colors
    Observer : 0xFFFFFF,
    Red      : 0xFF2A2A,
    Orange   : 0xFF6600,
    Yellow   : 0xFFE84B,
    Green    : 0x118855,
    Blue     : 0x5599FF,
    Violet   : 0xD62CFF,
    Gray     : 0x808080,
    Brown    : 0x883300,
    Manager  : 0x333333
  },
});





/////////////////////////////////////// PIECES

var settings = {
  layer:  2,            // Layer of the piece
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

// Paddle
settings.layer  = 1
settings.shovel = ['cards']
settings.anchor = {x:0.485, y:0.413}
settings.x = -1.8
var dealer = game.add_piece(settings, 'dealer');





////////////////////////////// TEAM ZONES

// Geometry specification
var y1 = 500 // Distance from center to inner edge
var y2 = 800 // Distance from center to outer edge
var N  = Object.keys(game.settings.teams).length - 2; // Number of playing teams (not observer or manager)

// Derived quantities
var s  = Math.tan(Math.PI/N) // slope of edge lines
var x1 = y1*s
var x2 = y2*s
var play_radius = Math.sqrt(x2*x2+y2*y2)

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



//////////////////////////////////// FUNCTIONALITY



/**
 * Gets the team angle (degrees) for the team index n = 1 to 8, with null for non-participating teams
 * @param {int} n team index to use; undefined means "my team index"
 */
function get_team_angle(n) {

  // Default is my team index
  if(n == undefined) n = game.get_my_team_index()

  // Total number of players
  var N  = Object.keys(game.settings.teams).length - 2

  // If my team index is not 1 to N, return null
  if(n < 1 || n > N) return null

  // Return the angle
  return 360*(n-1)/N
}

// Deals one card to the table coordinates x,y, optionally face up.
// You can also optionally specify the depth from which to deal.
function deal_one_to_xy(x,y,face_up,depth) {
    
    // Get the cards on the dealer platter
    var deck = dealer.get_shoveled()
    deck = game.sort_by_z_value(deck, true) 
  
    // Get the card
    var p = deck[depth ? depth : 0]
    if(!p) return
  
    // Get the angle of the card based on region
    var a  = Math.atan2(y,x)*180.0/Math.PI;   // Raw angle
    var ar = Math.round(a/45)*45 + 270 + 360; // Snapped angle plus some spin
    log('HAY', a, ar)
    
    // Get the coordinates to send it to and send it
    p.send_to_top().set_xyrs(x,y,ar);
  
    // If shiftKey we are dealing up
    if(face_up) p.increment_image_index();
}

// Sends one to the mouse coordinates
function deal_one_to_mouse(e) { deal_one_to_xy(game.mouse.x, game.mouse.y, e.shiftKey); }

/**
 * Deals a card to everyone. e.shiftKey makes it face up.
 */
function deal_to_all(e) { log('deal_to_all()', e) 
  
  // Remember the last send coordinates
  if(this.last_vs == undefined) this.last_vs = {}

  // Get a sorted list of participating team indices
  var teams   = game.get_participating_team_indices()
  var my_team = game.get_my_team_index()

  // If I'm playing, reorder the list so that the player to my left is first
  if(my_team > 0 && my_team) {
    var i = teams.indexOf(my_team)

    // Only do this if we found a valid index and we're not the last in the list (already ok)
    if(i >= 0 && i < teams.length-1) {
      var a = teams.slice(i+1)   // start of the new array
      var b = teams.slice(0,i+1) // end of the new array
      teams = [...a,...b]
    }
  } // End of reorder the list

  // Loop over the teams in order from the person to our left
  // sending a card to each
  var r, v
  for(var n in teams) { 
    
    // Get the team angle and piece
    r = get_team_angle(teams[n])

    log('HAY', n, teams[n], r, )

    // Get the coordinates to send it to and send it
    v = rotate_vector([
      (Math.random()-0.5)*cards[0].width*2,
      (Math.random()-0.5)*cards[0].width + y1-80], r);
    
    // Send it to this xy value
    deal_one_to_xy(v[0],v[1], e ? e.shiftKey : undefined, n);
  }
}


/** 
 * Collects all the cards onto the dealer paddle and brings it all to my dealing position.
 * If all_cards is false or not specified, it will only collect those cards within the play area.
 */
function get_shuffle_cards(e,team,all_cards) { log('get_shuffle_cards()', e)
  if(all_cards) var cs = cards
  else {
    var cs = []
    var c
    for(var n in cards) { 
      c = cards[n]
      if(c.x.value*c.x.value+c.y.value*c.y.value <= play_radius*play_radius) cs.push(c)
    }
  }

  // Get the team angle
  var r = get_team_angle(team)

  // If our team has no zone
  if(r == null) { r = 0; var v = [0,0]; }

  // Otherwise, use a nice dealer spot for our team
  else { var v = rotate_vector([x1-60, y1-48], r )}

  // Set the dealer paddle and collect the cards on top of it
  dealer.set_xyrs(v[0],v[1], r);
  game.start_shuffle(cs, v[0], v[1], r, r, false);
  game.set_image_indices(cs, 0);
} 



function new_game() { 
  console.log('\n------- NEW GAME: '+ VGT.html.select_setups.value +' -------\n\n');

  get_shuffle_cards(undefined, 0, true)

} // End of new_game()



//////////////////////////////////////// KEY BINDINGS
game.bind_key('BackspaceDown', get_shuffle_cards);
game.bind_key(['KeyLDown', 'ShiftKeyLDown'], deal_to_all);
game.bind_key(['KeyODown', 'ShiftKeyODown'], deal_one_to_mouse);