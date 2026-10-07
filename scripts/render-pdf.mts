// Render PDF pages to PNG (used to read the scanned HKEAA papers in paper/).
// Usage: tsx scripts/render-pdf.mts <file.pdf> <outDir> [pages, e.g. "1-3,8"] [scale]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

function parsePages(spec: string | undefined, total: number) {
  if (!spec) return Array.from({ length: total }, (_, i) => i + 1);
  return spec.split(",").flatMap((part) => {
    const [a, b] = part.split("-").map(Number);
    return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
  }).filter((n) => n >= 1 && n <= total);
}

export async function renderPdf(file: string, outDir: string, pages?: string, scale = 2) {
  const doc = await getDocument({ data: new Uint8Array(await readFile(file)), verbosity: 0 }).promise;
  await mkdir(outDir, { recursive: true });
  const written: string[] = [];
  for (const n of parsePages(pages, doc.numPages)) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // pdfjs expects a DOM-like canvas; @napi-rs/canvas is compatible enough for rendering.
    await page.render({ canvas: canvas as never, canvasContext: ctx as never, viewport }).promise;
    const out = path.join(outDir, `page${String(n).padStart(3, "0")}.png`);
    await writeFile(out, await canvas.encode("png"));
    written.push(out);
  }
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, outDir, pages, scale] = process.argv.slice(2);
  if (!file || !outDir) {
    console.error("Usage: tsx scripts/render-pdf.mts <file.pdf> <outDir> [pages] [scale]");
    process.exit(1);
  }
  for (const p of await renderPdf(file, outDir, pages, scale ? Number(scale) : 2)) console.log(p);
}
