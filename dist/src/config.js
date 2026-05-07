export const MAP_CONFIG = {
  minZoom: 9,
  maxZoom: 17.5,
  initialZoom: 11.4,
  nantesCenter: [-1.553621, 47.218371],
  hardLimitRadiusKm: 25,
  mapStyle: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
          "https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CARTO"
      }
    },
    layers: [
      {
        id: "osm-base",
        type: "raster",
        source: "osm",
        paint: {
          "raster-opacity": 0.9,
          "raster-saturation": -0.7,
          "raster-contrast": 0.1,
          "raster-brightness-min": 0.02,
          "raster-brightness-max": 0.5
        }
      }
    ]
  }
};

export const VIEW_MODES = {
  SKILLS: 'skills',
  VALUES: 'values'
}

