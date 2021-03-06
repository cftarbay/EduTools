// CHM Data Viewer-related Javascript functions
//
// Load and view data files related to Clinched Highway Mapping (CHM)
// related academic data sets.
//
// Author: Jim Teresco, Siena College, The College of Saint Rose
//
// Code developed based on examples from 
// http://cmap.m-plex.com/tools/wptedit/wptedit.html
// http://www.alecjacobson.com/weblog/?p=1645
//
// Modification History:
//
// 2011-06-20 JDT  Initial implementation
// 2011-06-21 JDT  Added .gra support and checkbox for hidden marker display
// 2011-06-23 JDT  Added .nmp file support (near-miss points)
// 2011-08-23 JDT  Added .pth file support (path)
// 2011-08-31 JDT  Added tabular graph data display
// 2013-08-14 JDT  Completed conversion to Google Maps API V3
// 2013-08-15 JDT  Added custom icon for intersections
// 2013-12-08 JDT  Fixed to handle DOS-style CRLF in uploaded files
// 2013-12-25 JDT  Click on GRA, PTH point label in table recenters map
// 2014-11-17 JDT  Added .wpl file support (waypoint list)
// 2015-09-27 JDT  Updated for Draft Extreme Points Search Demo
//
// $Id: chmviewerfunc3.js 2535 2015-01-28 18:46:22Z terescoj $
//

// global variable to hold the map, which will be assigned a google.maps.Map reference
var map;

// array of waypoints displayed
var waypoints = new Array();
// the markers at those waypoints
var markers = new Array();
// the info displayed when markers are clicked
var markerinfo = new Array();
// array of google.maps.LatLng representing the waypoint coordinates
var polypoints = new Array();
// array of connections on map as google.maps.Polyline overlays
var connections = new Array();
// array of graph edges (for graph data)
var graphEdges = new Array();
// boolean to determine if graph edges should be generated automatically
var genEdges = false;

var infowindow = new google.maps.InfoWindow();

// some map options, from http://cmap.m-plex.com/hb/maptypes.js by Timothy Reichard
/*
var MapnikOptions = { alt: "Show Mapnik road map tiles from OpenStreetMap.org",
		            getTileUrl: getMapnikTileURL,
		            maxZoom: 18,
		            minZoom: 0,
		            name: "Mapnik",
		            opacity: 1,
		            tileSize: new google.maps.Size(256, 256)
		          };

function getMapnikTileURL(point, zoom)
{
    return 'http://tile.openstreetmap.org/' + zoom + '/' + point.x + '/' + point.y + '.png';
}

var MQOpenMapOptions = { alt: "Show Mapquest Open Map road map tiles based on OpenStreetMap.org data",
			       getTileUrl: getMQOpenMapTileURL,
			       maxZoom: 18,
			       minZoom: 0,
			       name: "MQOpenMap",
			       opacity: 1,
			       tileSize: new google.maps.Size(256, 256)
			     };

function getMQOpenMapTileURL(point, zoom)
{
    return 'http://cmap.m-plex.com/hb/ymaptile.php?t=m&s=mq&x=' + point.x + '&y=' + point.y + '&z=' + zoom;
}



var MQOpenSatOptions = { alt: "Show Mapquest Open Map satellite imagery tiles based on OpenStreetMap.org data",
			       getTileUrl: getMQOpenSatTileURL,
			       maxZoom: 18,
			       minZoom: 0,
			       name: "MQOpenSat",
			       opacity: 1,
			       tileSize: new google.maps.Size(256, 256)
			     };

function getMQOpenSatTileURL(point, zoom)
{
    return 'http://cmap.m-plex.com/hb/ymaptile.php?t=s&s=mq&x=' + point.x + '&y=' + point.y + '&z=' + zoom;
}
*/


var intersectionimage = {
    url: 'smallintersection.png',
    // This marker is 16x16
    size: new google.maps.Size(16, 16),
    // The origin for this image is 0,0.
    origin: new google.maps.Point(0,0),
    // The anchor for this image is the center of the intersection
    anchor: new google.maps.Point(8, 8)
  };
  
  function onAlgorithmChange() {
    var newVal = $('#diffAlgorithm').val();
    if (newVal == "1") {
        document.getElementById('connectionTable').scrollIntoView();
    } else {
        document.getElementById('edgeTable').scrollIntoView();
    }
    $('.gratable').find('tr').attr('style', '');
  }

// loadmap constructs and sets up the initial map
function loadmap() {
    //var typeMQOpenMap = new google.maps.ImageMapType(MQOpenMapOptions);
    //var typeMQOpenSat = new google.maps.ImageMapType(MQOpenSatOptions);
    //var typeMapnik = new google.maps.ImageMapType(MapnikOptions);

    //var maptypelist = ['MQOpenMap', 'MQOpenSat', 'Mapnik', google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID, google.maps.MapTypeId.TERRAIN];
    //var maptypecontroloptions = {mapTypeIds: maptypelist, position: google.maps.TOP_RIGHT, style: google.maps.MapTypeControlStyle.DROPDOWN_MENU};
    //var mapopt = {center: new google.maps.LatLng(42.664529, -73.786470), zoom: 12, mapTypeId: 'Mapnik', mapTypeControl: true, mapTypeControlOptions: maptypecontroloptions, streetViewControl: true, disableDefaultUI: true, panControl: true, zoomControl: true, scaleControl: true, overviewMapControl: true, keyboardShortcuts: true, disableDoubleClickZoom: false};
    // coordinates are Albertus Hall room 400-2 at The College of Saint Rose
    var mapopt = {center: new google.maps.LatLng(42.664529, -73.786470), zoom: 16};

    map = new google.maps.Map(document.getElementById("map"), mapopt);

    document.getElementById('showHidden').checked=false;
    //var showHidden = document.getElementById('showHidden').checked;
    //DBG.write("loadmap: showHidden is " + showHidden);

    // check for a load query string parameter
    var qs = location.search.substring(1);
    //DBG.write("qs: " + qs);
    var qsitems = qs.split('&');
    for (var i = 0; i < qsitems.length; i++) {
	//DBG.write("qsitems[" + i + "] = " + qsitems[i]);
	var qsitem = qsitems[i].split('=');
	//DBG.write("qsitem[0] = " + qsitem[0]);
	if (qsitem[0] == "load") {
	    var request = new XMLHttpRequest();
	    //DBG.write("qsitem[1] = " + qsitem[1]);
	    document.getElementById('filename').innerHTML = qsitem[1];
	    request.open("GET", qsitem[1], false);
	    request.setRequestHeader("User-Agent", navigator.userAgent);
	    request.send(null);
	    if (request.status == 200) {
		processContents(request.responseText);
	    }
	}
    }
}

// when a file is selected, this will be called
function startRead() {
    // first, retrieve the selected file (as a File object)
    var file = document.getElementById('file').files[0];
    if (file) {
	document.getElementById('filename').innerHTML = file.name;
	if ((file.name.indexOf(".wpt") == -1) &&
	    (file.name.indexOf(".pth") == -1) &&
	    (file.name.indexOf(".nmp") == -1) &&
	    (file.name.indexOf(".gra") == -1) &&
	    (file.name.indexOf(".wpl") == -1)) {
	    document.getElementById('pointbox').innerHTML = "<b>Unrecognized file type!</b>";
	    return;
	}
	document.getElementById('pointbox').innerHTML = 
	    "Loading... (" + file.size + " bytes)";
	var reader;
	try {
	    reader = new FileReader();
	}
	catch(e) {
	    document.getElementById('pointbox').innerHTML = 
		"<b>Error: unable to access file (Perhaps no browser support?  Try recent Firefox or Chrome releases.).</b>";
	    return;
	}
	reader.readAsText(file, "UTF-8");
	reader.onload = fileLoaded;
	//reader.onerror = fileLoadError;
    }
}


// when the FileReader created in startRead has finished, this will be called
// to process the contents of the file
function fileLoaded(event) {

    // file done loading, read the contents
    processContents(event.target.result);
}

// process the contents of a String which came from a file or elsewhere
function processContents(fileContents) {

    // place the contents into the file contents area (will improve later)
    document.getElementById('pointbox').innerHTML = "<pre>" + fileContents + "</pre>";

    var pointboxContents = "";

    // parse the file and process as appropriate
    var fileName = document.getElementById('filename').innerHTML;
    if (fileName.indexOf(".wpt") >= 0) {
	document.getElementById('filename').innerHTML = fileName + " (Waypoint File)";
	pointboxContents = parseWPTContents(fileContents);
    }
    else if (fileName.indexOf(".pth") >= 0) {
	document.getElementById('filename').innerHTML = fileName + " (Waypoint Path File)";
	pointboxContents = parsePTHContents(fileContents);
    }
    else if (fileName.indexOf(".nmp") >= 0) {
	document.getElementById('filename').innerHTML = fileName + " (Near-Miss Point File)";
	pointboxContents = parseNMPContents(fileContents);
    }
    else if (fileName.indexOf(".wpl") >= 0) {
	document.getElementById('filename').innerHTML = fileName + " (Waypoint List File)";
	pointboxContents = parseWPLContents(fileContents);
    }
    else if (fileName.indexOf(".gra") >= 0) {
	document.getElementById('filename').innerHTML = fileName + " (Graph File)";
	pointboxContents = parseGRAContents(fileContents);
    }
    
    document.getElementById('pointbox').innerHTML = pointboxContents;
    updateMap();

}

// in case we get an error from the FileReader
function errorHandler(evt) {
    
    if (evt.target.error.code == evt.target.error.NOT_READABLE_ERR) {
	// The file could not be read
	document.getElementById('filecontents').innerHTML = "Error reading file...";
    }
}

// parse the contents of a .gra file
//
// First line specifies the number of vertices, numV, and the number
// of edges, numE
// Next numV lines are a waypoint name (a String) followed by two
// floating point numbers specifying the latitude and longitude
// Next numE lines are vertex numbers (based on order in the file)
// that are connected by an edge followed by a String listing the
// highway names that connect those points
function parseGRAContents(fileContents) {

    var lines = fileContents.replace(/\r\n/g,"\n").split('\n');
    var counts = lines[0].split(' ');
    var numV = parseInt(counts[0]);
    var numE = parseInt(counts[1]);
    var sideInfo = '<p style="font-size:12pt">' + numV + " waypoints, " + numE + " connections.</p>";
    $("#status").after(sideInfo);
    
    var vTable = '<table id="edgeTable" class="gratable"><thead><tr><th colspan="3">Waypoints</th></tr><tr><th>#</th><th>Coordinates</th><th>Waypoint Name</th></tr></thead><tbody>';

    waypoints = new Array(numV);
    for (var i = 0; i < numV; i++) {
	var vertexInfo = lines[i+1].split(' ');
	waypoints[i] = new Waypoint(vertexInfo[0], vertexInfo[1], vertexInfo[2], "", "");
	vTable += '<tr id="waypoint' + i + '"><td>' + i + 
	    '</td><td>(' + parseFloat(vertexInfo[1]).toFixed(3) + ',' +
	    parseFloat(vertexInfo[2]).toFixed(3) + ')</td><td>'
	    + "<a onclick=\"javascript:LabelClick(" + i + ",'"
	    + waypoints[i].label + "\',"
	    + waypoints[i].lat + "," + waypoints[i].lon + ",0);\">"
	    + waypoints[i].label + "</a></td></tr>"
    }
    vTable += '</tbody></table>';

    var eTable = '<table id="connectionTable" class="gratable"><thead><tr><th colspan="3">Connections</th></tr><tr><th>#</th><th>Route Name(s)</th><th>Endpoints</th></tr></thead><tbody>';
    graphEdges = new Array(numE);
    for (var i = 0; i < numE; i++) {
	var edgeInfo = lines[i+numV+1].split(' ');
	graphEdges[i] = new GraphEdge(edgeInfo[0], edgeInfo[1], edgeInfo[2]);
	eTable += '<tr id="graphEdge' + i + '"><td>' + i + '</td><td>' + edgeInfo[2] + '</td><td>'
	    + edgeInfo[0] + ':&nbsp;' + waypoints[graphEdges[i].v1].label + 
	    ' &harr; ' + edgeInfo[1] + ':&nbsp;' 
	    + waypoints[graphEdges[i].v2].label + '</td></tr>';
    }
    eTable += '</tbody></table>';
    genEdges = false;
    return vTable + '<p />' + eTable;
}

// parse the contents of a .wpt file
//
// Consists of a series of lines each containing a waypoint name
// and an OSM URL for that point's location:
//
/* 
YT1_S http://www.openstreetmap.org/?lat=60.684924&lon=-135.059652
MilCanRd http://www.openstreetmap.org/?lat=60.697199&lon=-135.047250
+5 http://www.openstreetmap.org/?lat=60.705383&lon=-135.054932
4thAve http://www.openstreetmap.org/?lat=60.712623&lon=-135.050619
*/
function parseWPTContents(fileContents) {

    var lines = fileContents.replace(/\r\n/g,"\n").split('\n');
    graphEdges = new Array();
    waypoints = new Array();
    for (var i = 0; i < lines.length; i++) {
	if (lines[i].length > 0) {
	    waypoints[waypoints.length] = WPTLine2Waypoint(lines[i]);
	}
    }
    genEdges = true;
    return "<h2>Raw file contents:</h2><pre>" + fileContents + "</pre>";
}

// parse the contents of a .pth file
//
// Consists of a series of lines each containing a waypoint name and a
// latitude and a longitude, and a route name, all space-separated, or
// a line containing a waypoint name followed by a lat,lng pair in
// parens, followed by a route name
//
/* 
START YT1_S 60.684924 135.059652
YT2 MilCanRd 60.697199 135.047250
YT2 +5 60.705383 135.054932
YT2 4thAve 60.712623 135.050619

or

START YT1_S (60.684924,135.059652)
YT2 MilCanRd (60.697199,135.047250)
YT2 +5 (60.705383,135.054932)
YT2 4thAve (60.712623,135.050619)

*/
function parsePTHContents(fileContents) {

    var table = '<table class="pthtable"><thead><tr><th>Route</th><th>To Point</th><th>Seg.<br>Miles</th><th>Cumul.<br>Miles</th></tr></thead><tbody>';
    var lines = fileContents.replace(/\r\n/g,"\n").split('\n');
    graphEdges = new Array();
    waypoints = new Array();
    var totalMiles = 0.0;
    var segmentMiles = 0.0;
    for (var i = 0; i < lines.length; i++) {
	if (lines[i].length > 0) {
	    waypoints[waypoints.length] = PTHLine2Waypoint(lines[i]);
	    if (waypoints.length > 1) { // make sure we are not at the first
		segmentMiles = Mileage(waypoints[waypoints.length-2].lat,
				       waypoints[waypoints.length-2].lon,
				       waypoints[waypoints.length-1].lat,
				       waypoints[waypoints.length-1].lon);
		totalMiles += segmentMiles;
	    }
	    table += '<tr><td>' + waypoints[waypoints.length-1].elabel +
		"</td><td><a onclick=\"javascript:LabelClick(" + 0 + ",\'"
	        + waypoints[waypoints.length-1].label + "\',"
	        + waypoints[waypoints.length-1].lat + "," + waypoints[waypoints.length-1].lon +
		",0);\">" + waypoints[waypoints.length-1].label +
		'</a></td><td style="text-align:right">' + segmentMiles.toFixed(2) +
		'</td><td style="text-align:right">' + totalMiles.toFixed(2) +
		'</td></tr>';
	}
    }
    table += '</tbody></table>';
    genEdges = true;
    return table;
}

// parse the contents of a .nmp file
//
// Consists of a series of lines, each containing a waypoint name
// followed by two floating point numbers representing the point's
// latitude and longitude
//
// Entries are paired as "near-miss" points, and a graph edge is
// added between each pair for viewing.
//
function parseNMPContents(fileContents) {

    var table = '<table class="nmptable"><thead /><tbody>';
    // all lines describe waypoints
    var lines = fileContents.replace(/\r\n/g,"\n").split('\n');
    waypoints = new Array();
    for (var i = 0; i < lines.length; i++) {
	if (lines[i].length > 0) {
	    var xline = lines[i].split(' ');
	    if (xline.length == 3) {
		waypoints[waypoints.length] = new Waypoint(xline[0], xline[1], xline[2], "", "");
	    }
	}
    }
    // graph edges between pairs, will be drawn as connections
    var numE = waypoints.length/2;
    graphEdges = new Array(numE);
    for (var i = 0; i < numE; i++) {
	// add the edge
	graphEdges[i] = new GraphEdge(2*i, 2*i+1, "");

	// add an entry to the table to be drawn in the pointbox
	var miles = Mileage(waypoints[2*i].lat, waypoints[2*i].lon, waypoints[2*i+1].lat, waypoints[2*i+1].lon).toFixed(4);
	var feet = Feet(waypoints[2*i].lat, waypoints[2*i].lon, waypoints[2*i+1].lat, waypoints[2*i+1].lon).toFixed(2);
	table += "<tr><td><table class=\"nmptable2\"><thead /><tbody><tr><td>"
	    + "<a onclick=\"javascript:LabelClick(" + 2*i + ",\'"
	    + waypoints[2*i].label + "\',"
	    + waypoints[2*i].lat + "," + waypoints[2*i].lon + ",0);\">"
	    + waypoints[2*i].label + "</a></td><td>("
	    + waypoints[2*i].lat + ","
	    + waypoints[2*i].lon + ")</td></tr><tr><td>"
	    + "<a onclick=\"javascript:LabelClick(" + 2*i+1 + ",\'"
	    + waypoints[2*i+1].label + "\',"
	    + waypoints[2*i+1].lat + "," + waypoints[2*i+1].lon + ",0);\">"
	    + waypoints[2*i+1].label + "</a></td><td>("
	    + waypoints[2*i+1].lat + ","
	    + waypoints[2*i+1].lon + ")</td></tr>"
	    + "</tbody></table></td><td>"
	    + miles  + " mi/"
	    + feet + " ft</td></tr>";
    }

    table += "</tbody></table>";
    genEdges = false;
    return table;
}

// parse the contents of a .wpl file
//
// Consists of a series of lines, each containing a waypoint name
// followed by two floating point numbers representing the point's
// latitude and longitude
//
function parseWPLContents(fileContents) {

    var table = '<table class="nmptable"><thead /><tbody>';
    // all lines describe waypoints
    var lines = fileContents.replace(/\r\n/g,"\n").split('\n');
    waypoints = new Array();
    for (var i = 0; i < lines.length; i++) {
	if (lines[i].length > 0) {
	    var xline = lines[i].split(' ');
	    if (xline.length == 3) {
		waypoints[waypoints.length] = new Waypoint(xline[0], xline[1], xline[2], "", "");
	    }
	}
    }
    // no edges here
    graphEdges = new Array();
    genEdges = false;
    return "<h2>Raw file contents:</h2><pre>" + fileContents + "</pre>";
}

// construct a new Waypoint object (based on similar function by Tim Reichard)
function Waypoint (label, lat, lon, errors, elabel) {
    this.label = label;
    this.lat = parseFloat(lat).toFixed(6);
    this.lon = parseFloat(lon).toFixed(6);
    this.visible = true;
    if (label.indexOf("+") >= 0) {
	this.visible = false;
    }
    this.errors = 0;
    this.elabel = elabel;
    return this;
}

function CopyWaypoint(wpt) {
    
    return new Waypoint(wpt.label, wpt.lat, wpt.lon, wpt.errors, wpt.elabel);
}

function WPTLine2Waypoint(line) {
    
    // remove extraneous spaces in the line
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');
    
    var xline = line.split(' ');
    if (xline.length < 2) {
	return Waypoint('bad-line', 0, 0);
    }
    var label = xline[0];
    var url = xline[1];
    var latlon = Url2LatLon(url);
    return new Waypoint(label, latlon[0], latlon[1], 0, "");
}

// convert an openstreetmap URL to a latitude/longitude
function Url2LatLon(url) {

    var latlon = new Array(0., 0.);
    var floatpattern = '([-+]?[0-9]*\.?[0-9]+)';
    var latpattern = 'lat=' + floatpattern;
    var lonpattern = 'lon=' + floatpattern;

    //search for lat
    var matches = url.match(latpattern);
    if (matches != null) {
	latlon[0] = parseFloat(matches[1]).toFixed(6);
    }
    
    //search for lon
    matches = url.match(lonpattern);
    if (matches != null) {
	latlon[1] = parseFloat(matches[1]).toFixed(6);
    }

    return latlon;
}

function PTHLine2Waypoint(line) {
    
    // remove any extraneous spaces in the line
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');

    var xline = line.split(' ');
    // check for and convert a (lat,lng) format
    if ((xline.length == 3) &&
	(xline[2].charAt(0) == '(') &&
	(xline[2].indexOf(',') > 0) &&
	(xline[2].charAt(xline[2].length-1) == ')')) {
	newlatlng = xline[2].replace('(', '');
	newlatlng = newlatlng.replace(',', ' ');
	newlatlng = newlatlng.replace(')', '');
	return PTHLine2Waypoint(xline[0] + " " + xline[1] + " " + newlatlng);
    }
    if (xline.length < 4) {
	return Waypoint('bad-line', 0, 0);
    }
    return new Waypoint(xline[1], xline[2], xline[3], 0, xline[0]);
}


function GraphEdge(v1, v2, label) {

    this.v1 = parseInt(v1);
    this.v2 = parseInt(v2);
    this.label = label;
    return this;
}

// update the map to the current set of waypoints and connections
function updateMap()
{
    // remove any existing google.maps.Polyline connections shown
    for (var i = 0; i < connections.length; i++) {
	connections[i].setMap(null);
    }
    connections = new Array();

    var minlat = 999;
    var maxlat = -999;
    var minlon = 999;
    var maxlon = -999;

    polypoints = new Array();
    for (var i = 0; i < markers.length; i++) {
	markers[i].setMap(null);
    }

    //var showHidden = document.getElementById('showHidden').checked;
    //DBG.write("updateMap: showHidden is " + showHidden);

    markers = new Array();
    markerinfo = new Array();
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0; i < waypoints.length; i++) {
	minlat = Math.min(minlat, waypoints[i].lat);
	maxlat = Math.max(maxlat, waypoints[i].lat);
	minlon = Math.min(minlon, waypoints[i].lon);
	maxlon = Math.max(maxlon, waypoints[i].lon);
	
	polypoints[i] = new google.maps.LatLng(waypoints[i].lat, waypoints[i].lon);
	
	markerinfo[i] = MarkerInfo(i, waypoints[i]);
	markers[i] = new google.maps.Marker({
	    position: polypoints[i],
	    map: map,
	    title: waypoints[i].label,
	    icon: intersectionimage
	});
	if (/*showHidden ||*/ waypoints[i].visible) {
	    AddMarker(markers[i], markerinfo[i], i);
	}
	bounds.extend(polypoints[i]);
    }
    
    var midlat = (minlat + maxlat)/2;
    var midlon = (minlon + maxlon)/2;

    var nsdist = Mileage(minlat, midlon, maxlat, midlon);
    var ewdist = Mileage(midlat, minlon, midlat, maxlon);
    var maxdist = Math.max(nsdist, ewdist);
  
    //var zoom = 17 - (12 + Math.floor(Math.log(maxdist/800)/Math.log(2.0)));
    //zoom = Math.max(zoom, 0);
    //zoom = Math.min(zoom, 17);
    //map.setZoom(zoom);
    map.fitBounds(bounds);

    // if  this is a graph, we draw edges as connections,
    // otherwise we may be connecting waypoints in order
    // to plot a path
    if (graphEdges.length > 0) {
	for (var i = 0; i < graphEdges.length; i++) {
	    var edgePoints = new Array(2);
	    var v1 = graphEdges[i].v1;
	    var v2 = graphEdges[i].v2;
	    //	    DBG.write("Adding edge " + i + " from " + v1 + "(" + waypoints[v1].lat + "," + waypoints[v1].lon + ") to " + v2 + "(" + waypoints[v2].lat + "," + waypoints[v2].lon + ")");
	    edgePoints[0] = new google.maps.LatLng(waypoints[v1].lat, waypoints[v1].lon);
	    edgePoints[1] = new google.maps.LatLng(waypoints[v2].lat, waypoints[v2].lon);
	    connections[i] = new google.maps.Polyline({path: edgePoints, strokeColor: "#0000FF", strokeWeight: 10, strokeOpacity: 0.4, map: map});
	    //map.addOverlay(connections[i]);
	}
    }
    else if (genEdges) {
	connections[0] = new google.maps.Polyline({path: polypoints, strokeColor: "#0000FF", strokeWeight: 10, strokeOpacity: 0.4, map: map});
	//map.addOverlay(connections[0]);
    }
    // don't think this should not be needed, but an attempt to get hidden waypoints
    // to be hidden when first created
    //showHiddenClicked();

    // enable the button to start search
    document.getElementById("startSearch").disabled = false;
}

function AddMarker(marker, markerinfo, i) {

    marker.setMap(map);
    google.maps.event.addListener(marker, 'click', function() {
	infowindow.setContent(markerinfo);
	infowindow.open(map, marker);
	});
}

function LabelClick(i, label, lat, lon, errors) {

    var info = MarkerInfo(i, new Waypoint(label, lat, lon, errors, ""));
    map.panTo(new google.maps.LatLng(lat, lon)); 
    infowindow.setContent(info);
    infowindow.open(map. markers[i]);
}

function MarkerInfo(i, wpt) {

    return '<p style="line-height:160%;"><span style="font-size:24pt;">' + wpt.label + '</span><br><b>Waypoint ' + i + '<\/b><br><b>Coords.:<\/b> ' + wpt.lat + '&deg;, ' + wpt.lon + '&deg;<\/p>';

}

// compute distance in miles between two lat/lon points
function Mileage(lat1, lon1, lat2, lon2) {
    if(lat1 == lat2 && lon1 == lon2)
	return 0.;
    
    var rad = 3963.;
    var deg2rad = Math.PI/180.;
    var ang = Math.cos(lat1 * deg2rad) * Math.cos(lat2 * deg2rad) * Math.cos((lon1 - lon2)*deg2rad) + Math.sin(lat1 * deg2rad) * Math.sin(lat2 * deg2rad);
    return Math.acos(ang) * 1.02112 * rad;
}

// compute distance in feet between two lat/lon points
function Feet(lat1, lon1, lat2, lon2) {
    if(lat1 == lat2 && lon1 == lon2)
	return 0.;
    
    var rad = 3963.;
    var deg2rad = Math.PI/180.;
    var ang = Math.cos(lat1 * deg2rad) * Math.cos(lat2 * deg2rad) * Math.cos((lon1 - lon2)*deg2rad) + Math.sin(lat1 * deg2rad) * Math.sin(lat2 * deg2rad);
    return Math.acos(ang) * 1.02112 * rad * 5280;
}

// callback for when the showHidden checkbox is clicked
function showHiddenClicked() {

    var showHidden = document.getElementById('showHidden').checked;
    //DBG.write("showHiddenClicked: showHidden is " + showHidden);
    if (showHidden) {
	// add in the hidden markers
	for (var i = 0; i < waypoints.length; i++) {
	    if (!waypoints[i].visible) {
		AddMarker(markers[i], markerinfo[i], i);
	    }
	}
    }
    else {
	// hide the ones that should no longer be visible
	for (var i = 0; i < waypoints.length; i++) {
	    if (!waypoints[i].visible) {
		markers[i].setMap(null);
	    }
	}
    }
}

// support for speed changing select for algorithm animations
var delay = 50;
function speedChanged() {
    var speedChanger = document.getElementById("speedChanger");
    delay = speedChanger.options[speedChanger.selectedIndex].value;
}

// support for pause/restart button
var paused = false;
function pauseResume() {
    var button = document.getElementById("pauseResume");
    paused = !paused;
    if (paused) {
	button.value = "Resume";
    }
    else {
	button.value = "Pause";
	continueSearch();
    }
}

// some variables to support our search with timers
var nextToCheck;
var northIndex = -1;
var southIndex = -1;
var eastIndex = -1;
var westIndex = -1;


//algo #2 variables 
var shortestEdage = -1;
var shortestIndex = 0;
var longestEdage = -1 ;
var longestIndex = 0;


// callback for when startSearch button is pressed
//NORTHSOUTH()
function startSearch() {
    $('.gratable').find('tr').attr('style', '');
    
    var statusLine = document.getElementById("status");
    statusLine.innerHTML = "Preparing for Extreme Point Search Visualization";
    // in the future, make sure we have appropriate data in the system
    // before executing anything here

    // start by showing all existing markers, even hidden
    for (var i = 0; i < waypoints.length; i++) {
	markers[i].setMap(map);
	markers[i].setIcon({path: google.maps.SymbolPath.CIRCLE,
			    scale: 2,
			    zIndex: google.maps.Marker.MAX_ZINDEX+1,
			    fillColor: 'white',
			    strokeColor: 'white'});
	document.getElementById('waypoint'+i).style.backgroundColor = 'white';
				
    }
	
	for (var ii = 0; ii < graphEdges.length; ii++) {
		document.getElementById('graphEdge'+ii).style.backgroundColor = 'white';
	 }
	 
    // we don't need edges here, so we remove those
    for (var i = 0; i < connections.length; i++) {
	connections[i].setMap(null);
	var edgePoints = new Array(2);
    }
    connections = new Array();

    // start the search by initializing with the value at pos 0
    markers[0].setIcon({path: google.maps.SymbolPath.CIRCLE,
			scale: 4,
			zIndex: google.maps.Marker.MAX_ZINDEX+3,
			fillColor: 'yellow',
			strokeColor: 'yellow'});
    document.getElementById('waypoint0').style.backgroundColor = "yellow";
    nextToCheck = 0;
    statusLine.innerHTML = 'Checking: <span style="color:yellow">0</span>';
    // enable pause button
    document.getElementById("pauseResume").disabled = false;
	
	whichAlgoToRun();

}

function whichAlgoToRun() {
	var userOption = document.getElementById("diffAlgorithm").value;
	if(userOption == 1){
		setTimeout(continueSearch, delay);
	}else if(userOption == 2){
		setTimeout(continueSearch2, delay);
	}
	else if(userOption == 3){
		setTimeout(continueSearch3, delay);
	}
	else if(userOption == 4){
		setTimeout(continueSearch4, delay);
	}
	else if(userOption == 5){
		setTimeout(continueSearch5, delay);
	}
}

var result5 = [];
var priorityQueue = [];
var flag5 = true;
function continueSearch5() {
	
		if(flag5 == true){
			result5.push([waypoint[0], 0, 'null']);
			flag5 = false;
		}
	
	
	var w1Lat = waypoints[graphEdges[nextToCheck].v1].lat;
	var w1Lon = waypoints[graphEdges[nextToCheck].v1].lon;
	var w2Lat = waypoints[graphEdges[nextToCheck].v2].lat;
	var w2Lon = waypoints[graphEdges[nextToCheck].v2].lon;
	var mileage = Mileage(w1Lat, w1Lon, w2Lat, w2Lon);
	
	//find its neighbor and add it to priorityQueue
	for(var i = 0; i < graphEdges.length; i++){
		if(nextToCheck == graphEdges[i].v1 || nextToCheck == graphEdges[i].v2){
			if(nextToCheck == graphEdges[i].v1){
				priorityQueue.push([mileage, graphEdges[i].v1, graphEdges[i].v2]);
			}
			else if(nextToCheck == graphEdges[i].v2){
				priorityQueue.push([mileage, graphEdges[i].v2, graphEdges[i].v1]);
			}
		}
	}
	
	//pick the smallest dis from priorityQueue
	var saveI = 0;
	for(var s = 0; s < priorityQueue.length; s++){
		var small = priorityQueue[0][0];
		if(small < priorityQueue[s][0]){
			small = priorityQueue[s][0];
			saveI = s;
		}
	}
	//push in on result5 array
	result5.push([priorityQueue[saveI][2], priorityQueue[saveI][0], priorityQueue[saveI][1]]);
	
	nextToCheck++;
	
	//DBG.write("nexttocheck: " + nextToCheck + " stack: " + stack);
	if(nextToCheck < graphEdges.length) {
			if (!paused) {
				setTimeout(continueSearch5, delay);
			}
	}
}




var queue = [];
var visit1 = [];
var result1 = [];
var flag1 = true;
var defeated1 = new Array();
function continueSearch4() {
	// step 1 -  Get the first waypoint. Push it to stack and mark it as visit.
	if(flag1 == true){
		for(var i = 0; i  < waypoints.length; i++){
			visit1[i] = false;
		}
		queue.push(nextToCheck);
		visit1[nextToCheck] = true;
		result1.push(nextToCheck);
		flag1 = false;
	}


	//step 3. check to see if either end point place are current one
	if(queue[0] == graphEdges[nextToCheck].v1 || queue[0] == graphEdges[nextToCheck].v2){
		if(queue[0] != graphEdges[nextToCheck].v1){
			//step 4 - if it is than we have to check to see if visiit or not
			if(visit1[graphEdges[nextToCheck].v1] == false){				
				//step 6 - if not than push it on stack
				queue.push(graphEdges[nextToCheck].v1);
				result1.push(graphEdges[nextToCheck].v1);
				visit1[graphEdges[nextToCheck].v1] = true;
				markers[graphEdges[nextToCheck].v1].setIcon({path: google.maps.SymbolPath.CIRCLE,
						  scale: 4,
						  zIndex: google.maps.Marker.MAX_ZINDEX+2,
						  fillColor: 'grey',
						  strokeColor: 'grey'});
				document.getElementById('waypoint'+nextToCheck).style.backgroundColor = 'yellow';
				document.getElementById('waypoint'+nextToCheck).scrollIntoViewIfNeeded();
				defeated.push(queue[0]);
				nextToCheck = -1;
			}
		} else{
			//step 4 - if it is than we have to check to see if visiit or not
			if(visit1[graphEdges[nextToCheck].v2] == false){
				//step 6 - if not than push it on stack
				queue.push(graphEdges[nextToCheck].v2);
				result1.push(graphEdges[nextToCheck].v2);
				visit1[graphEdges[nextToCheck].v2] = true;	

					markers[graphEdges[nextToCheck].v2].setIcon({path: google.maps.SymbolPath.CIRCLE,
						  scale: 4,
						  zIndex: google.maps.Marker.MAX_ZINDEX+2,
						  fillColor: 'grey',
						  strokeColor: 'grey'});
				document.getElementById('waypoint'+nextToCheck).style.backgroundColor = 'yellow';
				document.getElementById('waypoint'+nextToCheck).scrollIntoViewIfNeeded();
				defeated.push(queue[0]);	
				
				nextToCheck = -1;
			}
		}
	}

	var statusLine = document.getElementById("status");
	var line = 'Checking : <span style="color:red"> ' + queue + "</span>";
	statusLine.innerHTML = line;
	
	//step 2 - loop though graphedge array
	nextToCheck++;
	
	
	//DBG.write("nexttocheck: " + nextToCheck + " stack: " + stack);
	if(nextToCheck < graphEdges.length) {
			if (!paused) {
				setTimeout(continueSearch4, delay);
			}
	}else {
			//step 5 - if not than pop it from stack 
			queue.shift();
			
			//step 7 - continue until the stack is empty
			var loopAgain = false;
			for(var a = 0; a < queue.length; a++){
				if(queue[a] != null){
					loopAgain = true;
					break
				}
			}
			if(loopAgain) {				
				nextToCheck = 0;
				setTimeout(continueSearch4, delay);
			}
			statusLine.innerHTML = "Results: " + result1;
	}
}

/*
step 1. Get the first waypoint. Push it to stack and mark it as visit.
step 2. loop though graphedge array
step 3. check to see if either end point place are current one
step 4. if it is than we have to check to see if visiit or not
step 5. if not than pop it from stack  
step 6. if not than push it on stack
step 7. continue until the stack is empty
*/

var stack = [];
var visit = [];
var result = [];
var flag = true;
var defeated = new Array();
function continueSearch3() {

	// step 1 -  Get the first waypoint. Push it to stack and mark it as visit.
	if(flag == true){
		for(var i = 0; i  < waypoints.length; i++){
			visit[i] = false;
		}
		stack.push(nextToCheck);
		result.push(nextToCheck);
		visit[nextToCheck] = true;
		flag = false;
	}

	//step 3. check to see if either end point place are current one
	if(stack[stack.length - 1] == graphEdges[nextToCheck].v1 || stack[stack.length - 1] == graphEdges[nextToCheck].v2){
		if(stack[stack.length - 1] != graphEdges[nextToCheck].v1){
			//step 4 - if it is than we have to check to see if visiit or not
			if(visit[graphEdges[nextToCheck].v1] == false){
				//step 6 - if not than push it on stack
				stack.push(graphEdges[nextToCheck].v1);
				result.push(graphEdges[nextToCheck].v1);
				visit[graphEdges[nextToCheck].v1] = true;
				
					markers[graphEdges[nextToCheck].v1].setIcon({path: google.maps.SymbolPath.CIRCLE,
						  scale: 4,
						  zIndex: google.maps.Marker.MAX_ZINDEX+2,
						  fillColor: 'grey',
						  strokeColor: 'grey'});
				document.getElementById('waypoint'+nextToCheck).style.backgroundColor = 'yellow';
				document.getElementById('waypoint'+nextToCheck).scrollIntoViewIfNeeded();
				defeated.push(stack[stack.length - 1]);
				
				nextToCheck = -1;
			}
		} else{
			//step 4 - if it is than we have to check to see if visiit or not
			if(visit[graphEdges[nextToCheck].v2] == false){
				//step 6 - if not than push it on stack
				stack.push(graphEdges[nextToCheck].v2);
				result.push(graphEdges[nextToCheck].v2);
				visit[graphEdges[nextToCheck].v2] = true;
				
					markers[graphEdges[nextToCheck].v2].setIcon({path: google.maps.SymbolPath.CIRCLE,
						  scale: 4,
						  zIndex: google.maps.Marker.MAX_ZINDEX+2,
						  fillColor: 'grey',
						  strokeColor: 'grey'});
				document.getElementById('waypoint'+nextToCheck).style.backgroundColor = 'yellow';
				document.getElementById('waypoint'+nextToCheck).scrollIntoViewIfNeeded();
				defeated.push(stack[stack.length - 1]);	
				
				nextToCheck = -1;
				
			}
		}
	}

	var statusLine = document.getElementById("status");
	var line = 'Checking : <span style="color:red"> ' + stack + "</span>";
	statusLine.innerHTML = line;
	
	//step 2 - loop though graphedge array
	nextToCheck++;
	
	//DBG.write("nexttocheck: " + nextToCheck + " stack: " + stack);
	if(nextToCheck < graphEdges.length) {
			if (!paused) {
				setTimeout(continueSearch3, delay);
			}
	}else {
			//step 5 - if not than pop it from stack 
			stack.pop();
			
	
			
			//step 7 - continue until the stack is empty
			var loopAgain = false;
			for(var a = 0; a < stack.length; a++){
				if(stack[a] != null){
					loopAgain = true;
					break
				}
			}
			if(loopAgain) {				
				nextToCheck = 0;
				setTimeout(continueSearch3, delay);
			}
			statusLine.innerHTML = "Results: " + result;
	}		 
}


//markers, polyline, connections table
function myBackgroundColorAlgo3( fi,  fv1, fcolor1, fcolor2) {
	markers[fv1].setIcon({path: google.maps.SymbolPath.CIRCLE,
						  scale: 4,
						  zIndex: google.maps.Marker.MAX_ZINDEX+2,
						  fillColor: fcolor1,
						  strokeColor: fcolor1});
	document.getElementById('graphEdge'+fi).style.backgroundColor = fcolor2;
}

// Longest/Shortest Edge Search Algorithm
function continueSearch2() {
	//get lat and lon points 
	var w1Lat = waypoints[graphEdges[nextToCheck].v1].lat;
	var w1Lon = waypoints[graphEdges[nextToCheck].v1].lon;
	var w2Lat = waypoints[graphEdges[nextToCheck].v2].lat;
	var w2Lon = waypoints[graphEdges[nextToCheck].v2].lon;
	
	//base case 
	if(nextToCheck == 0){
			//get distance between two points
			var mileage = Mileage(w1Lat, w1Lon, w2Lat, w2Lon);
			shortestEdage = mileage;
			shortestIndex = nextToCheck;
			longestEdage = mileage;
			longestIndex = nextToCheck;
			//UI part
			myBackgroundColorAlgo2(nextToCheck, graphEdges[nextToCheck].v1, graphEdges[nextToCheck].v2, 'red');
	}else{
			var foundNewLeader = false;
			var defeated = new Array();
			var mileage = Mileage(w1Lat, w1Lon, w2Lat, w2Lon);

			//find new shortest and longest edage
			if(shortestEdage > mileage){
				foundNewLeader = true;
				defeated.push(shortestIndex);
				shortestEdage = mileage;
				shortestIndex = nextToCheck;
			}
			if(longestEdage < mileage){
				foundNewLeader = true;
				defeated.push(longestIndex);
				longestEdage = mileage;
				longestIndex = nextToCheck;
			}
			
			if (foundNewLeader) {
				if(shortestIndex == nextToCheck){
					myBackgroundColorAlgo2(nextToCheck, graphEdges[nextToCheck].v1, graphEdges[nextToCheck].v2, 'brown');
					markers[graphEdges[nextToCheck].v1].setIcon(null);
					document.getElementById('graphEdge'+nextToCheck).scrollIntoViewIfNeeded();
				}else if(longestIndex == nextToCheck){
					myBackgroundColorAlgo2(nextToCheck, graphEdges[nextToCheck].v1, graphEdges[nextToCheck].v2, 'blue');
					markers[graphEdges[nextToCheck].v1].setIcon(null);
					document.getElementById('graphEdge'+nextToCheck).scrollIntoViewIfNeeded();
				}
				
				//remove - change color back to grey
				while (defeated.length > 0) {
					var toCheck = defeated.pop();

					markers[graphEdges[toCheck].v1].setIcon({path: google.maps.SymbolPath.CIRCLE,
							  scale: 4,
							  zIndex: google.maps.Marker.MAX_ZINDEX+2,
							  fillColor: 'rgba(15,15,15,0)',
							  strokeColor: 'rgba(15,15,15,0)'});
					connections[toCheck].setOptions({strokeColor: 'rgba(15,15,15,0)'});
					var waypointToCheck = document.getElementById('graphEdge'+toCheck);
					waypointToCheck.style.backgroundColor = "white";
				}
			} else {
				myBackgroundColorAlgo2(nextToCheck, graphEdges[nextToCheck].v1, graphEdges[nextToCheck].v2, 'rgba(15,15,15,0)');
				document.getElementById('graphEdge'+nextToCheck).scrollIntoViewIfNeeded();
			}
	}// end of else 
	
	nextToCheck++;
	//result 
	var statusLine = document.getElementById("status");
	var line = 'Checking : <span style="color:yellow"> ' + nextToCheck + "</span> ShortestEdge: ";
	line = line + ' <span style="color:red"> ' + graphEdges[shortestIndex].v1 + ' </span> LongestEdge: ';
	line = line + '<span style="color:red">' + graphEdges[longestIndex].v1+ '</span>';
	statusLine.innerHTML = line;
	
	
	if(nextToCheck < graphEdges.length) {
			myBackgroundColorAlgo2(nextToCheck, graphEdges[nextToCheck].v1, graphEdges[nextToCheck].v2, 'yellow');
			document.getElementById('graphEdge'+nextToCheck).scrollIntoViewIfNeeded();
			
			if (!paused) {
				setTimeout(continueSearch2, delay);
			}
		}
		else {
			statusLine.innerHTML = "Results: Shortest Edge: #" + graphEdges[shortestIndex].v1 + " Longest Edge: #" + graphEdges[longestIndex].v1 + "."
		}
}



//markers, polyline, connections table
function myBackgroundColorAlgo2( fi,  fv1,  fv2,  fcolor) {
	markers[fv1].setIcon({path: google.maps.SymbolPath.CIRCLE,
						  scale: 4,
						  zIndex: google.maps.Marker.MAX_ZINDEX+2,
						  fillColor: fcolor,
						  strokeColor: fcolor});
			var edgePoints = new Array(2);
			edgePoints[0] = new google.maps.LatLng(waypoints[fv1].lat, waypoints[fv1].lon);
			edgePoints[1] = new google.maps.LatLng(waypoints[fv2].lat, waypoints[fv2].lon);
			connections[fi] = new google.maps.Polyline({path: edgePoints, strokeColor: fcolor, strokeWeight: 10, strokeOpacity: 0.4, map: map});
			document.getElementById('graphEdge'+fi).style.backgroundColor = fcolor;
}




// do an iteration of search
function continueSearch() {

    //DBG.write("continueSearch: " + nextToCheck + " N: " + northIndex + " S:" + southIndex + " E: " + eastIndex + " W:" + westIndex);
    // first we finish the previous point to see if it's a new winner,
    // and if necessary downgrade anyone who was beaten by this one
    // special case of first checked
    if (nextToCheck == 0) {
	// this was our first check, so this point wins all to start
	northIndex = 0;
	southIndex = 0;
	eastIndex = 0;
	westIndex = 0;
	// it's red as our leader
	markers[0].setIcon({path: google.maps.SymbolPath.CIRCLE,
			    scale: 4,
			    zIndex: google.maps.Marker.MAX_ZINDEX+2,
			    fillColor: 'red',
			    strokeColor: 'red'});
	document.getElementById('waypoint0').style.backgroundColor = "red";
    }
    // we have to do real work to see if we have new winners
    else {
	// keep track of whether this point is a new leader
	var foundNewLeader = false;
	// keep track of points that were leaders but got beaten to be
	// colored grey if they are no longer a leader in any direction
	var defeated = new Array();

	// check north
	if (waypoints[nextToCheck].lat > waypoints[northIndex].lat) {
	    foundNewLeader = true;
	    defeated.push(northIndex);
	    northIndex = nextToCheck;
	    //DBG.write("new northIndex: " + northIndex);
	}
	// check south
	if (waypoints[nextToCheck].lat < waypoints[southIndex].lat) {
	    foundNewLeader = true;
	    defeated.push(southIndex);
	    southIndex = nextToCheck;
	    //DBG.write("new southIndex: " + southIndex);
	}
	// check east
	if (waypoints[nextToCheck].lon > waypoints[eastIndex].lon) {
	    foundNewLeader = true;
	    defeated.push(eastIndex);
	    eastIndex = nextToCheck;
	    //DBG.write("new eastIndex: " + eastIndex);
	}
	// check west
	if (waypoints[nextToCheck].lon < waypoints[westIndex].lon) {
	    foundNewLeader = true;
	    defeated.push(westIndex);
	    westIndex = nextToCheck;
	    //DBG.write("new westIndex: " + westIndex);
	}

	if (foundNewLeader) {
	    //DBG.write("a new leader becoming red: " + nextToCheck);
	    // this one's a new winner, make it red and big
	    markers[nextToCheck].setIcon({path: google.maps.SymbolPath.CIRCLE,
					  scale: 4,
					  zIndex: google.maps.Marker.MAX_ZINDEX+2,
					  fillColor: 'red',
					  strokeColor: 'red'});
	    document.getElementById('waypoint'+nextToCheck).style.backgroundColor = "red";
	    // any that was just defeated should stop being red unless it's
	    // still a leader in some other direction (will happen especially
	    // early in searches)
	    while (defeated.length > 0) {
		var toCheck = defeated.pop();
		//DBG.write("a former leader to check: " + toCheck);
		if ((toCheck != northIndex) &&
		    (toCheck != southIndex) &&
		    (toCheck != eastIndex) &&
		    (toCheck != westIndex)) {
		    //DBG.write("a former leader no longer, going grey: " + toCheck);
		    markers[toCheck].setIcon({path: google.maps.SymbolPath.CIRCLE,
					      scale: 2,
					      zIndex: google.maps.Marker.MAX_ZINDEX+1,
					      fillColor: 'grey',
					      strokeColor: 'grey'});
                          
		    var waypointToCheck = document.getElementById('waypoint'+toCheck);
            waypointToCheck.style.backgroundColor = "grey";
		}
	    }
	}
	else {
	    // if this one's not a new winner, make it grey, it's done
	    markers[nextToCheck].setIcon({path: google.maps.SymbolPath.CIRCLE,
					  scale: 2,
					  zIndex: google.maps.Marker.MAX_ZINDEX+1,
					  fillColor: 'grey',
					  strokeColor: 'grey'});
	    document.getElementById('waypoint'+nextToCheck).style.backgroundColor = "grey";
	}
    }
    var statusLine = document.getElementById("status");
    var line = 'Checking : <span style="color:yellow"> ' + nextToCheck + "</span> N: ";
    if (northIndex == nextToCheck) {
	line = line + '<span style="color:red">' + northIndex + '</span>';
    }
    else {
	line = line + northIndex;
    }
    line = line + " S: ";
    if (southIndex == nextToCheck) {
	line = line + '<span style="color:red">' + southIndex + '</span>';
    }
    else {
	line = line + southIndex;
    }
    line = line + " E: ";
    if (eastIndex == nextToCheck) {
	line = line + '<span style="color:red">' + eastIndex + '</span>';
    }
    else {
	line = line + eastIndex;
    }
    line = line + " W: ";
    if (westIndex == nextToCheck) {
	line = line + '<span style="color:red">' + westIndex + '</span>';
    }
    else {
	line = line + westIndex;
    }
    statusLine.innerHTML = line;
    nextToCheck++;
    if (nextToCheck < markers.length) {
	markers[nextToCheck].setIcon({path: google.maps.SymbolPath.CIRCLE,
				      scale: 4,
				      zIndex: google.maps.Marker.MAX_ZINDEX+3,
				      fillColor: 'yellow',
				      strokeColor: 'yellow'});
	document.getElementById('waypoint'+nextToCheck).style.backgroundColor = "yellow";
    document.getElementById('waypoint'+nextToCheck).scrollIntoViewIfNeeded();
	if (!paused) {
	    setTimeout(continueSearch, delay);
	}
    }
    else {
	statusLine.innerHTML = "Results: North: #" + northIndex + "  ,South: #" + southIndex + "  ,East: #" + eastIndex + "  ,West: #" + westIndex;
    }
}

//JS debug window by Mike Maddox from
// http://javascript-today.blogspot.com/2008/07/how-about-quick-debug-output-window.html
var DBG = {
    write : function(txt){
	if (!window.dbgwnd){
	    window.dbgwnd = window.open("","debug","status=0,toolbar=0,location=0,menubar=0,directories=0,resizable=0,scrollbars=1,width=600,height=250");
	    window.dbgwnd.document.write('<html><head></head><body style="background-color:black"><div id="main" style="color:green;font-size:12px;font-family:Courier New;"></div></body></html>');
	}
	var x = window.dbgwnd.document.getElementById("main");
	this.line=(this.line==null)?1:this.line+=1;
	txt=this.line+': '+txt;
	if (x.innerHTML == ""){
	    x.innerHTML = txt;
	}
	else {
	    x.innerHTML = txt + "<br/>" + x.innerHTML;
	}
    }
}
