/**
 * This file is part of the Virtual Game Table distribution 
 * (https://github.com/jaxankey/Virtual-Game-Table).
 * Copyright (c) 2015-2019 Jack Childress (Sankey).
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

/**
 * TO DO:
 */

//////////////////////////
// Card Table
//////////////////////////

// short name needed for differentiating the games in the cookies
board.game_name = 'dominion';
scale           = 1;

// set the allowed rotations and initial zoom (out)
board.z_target = 80;
board.r_step   = 45;
board.pan_step = 250;
board.focus_zoom_level = 120;

// Collection and expansion settings
board.collect_r_piece  = null; // Rotates the piece to the current view
board.collect_r_stack  = null; // Rotates the stack offsets to the current view
board.expand_spacing_x = 35;
board.expand_spacing_y = 55;
board.expand_number_per_row = 10;

//////////////////////////
// TEAMS               
//////////////////////////

// Add some teams
board.add_team('observer', ['hand_white.png', 'fist_white.png' ], '#cccccc');
board.add_team('red',      ['hand_red.png',   'fist_red.png'   ], '#ff2a2a'); 
board.add_team('orange',   ['hand_orange.png','fist_orange.png'], '#ff6600'); 
board.add_team('blue',     ['hand_blue.png',  'fist_blue.png'  ], '#5599ff'); 
board.add_team('violet',   ['hand_violet.png','fist_violet.png'], '#d62cff'); 

// Set up the team zones based on the number of seats
number_of_teams = 4;
theta = 0.5*(360/number_of_teams)*Math.PI/180.0;  // Wedge angle in radians
R1    = 2500;                                      // Inner radius of team zones
R2    = (R1*Math.cos(theta)+1000)/Math.cos(theta); // Outer radius of team zones
board.r_step = 360.0/number_of_teams;

// Unrotated coordinates of the team zone (same for each team)
x1 = R1*Math.sin(theta); y1 = R1*Math.cos(theta) + 250; 
x3 = R2*Math.sin(theta); y3 = R2*Math.cos(theta) + 250; 

// Angles of each team
team_angles = [];
for(var n=0; n<number_of_teams; n++) team_angles.push(n*board.r_step);

// Default shortcut coordinates and team zones.
board.shortcut_coordinates.length = 0;
board.team_zones.length           = 0;
for(n=0; n<number_of_teams; n++) {
  //                  team_index, x1, y1, x2, y2, x3, y3,  x4, y4,       rotation, alpha, draw_mode, grab_mode
  board.add_team_zone(n+1,       -x1, y1, x1, y1, x3, y3, -x3, y3, team_angles[n], 1.0,   0);
  board.shortcut_coordinates.push([0, -y1+150, 100, team_angles[n]]);
}

// Full board view
board.shortcut_coordinates = [
  [0, -198.44133868655945, 21.022410381342862, 0], // seat 1
  [0, -198.44133868655945, 21.022410381342862, 90], // seat 2
  [0, -198.44133868655945, 21.022410381342862, 180], // seat 3
  [0, -198.44133868655945, 21.022410381342862, 270], // seat 4
  [0, -347.32978730582306, 70.71067811865474, 0], // purchase
  [0, 0, 14.865088937534015, 0], // zoomed out
];



/////////////
// PIECES  
/////////////
board.new_piece_scale               = scale;
board.new_piece_rotates_with_canvas = true;
board.new_piece_r_step              = 90;
//board.set_background_image('table.png');
board.new_piece_movable_by = null;
board.new_piece_danger_image_index = 1;

// Add all the cards
board.new_piece_collect_offset_x = 1;
board.new_piece_collect_offset_y = 1;
board.expand_spacing_x = 250;
board.expand_spacing_y = 100;

function add_cards(N, name) {return board.add_pieces(N, ['card-back.jpg', name], [name, name]);}

adventurer   = add_cards(10, 'adventurer.jpg');
bureaucrat   = add_cards(10, 'bureaucrat.jpg');
cellar       = add_cards(10, 'cellar.jpg');
chancellor   = add_cards(10, 'chancellor.jpg');
chapel       = add_cards(10, 'chapel.jpg');
councilroom  = add_cards(10, 'councilroom.jpg');
feast        = add_cards(10, 'feast.jpg');
festival     = add_cards(10, 'festival.jpg');
laboratory   = add_cards(10, 'laboratory.jpg');
library      = add_cards(10, 'library.jpg');
market       = add_cards(10, 'market.jpg');
militia      = add_cards(10, 'militia.jpg');
mine         = add_cards(10, 'mine.jpg');
moat         = add_cards(10, 'moat.jpg');
moneylender  = add_cards(10, 'moneylender.jpg');
remodel      = add_cards(10, 'remodel.jpg');
smithy       = add_cards(10, 'smithy.jpg');
spy          = add_cards(10, 'spy.jpg');
thief        = add_cards(10, 'thief.jpg');
throneroom   = add_cards(10, 'throneroom.jpg');
village      = add_cards(10, 'village.jpg');
witches      = add_cards(10, 'witch.jpg');
woodcutter   = add_cards(10, 'woodcutter.jpg');
workshop     = add_cards(10, 'workshop.jpg');

copper = add_cards(60, 'copper2.jpg');
silver = add_cards(40, 'silver2.jpg');
gold   = add_cards(30, 'gold2.jpg');

gardens  = add_cards(10, 'gardens.jpg');
estate   = add_cards(24, 'estate.jpg');
duchy    = add_cards(12, 'duchy.jpg');
province = add_cards(12, 'province.jpg');

curse  = add_cards(30, 'curse.jpg');

///////////////
// AVATARS
//////////////
board.new_avatar_scale               = 3;
board.new_piece_rotates_with_canvas = false;
board.new_piece_physical_shape      = 'inner_circle';
board.add_avatars();

/////////////////////
// FUNCTIONALITY
/////////////////////


// Makes piles
function make_piles(piles, x0, y0, dx) {
  for(n in piles) 
    board.collect_pieces(piles[n], x0+n*dx, y0, false, 1, 0, 0);
}

// setup the board
function setup(resources) {
  console.log('setup');

  // deck spacing
  var dx = 370;
  var dy = 523;

  // Get the teams
  teams = get_active_teams()
  if(teams.length < 2) teams=[1,3];
  
  // Build the initial team decks
  for(var n in teams) {
    var angle = 90*(teams[n]-1);
    var v = rotate_vector(-R1*0.4, R1*0.7, angle);

    // pieces, 
    // x,y,shuffle,active_image,r_piece,r_stack,offset_x,offset_y,from_top
    board.collect_pieces(copper.slice(n*7,n*7+7).concat(estate.slice(n*3,n*3+3)), 
      v.x, v.y, true, 0, angle, angle);
  }
  
  // Number of estate, duchy and province cards
  if(teams.length == 2) var N = 8;
  else                  var N = 12;

  // collect the cards that are always present
  make_piles([copper.slice(teams.length*7,1000), silver, gold], -dx*1, -dy*1.5, dx);
  make_piles([estate.slice(teams.length*3,teams.length*3+N), 
    duchy.slice(0,N), province.slice(0,N), curse.slice(0,(teams.length-1)*10)], -dx*1.5, -dy*0.5, dx);

  // Move the unused elsewhere
  make_piles([estate  .slice(teams.length*3+N, 1000), 
              duchy   .slice(N,1000),
              province.slice(N,1000),
              curse   .slice((teams.length-1)*10,1000)], -dx*1.5, 4500-dy, dx);


  // choose 10 resources randomly if not specified
  if(!resources) {
    var resources = [adventurer, bureaucrat, cellar, chancellor, chapel, 
      councilroom, feast, festival, gardens, laboratory, library, 
      market, militia, mine, moat, moneylender, remodel, smithy, spy, 
      thief, throneroom, village, witches, woodcutter, workshop];
    
    // randomize
    shuffle_array(resources)
    
    // clip the last ones
    others = resources.splice(10, 1000);
  }
  
  // Make the main piles
  make_piles(resources.slice(0,5),  -dx*2, 0.5*dy, dx);
  make_piles(resources.slice(5,10), -dx*2, 1.5*dy, dx);

  // Move the rest elsewhere
  make_piles(others, -dx*7, 4500, dx);

  // Avatars
  board.expand_pieces(board.avatars, 8, 0, 5300, 400, 400, 0, 0, 0);
}

// Load cookies, ask for the config, and start accepting piece packets.
board.go();