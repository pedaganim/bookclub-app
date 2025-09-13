/*
  Generate PNG app icons and favicon.ico from public/logo.svg
  Requirements: devDependencies sharp, png-to-ico
  Usage: npm run assets:generate
*/

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

async function main() {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const srcPng = path.join(publicDir, 'logo.png');
  const srcSvg = path.join(publicDir, 'logo.svg');
  const out192 = path.join(publicDir, 'logo192.png');
  const out512 = path.join(publicDir, 'logo512.png');
  const fav16 = path.join(publicDir, 'favicon-16.png');
  const fav32 = path.join(publicDir, 'favicon-32.png');
  const fav48 = path.join(publicDir, 'favicon-48.png');
  const outIco = path.join(publicDir, 'favicon.ico');

  const src = fs.existsSync(srcPng) ? srcPng : srcSvg;
  if (!fs.existsSync(src)) {
    console.error(`Source image not found. Place your logo at: ${srcPng} (preferred PNG) or ${srcSvg}`);
    process.exit(1);
  }

  console.log(`Generating PNG icons from ${path.basename(src)} ...`);
  await sharp(src)
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(out192);

  await sharp(src)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(out512);

  console.log('Generating favicon PNG sizes (16,32,48) ...');
  await sharp(src).resize(16, 16).png().toFile(fav16);
  await sharp(src).resize(32, 32).png().toFile(fav32);
  await sharp(src).resize(48, 48).png().toFile(fav48);

  console.log('Generating favicon.ico ...');
  const icoBuffer = await pngToIco([fav16, fav32, fav48]);
  fs.writeFileSync(outIco, icoBuffer);

  // Cleanup temporary PNGs
  [fav16, fav32, fav48].forEach((p) => {
    try { fs.unlinkSync(p); } catch { /* ignore */ }
  });

  console.log('Done. Wrote:');
  console.log(` - ${path.relative(process.cwd(), out192)}`);
  console.log(` - ${path.relative(process.cwd(), out512)}`);
  console.log(` - ${path.relative(process.cwd(), outIco)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
