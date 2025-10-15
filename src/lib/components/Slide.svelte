<script>


    let { slide, isActive } = $props();
</script>

<section class="slide" class:active={isActive}>
    <div class="slide-content">
        <p class="slide-text">{slide.Text}</p>
    </div>
</section>

<style>
    .slide {
        height: 80vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        margin: 0 0 2em 0;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5));
        color: white;
        backdrop-filter: blur(10px);
        border-radius: 8px;
        transition: all 0.3s ease;
        opacity: 0.8;
    }

    .slide.active {
        opacity: 1;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.6));
        transform: scale(1.02);
    }

    .slide-content {
        max-width: 600px;
        text-align: center;
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
