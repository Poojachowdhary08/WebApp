import QRCode from "qrcode";

/* eslint-env worker */
/* eslint-disable no-restricted-globals */

// Web Worker: generate QR PNG dataURLs off the main thread.
// Message in:
//  { type: "GENERATE", payload: { values: string[], options?: { width?: number, margin?: number } } }
// Message out:
//  { type: "PROGRESS", payload: { done: number, total: number } }
//  { type: "DONE", payload: { dataUrls: (string|null)[] } }
//  { type: "ERROR", payload: { message: string } }

self.onmessage = async (event) => {
  const msg = event?.data;
  if (!msg || msg.type !== "GENERATE") return;

  const values = Array.isArray(msg?.payload?.values) ? msg.payload.values : [];
  const width = Number(msg?.payload?.options?.width ?? 384);
  const margin = Number(msg?.payload?.options?.margin ?? 1);

  try {
    const total = values.length;
    const dataUrls = new Array(total).fill(null);

    for (let i = 0; i < total; i += 1) {
      const v = values[i];
      if (typeof v === "string" && v.trim()) {
        try {
          // eslint-disable-next-line no-await-in-loop
          dataUrls[i] = await QRCode.toDataURL(v, {
            margin,
            width,
            errorCorrectionLevel: "M",
          });
        } catch {
          dataUrls[i] = null;
        }
      }

      if (i % 4 === 0 || i === total - 1) {
        self.postMessage({ type: "PROGRESS", payload: { done: i + 1, total } });
      }
    }

    self.postMessage({ type: "DONE", payload: { dataUrls } });
  } catch (e) {
    self.postMessage({ type: "ERROR", payload: { message: String(e?.message || e) } });
  }
};

