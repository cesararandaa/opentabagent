const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy manifest.json to dist
fs.copyFileSync('manifest.json', 'dist/manifest.json');

// Copy sidepanel HTML and CSS to dist
if (!fs.existsSync('dist/sidepanel')) {
  fs.mkdirSync('dist/sidepanel', { recursive: true });
}
fs.copyFileSync('src/sidepanel/sidepanel.html', 'dist/sidepanel/sidepanel.html');
fs.copyFileSync('src/sidepanel/sidepanel.css', 'dist/sidepanel/sidepanel.css');

const buildOptions = {
  entryPoints: [
    'src/background.ts',
    'src/content.ts',
    'src/sidepanel/sidepanel.ts'
  ],
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  platform: 'browser',
  target: 'chrome100',
  sourcemap: isWatch ? 'inline' : false,
  logLevel: 'info',
};

async function build() {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('👀 Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      console.log('✅ Build completed successfully!');
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
