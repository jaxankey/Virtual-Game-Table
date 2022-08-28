/**
 * This file is part of the Virtual Game Table distribution 
 * (https://github.com/jaxankey/Virtual-Game-Table).
 * Copyright (c) 2015-2022 Jack Childress (Sankey).
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

// Master list of all sounds. 
VGT.sounds = {
  
    // Simple sounds 
    'contra-death' : ['sounds/contra-death.ogg', 0.5],
    'mario-death'  : ['sounds/mario-death.ogg',  0.5],

} // End of sounds

// Master list of all images. This is needed for the preloader to work.
VGT.images = {

    // Base path relative to private/game/, game/, or common/ folders (listed in search order)
    root: 'images',

    // Keys and paths relative to the root directory. Keys are used to create pieces below.
    paths: {// Required for player hands
      'hand': 'hands/hand.png',
      'fist': 'hands/fist.png',
    }
}

// Loop over dice types, adding to _image_paths
// Also keep a list of keys for each dice type
var _image_keys = {}
var _simple_dice = [2,4,6,8,10,12,20]
for(var n in _simple_dice) {
  
  // Get the dice max number and key string
  var d  = _simple_dice[n]
  var dk = String(d)+'d'

  // Create an list to populate with image keys for this die
  _image_keys[dk] = []
  for(var i=d; i>=1; i--) {
    var key = dk+String(i)
    _image_keys[dk].push(key)
    VGT.images.paths[key] = 'dice-fancy/'+key+'.png'
  }
}

// And the 90d
_image_keys['90d'] = []
for(var i=90; i>=0; i-=10) {
  var key = '90d'+String(i)
  _image_keys['90d'].push(key)
  VGT.images.paths[key] = 'dice-fancy/'+key+'.png'
}


///////////////////////////////////////// GAME

// Create the Game instance (also stores itself in VGT.game)
game = new VGT.Game({
  name             : 'RPG',            // Game name
  nameplate_xyrs   : [0, 100, 0, 1],   // Spawn point for new nameplates
  setups : ['Normal Setup'], // Setup options
  teams  : {                           // Available teams and colors
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
  default_zoom : 0.7,
});

// Number of playing teams (not observer or manager)
var N = Object.keys(game.settings.teams).length - 2





/////////////////////////////////////// PIECES
var settings = {
  layer:  2,             // Layer of the piece
  groups: ['dice'],      // Groups to which this piece belongs
  expand_Nx  :  8,       // When expanding, how many to have in each row
  expand_dx  :  53,      // Offset in x-direction when expanding
  expand_dy  :  58,      // Offset in y-direction when expanding
  collect_dx :  2,       // x offset when collecting
  collect_dy : -2,       // y offset when collecting
  shape      : 'circle', // Shape of selection region
  s          : 0.8,      // Scale of the piece
}

// Each player "owns" a list of dice
dice = []; 
for(var n=0; n<N; n++) dice[n] = {} 

// Add the stacks in descending order, so the sorting function works by chip value
for(var n=0; n<N; n++) {
  dice[n]['E'] = game.add_pieces(8, {...settings}, _image_keys['20d'])
  dice[n]['V'] = game.add_pieces(8, {...settings}, _image_keys['20d'])
}





////////////////////////////// TEAM ZONES

// Geometry specification
var y1 = 500 // Distance from center to inner edge
var y2 = 800 // Distance from center to outer edge

// Derived quantities
var s  = Math.tan(Math.PI/N) // slope of edge lines
var x1 = y1*s
var x2 = y2*s
var play_radius = Math.sqrt(x2*x2+y2*y2)

// Create the team zones and polygons
var vs_inner = []
var vs_outer = []
var wedges = []
var v1, v2, v3, v4
for(var n=0; n<N; n++) {
  v1 = rotate_vector([ x1,y1], n*360/N)
  v2 = rotate_vector([ x2,y2], n*360/N)
  v3 = rotate_vector([-x2,y2], n*360/N)
  v4 = rotate_vector([-x1,y1], n*360/N)

  // Add to the polygon lists
  vs_inner.push(v1[0])
  vs_inner.push(v1[1])
  vs_outer.push(v2[0])
  vs_outer.push(v2[1])

  // Add the teamzone
  var tz = game.add_teamzone({
    layer      : 0,
    vertices   : [[v1[0],v1[1]], [v2[0],v2[1]], [v3[0],v3[1]], [v4[0],v4[1]]],
    groups_see  : ['cards'],
    teams_see   : [n+1],
    alpha_fill : 0.3,
    alpha_line : 0.0,
    
    width_line : 12,
    color_line : 0xffffff,
    alpha_line_see : 0.4,
    
    render_graphics : false,
  })

  // The pie slice that is "ours" more or less.
  wedges.push(new PIXI.Polygon(v1[0]*0.2,v1[1]*0.2, v2[0],v2[1], v3[0],v3[1], v4[0]*0.2,v4[1]*0.2))
}

// Add the polygons that will help define the play area
var polygon_inner = new PIXI.Polygon(vs_inner)
var polygon_outer = new PIXI.Polygon(vs_outer)




//////////////////////////////////// FUNCTIONALITY

// Gets the team angle (degrees) for the team index n = 1 to 8, with null for non-participating teams
// @param {int} n team index to use; undefined means "my team index"
function get_team_angle(team) {

  // Default is my team index
  if(team == undefined) team = game.get_my_team_index()

  // Total number of players
  var N  = Object.keys(game.settings.teams).length - 2

  // If my team index is not 1 to N, return null
  if(team < 1 || team > N) return null

  // Return the angle
  return 360*(team-1)/N
}

// Sends whatever's under the mouse to the pot
function toss(e) { log('toss()', game.mouse.x, game.mouse.y)

  // Get the piece at the mouse position
  var p = game.get_top_thing_at(game.mouse.x, game.mouse.y)
  if(!p) return

  // toss it to the top of the pile or back to me
    
  // Get the toss location
  if(polygon_inner.contains(p.x.value, p.y.value)) {
    var v = rotate_vector([270,y2-40], get_team_angle())
    var outbound = false
    var R = 10;
  }
  else {
    var v = rotate_vector([0,y1/2.5], get_team_angle())
    var outbound = true
    var R = 32
  }

  // Add noise
  var dv = get_random_location_disc(R)
  v[0] += dv.x;
  v[1] += dv.y;
  
    

  // If we have tossed something to a similar location already move this one a bit away
  if(this.v_last != undefined && outbound) {
    var dx = v[0]-this.v_last[0]
    var dy = v[1]-this.v_last[1]
    if(dx*dx+dy*dy < Math.pow(50,2)) {
      dv = rotate_vector([50,0], Math.random()*360)
      v[0] += dv[0]
      v[1] += dv[1]
    }
  }
  // Remember this toss
  this.v_last = v;

  // Send it
  p.release(game.get_my_client_id())
  p.send_to_top()
  p.set_xyrs(v[0],v[1],(Math.random()-0.5)*720)

  // Roll it if outbound
  if(outbound) p.randomize_image_index()
}


// Set up for the first time
function new_game() { 
  console.log('\n------- NEW GAME: '+ game.html.select_setups.value +' -------\n\n');

  // Now the chips...
  for(var team=1; team<=N; team++) {
    var a = get_team_angle(team)
    game.unselect(team)

    // Loop over the stacks for this team
    var v = rotate_vector([0, y1+100], a)
    game.expand(dice[team-1]['E'], v[0], v[1], a, a, true, 0)
    var v = rotate_vector([0, y1+157], a)
    game.expand(dice[team-1]['V'], v[0], v[1], a, a, true, 0)
  }
} // End of new_game()





//////////////////////////////////////// KEY BINDINGS
game.bind_key(['Shift|KeyB|Down', 'KeyB|Down', 'Shift|KeyT|Down', 'KeyT|Down'], toss);
game.bind_pointerdown_button([1,3,4,5], toss);




//////////////////////////////////////// ADDITIONAL GUI
game.set_special_title('RPG')
game.add_special_html('<button title="[Backspace] " onpointerdown="fold()">Test</button>')
//game.add_special_html('<div style="flex-grow:1"></div>')
