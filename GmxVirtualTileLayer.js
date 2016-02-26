/** GeoMixer virtual layer for standard tile raster layers (L.TileLayer)
*/
(function (){

'use strict';

var GmxVirtualTileLayer = function(options) {}

GmxVirtualTileLayer.prototype.initFromDescription = function(layerDescription) {
    var props = layerDescription.properties,
        urlTemplate = props.MetaProperties['url-template'].Value,
        isMercator = !!props.MetaProperties['merc-projection'],
        options = {};

    if (props.Copyright) {
        options.attribution = props.Copyright;
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
    var WMS_OPTIONS = ['layers', 'styles', 'format', 'transparent', 'version'];
    var props = layerDescription.properties,
        metaProps = props.MetaProperties,
        baseURL = metaProps['base-url'].Value,
        options = {};

    if (props.Copyright) {
        options.attribution = props.Copyright;
    }
    
    for (var p in metaProps) {
        if (WMS_OPTIONS.indexOf(p) !== -1) {
            options[p] = metaProps[p].Value;
        }
    }
    
    var balloonTemplate = metaProps['balloonTemplate'].Value;
    
    var layer = L.tileLayer.wms(baseURL, options);
    
    layer.getGmxProperties = function() {
        return props;
    };    
    
    if (metaProps['clickable']) {
        layer.options.clickable = true;

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
                        L.popup()
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