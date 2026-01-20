
import fs from 'fs';
import path from 'path';

const svgPath = path.join('public', 'banner.svg');
const outputPath = path.join('constants_banner.ts');

try {
    const svgContent = fs.readFileSync(svgPath);
    const base64 = svgContent.toString('base64');
    const fileContent = `export const BANNER_IMAGE_SRC = 'data:image/svg+xml;base64,${base64}';`;

    fs.writeFileSync(outputPath, fileContent);
    console.log('Successfully created constants_banner.ts');
} catch (error) {
    console.error('Error converting SVG:', error);
    process.exit(1);
}
