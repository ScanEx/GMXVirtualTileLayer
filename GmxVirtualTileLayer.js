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
        optionsList = meta.optionsList ? meta.optionsList.Value.split(',') : [],
        options = {};

    if (!urlTemplate) {
        return new L.gmx.DummyLayer(props);
    }

    if (props.Copyright) { options.attribution = props.Copyright; }

	optionsList = optionsList.concat(['tms', 'minZoom', 'maxZoom', 'maxNativeZoom']);
	options = L.extend({}, optionsList.reduce(function(prev, it) {
		var key = it.trim();
		if (meta[key]) {
			var zn = meta[key].Value.trim();
			prev[key] = zn > 0 ? Number(zn) : zn;
		}
		return prev;
	}.bind(this), {}), options);

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

    var metas = {};
    for (var p in meta) {
		var v = meta[p].Value;
        if (WMS_OPTIONS.indexOf(p) !== -1) {
            options[p] = WMS_OPTIONS_PROCESSORS[p] ? WMS_OPTIONS_PROCESSORS[p](v) : v;
        }
        if (p.indexOf('Function') !== -1) {
			v = new Function('ev', v);
        }
		metas[p] = v;
    }

    var layer = L.tileLayer.wms(baseURL, options);

    layer.getGmxProperties = function() {
        return props;
    };
	layer.metas = metas;

    var balloonTemplate = meta['balloonTemplate'] && meta['balloonTemplate'].Value;
    var infoFormat = meta['info_format'] && meta['info_format'].Value;
    var popupURLTemplate = meta['popupURLTemplate'] && meta['popupURLTemplate'].Value;

    if (metas.clickable) {
        layer.options.clickable = true;

        layer.onAdd = function(map) {
			L.DomUtil.addClass(map.getContainer(), 'gmx-cursor-help');
            L.TileLayer.WMS.prototype.onAdd.apply(this, arguments);
        }

        layer.onRemove = function(map) {
			L.DomUtil.removeClass(map.getContainer(), 'gmx-cursor-help');
            lastOpenedPopup && map.removeLayer(lastOpenedPopup);
            L.TileLayer.WMS.prototype.onRemove.apply(this, arguments);
        }

        var lastOpenedPopup;
        layer.gmxEventCheck = function(event) {
            if (event.type === 'click') {
                event.layer = layer;
                var latlng = event.latlng,
					urlFuncton = layer.metas.popupURLFunction,
					isFunction = typeof(urlFuncton) === 'function';

				if (popupURLTemplate || isFunction) {
					var url = isFunction ? urlFuncton(event) : L.Util.template(popupURLTemplate, {lat: latlng.lat, lng: latlng.lng});
					if (layer.metas.proxy === 'true') {
						url = (L.gmx.gmxProxy || '//maps.kosmosnimki.ru/ApiSave.ashx') + '?WrapStyle=none&get=' + encodeURIComponent(url);
					}
					fetch(url, {mode: 'cors'})
						.then(function(resp) {
							return resp.json();
						})
						.then(function(json) {
							var features = json.features,
								it = null;
							if (!features && json.Status === 'ok' && json.Result) {
								var geoJSON = JSON.parse(json.Result);
								features = geoJSON.features;
							}
							if (features.length) {
								var content = '';
								it = features[0];
								if (isFunction) {
									it.summary = gmxAPIutils.prettifyArea(gmxAPIutils.geoJSONGetArea(it));
									content = gmxAPIutils.parseBalloonTemplate('', it);
								} else {
									content = JSON.stringify(features, null, 2);
								}
								lastOpenedPopup = L.popup({maxHeight: 400})
									.setLatLng(latlng)
									.setContent(content)
									.openOn(this._map);
							}
							if (!it) {
								console.log('Not found features:', json);
							}
						}.bind(this))
						.catch(console.log);
				} else {
					var p = this._map.project(latlng),
						tileSize = layer.options.tileSize,
						I = p.x % tileSize,
						J = p.y % tileSize,
						tilePoint = p.divideBy(tileSize).floor(),
						url = this.getTileUrl(tilePoint),
						info = infoFormat || 'application/geojson';

					url = url.replace('=GetMap', '=GetFeatureInfo');
					// url += '&X=' + I + '&Y=' + J + '&QUERY_LAYERS=' + options.layers;
					url += '&X=' + I + '&Y=' + J + '&INFO_FORMAT=' + info + '&QUERY_LAYERS=' + options.layers;

					fetch(url, {mode: 'cors'})
					.then(function(resp) { return resp.json(); })
					.then(function(geoJSON) {
						if (geoJSON.features[0]) {
							var html = template(balloonTemplate, geoJSON.features[0].properties);
							lastOpenedPopup = L.popup()
								.setLatLng(event.latlng)
								.setContent(html)
								.openOn(this._map);
						}
					}.bind(this));
				}
            }

            return 1;
        };
    }

    return layer;
}

L.gmx.addLayerClass('WMS', GmxVirtualWMSLayer);

// if (L.TileLayer.MVTSource) {
	var GmxPBXTileLayer = function(/*options*/) {}

	GmxPBXTileLayer.prototype.initFromDescription = function(layerDescription) {
		var props = layerDescription.properties,
			meta = props.MetaProperties,
			urlTemplate = meta['url-template'] && meta['url-template'].Value,
			// isMercator = !!meta['merc-projection'],
			options = {},
			mvtOptions = {};

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

		mvtOptions.url = urlTemplate;
		if (meta.debug) {
			mvtOptions.debug = meta.debug.Value === 'true';
		}
		if (meta.visibleLayers) {
			mvtOptions.visibleLayers = meta.visibleLayers.Value.split(',');
		}
		if (meta.clickableLayers) {
			mvtOptions.clickableLayers = meta.clickableLayers.Value.split(',');
		}
		if (meta.filter) {
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
			var filterLayers = meta.filter.Value.split(',');
			mvtOptions.filter = function(feature) {
				for (var i = 0, len = filterLayers.length; i < len; i++) {
					if (feature.layer.name === filterLayers[i]) {
					  return true;
					}
				}
				return false;
			};
		}
		var styleTypes = {
			1: {	//'Point'
				color: 'rgba(49,79,79,1)',
				radius: 5,
				selected: {
				  color: 'rgba(255,255,0,0.5)',
				  radius: 6
				}
			},
			2: {	//'LineString'
				color: 'rgba(161,217,155,0.8)',
				size: 3,
				selected: {
				  color: 'rgba(255,25,0,0.5)',
				  size: 4
				}
			},
			3: {	//'Polygon'
				color: 'rgba(149,139,255,0.4)',
				outline: {
				  color: 'rgb(20,20,20)',
				  size: 1
				},
				selected: {
				  color: 'rgba(255,140,0,0.3)',
					outline: {
					  color: 'rgba(255,140,0,1)',
					  size: 2
					}
				}
			}
		};
		if (meta.style) {
			styleTypes = JSON.parse(meta.style.Value);
		}
		mvtOptions.style = function (feature) {
			var type = feature.type;
			// var name = feature.layer.name;
			return styleTypes[type] || {};
		}

		var mvtSource = new L.TileLayer.MVTSource(Object.assign(mvtOptions, {
		  getIDForLayerFeature: function(feature) {
			return feature._id;
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

		}));

		mvtSource.getGmxProperties = function() {
			return props;
		}

		return mvtSource;
	}

	L.gmx.addLayerClass('PBX', GmxPBXTileLayer);
// }

// if (L.tileLayer.bing) {
	var GmxBingLayer = function(/*options*/) {}

	GmxBingLayer.prototype.initFromDescription = function(layerDescription) {
		var props = layerDescription.properties,
			meta = props.MetaProperties,
			bingMapsKey = meta['bingMapsKey'] && meta['bingMapsKey'].Value,
			imagerySet = meta['imagerySet'] && meta['imagerySet'].Value,
			culture = meta['culture'] && meta['culture'].Value,
			style = meta['style'] && meta['style'].Value,
			options = {
				bingMapsKey: bingMapsKey || 'Atr94LlesFUFHF7carCFRKMYBV3erkaYJVkkm7XTabk7p7ima_If38WMOqem2IdS',
				imagerySet: imagerySet || '',
				culture: culture || '',
				style: style || ''
			};

		if (props.Copyright) { options.attribution = props.Copyright; }
		if (meta.minZoom) {
			options.minZoom = meta.minZoom.Value;
		}
		if (meta.maxZoom) {
			options.maxZoom = meta.maxZoom.Value;
		}
		if (meta.minNativeZoom) {
			options.minNativeZoom = meta.minNativeZoom.Value;
		}
		if (meta.maxNativeZoom) {
			options.maxNativeZoom = meta.maxNativeZoom.Value;
		}

		var layer = L.tileLayer.bing(options);

		layer.getGmxProperties = function() {
			return props;
		}

		return layer;
	}

	L.gmx.addLayerClass('BING', GmxBingLayer);
// }

})();
