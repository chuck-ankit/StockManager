const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const sourceIcon = path.join(__dirname, '../src/assets/logo.png');
const outputDir = path.join(__dirname, '../public');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate icons for each size
sizes.forEach(size => {
  sharp(sourceIcon)
    .resize(size, size)
    .toFile(path.join(outputDir, `icon-${size}x${size}.png`))
    .then(() => {
      console.log(`Generated icon-${size}x${size}.png`);
    })
    .catch(err => {
      console.error(`Error generating icon-${size}x${size}.png:`, err);
    });
}); 