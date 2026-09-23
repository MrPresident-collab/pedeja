/**
 * สร้างไอคอน Pedejá จาก SVG → PNG ทุกขนาด (ใช้ sharp)
 * รัน: node scripts/generate-icons.cjs
 */
const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const DIR = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(DIR, { recursive: true });

// ── SVG โลโก้ Pedejá (เหมือนหน้าเว็บ: gradient ส้ม + มอเตอร์ไซค์ + ข้อความ) ──
function makeSVG(size) {
  const r = Math.round(size * 0.20);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="102" fill="#6D28D9"/>
  <text x="256" y="318" text-anchor="middle" font-family="Ubuntu, Arial, sans-serif" font-size="300" font-weight="700" fill="#FFFFFF">P</text>
  <circle cx="256" cy="432" r="28" fill="#A78BFA"/>
</svg>`;
}
// ── list ของไอคอนที่ต้องสร้าง ─────────────────────────────────────────────────
const ICONS = [
  { name: 'icon-16.png',          size: 16  },
  { name: 'icon-32.png',          size: 32  },
  { name: 'icon-72.png',          size: 72  },
  { name: 'icon-96.png',          size: 96  },
  { name: 'icon-128.png',         size: 128 },
  { name: 'icon-144.png',         size: 144 },
  { name: 'icon-152.png',         size: 152 },
  { name: 'icon-180.png',         size: 180 },
  { name: 'icon-192.png',         size: 192 },
  { name: 'icon-384.png',         size: 384 },
  { name: 'icon-512.png',         size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png',       size: 32  },
  { name: 'shortcut-food.png',    size: 96  },
  { name: 'shortcut-parcel.png',  size: 96  },
];

(async () => {
  for (const { name, size } of ICONS) {
    const svg = Buffer.from(makeSVG(size));
    await sharp(svg, { density: 144 }).png().toFile(path.join(DIR, name));
    console.log(`✓ ${name} (${size}×${size})`);
  }

  // บันทึก SVG ต้นฉบับไว้ด้วย
  fs.writeFileSync(path.join(DIR, 'icon.svg'), makeSVG(512));
  console.log('✓ icon.svg');

  console.log('\n✅ ไอคอนทั้งหมดสร้างสำเร็จ →', DIR);
})();
