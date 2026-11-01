const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const root = __dirname;
const resourcesDir = path.join(root, "resources");
const codiconSrcDir = path.join(root, "node_modules", "@vscode", "codicons", "dist");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function buildExtension(ctxMode) {
	return esbuild.context({
		entryPoints: ['src/main/extension.ts'],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'out/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
}

async function buildViewer(ctxMode) {
	ensureDir(resourcesDir);
	return esbuild.context({
		entryPoints: ['src/webviews/viewer.ts'],
		bundle: true,
		format: 'iife',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'out/viewer.js',
		//external: ['vscode'],
		logLevel: 'silent',
		external: [
			"vscode-codicons",   
		],
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
}

async function buildSearch(ctxMode) {
	return esbuild.context({
		entryPoints: ['src/webviews/search.ts'],
		bundle: true,
		format: 'iife',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'out/search.js',
		//external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
}

function copyCodicons() {
  ensureDir(resourcesDir);
  const files = ["codicon.css", "codicon.ttf"];
  for (const f of files) {
    const src = path.join(codiconSrcDir, f);
    const dst = path.join(resourcesDir, f);
    fs.copyFileSync(src, dst);
    console.log(`Copied ${f} -> media/`);
  }
}

async function main() {
	copyCodicons();
	const extensionContext = await buildExtension();
	const viewerContext = await buildViewer();
	const searchContext = await buildSearch();
	if (watch) {
		await extensionContext.watch();
		await viewerContext.watch();
		await searchContext.watch();
	}
	else {
		await extensionContext.rebuild();
		await viewerContext.rebuild();
		await searchContext.rebuild();
		await extensionContext.dispose();
		await viewerContext.dispose();
		await searchContext.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
