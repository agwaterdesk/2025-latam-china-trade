<script>
    let { activeId } = $props();
    import { fade } from "svelte/transition";
    import { dev } from '$app/environment';
    import { PUBLIC_CDN_URL } from '$env/static/public';

    const base = dev ? '' : PUBLIC_CDN_URL;
    let imageSrcs = {
        "port_of_santos_image": {
            src: "porto-de-Santos-2.jpg",
            alt: "Port of Santos",
            attribution: "Port of Santos",
            attribution_url: "https://www.portofsantos.com.br/",
        }
    }
</script>

<div class="image" transition:fade>
    <img src={base + "images/" + imageSrcs[activeId].src} alt={imageSrcs[activeId].alt} />
    <span class="image-attribution">{imageSrcs[activeId].attribution}</span>
</div>

<style lang="scss">
    .image {
        width: 100%;
        height: 100%;
    

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
        }
    }
</style>