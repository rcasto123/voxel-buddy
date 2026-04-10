#!/usr/bin/env node
// scripts/generate-icons.js
// Generates app icon and tray icon from the Airie active.png artwork.
// Run: node scripts/generate-icons.js

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const src = path.join(__dirname, '../src/assets/airie/active.png')
const assetsDir = path.join(__dirname, '../assets')

fs.mkdirSync(assetsDir, { recursive: true })

async function main() {
  // 512x512 app icon — electron-builder auto-generates .icns/.ico from this
  await sharp(src)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, 'icon.png'))
  console.log('✓ assets/icon.png (512x512)')

  // macOS tray icon — Template suffix lets the OS handle dark/light mode inversion
  await sharp(src)
    .resize(22, 22, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, 'tray-iconTemplate.png'))
  console.log('✓ assets/tray-iconTemplate.png (22x22)')

  // Windows / Linux tray icon (no Template suffix)
  await sharp(src)
    .resize(22, 22, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, 'tray-icon.png'))
  console.log('✓ assets/tray-icon.png (22x22)')

  // 256x256 for Windows ICO source
  await sharp(src)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, 'icon-256.png'))
  console.log('✓ assets/icon-256.png (256x256)')

  console.log('\nDone! Run electron-builder to convert icon.png → .icns/.ico')
}

main().catch(console.error)
