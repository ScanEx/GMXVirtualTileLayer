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
        baseURL = props.MetaProperties['base-url'].Value,
        options = {};

    if (props.Copyright) {
        options.attribution = props.Copyright;
    }
    
    for (var p in props.MetaProperties) {
        if (WMS_OPTIONS.indexOf(p) !== -1) {
            options[p] = props.MetaProperties[p].Value;
        }
    }

    var layer = L.tileLayer.wms(baseURL, options);

    layer.getGmxProperties = function() {
        return props;
    }

    return layer;
}

L.gmx.addLayerClass('WMS', GmxVirtualWMSLayer);

})();