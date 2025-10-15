<script>
    import Scroller from "./Scroller.svelte";
    import Map from "./Map.svelte";
    import Slide from "./Slide.svelte";
    import copy from "../data/copy.json";

    let count = $state();
    let index = $state();
    let offset = $state();
    let progress = $state();
    let top = $state(0.1);
    let threshold = $state(0.5);
    let bottom = $state(0.9);
    
    // Mapbox token is now loaded from environment variables in Map.svelte
    
    // Get slides from copy data
    let slides = copy.scroller.slides;
    let activeSlideId = $state('');
    
    // Update active slide ID when index changes
    $effect(() => {
        if (slides && index !== undefined) {
            activeSlideId = slides[index]?.Id || '';
        }
    });
</script>


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
            <Map activeId={activeSlideId} />
        {/snippet}

        {#snippet foreground()}
            <div style="padding: 0 0 0 50%;">
                {#each slides as slide, i}
                    <Slide {slide} isActive={i === index} />
                {/each}
            </div>
        {/snippet}
    </Scroller>


<style>
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
