export type SharePdfResult = "shared" | "cancelled" | "unsupported";

/**
 * Share a PDF through the device share sheet (Android / iOS / Windows).
 * This is the only way a WhatsApp link can send an actual PDF file, because
 * `wa.me` links can only prefill text — they cannot attach documents.
 */
export async function sharePdfFile(blob: Blob, fileName: string, title: string, text?: string): Promise<SharePdfResult> {
  if (typeof navigator === "undefined") return "unsupported";
  const nav = navigator as any;
  if (!nav.share) return "unsupported";
  try {
    const file = new File([blob], fileName, { type: "application/pdf" });
    if (nav.canShare && !nav.canShare({ files: [file] })) return "unsupported";
    await nav.share({ files: [file], title, text });
    return "shared";
  } catch (error: any) {
    return error?.name === "AbortError" ? "cancelled" : "unsupported";
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Open a WhatsApp chat with no prefilled text (the PDF is attached by the user). */
export function openWhatsAppChat(phone: string, mode: "web" | "app") {
  if (typeof window === "undefined") return;
  const base = mode === "web" ? "https://web.whatsapp.com/send" : "https://api.whatsapp.com/send";
  window.open(`${base}?phone=${encodeURIComponent(phone)}`, "_blank", "noopener,noreferrer");
}
