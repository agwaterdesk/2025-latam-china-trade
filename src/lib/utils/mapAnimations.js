import {
    calculateCumulativeDistances,
    calculatePartialCoordinates,
    getPortMarkersForShippingLane,
} from "./mapHelpers.js";

/**
 * Manages animation state and provides methods for animating shipping lanes
 */
export class ShippingLaneAnimator {
    constructor() {
        this.animationFrameId = null;
        this.animationStartTime = 0;
        this.currentAnimationData = null;
        this.portMarkersSource = null;
    }

    /**
     * Set the port markers source reference
     * @param {Object} source - Mapbox source object for port markers
     */
    setPortMarkersSource(source) {
        this.portMarkersSource = source;
    }

    /**
     * Stop the current animation
     */
    stopAnimation() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.currentAnimationData = null;
    }

    /**
     * Animate multiple line paths simultaneously based on total path length
     * Handles both LineString and MultiLineString geometries
     * MultiLineString segments animate sequentially to appear as one continuous line
     * @param {Object} source - Mapbox source object for shipping lanes
     * @param {Object} fullData - Full GeoJSON FeatureCollection to animate
     * @param {Object} view - View configuration object
     */
    animateLine(source, fullData, view) {
        if (
            !source ||
            !fullData ||
            !fullData.features ||
            fullData.features.length === 0
        )
            return;

        // Process features and group segments by feature
        const featureGroups = [];

        fullData.features.forEach((feature) => {
            if (!feature.geometry) return;

            const geometryType = feature.geometry.type;

            if (geometryType === "LineString") {
                const coordinates = feature.geometry.coordinates;
                if (coordinates.length > 0) {
                    const { cumulative, total } =
                        calculateCumulativeDistances(coordinates);
                    featureGroups.push({
                        feature,
                        geometryType: "LineString",
                        segments: [
                            {
                                coordinates,
                                cumulativeDistances: cumulative,
                                totalDistance: total,
                            },
                        ],
                        totalDistance: total,
                    });
                }
            } else if (geometryType === "MultiLineString") {
                const multiCoordinates = feature.geometry.coordinates;
                const segments = [];
                let totalDistance = 0;

                // Process each segment and calculate cumulative distances across all segments
                multiCoordinates.forEach((lineCoordinates, index) => {
                    if (lineCoordinates.length > 0) {
                        const { cumulative, total: segmentTotal } =
                            calculateCumulativeDistances(lineCoordinates);
                        segments.push({
                            coordinates: lineCoordinates,
                            cumulativeDistances: cumulative,
                            totalDistance: segmentTotal,
                            segmentIndex: index,
                            cumulativeDistanceFromStart: totalDistance, // Distance from start of route
                        });
                        totalDistance += segmentTotal;
                    }
                });

                if (segments.length > 0) {
                    featureGroups.push({
                        feature,
                        geometryType: "MultiLineString",
                        segments,
                        totalDistance,
                    });
                }
            }
        });

        if (featureGroups.length === 0) return;

        // Use the longest route's total distance to determine animation duration
        const maxDistance = Math.max(
            ...featureGroups.map((fg) => fg.totalDistance),
        );
        const animationDuration = 1000;

        this.stopAnimation();
        this.animationStartTime = performance.now();

        // Get port points from portsByShippingLane instead of extracting from path
        const shippingLanesTypes = view?.layers?.shippingLanes;
        const allPortPoints = getPortMarkersForShippingLane(shippingLanesTypes).features;

        this.currentAnimationData = {
            source,
            featureGroups,
            maxDistance,
            duration: animationDuration,
            allPortPoints,
            portMarkersSource: this.portMarkersSource,
        };

        const animate = (timestamp) => {
            if (!this.currentAnimationData) return;

            const elapsed = timestamp - this.animationStartTime;
            const progress = Math.min(
                elapsed / this.currentAnimationData.duration,
                1,
            );
            const targetDistance = progress * this.currentAnimationData.maxDistance;

            // Process each feature group
            const partialFeatures = this.currentAnimationData.featureGroups.map(
                ({ feature, geometryType, segments, totalDistance }) => {
                    // Calculate how far along this route we should be
                    const routeTargetDistance = progress * totalDistance;

                    if (geometryType === "LineString") {
                        // Single LineString - animate normally
                        const segment = segments[0];
                        const partialCoordinates = calculatePartialCoordinates(
                            segment.coordinates,
                            segment.cumulativeDistances,
                            routeTargetDistance,
                        );

                        return {
                            ...feature,
                            geometry: {
                                type: "LineString",
                                coordinates: partialCoordinates,
                            },
                        };
                    } else if (geometryType === "MultiLineString") {
                        // MultiLineString - animate segments sequentially
                        const partialSegments = [];

                        for (let i = 0; i < segments.length; i++) {
                            const segment = segments[i];
                            const segmentStartDistance =
                                segment.cumulativeDistanceFromStart;
                            const segmentEndDistance =
                                segmentStartDistance + segment.totalDistance;

                            if (routeTargetDistance >= segmentEndDistance) {
                                // This segment is fully drawn
                                partialSegments.push(segment.coordinates);
                            } else if (
                                routeTargetDistance > segmentStartDistance
                            ) {
                                // This segment is partially drawn
                                const segmentProgress =
                                    routeTargetDistance - segmentStartDistance;
                                const partialCoordinates =
                                    calculatePartialCoordinates(
                                        segment.coordinates,
                                        segment.cumulativeDistances,
                                        segmentProgress,
                                    );
                                partialSegments.push(partialCoordinates);
                                break; // Stop here, subsequent segments haven't started
                            } else {
                                // This segment hasn't started yet
                                break;
                            }
                        }

                        return {
                            ...feature,
                            geometry: {
                                type: "MultiLineString",
                                coordinates: partialSegments,
                            },
                        };
                    }
                },
            );

            const partialData = {
                type: "FeatureCollection",
                features: partialFeatures,
            };

            this.currentAnimationData.source.setData(partialData);

            // Update port markers - show all ports from portsByShippingLane
            // Since ports are now manually defined, we show them all immediately
            if (
                this.currentAnimationData.portMarkersSource &&
                this.currentAnimationData.allPortPoints
            ) {
                const portMarkersData = {
                    type: "FeatureCollection",
                    features: this.currentAnimationData.allPortPoints,
                };

                this.currentAnimationData.portMarkersSource.setData(portMarkersData);
            }

            if (progress < 1) {
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                // Ensure all ports are visible when animation completes
                if (
                    this.currentAnimationData.portMarkersSource &&
                    this.currentAnimationData.allPortPoints
                ) {
                    const portMarkersData = {
                        type: "FeatureCollection",
                        features: this.currentAnimationData.allPortPoints,
                    };
                    this.currentAnimationData.portMarkersSource.setData(
                        portMarkersData,
                    );
                }
                this.stopAnimation();
            }
        };

        // Start with empty lines
        const emptyFeatures = fullData.features.map((feature) => {
            if (feature.geometry.type === "LineString") {
                return {
                    ...feature,
                    geometry: {
                        type: "LineString",
                        coordinates: [],
                    },
                };
            } else if (feature.geometry.type === "MultiLineString") {
                return {
                    ...feature,
                    geometry: {
                        type: "MultiLineString",
                        coordinates: feature.geometry.coordinates.map(() => []),
                    },
                };
            }
            return feature;
        });

        const emptyData = {
            type: "FeatureCollection",
            features: emptyFeatures,
        };
        source.setData(emptyData);

        // Show all ports immediately (ports are now manually defined in portsByShippingLane)
        if (this.portMarkersSource && this.currentAnimationData.allPortPoints) {
            const initialPortData = {
                type: "FeatureCollection",
                features: this.currentAnimationData.allPortPoints,
            };
            this.portMarkersSource.setData(initialPortData);
        }

        // Wait for map transition, then start animation
        setTimeout(() => {
            this.animationStartTime = performance.now();
            this.animationFrameId = requestAnimationFrame(animate);
        }, 2100);
    }
}

/**
 * Manages animation state and provides methods for animating port labels
 */
export class PortLabelAnimator {
    constructor() {
        this.animationFrameId = null;
        this.animationStartTime = 0;
        this.currentAnimationData = null;
    }

    /**
     * Stop the current port label animation
     */
    stopAnimation() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.currentAnimationData = null;
    }

    /**
     * Animate port label (line extending from port circle to label)
     * @param {Object} map - Mapbox map instance
     * @param {Object} portConfig - Port configuration with coordinates, name, and optional offset
     */
    animatePortLabel(map, portConfig) {
        if (!map || !portConfig) return;

        const lineSource = map.getSource("animated-port-label-line");
        const textSource = map.getSource("animated-port-label-text");

        if (!lineSource || !textSource) return;

        const { coordinates, name, offset = [0, 0.006] } = portConfig;
        const [portLon, portLat] = coordinates;

        // Calculate line end position (shorter, stops before marker)
        const [offsetLon, offsetLat] = offset;
        const lineEndLon = portLon + offsetLon * 0.8; // Line stops at 80% of offset
        const lineEndLat = portLat + offsetLat * 0.8;

        // Calculate label position (at end of line, with small additional offset upward)
        const labelLon = lineEndLon;
        const labelLat = lineEndLat + 0.001; // Small additional offset above line end

        this.stopAnimation();

        const animationDuration = 250;
        this.animationStartTime = performance.now();
        this.currentAnimationData = {
            lineSource,
            textSource,
            portCoordinates: [portLon, portLat],
            lineEndCoordinates: [lineEndLon, lineEndLat],
            labelCoordinates: [labelLon, labelLat],
            name,
            duration: animationDuration,
        };

        const animate = (timestamp) => {
            if (!this.currentAnimationData) return;

            const elapsed = timestamp - this.animationStartTime;
            const progress = Math.min(
                elapsed / this.currentAnimationData.duration,
                1,
            );

            // Interpolate line from port to line end (stops before marker)
            const [portLon, portLat] = this.currentAnimationData.portCoordinates;
            const [lineEndLon, lineEndLat] =
                this.currentAnimationData.lineEndCoordinates;

            const currentLon = portLon + (lineEndLon - portLon) * progress;
            const currentLat = portLat + (lineEndLat - portLat) * progress;

            // Update line (stops before reaching marker)
            const lineFeature = {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: [
                        [portLon, portLat],
                        [currentLon, currentLat],
                    ],
                },
            };
            this.currentAnimationData.lineSource.setData({
                type: "FeatureCollection",
                features: [lineFeature],
            });

            // Show label when line is fully extended
            if (progress >= 1) {
                const textFeature = {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: this.currentAnimationData.labelCoordinates,
                    },
                    properties: {
                        name: this.currentAnimationData.name,
                    },
                };
                this.currentAnimationData.textSource.setData({
                    type: "FeatureCollection",
                    features: [textFeature],
                });
                this.stopAnimation();
            } else {
                this.animationFrameId = requestAnimationFrame(animate);
            }
        };

        // Start with empty line
        lineSource.setData({ type: "FeatureCollection", features: [] });
        textSource.setData({ type: "FeatureCollection", features: [] });

        // Wait for map transition, then start animation
        setTimeout(() => {
            this.animationStartTime = performance.now();
            this.animationFrameId = requestAnimationFrame(animate);
        }, 2100);
    }
}
