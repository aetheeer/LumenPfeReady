const state = {
  zoomLevel: 1,
  center: [2.5, 46.5],
  lastInteraction: null
};

export function getState() {
  return state;
}

export function setZoomLevel(value) {
  state.zoomLevel = value;
  state.lastInteraction = "zoom";
}
