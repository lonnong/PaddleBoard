// Calls the Paddle Board Meetup group in Orlando
var meetupApiUrl = 'https://api.meetup.com/2/events?status=upcoming&text\
=coding+programming+ruby+python+html&desc=False&offset=0&photo-host=public&format=json&lat=28.5&page=100\
&lon=-81.97&key=6e4d7a3d216064112676735b781f3557&group_urlname=paddleboardorlando&sign=true'
// console.log(meetupApiUrl);

 // Checks if a substring `other` is found inside the string
String.prototype.contains = function(other) {
  return this.indexOf(other) !== -1;
};

/* Creates a markup on the map if the meetup location has a Venue Object
 */
var Fastner = function(venueObject, map) {
  var self = this;

  // Set latitude/longitude for the pin
  self.lat = venueObject.lat;
  self.lon = venueObject.lon;
  self.location = ko.computed(function() {
  // pseudo-model validation: if no lat/lon data, set location to null
  // otherwise, instantiate a google maps coordinate
    if (self.lat === 0 || self.lon === 0) {
      return null;
    } else {
      return new google.maps.LatLng(self.lat, self.lon);
    }
  });

  // load metadata
  self.id = venueObject.id;
  self.name = ko.observable(venueObject.name);
  self.address = ko.observable(venueObject.address_1);
  self.meetups = ko.observableArray([]);

  // initialize marker
  self.marker = (function(pin) {
    var marker;

    // validate that the pin has a location (see `Fastner` model)
    if (pin.location()) {
      marker = new google.maps.Marker({
        position: pin.location(),
        map: map,
      });
    } return marker;
  })(self);

  // returns HTML for a pin's meetups
  self.formattedMeetupList = function() {
    meetupSubstring = '<ul class="info-window-list">';
    self.meetups().forEach(function(meetup) {
      meetupSubstring += '<li>' + '<a href="' + meetup.url() + '">' +
                           meetup.name() + 
                         '</a>' + ' on ' + meetup.date() + '</li>';
    });
    meetupSubstring += '</ul>';
    return '<div class="info-window-content">' +
              '<span class="info-window-header">' + self.name() + '</span>' +
              '<p>' + self.address() + '</p>' +
              meetupSubstring +
              '</div>';
  };
};

/* Represents a Meetup event.
 * @constructor
 * @param {object} meetup - JSON-like meetup from the Meetup open_venue API
 */
var Meetup = function(meetup) {
  var self = this;

  // attach venue object
  self.venueObject = meetup.venue;

  // returns if the meetup has a venue that is listed
  self.hasVenue = ko.computed(function() {
    if (self.venueObject) {
      return true;
    } else {
      return false;
    }
  });

  self.id = ko.observable(meetup.id);
  console.log("gene be loox")
  console.log(self.id);
  // self.name = ko.observable(meetup.name.titleize());
  self.name = ko.observable(meetup.name);
  self.group = ko.observable(meetup.group.name);

  // converts date from milliseconds
  self.date = ko.computed(function() {
    var milliseconds = meetup.time;
    var date = new Date(milliseconds);
    return date.toLocaleDateString();
  });
  self.url = ko.observable(meetup.event_url);
};

/* Represents a Google Map object */
var GoogleMap = function(center, element) {
  var self = this;

  // styling elements from http://stackoverflow.com/
  var roadAtlasStyles = [
    {  
      "featureType": "poi",
      "stylers": [
        { "saturation": -100 }
      ]
    }
  ];

  var mapOptions = {
    zoom: 10,
    center: center,
    mapTypeControlOptions: {
      mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'usroadatlas']
    },

    // customize controls
    mapTypeControl: false,
    panControl: false,
    streetViewControl: false,
    zoomControl: false
  };

  // assign a google maps element
  map = new google.maps.Map(element, mapOptions);

  // apply custom map styling
  var styledMapOptions = {};
  var usRoadMapType = new google.maps.StyledMapType(roadAtlasStyles, styledMapOptions);
  map.mapTypes.set('usroadatlas', usRoadMapType);
  map.setMapTypeId('usroadatlas');

  return map;
};

/* Main application view model */
var AppViewModel = function() {
  var self = this;

  function initialize() {
    map = GoogleMap(center, mapCanvas);
    getMeetups(meetupApiUrl);
  }

  // Found Google Map
  if (typeof google !== 'object' || typeof google.maps !== 'object') {
    $('#search-summary').text("Could not load Google Maps API");
  }

  // initialize defaults
  var map,
      mapCanvas = $('#mapping')[0],
      center = new google.maps.LatLng(28.54, -81.37); // Orlando
  var infoWindow = new google.maps.InfoWindow();
  self.meetupList = ko.observableArray([]);
  self.pinList = ko.observableArray([]);
  self.numFastners = ko.observable(0);
  self.query = ko.observable('');
  self.search = function() {
  };

  // returns a filtered list of pins if name contains `self.query` data
  self.filteredFastnerList = ko.computed(function() {
    // Initialize map markers
    self.pinList().forEach(function(pin) {
      pin.marker.setMap(null);
    });

    // filter results where name contains `self.query`
    var results = ko.utils.arrayFilter(self.pinList(), function(pin) {
      return pin.name().toLowerCase().contains(self.query().toLowerCase());
    });
    // console.log(results);

    // go through results and set marker to visible
    results.forEach(function(pin) {
      pin.marker.setMap(map);
      // console.log(pin);
    });

    // update the number of pins (couldn't get `ko.computed` to work)
    self.numFastners(results.length);
    return results;
  });

  // triggered when a pin in `#list` is clicked or a marker is clicked
  /* Fetches from marker/infowindow data and animate markers
   * @param {object} pin - Fastner instance
   */
  self.selectFastner = function(pin) {
    // get and set html to info window content
    infoWindow.setContent(pin.formattedMeetupList());

    // open up the appropriate info window at the selected pin's marker
    infoWindow.open(map, pin.marker);

    // scroll the map to the marker's position
    map.panTo(pin.marker.position);

    // animate markers
    pin.marker.setAnimation(google.maps.Animation.BOUNCE);
    self.pinList().forEach(function(old_pin) {
      if (pin != old_pin) {
        old_pin.marker.setAnimation(null);
      }
    });
  };

  /* Fetches meetups via JSON-P from Meetup API
   * @params {string} url - Meetup API URL */
  function getMeetups(url) {
    var data;

    // execute JSON-P request
    $.ajax({
      type: "GET",
      url: url,
      timeout: 8000,
      contentType: "application/json",
      dataType: "jsonp",
      cache: false,

    // when done
    }).done(function(response) {
      console.log("Raw API data dump")
      console.log(response);
      // pull `results` array from JSON
      data = response.results;

      // loop through results and populate `meetupList`
      data.forEach(function(meetup) {
        console.log("looping threw meetup info");
        console.log(meetup);
        self.meetupList.push(new Meetup(meetup));
      });
      

      // run the `extractFastners` function to pull location data
      extractFastners();

    // if failed
    }).fail(function(response, status, error) {
      $('#search-summary').text('Meetup data could not load...');
    });
  }

  

  /* Fetches a pin from `pinList` by `id`
   * @param {int} id - id number
   */
  function getFastnerById(id) {
    var foundFastner = null;
    if (hasFastnerId(id)) {
      self.pinList().forEach(function(pin) {
        if (pin.id.toString() === id.toString()) {
          foundFastner = pin;
        }
      });
    }
    return foundFastner;
  }

  /* Checks if a specific pin by `id` already exists in `pinList`
   * @param {int} id - id number
   */
  function hasFastnerId(id) {
    var result = false;
    self.pinList().forEach(function(pin) {
      if (pin.id.toString() === id.toString()) {
        result = true;
      }
    });
    return result;
  }
/* Get all meetup locations and place in Fastner objects */
  function extractFastners() {
    self.meetupList().forEach(function(meetup){
      // Need a venue id to pull location
      if (meetup.hasVenue()) {
        var pin;
        var id = meetup.venueObject.id;
        if (hasFastnerId(id)) {
          // push the meetup object onto the pin's meetups
          pin = getFastnerById(id);
          pin.meetups.push(meetup);
        } else {
          // instantiate a new pin object
          pin = new Fastner(meetup.venueObject, map);

          // check if has valid location
          if (pin.location()) {
            // push it to the pin list
            self.pinList.push(pin);

            // and push the meetup object onto that new pin object
            pin.meetups.push(meetup);

            // add a marker callback
            google.maps.event.addListener(pin.marker, 'click', function () {
              self.selectFastner(pin);
            });
          }
        }
      }
    });
  }
  

  // initialization listener
  google.maps.event.addDomListener(window, 'load', initialize);
};

$(document).ready(function(){
   ko.applyBindings(new AppViewModel());
  });