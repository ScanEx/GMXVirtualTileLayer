/** GeoMixer virtual layer for standard tile raster layers (L.TileLayer)
*/
(function (){

'use strict';

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
    var WMS_OPTIONS = ['layers', 'styles', 'format', 'transparent', 'version', 'minZoom', 'maxZoom'];
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
            options[p] = meta[p].Value;
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
                    I = p.x % 256,
                    J = p.y % 256,
                    tilePoint = p.divideBy(256).floor(),
                    url = this.getTileUrl(tilePoint);

                url = url.replace('=GetMap', '=GetFeatureInfo');
                url += '&X=' + I + '&Y=' + J + '&INFO_FORMAT=application/geojson&QUERY_LAYERS=' + options.layers;

                $.getJSON(url).then(function(geoJSON) {
                    if (geoJSON.features[0]) {
                        var html = L.Util.template(balloonTemplate, geoJSON.features[0].properties);
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