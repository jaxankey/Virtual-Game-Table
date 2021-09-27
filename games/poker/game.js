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

// Master list of all sounds. 
VGT.sounds = {
  
    // Simple sounds 
    'fold'    : ['sounds/contra-death.ogg', 0.5],
    'tantrum' : ['sounds/mario-death.ogg',  0.5],

} // End of sounds

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

      // Chips
      'black'  : 'chips/chip_black.png',
      'red'    : 'chips/chip_red.png',
      'blue'   : 'chips/chip_blue.png',
      'white'  : 'chips/chip_white.png',

      // Play bars
      'in'  : 'chips/playing.png',
      'out' : 'chips/folded.png',
      
      // Important
      'bat'     : 'chips/bat.png',

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
  name             : 'Poker',          // Game name
  nameplate_xyrs   : [0, 100, 0, 1],   // Spawn point for new nameplates
  setups : ['No Jokers', 'All Cards'], // Setup options
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
  layer:  2,            // Layer of the piece
  groups: ['cards'],    // Groups to which this piece belongs
  expand_Nx  :  10,     // When expanding, how many to have in each row
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

// Chips
settings.groups = ['chips']
settings.expand_dy = 37
settings.worth_prefix = '$'
settings.worth_decimals = 2
settings.collect_dx =  2;
settings.collect_dy = -2;

// Loop over players
chips = []; 
bars  = [];
for(var n=0; n<N; n++) {

    // in/out bar
    bars[n] = game.add_piece(settings, ['out','in'])
    
    // Chip stacks
    chips[n] = [] 
    chips[n][0] = game.add_pieces(5, {...settings, worth:1,    worth_prefix:'$', shape:'circle'}, 'black')
    chips[n][1] = game.add_pieces(5, {...settings, worth:0.25, worth_prefix:'$', shape:'circle'}, 'blue')
    chips[n][2] = game.add_pieces(5, {...settings, worth:0.05, worth_prefix:'$', shape:'circle'}, 'red')
    chips[n][3] = game.add_pieces(5, {...settings, worth:0.05, worth_prefix:'$', shape:'circle'}, 'red')
    chips[n][4] = game.add_pieces(5, {...settings, worth:0.01, worth_prefix:'$', shape:'circle'}, 'white')
    chips[n][5] = game.add_pieces(5, {...settings, worth:0.01, worth_prefix:'$', shape:'circle'}, 'white')
    chips[n][6] = game.add_pieces(5, {...settings, worth:0.01, worth_prefix:'$', shape:'circle'}, 'white')
    chips[n][7] = game.add_pieces(5, {...settings, worth:0.01, worth_prefix:'$', shape:'circle'}, 'white')
    chips[n][8] = game.add_pieces(5, {...settings, worth:0.01, worth_prefix:'$', shape:'circle'}, 'white')
}

// Bat
settings.y = -100
bat = game.add_piece(settings, 'bat')

// Paddle
settings.y = 0
settings.layer  = 1
settings.shovel = ['cards']
settings.anchor = {x:0.5, y:0.425}
settings.x = -1.8
var dealer = game.add_piece(settings, 'dealer');





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

// Deals one card to the table coordinates x,y, optionally face up.
// You can also optionally specify the depth from which to deal.
function deal_one_to_xy(x,y,face_up,depth) {
    
    // Get the cards on the dealer platter
    var deck = dealer.get_shoveled(true)
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
    if(face_up) p.set_image_index(1);
    else        p.set_image_index(0);
}

// Sends one to the mouse coordinates
function deal_one_to_mouse(e) { deal_one_to_xy(game.mouse.x, game.mouse.y, e.shiftKey); }

// Deals a card to everyone. e.shiftKey makes it face up.
function deal_to_all(e) { log('deal_to_all()', e) 
  
  // First we get all the chips that are outside the central pot
  //
  // Loop over all the chips, looking for those in the right region.
  var pot = [], c
  for(var n in chips) for(var m in chips[n]) for(var i in chips[n][m]) { c = chips[n][m][i]
    if(polygon_inner.contains(c.x.value, c.y.value)
    && c.x.value*c.x.value + c.y.value*c.y.value > 100*100) pot.push(chips[n][m][i])
  }
  // Only the unheld pot chips
  pot = game.get_unheld_things(pot)
  //
  // Unselect & bring them in!
  game.unselect_all_teams(pot)
  game.pile(pot, 0, 0, 90)
  //
  // Remove the last toss
  toss.v_last = undefined;

  // Get a sorted list of participating team indices
  var teams = []
  for(var n=0; n<N; n++) if(bars[n].get_image_index()) teams.push(n+1)
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

    // Get the coordinates to send it to and send it
    v = rotate_vector([
      (Math.random()-0.5)*cards[0].width*1.5,
      (Math.random()-0.5)*cards[0].width*0.7 + y1-175], r);
    
    // Send it to this xy value
    deal_one_to_xy(v[0],v[1], e ? (e.shiftKey||e.button) : undefined, n);
  }
}


// Collects all the cards onto the dealer paddle and brings it all to my dealing position.
// If all_cards is false or not specified, it will only collect those cards within the play area.
function get_shuffle_deck(e,team,all_cards) { log('get_shuffle_deck()', e, team, all_cards)
  
  if(all_cards == true) var cs = cards

  // If it's a list itself, use that.
  else if(typeof all_cards == 'object') var cs = all_cards

  // undefined or false means just those cards in the play area
  else {
    var cs = []
    for(var n in cards) if(polygon_outer.contains(cards[n].x.value, cards[n].y.value)) cs.push(cards[n])
  }

  // Finally, we only collect those that are unheld
  cs = game.get_unheld_things(cs)

  // Get the team angle
  var r = get_team_angle(team)

  // If our team has no zone
  if(r == null) { r = 0; var v = [0,0]; }

  // Otherwise, use a nice dealer spot for our team
  else { var v = rotate_vector([x1-60, y1-48], r ) }

  // Set the dealer paddle and collect the cards on top of it
  dealer.set_xyrs(v[0],v[1], r);
  game.unselect_all_teams(cs);
  game.start_shuffle(cs, v[0], v[1], r, r, false);
  game.set_image_indices(cs, 0);

  // Distribute the bars
  distribute_bars();
} 


// Gets all the chips from the central play area and retrieves them.
function collect_pot() { 

  // Make sure we're a participating team
  var team = game.get_my_team_index()
  if(team <1 || team > Object.keys(game.settings.teams).length-2) return
  
  // Get the chips from the center
  var pot = [];
  for(var n in chips) for(var m in chips[n]) for(var i in chips[n][m]) 
    if(polygon_inner.contains(chips[n][m][i].x.value, chips[n][m][i].y.value)) pot.push(chips[n][m][i]);

  // Only the unheld pot chips
  pot = game.get_unheld_things(pot)

  // Deselect the pot chips for all the teams
  game.unselect_all_teams(pot)

  // Unselect everything I'm holding and then select the pot
  game.unselect()
  game.select(pot)

  // Get the place to collect them
  var v = rotate_vector([0,y1+150], get_team_angle(team))
  game.pile(pot, v[0], v[1], 30)

  // Count it
  //game.count(pot,true)

  // Remove the last toss so we don't have to avoid it.
  toss.v_last = undefined;

  log('collect_pot()', pot.length, v, y1, get_team_angle(team))
}

// Folds from bar number n
function fold(n) { log('fold()', n) 
  if(typeof n != 'number') n = VGT.game.get_my_team_index()-1;
  if(n < 0 || n > 7) return;
  
  // Unselect everything I'm holding
  game.unselect(undefined, n)

  // Pile center
  var a = get_team_angle(n+1)
  var v = rotate_vector([0,y1-152], a)
  
  // Get all the cards in our zone
  var dealer_cards = dealer.get_shoveled()
  var p, dv;
  for(var i in cards) 
    if(wedges[n].contains(cards[i].x.value, cards[i].y.value)
    && !dealer_cards.includes(cards[i])) { p = cards[i];
      dv = get_random_location_disc(30)
      p.set_image_index(0)
      p.set_xyrs(v[0]+dv.x,v[1]+dv.y, p.r.target + p.R.target + (Math.random()-0.5)*720*2)
    }
      
  // Kill the in/out
  bars[n].set_image_index(0)
}
function fold_with_noise(n) {
  game.sounds.play('fold')
  fold(n)
}


// Sends whatever's under the mouse to the pot
function toss(e) { log('toss()', game.mouse.x, game.mouse.y)

  // Get the piece at the mouse position
  var p = game.get_top_thing_at(game.mouse.x, game.mouse.y)
  if(!p) return

  // If it's a bar, fold
  if(bars.includes(p)) {
    if(e.shiftKey) fold_with_noise(bars.indexOf(p));
    else           fold           (bars.indexOf(p));
  }

  // Otherwise toss it to the top of the pile or back to me
  else {
    
    // Get the toss location
    if(polygon_inner.contains(p.x.value, p.y.value)) var v = rotate_vector([0,y1+150], get_team_angle())
    else                                             var v = rotate_vector([0,y1/2.5], get_team_angle())

    // Add noise
    var dv = get_random_location_disc(p.width*0.75)
    v[0] += dv.x;
    v[1] += dv.y;

    // If we have tossed something already, make sure this toss isn't too close
    if(this.v_last != undefined) {
      var dx = v[0]-this.v_last[0]
      var dy = v[1]-this.v_last[1]
      if(dx*dx+dy*dy < p.width*0.25) {
        dv = rotate_vector([p.width*0.25,0], Math.random()*360)
        v[0] += dv[0]
        v[1] += dv[1]
      }
    }
    // Remember this toss
    this.v_last = v;

    // Send it
    p.send_to_top().set_xyrs(v[0],v[1],(Math.random()-0.5)*720)
  }
}


// Sends all the in/out bars to the right place and enables / disables
function distribute_bars() {

  // All the pieces for each player
  for(var n=1; n<=8; n++) {
    var a = get_team_angle(n);

    // In/out
    var v = rotate_vector([0, y1-bars[0].height*0.42], a)
    bars[n-1].set_xyrs(v[0],v[1],a)
    if(game.team_is_participating(n)) bars[n-1].set_image_index(1)
    else                              bars[n-1].set_image_index(0)
  }
}


// Set up for the first time
function new_game() { 
  console.log('\n------- NEW GAME: '+ game.html.select_setups.value +' -------\n\n');

  // All cards
  if(game.html.select_setups.selectedIndex == 1) get_shuffle_deck(undefined, game.get_my_team_index(), true)
  
  // No Jokers
  else {

    // Get all but jokers
    get_shuffle_deck(undefined, game.get_my_team_index(), cards.slice(0,52))

    // Send the jokers away
    cards[52].set_xyrs(y1*3, 0, Math.random()*1000).set_image_index(1)
    cards[53].set_xyrs(y1*3, 0, Math.random()*1000).set_image_index(1)
  }

  // Distribute the bars
  distribute_bars()

  // Now the chips...
  for(var team=1; team<=N; team++) {
    var a = get_team_angle(team)
    game.unselect(team)

    // Loop over the stacks for this team
    for(var n in chips[team-1]) { 
      var v = rotate_vector([(n-4)*57, y2-43], a)
      game.collect(chips[team-1][n], v[0], v[1], a, a)
    }
  }
} // End of new_game()





//////////////////////////////////////// KEY BINDINGS
game.bind_key('Backspace|Down', get_shuffle_deck)
game.bind_key('Shift|Backspace|Down', collect_pot)
game.bind_key('End|Down', fold)
game.bind_key('Shift|End|Down', fold_with_noise)
game.bind_key(['KeyL|Down', 'Shift|KeyL|Down'], deal_to_all)
game.bind_key(['KeyO|Down', 'Shift|KeyO|Down'], deal_one_to_mouse)
game.bind_key(['Shift|KeyB|Down', 'KeyB|Down', 'Shift|KeyT|Down', 'KeyT|Down'], toss);
game.bind_pointerdown_button([1,3,4,5], toss);




//////////////////////////////////////// ADDITIONAL GUI
game.set_special_title('Poker')
game.add_special_html('<button title="[Backspace] Collects and shuffles the cards in the play area." onpointerdown="get_shuffle_deck()">Get Deck</button>')
game.add_special_html('<button id="button_pot" title="[Shift-Backspace] Collect all chips in the inner play area."   onpointerdown="collect_pot()"      style="margin-left:0.4em; ">Collect Pot</button>')
game.add_special_html('<button title="[End] Fold cards and quit playing" onpointerdown="fold()" style="margin-left: 0.4em">Fold</button>')
game.add_special_html('<div style="flex-grow:1"></div>')
game.add_special_html('<button title="[L] Deals one card to all participants. [Shift] or [Right-click] deals face up." onpointerdown="deal_to_all(event)" style="margin-left:0.4em;">Deal</button>')
