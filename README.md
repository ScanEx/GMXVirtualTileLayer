## TMS

Виртуальный слой ГеоМиксера для отображения стандартных тайловый растровых слоёв (`L.TileLayer`).
Тип виртуального слоя: `TMS` (для обратной совместимости поддерживается `TiledRaster`)

Мета-параметры:
  * `url-template` - Шаблон URL тайлов, как в Leaflet
  * `merc-projection` - Если есть такой параметр (с любым значением), считаем, что тайлы в проекции EPSG 3395. В этом случае используется плагин `L.TileLayer.Mercator`
  * `minZoom`, `maxZoom` - ограничение по зумам

Нужно просто подключить файл после плагина `Leaflet-GeoMixer`.

## WMS

Виртуальный слой ГеоМиксера для отображения WMS слоёв (`L.TileLayer.WMS`).
Тип виртуального слоя: `WMS`

Мета-параметры:
  * `base-url` - Адрес WMS сервера
  * `layers`, `styles`, `format`, `transparent`, `version`, `minZoom`, `maxZoom` - параметры `L.TileLayer.WMS`
  * `clickable` - (любое значение). Если параметр указан, слой будет отслеживать клики по слою и отсылать запросы на сервер
  * `balloonTemplate` - шаблон балунов (шаблонизатор Leaflet'а). Имеет смысл только для clickable-слоёв
  
## PBX

Виртуальный слой ГеоМиксера для отображения PBX слоёв [SpatialServer](https://github.com/spatialdev/PGRestAPI).
Тип виртуального слоя: `PBX`

Мета-параметры:
  * `url-template` - Шаблон URL тайлов, как в Leaflet
  * `visibleLayers`, `clickableLayers`, `filter` - параметры в списков наименований слоев
  * `style` - определение стилей по типам геометрий в виде JSON [описания стилей из](https://github.com/ScanEx/Leaflet.MapboxVectorTile/blob/master/docs/configuration.md).
  
  