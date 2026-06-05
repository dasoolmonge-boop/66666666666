const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, 'public');

async function getFiles(dir) {
    const subdirs = await fs.promises.readdir(dir);
    const files = await Promise.all(subdirs.map(async (subdir) => {
        const res = path.resolve(dir, subdir);
        return (await fs.promises.stat(res)).isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function scanDimensions() {
    console.log('--- СКАНИРОВАНИЕ РАЗРЕШЕНИЙ ИЗОБРАЖЕНИЙ ---\n');
    const allFiles = await getFiles(projectRoot);
    const imageFiles = allFiles.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

    let foundHuge = false;

    for (const file of imageFiles) {
        try {
            const metadata = await sharp(file).metadata();
            const relPath = path.relative(projectRoot, file);
            
            if (metadata.width > 2000) {
                foundHuge = true;
                console.log(`❌ ОГРОМНЫЙ: ${relPath}`);
                console.log(`   Разрешение: ${metadata.width}x${metadata.height} px`);
                console.log(`   Размер: ${(fs.statSync(file).size / 1024).toFixed(1)} KB\n`);
            }
        } catch (err) {
            // Игнорируем файлы, которые не являются изображениями
        }
    }

    if (!foundHuge) {
        console.log('✅ Все изображения в пределах нормы (меньше 2000px по ширине).');
    }
}

scanDimensions().catch(console.error);
