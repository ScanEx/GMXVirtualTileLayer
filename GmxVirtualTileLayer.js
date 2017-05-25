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

var GmxVirtualTileLayer = function(/*options*/) {}

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

    if (meta.maxNativeZoom) {
        options.maxNativeZoom = meta.maxNativeZoom.Value;
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

var GmxVirtualWMSLayer = function(/*options*/) {}

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

				/*eslint-disable no-undef */
                $.getJSON(url).then(function(geoJSON) {
                    if (geoJSON.features[0]) {
                        var html = template(balloonTemplate, geoJSON.features[0].properties);
                        lastOpenedPopup = L.popup()
                            .setLatLng(event.latlng)
                            .setContent(html)
                            .openOn(this._map);
                    }
                }.bind(this));
				/*eslint-enable */
            }

            return 1;
        };
    }

    return layer;
}

L.gmx.addLayerClass('WMS', GmxVirtualWMSLayer);


var GmxPBXTileLayer = function(/*options*/) {}

GmxPBXTileLayer.prototype.initFromDescription = function(layerDescription) {
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

	//Globals that we can change later.
	var fillColor = 'rgba(149,139,255,0.4)';
	var strokeColor = 'rgb(20,20,20)';
	var mvtSource = new L.TileLayer.MVTSource({
	  url: urlTemplate,
	  //debug: true,
	  clickableLayers: ['gaul_2014_adm1'],
	  visibleLayers: ['gaul_2014_adm1'], //ONLY show this layer that's contained inside of these pbfs.
	  getIDForLayerFeature: function(feature) {
		return feature._id;
	  },

	  /**
	   * The filter function gets called when iterating though each vector tile feature (vtf). You have access
	   * to every property associated with a given feature (the feature, and the layer). You can also filter
	   * based of the context (each tile that the feature is drawn onto).
	   *
	   * Returning false skips over the feature and it is not drawn.
	   *
	   * @param feature
	   * @returns {boolean}
	   */
	  filter: function(feature, context) {
		if (feature.layer.name === 'gaul_2014_adm1' || feature.layer.name === 'gaul_2014_adm1_label') {
		  return true;
		}
		return false;
	  },

	  style: function (feature) {
		var style = {};

		var type = feature.type;
		switch (type) {
		  case 1: //'Point'
			style.color = 'rgba(49,79,79,1)';
			style.radius = 5;
			style.selected = {
			  color: 'rgba(255,255,0,0.5)',
			  radius: 6
			};
			break;
		  case 2: //'LineString'
			style.color = 'rgba(161,217,155,0.8)';
			style.size = 3;
			style.selected = {
			  color: 'rgba(255,25,0,0.5)',
			  size: 4
			};
			break;
		  case 3: //'Polygon'
			style.color = fillColor;
			style.outline = {
			  color: strokeColor,
			  size: 1
			};
			style.selected = {
			  color: 'rgba(255,140,0,0.3)',
			  outline: {
				color: 'rgba(255,140,0,1)',
				size: 2
			  }
			};
			break;
		}

		if (feature.layer.name === 'gaul_2014_adm1_label') {
		  // style.ajaxSource = function(mvtFeature) {
			// var id = mvtFeature.id;
			// return 'http://localhost:8888/fsp/2014/fsp/aggregations-no-name/' + id + '.json';
		  // };

		  // style.staticLabel = function(mvtFeature, ajaxData) {
			// var style = {
			  // html: ajaxData.total_count,
			  // iconSize: [33,33],
			  // cssClass: 'label-icon-number',
			  // cssSelectedClass: 'label-icon-number-selected'
			// };
			// return style;
		  // };
		}

		return style;
	  },

	  /**
	   * When we want to link events between layers, like clicking on a label and a
	   * corresponding polygon freature, this will return the corresponding mapping
	   * between layers. This provides knowledge of which other feature a given feature
	   * is linked to.
	   *
	   * @param layerName  the layer we want to know the linked layer from
	   * @returns {string} returns corresponding linked layer
	   */
	  layerLink: function(layerName) {
		if (layerName.indexOf('_label') > -1) {
		  return layerName.replace('_label','');
		}
		return layerName + '_label';
	  }

	});
    // var layer = (isMercator ? L.tileLayer.Mercator : L.tileLayer)(urlTemplate, options);

    mvtSource.getGmxProperties = function() {
        return props;
    }

    return mvtSource;
}

L.gmx.addLayerClass('PBX', GmxPBXTileLayer);

})();
