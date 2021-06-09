/////////////////////////////
// MATH
/////////////////////////////

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
function get_cookie_value(key) {
    
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
        if(s[0] == document.title+'_'+key) {
            value = s[1];
            break;
        };
    }

    log('get_cookie_value()', key, value);
    return value;
}
exports.get_cookie_value = get_cookie_value;

// Saves a cookie
function save_cookie(key, value, expire_days) {
    if(expire_days==undefined) expire_days=28;

    // get the expiration date
    var d = new Date();
    d.setTime(d.getTime() + (expire_days*24*60*60*1000));
    
    // now write the cookie string
    document.cookie = document.title+"_"+key + '=' + value + '; expires=' + d.toUTCString() + '; SameSite=Lax';
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



// Sorts the supplied list of objects by the specified key.
function sort_objects_by_key(objects, key, decreasing) {

    // If increasing
    if(!decreasing) objects.sort(function(p1,p2) {return p1[key]-p2[key];});

    // If decreasing
    else            objects.sort(function(p1,p2) {return p2[key]-p1[key];});
    
    // All done.
    return objects
}
exports.sort_objects_by_key = sort_objects_by_key;

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
 * @param {[x,y]} v 
 * @param {float} r 
 * @returns rotated vector [x,y]
 */
function rotate_vector(v, r) {
    if(r == 0) return v;
    var cos = Math.cos(r);
    var sin = Math.sin(r);
    return [v[0]*cos-v[1]*sin, v[0]*sin+v[1]*cos]
}
exports.rotate_vector = rotate_vector;



//////////////////////
// NETCODE
//////////////////////

function create_blank_object() {
    var object = {
        'enabled':          false,
        'type':             0,
        'x':                0,
        'y':                0,
        'v':                0,
        'health':           0,
        'death_count':      0,
        'immediate':        false,
        'r':                0,
        'vr':               0,
        'invert_x':         false,
        'is_shooting':      false,        
    }
    return object;
}
exports.create_blank_object = create_blank_object;

// Get a packet for the server
function object_to_full_packet(object) {
        
    // Fill up the array
    var packet = [];

    // Every packet has object basic information
    if(object.is_enabled) packet.push(object.is_enabled()); 
    else                  packet.push(object.enabled);
    packet.push(object.type) 
    packet.push(object.x);   
    packet.push(object.y);   
    packet.push(object.v);            // Alien v_max or player's keyboard-determined speed
    packet.push(object.health);       //
    packet.push(object.death_count);  // used to determine if the other player should ignore the update (keeps aliens from reappearing)
    packet.push(object.immediate);    // 
    packet.push(object.r); 
    packet.push(object.vr);
    packet.push(object.invert_x);
    packet.push(object.is_shooting);

    // Reset immediate after packet
    object.immediate = false;

    return packet;
}
exports.object_to_full_packet = object_to_full_packet;

// Import a packet sent from the server
function full_packet_to_object(packet) {
    var n = 0;
    var object = {};

    // Data present in all full packets
    object['enabled']     = packet[n++];
    object['type']        = packet[n++];
    object['x']           = packet[n++];
    object['y']           = packet[n++];
    object['v']           = packet[n++]; // v is the keyboard speed of player or v_max of alien.
    object['health']      = packet[n++];
    object['death_count'] = packet[n++];
    object['immediate']   = packet[n++];
    object['r']           = packet[n++];
    object['vr']          = packet[n++];
    object['invert_x']    = packet[n++];
    object['is_shooting'] = packet[n++];
    
    // Send it back!
    return object
}
exports.full_packet_to_object = full_packet_to_object;


// Get a packet for the server
function object_to_alien_minipacket(object) {
    
    // If it has an is_enabled() function, use that
    if(object.is_enabled && !object.is_enabled()) return false;
    
    // Otherwise, use the enabled flag
    else if(!object.is_enabled && !object.enabled) return false;

    // Enabled = fill up the packet
    var packet = [];

    // Every packet has object basic information
    packet.push(object.x);   
    packet.push(object.y);  
    packet.push(object.death_count); 
    return packet;
}
exports.object_to_alien_minipacket = object_to_alien_minipacket;

// Import a packet sent from the server
function alien_minipacket_to_object(packet) {
    var n = 0;
    var object = {};

    // If the object is enabled, record this and the coordinates
    if(packet) {
        object['enabled']     = true;
        object['x']           = packet[n++];
        object['y']           = packet[n++];
        object['death_count'] = packet[n++];
    }
    // Othwerwise all that matters is that it's disabled.
    else object['enabled'] = false;
    
    return object
}
exports.alien_minipacket_to_object = alien_minipacket_to_object;

// Sends minipacket data to a full packet
function alien_minipacket_to_full_packet(minipacket, full_packet) {
    var full_object = full_packet_to_object(full_packet);
    
    // If the minipacket is not false, it's enabled and has x and y
    if(minipacket) {
        full_object.enabled = true;
        full_object.x = minipacket.x;
        full_object.y = minipacket.y;
        return object_to_full_packet(full_object);
    }

    // Otherwise, it's disabled
    full_object.enabled = false;
    return object_to_full_packet(full_object);
}
exports.alien_minipacket_to_full_packet = alien_minipacket_to_full_packet;

// Creates and returns a blank packet (right number of elements and reasonanble values.)
function create_blank_packet() {
    return object_to_full_packet(create_blank_object());
}
exports.create_blank_packet = create_blank_packet;