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
 * place clue tokens
 * add button for roll dice
 * white borders
 */

//////////////////////////
// Arkham Horror
//////////////////////////

// short name needed for differentiating the games in the cookies
board.game_name = 'arkham';

// set the allowed rotations and initial zoom (out)
board.z_target = 50;
board.r_step   = 45;
board.pan_step = 250;

// Visuals
board.selected_border_width = 7;

// Collection and expansion settings
board.new_piece_collect_offset_x = -1;
board.new_piece_collect_offset_y =  1;
board.collect_r_piece  =  null; // rotate the piece by the current view when collecting
board.collect_r_stack  =  0;    // pieces always stack in the same direction
board.expand_spacing_x =  100;
board.expand_spacing_y =  100;

// Add some teams
board.add_team('white',    ['hand_white.png', 'fist_white.png' ], '#cccccc');
board.add_team('red',      ['hand_red.png',   'fist_red.png'   ], '#ff2a2a'); 
board.add_team('blue',     ['hand_blue.png',  'fist_blue.png'  ], '#5599ff'); 
board.add_team('violet',   ['hand_violet.png','fist_violet.png'], '#d62cff'); 
board.add_team('orange',   ['hand_orange.png','fist_orange.png'], '#ff6600'); 
board.add_team('gray',     ['hand_gray.png',  'fist_gray.png'  ], '#808080'); 
board.add_team('manager',  ['hand_white.png', 'fist_white.png' ], '#cccccc');

// Locations to go to when hitting the number keys
board.shortcut_coordinates = [
  [0, 0, 50,   0],
  [0, 0, 50, -90],
  [0, 0, 50,  90]];



/////////////
// PIECES  
/////////////

// BOARDS
board.new_piece_rotates_with_canvas = true;
board.new_piece_r_step              = 45;
board.new_piece_movable_by          = [6];
board.set_background_image('Board-Arkham.png');

// MOVABLE PIECES
board.new_piece_movable_by = null;

// MONSTERS
board.new_piece_is_tray = false;
monsters   = []
duplicates = {0:3, 1:2,  2:7,  3:4,  4:1,  5:2,  6:2,  7:2,  8:1,  9:3, 10:3,
                  11:3, 12:1, 13:2, 14:1, 15:1, 16:2, 17:3, 18:3, 19:2, 20:2,
                  21:2, 22:1, 23:1, 24:1, 25:1, 26:2, 27:2, 28:3} 
/** Dunwich:
 * 1 spectral hunter
 * 2 goat spawn
 * 1 mummy
 * 1 the beast
 * 3 child of abhoth
 * 2 rat things
 * 1 star vampire
 * 1 dunwich horror
 * 2 color of outer space
 * 1 hunting horror
 * 2 wraith
 * 1 wizard wately
 * 2 tcho-tcho
 * 5 servant of glaaki
 */
for(n=0; n<=28; n++) {
  var m = 1;
  if(n in duplicates) m = duplicates[n];

  for(i=0; i<m; i++)
    monsters.push(board.add_piece(['monsters/'+String(n)+'.jpg', 'monsters/'+String(n)+'_back.jpg']));
}

// CHARACTERS
board.new_piece_is_tray = true;
character_sheets = [];
for(n=0; n<=15; n++) character_sheets.push(board.add_piece(['characters/'+String(n)+'.jpg', 'characters/'+String(n)+'b.jpg']));

board.new_piece_is_tray = false;
character_markers = [];
for(n=0; n<=15; n++) character_markers.push(board.add_piece(['characters/'+String(n)+'m.png']));

// Investigator status tokens
tens  = [];
fives = [];
ones  = [];
for(n=0; n<10; n++) {
  tens .push(board.add_piece(['Money10.png']));
  fives.push(board.add_piece(['Money5.png']));
  ones .push(board.add_piece(['Money1.png']));
  ones .push(board.add_piece(['Money1.png']));
}

board.new_piece_physical_shape="outer_circle";
sanity  = [];
stamina = [];
clues   = [];
sliders = [];
for(n=0; n<12; n++) {
  sanity.push(board.add_piece(['Sanity3.gif']));
  sanity.push(board.add_piece(['Sanity.gif']));
  sanity.push(board.add_piece(['Sanity.gif']));
  stamina.push(board.add_piece(['Stamina3.png']));
  stamina.push(board.add_piece(['Stamina.png']));
  stamina.push(board.add_piece(['Stamina.png']));
  clues.push(board.add_piece(['Clue.png']));
  clues.push(board.add_piece(['Clue.png']));
  clues.push(board.add_piece(['Clue.png']));
  clues.push(board.add_piece(['Clue.png']));
  sliders.push(board.add_piece(['Slider.gif']));
  sliders.push(board.add_piece(['Slider.gif']));
}
doom = [];
for(n=0; n<20; n++) doom.push(board.add_piece(['DoomToken.png', 'ElderSign.gif']));

// MISC
activity = [];
activity.push(board.add_piece(['Activity_1.gif']));
activity.push(board.add_piece(['Activity_2.gif']));
activity.push(board.add_piece(['Activity_3.gif']));
explored = [];
for(n=0;n<3;n++) explored.push(board.add_piece(['Explored.gif']));

board.new_piece_physical_shape = "rectangle";
terror = board.add_piece(['Terror.gif']);
doors = [];
for(n=0;n<3;n++) doors.push(board.add_piece(['Closed.gif']));

// DECKS
function build_normal_deck(path, N, ext, duplicates) {
  deck = [];
  for(var n=0; n<=N; n++) {
    
    // number of copies of each card
    var m = 1;
    if(duplicates && n in duplicates) m = duplicates[n];

    // Add as many copies as we're supposed to.
    for(var i=0; i<m; i++) {
      deck.push(board.add_piece(['decks/'+path+'/'+'back'+ext, 'decks/'+path+'/'+String(n)+ext]));
    }
  }
  return deck;
}

board.new_piece_is_tray = true;
deck_ancient    = build_normal_deck('ancient',            7, '.png');

board.new_piece_is_tray = false;
deck_mythos     = build_normal_deck('mythos',            66, '.jpg');
deck_gate       = build_normal_deck('gate',              48, '.jpg');

deck_downtown   = build_normal_deck('downtown',           6, '.jpg');
deck_easttown   = build_normal_deck('easttown',           7, '.jpg');
deck_french     = build_normal_deck('french-hill',        6, '.jpg');
deck_merchant   = build_normal_deck('merchant-district',  7, '.jpg');
deck_miskatonic = build_normal_deck('miskatonic',         6, '.jpg');
deck_southside  = build_normal_deck('southside',          6, '.jpg');
deck_northside  = build_normal_deck('northside',          6, '.jpg');
deck_rivertown  = build_normal_deck('rivertown',          6, '.jpg');
deck_uptown     = build_normal_deck('uptown',             6, '.jpg');

deck_allies     = build_normal_deck('allies',            12, '.jpg');

deck_skills     = build_normal_deck('skills', 9, '.jpg', 
  {0:2, 1:2, 2:2, 3:2, 4:2, 5:2, 6:2, 7:2, 8:2, 9:2}); // Dunwich = 1 each.

deck_common = build_normal_deck('common-items', 21, '.png',
  { 0:2,  1:2,  2:2,  3:2,  4:2,  5:2,  6:2,  7:2,  8:2, 9:2, 10:2, 11:2, 12:2, 13:2,
   14:2, 15:2, 16:2, 17:2, 18:2, 19:2, 20:2, 21:2}); // Dunwich 3 cards = 1 each.

deck_unique = build_normal_deck('unique-items', 25, '.jpg',
  { 4:2, // Cabala of Saoth
    5:2, // Cultes des Goules
    7:4, // Elder sign
    8:2, // Enchanted blade
   10:2, // Enchanted knife
   14:4, // Holy water
   16:2, // Nameless cults
   25:2, // The King in Yello
  });
  /** Dunwich
   * All 1 except 2 for Golden Sword of Y'ha-Talla
   */

deck_spells = build_normal_deck('spells', 10, '.jpg',
  { 0:2, // bind monster
    1:4, // dread curse of Az
    2:3, // Enchant weapon
    3:4, // Find gate
    4:4, // Flesh ward
    5:3, // Heal
    6:4, // Mists of Releh
    7:2, // Red sign of Shudde M'ell
    8:5, // Shriveling
    9:3, // voice of Ra
   10:6, // Whither
    });
    /** Dunwich
     * 2 Alchemal process
     * 1 Bless
     * 2 Call Friend
     * 3 Cloud memory
     * 3 Foresee
     * 2 Greater Banishment
     * 2 Lure Monster
     * 2 Vision Quest
     * 2 Summon Shantak
     * 2 Wrack
     */

// Special cards
retainers  = []; for(n=0;n<8;n++) retainers .push(board.add_piece(['Retainer.jpg']));
silvers    = []; for(n=0;n<8;n++) silvers   .push(board.add_piece(['Silver.jpg']));
bank_loans = []; for(n=0;n<8;n++) bank_loans.push(board.add_piece(['BankLoan.jpg']));
blessings  = []; for(n=0;n<8;n++) blessings .push(board.add_piece(['Blessing.jpg','Curse.jpg']));
deputy = [
  board.add_piece(['PatrolWagon.jpg']),
  board.add_piece(['DeputyRevolver.jpg']),
  board.add_piece(['DeputyOfArkham.jpg'])
]

board.new_piece_physical_shape = "inner_circle";
// Gate tokens: 2 of each, sometimes with different symbols, sometimes not.
gate_tokens = [board.add_piece(['GMBack.png', 'GMAnotherDimension.png']),
               board.add_piece(['GMBack.png', 'GMAnotherDimension.png']),
               //board.add_piece(['GMBack.png', 'GMAnotherTime.png',  'GMBack.png']),
               //board.add_piece(['GMBack.png', 'GMAnotherTime2.png']),
               board.add_piece(['GMBack.png', 'GMGreatHallOfCelano.png']),
               board.add_piece(['GMBack.png', 'GMGreatHallOfCelano.png']),
               //board.add_piece(['GMBack.png', 'GMLostCarcosa.png',  'GMBack.png']),
               //board.add_piece(['GMBack.png', 'GMLostCarcosa2.png']),
               board.add_piece(['GMBack.png', 'GMPlateauOfLeng.png']),
               board.add_piece(['GMBack.png', 'GMPlateauOfLeng.png']),
               board.add_piece(['GMBack.png', 'GMRlyeh.png']),
               board.add_piece(['GMBack.png', 'GMRlyeh.png']),
               board.add_piece(['GMBack.png', 'GMTheAbyss.png']),
               board.add_piece(['GMBack.png', 'GMTheAbyss.png']),
               board.add_piece(['GMBack.png', 'GMTheCityOfTheGreatRace.png']),
               board.add_piece(['GMBack.png', 'GMTheCityOfTheGreatRace.png']),
               board.add_piece(['GMBack.png', 'GMTheDreamlands.png']),
               board.add_piece(['GMBack.png', 'GMTheDreamlands.png']),
               //board.add_piece(['GMBack.png', 'GMTheUnderworld.png',  'GMBack.png']),
               //board.add_piece(['GMBack.png', 'GMTheUnderworld2.png']),
               //board.add_piece(['GMBack.png', 'GMUnknownKadath.png',  'GMBack.png']),
               //board.add_piece(['GMBack.png', 'GMUnknownKadath2.png']),
               board.add_piece(['GMBack.png', 'GMYuggoth.png']),
               board.add_piece(['GMBack.png', 'GMYuggoth.png']),
               ];

// dice
board.new_piece_physical_shape = 'rectangle';
dice = [];
for(n=0; n<10; n++) dice.push(board.add_piece(['6die1.png','6die2.png','6die3.png','6die4.png','6die5.png','6die6.png']));

// First player marker
first_player = board.add_piece(['FirstPlayer.gif']);

////////////////////////
// FUNCTIONALITY
////////////////////////
function select_from_board(pieces) {
  sps = board.client_selected_pieces[get_my_client_index()];
  sps.length = 0;
  for(var n in pieces) {
    p = pieces[n];
    if(Math.abs(p.x) <= board.background_image.width *0.5 && 
       Math.abs(p.y) <= board.background_image.height*0.5) sps.push(p);
  }
}
function select_players(delay)  {select_from_board(character_markers); board.clear_selected_after=delay;}
function select_gates(delay)    {select_from_board(gate_tokens);       board.clear_selected_after=delay;}
function select_monsters(delay) {select_from_board(monsters);          board.clear_selected_after=delay;}
function select_dice(delay)     {select_from_board(dice);              board.clear_selected_after=delay;}
function deselect(delay)        {board.client_selected_pieces[get_my_client_index()].length=0;}

function event_keydown(event_data, piece, piece_index) {
  switch(event_data.keyCode) {

    // M for monsters on board 
    case 77: select_from_board(monsters); board.clear_selected_after=3; break;
    
    // P for players on board
    case 80: select_from_board(character_markers); board.clear_selected_after=3; break;

    // G for gates on board
    case 71: select_from_board(gate_tokens); board.clear_selected_after=3; break;
  }
}


// setup the board with N players
function setup() {
  
  // Ancient ones pieces, x, y, shuffle, active_image
  board.collect_pieces(deck_ancient, 0, -1450, true, 0);
  board.collect_pieces(doom,      -220, -1700)
  
  // Mythos & Gate Decks
  board.collect_pieces(deck_mythos, -440, -1320, true, 0, 90);
  board.collect_pieces(deck_gate,    440, -1320, true, 0, 90);

  // Gate tokens & Monsters
  board.collect_pieces(gate_tokens, 750, -1300, true, 0);
  board.collect_pieces(monsters,    750, -1500, true, 0);

  // Locations
  var x0 = -1020;
  var y0 = -1070;
  var dx = 400;
  var dy = 265;
  var r  = 90;
  board.collect_pieces(deck_downtown,   x0+0*dx, y0,      true, 0, r);
  board.collect_pieces(deck_easttown,   x0+0*dx, y0+1*dy, true, 0, r);
  board.collect_pieces(deck_french,     x0+0*dx, y0+2*dy, true, 0, r);
  board.collect_pieces(deck_merchant,   x0+0*dx, y0+3*dy, true, 0, r);
  board.collect_pieces(deck_miskatonic, x0+0*dx, y0+4*dy, true, 0, r);
  board.collect_pieces(deck_southside,  x0-0*dx, y0+5*dy, true, 0, r);
  board.collect_pieces(deck_northside,  x0-0*dx, y0+6*dy, true, 0, r);
  board.collect_pieces(deck_rivertown,  x0-0*dx, y0+7*dy, true, 0, r);
  board.collect_pieces(deck_uptown,     x0-0*dx, y0+8*dy, true, 0, r);
  
  // Small decks
  var x0 = -600;
  var dx = -300;
  var y0 = 1330;
  var dy = 200;
  var r  = 90;
  
  // pieces,x,y,shuffle,active_image,r_piece,r_view,offset_x,offset_y
  board.collect_pieces(deck_allies, x0-0*dx, y0, true, 0, r);
  board.collect_pieces(deck_skills, x0-1*dx, y0, true, 0, r);
  board.collect_pieces(deck_common, x0-2*dx, y0, true, 0, r);
  board.collect_pieces(deck_unique, x0-3*dx, y0, true, 0, r);
  board.collect_pieces(deck_spells, x0-4*dx, y0, true, 0, r);
  
  board.collect_pieces(bank_loans,  x0-0*dx, y0+dy, true, 0, r);
  board.collect_pieces(retainers,   x0-1*dx, y0+dy, true, 0, r);
  board.collect_pieces(silvers,     x0-2*dx, y0+dy, true, 0, r);
  board.collect_pieces(deputy,      x0-3*dx, y0+dy, true, 0, r);
  board.collect_pieces(blessings,   x0-4*dx, y0+dy, true, 0, r);
  
  // Player cards
  board.collect_pieces(character_sheets,  -1020, -1500, true, 0);
  board.collect_pieces(character_markers, -1300, -1500, true, 0);

  // horror track
  terror.set_target(-665, 1095);

  // dice
  var a = 100;
  for(var i in dice) dice[i].set_target(-170 +(Math.random()-0.5)*a, 
                                        -150 +(Math.random()-0.5)*a, 
                                         720 *(Math.random()-0.5));

  // misc
  for(var i in clues)   clues  [i].set_target(-700 +(Math.random()-0.5)*a, 1750 +(Math.random()-0.5)*a, 720 *(Math.random()-0.5));
  for(var i in sanity)  sanity [i].set_target(-500 +(Math.random()-0.5)*a, 1750 +(Math.random()-0.5)*a, 720 *(Math.random()-0.5));
  for(var i in stamina) stamina[i].set_target(-300 +(Math.random()-0.5)*a, 1750 +(Math.random()-0.5)*a, 720 *(Math.random()-0.5));

  board.collect_pieces(sliders, -150, 1700, false, 0, 90);
  first_player.set_target(0, 1700);
  board.collect_pieces(doors,    150, 1700);
  board.collect_pieces(activity, 300, 1700);
  board.collect_pieces(explored, 450, 1700);
  board.collect_pieces(tens,     550, 1700, false, 0, 90);
  board.collect_pieces(fives,    620, 1700, false, 0, 90);
  board.collect_pieces(ones,     690, 1700, false, 0, 90);
}

// Start the show!
board.go();