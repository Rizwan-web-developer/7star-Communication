/**
 * Print HTML on the same page using a hidden iframe.
 * This avoids `window.open` pop-ups / new tabs, so the shopkeeper never leaves
 * the current screen when printing receipts and slips.
 */
export function printHtmlOnSamePage(html: string) {
  if (typeof document === "undefined") return;
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.alert("Could not open the print view.");
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    const cleanup = () => {
      try {
        document.body.removeChild(iframe);
      } catch {
        /* already removed */
      }
    };
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.alert("Could not open the print view.");
      }
      // Keep the iframe long enough for slow print dialogs, then clean up.
      setTimeout(cleanup, 60_000);
    }, 120);
  } catch {
    window.alert("Could not open the print view.");
  }
}
