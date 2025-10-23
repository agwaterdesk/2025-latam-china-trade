<script>
    import { fade } from "svelte/transition";
    import * as d3 from "d3";
    import * as topojson from "topojson-client";
    import { onMount } from "svelte";
    import countriesData from "../data/countries-110m.json";
    import shippingLanesUSChina from "../data/Shipping_Lanes_US_China.json";
    import shippingLanesLatAmChina from "../data/Shipping_Lanes_LatAm_China.json";

    let { activeId, view } = $props();

    let globeContainer;
    let svg;
    let width = 200;
    let height = 200;
    let projection;
    let path;
    let globe;
    const sensitivity = 75;

    // Country highlighting based on activeId
    const getCountryHighlight = (countryName) => {
        if (activeId === "us_china_chart") {
            return countryName === "United States of America" || countryName === "China";
        } else if (activeId === "latam_china_chart") {
            return countryName === "China" || countryName === "Brazil" || countryName === "Argentina";
        }
        return false;
    };


    onMount(() => {
        // Create SVG
        svg = d3.select(globeContainer)
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        // Create projection with initial view
        const initialScale = 90;
        let initialRotation = [0, -30]; // Default rotation
        
        // Use initial view if available
        if (view?.bbox) {
            const bbox = view.bbox;
            const centerLon = (bbox[0] + bbox[2]) / 2;
            const centerLat = (bbox[1] + bbox[3]) / 2;
            initialRotation = [-centerLon, -centerLat, 0];
        }
        
        projection = d3.geoOrthographic()
            .scale(initialScale)
            .center([0, 0])
            .rotate(initialRotation)
            .translate([width / 2, height / 2]);

        path = d3.geoPath().projection(projection);

        // Create globe background circle
        globe = svg.append("circle")
            .attr("fill", "#CDCDCD")
            .attr("stroke", "none")
            .attr("cx", width / 2)
            .attr("cy", height / 2)
            .attr("r", initialScale);

        // Load world data and render
        const countries = topojson.feature(countriesData, countriesData.objects.countries);
        
        // Draw countries
        svg.selectAll(".country")
            .data(countries.features)
            .enter()
            .append("path")
            .attr("class", "country")
            .attr("d", path)
            .attr("fill", function(d) {
                const countryName = d.properties?.NAME || d.properties?.name || "";
                return getCountryHighlight(countryName) ? "var(--color-theme-color-secondary)" : "#F8F8F8";
            })
            .attr("stroke", "#8C8C8C")
            .attr("stroke-width", 0.5)
            .attr("opacity", 1);

        // Draw trade routes
        const getShippingLanesData = () => {
            const shippingLanesType = view?.layers?.shippingLanes;
            
            if (shippingLanesType === "us_china") {
                return shippingLanesUSChina.features;
            } else if (shippingLanesType === "latam_china") {
                return shippingLanesLatAmChina.features;
            } else {
                return [];
            }
        };

        svg.selectAll(".trade-route")
            .data(getShippingLanesData())
            .enter()
            .append("path")
            .attr("class", "trade-route")
            .attr("d", path)
            .attr("fill", "none")
            .attr("stroke", "#ff6b35")
            .attr("stroke-width", 1)
            .attr("opacity", view?.layers?.shippingLanes ? 0.7 : 0);

        // Add country highlights
        updateHighlights();

        // Update view based on view config
        if (view?.bbox) {
            updateGlobeView();
        }
    });

    function updateHighlights() {
        if (!svg) return;

        // Update country fills based on highlighting with smooth transition
        svg.selectAll(".country")
            .transition()
            .duration(500)
            .ease(d3.easeCubicInOut)
            .attr("fill", function(d) {
                // Find country name from the feature properties
                const countryName = d.properties?.NAME || d.properties?.name || "";
                
                if (getCountryHighlight(countryName)) {
                    return "var(--color-theme-color-secondary)";
                }
                return "#F8F8F8";
            })
            .attr("opacity", 1);
    }

    function updateTradeRoutes() {
        if (!svg) return;

        // Get the appropriate shipping lanes data
        const getShippingLanesData = () => {
            const shippingLanesType = view?.layers?.shippingLanes;
            
            if (shippingLanesType === "us_china") {
                return shippingLanesUSChina.features;
            } else if (shippingLanesType === "latam_china") {
                return shippingLanesLatAmChina.features;
            } else {
                return [];
            }
        };

        // Update trade routes with new data
        const tradeRoutes = svg.selectAll(".trade-route")
            .data(getShippingLanesData());

        // Remove old routes
        tradeRoutes.exit().remove();

        // Add new routes
        const newRoutes = tradeRoutes.enter()
            .append("path")
            .attr("class", "trade-route")
            .attr("fill", "none")
            .attr("stroke", "#ff6b35")
            .attr("stroke-width", 1);

        // Update all routes (existing and new)
        tradeRoutes.merge(newRoutes)
            .transition()
            .duration(300)
            .ease(d3.easeCubicInOut)
            .attr("d", path)
            .attr("opacity", view?.layers?.shippingLanes ? 0.7 : 0);
    }

    function updateGlobeView() {
        if (!projection || !view?.bbox || !svg) return;

        const bbox = view.bbox;
        if (bbox) {
            console.log("Updating globe view with bbox:", bbox);
            
            // Calculate center from bbox
            const centerLon = (bbox[0] + bbox[2]) / 2;
            const centerLat = (bbox[1] + bbox[3]) / 2;
            
            // Animate to new rotation
            const currentRotation = projection.rotate();
            const targetRotation = [-centerLon, -centerLat, 0];
            
            // Simple approach: just rotate the globe
            const timer = d3.timer(function(elapsed) {
                const progress = Math.min(elapsed / 1000, 1);
                const eased = d3.easeCubicInOut(progress);
                
                const rotation = [
                    currentRotation[0] + (targetRotation[0] - currentRotation[0]) * eased,
                    currentRotation[1] + (targetRotation[1] - currentRotation[1]) * eased,
                    currentRotation[2] + (targetRotation[2] - currentRotation[2]) * eased
                ];
                
                projection.rotate(rotation);
                path = d3.geoPath().projection(projection);
                
                // Update both countries and trade routes
                svg.selectAll(".country").attr("d", path);
                svg.selectAll(".trade-route").attr("d", path);
                
                if (progress >= 1) {
                    timer.stop();
                }
            });
        }
    }

    // Update highlights and trade routes when activeId changes
    $effect(() => {
        if (svg) {
            updateHighlights();
            updateTradeRoutes();
        }
    });

    // Update view when view changes
    $effect(() => {
        if (svg && view?.bbox) {
            updateGlobeView();
        }
    });
</script>

<div class="globe-container" transition:fade bind:this={globeContainer}></div>

<style lang="scss">
    .globe-container {
        position: absolute;
        z-index: 200;
        bottom: 30px;
        right: 20px;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        overflow: hidden;
        // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        // background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }

    :global(.globe-container svg) {
        display: block;
    }

    :global(.globe-container .country) {
        transition: fill 0.3s ease;
    }

    :global(.globe-container .trade-route) {
        transition: opacity 0.3s ease;
    }

</style>
