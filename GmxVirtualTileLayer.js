/** GeoMixer virtual layer for standard tile raster layers (L.TileLayer)
*/
(function (){

'use strict';

//this function is copied from L.Utils and modified to allow missing data attributes
var template = function (str, data) {
    return str.replace(/\{ *([\w_]+) *\}/g, function (str, key) {
        var value = data[key];
        if (value === undefined) {
            value = '';
        } else if (typeof value === 'function') {
            value = value(data);
        }
        return value;
    });
};

var GmxVirtualTileLayer = function(options) {}

GmxVirtualTileLayer.prototype.initFromDescription = function(layerDescription) {
    var props = layerDescription.properties,
        meta = props.MetaProperties,
        urlTemplate = meta['url-template'] && meta['url-template'].Value,
        isMercator = !!meta['merc-projection'],
        options = {};

    if (!urlTemplate) {
        return new L.gmx.DummyLayer(props);
    }
        
    if (props.Copyright) {
        options.attribution = props.Copyright;
    }
    
    if (meta.minZoom) {
        options.minZoom = meta.minZoom.Value;
    }
    
    if (meta.maxZoom) {
        options.maxZoom = meta.maxZoom.Value;
    }

    var layer = (isMercator ? L.tileLayer.Mercator : L.tileLayer)(urlTemplate, options);

    layer.getGmxProperties = function() {
        return props;
    }

    return layer;
}

L.gmx.addLayerClass('TMS', GmxVirtualTileLayer);

//depricated - use "TMS" instead
L.gmx.addLayerClass('TiledRaster', GmxVirtualTileLayer);

var GmxVirtualWMSLayer = function(options) {}

GmxVirtualWMSLayer.prototype.initFromDescription = function(layerDescription) {
    var WMS_OPTIONS = ['layers', 'styles', 'format', 'transparent', 'version', 'minZoom', 'maxZoom', 'tileSize', 'f', 'bboxSR', 'imageSR', 'size'];
    var WMS_OPTIONS_PROCESSORS = {tileSize: parseInt};
    var props = layerDescription.properties,
        meta = props.MetaProperties,
        baseURL = meta['base-url'] && meta['base-url'].Value,
        options = {};
        
    if (!baseURL) {
        return new L.gmx.DummyLayer(props);
    }

    if (props.Copyright) {
        options.attribution = props.Copyright;
    }
    
    for (var p in meta) {
        if (WMS_OPTIONS.indexOf(p) !== -1) {
            options[p] = WMS_OPTIONS_PROCESSORS[p] ? WMS_OPTIONS_PROCESSORS[p](meta[p].Value) : meta[p].Value;
        }
    }
    
    
    var layer = L.tileLayer.wms(baseURL, options);
    
    layer.getGmxProperties = function() {
        return props;
    };    
    
    var balloonTemplate = meta['balloonTemplate'] && meta['balloonTemplate'].Value;
    if (meta['clickable'] && balloonTemplate) {
        layer.options.clickable = true;
        
        layer.onRemove = function(map) {
            lastOpenedPopup && map.removeLayer(lastOpenedPopup);
            L.TileLayer.WMS.prototype.onRemove.apply(this, arguments);
        }

        var lastOpenedPopup;
        layer.gmxEventCheck = function(event) {
            if (event.type === 'click') {
                var p = this._map.project(event.latlng),
                    tileSize = layer.options.tileSize,
                    I = p.x % tileSize,
                    J = p.y % tileSize,
                    tilePoint = p.divideBy(tileSize).floor(),
                    url = this.getTileUrl(tilePoint);

                url = url.replace('=GetMap', '=GetFeatureInfo');
                url += '&X=' + I + '&Y=' + J + '&INFO_FORMAT=application/geojson&QUERY_LAYERS=' + options.layers;

                $.getJSON(url).then(function(geoJSON) {
                    if (geoJSON.features[0]) {
                        var html = template(balloonTemplate, geoJSON.features[0].properties);
                        lastOpenedPopup = L.popup()
                            .setLatLng(event.latlng)
                            .setContent(html)
                            .openOn(this._map);
                    }
                }.bind(this));
            }

            return 1;
        };
    }

    return layer;
}

L.gmx.addLayerClass('WMS', GmxVirtualWMSLayer);

})();
