#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/agwaterdesk/2025-latam-china-trade/refs/heads/main/dist/';
const DIST_PATH = join(__dirname, 'dist');
const INDEX_HTML_PATH = join(DIST_PATH, 'index.html');
const OUTPUT_PATH = join(__dirname, 'wordpress-github-embed.html');

function extractFileInfo(htmlContent) {
    // Extract CSS file
    const cssMatch = htmlContent.match(/href="\.\/_app\/immutable\/assets\/([^"]+\.css)"/);
    const cssFile = cssMatch ? cssMatch[1] : null;
    
    // Extract all modulepreload files
    const modulepreloadMatches = htmlContent.matchAll(/href="\.\/_app\/immutable\/([^"]+\.js)"/g);
    const modulepreloadFiles = Array.from(modulepreloadMatches).map(match => match[1]);
    
    // Extract entry files from the script section
    const startMatch = htmlContent.match(/import\("\.\/_app\/immutable\/entry\/([^"]+\.js)"\)/);
    const appMatch = htmlContent.match(/import\("\.\/_app\/immutable\/entry\/([^"]+\.js)"\)/g);
    
    const startFile = startMatch ? startMatch[1] : null;
    const appFiles = appMatch ? appMatch.map(m => m.match(/import\("\.\/_app\/immutable\/entry\/([^"]+\.js)"\)/)[1]) : [];
    const appFile = appFiles[appFiles.length - 1]; // Get the last one (usually the main app file)
    
    // Extract SvelteKit configuration variable name
    const configMatch = htmlContent.match(/window\.(__sveltekit_\w+)/);
    const configVar = configMatch ? configMatch[1] : '__sveltekit_9jff17';
    
    return {
        cssFile,
        modulepreloadFiles,
        startFile,
        appFile,
        configVar
    };
}

function generateEmbedHTML(info) {
    const { cssFile, modulepreloadFiles, startFile, appFile, configVar } = info;
    
    return `<!-- GitHub-Hosted WordPress Embed for Svelte App -->
<!-- 
INSTRUCTIONS:
1. Run 'npm run build' to generate the dist folder
2. Commit and push your dist folder to GitHub
3. Copy this entire block into a WordPress Custom HTML block
4. No file uploads needed - files are served from GitHub!

AUTO-GENERATED: This file is automatically updated when you run the build process.
-->

<!-- Load CSS from GitHub -->
<link href="${GITHUB_BASE_URL}_app/immutable/assets/${cssFile}" rel="stylesheet">

<!-- Preload critical modules for better performance -->
${modulepreloadFiles.map(file => `<link rel="modulepreload" href="${GITHUB_BASE_URL}_app/immutable/${file}">`).join('\n')}

<!-- App Container -->
<div id="svelte-app-container">
    <!-- Static content will be replaced by Svelte -->
    <div class="demo svelte-vfho01">
        <p>Loading Svelte app...</p>
    </div>
</div>

<script>
// Initialize Svelte app from GitHub
(function() {
    const BASE_URL = "${GITHUB_BASE_URL}";
    
    // Set up SvelteKit configuration
    window.${configVar} = { base: BASE_URL };
    
    const container = document.getElementById('svelte-app-container');
    
    // Load the app from GitHub
    Promise.all([
        import(BASE_URL + '_app/immutable/entry/${startFile}'),
        import(BASE_URL + '_app/immutable/entry/${appFile}')
    ]).then(([kit, app]) => {
        kit.start(app, container, {
            node_ids: [0, 2],
            data: [null, null],
            form: null,
            error: null
        });
    }).catch(error => {
        console.error('Svelte app failed to load:', error);
        container.innerHTML = '<p>Error loading app. Please check the GitHub repository.</p>';
    });
})();
</script>`;
}

function main() {
    console.log('🔍 Checking for dist/index.html...');
    
    if (!existsSync(INDEX_HTML_PATH)) {
        console.error('❌ dist/index.html not found. Please run "npm run build" first.');
        process.exit(1);
    }
    
    console.log('📖 Reading dist/index.html...');
    const htmlContent = readFileSync(INDEX_HTML_PATH, 'utf-8');
    
    console.log('🔧 Extracting file information...');
    const fileInfo = extractFileInfo(htmlContent);
    
    console.log('📝 Generating embed HTML...');
    const embedHTML = generateEmbedHTML(fileInfo);
    
    console.log('💾 Writing wordpress-github-embed.html...');
    writeFileSync(OUTPUT_PATH, embedHTML);
    
    console.log('✅ Embed file generated successfully!');
    console.log(`📁 Output: ${OUTPUT_PATH}`);
    console.log('\n📋 Files detected:');
    console.log(`   CSS: ${fileInfo.cssFile}`);
    console.log(`   Start: ${fileInfo.startFile}`);
    console.log(`   App: ${fileInfo.appFile}`);
    console.log(`   Config: ${fileInfo.configVar}`);
    console.log(`   Modulepreload: ${fileInfo.modulepreloadFiles.length} files`);
}

main();
