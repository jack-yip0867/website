/* ===== GIS Lab 5 - WebGIS with OpenLayers (WMS) ===== */

// --- Read URL param ---
function getStudentParam() {
    var params = new URLSearchParams(window.location.search);
    var s = parseInt(params.get('student'), 10);
    return (s === 1 || s === 2 || s === 3) ? s : null;
}
var activeStudent = getStudentParam();

// --- GeoServer Config ---
var GEOSERVER_WMS = 'https://www.gis-geoserver.polimi.it/geoserver/wms';
var WORKSPACE = 'gisgeoserver_02';

// --- Student layer config ---
var STUDENTS = {
    1: { layer: 'songjiwei_bivariate', name: 'songjiwei', pollutant: 'NO₂' },
    2: { layer: 'zhangzihao_bivariate', name: 'zhangzihao', pollutant: 'PM2.5' },
    3: { layer: 'yehongjie_bivariate', name: 'yehongjie', pollutant: 'PM10' }
};

// --- Basemaps ---
var osmLayer = new ol.layer.Tile({
    title: 'OpenStreetMap',
    type: 'base',
    visible: true,
    source: new ol.source.OSM()
});

var cartoLayer = new ol.layer.Tile({
    title: 'CartoDB Positron',
    type: 'base',
    visible: false,
    source: new ol.source.XYZ({
        url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        attributions: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; <a href="https://openstreetmap.org/copyright">OSM</a>'
    })
});

var satelliteLayer = new ol.layer.Tile({
    title: 'Satellite',
    type: 'base',
    visible: false,
    source: new ol.source.XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: '&copy; Esri, Maxar, Earthstar Geographics'
    })
});

// --- Build WMS layers for each student ---
var studentLayers = {};
var studentSources = {};

[1, 2, 3].forEach(function(id) {
    var cfg = STUDENTS[id];
    var source = new ol.source.TileWMS({
        url: GEOSERVER_WMS,
        params: {
            LAYERS: WORKSPACE + ':' + cfg.layer
        },
        serverType: 'geoserver',
        transition: 0
    });
    studentSources[id] = source;

    var layer = new ol.layer.Tile({
        title: cfg.name + ' - ' + cfg.pollutant + ' Bivariate',
        visible: true,
        source: source
    });
    studentLayers[id] = layer;
});

// --- If student param present, show only that student; otherwise default to student 1 ---
if (!activeStudent) activeStudent = 1;
[1, 2, 3].forEach(function(sid) {
    studentLayers[sid].setVisible(sid === activeStudent);
});
document.addEventListener('DOMContentLoaded', function() {
    [1, 2, 3].forEach(function(sid) {
        var cb = document.getElementById('chk-s' + sid);
        if (cb) cb.checked = (sid === activeStudent);
    });
    updateAllLegends();
});

// --- Map ---
var map = new ol.Map({
    target: 'map',
    layers: [osmLayer, cartoLayer, satelliteLayer, studentLayers[1], studentLayers[2], studentLayers[3]],
    view: new ol.View({
        center: ol.proj.fromLonLat([5.5, 52.2]),
        zoom: 8,
        minZoom: 6,
        maxZoom: 18
    }),
    controls: [
        new ol.control.ScaleLine({ units: 'metric' }),
        new ol.control.FullScreen(),
        new ol.control.MousePosition({
            coordinateFormat: function(coords) {
                var lonLat = ol.proj.toLonLat(coords);
                return 'Lon: ' + lonLat[0].toFixed(4) + '&deg; | Lat: ' + lonLat[1].toFixed(4) + '&deg;';
            },
            projection: 'EPSG:4326',
            className: 'custom-mouse-position'
        }),
        new ol.control.Zoom(),
        new ol.control.Attribution({ collapsible: true })
    ]
});

// --- Basemap Switcher ---
function setBaseLayer(name) {
    [osmLayer, cartoLayer, satelliteLayer].forEach(function(layer) {
        layer.setVisible(layer.get('title') === name);
    });
}

// --- Toggle Student Layer (mutually exclusive) ---
function toggleStudentLayer(studentId, visible) {
    if (!visible) {
        // Don't allow unchecking the only visible layer
        var anyVisible = false;
        [1, 2, 3].forEach(function(sid) {
            if (studentLayers[sid].getVisible()) anyVisible = true;
        });
        if (!anyVisible) return;
    }
    // Show only the selected student, hide others
    [1, 2, 3].forEach(function(sid) {
        var show = (sid === studentId) && visible;
        studentLayers[sid].setVisible(show);
        var cb = document.getElementById('chk-s' + sid);
        if (cb) cb.checked = show;
    });
    updateAllLegends();
}

// --- Dynamic Legend from GeoServer GetLegendGraphic ---
function getLegendUrl(studentId) {
    var cfg = STUDENTS[studentId];
    var layerName = WORKSPACE + ':' + cfg.layer;
    return GEOSERVER_WMS + '?REQUEST=GetLegendGraphic&VERSION=1.3.0&FORMAT=image/png&LAYER=' + encodeURIComponent(layerName) + '&STYLE=';
}

function updateAllLegends() {
    [1, 2, 3].forEach(function(sid) {
        var img = document.getElementById('legend-img-s' + sid);
        var wrap = document.getElementById('legend-wrap-s' + sid);
        if (!img || !wrap) return;
        if (studentLayers[sid].getVisible()) {
            wrap.style.display = '';
            if (!img.src || img.dataset.loaded !== '1') {
                img.src = getLegendUrl(sid);
                img.dataset.loaded = '1';
            }
        } else {
            wrap.style.display = 'none';
        }
    });
}

// Rebuild legend when layer visibility changes
document.addEventListener('DOMContentLoaded', function() {
    if (!activeStudent) updateAllLegends();
});

// --- Popup (GetFeatureInfo) ---
var popupContainer = document.getElementById('popup') || (function() {
    var el = document.createElement('div');
    el.id = 'popup';
    el.className = 'ol-popup';
    el.innerHTML = '<a href="#" id="popup-closer" class="ol-popup-closer"></a><div id="popup-content"></div>';
    document.body.appendChild(el);
    return el;
})();

var popupContent = document.getElementById('popup-content');
var popupCloser = document.getElementById('popup-closer');

var popupOverlay = new ol.Overlay({
    element: popupContainer,
    positioning: 'bottom-center',
    stopEvent: false,
    offset: [0, -10]
});
map.addOverlay(popupOverlay);

popupCloser.addEventListener('click', function(e) {
    e.preventDefault();
    popupOverlay.setPosition(undefined);
    popupCloser.blur();
    return false;
});

popupContainer.style.cssText = 'background:white;border-radius:8px;padding:12px 16px;box-shadow:0 2px 15px rgba(0,0,0,0.2);font-size:13px;min-width:300px;max-width:fit-content;overflow:visible;';
popupCloser.style.cssText = 'text-decoration:none;position:absolute;top:4px;right:8px;font-size:16px;color:#999;';

map.on('singleclick', function(evt) {
    var view = map.getView();
    var resolution = view.getResolution();
    var projection = view.getProjection();

    // Try each visible student layer for GetFeatureInfo
    var found = false;
    [1, 2, 3].forEach(function(sid) {
        if (found || !studentLayers[sid].getVisible()) return;
        var source = studentSources[sid];
        var url = source.getFeatureInfoUrl(
            evt.coordinate,
            resolution,
            projection,
            { INFO_FORMAT: 'application/json' }
        );
        if (url) {
            found = true;
            fetch(url)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.features && data.features.length > 0) {
                        var props = data.features[0].properties;
                        var html = '<table style="width:100%;border-collapse:collapse;table-layout:auto;">';
                        for (var key in props) {
                            var val = props[key];
                            if (val === null || val === undefined) val = '';
                            if (typeof val === 'number') val = Number.isInteger(val) ? val : val.toFixed(2);
                            html += '<tr><td style="padding:2px 8px;font-weight:600;color:#2d6e49;white-space:nowrap;vertical-align:top;">' + key + ':</td><td style="padding:2px 8px;vertical-align:top;">' + val + '</td></tr>';
                        }
                        html += '</table>';
                        popupContent.innerHTML = html;
                        popupOverlay.setPosition(evt.coordinate);
                    }
                })
                .catch(function() {});
        }
    });
});
