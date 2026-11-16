/**
 * Maximum size (in data-URL characters) for one uploaded photo.
 * Five photos must stay well below Vercel's 4.5 MB function request limit,
 * so each photo is capped around 650 KB of base64 text.
 */
const MAX_DATA_URL_CHARS = 650_000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read this image."));
    image.src = src;
  });
}

/**
 * Read a picked image (gallery / camera) and shrink it to a compact JPEG data URL.
 * Keeping photos small makes stock-entry uploads fast and safe on Vercel.
 */
export async function fileToCompressedDataUrl(file: File, maxDimension = 1100, startQuality = 0.72): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });

  const image = await loadImage(raw);
  const scale = Math.min(1, maxDimension / Math.max(image.width || 1, image.height || 1));
  const width = Math.max(1, Math.round((image.width || 1) * scale));
  const height = Math.max(1, Math.round((image.height || 1) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return raw;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  let quality = startQuality;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (out.length > MAX_DATA_URL_CHARS && quality > 0.35) {
    quality -= 0.1;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  return out;
}
