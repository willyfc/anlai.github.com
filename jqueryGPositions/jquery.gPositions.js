/*
	jQuery Map/Routing Control
	Written by : Alan Lai
				 College of Agricultural & Environmental Sciences Dean's Office
				 University of California, Davis
	Date: 6/23/2011
	
	Dependencies:
		jquery 1.5.1
	
	Description:
		Map control powered by Google Maps Javascript API v3.  This control allows
		you to specify multiple locations and place pins on them by clicking on
		a button on the side of the map.
		
		It can also support routing between two points if enabled.
		
	Usage:
		To use this control you will need a div for the location of where to put the map.
		And inside the div, divs with the coordinates in data attributes and having the class "coordinate"
*/

/* enum for defining mode */
var MapMode = { STANDARD: 0, ROUTING: 1, SELECTINGPOINT: 2 };

(function($) {

    // attach this new method to jQuery
    $.fn.extend({

        gPositions : function(options) {
		
			var markers = [];
			var alpha = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
			// required to use the direction/routing services
			var directionsService = new google.maps.DirectionsService();
			var directionDisplay;
			
			// set the default values
			var settings = $.extend({
				height: 	"300px;",
				width:		"800px;",
				latitude:	38.537061, 
				longitude:	-121.749174,
				zoom:		16,
				mode:		MapMode.STANDARD,
				loadAll:	false,	// default to not load all pins,
				displayDirections:	false,
				routeType:	google.maps.TravelMode.WALKING,
				mapType:	google.maps.MapTypeId.ROADMAP,
				debug: 		false
			}, options);
		
			return this.each(function(index,item){
			
				var $gpContainer = $(this);	// the map container
				// create the map object
				var gmap = initializeMap($gpContainer);
			
				// initialize the side information container
				initializeSideContainer($gpContainer, gmap);
			
				// attach events to the marker selctors
				initializeEvents($gpContainer, gmap);
			
				// set default coordinates
				defaultCoordinates($gpContainer, gmap);
			});
		
		
			/*****************************************************************
			Initialization functions
			*****************************************************************/
			// initializes the google maps object
			function initializeMap($gpContainer)
			{
				var latlng = new google.maps.LatLng(settings.latitude, settings.longitude);
				var options = { zoom: settings.zoom, center: latlng, mapTypeId: settings.mapType }
			
				var map = new google.maps.Map($gpContainer.find(".gp-map")[0], options);
			
				// insert the cross hair image
				if (settings.mode == MapMode.SELECTINGPOINT)
				{
					var crosshair = $("<div>").addClass("gp-crosshair");
					$gpContainer.find(".gp-map").append(crosshair);
				}
			
				return map;
			}
		
			/*
				Initialzes the side information container
			*/
			function initializeSideContainer($gpContainer, gmap)
			{
				var $sideContainer = $("<div>").addClass("gp-sidecontainer");
				$gpContainer.append($sideContainer);
			
				switch(settings.mode)
				{
					case MapMode.STANDARD:
					
						// put all the coordinates into the container
						$sideContainer.append($gpContainer.find(".gp-coordinate"));
					
						break;
					case MapMode.ROUTING:
					
						// put all the coordinates into the container
						$sideContainer.append($gpContainer.find(".gp-coordinate"));
					
						if(settings.displayDirections)
						{
							$gpContainer.append($("<div>").addClass("gp-directions"));
						}
					
						break;
					case MapMode.SELECTINGPOINT:
					
						// add the standard controls
						var $ctlList = $("<ul>");
						$sideContainer.append($ctlList);
											
						// add the debug controls
						if (settings.debug)
						{
							var $debug = $("<fieldset>").addClass("gp-debug").append($("<legend>").html("Debug Coordinates"));
							$sideContainer.append($debug);
							
							// add in the controls
							var $list = $("<ul>");
							$list.append($("<li>").html("Latitude:&nbsp;").append($("<span>").addClass("gp-lat-debug")));
							$list.append($("<li>").html("Longitude:&nbsp;").append($("<span>").addClass("gp-lng-debug")));
							
							$debug.append($list);
						}

						// create the search boxes
						var $search = $("<li>").html("Search Address: &nbsp");
						// create search box
						var $searchBox = $("<input>").addClass("gp-search-box");
						$searchBox.keyup(function(event){if(event.keyCode == 13){ $(this).siblings('input[type="button"]').click(); }});
						// create search button
						var $searchBtn = $("<input>").attr("type", "button").val("Search");
						$searchBtn.click(function(){ 
							var address = $(this).siblings(".gp-search-box").val(); 
							Search(gmap, address, $sideContainer);
						});
						$search.append($searchBox).append($searchBtn);
						
						$ctlList.append($search);
						$ctlList.append($("<input>").attr("type", "hidden").attr("name", "gp-lat").addClass("gp-lat"));
						$ctlList.append($("<input>").attr("type", "hidden").attr("name", "gp-lng").addClass("gp-lng"));
						
						break;
					default:
						alert("invalid mode has been selected");
						break;
				}
			
			}
		
			// attaches event handlers where needed
			function initializeEvents($gpContainer, gmap)
			{
			
				switch(settings.mode)
				{
					case MapMode.STANDARD:
					
						// event to add marker to map
						$gpContainer.find(".gp-coordinate").click(function(){
							MarkerHandler(gmap, $(this));
							AdjustMapView($gpContainer, gmap);
						});
					
						break;
						
					case MapMode.ROUTING:
						
						// event to add marker to map
						$gpContainer.find(".gp-coordinate").click(function(){
							MarkerHandler(gmap, $(this));
							AdjustMapViewRouting($gpContainer, gmap);
						});
						
						break;
					case MapMode.SELECTINGPOINT:
					
						var $side = $gpContainer.find(".gp-sidecontainer");
					
						var $lat = $side.find(".gp-lat");
						var $lng = $side.find(".gp-lng");

						var $latdebug = $side.find(".gp-lat-debug");
						var $lngdebug = $side.find(".gp-lng-debug");
					
						// add the listener
						google.maps.event.addListener(gmap, 'mouseup', function(event) {
						
							$lat.val(event.latLng.lat());
							$lng.val(event.latLng.lng());
					
							// display the information for debug
							if (settings.debug)
							{
								$latdebug.html(event.latLng.lat());
								$lngdebug.html(event.latLng.lng());
							}
				
						});
					
						break;
					default:
						alert("invalid mode has been selected");
						break;
				}
			
			}
		
			/*****************************************************************
			Modification Functions
			*****************************************************************/
			// determines whether to add a marker or remove
			function MarkerHandler(gmap, $selector)
			{
				if ($selector.hasClass("gp-selected"))
				{
					RemoveMarker($selector);
				}
				else
				{
					AddMarker(gmap, $selector);
				}
			}
		
			/*
				Creates the marker
				
				$selector: the div that holds the mapping information
				return: returns the gmid number
			*/
			function AddMarker(gmap, $selector)
			{
				$selector.addClass("gp-selected");
			
				var lat = $selector.data("lat");
				var lng = $selector.data("lng");
				var latlng = new google.maps.LatLng(lat, lng);
				
				var title = $selector.find(".gp-name").html();
				var description = $selector.find(".gp-description").html();
			
				var marker = new google.maps.Marker({
					position: latlng, 
					map: gmap, 
					animation: google.maps.Animation.DROP,
					title: title != undefined && title != "" ? title : "no title"
				});  
				
				// add the info window when the marker is clicked
				var infowindow = new google.maps.InfoWindow({
					content: description
				});

				google.maps.event.addListener(marker, 'click', function() {
					infowindow.open(gmap,marker);
				});
			
				// for routing we don't want to see this pin
				if (settings.mode == MapMode.ROUTING) 
				{
					marker.setMap(null);
				}
			
				markers.push(marker);
					
				$selector.data("gmid", marker.__gm_id);
			}
			
			function RemoveMarker($selector)
			{								
				$selector.removeClass("gp-selected");
				var gmid = $selector.data("gmid");
			
				// remove the marker from the map				
				var marker, index;
				
				for(i = 0; i < markers.length; i++)
				{
					if (markers[i].__gm_id == gmid)
					{
						index = i;
						//marker = markers[i];
						break;
					}
				}
			
				if (index != undefined)
				{
					//markers.remove(index);
					marker = markers.splice(index,1);
					marker[0].setMap(null);
				}
			}
			
			/*****************************************************************
			View Functions
			*****************************************************************/
			/*
				Adjusts view of map to deal with all pins that are on map
			*/
			function AdjustMapView($gpContainer, gmap)
			{			
				var bounds = new google.maps.LatLngBounds();
				
				var $selected = $gpContainer.find(".gp-selected");
				
				if ($selected.length > 1 && settings.mode == MapMode.ROUTING)
				{
					AdjustMapViewRouting($gpContainer, gmap);
				}
				else
				{
					if (directionDisplay != null) directionDisplay.setMap(null);
				}
				
				// just set the default zoom if all markers are removed
				if ($selected.length <= 1)
				{
					// center on single pin
					if ($selected.length == 1)
					{
						var lat = $selected.data("lat");
						var lng = $selected.data("lng");
						var latlng = new google.maps.LatLng(lat, lng);
						
						gmap.setCenter(latlng);
					}
					
					// always adjust zoom
					gmap.setZoom(settings.zoom);
				}
				else
				{
					// get the bounds on all markers
					$.each($selected, function(index,item){
						var lat = $(this).data("lat");
						var lng = $(this).data("lng");
					
						var latlng = new google.maps.LatLng(lat, lng);
						bounds.extend(latlng);
					});
					
					gmap.fitBounds(bounds);
				}
			}
		
			/*
				Adjusts the map to show routing information
			*/
			function AdjustMapViewRouting($gpContainer, gmap)
			{
				if (directionDisplay != null) directionDisplay.setMap(null);
			
				// add the directions overlay to the map
				directionDisplay = new google.maps.DirectionsRenderer();
				directionDisplay.setMap(gmap);
				
				// figure out the directions
				var src = markers[0];				// first marker
				var dest = markers[markers.length-1];	// last marker
				
				var wayPts = [];
				if (markers.length > 2)
				{		
					for(i = 1; i < markers.length-1; i++)
					{
						wayPts.push({location: markers[i].position, stopover: true});
					}
				}
				
				var request = {origin: src.position, destination: dest.position, waypoints: wayPts, travelMode: settings.routeType};
				
				directionsService.route(request, function(result, status)
					{				
						if (status == google.maps.DirectionsStatus.OK)
						{
							if (settings.displayDirections) {DisplayDirections($gpContainer, result)};
							directionDisplay.setDirections(result);
						}
					});
			}
		
			/*
				Outputs the directions list
			*/
			function DisplayDirections($gpContainer, results)
			{			
				var $directions = $gpContainer.find(".gp-directions");
				$directions.empty();
				var $list = $("<ul>");
				
				for(i = 0; i < markers.length; i++)
				{
					// split in the mark icon here too
					$list.append($("<li>").html(markers[i].title));
				}
				
				$directions.append($list);
			}
		
			/*****************************************************************
			Load Functions
			*****************************************************************/
			// load the default coordinates
			function defaultCoordinates($gpContainer, gmap)
			{
				var defaultcoord = $gpContainer.find(".gp-sidecontainer .gp-default");
				
				if (defaultcoord[0] != undefined)
				{
					AddMarker(gmap, $(defaultcoord[0]));
					AdjustMapView($gpContainer, gmap);
				}
			}
		
			function Search(gmap, address, $resultContainer)
			{		
				var geocoder = new google.maps.Geocoder();
				geocoder.geocode({'address': address}, function(results, status){
					if (status == google.maps.GeocoderStatus.OK)
					{
						gmap.setCenter(results[0].geometry.location);
						
						// set the location
						var $latInput = $resultContainer.find(".gp-lat");
						var $lngInput = $resultContainer.find(".gp-lng");
						
						$latInput.val(results[0].geometry.location.lat());
						$lngInput.val(results[0].geometry.location.lng());
						
						if (settings.debug)
						{
							var $latdebug = $resultContainer.find(".gp-lat-debug");
							var $lngdebug = $resultContainer.find(".gp-lng-debug");
							
							$latdebug.html(results[0].geometry.location.lat());
							$lngdebug.html(results[0].geometry.location.lng());
						}
						
					}
				});
			}
		
		
		

			
			
			function CreatePositionSelectingControls(gmap, $gpContainer)
			{
				var $list = $("<ul>").addClass("gp-selecting-controls");
				
				var $lat = $("<li>").html("Latitude:").append($("<input>").attr("name", "lat").attr("type", "hidden").addClass("gp-lat"));
				var $lng = $("<li>").html("Longitude:").append($("<input>").attr("name", "lng").attr("type", "hidden").addClass("gp-lng"));
				
				// display the information for debug
				if (settings.debug)
				{
					$lat.append($("<div>").addClass("gp-lat-debug"));
					$lng.append($("<div>").addClass("gp-lng-debug"));
				}
				
								
				
				
				$list.append($search);
				$list.append($lat);
				$list.append($lng);
				
				$gpContainer.append($list);
			}
			

		}
		
    }); // end of $.fn.extend
})(jQuery);