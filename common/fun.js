/////////////////////////////
// MATH
/////////////////////////////
SQRT3 = Math.sqrt(3.0);


// Sum of array elements
function array_sum(a) {
    return a.reduce(function(x,y){
          return x + y
        }, 0);
}
exports.array_sum = array_sum;

// Average of array elements
function array_mean(a) {
    return array_sum(a) / a.length;
}
exports.array_mean = array_mean;

// Standard deviation about the mean
function array_mean_std(a) {
    
    var avg = array_mean(a);
    if(a.length < 2) return [avg, 0];
    
    var sum = 0;
    for(var n=0; n<a.length; n++) sum += (a[n]-avg)*(a[n]-avg);

    return [avg, Math.sqrt(sum/(a.length-1))];
}
exports.array_mean_std = array_mean_std;

/**
 * Returns the key associated with the specified value in object.
 * @param {*} object 
 * @param {*} value 
 * @returns 
 */
function get_key_by_value(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}
exports.get_key_by_value = get_key_by_value;


// Generates a date string for logs
function get_date_string() {

    // get the date
    var today = new Date();
    var ss = today.getSeconds();
    var mm = today.getMinutes();
    var hh = today.getHours();
    var dd = today.getDate();
    var MM = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();
    
    // format the string
    if(ss<10) ss='0'+ss;
    if(hh<10) hh='0'+hh
    if(dd<10) dd='0'+dd;
    if(mm<10) mm='0'+mm;
    if(MM<10) MM='0'+MM;
    
    // return formatted
    return yyyy+'-'+MM+'-'+dd+' '+hh+':'+mm+'.'+ss+' - '
}
exports.get_date_string = get_date_string;

// Compares two arrays or objects of more than one dimension
function identical(a1, a2, ignore) {
    
    // If they're both undefined, null, e.g.
    if(a1==a2) return true;
    
    // Easy out: wrong lengths. For objects, both will be undefined.
    if(a1.length != a2.length) return false;
    
    // Loop over the first array and sub arrays
    for(var i in a1) {

    // If i is in the ignore list, move on
    if(ignore && ignore.indexOf(i) >= 0) continue;

    // Don't forget to check for arrays in our arrays.
    else if(a1[i] instanceof Array  && a2[i] instanceof Array ||
            a1[i] instanceof Object && a2[i] instanceof Object) {
        if(!identical(a1[i], a2[i], ignore)) return false;
    }

    // One of the elements doesn't match
    else if(a1[i] != a2[i]) return false;
    }

    // Loop over the second array and sub arrays (might have different elements!)
    for(var i in a2) {

    // If i is in the ignore list, move on
    if(ignore && ignore.indexOf(i) >= 0) continue;

    // Don't forget to check for arrays in our arrays.
    else if(a1[i] instanceof Array  && a2[i] instanceof Array ||
            a1[i] instanceof Object && a2[i] instanceof Object) {
        if(!identical(a1[i], a2[i], ignore)) return false;
    }
    
    // One of the elements doesn't match
    else if(a1[i] != a2[i]) return false;
    }

    // Finally, no hiccups, return true.
    return true;
}
exports.identical = identical;

/**
 * Converts an integer into an integer basis vector {m,n} following a hexagonal spiral from 
 * {m:0,n:0}
 * @param {int} n step.
 */
function hex_spiral(n) {

  // return the origin to avoid explosions if n=0
  if(n==0) return {n:0, m:0}

  // get the index of the shell
  var s = Math.ceil(Math.sqrt(0.25+n/3.0)-0.5);

  // zero index of this shell
  var n0 = 6*s*(s-1)/2+1;

  // Declarations
  var x0 = null;
  var y0 = null;
  var dx0 = null;
  var dy0 = null;
  
  // depending which of the 6 legs we're on get the vectors
  var leg = Math.floor((n-n0)/s);
  switch(leg) {
    case 0: x0 =  s; y0 =  0; dx0 = -1;  dy0 =  1; break;
    case 1: x0 =  0; y0 =  s; dx0 = -1;  dy0 =  0; break;
    case 2: x0 = -s; y0 =  s; dx0 =  0;  dy0 = -1; break;
    case 3: x0 = -s; y0 =  0; dx0 =  1;  dy0 = -1; break;
    case 4: x0 =  0; y0 = -s; dx0 =  1;  dy0 =  0; break;
    case 5: x0 =  s; y0 = -s; dx0 =  0;  dy0 =  1; break;
  }

  // which element of the 6 legs we're on
  var i = n-n0-leg*s;

  // assemble the grid snap
  return {n:x0+i*dx0, m:y0+i*dy0};
}
exports.hex_spiral = hex_spiral;

// Returns a random integer from m to n
function random_integer(m,n) { 
    var y = Math.floor(Math.random()*(1+n-m))+m; 

    // exceedingly rare case
    if(y > n) y = n;

    return y;
}
exports.random_integer = random_integer;

// Returns a random element from the supplied array
function random_array_element(array) {
    return array[random_integer(0,array.length-1)];
}
exports.random_array_element = random_array_element;

// Converts supplied string to a "safe" one for html documents.
function html_encode(s)
{
    var el = document.createElement("div");
    el.innerText = el.textContent = s;
    s = el.innerHTML;
    return s;
}
exports.html_encode = html_encode;

// Logs events prepended by the date string
function log_date() {
    // prepend the date
    arguments[0] = get_date_string()+String(arguments[0]);
    
    // forward the arguments to the log.
    console.log.apply(null, arguments);
}
exports.log_date = log_date;
  
// Prints message if number is bad
function fix_bad_number(number, message, print_it) {
    
    // If it's a weird value, return a reasonable default.
    if(isNaN(number) || number == null || number == undefined) {
    if(print_it) log('BAD NUMBER:', number, message);
    return 0;
    }

    // Otherwise return the number
    return number;
}
exports.fix_bad_number = fix_bad_number;

// Converts arguments to strings and concatenates
function to_string() {
    var s = arguments[0];
    for(var n=1; n<arguments.length; n++) s = s + ' | ' + String(arguments[n]);
    return s
}
exports.to_string = to_string;

// Makes sure there is a '/' at the end of a non-zero-length path.
function finish_directory_path(p) {
    if(p.length && p[p.length-1] != '/') return p+'/';
    return p;
}
exports.finish_directory_path = finish_directory_path;

// Formatted log
var log = (function() {

    // start time static variable
    var t0 = (Date.now()*0.001).toFixed(1);

    // Actual function call
    return function(){
        // prepend the time
        arguments[0] = String((Date.now()*0.001-t0).toFixed(1)) + ':' + String(arguments[0]);
        
        // forward the arguments to the log.
        console.log.apply(this, arguments);
    }
})();
exports.log = log;

// Returns a state object containing everything but the 
// Character packets (players and aliens)
function get_state_header() {

    var header = {};
    for(var key in state) if(key != 'aliens' && key != 'players') 
    header[key] = state[key];

    return header;
}
exports.get_state_header = get_state_header;


// Returns a number fading from 1 to 0 from time t0 over the specified duration
// This one is quadratic initially and finally.
function fader_smooth(t0, duration) {
    if(!duration) return 0;

    // Get the unitless time
    var dt = (Date.now() - t0)/duration;

    // For times prior to zero, this thing's full blast  
    if(dt < 0) return 1.0;

    // After duration it's zero.
    else if(dt > 1) return 0.0;
    
    // Smooth fade in between
    else {
    var a = (1-dt)*(1+dt);
    return a*a*a;
    }
}
exports.fader_smooth = fader_smooth;

// Returns a number fading from 1 to 0 from time t0 over the specified duration
// This one is linear at first and ends quadratically. Milliseconds.
function fader_impulse(t0, duration) {
    if(!duration) return 0;

    // Get the unitless time
    var dt = (Date.now() - t0)/duration;

    // For times prior to zero, this thing's full blast  
    if(dt < 0) return 1.0;

    // After duration it's zero.
    else if(dt > 1) return 0.0;
    
    // Fade function in between
    else return (dt-1)*(dt-1);
}
exports.fader_impulse = fader_impulse;

// Linearly fade from 1 to 0.
function fader_linear(t0, duration) {
    if(!duration) return 0;

    // Get the unitless time
    var dt = (Date.now() - t0)/duration;

    // For times prior to zero, this thing's full blast  
    if(dt < 0) return 1.0;

    // After duration it's zero.
    else if(dt > 1) return 0.0;
    
    // Fade function in between
    else return 1-dt;
}
exports.fader_linear = fader_linear;

// Returns the cookie value or undefined
function load_cookie(key) { 
  key = encodeURIComponent(key);
  
  // get a list of the cookie elements
  var cs = document.cookie.split(';');

  // Default is empty string
  var value = '';

  // Loop over elements to find the key
  for(var i=0; i<cs.length; i++) {

      // split by "=" sign
      s = cs[i].split('=');

      // strip white space
      while (s[0].charAt(0)==' ') s[0] = s[0].substring(1);

      // If it's our key
      if(s[0] == 'Sankey_Flashcards_'+key) {
          value = decodeURIComponent(s[1]);
          break;
      };
  }

  return value;
}
exports.load_cookie = load_cookie;

// Saves a cookie
function save_cookie(key, value, expire_days) { 
  if(expire_days==undefined) expire_days=28;

  // Get rid of weird key characters
  key   = encodeURIComponent(key);
  value = encodeURIComponent(value);

  // get the expiration date
  var d = new Date();
  d.setTime(d.getTime() + (expire_days*24*60*60*1000));
  
  // now write the cookie string
  document.cookie = "Sankey_Flashcards_"+key + '=' + value + '; expires=' + d.toUTCString() + '; SameSite=Lax';
}
exports.save_cookie = save_cookie;

// Limits the vector length to l
function limit_vector_length(x,y,l) {
    
    // Current length squared
    var aa = x*x+y*y;

    // Limit
    if(aa > l*l) {

    // Save the expensive operation for overage
    var ai = 1.0/Math.sqrt(aa);

    // Impose the limit with the ratio l/a
    x = x*l*ai;
    y = y*l*ai
    }
    return [x,y]
}
exports.limit_vector_length = limit_vector_length;

// IN PLACE randomizes the order of the supplied array
function shuffle_array(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    var randomIndex = random_integer(0, currentIndex-1);
    currentIndex -= 1;

    // And swap it with the current element.
    var temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}
exports.shuffle_array = shuffle_array;

// In-place sorts the supplied list of objects by the specified key.
function sort_objects_by_key(objects, key, descending) {

    // If increasing
    if(!descending) objects.sort(function(p1,p2) {return p1[key]-p2[key];});

    // If descending
    else            objects.sort(function(p1,p2) {return p2[key]-p1[key];});
    
    // All done.
    return objects
}
exports.sort_objects_by_key = sort_objects_by_key;

// Gets a vector {x: , y:, r:,} randomly positioned within a disc of specified radius, and rotated randomly on +/-180 degrees
function get_random_location_disc(radius) {
  // Get distance from origin
  var d = Math.random()*radius;

  // Rotate it randomly
  var v = rotate_vector([d,0], Math.random()*360);

  return {x:v[0], y:v[1], r:180*(2*Math.random()-1)};
}
exports.get_random_location_disc = get_random_location_disc;





function get_luma_ox(ox) {
  if(typeof ox == 'string') return 1;
  rgb = ox_to_rgb(ox);
  return 0.2126*rgb[0] + 0.7152*rgb[1] + 0.0722*rgb[2];
}
exports.get_luma_ox = get_luma_ox;

// For converting rgb (values 0-1) to 0x format
function rgb_to_ox(r, g, b) {
    return Math.round(r*0xFF)*0x010000 + Math.round(g*0xFF)*0x000100 + Math.round(b*0xFF);
}
exports.rgb_to_ox = rgb_to_ox;

function ox_to_rgb(ox) {
    rx = ox >> 16;
    gx = (ox & (255<<8))>>8;
    bx = (ox & 255);
    return [rx/255, gx/255, bx/255] 
}
exports.ox_to_rgb = ox_to_rgb;

/**
 * Rotates the supplied vector v clockwise by radians r.
 * @param {array} v [x,y] vector
 * @param {float} r rotation (degrees)
 * @returns rotated vector [x,y]
 */
function rotate_vector(v, r) {
    if(!r) return v;
    r = 0.01745329251*r; // to radians
    var cos = Math.cos(r);
    var sin = Math.sin(r);
    return [v[0]*cos-v[1]*sin, v[0]*sin+v[1]*cos]
}
exports.rotate_vector = rotate_vector;


