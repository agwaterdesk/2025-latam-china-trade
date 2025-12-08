<script>
    import { fade } from "svelte/transition";
    let { view } = $props();

</script>

<div class="video-player" transition:fade>
    <video src="videos/VIDEO-2025-08-28-12-10-10-700x700-bg.mp4" autoplay loop muted playsinline></video>
</div>

<style>
    .video-player {
        width: 100%;
        height: 100%;
    }
</style>