<script>
    import Scroller from "./Scroller.svelte";
    import Map from "./Map.svelte";
    import Slide from "./Slide.svelte";
    import copy from "../data/copy.json";
    import Window from "./Window.svelte";
    import Background from "./Background.svelte";
    import {views} from "../utils/views.js";

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
