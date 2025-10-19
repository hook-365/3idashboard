#!/usr/bin/env node

/**
 * Image Optimization Script
 *
 * Optimizes planet textures (JPEG) and gallery research images (PNG)
 * to reduce bundle size and improve page load performance.
 *
 * Target: 4.3MB → ~1.5MB (65% reduction)
 */

const fs = require('fs');
const path = require('path');

// Get file sizes before optimization
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (err) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function optimizeImages() {
  console.log('🖼️  Starting image optimization...\n');

  // Dynamic imports for ESM modules
  const imagemin = (await import('imagemin')).default;
  const imageminMozjpeg = (await import('imagemin-mozjpeg')).default;
  const imageminPngquant = (await import('imagemin-pngquant')).default;

  // Planet textures (JPEG)
  const planetTexturesPath = path.join(__dirname, '../public/textures/planets');
  const galleryImagesPath = path.join(__dirname, '../public/gallery/loeb-research');

  let totalBefore = 0;
  let totalAfter = 0;

  // Check if directories exist
  if (!fs.existsSync(planetTexturesPath)) {
    console.log('⚠️  Planet textures directory not found, skipping...');
  } else {
    console.log('📁 Optimizing planet textures (JPEG)...');

    // Get sizes before
    const jpgFiles = fs.readdirSync(planetTexturesPath).filter(f => f.endsWith('.jpg'));
    jpgFiles.forEach(file => {
      const filePath = path.join(planetTexturesPath, file);
      const size = getFileSize(filePath);
      totalBefore += size;
      console.log(`  Before: ${file} - ${formatBytes(size)}`);
    });

    // Optimize
    await imagemin([`${planetTexturesPath}/*.jpg`], {
      destination: planetTexturesPath,
      plugins: [
        imageminMozjpeg({ quality: 70 })
      ]
    });

    // Get sizes after
    jpgFiles.forEach(file => {
      const filePath = path.join(planetTexturesPath, file);
      const size = getFileSize(filePath);
      totalAfter += size;
      console.log(`  After:  ${file} - ${formatBytes(size)}`);
    });

    console.log('✅ Planet textures optimized!\n');
  }

  // Gallery research images (PNG)
  if (!fs.existsSync(galleryImagesPath)) {
    console.log('⚠️  Gallery images directory not found, skipping...');
  } else {
    console.log('📁 Optimizing gallery research images (PNG)...');

    // Get sizes before
    const pngFiles = fs.readdirSync(galleryImagesPath).filter(f => f.endsWith('.png'));
    pngFiles.forEach(file => {
      const filePath = path.join(galleryImagesPath, file);
      const size = getFileSize(filePath);
      totalBefore += size;
      console.log(`  Before: ${file} - ${formatBytes(size)}`);
    });

    // Optimize
    await imagemin([`${galleryImagesPath}/*.png`], {
      destination: galleryImagesPath,
      plugins: [
        imageminPngquant({
          quality: [0.65, 0.80],
          speed: 1 // Slower but better quality
        })
      ]
    });

    // Get sizes after
    pngFiles.forEach(file => {
      const filePath = path.join(galleryImagesPath, file);
      const size = getFileSize(filePath);
      totalAfter += size;
      console.log(`  After:  ${file} - ${formatBytes(size)}`);
    });

    console.log('✅ Gallery images optimized!\n');
  }

  // Summary
  const saved = totalBefore - totalAfter;
  const percentSaved = ((saved / totalBefore) * 100).toFixed(1);

  console.log('═══════════════════════════════════════');
  console.log('📊 OPTIMIZATION SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Total before: ${formatBytes(totalBefore)}`);
  console.log(`Total after:  ${formatBytes(totalAfter)}`);
  console.log(`Saved:        ${formatBytes(saved)} (${percentSaved}%)`);
  console.log('═══════════════════════════════════════\n');

  console.log('✅ Image optimization complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Run: npm run build');
  console.log('2. Start dev server: PORT=3020 npm run dev');
  console.log('3. Visual check:');
  console.log('   - http://localhost:3020/details (3D planets)');
  console.log('   - http://localhost:3020/gallery (research images)');
  console.log('4. If images look good, commit changes');
}

optimizeImages().catch(err => {
  console.error('❌ Error optimizing images:', err);
  process.exit(1);
});
