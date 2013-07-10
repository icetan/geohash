var http = require('http'),
    crypto = require('crypto'),
    lastPosition;

function pad(n, p) {
  if (p == null) p = 2;
  return (new Array(p + 1 - n.toString().length)).join('0') + n;
}

function _geolocation(callback) {
  navigator.geolocation.getCurrentPosition(function(p) {
    callback(null, p);
  }, function(err) {
    console.error("Error when retrieving location", err);
    callback(err);
  });
}

function geolocation(callback) {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      callback("Sorry no GeoLocation support.");
  } else {
    if (lastPosition) {
      _geolocation(function(err, p) {
        lastPosition = p;
      });
      callback(null, lastPosition);
    } else {
      _geolocation(function(err, p) {
        lastPosition = p;
        callback(null, p);
      });
    }
  }
}

function hash(coords, dow) {
  var date = new Date,
      dateStr = date.getFullYear() +
        '-' + pad(date.getMonth()+1) +
        '-' + pad(date.getDate()) +
        '-' + dow,
      md5 = crypto.createHash('md5'),
      hex, hexFirst, hexLast;
  md5.update(dateStr);
  hex = md5.digest('hex');
  dec = [
    parseInt(hex.substr(0, hex.length/2), 16),
    parseInt(hex.substr(hex.length/2), 16)
  ];
  return {
    latitude: parseFloat((coords.latitude|0)+'.'+dec[0]),
    longitude: parseFloat((coords.longitude|0)+'.'+dec[1])
  };
}

function getDow(callback) {
  http.get({
    host: 'allow-any-origin.appspot.com',
    port: 80,
    path: '/http://www.google.com/ig/api?stock=.DJI'
  }, function(res) {
    var data = '';
    res.on('data', function(chunk) { data += chunk; });
    res.on('end', function() {
      var m = /<open data="(\d+(:?\.\d+)?)"\/>/.exec(data.toString());
      callback(null, parseFloat(m[1]));
    });
  }).on('error', callback);
}

function geohash(latlng, callback) {
  getDow(function(err, dow) {
    if (!callback) {
      callback = latlng;
      geolocation(function(err, p) {
        if (err != null) return console.error(err);
        callback(err, hash(p.coords, dow));
      });
    } else {
      callback(null, hash(latlng, dow));
    }
  });
}

module.exports = geohash;
geohash.geolocation = geolocation;

if (typeof window === 'undefined') {
  if (!module.parent)
    geohash({
      latitude: parseFloat(process.argv[2]),
      longitude: parseFloat(process.argv[3])
    }, function(err, latlng) {
      if (err != null) return console.error(err);
      console.log(JSON.stringify(latlng));
    });
} else {
  window['geohash'] = geohash;
}
