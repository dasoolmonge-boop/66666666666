const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'public', 'uploads');

const filesToCompress = [
    // Bar photos (the heaviest ones)
    'bar_2gis_4.jpg',
    'bar_main.jpg',
    'bar_2gis_3.jpg',
    'bar_2gis_2.jpg',
    'bar_2gis_1.jpg',
    'bar_2gis_5.jpg',
    // Hero background
    'hero_bg.jpeg',
    // Hotel exterior
    'hotel_exterior.jpg',
    // Restaurant photos
    'rest_1.jpg',
    'rest_2.jpg',
    'rest_3.jpg',
    'rest_4.jpg',
    // Yurt photo
    'yurt_night.jpg',
];

async function compressAll() {
    for (const file of filesToCompress) {
        const inputPath = path.join(uploadsDir, file);
        if (!fs.existsSync(inputPath)) {
            console.log(`SKIP: ${file} not found`);
            continue;
        }

        const oldSize = (fs.statSync(inputPath).size / 1024).toFixed(1);
        const ext = path.extname(file);
        const baseName = path.basename(file, ext);
        const webpPath = path.join(uploadsDir, baseName + '.webp');

        try {
            await sharp(inputPath)
                .resize({ width: 1200, withoutEnlargement: true })
                .webp({ quality: 75 })
                .toFile(webpPath);

            const newSize = (fs.statSync(webpPath).size / 1024).toFixed(1);
            const savings = (100 - (newSize / oldSize * 100)).toFixed(0);
            console.log(`OK: ${file} (${oldSize} KB) -> ${baseName}.webp (${newSize} KB) = -${savings}%`);
        } catch (err) {
            console.log(`ERROR: ${file} - ${err.message}`);
        }
    }

    // Also compress logo PNG
    const logoPath = path.join(uploadsDir, 'chalama_logo.png');
    if (fs.existsSync(logoPath)) {
        const oldSize = (fs.statSync(logoPath).size / 1024).toFixed(1);
        const webpPath = path.join(uploadsDir, 'chalama_logo.webp');
        await sharp(logoPath)
            .resize({ width: 400, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(webpPath);
        const newSize = (fs.statSync(webpPath).size / 1024).toFixed(1);
        console.log(`OK: chalama_logo.png (${oldSize} KB) -> chalama_logo.webp (${newSize} KB)`);
    }

    console.log('\nDONE! All images compressed.');
}

compressAll().catch(console.error);
