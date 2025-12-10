<script>
  import Index from "$lib/components/Index.svelte";
  import LoremIpsum from "$lib/components/LoremIpsum.svelte";
  import { videos } from "$lib/data/videos.js";
  import { dev } from '$app/environment';
  import { PUBLIC_CDN_URL } from '$env/static/public';

  const base = dev ? '' : PUBLIC_CDN_URL;
</script>

<svelte:head>
  {#each Object.values(videos) as video}
    <link rel="preload" href="{base}videos/{video.src}" as="video" type="video/mp4" />
  {/each}
</svelte:head>

<div class="container">
  <Index/>
</div>

<style lang="scss">
  .container {
    max-width: 600px;
    margin: 0 auto;

   
  }
</style>
