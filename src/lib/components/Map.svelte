<script>
    import { onMount, onDestroy } from "svelte";
    import mapboxgl from "mapbox-gl";
    import "mapbox-gl/dist/mapbox-gl.css";

    import { dev } from "$app/environment";

    let { activeId } = $props();


    // Get Mapbox token from environment variables based on environment
    let mapboxToken = dev
        ? import.meta.env.VITE_MAPBOX_TOKEN_DEV || ""
        : import.meta.env.VITE_MAPBOX_TOKEN_PROD || "";

    let mapContainer;
    let map;
    let controller = {
        updateView: (id) => {
            if (!map) return;

            // Define view configurations for each slide ID
            const views = {
                us_china_routes: {
                    bbox: [-282.319107,-1.178201,-62.416763,63.571788],
                    zoom: 2,
                    pitch: 0,
                    bearing: 0,
                },
                us_china_chart: {
                    center: [-100, 40],
                    zoom: 2.5,
                    pitch: 15,
                    bearing: -10,
                },
                latam_china_chart: {
                    center: [-60, -20], // Center on Latin America
                    zoom: 2.5,
                    pitch: 20,
                    bearing: 0,
                },
                latam_investments: {
                    center: [-60, -20],
                    zoom: 3,
                    pitch: 25,
                    bearing: 10,
                },
                port_of_santos: {
                    center: [-46.3, -23.9], // Port of Santos, Brazil
                    zoom: 6,
                    pitch: 30,
                    bearing: 0,
                },
            };

            const view = views[id];
            if (view) {
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
            controller.updateView(activeId);
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
                color: "rgb(186, 210, 235)",
                "high-color": "rgb(36, 92, 223)",
                "horizon-blend": 0.02,
                "space-color": "rgb(11, 11, 25)",
                "star-intensity": 0.6,
            });

            // Set the atmosphere
            // map.setTerrain({ source: "mapbox-dem", exaggeration: 0 });
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), "top-right");
    });

    onDestroy(() => {
        if (map) {
            map.remove();
        }
    });

   
</script>

<div bind:this={mapContainer} class="map-container"></div>

<style>
    .map-container {
        width: 100vw;
        height: 100vh;
        position: relative;
    }
</style>
