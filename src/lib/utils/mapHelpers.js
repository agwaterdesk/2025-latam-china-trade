// ============================================================================
// IMPORTS
// ============================================================================

import bbox from "@turf/bbox";
import us_china_north from "../data/us_china_north.json";
import us_china_south from "../data/us_china_south.json";
import shippingLanesLatAmChina from "../data/Shipping_Lanes_LatAm_China.json";
import shippingLanesChancayChina from "../data/Shipping_Lanes_Chancay_China.json";
import shippingLanesOldChina from "../data/Shipping_Lanes_Old_China.json";
import ports from "../data/ports.json";
import getValueFromCSSVar from "./getValueFromCSSVar";

// ============================================================================
// CONSTANTS AND DATA CONFIGURATIONS
// ============================================================================

const usColor = getValueFromCSSVar("--color-theme-us");
const latamColor = getValueFromCSSVar("--color-theme-latam");
const chinaColor = getValueFromCSSVar("--color-theme-china");

// Default color for shipping lanes (used as fallback)
const DEFAULT_SHIPPING_LANE_COLOR = "#ff6b35";

// Export ports for use in layer configs
export { ports };

// Map bounds keys to their corresponding GeoJSON data
export const boundsGeoJsonMap = {
    latam_china: shippingLanesLatAmChina,
    us_china: us_china_north,
    china_latam_chancay_route: shippingLanesChancayChina,
    old_china: shippingLanesOldChina,
    latam_ports: ports,
};

// Map shipping lane types to their data
export const shippingLanesDataMap = {
    us_china_north: us_china_north,
    us_china_south: us_china_south,
    latam_china: shippingLanesLatAmChina,
    china_latam_chancay_route: shippingLanesChancayChina,
    old_china: shippingLanesOldChina,
};

// Hardcoded port coordinates by shipping lane type
// Each port can have: name, coordinates, and color
export const portsByShippingLane = {
    us_china: [
        {
            name: "Gulf Coast export terminals",
            coordinates: [-89.799323, 29.344631],
            color: usColor,
        },
        {
            name: "Pacific Northwest export terminals",
            coordinates: [-124.835138, 48.484726],
            color: usColor,
        },
        {
            name: "Southern China ports",
            coordinates: [114.391855, 22.26097],
            color: chinaColor,
        },
        {
            name: "Northern China ports",
            coordinates: [117.9907, 38.834611],
            color: chinaColor,
        },
    ],
    latam_china: [
        // Add LatAm-China ports here when needed
    ],
    china_latam_chancay_route: [
        // Add Chancay-China ports here when needed
    ],
    old_china: [
        // Add old China ports here when needed
    ],
};

// ============================================================================
// GEOGRAPHIC CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate bounds from GeoJSON data using Turf
 * @param {string} boundsKey - Key to lookup in boundsGeoJsonMap
 * @returns {Array|null} Bbox array [minX, minY, maxX, maxY] or null if error
 */
export const calculateBoundsFromGeoJson = (boundsKey) => {
    const geoJsonData = boundsGeoJsonMap[boundsKey];
    if (!geoJsonData) {
        return null;
    }
    try {
        const calculatedBbox = bbox(geoJsonData);
        // Turf bbox returns [minX, minY, maxX, maxY] which matches [west, south, east, north] format
        return calculatedBbox;
    } catch (error) {
        console.error(`Error calculating bounds for ${boundsKey}:`, error);
        return null;
    }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coord1 - [lon, lat] of first point
 * @param {Array} coord2 - [lon, lat] of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (coord1, coord2) => {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Calculate cumulative distances along a path
 * @param {Array} coordinates - Array of [lon, lat] coordinates
 * @returns {Object} Object with cumulative array and total distance
 */
export const calculateCumulativeDistances = (coordinates) => {
    const cumulative = [0];
    let total = 0;
    
    for (let i = 1; i < coordinates.length; i++) {
        const distance = calculateDistance(coordinates[i - 1], coordinates[i]);
        total += distance;
        cumulative.push(total);
    }
    
    return { cumulative, total };
};

/**
 * Calculate partial coordinates for a line based on target distance
 * @param {Array} coordinates - Full array of [lon, lat] coordinates
 * @param {Array} cumulativeDistances - Cumulative distances array
 * @param {number} targetDistance - Target distance along the path
 * @returns {Array} Partial array of coordinates up to target distance
 */
export const calculatePartialCoordinates = (coordinates, cumulativeDistances, targetDistance) => {
    if (coordinates.length === 0) return [];
    if (targetDistance <= 0) return [];
    if (targetDistance >= cumulativeDistances[cumulativeDistances.length - 1]) {
        return coordinates;
    }

    // Find which segment we're in and how far along it
    let segmentIndex = 0;
    let segmentProgress = 0;
    
    for (let i = 0; i < cumulativeDistances.length - 1; i++) {
        const segmentStart = cumulativeDistances[i];
        const segmentEnd = cumulativeDistances[i + 1];
        
        if (targetDistance >= segmentStart && targetDistance <= segmentEnd) {
            segmentIndex = i;
            const segmentDistance = segmentEnd - segmentStart;
            segmentProgress = segmentDistance > 0 
                ? (targetDistance - segmentStart) / segmentDistance 
                : 0;
            break;
        } else if (targetDistance < segmentStart) {
            segmentIndex = i;
            segmentProgress = 0;
            break;
        }
    }

    // If we've passed all segments, use the last coordinate
    if (targetDistance >= cumulativeDistances[cumulativeDistances.length - 1]) {
        segmentIndex = coordinates.length - 2;
        segmentProgress = 1;
    }

    // Build the partial path: all coordinates up to segmentIndex, plus interpolated point
    const partialCoordinates = coordinates.slice(0, segmentIndex + 1);
    
    // If we're partway through a segment, add an interpolated point
    if (segmentProgress > 0 && segmentIndex < coordinates.length - 1) {
        const [lon1, lat1] = coordinates[segmentIndex];
        const [lon2, lat2] = coordinates[segmentIndex + 1];
        
        // Linear interpolation between coordinates
        const interpolatedLon = lon1 + (lon2 - lon1) * segmentProgress;
        const interpolatedLat = lat1 + (lat2 - lat1) * segmentProgress;
        
        partialCoordinates.push([interpolatedLon, interpolatedLat]);
    }

    return partialCoordinates;
};

// ============================================================================
// SHIPPING LANE FUNCTIONS
// ============================================================================

/**
 * Merge multiple shipping lane datasets and add laneType property to each feature
 * @param {string|Array<string>|Array<{id: string, color: string}>} shippingLanesConfig - 
 *   Single type string, array of type strings, or array of objects with id and color
 * @returns {Object} Merged GeoJSON FeatureCollection with laneType property
 */
export const getMergedShippingLanes = (shippingLanesConfig) => {
    if (!shippingLanesConfig) {
        return { type: "FeatureCollection", features: [] };
    }

    // Normalize to array of objects with id
    let laneConfigs = [];
    
    if (typeof shippingLanesConfig === "string") {
        // Single string - backward compatibility
        laneConfigs = [{ id: shippingLanesConfig }];
    } else if (Array.isArray(shippingLanesConfig)) {
        // Array - check if objects or strings
        laneConfigs = shippingLanesConfig.map((item) => {
            if (typeof item === "string") {
                // Backward compatibility: string becomes object with id
                return { id: item };
            }
            // Already an object with id and color
            return item;
        });
    }
    
    const allFeatures = [];
    
    laneConfigs.forEach((config) => {
        const type = config.id;
        const data = shippingLanesDataMap[type];
        if (data && data.features) {
            // Add laneType property to each feature
            const featuresWithType = data.features.map((feature) => ({
                ...feature,
                properties: {
                    ...feature.properties,
                    laneType: type,
                },
            }));
            allFeatures.push(...featuresWithType);
        }
    });
    
    return {
        type: "FeatureCollection",
        features: allFeatures,
    };
};

/**
 * Generate paint configuration for shipping lanes based on view's color mapping
 * @param {Object} view - View configuration object
 * @returns {Object} Paint configuration with data-driven line-color
 */
const getShippingLanesPaint = (view) => {
    const shippingLanesConfig = view?.layers?.shippingLanes;
    
    if (!shippingLanesConfig) {
        return {
            "line-color": DEFAULT_SHIPPING_LANE_COLOR,
            "line-width": 3,
            "line-opacity": 0.8,
            "line-dasharray": [1, 2],
        };
    }
    
    // Normalize to array of objects with id and color
    let laneConfigs = [];
    
    if (typeof shippingLanesConfig === "string") {
        // Single string - backward compatibility
        laneConfigs = [{ id: shippingLanesConfig, color: DEFAULT_SHIPPING_LANE_COLOR }];
    } else if (Array.isArray(shippingLanesConfig)) {
        // Array - check if objects or strings
        laneConfigs = shippingLanesConfig.map((item) => {
            if (typeof item === "string") {
                // Backward compatibility: string becomes object with id and default color
                return { id: item, color: DEFAULT_SHIPPING_LANE_COLOR };
            }
            // Already an object with id and color
            return { id: item.id, color: item.color || DEFAULT_SHIPPING_LANE_COLOR };
        });
    }
    
    // Build match expression for colors
    const matchCases = [];
    
    laneConfigs.forEach((config) => {
        matchCases.push(config.id, config.color);
    });
    
    // Build the match expression
    const lineColorExpression = matchCases.length > 0
        ? [
            "match",
            ["get", "laneType"],
            ...matchCases,
            DEFAULT_SHIPPING_LANE_COLOR // default fallback
        ]
        : DEFAULT_SHIPPING_LANE_COLOR; // fallback if no configs
    
    return {
        "line-color": lineColorExpression,
        "line-width": 3,
        "line-opacity": 0.8,
        "line-dasharray": [1, 2],
    };
};

// ============================================================================
// PORT FUNCTIONS
// ============================================================================

/**
 * Extract start and end points from GeoJSON features
 * @param {Array} features - Array of GeoJSON features
 * @returns {Array} Array of point features with type (start/end) and featureIndex
 */
export const extractPortPoints = (features) => {
    const points = [];
    
    features.forEach((feature, featureIndex) => {
        if (!feature.geometry) return;
        
        const geometryType = feature.geometry.type;
        
        if (geometryType === "LineString") {
            const coordinates = feature.geometry.coordinates;
            if (coordinates.length > 0) {
                // Start point
                points.push({
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: coordinates[0],
                    },
                    properties: {
                        type: "start",
                        featureIndex,
                    },
                });
                // End point
                points.push({
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: coordinates[coordinates.length - 1],
                    },
                    properties: {
                        type: "end",
                        featureIndex,
                    },
                });
            }
        } else if (geometryType === "MultiLineString") {
            const multiCoordinates = feature.geometry.coordinates;
            if (multiCoordinates.length > 0) {
                // Start point (first coordinate of first segment)
                const firstSegment = multiCoordinates[0];
                if (firstSegment.length > 0) {
                    points.push({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: firstSegment[0],
                        },
                        properties: {
                            type: "start",
                            featureIndex,
                        },
                    });
                }
                // End point (last coordinate of last segment)
                const lastSegment = multiCoordinates[multiCoordinates.length - 1];
                if (lastSegment.length > 0) {
                    points.push({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: lastSegment[lastSegment.length - 1],
                        },
                        properties: {
                            type: "end",
                            featureIndex,
                        },
                    });
                }
            }
        }
    });
    
    return points;
};

/**
 * Get ports for a shipping lane type as GeoJSON FeatureCollection (for labels)
 * @param {string} shippingLanesType - Type of shipping lane
 * @returns {Object} GeoJSON FeatureCollection of port points
 */
export const getPortLabelsForShippingLane = (shippingLanesType) => {
    const ports = portsByShippingLane[shippingLanesType];
    if (!ports || ports.length === 0) {
        return { type: "FeatureCollection", features: [] };
    }
    
    const features = ports.map((port) => ({
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: port.coordinates,
        },
        properties: {
            name: port.name,
            color: port.color,
        },
    }));
    
    return { type: "FeatureCollection", features };
};

/**
 * Get port markers for a shipping lane type as GeoJSON FeatureCollection (for port circles)
 * @param {string|Array<string>|Array<{id: string, color: string}>} shippingLanesConfig - 
 *   Single type string, array of type strings, or array of objects with id and color
 * @returns {Object} GeoJSON FeatureCollection of port marker points with colors
 */
export const getPortMarkersForShippingLane = (shippingLanesConfig) => {
    if (!shippingLanesConfig) {
        return { type: "FeatureCollection", features: [] };
    }

    // Normalize to array of shipping lane type strings
    let laneTypes = [];
    
    if (typeof shippingLanesConfig === "string") {
        laneTypes = [shippingLanesConfig];
    } else if (Array.isArray(shippingLanesConfig)) {
        laneTypes = shippingLanesConfig.map((item) => {
            if (typeof item === "string") {
                return item;
            }
            return item.id; // Extract id from object config
        });
    }
    
    const allPorts = [];
    const seenPorts = new Set(); // Track ports by coordinates to avoid duplicates
    
    laneTypes.forEach((laneType) => {
        // Try exact match first
        let ports = portsByShippingLane[laneType];
        
        // If no exact match, try fallback by removing suffix (e.g., us_china_north -> us_china)
        if (!ports || ports.length === 0) {
            const parts = laneType.split('_');
            if (parts.length > 2) {
                // Try with first two parts (e.g., us_china from us_china_north)
                const fallbackKey = parts.slice(0, 2).join('_');
                ports = portsByShippingLane[fallbackKey];
            }
        }
        
        if (ports && ports.length > 0) {
            ports.forEach((port) => {
                // Create a unique key for this port to avoid duplicates
                const portKey = `${port.coordinates[0]},${port.coordinates[1]}`;
                if (!seenPorts.has(portKey)) {
                    seenPorts.add(portKey);
                    allPorts.push({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: port.coordinates,
                        },
                        properties: {
                            name: port.name,
                            color: port.color,
                        },
                    });
                }
            });
        }
    });
    
    return { type: "FeatureCollection", features: allPorts };
};

// ============================================================================
// MAPBOX/VIEW UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate Mapbox static image URL from view config
 * @param {Object} view - View configuration object with center and zoom
 * @param {string} mapboxToken - Mapbox access token
 * @returns {string|null} Static image URL or null if invalid
 */
export const generateStaticImageUrl = (view, mapboxToken) => {
    if (!view || !view.center || !view.zoom || !mapboxToken) return null;
    
    const [lon, lat] = view.center;
    const zoom = view.zoom;
    // Use a large size that will scale to fit the container
    // Using @2x for retina displays
    const width = 700;
    const height = 700;
    
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lon},${lat},${zoom}/${width}x${height}@2x?access_token=${mapboxToken}`;
};

// ============================================================================
// LAYER CONFIGURATION
// ============================================================================

/**
 * Layer configuration array for Mapbox layers
 * Each config defines source, layer, data getter, and visibility logic
 */
export const layerConfigs = [
    {
        sourceId: "shipping-lanes",
        layerId: "shipping-lanes",
        getData: (view) => {
            const shippingLanesTypes = view?.layers?.shippingLanes;
            return getMergedShippingLanes(shippingLanesTypes);
        },
        type: "line",
        layout: {
            "line-join": "round",
            "line-cap": "round",
            visibility: "none", // Initially hidden
        },
        getPaint: (view) => getShippingLanesPaint(view),
        paint: {
            "line-color": DEFAULT_SHIPPING_LANE_COLOR,
            "line-width": 3,
            "line-opacity": 0.8,
            "line-dasharray": [1, 2],
        },
        getVisibility: (view) => {
            return view?.layers?.shippingLanes ? "visible" : "none";
        },
    },
    {
        sourceId: "animated-port-label-line",
        layerId: "animated-port-label-line",
        getData: () => ({ type: "FeatureCollection", features: [] }),
        type: "line",
        layout: {
            visibility: "none",
        },
        paint: {
            "line-color": "#ffffff",
            "line-width": 1,
            "line-opacity": 1,
        },
        getVisibility: (view) => {
            return view?.layers?.animatedPortLabel ? "visible" : "none";
        },
    },
    {
        sourceId: "latam-ports",
        layerId: "latam-ports",
        getData: () => ports,
        type: "circle",
        layout: {
            visibility: "none", // Initially hidden
        },
        paint: {
            "circle-color": latamColor,
            "circle-radius": 6,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 1,
        },
        getVisibility: (view) => {
            const shouldShow = !!view?.layers?.latam_ports;
            return shouldShow ? "visible" : "none";
        },
    },
    {
        sourceId: "shipping-lane-ports",
        layerId: "shipping-lane-ports",
        getData: (view) => {
            const shippingLanesTypes = view?.layers?.shippingLanes;
            return getPortMarkersForShippingLane(shippingLanesTypes);
        },
        type: "circle",
        layout: {
            visibility: "none", // Initially hidden
        },
        paint: {
            "circle-color": ["get", "color"], // Data-driven color from port properties
            "circle-radius": 6,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 1,
        },
        getVisibility: (view) => {
            return view?.layers?.shippingLanes ? "visible" : "none";
        },
    },
    {
        sourceId: "port-labels",
        layerId: "port-labels",
        getData: (view) => {
            const portLabelsType = view?.layers?.portLabels;
            if (!portLabelsType) return { type: "FeatureCollection", features: [] };
            return getPortLabelsForShippingLane(portLabelsType);
        },
        type: "symbol",
        layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans", "Arial Unicode MS Bold"],
            "text-size": 12,
            "text-offset": [0, 0.75],
            "text-anchor": "top",
            visibility: "none", // Initially hidden
        },
        paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 2,
            "text-halo-blur": 1,
        },
        getVisibility: (view) => {
            return view?.layers?.portLabels ? "visible" : "none";
        },
    },
    {
        sourceId: "animated-port-label-text",
        layerId: "animated-port-label-text",
        getData: () => ({ type: "FeatureCollection", features: [] }),
        type: "symbol",
        layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans", "Arial Unicode MS Bold"],
            "text-size": 14,
            "text-anchor": "center",
            "text-offset": [0, -0.5],
            visibility: "none",
        },
        paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 2,
            "text-halo-blur": 1,
        },
        getVisibility: (view) => {
            return view?.layers?.animatedPortLabel ? "visible" : "none";
        },
    },
];
