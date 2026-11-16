export type PdfBlock =
  | { kind: "title"; text: string }
  | { kind: "sub"; text: string }
  | { kind: "row"; label: string; value: string; bold?: boolean }
  | { kind: "text"; text: string; bold?: boolean }
  | { kind: "divider" }
  | { kind: "space" };

type RenderLine =
  | { type: "text"; x: number; y: number; size: number; bold: boolean; text: string }
  | { type: "line"; y: number };

const PAGE_WIDTH = 226.77; // 80mm
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 10.5;

function ascii(value: string): string {
  return String(value ?? "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number): string[] {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [""];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if ((current + " " + word).length <= maxChars) current += " " + word;
    else {
      lines.push(current);
      current = word;
    }
    while (current.length > maxChars) {
      lines.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function estimateWidth(text: string, size: number, bold: boolean): number {
  // Helvetica average glyph width is close to 0.52em; bold is slightly wider.
  return text.length * size * (bold ? 0.56 : 0.52);
}

function rightX(text: string, size: number, bold: boolean): number {
  return Math.max(MARGIN, PAGE_WIDTH - MARGIN - estimateWidth(text, size, bold));
}

function centerX(text: string, size: number, bold: boolean): number {
  return Math.max(MARGIN, (PAGE_WIDTH - estimateWidth(text, size, bold)) / 2);
}

function layout(blocks: PdfBlock[]): { height: number; lines: RenderLine[] } {
  const lines: RenderLine[] = [];
  let y = 0;

  const addText = (text: string, size: number, bold: boolean, x: number) => {
    lines.push({ type: "text", x, y, size, bold, text });
    y -= LINE_HEIGHT;
  };

  for (const block of blocks) {
    if (block.kind === "title") {
      y -= 4;
      for (const line of wrapText(block.text, 34)) addText(line, 11, true, centerX(line, 11, true));
      y -= 2;
    } else if (block.kind === "sub") {
      for (const line of wrapText(block.text, 44)) addText(line, 7.5, false, centerX(line, 7.5, false));
    } else if (block.kind === "text") {
      for (const line of wrapText(block.text, 46)) addText(line, 8, Boolean(block.bold), MARGIN);
    } else if (block.kind === "row") {
      const bold = Boolean(block.bold);
      const labelLines = wrapText(block.label, 28);
      const valueLines = wrapText(block.value, 20);
      const count = Math.max(labelLines.length, valueLines.length);
      const rowTop = y;
      for (let i = 0; i < count; i++) {
        const lineY = rowTop - i * LINE_HEIGHT;
        const label = labelLines[i] ?? "";
        const value = valueLines[i] ?? "";
        if (label) lines.push({ type: "text", x: MARGIN, y: lineY, size: 8, bold, text: label });
        if (value) lines.push({ type: "text", x: rightX(value, 8, bold), y: lineY, size: 8, bold, text: value });
      }
      y = rowTop - count * LINE_HEIGHT - 2;
    } else if (block.kind === "divider") {
      y -= 2;
      lines.push({ type: "line", y });
      y -= 6;
    } else if (block.kind === "space") {
      y -= 6;
    }
  }

  const top = 22;
  const height = Math.max(220, top - y + 18);
  for (const line of lines) line.y += height - top;
  return { height, lines };
}

/** Build a narrow (80mm) receipt PDF as a Blob, ready to share on WhatsApp. */
export function buildReceiptPdf(opts: { heading: string; subheading?: string; blocks: PdfBlock[]; footer?: string }): Blob {
  const blocks: PdfBlock[] = [{ kind: "title", text: opts.heading }];
  if (opts.subheading) blocks.push({ kind: "sub", text: opts.subheading });
  blocks.push({ kind: "divider" }, ...opts.blocks, { kind: "divider" });
  if (opts.footer) for (const line of wrapText(opts.footer, 46)) blocks.push({ kind: "sub", text: line });

  const { height, lines } = layout(blocks);

  const ops: string[] = [];
  for (const line of lines) {
    if (line.type === "line") {
      ops.push(`0.6 w ${MARGIN} ${line.y.toFixed(2)} m ${(PAGE_WIDTH - MARGIN).toFixed(2)} ${line.y.toFixed(2)} l S`);
    } else {
      ops.push(
        `BT /${line.bold ? "F2" : "F1"} ${line.size} Tf 1 0 0 1 ${line.x.toFixed(2)} ${line.y.toFixed(2)} Tm (${ascii(line.text)}) Tj ET`,
      );
    }
  }
  const content = ops.join("\n");

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const push = (text: string) => {
    const bytes = encoder.encode(text);
    chunks.push(bytes);
    byteLength += bytes.length;
  };

  push("%PDF-1.4\n");
  const offsets: number[] = [0];
  const addObject = (body: string) => {
    const num = offsets.length;
    offsets.push(byteLength);
    push(`${num} 0 obj\n${body}endobj\n`);
  };

  addObject("<< /Type /Catalog /Pages 2 0 R >>\n");
  addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n");
  addObject(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${height.toFixed(2)}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\n`,
  );
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\n");
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\n");
  const contentLength = encoder.encode(content).length;
  addObject(`<< /Length ${contentLength} >>\nstream\n${content}\nendstream\n`);

  const xrefPosition = byteLength;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`);

  const total = new Uint8Array(byteLength);
  let cursor = 0;
  for (const chunk of chunks) {
    total.set(chunk, cursor);
    cursor += chunk.length;
  }
  return new Blob([total], { type: "application/pdf" });
}
