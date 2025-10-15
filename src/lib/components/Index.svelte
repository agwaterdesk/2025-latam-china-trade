<script>
    import Scroller from "./Scroller.svelte";
    import Map from "./Map.svelte";
    import Slide from "./Slide.svelte";
    import copy from "../data/copy.json";
    import Window from "./Window.svelte";

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
    let slides = copy.scroller.slides;
    let activeSlideId = $state("");

    // Update active slide ID when index changes
    $effect(() => {
        if (slides && index !== undefined) {
            activeSlideId = slides[index]?.id || "";
        }
    });

    let viz = $state(null);

    let containerWidth = $state(0);
    let leftOffset = $state(0);

    $effect(() => {
        if ($windowWidth) {
            // containerWidth = viz.getBoundingClientRect().width;

            // leftOffset = ($windowWidth - containerWidth) / -2;
            console.log($windowWidth, containerWidth, leftOffset);
        }
    });
</script>

<Window />
<div id="viz" bind:this={viz} style:--left-offset="{leftOffset}px">
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
        margin-left: var(--left-offset);
    }

    .foreground-content {
        width: 100vw;
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

    :root {
        --font-body: var(
            --newspack-theme-font-body,
            "PT Serif",
            "Georgia",
            "serif"
        );
        --font-heading: var(
            --newspack-theme-font-heading,
            "Noto Sans",
            "Georgia",
            "serif"
        );

        /* Primary colors */
        --color-theme-color-primary: var(
            --newspack-theme-color-primary,
            #90b03e
        );
        --color-theme-color-variation: var(
            --newspack-theme-color-primary-variation,
            #729220
        );
        --color-theme-color-primary-darken-5: var(
            --newspack-theme-color-primary-darken-5,
            #8bab39
        );
        --color-theme-color-primary-darken-10: var(
            --newspack-theme-color-primary-darken-10,
            #86a634
        );
        --color-theme-color-primary-against-white: var(
            --newspack-theme-color-primary-against-white,
            dimgray
        );
        --color-theme-color-against-primary: var(
            --newspack-theme-color-against-primary,
            black
        );

        /* Secondary colors */
        --color-theme-color-secondary: var(
            --newspack-theme-color-secondary,
            #d98e1d
        );
        --color-theme-color-secondary-variation: var(
            --newspack-theme-color-secondary-variation,
            #b16600
        );
        --color-theme-color-secondary-against-white: var(
            --newspack-theme-color-secondary-against-white,
            dimgray
        );
        --color-theme-color-secondary-variation-against-white: var(
            --newspack-theme-color-secondary-variation-against-white,
            #b16600
        );
        --color-theme-color-against-secondary: var(
            --newspack-theme-color-against-secondary,
            black
        );
    }
</style>
