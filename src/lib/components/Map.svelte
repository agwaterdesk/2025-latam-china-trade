<script>
    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import mapboxgl from "mapbox-gl";
    import "mapbox-gl/dist/mapbox-gl.css";
    import { dev } from "$app/environment";
    import {
        boundsGeoJsonMap,
        shippingLanesDataMap,
        calculateBoundsFromGeoJson,
        extractPortPoints,
        generateStaticImageUrl,
        getPortLabelsForShippingLane,
        getPortMarkersForShippingLane,
        calculateDistance,
        layerConfigs,
        ports,
        getMergedShippingLanes,
    } from "../utils/mapHelpers.js";
    import {
        ShippingLaneAnimator,
        PortLabelAnimator,
    } from "../utils/mapAnimations.js";

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
    let fadeOutTimeout = null;
    let markerFadeInTimeout = null;

    // Image cache for Mapbox Static API calls
    const imageCache = new Map();
    let containerDimensions = $state({ width: 0, height: 0 });
    let resizeObserver = null;

    // Port label overlay state (for static map views)
    let portLabelOverlayName = $state(null);
    let portLabelMarkerColor = $state(null);
    let portMarkerVisible = $state(false);

    // Animation state
    const shippingLaneAnimator = new ShippingLaneAnimator();
    const portLabelAnimator = new PortLabelAnimator();

    // Generate cache key for static image based on view and container dimensions
    const getCacheKey = (view) => {
        if (!view || !view.center || !view.zoom) return null;
        const [lon, lat] = view.center;
        const zoom = view.zoom;
        return `${lon},${lat},${zoom},${containerDimensions.width},${containerDimensions.height}`;
    };

    // Fetch and cache static image
    const getCachedStaticImage = async (view) => {
        if (!view || view.basemap !== "satellite") return null;

        const cacheKey = getCacheKey(view);
        if (!cacheKey) return null;

        // Check if image is already cached
        if (imageCache.has(cacheKey)) {
            return imageCache.get(cacheKey);
        }

        // Generate URL and fetch image with current container dimensions
        const imageUrl = generateStaticImageUrl(view, mapboxToken, containerDimensions);
        if (!imageUrl) return null;

        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                console.error("Failed to fetch static image:", response.statusText);
                return null;
            }
            const blob = await response.blob();
            const cachedUrl = URL.createObjectURL(blob);
            imageCache.set(cacheKey, cachedUrl);
            return cachedUrl;
        } catch (error) {
            console.error("Error fetching static image:", error);
            return null;
        }
    };

    // Clear image cache and revoke blob URLs
    const clearImageCache = () => {
        imageCache.forEach((url) => {
            URL.revokeObjectURL(url);
        });
        imageCache.clear();
    };

    // Update layers based on view configuration
    const updateLayers = (view) => {
        if (!map || !view) return;

        const shouldAnimate = view?.layers?.isAnimated === true;
  

        // Get port markers source reference and set it on the animator
        const portMarkersSourceObj = map.getSource("shipping-lane-ports");
        if (portMarkersSourceObj) {
            shippingLaneAnimator.setPortMarkersSource(portMarkersSourceObj);
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
                    shippingLaneAnimator.animateLine(source, newData, view);
                } else if (config.sourceId === "shipping-lane-ports") {
                    // Handle port markers separately
                    // Use the layer config's getData method to get ports from view's layer configuration
                    const portMarkersData = config.getData(view);

                    if (
                        shouldAnimate &&
                        portMarkersData &&
                        portMarkersData.features &&
                        portMarkersData.features.length > 0
                    ) {
                        // For animated routes, ports will be managed by animation
                        // Start with empty, animation will populate
                        source.setData({
                            type: "FeatureCollection",
                            features: [],
                        });
                    } else {
                        // For non-animated routes or when no animation, show all ports
                        source.setData(portMarkersData);
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
        updateView: async (view, id) => {
            if (!map) return;

            // Use view if available, otherwise fall back to defaultView
            const currentView = view || defaultView;
            if (currentView) {
                // Handle static image overlay for views with satellite basemap
                const shouldShowStaticOverlay =
                    currentView.basemap === "satellite";

                if (shouldShowStaticOverlay) {
                    // Cancel any pending timeouts
                    if (fadeOutTimeout) {
                        clearTimeout(fadeOutTimeout);
                        fadeOutTimeout = null;
                    }
                    if (markerFadeInTimeout) {
                        clearTimeout(markerFadeInTimeout);
                        markerFadeInTimeout = null;
                    }
                    // Get cached static image (will fetch if not cached)
                    const cachedImageUrl = await getCachedStaticImage(currentView);
                    if (cachedImageUrl) {
                        staticImageOverlayUrl = cachedImageUrl;
                        // Hide initially, will fade in after map transition
                        staticImageOverlayVisible = false;
                    }
                    // Set port label name and marker color for overlay from view config
                    if (currentView.layers?.animatedPortLabel?.name) {
                        portLabelOverlayName =
                            currentView.layers.animatedPortLabel.name;
                        portLabelMarkerColor =
                            currentView.layers.animatedPortLabel.markerColor || "#d98e1d";
                        // Hide marker initially, will fade in at midpoint of map transition
                        portMarkerVisible = false;
                    } else {
                        portLabelOverlayName = null;
                        portLabelMarkerColor = null;
                        portMarkerVisible = false;
                    }
                } else {
                    // Hide overlay for other views - fade out first, then remove URL
                    if (staticImageOverlayVisible) {
                        staticImageOverlayVisible = false;
                        // Wait for fade-out transition to complete before removing URL
                        fadeOutTimeout = setTimeout(() => {
                            staticImageOverlayUrl = null;
                            fadeOutTimeout = null;
                        }, 1000); // Match fade-out duration
                    } else {
                        // If already hidden, remove immediately
                        staticImageOverlayUrl = null;
                    }
                    // Cancel any pending marker fade-in timeout
                    if (markerFadeInTimeout) {
                        clearTimeout(markerFadeInTimeout);
                        markerFadeInTimeout = null;
                    }
                    portLabelOverlayName = null;
                    portLabelMarkerColor = null;
                    portMarkerVisible = false;
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
                            duration: currentView.duration || 2000,
                            pitch: currentView.pitch || 0,
                            bearing: currentView.bearing || 0,
                        });
                        transitionComplete = true;
                    }
                } else if (currentView.bbox) {
                    // Use bbox to fit the map to the specified bounds
                    map.fitBounds(currentView.bbox, {
                        padding: 50,
                        duration: currentView.duration || 2000,
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
                        duration: currentView.duration || 2000,
                    });
                    transitionComplete = true;
                }

                // Fade in marker at midpoint of map transition (half of 2000ms = 1000ms)
                if (shouldShowStaticOverlay && transitionComplete && portLabelMarkerColor) {
                    markerFadeInTimeout = setTimeout(() => {
                        portMarkerVisible = true;
                        markerFadeInTimeout = null;
                    }, currentView.duration / 2); // Half of map transition duration
                }

                // Fade in static image overlay after map transition completes
                if (shouldShowStaticOverlay && transitionComplete) {
                    setTimeout(() => {
                        staticImageOverlayVisible = true;
                    }, currentView.duration + 100); // Match the map transition duration (2000ms) + small delay
                }

                // Handle animated port label (only for non-static map views)
                if (
                    currentView.layers?.animatedPortLabel &&
                    !shouldShowStaticOverlay
                ) {
                    portLabelAnimator.animatePortLabel(
                        map,
                        currentView.layers.animatedPortLabel,
                    );
                } else {
                    // Clear animated port label if not in view
                    portLabelAnimator.stopAnimation();
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

        // Track container dimensions and clear cache when they change
        const updateContainerDimensions = () => {
            if (mapContainer) {
                const rect = mapContainer.getBoundingClientRect();
                const newDimensions = {
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                };
                // Check if dimensions actually changed
                if (
                    newDimensions.width !== containerDimensions.width ||
                    newDimensions.height !== containerDimensions.height
                ) {
                    // Clear cache when dimensions change
                    clearImageCache();
                    containerDimensions = newDimensions;
                }
            }
        };

        // Initial dimension update
        updateContainerDimensions();

        // Set up resize observer to track container dimension changes
        if (mapContainer && typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
                updateContainerDimensions();
            });
            resizeObserver.observe(mapContainer);
        } else {
            // Fallback to window resize if ResizeObserver not available
            const handleResize = () => {
                updateContainerDimensions();
            };
            window.addEventListener("resize", handleResize);
            onDestroy(() => {
                window.removeEventListener("resize", handleResize);
            });
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
        shippingLaneAnimator.stopAnimation();
        portLabelAnimator.stopAnimation();
        if (fadeOutTimeout) {
            clearTimeout(fadeOutTimeout);
            fadeOutTimeout = null;
        }
        if (markerFadeInTimeout) {
            clearTimeout(markerFadeInTimeout);
            markerFadeInTimeout = null;
        }
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
        // Clear image cache and revoke blob URLs
        clearImageCache();
        if (map) {
            map.remove();
        }
    });
</script>

<div bind:this={mapContainer} class="map-container">
    {#if staticImageOverlayUrl && staticImageOverlayVisible}
        <img
            src={staticImageOverlayUrl}
            alt="Port satellite view"
            class="static-image-overlay"
            in:fade={{ duration: 1000 }}
            out:fade={{ duration: 1000 }}
        />
    {/if}

    <div class="port-label-overlay">
        {#if portMarkerVisible && portLabelMarkerColor}
            <div 
                class="port-marker" 
                style="background: {portLabelMarkerColor};"
                in:fade={{ duration: 300 }}
                out:fade={{ duration: 300 }}
            ></div>
        {/if}
        {#if staticImageOverlayVisible && portLabelOverlayName}
            {@const portName = portLabelOverlayName}
            <div class="port-line"></div>
            <div class="port-label">{portName}</div>
        {/if}
    </div>
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
        z-index: 10;
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
        border-radius: 50%;
        border: 2px solid #ffffff;
        z-index: 30;
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
