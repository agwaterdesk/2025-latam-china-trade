<script>
    import { onMount, onDestroy } from "svelte";
    import mapboxgl from "mapbox-gl";
    import "mapbox-gl/dist/mapbox-gl.css";
    import { dev } from "$app/environment";
    import {
        boundsGeoJsonMap,
        shippingLanesDataMap,
        portsByShippingLane,
        calculateBoundsFromGeoJson,
        extractPortPoints,
        generateStaticImageUrl,
        getPortsForShippingLane,
        calculateDistance,
        calculateCumulativeDistances,
        calculatePartialCoordinates,
        layerConfigs,
        ports,
        getMergedShippingLanes,
    } from "../utils/mapHelpers.js";

    let { activeId, view, defaultView } = $props();

    // Get Mapbox token from environment variables based on environment
    let mapboxToken = dev
        ? import.meta.env.VITE_MAPBOX_TOKEN_DEV || ""
        : import.meta.env.VITE_MAPBOX_TOKEN_PROD || "";

    let mapContainer;
    let map = $state(null);
    let overlayActive = $state(false);

    // Static image overlay state
    let staticImageOverlayUrl = $state(null);
    let staticImageOverlayVisible = $state(false);

    // Port label overlay state (for static map views)
    let portLabelOverlayName = $state(null);

    // Animation state
    let animationFrameId = null;
    let animationStartTime = 0;
    let currentAnimationData = null;
    let portMarkersSource = null;

    // Port label animation state
    let portLabelAnimationFrameId = null;
    let portLabelAnimationStartTime = 0;
    let portLabelAnimationData = null;

    // Stop animation
    const stopAnimation = () => {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        currentAnimationData = null;
    };

    // Stop port label animation
    const stopPortLabelAnimation = () => {
        if (portLabelAnimationFrameId !== null) {
            cancelAnimationFrame(portLabelAnimationFrameId);
            portLabelAnimationFrameId = null;
        }
        portLabelAnimationData = null;
    };

    // Animate port label (line extending from port circle to label)
    const animatePortLabel = (portConfig) => {
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

        stopPortLabelAnimation();

        const animationDuration = 250;
        portLabelAnimationStartTime = performance.now();
        portLabelAnimationData = {
            lineSource,
            textSource,
            portCoordinates: [portLon, portLat],
            lineEndCoordinates: [lineEndLon, lineEndLat],
            labelCoordinates: [labelLon, labelLat],
            name,
            duration: animationDuration,
        };

        const animate = (timestamp) => {
            if (!portLabelAnimationData) return;

            const elapsed = timestamp - portLabelAnimationStartTime;
            const progress = Math.min(
                elapsed / portLabelAnimationData.duration,
                1,
            );

            // Interpolate line from port to line end (stops before marker)
            const [portLon, portLat] = portLabelAnimationData.portCoordinates;
            const [lineEndLon, lineEndLat] =
                portLabelAnimationData.lineEndCoordinates;

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
            lineSource.setData({
                type: "FeatureCollection",
                features: [lineFeature],
            });

            // Show label when line is fully extended
            if (progress >= 1) {
                const textFeature = {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: portLabelAnimationData.labelCoordinates,
                    },
                    properties: {
                        name: portLabelAnimationData.name,
                    },
                };
                textSource.setData({
                    type: "FeatureCollection",
                    features: [textFeature],
                });
                stopPortLabelAnimation();
            } else {
                portLabelAnimationFrameId = requestAnimationFrame(animate);
            }
        };

        // Start with empty line
        lineSource.setData({ type: "FeatureCollection", features: [] });
        textSource.setData({ type: "FeatureCollection", features: [] });

        // Wait for map transition, then start animation
        setTimeout(() => {
            portLabelAnimationStartTime = performance.now();
            portLabelAnimationFrameId = requestAnimationFrame(animate);
        }, 2100);
    };

    // Animate multiple line paths simultaneously based on total path length
    // Handles both LineString and MultiLineString geometries
    // MultiLineString segments animate sequentially to appear as one continuous line
    const animateLine = (source, fullData) => {
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

        stopAnimation();
        animationStartTime = performance.now();

        // Extract all port points from the full data
        const allPortPoints = extractPortPoints(fullData.features);

        currentAnimationData = {
            source,
            featureGroups,
            maxDistance,
            duration: animationDuration,
            allPortPoints,
            portMarkersSource: portMarkersSource,
        };

        const animate = (timestamp) => {
            if (!currentAnimationData) return;

            const elapsed = timestamp - animationStartTime;
            const progress = Math.min(
                elapsed / currentAnimationData.duration,
                1,
            );
            const targetDistance = progress * currentAnimationData.maxDistance;

            // Process each feature group
            const partialFeatures = currentAnimationData.featureGroups.map(
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

            currentAnimationData.source.setData(partialData);

            // Update port markers based on animation progress
            if (
                currentAnimationData.portMarkersSource &&
                currentAnimationData.allPortPoints
            ) {
                const visiblePorts = [];

                currentAnimationData.allPortPoints.forEach((portPoint) => {
                    const isStart = portPoint.properties.type === "start";
                    const featureIndex = portPoint.properties.featureIndex;

                    // Start ports are always visible
                    if (isStart) {
                        visiblePorts.push(portPoint);
                    } else {
                        // End ports appear when animation reaches the end of that feature
                        const featureGroup =
                            currentAnimationData.featureGroups[featureIndex];
                        if (featureGroup) {
                            // Calculate how far along this specific feature should be
                            // Same logic as in the animation: routeTargetDistance = progress * totalDistance
                            const routeTargetDistance =
                                progress * featureGroup.totalDistance;
                            // Show end port when this feature's animation is complete
                            if (
                                routeTargetDistance >=
                                featureGroup.totalDistance
                            ) {
                                visiblePorts.push(portPoint);
                            }
                        }
                    }
                });

                const portMarkersData = {
                    type: "FeatureCollection",
                    features: visiblePorts,
                };

                currentAnimationData.portMarkersSource.setData(portMarkersData);
            }

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                // Ensure all end ports are visible when animation completes
                if (
                    currentAnimationData.portMarkersSource &&
                    currentAnimationData.allPortPoints
                ) {
                    const allPorts = currentAnimationData.allPortPoints;
                    const portMarkersData = {
                        type: "FeatureCollection",
                        features: allPorts,
                    };
                    currentAnimationData.portMarkersSource.setData(
                        portMarkersData,
                    );
                }
                stopAnimation();
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

        // Show start ports immediately
        if (portMarkersSource && currentAnimationData.allPortPoints) {
            const startPorts = currentAnimationData.allPortPoints.filter(
                (p) => p.properties.type === "start",
            );
            const initialPortData = {
                type: "FeatureCollection",
                features: startPorts,
            };
            portMarkersSource.setData(initialPortData);
        }

        // Wait for map transition, then start animation
        setTimeout(() => {
            animationStartTime = performance.now();
            animationFrameId = requestAnimationFrame(animate);
        }, 2100);
    };

    // Update layers based on view configuration
    const updateLayers = (view) => {
        if (!map || !view) return;

        const shouldAnimate = view?.layers?.isAnimated === true;
        console.log("shouldAnimate", view);

        // Get port markers source reference
        const portMarkersSourceObj = map.getSource("shipping-lane-ports");
        if (portMarkersSourceObj) {
            portMarkersSource = portMarkersSourceObj;
        }

        layerConfigs.forEach((config) => {
            const source = map.getSource(config.sourceId);
            const layer = map.getLayer(config.layerId);

            if (source && layer) {
                const newData = config.getData(view);

                // Check if this is the shipping lanes layer and should be animated
                if (
                    config.sourceId === "shipping-lanes" &&
                    shouldAnimate &&
                    newData
                ) {
                    // Don't update data here - animation will handle it
                    animateLine(source, newData);
                } else if (config.sourceId === "shipping-lane-ports") {
                    // Handle port markers separately
                    // Get the shipping lanes data to extract port points from
                    const shippingLanesTypes = view?.layers?.shippingLanes;
                    const shippingLanesData =
                        getMergedShippingLanes(shippingLanesTypes);

                    if (
                        shouldAnimate &&
                        shippingLanesData &&
                        shippingLanesData.features &&
                        shippingLanesData.features.length > 0
                    ) {
                        // For animated routes, ports will be managed by animation
                        // Start with empty, animation will populate
                        source.setData({
                            type: "FeatureCollection",
                            features: [],
                        });
                    } else if (
                        shippingLanesData &&
                        shippingLanesData.features &&
                        shippingLanesData.features.length > 0
                    ) {
                        // For non-animated routes, show all ports immediately
                        const portPoints = extractPortPoints(
                            shippingLanesData.features,
                        );
                        source.setData({
                            type: "FeatureCollection",
                            features: portPoints,
                        });
                    } else {
                        // No shipping lanes data, clear ports
                        source.setData({
                            type: "FeatureCollection",
                            features: [],
                        });
                    }
                } else if (newData && source.type === "geojson") {
                    // Normal update for non-animated layers
                    try {
                        source.setData(newData);
                    } catch (error) {
                        console.error(
                            `Error updating data for ${config.sourceId}:`,
                            error,
                        );
                    }
                }

                // Update visibility
                const visibility = config.getVisibility(view);
                map.setLayoutProperty(config.layerId, "visibility", visibility);

                // Update paint properties if getPaint function exists (for dynamic paint configs)
                if (config.getPaint && typeof config.getPaint === "function") {
                    const paintConfig = config.getPaint(view);
                    Object.keys(paintConfig).forEach((property) => {
                        map.setPaintProperty(
                            config.layerId,
                            property,
                            paintConfig[property],
                        );
                    });
                }
            }
        });
    };

    let controller = {
        updateView: (view, id) => {
            if (!map) return;

            // Use view if available, otherwise fall back to defaultView
            const currentView = view || defaultView;
            if (currentView) {
                // Handle static image overlay for views with satellite basemap
                const shouldShowStaticOverlay =
                    currentView.basemap === "satellite";

                if (shouldShowStaticOverlay) {
                    // Generate and set the static image URL from view config
                    const imageUrl = generateStaticImageUrl(
                        currentView,
                        mapboxToken,
                    );
                    if (imageUrl) {
                        staticImageOverlayUrl = imageUrl;
                        // Hide initially, will fade in after map transition
                        staticImageOverlayVisible = false;
                    }
                    // Set port label name for overlay from view config
                    if (currentView.layers?.animatedPortLabel?.name) {
                        portLabelOverlayName =
                            currentView.layers.animatedPortLabel.name;
                    } else {
                        portLabelOverlayName = null;
                    }
                } else {
                    // Hide overlay for other views
                    staticImageOverlayVisible = false;
                    staticImageOverlayUrl = null;
                    portLabelOverlayName = null;
                }

                // Update all layers based on configuration
                updateLayers(currentView);

                // Update map view/camera
                let transitionComplete = false;
                if (currentView.bounds) {
                    // Calculate bounds from GeoJSON using Turf
                    const bounds = calculateBoundsFromGeoJson(
                        currentView.bounds,
                    );
                    if (bounds) {
                        map.fitBounds(bounds, {
                            padding: 50,
                            duration: 2000,
                            pitch: currentView.pitch || 0,
                            bearing: currentView.bearing || 0,
                        });
                        transitionComplete = true;
                    }
                } else if (currentView.bbox) {
                    // Use bbox to fit the map to the specified bounds
                    map.fitBounds(currentView.bbox, {
                        padding: 50,
                        duration: 2000,
                        pitch: currentView.pitch || 0,
                        bearing: currentView.bearing || 0,
                    });
                    transitionComplete = true;
                } else if (currentView.center) {
                    // Use center/zoom positioning
                    map.flyTo({
                        center: currentView.center,
                        zoom: currentView.zoom || 0,
                        pitch: currentView.pitch || 0,
                        bearing: currentView.bearing || 0,
                        duration: 2000,
                    });
                    transitionComplete = true;
                }

                // Fade in static image overlay after map transition completes
                if (shouldShowStaticOverlay && transitionComplete) {
                    setTimeout(() => {
                        staticImageOverlayVisible = true;
                    }, 2100); // Match the map transition duration (2000ms) + small delay
                }

                // Handle animated port label (only for non-static map views)
                if (
                    currentView.layers?.animatedPortLabel &&
                    !shouldShowStaticOverlay
                ) {
                    animatePortLabel(currentView.layers.animatedPortLabel);
                } else {
                    // Clear animated port label if not in view
                    stopPortLabelAnimation();
                    const lineSource = map.getSource(
                        "animated-port-label-line",
                    );
                    const textSource = map.getSource(
                        "animated-port-label-text",
                    );
                    if (lineSource)
                        lineSource.setData({
                            type: "FeatureCollection",
                            features: [],
                        });
                    if (textSource)
                        textSource.setData({
                            type: "FeatureCollection",
                            features: [],
                        });
                }
            }
        },
    };
    $effect(() => {
        // Track map, view, and activeId changes
        // Explicitly reference these to ensure effect tracks them
        map; // Track map state changes
        view; // Track view changes
        activeId; // Track activeId changes

        // updateView already checks if map exists, so we can call it directly
        // It will use defaultView if view is undefined
        controller.updateView(view, activeId);
    });

    onMount(() => {
        if (!mapboxToken) {
            console.warn("Mapbox token not provided");
            return;
        }

        mapboxgl.accessToken = mapboxToken;

        map = new mapboxgl.Map({
            container: mapContainer,
            style: "mapbox://styles/agwaterdesk/cmgs9bwhf006o01s3d7afejgl",
            projection: "mercator",
            center: [-100, 40],
            zoom: 2,
            pitch: 0,
            bearing: 0,
        });

        map.on("load", () => {
            // Add atmosphere effect for the globe
            map.setFog({
                color: "#eeeeee",
                "high-color": "#ffffff",
                "horizon-blend": 0.02,
                "space-color": "#ffffff",
                "star-intensity": 0,
            });

            // Add all layers from configuration
            const initialView = view || defaultView || {};
            layerConfigs.forEach((config) => {
                // Add data source
                const initialData = config.getData(initialView);

                // Validate data structure
                if (!initialData || !initialData.type) {
                    console.error(
                        `Invalid data for ${config.sourceId}:`,
                        initialData,
                    );
                    return;
                }

                map.addSource(config.sourceId, {
                    type: "geojson",
                    data: initialData,
                });

                // Get paint configuration (use getPaint if available, otherwise use static paint)
                const paintConfig =
                    config.getPaint && typeof config.getPaint === "function"
                        ? config.getPaint(initialView)
                        : config.paint;

                // Add layer
                map.addLayer({
                    id: config.layerId,
                    type: config.type,
                    source: config.sourceId,
                    layout: config.layout,
                    paint: paintConfig,
                });
            });

            // Trigger initial view update now that map is loaded
            // The effect will handle subsequent updates when view/activeId changes
            const viewToUse = view || defaultView;
            if (viewToUse) {
                controller.updateView(viewToUse, activeId);
            }

            // Set the atmosphere
            // map.setTerrain({ source: "mapbox-dem", exaggeration: 0 });
        });
    });

    onDestroy(() => {
        stopAnimation();
        stopPortLabelAnimation();
        if (map) {
            map.remove();
        }
    });
</script>

<div bind:this={mapContainer} class="map-container">
    {#if staticImageOverlayUrl}
        <img
            src={staticImageOverlayUrl}
            alt="Port satellite view"
            class="static-image-overlay"
            class:visible={staticImageOverlayVisible}
        />
    {/if}

    {#if staticImageOverlayVisible && portLabelOverlayName}
        {@const portName = portLabelOverlayName}
        <div class="port-label-overlay">
            <div class="port-marker"></div>
            <div class="port-line"></div>
            <div class="port-label">{portName}</div>
        </div>
    {/if}
</div>

<style lang="scss">
    .map-container {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .static-image-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        pointer-events: none;
        opacity: 0;
        transition: opacity 1s ease-in-out;
        z-index: 10;

        &.visible {
            opacity: 1;
        }
    }

    .port-label-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 20;
    }

    .port-marker {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 11px;
        height: 11px;
        background: #d98e1d;
        border-radius: 50%;
        border: 2px solid #ffffff;
        z-index: 20;
        // opacity: 0;
        // animation: markerFadeIn 0.3s ease-out 2.4s forwards;
    }

    .port-line {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translate(-50%, -100%);
        width: 1px;
        height: 0;
        background: #ffffff;
        transform-origin: top center;
        opacity: 0;
        z-index: 10;
        animation: lineExtend 0.25s ease-out 0.5s forwards;
    }

    .port-label {
        position: absolute;
        top: -40px;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ffffff;
        font-size: 14px;
        font-weight: bold;
        white-space: nowrap;
        text-shadow:
            0 0 2px #000000,
            0 0 4px #000000,
            0 0 6px #000000;
        opacity: 0;
        animation: labelFadeIn 0.3s ease-out 0.75s forwards;
    }

    @keyframes markerFadeIn {
        from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
    }

    @keyframes lineExtend {
        from {
            height: 0;
            opacity: 0;
        }
        to {
            height: 30px;
            opacity: 1;
        }
    }

    @keyframes labelFadeIn {
        from {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(5px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0);
        }
    }
</style>
