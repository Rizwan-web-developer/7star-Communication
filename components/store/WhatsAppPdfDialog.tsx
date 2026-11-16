"use client";

import { MessageCircle, Phone, X } from "lucide-react";

import { downloadBlob, openWhatsAppChat } from "@/lib/whatsapp-pdf";

export type WhatsAppPdfState = {
  phone: string;
  fileName: string;
  blob: Blob;
  title: string;
};

type Props = {
  state: WhatsAppPdfState | null;
  onClose: () => void;
  onDone: (message: string) => void;
};

/**
 * Fallback chooser shown when the browser cannot share PDF files directly.
 * The PDF is downloaded and the WhatsApp chat is opened with no text, so the
 * user only has to attach the downloaded PDF and press send.
 */
export function WhatsAppPdfDialog({ state, onClose, onDone }: Props) {
  if (!state) return null;

  const open = (mode: "web" | "app") => {
    downloadBlob(state.blob, state.fileName);
    openWhatsAppChat(state.phone, mode);
    onDone("PDF downloaded. Attach it in the WhatsApp chat and send.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Send PDF on WhatsApp">
      <div className="absolute inset-0 bg-overlay/65 backdrop-blur-sm" onMouseDown={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 shadow-panel sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Send PDF on WhatsApp</h2>
            <p className="mt-1 text-sm text-muted">
              WhatsApp links cannot attach a file automatically. The PDF will download now — open WhatsApp, attach the PDF and send.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => open("web")}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 px-4 py-2.5 text-sm font-semibold text-foreground hover:border-accent/40"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp Web
          </button>
          <button
            type="button"
            onClick={() => open("app")}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Phone className="h-4 w-4" /> WhatsApp App
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">Tip: on mobile, the share sheet sends the PDF directly to WhatsApp as a document.</p>
      </div>
    </div>
  );
}
