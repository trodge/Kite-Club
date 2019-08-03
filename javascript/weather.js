let weather = {
    refreshInterval: 10800000,  // max time to wait before checking weather again
    savedPlaces: {},
    incompleteCount: 0,

    callDarkSky: function (place, callback, retries, keyIndex) {
        let key = getSecret('darkSky', 'keys', keyIndex);
        let url = 'https://cors-anywhere.herokuapp.com/' +
            `https://api.darksky.net/forecast/${key}/${place.lat},${place.long}` +
            '?exclude=currently,minutely,daily,alerts,flags';
        let that = this;
        console.log('Looking up weather for ' + place.name + ' on dark sky');
        $.ajax({ url: url, method: 'GET' })
            .then(function (response) {
                // Store hourly weather data for this place.
                place.hourly = response.hourly.data;
                // Remember when we accessed this data.
                place.accessTime = new Date().getTime();
                // Remember where this data came from.
                place.source = 'darkSky';
                // Save the data for this place in the savedPlaces object.
                that.savedPlaces[place.name] = place;
                // Decrease incomplete count and call callback if it is 0.
                if (!--that.incompleteCount) callback();
            })
            .catch(function (error) {
                if (error.responseJSON &&
                    error.responseJSON.error === 'daily usage limit exceeded' &&
                    retries--) {
                    console.log(
                        'Usage limit exceeded on key ' + keyIndex + ', using next key');
                    // This key is used up, so we use the next one.
                    that.callDarkSky(
                        place, callback, retries,
                        (keyIndex + 1) % gibberish.darkSky.keys.length);
                } else
                    console.log(error);
            });
    },
    // Takes places objects and makes api calls, putting responses in responses
    // object. Calls callback when responses object is full.
    getWeather: function (places, callback) {
        this.incompleteCount = places.length;
        for (let i = 0; i < places.length; ++i) {
            if (this.savedPlaces.hasOwnProperty(places[i].name)) {
                // We already have this place and time saved with wind data.
                places[i] = this.savedPlaces[places[i].name];
                if (new Date().getTime() - places[i].accessTime > this.refreshInterval)
                    // Old data is too old, get new data for this place.
                    this.callDarkSky(
                        places[i], callback, gibberish.darkSky.keys.length,
                        gibberish.darkSky.i);
                // Decrease incomplete count and call callback if it is 0.
                if (!--this.incompleteCount) callback();
            } else
                // We don't have data, so we call dark sky to get it.
                this.callDarkSky(
                    places[i], callback, gibberish.darkSky.keys.length,
                    gibberish.darkSky.i);
        }
    },

    // takes an array of place objects, a minimum wind speed, a maximum wind
    // speed, then renders all the places meeting criteria on the map
    topSpots: function (places, min, max, time) {
        $('#mapResultsTag').text('Checking the weather...');
        let that = this;
        this.getWeather(places, function () {
            window.localStorage.setItem(
                'savedPlaces', JSON.stringify(that.savedPlaces));
            let bestPlaces = [];
            for (let i = 0; i < places.length; i++) {
                // Put current hourly data in speedMax and speedMin
                // Find the index of the hourly data after the time we want.
                let isDarkSky = places[i].source === 'darkSky';
                let j = places[i].hourly.findIndex(e => e.time > time);
                if (--j < 0) j = 0;
                let current = places[i].hourly[j];
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

weather.savedPlaces = JSON.parse(localStorage.getItem('savedPlaces'));
if (!weather.savedPlaces) weather.savedPlaces = {};


