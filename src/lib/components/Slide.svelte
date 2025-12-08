<script>
    let { slide, isActive } = $props();

    // Split text by newlines (handle both \r\n and \n)
    // Filter out empty lines to avoid extra spacing
    let lines = $derived(
        slide.text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0),
    );

</script>

<section class="slide" class:active={isActive}>
    <div class="slide-content">
        {#each lines as line}
            <p class="slide-text">{@html line}</p>
        {/each}

        {#if slide.detail}
            <div class="detail">
                <p>{@html slide.detail}</p>
            </div>
        {/if}
    </div>
</section>

<style lang="scss">
    .slide {
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 0 1rem 0;
    }

    .slide-content {
        background: white;
        padding: 1rem;
        font-family: var(--font-body);
        border: 1px solid #ddd;
    }

    .slide-text {
        font-size: 1.2rem;
        line-height: 1.6;
        margin: 0 0 1rem 0;
        font-weight: 300;
    }

    .slide-text:last-child {
        margin-bottom: 0;
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

    :global {
        .slide {
            // padding-top: 0.3rem;
            // margin-top: 2rem;

            .route {
                width: 20px;
                height: 2px;
                border-top: 2px dashed #ff6b35;
                display: inline-block;
                margin-right: 0.25rem;
            }

            .seaport {
                width: 15px;
                height: 15px;
                border-radius: 50%;
                display: inline-block;
                margin-left: 0.25rem;

                &.orange {
                    background: var(--color-theme-latam);
                }
            }

            .highlight {
                padding: 0px 0.25rem;
                &.us {
                    background: var(--color-theme-us);
                    color: white;
                }
                &.latam {
                    background: var(--color-theme-latam);
                    color: white;
                }
            }

            .detail {
                position: relative;
                &::before {
                    // content: "";
                    // position: absolute;
                    // top: 0;
                    // left: 0;
                    // width: 100px;
                    // height: 1px;
                    // background: #999;
                }
                p {
                    font-family: var(--font-heading);
                    font-size: 0.8rem;
                    color: #515151;
                    line-height: 1.6;
                }
            }
        }
    }
</style>
