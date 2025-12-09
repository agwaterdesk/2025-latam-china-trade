<script>
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { assets } from '$app/paths';
    let { activeId } = $props();

    let mounted = $state(false);

    onMount(() => {
        mounted = true;
    });

    const videos = {
        port_of_chancay_video: {
            src: "port_of_chancay_video.mp4",
            credit: "Video by Christian E. Oliva Ladines",
            muted: true,
        },
        port_of_santos_video: {
            src: "port_of_santos_video.mp4",
            credit: "Video by AC Drone",
            muted: true,
        },
        farmer_video: {
            src: "farmer_video_cc.mp4",
            credit: "Video by David Vargas",
            muted: false,
        },
    };

    let videoElement;
    let videoContainer;
    let isMuted = $state(true); // Default to muted

    // Intersection Observer to pause/resume video based on visibility
    $effect(() => {
        if (!videoElement || !videoContainer) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        videoElement.play().catch((err) => {
                            console.log("Video play failed:", err);
                        });
                    } else {
                        videoElement.pause();
                    }
                });
            },
            {
                threshold: 0.5, // Trigger when 50% of video is visible
            },
        );

        observer.observe(videoContainer);

        return () => {
            observer.disconnect();
        };
    });

    // Update muted state when video element changes
    $effect(() => {
        if (videoElement) {
            videoElement.muted = isMuted;
        }
    });

    // Reset muted state when activeId changes (but always default to muted)
    $effect(() => {
        activeId; // Track activeId
        isMuted = true; // Reset to muted when video changes
    });

    function toggleMute() {
        isMuted = !isMuted;
    }
</script>

<div class="video-player-wrapper" transition:fade={{ duration: 250 }}>
    {#if mounted && videos[activeId] && videos[activeId].src}
        <div class="video-player-inner">
            {#each [activeId] as id (id)}
                {@const video = videos[id]}
                {@const showMuteButton = !video?.muted}
                <div
                    class="video-player"
                    bind:this={videoContainer}
                    in:fade={{ duration: 500 }}
                    out:fade={{ duration: 500 }}
                >
                    <video
                        bind:this={videoElement}
                        src={assets + "/videos/" + video.src}
                        autoplay
                        loop
                        muted={isMuted}
                        playsinline
                    ></video>
                    {#if showMuteButton}
                        <button
                            class="mute-button"
                            onclick={toggleMute}
                            aria-label={isMuted ? "Unmute" : "Mute"}
                        >
                            {#if !isMuted}
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                    <path
                                        d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
                                    />
                                </svg>
                            {:else}
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                    <line x1="23" y1="9" x2="17" y2="15" />
                                    <line x1="17" y1="9" x2="23" y2="15" />
                                </svg>
                            {/if}
                        </button>
                    {/if}
                    <span class="credit">{video.credit}</span>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .video-player-wrapper {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        background: #fff;
        z-index: 100;
        box-sizing: border-box;
    }

    .video-player-inner {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .video-player {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
    }

    .mute-button {
        position: absolute;
        top: 0.5rem;
        left: 0.5rem;
        background: rgba(0, 0, 0, 0.6);
        border: none;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        padding: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        transition: background 0.2s;
        pointer-events: all;
        z-index: 10000;
    }

    .mute-button:hover {
        background: rgba(0, 0, 0, 0.8);
    }

    .mute-button:focus {
        outline: 2px solid #fff;
        outline-offset: 2px;
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
