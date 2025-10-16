<script>
    import { onMount, onDestroy } from "svelte";
    import mapboxgl from "mapbox-gl";
    import "mapbox-gl/dist/mapbox-gl.css";
    import shippingLanes from "../data/Shipping_Lanes_US_China.json";

    import { dev } from "$app/environment";

    let { activeId, view } = $props();

    // Get Mapbox token from environment variables based on environment
    let mapboxToken = dev
        ? import.meta.env.VITE_MAPBOX_TOKEN_DEV || ""
        : import.meta.env.VITE_MAPBOX_TOKEN_PROD || "";

    let mapContainer;
    let map;
    let overlayActive = $state(false);
    let controller = {
        updateView: (view, id) => {
            if (!map) return;

            if (view) {
                // Show/hide shipping lanes based on view
                if (map.getLayer("shipping-lanes")) {
                    if (id === "us_china_routes") {
                        map.setLayoutProperty(
                            "shipping-lanes",
                            "visibility",
                            "visible",
                        );
                    } else {
                        map.setLayoutProperty(
                            "shipping-lanes",
                            "visibility",
                            "none",
                        );
                    }
                }

                if (view.bbox) {
                    // Use bbox to fit the map to the specified bounds
                    map.fitBounds(view.bbox, {
                        padding: 50,
                        duration: 2000,
                        pitch: view.pitch || 0,
                        bearing: view.bearing || 0,
                    });
                } else {
                    // Use center/zoom positioning
                    map.easeTo({
                        center: view.center,
                        zoom: view.zoom,
                        pitch: view.pitch,
                        bearing: view.bearing,
                        duration: 2000,
                    });
                }
            }
        },
    };

    $effect(() => {
        if (activeId && map) {
            controller.updateView(view, activeId);
        }
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
            projection: "globe",
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

            // Add shipping lanes data source
            map.addSource("shipping-lanes", {
                type: "geojson",
                data: shippingLanes,
            });

            // Add shipping lanes layer
            map.addLayer({
                id: "shipping-lanes",
                type: "line",
                source: "shipping-lanes",
                layout: {
                    "line-join": "round",
                    "line-cap": "round",
                },
                paint: {
                    "line-color": "#ff6b35",
                    "line-width": 2,
                    "line-opacity": 0.8,
                },
            });

            // Set the atmosphere
            // map.setTerrain({ source: "mapbox-dem", exaggeration: 0 });
        });
    });

    onDestroy(() => {
        if (map) {
            map.remove();
        }
    });
</script>

<div bind:this={mapContainer} class="map-container"></div>

<style lang="scss">
    .map-container {
        width: 100%;
        height: 100%;
        position: relative;
    }
</style>
