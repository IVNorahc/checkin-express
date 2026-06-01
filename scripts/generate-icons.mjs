import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const logoPath = join(publicDir, 'percepta-logo.png')

// Fond blanc pur
const BG = { r: 255, g: 255, b: 255, alpha: 255 }

async function makeIcon(filename, size, logoScale) {
  const logoSize = Math.round(size * logoScale)
  const offset = Math.round((size - logoSize) / 2)

  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toFile(join(publicDir, filename))

  console.log(`✓ ${filename} (${size}×${size}, logo ${Math.round(logoScale * 100)}%)`)
}

// padding 10% → logo occupe 80% de la surface
await makeIcon('apple-touch-icon.png', 180, 0.80)
await makeIcon('pwa-192.png',          192, 0.80)
await makeIcon('pwa-512.png',          512, 0.80)

// maskable: logo dans la safe zone (66%) → échelle 0.52
await makeIcon('pwa-512-maskable.png', 512, 0.52)

console.log('\nTous les icônes ont été générés avec fond bleu opaque #1a3fa8')
