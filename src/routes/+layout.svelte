<script>
	import favicon from "$lib/assets/favicon.svg";

	let { children } = $props();
</script>

<svelte:head>
	<meta charset="utf-8" />
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children?.()}

<style>
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

		/* base colors */
		--color-black: #000000;
		--color-white: #ffffff;
		--color-gray-50: #f7f7f7;
		--color-gray-100: #efefef;
		--color-gray-200: #dfdfdf;
		--color-gray-300: #cacaca;
		--color-gray-400: #a8a8a8;
		--color-gray-500: #878787;
		--color-gray-600: #6d6d6d;
		--color-gray-700: #4e4e4e;
		--color-gray-800: #373737;
		--color-gray-900: #262626;
		--color-gray-1000: #191919;

		--color-theme-us: #2a7ac2;
		--color-theme-latam: var(--color-theme-color-secondary);
		--color-theme-other: var(--color-gray-300);
	}
</style>
