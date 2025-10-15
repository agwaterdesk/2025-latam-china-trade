import EmbedApp from './lib/EmbedApp.svelte';

function mount(targetOrSelector, props = {}) {
  const target = typeof targetOrSelector === 'string'
    ? document.querySelector(targetOrSelector)
    : targetOrSelector;
  if (!target) throw new Error('[svelte-embed] mount target not found: ' + targetOrSelector);
  return new EmbedApp({ target, props });
}

// auto-mount (optional)
function autoMount() {
  document.querySelectorAll('[data-svelte-embed]').forEach((el) => {
    let props = {};
    const raw = el.getAttribute('data-svelte-props');
    if (raw) { try { props = JSON.parse(raw); } catch {} }
    mount(el, props);
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoMount, { once: true });
} else {
  autoMount();
}

// ⬇️ default export becomes window.SvelteEmbed
export default { mount };
