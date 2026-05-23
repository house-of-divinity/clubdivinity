// Resize + recompress a user-selected photo so we hit our ~300 KB
// per-photo storage budget. Runs entirely in the browser via canvas
// — no upload until the form is submitted. We use WebP because
// quality:size beats JPEG by ~30% at the same visible quality.

const MAX_DIM = 1200;
const QUALITY = 0.85;

export async function compressImage(
  file: File,
  maxDim = MAX_DIM,
  quality = QUALITY,
): Promise<File> {
  const img = await loadImage(file);
  const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, maxDim);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode failed"))),
      "image/webp",
      quality,
    ),
  );

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], baseName + ".webp", { type: "image/webp" });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not decode image"));
    };
    img.src = url;
  });
}

function scaleToFit(srcW: number, srcH: number, maxDim: number) {
  const longSide = Math.max(srcW, srcH);
  if (longSide <= maxDim) return { width: srcW, height: srcH };
  const scale = maxDim / longSide;
  return { width: Math.round(srcW * scale), height: Math.round(srcH * scale) };
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
