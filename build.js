#!/usr/bin/env node

/**
 * Build script for GitLists Microsoft Edge Extension
 * Runs esbuild and copies static files to dist/
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');
const isEdgeTarget = process.argv.includes('--target=edge') || true; // Default to Edge

/**
 * Post-build sanity check: ensure no placeholders remain in built files
 */
function validateBuildOutput() {
  const filesToCheck = [
    'dist/background/serviceWorker.js',
    'dist/popup/popup.js'
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
  console.log('✅ Build validation passed: No placeholders found in output');
}

async function buildExtension() {
  try {
    // Validate required environment variables for maintainer builds
    const githubClientId = process.env.GITLINK_OAUTH_CLIENT_ID || '';
    
    if (!isDev && !isWatch && !githubClientId) {
      console.error('❌ Missing GITLINK_OAUTH_CLIENT_ID in .env');
      console.error('   This is required for production builds.');
      console.error('   Create a .env file with: GITLINK_OAUTH_CLIENT_ID=your_client_id_here');
      process.exit(1);
    }

    if (githubClientId) {
      console.log('✅ GitHub Client ID loaded from environment');
    } else {
      console.log('⚠️  Development build: GitHub Client ID will use placeholder');
    }

    // Create dist directories
    const dirs = [
      'dist',
      'dist/background',
      'dist/popup',
      'dist/content',
      'dist/images',
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    console.log('📦 Building extension files for Microsoft Edge...');

    // esbuild configuration optimized for Edge
    const buildConfig = {
      entryPoints: {
        'background/serviceWorker': 'src/background/serviceWorker.ts',
        'popup/popup': 'src/popup/popup.ts',
        'content/githubScraper': 'src/content/githubScraper.ts',
      },
      bundle: true,
      platform: 'browser',
      format: 'esm',
      outdir: 'dist',
      sourcemap: isDev ? 'inline' : false,
      logLevel: 'info',
      target: 'ES2020', // Edge 88+ supports ES2020
      external: ['chrome'], // Edge uses chrome APIs
      minify: !isDev,
      treeShaking: true,
      define: {
        'process.env.TARGET': JSON.stringify('edge'),
        'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
        'INJECTED_GITHUB_CLIENT_ID': JSON.stringify(githubClientId),
      },
    };

    if (isWatch) {
      console.log('👀 Watching for changes...');
      const ctx = await esbuild.context(buildConfig);
      await ctx.watch();
      console.log('✅ Build in watch mode. Press Ctrl+C to exit.');
    } else {
      await esbuild.build(buildConfig);
    }

    // Copy static files
    console.log('📋 Copying static files...');
    fs.copyFileSync('static/manifest.json', 'dist/manifest.json');

    // Copy images
    if (fs.existsSync('static/images')) {
      const images = fs.readdirSync('static/images');
      for (const image of images) {
        fs.copyFileSync(
          path.join('static/images', image),
          path.join('dist/images', image)
        );
      }
    }

    // Copy HTML/CSS
    fs.copyFileSync('src/popup/popup.html', 'dist/popup/popup.html');
    fs.copyFileSync('src/popup/popup.css', 'dist/popup/popup.css');

    // Validate build output (skip in watch mode and dev mode)
    if (!isWatch && !isDev) {
      validateBuildOutput();
    }

    console.log('✅ Build complete for Microsoft Edge!');
    console.log('');
    console.log('To load the extension in Microsoft Edge:');
    console.log('  1. Open edge://extensions/');
    console.log('  2. Enable Developer mode (toggle in left sidebar)');
    console.log('  3. Click "Load unpacked" and select ./dist/');
    console.log('');
    console.log('To package for Edge Add-ons store:');
    console.log('  npm run package');

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

buildExtension();
