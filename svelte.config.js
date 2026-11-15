import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// CSRF is enforced in src/hooks.server.ts, which also works without ORIGIN being configured.
		csrf: { trustedOrigins: ['*'] }
	}
};

export default config;
