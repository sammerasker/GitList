#!/usr/bin/env node

/**
 * Unified Build Script for GitLists Extension
 * Builds for both Chrome and Edge from a single codebase
 * 
 * Usage:
 *   npm run build:chrome    - Build for Chrome only
 *   npm run build:edge      - Build for Edge only
 *   npm run build:all       - Build for both browsers
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Parse command line arguments
const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const isWatch = args.includes('--watch');

// Determine target browser(s)
let targets = [];
if (args.includes('--target=chrome')) {
  targets = ['chrome'];
} else if (args.includes('--target=edge')) {
  targets = ['edge'];
} else if (args.includes('--target=all')) {
  targets = ['chrome', 'edge'];
} else {
  // Default to Chrome if no target specified
  targets = ['chrome'];
}

/**
 * Validate build output for placeholders
 */
function validateBuildOutput(target) {
  const distDir = target === 'chrome' ? 'dist-chrome' : 'dist-edge';
  const filesToCheck = [
    `${distDir}/background/serviceWorker.js`,
    `${distDir}/popup/popup.js`
  ];
  
  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('INJECTED_GITHUB_CLIENT_ID')) {
        console.error(`❌ Build validation failed: Found unreplaced placeholder in ${file}`);
        console.error('   This indicates the ESBuild define configuration is not working properly.');
        process.exit(1);
      }
    }
  }
  console.log(`✅ Build validation passed for ${target}: No placeholders found`);
}

/**
 * Build extension for a specific browser target
 */
async function buildForTarget(target) {
  const distDir = target === 'chrome' ? 'dist-chrome' : 'dist-edge';
  const manifestFile = target === 'chrome' ? 'manifest.chrome.json' : 'manifest.edge.json';
  
  console.log(`\n📦 Building for ${target.toUpperCase()}...`);
  
  try {
    // Validate environment variables
    const githubClientId = process.env.GITLINK_OAUTH_CLIENT_ID || '';
    
    if (!isDev && !isWatch && !githubClientId) {
      console.error('❌ Missing GITLINK_OAUTH_CLIENT_ID in .env');
      console.error('   This is required for production builds.');
      console.error('   Create a .env file with: GITLINK_OAUTH_CLIENT_ID=your_client_id_here');
      process.exit(1);
    }

    if (githubClientId) {
      console.log(`✅ GitHub Client ID loaded from environment`);
    } else {
      console.log(`⚠️  Development build: GitHub Client ID will use placeholder`);
    }

    // Create dist directories
    const dirs = [
      distDir,
      `${distDir}/background`,
      `${distDir}/popup`,
      `${distDir}/content`,
      `${distDir}/images`,
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // ESBuild configuration
    const buildConfig = {
      entryPoints: {
        'background/serviceWorker': 'src/background/serviceWorker.ts',
        'popup/popup': 'src/popup/popup.ts',
        'content/githubScraper': 'src/content/githubScraper.ts',
      },
      bundle: true,
      platform: 'browser',
      format: 'esm',
      outdir: distDir,
      sourcemap: isDev ? 'inline' : false,
      logLevel: 'info',
      target: 'ES2020',
      external: ['chrome'],
      minify: !isDev,
      treeShaking: true,
      define: {
        'process.env.TARGET': JSON.stringify(target),
        'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
        'INJECTED_GITHUB_CLIENT_ID': JSON.stringify(githubClientId),
      },
    };

    if (isWatch) {
      console.log(`👀 Watching for changes (${target})...`);
      const ctx = await esbuild.context(buildConfig);
      await ctx.watch();
    } else {
      await esbuild.build(buildConfig);
    }

    // Copy static files
    console.log(`📋 Copying static files for ${target}...`);
    
    // Copy manifest (browser-specific)
    const manifestPath = `static/${manifestFile}`;
    if (!fs.existsSync(manifestPath)) {
      console.error(`❌ Manifest file not found: ${manifestPath}`);
      process.exit(1);
    }
    fs.copyFileSync(manifestPath, `${distDir}/manifest.json`);

    // Copy images
    if (fs.existsSync('static/images')) {
      const images = fs.readdirSync('static/images');
      for (const image of images) {
        fs.copyFileSync(
          path.join('static/images', image),
          path.join(`${distDir}/images`, image)
        );
      }
    }

    // Copy HTML/CSS
    fs.copyFileSync('src/popup/popup.html', `${distDir}/popup/popup.html`);
    fs.copyFileSync('src/popup/popup.css', `${distDir}/popup/popup.css`);

    // Validate build output (skip in watch mode and dev mode)
    if (!isWatch && !isDev) {
      validateBuildOutput(target);
    }

    console.log(`✅ Build complete for ${target.toUpperCase()}!`);
    console.log(`   Output: ./${distDir}/`);
    
    if (!isWatch) {
      console.log(`\nTo load in ${target === 'chrome' ? 'Chrome' : 'Microsoft Edge'}:`);
      console.log(`  1. Open ${target}://extensions/`);
      console.log(`  2. Enable Developer mode`);
      console.log(`  3. Click "Load unpacked" and select ./${distDir}/`);
    }

  } catch (error) {
    console.error(`❌ Build failed for ${target}:`, error.message);
    process.exit(1);
  }
}

/**
 * Main build function
 */
async function build() {
  console.log('🚀 GitLists Unified Build System');
  console.log(`   Targets: ${targets.join(', ')}`);
  console.log(`   Mode: ${isDev ? 'development' : 'production'}`);
  console.log(`   Watch: ${isWatch ? 'enabled' : 'disabled'}`);

  if (isWatch && targets.length > 1) {
    console.error('❌ Watch mode only supports single target');
    console.error('   Use --target=chrome or --target=edge with --watch');
    process.exit(1);
  }

  // Build for each target
  for (const target of targets) {
    await buildForTarget(target);
  }

  if (isWatch) {
    console.log('\n✅ Build in watch mode. Press Ctrl+C to exit.');
  } else {
    console.log('\n🎉 All builds complete!');
  }
}

// Run build
build().catch(error => {
  console.error('❌ Build system error:', error);
  process.exit(1);
});
