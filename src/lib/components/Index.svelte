<script>
    import Scroller from "./Scroller.svelte";
    import Map from "./Map.svelte";
    import Slide from "./Slide.svelte";
    import copy from "../data/copy.json";
    import Window from "./Window.svelte";
    import Background from "./Background.svelte";

    import { windowWidth, windowHeight } from "../stores/global.js";

    let count = $state();
    let index = $state();
    let offset = $state();
    let progress = $state();
    let top = $state(0);
    let threshold = $state(0.5);
    let bottom = $state(1);

    // Mapbox token is now loaded from environment variables in Map.svelte

    // Get slides from copy data
    let slides = copy.scroller;
    let activeId = $state("");
    let activeSlide = $state();

    // Update active slide ID when index changes
    $effect(() => {
        if (slides && index !== undefined) {
            activeId = slides[index]?.id || "";
            activeSlide = slides[index];
        }
    });

    let viz = $state(null);

    let containerWidth = $state(0);
    let leftOffset = $state(0);
    let debounceTimer = null;

    // Debounced function to calculate offsets
    function calculateOffsets() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
            if ($windowWidth && viz) {
                containerWidth = viz.getBoundingClientRect().width;
                leftOffset = ($windowWidth - containerWidth) / -2;
            }
        }, 150); // 150ms debounce
    }

    // Effect that only runs on mount and width changes
    $effect(() => {
        if ($windowWidth) {
            calculateOffsets();
        }
    });

    // Cleanup debounce timer on component destroy
    $effect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    });

    // Define view configurations for each slide ID
    const views = {
        us_china_routes: {
            bbox: [-258.046875, 14.604847, -72.421875, 50.289339],
            layers: {
                shippingLanes: [
                    { id: "us_china_north", color: "#ff6b35" },
                    { id: "us_china_south", color: "#4ecdc4" },
                ],
                portLabels: "us_china",
                isAnimated: true,
            },
        },
        china_soy_chart_annual: {
            bbox: [-258.046875, 14.604847, -72.421875, 50.289339],
            overlay: true,
            layers: {
                shippingLanes: [
                    { id: "us_china_north", color: "#ff6b35" },
                ],
                portLabels: "us_china",
            },
        },
        china_soy_chart_annual: {
            bbox: [-74.882813, -50.928141, 135.770416, 37.198612],
            layers: {
                shippingLanes: [
                    { id: "latam_china", color: "#ff6b35" },
                ],
            },
        },
        latam_china_chart_monthly: {
            bbox: [-74.882813, -50.928141, 135.770416, 37.198612],
            layers: {
                shippingLanes: [
                    { id: "latam_china", color: "#ff6b35" },
                ],
            },
        },
        latam_ports: {
            bounds: "latam_ports",
            layers: {
                latam_ports: true,
            },
        },
        port_of_santos: {
            center: [-46.3021, -23.9655], // Port of Santos, Brazil
            zoom: 15,
            pitch: 0,
            bearing: 0,
            basemap: "satellite",
            layers: {
                latam_ports: true,
                animatedPortLabel: {
                    coordinates: [-46.3021, -23.9655],
                    name: "Port of Santos",
                    offset: [0, 0.006], // Offset in degrees [lon, lat] - shortened line
                },
            },
        },
        santos_gateway: {
            bbox: [-74.882813, -50.928141, 135.770416, 37.198612],
            layers: {
                shippingLanes: [
                    { id: "latam_china", color: "#ff6b35" },
                ],
                latam_ports: true,
                isAnimated: true,
            },
        },
        port_of_chancay: {
            center: [-77.2731, -11.5843], // Port of Chancay, Peru
            zoom: 15,
            pitch: 0,
            bearing: 0,
            basemap: "satellite",
            layers: {
                latam_ports: true,
                animatedPortLabel: {
                    coordinates: [-77.2731, -11.5843],
                    name: "Port of Chancay",
                    offset: [0, 0.006], // Offset in degrees [lon, lat] - shortened line
                },
            },
        },
        china_latam_chancay_route: {
            bounds: "china_latam_chancay_route",
            layers: {
                shippingLanes: [
                    { id: "china_latam_chancay_route", color: "#ff6b35" },
                ],
                isAnimated: true,
            },
        },
        china_latam_chancay_video: {
            src: "VIDEO-2025-08-28-12-10-10-700x700-bg.mp4",
        },
    };

    let view = $derived(views[activeId]);
    // Get default view from first slide ID
    const firstSlideId = Object.keys(views)[0];
    const defaultView = views[firstSlideId];
</script>

<Window />

<div bind:this={viz} style:--left-offset="{leftOffset}px">
    <Scroller
        {top}
        {threshold}
        {bottom}
        bind:count
        bind:index
        bind:offset
        bind:progress
    >
        {#snippet background()}
            <Background {activeId} {activeSlide} {view} {defaultView} />
        {/snippet}

        {#snippet foreground()}
            <div class="foreground-content">
                {#each slides as slide, i}
                    <Slide {slide} isActive={i === index} />
                {/each}
            </div>
        {/snippet}
    </Scroller>
</div>

<style>
    :global(body) {
        margin: 0;
    }

    #viz {
        max-width: 700px;
        margin: 0 auto;
    }

    .foreground-content {
        width: 100%;
    }

    [slot="background"] {
        overflow: hidden;
        height: 100vh;
    }

    [slot="foreground"] {
        pointer-events: none;
    }

    [slot="foreground"] :global(.slide) {
        pointer-events: all;
    }
</style>
