/* ===== GIS Lab 5 - WebGIS with OpenLayers ===== */

// --- Read URL param ---
function getStudentParam() {
    var params = new URLSearchParams(window.location.search);
    var s = parseInt(params.get('student'), 10);
    return (s === 1 || s === 2 || s === 3) ? s : null;
}
var activeStudent = getStudentParam();

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

// --- Style Functions ---
var provinceStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({ color: '#2d3436', width: 1.5 }),
    fill: new ol.style.Fill({ color: 'rgba(44,110,73,0.08)' })
});

var provinceHighlightStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({ color: '#f8c630', width: 3 }),
    fill: new ol.style.Fill({ color: 'rgba(248,198,48,0.15)' })
});

var BIV_COLORS = {
    11:'#e8e8e8', 12:'#cfd0cf', 13:'#babfba', 14:'#a7aea7', 15:'#939d93',
    21:'#d0b8d0', 22:'#b7a6bf', 23:'#a297ae', 24:'#8d889d', 25:'#77798d',
    31:'#b888b8', 32:'#9f7dae', 33:'#8972a4', 34:'#74679a', 35:'#5e5c8f',
    41:'#a058a0', 42:'#87549e', 43:'#71509c', 44:'#5b4c9a', 45:'#444898',
    51:'#882828', 52:'#6f2b8e', 53:'#592e94', 54:'#43319a', 55:'#2c34a0',
    0: '#cccccc'
};

function bivariateStyleFunction(feature) {
    var biv = feature.get('bivariate');
    var color = BIV_COLORS[biv] || '#cccccc';
    return new ol.style.Style({
        stroke: new ol.style.Stroke({ color: '#ffffff', width: 1 }),
        fill: new ol.style.Fill({ color: color })
    });
}

var POL_COLORS = {
    1: '#2d9e2d', 2: '#f8c630', 3: '#e88838', 4: '#d04040', 5: '#882828'
};

function polStyleFunction(feature) {
    var cls = Number(feature.get('pol_class_max'));
    var color = POL_COLORS[cls] || '#cccccc';
    return new ol.style.Style({
        stroke: new ol.style.Stroke({ color: '#000000', width: 2 }),
        fill: new ol.style.Fill({ color: color })
    });
}

// --- Data variable mapping ---
var STUDENT_DATA = {
    1: { provinces: GEOJSON_1_NETHERLANDS_PROVINCES, bivariate: GEOJSON_1_NETHERLANDS_BIVARIATE, chart: GEOJSON_1_CHART },
    2: { provinces: GEOJSON_2_NETHERLANDS_PROVINCES, bivariate: GEOJSON_2_NETHERLANDS_BIVARIATE, chart: GEOJSON_2_CHART },
    3: { provinces: GEOJSON_3_NETHERLANDS_PROVINCES, bivariate: GEOJSON_3_NETHERLANDS_BIVARIATE, chart: GEOJSON_3_CHART }
};

// --- Build student layers ---
var studentLayers = {};

function createStudentLayers(id, name, pollutant) {
    var data = STUDENT_DATA[id];
    var prefix = name + ' - ';

    var bivariate = new ol.layer.VectorImage({
        title: prefix + pollutant + ' Bivariate',
        visible: true,
        source: new ol.source.Vector({
            features: new ol.format.GeoJSON().readFeatures(data.bivariate, {
                featureProjection: 'EPSG:3857'
            })
        }),
        style: bivariateStyleFunction
    });

    var province = new ol.layer.VectorImage({
        title: prefix + 'Province Boundaries',
        visible: true,
        source: new ol.source.Vector({
            features: new ol.format.GeoJSON().readFeatures(data.provinces, {
                featureProjection: 'EPSG:3857'
            })
        }),
        style: provinceStyle
    });

    var dissolved = new ol.layer.Vector({
        title: prefix + pollutant + ' Zones',
        visible: true,
        source: new ol.source.Vector({
            features: new ol.format.GeoJSON().readFeatures(data.chart, {
                featureProjection: 'EPSG:3857'
            })
        }),
        style: polStyleFunction,
        zIndex: 5
    });

    return { bivariate: bivariate, province: province, dissolved: dissolved };
}

studentLayers[1] = createStudentLayers(1, 'songjiwei', 'NO2');
studentLayers[2] = createStudentLayers(2, 'zhangzihao', 'PM2.5');
studentLayers[3] = createStudentLayers(3, 'yehongjie', 'PM10');

// --- If a student param is present, hide other students' layers ---
if (activeStudent) {
    [1, 2, 3].forEach(function(sid) {
        var visible = (sid === activeStudent);
        studentLayers[sid].bivariate.setVisible(visible);
        studentLayers[sid].province.setVisible(visible);
        studentLayers[sid].dissolved.setVisible(visible);
    });
    // Update checkboxes to match
    document.addEventListener('DOMContentLoaded', function() {
        [1, 2, 3].forEach(function(sid) {
            var visible = (sid === activeStudent);
            ['bivariate', 'province', 'dissolved'].forEach(function(lt) {
                var cb = document.getElementById('chk-s' + sid + '-' + lt);
                if (cb) cb.checked = visible;
            });
        });
    });
}

// --- Map ---
var allLayers = [osmLayer, cartoLayer, satelliteLayer];
[1, 2, 3].forEach(function(sid) {
    allLayers.push(studentLayers[sid].bivariate);
    allLayers.push(studentLayers[sid].province);
    allLayers.push(studentLayers[sid].dissolved);
});

var map = new ol.Map({
    target: 'map',
    layers: allLayers,
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

// --- Toggle Student Layer ---
function toggleStudentLayer(studentId, layerType, visible) {
    var layers = studentLayers[studentId];
    if (!layers) return;
    var layer = layers[layerType];
    if (layer) layer.setVisible(visible);
}

// --- Highlight on hover ---
var highlightOverlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: provinceHighlightStyle,
    zIndex: 10
});
map.addLayer(highlightOverlay);

var highlightFeature = null;

map.on('pointermove', function(evt) {
    var feature = map.forEachFeatureAtPixel(evt.pixel, function(f) {
        return f;
    });
    if (feature !== highlightFeature) {
        highlightFeature = feature;
        highlightOverlay.getSource().clear();
        if (feature) {
            highlightOverlay.getSource().addFeature(feature.clone());
        }
        map.getTargetElement().style.cursor = feature ? 'pointer' : '';
    }
});

// --- Popup ---
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

popupContainer.style.cssText = 'background:white;border-radius:8px;padding:12px 16px;box-shadow:0 2px 15px rgba(0,0,0,0.2);font-size:13px;max-width:280px;';
popupCloser.style.cssText = 'text-decoration:none;position:absolute;top:4px;right:8px;font-size:16px;color:#999;';

map.on('singleclick', function(evt) {
    var feature = map.forEachFeatureAtPixel(evt.pixel, function(f) {
        return f;
    });
    if (feature) {
        var props = feature.getProperties();
        var html = '<table style="width:100%;border-collapse:collapse;">';
        for (var key in props) {
            if (key === 'geometry') continue;
            var val = props[key];
            if (val === null || val === undefined) val = '';
            if (typeof val === 'number') val = val.toFixed(2);
            html += '<tr><td style="padding:2px 6px;font-weight:600;color:#2d6e49;">' + key + '</td><td style="padding:2px 6px;">' + val + '</td></tr>';
        }
        html += '</table>';
        popupContent.innerHTML = html;
        popupOverlay.setPosition(evt.coordinate);
    } else {
        popupOverlay.setPosition(undefined);
    }
});

// --- Legend ---
function buildLegend() {
    var bivLegend = document.getElementById('biv-legend-content');
    if (bivLegend) {
        var html = '<div class="biv-legend-5x5">';
        html += '<div></div>';
        for (var pop = 1; pop <= 5; pop++) {
            html += '<div class="cell" style="font-size:0.55rem;color:#888;">Pop' + pop + '</div>';
        }
        for (var pol = 5; pol >= 1; pol--) {
            html += '<div class="cell" style="font-size:0.55rem;color:#888;">Pol' + pol + '</div>';
            for (var pop = 1; pop <= 5; pop++) {
                var biv = pol * 10 + pop;
                var color = BIV_COLORS[biv] || '#ccc';
                html += '<div class="cell" style="background:' + color + ';font-size:0.6rem;"></div>';
            }
        }
        html += '</div>';
        html += '<div style="font-size:0.65rem;color:#888;margin-top:4px;">';
        html += '← Pop Count →<br>';
        html += '↑ Pollutant Class ↑';
        html += '</div>';
        bivLegend.innerHTML = html;
    }

    var polLegend = document.getElementById('pol-legend-content');
    if (polLegend) {
        polLegend.innerHTML =
            '<div class="legend-item"><span class="legend-color" style="background:#2d9e2d;"></span> Class 1 (&le;10)</div>' +
            '<div class="legend-item"><span class="legend-color" style="background:#f8c630;"></span> Class 2 (10-25)</div>' +
            '<div class="legend-item"><span class="legend-color" style="background:#e88838;"></span> Class 3 (25-40)</div>' +
            '<div class="legend-item"><span class="legend-color" style="background:#d04040;"></span> Class 4 (40-50)</div>' +
            '<div class="legend-item"><span class="legend-color" style="background:#882828;"></span> Class 5 (&gt;50)</div>';
    }
}

document.addEventListener('DOMContentLoaded', buildLegend);
