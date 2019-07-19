/*
place object format:
{
    lat:12.34,
    long:12.34,
    speedMax:15,
    speedMin:10,
    direction:234
}
*/
var weather = {
  savedPlaces: {},
  incompleteCount: 0,

  callDarkSky: function(place, callback, keyIndex) {
    var key = getSecret('darkSky', 'keys', keyIndex);
    var url = `https://api.darksky.net/forecast/${key}/${place.lat},${
        place.long}?exclude=flags`;
    var that = this;
    $.ajax({url: url, method: 'GET'})
        .then(function(response) {
          // Store hourly weather data for this place.
          place.hourly = response.hourly.data;
          // Remember when we accessed this data.
          place.accessTime = new Date().time;
          // Save the data for this place in the savedPlaces object.
          that.savedPlaces[place.name] = place;
          // Decrease incomplete count and call callback if it is 0.
          if (!--that.incompleteCount) callback();
        })
        .catch(function(error) {
            console.log(error);
            // This key is used up, so we use the next one.
            that.callDarkSky(
                place, callback,
                (keyIndex + 1) % gibberish.darkSky.keys.length);
        });
  },
  // Takes places objects and makes api calls, putting responses in responses
  // object. Calls callback when responses object is full.
  getWeather: function(places, callback) {
    this.incompleteCount = places.length;
    for (var i = 0; i < places.length; ++i) {
      if (this.savedPlaces.hasOwnProperty(places[i].name)) {
        // We already have this place and time saved with wind data.
        places[i] = this.savedPlaces[places[i].name];
        // Decrease incomplete count and call callback if it is 0.
        if (!--this.incompleteCount) callback();
      } else
        // We don't have data, so we call dark sky to get it.
        this.callDarkSky(places[i], callback, gibberish.darkSky.i);
    }
  },

  // takes an array of place objects, a minimum wind speed, a maximum wind
  // speed, then renders all the places meeting criteria on the map
  topSpots: function(places, min, max, time) {
    console.log('Getting Weather');
    this.getWeather(places, function() {
      console.log('Got Weather');
      let bestPlaces = [];
      for (let i = 0; i < places.length; i++) {
        // Put current hourly data in speedMax and speedMin
        // Find the index of the hourly data after the time we want.
        var j = places[i].hourly.findIndex(e => e.time > time);
        if (--j < 0) j = 0;
        console.log(j);
        console.log(places[i].hourly);
        var current = places[i].hourly[j];
        places[i].speedMin = current.windSpeed;
        places[i].speedMax = current.windGust;
        places[i].windBearing = current.windBearing;
        // Add any places within wind criteria to a the bestPlaces array.
        if ((places[i].speedMax <= max && places[i].speedMin >= min) ||
            (wind.ignoreMaxWindSpeed && places[i].speedMin >= min)) {
          bestPlaces.push(places[i]);
        }
      }
      // Sort places such that highest minimum wind speed is first in list.
      bestPlaces.sort((a, b) => b.speedMin - a.speedMin);
      // Create map pins for all matching places.
      markPlaces(bestPlaces);
      // Call function to populate text list of places.
      createLocationList(bestPlaces);
    });
  }
};


// var parks =
// [{lat:34,long:45,speedMax:null,speedMin:null,direction:null},{lat:29,long:93,speedMax:null,speedMin:null,direction:null}];
