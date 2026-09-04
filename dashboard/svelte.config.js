// Svelte compiler config for editors and `svelte-check`.
// The web app itself is bundled with Vite (see vite.config.ts),
// which also picks up `compilerOptions` from here.
/** @type {{ compilerOptions: import('svelte/compiler').CompileOptions }} */
const config = {
	compilerOptions: {
		dev: process.env.NODE_ENV !== 'production'
	}
};

export default config;
