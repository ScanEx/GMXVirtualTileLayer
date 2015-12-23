/** GeoMixer virtual layer for standard tile raster layers (L.TileLayer)
*/
(function (){

'use strict';

var GmxVirtualTileLayer = function(options) {}

GmxVirtualTileLayer.prototype.initFromDescription = function(layerDescription) {
    var props = layerDescription.properties,
        urlTemplate = props.MetaProperties['url-template'].Value,
        isMercator = !!props.MetaProperties['merc-projection'];
    
    var layer = (isMercator ? L.tileLayer.Mercator : L.tileLayer)(urlTemplate);
    
    layer.getGmxProperties = function() {
        return props;
    }

    return layer;
}

L.gmx.addLayerClass('TiledRaster', GmxVirtualTileLayer);

})();