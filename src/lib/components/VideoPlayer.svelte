<script>
    import { fade } from "svelte/transition";
    let { activeId } = $props();

    $inspect(activeId);

    let videos = {
        "port_of_chancay_video": {
            src: "port_of_chancay_video.mp4",
            credit: "TKTK",
        },
        "port_of_santos_video": {
            src: "port_of_santos_video.mp4",
            credit: "PTKTK",
        },
    }

</script>

<div class="video-player" transition:fade>
    <video src={"videos/" + activeId + ".mp4"} autoplay loop muted playsinline></video>
    <span class="credit">{videos[activeId].credit}</span>
</div>

<style>
    .video-player {
        width: 100%;
        height: 100%;
    }

    .credit {
        position: absolute;
        bottom: 0;
        left: 0;
        font-size: 12px;
        color: #fff;
        background: rgba(0, 0, 0, 0.5);
        padding: 0.25rem;
    }
</style>