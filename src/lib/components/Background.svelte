<script>
    let { activeId } = $props();

    import Map from "./Map.svelte";
    import BumpChart from "./BumpChart.svelte";
    import AreaChart from "./AreaChart.svelte";
    import Globe from "./Globe.svelte";
    // Define view configurations for each slide ID
    const views = {
        us_china_routes: {
            bbox: [-258.046875, 14.604847, -72.421875, 50.289339],
            // zoom: 2,
            // pitch: 0,
            // bearing: 0,
            layers: {
                shippingLanes: "us_china",
            },
        },
        us_china_chart: {
            bbox: [-250.526733, 18.879001, -117.636108, 52.845083],
            overlay: true,
            layers: {
                shippingLanes: "us_china",
            },
        },
        latam_china_chart: {
            layers: {
                shippingLanes: "latam_china",
            },
        },
        latam_investments: {
            bounds: "latam_china",
            layers: {
                shippingLanes: "latam_china",
                latam_ports: true,
            },
        },
        port_of_santos: {
            center: [-46.30193297539687, -23.96607999397377], // Port of Santos, Brazil
            zoom: 10,
            pitch: 30,
            bearing: 0,
            layers: {
                shippingLanes: "latam_china",
            },
        },
    };

    let view = $derived(views[activeId]);

    $inspect(view);
</script>

<div class="background-container">
    {#if activeId == "us_china_chart" || activeId == "latam_china_chart"}
        <AreaChart {activeId} />
        <Globe {activeId} {view} />
    {/if}
    <div class="map-container-overlay" class:active={view?.overlay}></div>

    <Map {activeId} {view} />
</div>

<style lang="scss">
    .background-container {
        width: calc(100vw - 500px);
        margin-left: 500px;
        height: 100vh;
        position: relative;
    }

    .map-container-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #fff;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;

        &.active {
            opacity: 0.5;
        }
    }
</style>
