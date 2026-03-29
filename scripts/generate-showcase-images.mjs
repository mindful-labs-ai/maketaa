import fs from 'fs';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDzLsUc9LO0hCD9Uz_1MVJcRwUw65R0LBc';
const MODEL = 'gemini-3-pro-image-preview';
const OUTPUT_DIR = path.resolve('public/showcase');

const prompts = [
  {
    filename: 'cafe-reel.png',
    prompt: `Professional food photography of a beautifully crafted latte art in a ceramic cup alongside a freshly baked croissant on a dark wooden table. Warm golden lighting from the side creates a cozy cafe atmosphere. Shallow depth of field with a blurred cafe interior in the background with soft bokeh lights. Top-down 45-degree angle. Rich warm color palette with deep browns, creamy whites, and golden highlights. Ultra realistic, 4K quality, magazine-worthy food styling. No text or watermarks.`
  },
  {
    filename: 'fashion-sale.png',
    prompt: `Elegant flat lay fashion composition on a clean marble surface. Arranged neatly: a folded cashmere sweater in soft blush pink, designer sunglasses, a leather handbag in camel color, gold jewelry (bracelet, earrings), and a small bouquet of dried flowers. Overhead shot, soft natural daylight from a window. Minimal and sophisticated styling. Muted pastel and neutral color palette. Professional product photography, editorial quality. No text or watermarks.`
  },
  {
    filename: 'fitness-video.png',
    prompt: `Dynamic fitness photography of an athletic person doing a powerful kettlebell swing in a modern, well-lit gym. Motion blur on the kettlebell showing explosive movement. The person wears stylish black and neon green workout clothes. Dramatic side lighting creates sharp shadows and highlights muscle definition. Modern industrial gym interior with exposed brick and large windows in the background. High contrast, energetic mood. Professional sports photography, cinematic quality. No text or watermarks.`
  },
  {
    filename: 'design-portfolio.png',
    prompt: `Clean and modern design workspace flat lay from above. A large monitor displays a colorful brand identity design with geometric shapes in purple, blue, and coral. Next to it: a drawing tablet with stylus, color swatches fanned out, a small succulent plant, and a cup of black coffee. The desk is matte white. Soft even studio lighting. Minimalist, creative, and professional atmosphere. Clean lines and organized layout. Ultra-modern aesthetic. No text or watermarks.`
  },
  {
    filename: 'beauty-tutorial.png',
    prompt: `Luxurious beauty product photography arrangement on a soft pink silk fabric background. A collection of premium skincare products: a glass serum bottle with golden dropper, a elegant moisturizer jar with rose gold lid, and scattered rose petals and small white flowers. Soft diffused lighting creates a dreamy glow. Dewdrops on the products suggest freshness. Pastel pink, gold, and white color palette. High-end cosmetic advertising quality. Macro details visible. No text or watermarks.`
  },
  {
    filename: 'education-review.png',
    prompt: `Inspiring online learning scene: a cozy home study setup with a laptop showing a video lecture on screen, surrounded by neatly organized notebooks with colorful tabs, a cup of green tea, and reading glasses. Warm afternoon sunlight streams through a window with sheer curtains. A small potted plant adds freshness. The overall mood is productive and calm. Soft warm color palette with whites, light wood tones, and gentle green accents. Lifestyle photography quality. No text or watermarks.`
  }
];

async function generateImage(item) {
  console.log(`Generating: ${item.filename}...`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [{
      parts: [{
        text: item.prompt
      }]
    }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"]
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error for ${item.filename}: ${res.status} ${errText}`);
  }

  const data = await res.json();

  // Extract image from response
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error(`No parts in response for ${item.filename}: ${JSON.stringify(data).slice(0, 500)}`);
  }

  const imagePart = parts.find(p => p.inlineData);
  if (!imagePart) {
    throw new Error(`No image data for ${item.filename}. Parts: ${JSON.stringify(parts.map(p => Object.keys(p)))}`);
  }

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const outPath = path.join(OUTPUT_DIR, item.filename);
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved: ${outPath} (${(buffer.length / 1024).toFixed(0)}KB)`);
}

// Generate all images sequentially to avoid rate limits
async function main() {
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Generating ${prompts.length} images...\n`);

  for (const item of prompts) {
    try {
      await generateImage(item);
    } catch (err) {
      console.error(`Failed: ${item.filename} - ${err.message}`);
    }
  }

  console.log('\nDone!');
}

main();
