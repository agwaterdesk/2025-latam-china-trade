<script>
    import { onMount, onDestroy } from "svelte";
    import mapboxgl from "mapbox-gl";
    import "mapbox-gl/dist/mapbox-gl.css";
    import shippingLanesUSChina from "../data/Shipping_Lanes_US_China.json";
    import shippingLanesLatAmChina from "../data/Shipping_Lanes_LatAm_China.json";
    import portsData from "../data/ports.csv";

    import { dev } from "$app/environment";

    let { activeId, view } = $props();

    // Get Mapbox token from environment variables based on environment
    let mapboxToken = dev
        ? import.meta.env.VITE_MAPBOX_TOKEN_DEV || ""
        : import.meta.env.VITE_MAPBOX_TOKEN_PROD || "";

    let mapContainer;
    let map;
    let overlayActive = $state(false);
    // Define bounds configurations
    const boundsConfig = {
        latam_china: [-120, -60, -30, 30], // [west, south, east, north]
        us_china: [-180, 10, -50, 70],
    };

    // Process ports data
    const processPortsData = () => {
        return {
            type: "FeatureCollection",
            features: portsData.map(port => {
                // Parse coordinates from string like "(19.07044,-104.29)"
                const coords = port.Coordinates.replace(/[()]/g, '').split(',').map(Number);
                return {
                    type: "Feature",
                    properties: {
                        name: port["Project Name"],
                        country: port.Country,
                        region: port["Region "],
                        prcFirm: port["PRC Firm"],
                        status: port.Status,
                        ownershipShare: port["Ownership Share"],
                        operatorShare: port["Operator Share"],
                        cooperationMode: port["Primary Cooperation Mode"]
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [coords[1], coords[0]] // [longitude, latitude]
                    }
                };
            })
        };
    };

    $inspect(processPortsData());

    let controller = {
        updateView: (view, id) => {
            if (!map) return;

            if (view) {
                // Update shipping lanes data source based on layers config
                if (map.getSource("shipping-lanes")) {
                    let dataToUse;
                    const shippingLanesType = view.layers?.shippingLanes;
                    
                    if (shippingLanesType === "us_china") {
                        dataToUse = shippingLanesUSChina;
                    } else if (shippingLanesType === "latam_china") {
                        dataToUse = shippingLanesLatAmChina;
                    } else {
                        dataToUse = { type: "FeatureCollection", features: [] };
                    }
                    
                    map.getSource("shipping-lanes").setData(dataToUse);
                    
                    // Show/hide shipping lanes based on layers config
                    if (map.getLayer("shipping-lanes")) {
                        if (shippingLanesType) {
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
                }

                // Update ports layer based on layers config
                if (map.getSource("latam-ports")) {
                    const showPorts = view.layers?.latam_ports;
                    if (map.getLayer("latam-ports")) {
                        map.setLayoutProperty(
                            "latam-ports",
                            "visibility",
                            showPorts ? "visible" : "none",
                        );
                    }
                }

                if (view.bounds) {
                    // Use predefined bounds configuration
                    const bounds = boundsConfig[view.bounds];
                    if (bounds) {
                        map.fitBounds(bounds, {
                            padding: 50,
                            duration: 2000,
                            pitch: view.pitch || 0,
                            bearing: view.bearing || 0,
                        });
                    }
                } else if (view.bbox) {
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
                        zoom: view.zoom || 2,
                        pitch: view.pitch || 0,
                        bearing: view.bearing || 0  ,
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
                data: shippingLanesUSChina,
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

            // Add ports data source
            map.addSource("latam-ports", {
                type: "geojson",
                data: processPortsData(),
            });

            // Add ports layer
            map.addLayer({
                id: "latam-ports",
                type: "circle",
                source: "latam-ports",
                paint: {
                    "circle-color": "#d98e1d",
                    "circle-radius": 6,
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#ffffff",
                    "circle-opacity": 0.9,
                },
                layout: {
                    visibility: "none", // Initially hidden
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
