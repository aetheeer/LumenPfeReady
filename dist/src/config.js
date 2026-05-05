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
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      }
    },
    layers: [
      {
        id: "osm-base",
        type: "raster",
        source: "osm"
      }
    ]
  }
};

export const VIEW_MODES = {
  SKILLS: 'skills',
  VALUES: 'values'
}

