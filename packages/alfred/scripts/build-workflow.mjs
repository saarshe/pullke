#!/usr/bin/env node

import { execSync } from 'child_process';
import { mkdtemp, cp, mkdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

// Get current directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ALFRED_DIR = dirname(__dirname);
const WORKFLOW_DIR = join(ALFRED_DIR, 'workflow');
const DIST_DIR = join(ALFRED_DIR, 'dist');
const OUTPUT_DIR = join(ALFRED_DIR, 'build');

console.log('🔧 Building Pullke Alfred Workflow...');

try {
  // Ensure the TypeScript is built
  console.log('📦 Building TypeScript sources...');
  process.chdir(ALFRED_DIR);
  execSync('yarn build', { stdio: 'inherit' });

  // Create output directory
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Create a temporary directory for the workflow
  const TEMP_WORKFLOW_DIR = await mkdtemp(join(tmpdir(), 'pullke-workflow-'));
  console.log(`📂 Using temporary directory: ${TEMP_WORKFLOW_DIR}`);

  // Copy workflow files
  console.log('📋 Copying workflow files...');
  await cp(WORKFLOW_DIR, TEMP_WORKFLOW_DIR, { recursive: true });

  // Create dist directory in the temp workflow and copy compiled JS files
  console.log('📦 Copying compiled scripts...');
  const tempDistDir = join(TEMP_WORKFLOW_DIR, 'dist');
  await mkdir(tempDistDir, { recursive: true });
  
  // Copy JS files from source dist to temp dist directory
  const { readdir } = await import('fs/promises');
  const files = await readdir(DIST_DIR);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  
  for (const file of jsFiles) {
    await cp(join(DIST_DIR, file), join(tempDistDir, file));
  }

  // Create the .alfredworkflow file
  const WORKFLOW_FILE = join(OUTPUT_DIR, 'Pullke.alfredworkflow');
  console.log('🗜️  Creating workflow package...');
  
  await new Promise((resolve, reject) => {
    const output = createWriteStream(WORKFLOW_FILE);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(TEMP_WORKFLOW_DIR, false);
    archive.finalize();
  });

  // Clean up
  await rm(TEMP_WORKFLOW_DIR, { recursive: true, force: true });

  console.log('✅ Workflow built successfully!');
  console.log(`📍 Location: ${WORKFLOW_FILE}`);
  console.log('');
  console.log('🚀 To install:');
  console.log('   1. Double-click the .alfredworkflow file');
  console.log('   2. Configure organizations and keywords in Alfred\'s workflow settings');
  console.log('   3. Use \'pullke\' to search repositories');
  console.log('   4. Use \'pullke cc\' to clear cache');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
