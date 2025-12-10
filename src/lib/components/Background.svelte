<script>
    let { activeId, activeSlide, view, defaultView } = $props();

    import Map from "./Map.svelte";
    import BumpChart from "./BumpChart.svelte";
    import AreaChart from "./AreaChart.svelte";

    import VideoPlayer from "./VideoPlayer.svelte";
</script>

<div class="background-container">
    <div class="background-content">
        {#if activeSlide?.type == "chart"}
            <AreaChart {activeId} />
        {:else if activeSlide?.type == "video"}
            <VideoPlayer {activeId} {view} />
        {/if}
    </div>
    <div class="map-container-overlay" class:active={view?.overlay}></div>

    <Map {activeId} {view} {defaultView} />
</div>

<style lang="scss">
    .background-container {
        width: calc(100% + 100px);
        margin-left: -50px;
        height: 700px;
        position: relative;
        background: var(--color-gray-100);

        @media (max-width: 768px) {
            width: 100%;
            margin-left: 0;
        }
    }

    .background-content {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 100;
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
