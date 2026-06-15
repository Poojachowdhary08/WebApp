// src/utils/inventoryQr.js

/** Landing URL for printed/scanned QRs. Query params must match inventory lookup (parsed_*). */
const QR_INVENTORY_BASE = "https://avenueconnect.in/inventory/";

/**
 * Same rules as backend `parse_string` in `update-inventory-up` / QR refresh:
 * every space and "/" → "_". No trim (matches Python `parse_string` on payload strings).
 */
export function parseInventoryField(value) {
  const s = String(value ?? "");
  return s.replace(/ /g, "_").replace(/\//g, "_");
}

/**
 * QR payload shape 1: full URL. Host/path can be avenueconnect; scanners read
 * parsed_item_name, parsed_location, parsed_warehouse and call GET /lookup/inventory.
 */
export function buildInventoryQrValue(params) {
  const u = new URL(QR_INVENTORY_BASE);
  u.searchParams.set(
    "parsed_item_name",
    parseInventoryField(params?.parsed_item_name ?? "")
  );
  u.searchParams.set(
    "parsed_location",
    parseInventoryField(params?.parsed_location ?? "")
  );
  u.searchParams.set(
    "parsed_warehouse",
    parseInventoryField(params?.parsed_warehouse ?? "")
  );
  return u.toString();
}

/**
 * QR payload shape 2: JSON (same three concepts). Optional helper if you encode JSON in a QR elsewhere.
 */
export function buildInventoryQrJsonValue(params) {
  return JSON.stringify({
    parsed_item_name: parseInventoryField(params?.parsed_item_name ?? ""),
    parsed_location: parseInventoryField(params?.parsed_location ?? ""),
    parsed_warehouse: parseInventoryField(params?.parsed_warehouse ?? ""),
  });
}

/**
 * Best-effort parse for scanner outputs:
 * - full URL (any host) with parsed_item_name, parsed_location, parsed_warehouse
 * - raw querystring like "?parsed_item_name=..."
 * - JSON object with those keys (or item_name / location / warehouse aliases)
 */
export function parseInventoryQrValue(raw) {
  const input = String(raw ?? "").trim();
  if (!input) return null;

  const tryUrl = (s) => {
    try {
      return new URL(s);
    } catch {
      return null;
    }
  };

  // Shape 2: JSON
  if (input.startsWith("{")) {
    try {
      const obj = JSON.parse(input);
      if (!obj || typeof obj !== "object") return null;
      const parsed_item_name = String(
        obj.parsed_item_name ?? obj.item_name ?? obj.itemName ?? ""
      ).trim();
      const parsed_location = String(obj.parsed_location ?? obj.location ?? "").trim();
      const parsed_warehouse = String(obj.parsed_warehouse ?? obj.warehouse ?? "").trim();
      if (!parsed_item_name || !parsed_location || !parsed_warehouse) return null;
      return { parsed_item_name, parsed_location, parsed_warehouse };
    } catch {
      return null;
    }
  }

  // Shape 1: URL
  const url =
    tryUrl(input) ||
    (input.startsWith("?") ? tryUrl(`https://avenueconnect.in/inventory/${input}`) : null);

  if (!url) return null;

  const parsed_item_name = url.searchParams.get("parsed_item_name") || "";
  const parsed_location = url.searchParams.get("parsed_location") || "";
  const parsed_warehouse = url.searchParams.get("parsed_warehouse") || "";

  if (!parsed_item_name || !parsed_location || !parsed_warehouse) return null;

  return { parsed_item_name, parsed_location, parsed_warehouse };
}
