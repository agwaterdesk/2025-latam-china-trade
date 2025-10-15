<script>
    let { slide, isActive } = $props();
</script>

<section class="slide" class:active={isActive}>
    <div class="slide-content">
        <p class="slide-text">{slide.text}</p>
    </div>
</section>

<style>
    .slide {
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;

        margin: 0 0 2em 0;
    }

    .slide-content {
        max-width: 650px;
        text-align: center;
        background: white;
        padding: 2rem;
        border: 7px solid var(--color-theme-color-primary);
        font-family: var(--font-body);
    }

    .slide-text {
        font-size: 1.2rem;
        line-height: 1.6;
        margin: 0;
        font-weight: 300;
    }

    @media (max-width: 768px) {
        .slide {
            height: 60vh;
            padding: 1rem;
        }

        .slide-text {
            font-size: 1rem;
        }
    }
</style>
