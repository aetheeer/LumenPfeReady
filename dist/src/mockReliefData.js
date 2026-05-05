// Génération de données simulées pour le relief avec seed reproductible

import { SKILL_LABELS, VALUE_LABELS } from "./corpus.js";

class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// Centres économiques stratégiques (lon, lat) avec leur poids d'influence
const ECONOMIC_HOTSPOTS = [
  { lon: 2.35, lat: 48.85, radius: 1.8, weight: 3.8, name: 'Paris/Île-de-France' },      // Paris - poids x4.5 (augmenté)
  { lon: -1.55, lat: 47.22, radius: 1.0, weight: 4.2, name: 'Nantes' },                  // Nantes - poids x3.2 (augmenté)
  { lon: 4.84, lat: 45.76, radius: 1.0, weight: 3.5, name: 'Lyon' },                     // Lyon - poids x3.5 (augmenté)
  { lon: 5.38, lat: 43.30, radius: 0.6, weight: 1.8, name: 'Marseille' },                // Marseille - poids x1.8
  { lon: 1.44, lat: 43.60, radius: 0.8, weight: 2.0, name: 'Toulouse' },                 // Toulouse - poids x3.0 (augmenté)
  { lon: -0.58, lat: 44.84, radius: 0.8, weight: 2.0, name: 'Bordeaux' },                // Bordeaux - poids x2.8 (augmenté)
  { lon: 3.06, lat: 50.63, radius: 0.6, weight: 1.6, name: 'Lille' },                    // Lille - poids x1.6
  { lon: 7.75, lat: 48.57, radius: 0.5, weight: 1.4, name: 'Strasbourg' },               // Strasbourg - poids x1.4
  { lon: -1.68, lat: 48.11, radius: 0.5, weight: 1.5, name: 'Rennes' },                  // Rennes - poids x1.5
  { lon: 1.09, lat: 49.44, radius: 0.5, weight: 1.3, name: 'Rouen' },                    // Rouen - poids x1.3
  { lon: 5.72, lat: 45.19, radius: 0.5, weight: 1.4, name: 'Grenoble' },                 // Grenoble - poids x1.4
  { lon: 3.88, lat: 43.61, radius: 0.5, weight: 1.4, name: 'Montpellier' }               // Montpellier - poids x1.4
];

// Calculer le centroïde d'un polygone (performance optimized)
function getPolygonCentroid(coordinates) {
  let sumX = 0, sumY = 0;
  const count = coordinates.length;
  
  // Use for loop instead of forEach for better performance
  for (let i = 0; i < count; i++) {
    sumX += coordinates[i][0];
    sumY += coordinates[i][1];
  }
  
  return [sumX / count, sumY / count];
}

// Ray casting algorithm pour point-in-polygon (performance optimized)
function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  const len = polygon.length;
  
  // Pre-cache polygon length and use optimized loop
  for (let i = 0, j = len - 1; i < len; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    
    // Optimized intersection test
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

// Générer un point aléatoire dans un polygone (bbox sampling + retry)
function randomPointInPolygon(polygon, rng, maxAttempts = 300) {
  // Calculer le bbox
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  polygon.forEach(coord => {
    minX = Math.min(minX, coord[0]);
    maxX = Math.max(maxX, coord[0]);
    minY = Math.min(minY, coord[1]);
    maxY = Math.max(maxY, coord[1]);
  });
  
  // Essayer de trouver un point dans le polygone
  for (let i = 0; i < maxAttempts; i++) {
    const x = minX + rng.next() * (maxX - minX);
    const y = minY + rng.next() * (maxY - minY);
    
    if (pointInPolygon([x, y], polygon)) {
      return [x, y];
    }
  }
  
  // Fallback robuste: utiliser le centroïde du polygone
  // C'est plus sûr que de prendre un point du bord
  return getPolygonCentroid(polygon);
}

// Calculer l'aire approximative d'un polygone (algorithme du lacet de chaussure)
function getPolygonArea(coords) {
  let area = 0;
  const n = coords.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  
  return Math.abs(area / 2);
}

// Filtrer les polygones pour ne garder que ceux de la France métropolitaine
function isMetropolePolygon(coords) {
  // Calculer le centroïde pour vérifier s'il est en France métropolitaine
  const centroid = getPolygonCentroid(coords);
  const [lon, lat] = centroid;
  
  // Limites de la France métropolitaine (approximatives)
  // Longitude: -5 à 10 (ouest à est)
  // Latitude: 41 à 51 (sud à nord)
  if (lon < -5 || lon > 10 || lat < 41 || lat > 51) {
    return false;
  }
  
  // Exclure les petits polygones (îles) - aire minimale en degrés carrés
  // Cela exclut les petites îles bretonnes, corses, etc.
  const area = getPolygonArea(coords);
  const minArea = 0.01; // Environ 100 km² (ajustable)
  
  return area >= minArea;
}

// Calculer le poids économique d'un point géographique basé sur sa proximité aux centres économiques
function getEconomicWeight(lon, lat) {
  let totalWeight = 1.0; // Poids de base
  
  for (const hotspot of ECONOMIC_HOTSPOTS) {
    // Calculer la distance approximative (formule euclidienne simplifiée)
    const dx = (lon - hotspot.lon) * Math.cos((lat * Math.PI) / 180);
    const dy = lat - hotspot.lat;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Si dans le rayon d'influence, ajouter le poids
    if (distance < hotspot.radius) {
      // Poids décroissant avec la distance (plus proche = plus de poids)
      const influence = 1 - (distance / hotspot.radius);
      totalWeight += (hotspot.weight - 1) * influence;
    }
  }
  
  return totalWeight;
}

// Extraire les polygones valides des features avec pondération économique
function extractPolygons(features) {
  const polygons = [];
  
  features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0];
      // Filtrer uniquement les polygones métropolitains
      if (isMetropolePolygon(coords)) {
        const centroid = getPolygonCentroid(coords);
        const weight = getEconomicWeight(centroid[0], centroid[1]);
        polygons.push({
          coords: coords,
          centroid: centroid,
          weight: weight
        });
      }
    } else if (feature.geometry.type === 'MultiPolygon') {
      // Prendre seulement les polygones significatifs et métropolitains
      feature.geometry.coordinates.forEach(polygon => {
        const coords = polygon[0];
        if (coords.length > 3 && isMetropolePolygon(coords)) {
          const centroid = getPolygonCentroid(coords);
          const weight = getEconomicWeight(centroid[0], centroid[1]);
          polygons.push({
            coords: coords,
            centroid: centroid,
            weight: weight
          });
        }
      });
    }
  });
  
  return polygons;
}

export function generateReliefData(config) {
  const {
    mode,
    seed = 42,
    density = 0.3,
    zScale = 100,
    zExponent = 1.5,
    minThreshold = 0.1,
    features,
    projection,
    level = 'regions'
  } = config;

  const rng = new SeededRandom(seed);
  const labels = mode === 'skills' ? SKILL_LABELS : VALUE_LABELS;
  const points = [];
  
  if (!features || !projection) {
    return points;
  }
  
  // Extraire les polygones
  const polygons = extractPolygons(features);
  
  if (polygons.length === 0) {
    return points;
  }
  
  // Nombre de points selon le niveau
  let baseCount;
  switch(level) {
    case 'regions': baseCount = 15; break;
    case 'departements': baseCount = 80; break;
    case 'arrondissements': baseCount = 200; break;
    default: baseCount = 15;
  }
  
  const count = Math.floor(baseCount * density);
  
  // Calculer les poids cumulés pour la sélection pondérée des polygones
  const totalWeight = polygons.reduce((sum, p) => sum + p.weight, 0);
  const cumulativeWeights = [];
  let cumSum = 0;
  
  for (const polygon of polygons) {
    cumSum += polygon.weight;
    cumulativeWeights.push(cumSum);
  }
  
  // Fonction pour sélectionner un polygone selon son poids économique
  function selectWeightedPolygon(rng) {
    const randValue = rng.next() * totalWeight;
    for (let i = 0; i < cumulativeWeights.length; i++) {
      if (randValue <= cumulativeWeights[i]) {
        return polygons[i];
      }
    }
    return polygons[polygons.length - 1];
  }
  
  // Générer les points avec plus de tentatives pour assurer qu'ils sont dans les polygones
  let attempts = 0;
  const maxTotalAttempts = count * 10; // Augmenté pour plus de sécurité
  
  while (points.length < count && attempts < maxTotalAttempts) {
    attempts++;
    
    // Choisir un polygone pondéré par son importance économique
    const polygon = selectWeightedPolygon(rng);
    
    // Générer un point géographique dans le polygone
    const geoPoint = randomPointInPolygon(polygon.coords, rng, 300);
    
    // Double vérification: le point est bien dans le polygone
    if (!pointInPolygon(geoPoint, polygon.coords)) {
      continue; // Sauter ce point s'il est en dehors
    }
    
    // Vérification géographique: le point est bien en France métropolitaine
    const [lon, lat] = geoPoint;
    if (lon < -5 || lon > 10 || lat < 41 || lat > 51) {
      continue; // Sauter les points hors de la France métropolitaine
    }
    
    // Projeter en pixels écran
    const projected = projection(geoPoint);
    
    if (!projected || !isFinite(projected[0]) || !isFinite(projected[1])) {
      continue;
    }
    
    const [x, y] = projected;
    const rawZ = rng.next();
    
    if (rawZ < minThreshold) continue;
    
    const z = Math.pow(rawZ, zExponent) * zScale;
    const labelIndex = Math.floor(rng.next() * labels.length);
    const label = labels[labelIndex];
    
    points.push({ x, y, z, label });
  }
  
  console.log(`[Relief] Généré ${points.length} points sur ${count} demandés (tentatives: ${attempts}, niveau: ${level})`);
  
  return points;
}
