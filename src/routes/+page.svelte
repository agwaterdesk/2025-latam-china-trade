<script>
  import Index from "$lib/components/Index.svelte";
  import LoremIpsum from "$lib/components/LoremIpsum.svelte";
</script>

<div class="container">
  <LoremIpsum />
  <Index/>
  <LoremIpsum />
  <!-- <Index id="scroller_2"/> -->
</div>

<style lang="scss">
  .container {
    max-width: 600px;
    margin: 0 auto;

   
  }
</style>
