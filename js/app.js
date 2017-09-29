// locations array used to place markers on the map as well as filter them
var locations = [{
        name: "Second Best Coffee",
        category: "Coffee",
        lat: 38.974497,
        lng: -94.594346,
        address: "328 W 85th St, Kansas City, MO 64114",
        details: "The best coffee shop! Do not let the name fool you. This place is First Best. It also happens to be where my boyfriend works!"
    },
    {
        name: "Max's Burgers and Gyros",
        category: "Hamburger",
        lat: 38.9777884,
        lng: -94.5952326,
        address: "8240 Wornall Rd, Kansas City, MO 64114",
        details: "The first place I ate at after I bought my house. Max, the owner, is the sweetest man you could ever imagine to meet. On top of that, the cheeseburgers are out of this world!"
    },
    {
        name: "Waldo Pizza",
        category: "Pizza",
        lat: 38.99309390000001,
        lng: -94.5935853,
        address: "7433 Broadway St, Kansas City, MO 64114",
        details: "An outstanding pizza place that has the most choices that I have ever seen when it comes to toppings. Their pizzas are fresh and delicious every time."
    },
    {
        name: "Minit Mart",
        category: "Gas Station",
        lat: 38.9846973,
        lng: -94.59532510000001,
        address: "7900 Wornall Rd, Kansas City, MO 64114",
        details: "My go-to spot for gas, energy drinks, and snacks. Also a great spot for awkward encounters with fellow customers and weird conversations with the employees. Never a dull moment at this gas station!"
    },
    {
        name: "Trader Joes",
        category: "Grocery Store",
        lat: 38.9705105,
        lng: -94.6073047,
        address: "8600 Ward Pkwy, Kansas City, MO 64114",
        details: "My favorite grocery store. It is easy to get in and out quickly and they have everything I could ever need for my morning shakes."
    },
];

// generateWindowContent function used to create each individual locations infoWindow based on the locations array above
function generateWindowContent(location) {
    return ('<div class="info_content">' +
        '<h2>' + location.name + '</h2>' +
        '<h3>' + location.address + '</h3>' +
        '<p>' + location.details + '</p>' +
        '</div>'
    );
}

// declare map globally
var map;

// declare isMapLoaded varaible globally that's used to determine whether the map has finished loading or not
var isMapLoaded = false;

// makeHandler function that sets each markers infoWindow and Animation based on whether map is loaded or not
function makeHandler(marker, i) {
    return function() {
        if (!isMapLoaded) {
            return;
        }
        infoWindow.setContent(generateWindowContent(locations[i]));
        infoWindow.open(map, marker);
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            marker.setAnimation(null);
        }, 1000);
        viewModel.loadData(locations[i]);

    };
}

// initialize map function
function initMap() {
    var bounds = new google.maps.LatLngBounds();
    var mapOptions = {
        mapTypeId: 'roadmap',
        zoom: 14
    };

    // Display a map on the page
    map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
    map.setTilt(45);

    setMarkers(locations);

    function setMarkers() {
        // Loop through array of locations & place each one on the map
        for (i = 0; i < locations.length; i++) {
            var location = locations[i];
            var position = new google.maps.LatLng(location.lat, location.lng);
            bounds.extend(position);
            var marker = new google.maps.Marker({
                position: position,
                map: map,
                animation: google.maps.Animation.DROP,
                icon: './images/map-marker.png', //http://www.iconsdb.com/icons/preview/icon-sets/web-2-green/map-marker-2-xxl.png
                title: location.name,
                id: i
            });

            location.marker = marker;

            map.fitBounds(bounds);

            google.maps.event.addListener(marker, 'click', makeHandler(marker, i));

        }

        infoWindow = new google.maps.InfoWindow();

        // Override map zoom level once fitBounds function runs
        var boundsListener = google.maps.event.addListener((map), 'bounds_changed', function(event) {
            this.setZoom(14);
            google.maps.event.removeListener(boundsListener);
        });

    }

    // isMapLoaded variable declared true after google maps has been loaded
    isMapLoaded = true;

}

var ViewModel = function() {
    var self = this;

    self.locations = ko.observableArray(locations);
    self.query = ko.observable('');
    self.wikiLinks = ko.observableArray([]);
    self.visibleLists = ko.observable(false);

    // toggleShow triggered when the hamburger icon is clicked to hide/show the location results
    self.toggleShow = function() {
        self.visibleLists(!self.visibleLists());
    };

    /* this function, searchResults, is what allows the locations
     * to filter as the name is typed in the search box.
     */
    self.searchResults = ko.computed(function() {
        var q = self.query().toLowerCase();

        var filteredLocations = self.locations().filter(function(location) {
            return location.name.toLowerCase().indexOf(q) >= 0;
        });

        /* Once google maps has finished loading loop through the locations array
         * and set each marker's visibility to false, then loop through the filteredLocations
         * and set each marker's visibility to true if it meets the specifications of filteredLocations
         */
        if (isMapLoaded) {
            for (var i = 0; i < locations.length; i++) {
                locations[i].marker.setVisible(false);
            }
            for (i = 0; i < filteredLocations.length; i++) {
                filteredLocations[i].marker.setVisible(true);
            }
        }

        return filteredLocations;

    });

    //Clicking a location on the list displays unique information about the location, and animates its associated map marker
    self.clickAbility = function(location) {
        if (!isMapLoaded) {
            return;
        }
        infoWindow.setContent(generateWindowContent(location));
        infoWindow.open(map, location.marker);
        location.marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            location.marker.setAnimation(null);
        }, 1000);
        self.loadData(location);
    };

    self.loadData = function(location) {
        console.log(self.wikiLinks.length);

        // clear out old data before new request
        self.wikiLinks([]);

        var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + location.category +
            '&format=json&callback=wikiCallback';

        // if the wikipedia links fail to load after 8 seconds the user will get the message 'failed to get wikipedia resources'.
        var wikiRequestTimeout = setTimeout(function() {
            self.wikiLinks.push("failed to get wikipedia resources");
        }, 8000);

        $.ajax({
            url: wikiUrl,
            dataType: "jsonp",
            success: function(response) {
                self.wikiLinks([]);
                var articleList = response[1];
                for (var i = 0; i < articleList.length; i++) {
                    articleStr = articleList[i];
                    var url = 'http://en.wikipedia.org/wiki/' + articleStr;
                    self.wikiLinks.push('<a href="' + url + '">' + articleStr + '</a>');
                }
                clearTimeout(wikiRequestTimeout);
            }
        });
        return false;
    };
};

var viewModel = new ViewModel();
ko.applyBindings(viewModel);

// If Google Maps cannot load, display this alert
function mapError() {
    alert("Google Maps has failed to load. Please check your internet connection and try again.");
}
