import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  LinearProgress,
} from "@mui/material";
import axios from "axios";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import * as XLSX from "xlsx";

const norm = (v) => String(v ?? "").trim();
const capWords = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
const num0 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const locKey = (v) => norm(v).toLowerCase().replace(/\s+/g, "");
const IGNORED_LOCATIONS = new Set([
  "hyderabad",
  "serenagrande",
]);
const isIgnoredLocation = (location) => IGNORED_LOCATIONS.has(locKey(location));
const sameName = (a, b) => norm(a).toLowerCase() === norm(b).toLowerCase();
/** Single-sheet uploads; multi-sheet workbooks can go higher (e.g. 20×100). */
const RECOMMENDED_MAX_EXCEL_ROWS = 500;
const STRONG_WARNING_MAX_EXCEL_ROWS = 2500;
/** Preview table rows (full list still drives transfer + validation). */
const PREVIEW_TABLE_MAX_ROWS = 400;
/** Parallel master lookups for large files */
const MASTER_NAME_FETCH_CHUNK = 20;
/** Cap cards in the name-change explainer (full list still applies on Apply). */
const NAME_CHANGE_DIALOG_MAX_ROWS = 250;

export default function BulkStockTransferDialog({
  open,
  onClose,
  onSuccess,
  apiBase = "http://localhost:8080",
  inventory = [],
  warehouseOptions = [],
  locationOptions = [],
  initialFromLocation = "",
  initialToLocation = "",
}) {
  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [employeeCode, setEmployeeCode] = useState(
    localStorage.getItem("employee_code") ||
      localStorage.getItem("employeeCode") ||
      localStorage.getItem("employee_no") ||
      localStorage.getItem("employeeNo") ||
      ""
  );
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [reason, setReason] = useState("");
  // qty is driven by Excel; we keep an internal map derived from excel + matching
  const [qtyByKey, setQtyByKey] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [results, setResults] = useState(null); // {success:[], failed:[]}
  const [uploadNotice, setUploadNotice] = useState("");
  const [uploadedNameByMid, setUploadedNameByMid] = useState({});
  const [excelRows, setExcelRows] = useState([]); // [{rowNo, id, item_name, qty}]
  const [emptyIdSummary, setEmptyIdSummary] = useState(null); // { totalRows, emptyIdRows, sheetsWithEmptyId, sample: [] }
  // Excel-driven flow: we do not render/load a full items table
  const [masterNameById, setMasterNameById] = useState({}); // { [id]: item_name }
  const [masterNamesLoading, setMasterNamesLoading] = useState(false);
  const [fixingNames, setFixingNames] = useState(false);
  const [creatingMasters, setCreatingMasters] = useState(false);
  const [nameChangesDialogOpen, setNameChangesDialogOpen] = useState(false);
  // Manual overrides for master rename (mid -> new name)
  const [renameOverrideByMid, setRenameOverrideByMid] = useState({});

  const fromOptions = useMemo(() => {
    const m = new Map();
    (inventory || []).forEach((r) => {
      const location = capWords(r?.location || "");
      if (!location) return;
      if (isIgnoredLocation(location)) return;
      const key = location; // ✅ project name only
      const prev = m.get(key);
      const qty = num0(r?.quantity ?? r?.available_quantity);
      m.set(key, { key, location, totalQty: (prev?.totalQty || 0) + qty });
    });
    return Array.from(m.values()).sort((a, b) => {
      return a.location.localeCompare(b.location);
    });
  }, [inventory]);

  const toOptions = useMemo(() => {
    const locs = (locationOptions || [])
      .filter((x) => x && x !== "ALL")
      .map(capWords);
    const uniq = Array.from(new Set(locs));
    return uniq
      .map((location) => ({ key: location, location }))
      .sort((a, b) => a.location.localeCompare(b.location));
  }, [locationOptions, warehouseOptions]);

  const selectedFrom = useMemo(() => fromOptions.find((x) => x.key === fromKey) || null, [fromOptions, fromKey]);
  const selectedTo = useMemo(() => toOptions.find((x) => x.key === toKey) || null, [toOptions, toKey]);

  const fromInventoryIndex = useMemo(() => {
    const fl = norm(selectedFrom?.location).toLowerCase();
    if (!fl || !selectedFrom || isIgnoredLocation(selectedFrom.location)) return { byMid: new Map(), byName: new Map() };

    const byMid = new Map(); // mid -> bestRow
    const byName = new Map(); // item_name_lower -> bestRow

    (inventory || []).forEach((r) => {
      if (norm(r?.location).toLowerCase() !== fl) return;
      const available = num0(r?.quantity ?? r?.available_quantity);
      if (available <= 0) return;

      const masterItemId = r?.master_item_id ?? r?.masterItemId ?? r?.item_id ?? r?.id ?? null;
      const itemName = norm(r?.item_name ?? r?.itemName ?? r?.name);
      const warehouse = capWords(r?.warehouse || "");
      if (!itemName) return;

      const row = { masterItemId, itemName, available, warehouse };

      if (masterItemId != null) {
        const k = String(masterItemId);
        const prev = byMid.get(k);
        if (!prev || row.available > prev.available) byMid.set(k, row);
      }

      const nk = itemName.toLowerCase();
      const prev2 = byName.get(nk);
      if (!prev2 || row.available > prev2.available) byName.set(nk, row);
    });

    return { byMid, byName };
  }, [inventory, selectedFrom]);

  const pickInvRowForExcel = useMemo(() => {
    // Returns best matching stock row in FROM location for an excel row
    return (mid, excelName) => {
      const id = norm(mid);
      const xName = norm(excelName);
      if (!selectedFrom || isIgnoredLocation(selectedFrom.location)) return null;

      // 1) Prefer master_item_id match (if inventory rows have it)
      if (id) {
        const byId = fromInventoryIndex.byMid.get(id);
        if (byId) return byId;
      }

      // 2) Fallback to master name (more reliable than stock name drift)
      const masterName = id ? norm(masterNameById[id]) : "";
      if (masterName) {
        const byMasterName = fromInventoryIndex.byName.get(masterName.toLowerCase());
        if (byMasterName) return byMasterName;
      }

      // 3) Fallback to excel name
      if (xName) {
        const byExcelName = fromInventoryIndex.byName.get(xName.toLowerCase());
        if (byExcelName) return byExcelName;
      }

      return null;
    };
  }, [fromInventoryIndex.byMid, fromInventoryIndex.byName, masterNameById, selectedFrom]);

  useEffect(() => {
    if (!open) return;
    setNameChangesDialogOpen(false);
    setError("");
    setResults(null);
    setUploadNotice("");
    setEmptyIdSummary(null);
    setUploadedNameByMid({});
    setExcelRows([]);
    setMasterNameById({});
    setMasterNamesLoading(false);
    setSubmitting(false);
    setFromKey(norm(initialFromLocation));
    setToKey(norm(initialToLocation));
    setRenameOverrideByMid({});
    setEmployeeCode(
      localStorage.getItem("employee_code") ||
        localStorage.getItem("employeeCode") ||
        localStorage.getItem("employee_no") ||
        localStorage.getItem("employeeNo") ||
        ""
    );
    setReason("");
    setQtyByKey({});
    setProgress({ done: 0, total: 0 });
    setEmail(localStorage.getItem("email") || "");
  }, [open, initialFromLocation, initialToLocation]);

  useEffect(() => {
    // Fetch current master item names for Excel ids (for preview + rename decision)
    if (!open) return;
    const ids = Array.from(
      new Set(
        (excelRows || [])
          .map((r) => norm(r.id))
          .filter(Boolean)
      )
    );
    if (!ids.length) return;

    let cancelled = false;
    async function run() {
      setMasterNamesLoading(true);
      try {
        const next = {};
        // simple concurrency limit
        const limit = MASTER_NAME_FETCH_CHUNK;
        for (let i = 0; i < ids.length; i += limit) {
          const chunk = ids.slice(i, i + limit);
          const res = await Promise.allSettled(
            chunk.map((id) =>
              axios.get(`${apiBase}/get-item-with-uom/${id}`, { validateStatus: (s) => s < 500 })
            )
          );
          res.forEach((r, idx) => {
            const id = chunk[idx];
            if (r.status !== "fulfilled") return;
            const data = r.value?.data;
            const name = norm(data?.item?.item_name);
            if (name) next[id] = name;
          });
        }
        if (!cancelled) setMasterNameById((prev) => ({ ...prev, ...next }));
      } finally {
        if (!cancelled) setMasterNamesLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [apiBase, excelRows, open]);

  const handleUploadExcel = async (file) => {
    setError("");
    setResults(null);
    setUploadNotice("");
    setEmptyIdSummary(null);
    setExcelRows([]);
    if (!file) return;

    const name = String(file.name || "").toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Only Excel files (.xls, .xlsx) are allowed.");
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sheetNames = wb.SheetNames || [];
      if (!sheetNames.length) throw new Error("Excel has no sheets.");

      const pick = (row, keys) => {
        for (const k of keys) {
          if (row && row[k] != null && String(row[k]).trim() !== "") return row[k];
        }
        return "";
      };

      const rowHasData = (row) => {
        const idRaw = pick(row, ["id", "ID", "master_item_id", "masterItemId", "item_id"]);
        const nameRaw = pick(row, ["item_name", "ITEM_NAME", "Item Name", "Item", "ITEM", "item", "name"]);
        const qtyRaw = pick(row, ["qty", "Qty", "QTY", "quantity", "Quantity", "transfer_qty", "Transfer Qty", "TRANSFER QTY"]);
        return !!(norm(idRaw) || norm(nameRaw) || String(qtyRaw ?? "").trim() !== "");
      };

      const parsed = [];
      let globalRow = 0;
      const perSheetCounts = [];
      const emptyIdSamples = [];
      let emptyIdRows = 0;
      const sheetsWithEmptyId = new Set();

      for (const sheetName of sheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!Array.isArray(json) || json.length === 0) continue;

        let sheetRows = 0;
        json.forEach((row, idx) => {
          if (!rowHasData(row)) return;
          globalRow += 1;
          sheetRows += 1;
          const idRaw = pick(row, ["id", "ID", "master_item_id", "masterItemId", "item_id"]);
          const nameRaw = pick(row, ["item_name", "ITEM_NAME", "Item Name", "Item", "ITEM", "item", "name"]);
          const qtyRaw = pick(row, ["qty", "Qty", "QTY", "quantity", "Quantity", "transfer_qty", "Transfer Qty", "TRANSFER QTY"]);
          const idNorm = norm(idRaw);
          const nameNorm = norm(nameRaw);
          if (!idNorm && nameNorm) {
            emptyIdRows += 1;
            sheetsWithEmptyId.add(sheetName);
            if (emptyIdSamples.length < 5) {
              emptyIdSamples.push({
                sheet: sheetName,
                rowInSheet: idx + 1,
                item_name: nameNorm,
                qty: qtyRaw,
              });
            }
          }
          parsed.push({
            rowNo: globalRow,
            sheet: sheetName,
            rowInSheet: idx + 1,
            id: idNorm,
            item_name: nameNorm,
            qty: qtyRaw,
          });
        });
        if (sheetRows > 0) perSheetCounts.push({ name: sheetName, count: sheetRows });
      }

      const hasAny = parsed.length > 0;
      if (!hasAny) {
        setError(
          "No data rows found. Put id, item_name, and qty on each sheet (same columns on every sheet). Empty sheets are skipped."
        );
        return;
      }

      setExcelRows(parsed);
      setEmptyIdSummary({
        totalRows: parsed.length,
        emptyIdRows,
        sheetsWithEmptyId: Array.from(sheetsWithEmptyId.values()),
        sample: emptyIdSamples,
      });
      const sheetSummary =
        perSheetCounts.length > 1
          ? `${perSheetCounts.length} sheets merged, ${parsed.length} row(s). ` +
            (perSheetCounts.length <= 8
              ? perSheetCounts.map((s) => `"${s.name}" ${s.count}`).join(" · ") + ". "
              : `${perSheetCounts
                  .slice(0, 5)
                  .map((s) => `"${s.name}" ${s.count}`)
                  .join(" · ")} · +${perSheetCounts.length - 5} more. `)
          : `${parsed.length} row(s). `;
      setUploadNotice(
        `${sheetSummary}Preview uses the selected FROM location. Transfer runs on all rows.`
      );
    } catch (e) {
      setError(e?.message || "Failed to read Excel.");
    }
  };

  const excelPreview = useMemo(() => {
    const hasFrom = !!selectedFrom && !isIgnoredLocation(selectedFrom?.location);
    return (excelRows || []).map((r) => {
      const itemName = norm(r.item_name);
      const mid = norm(r.id);
      const masterName = mid ? norm(masterNameById[mid]) : "";
      const count = Number(r.qty);
      const invRow = hasFrom ? pickInvRowForExcel(mid, itemName) : null;
      const key = invRow
        ? invRow.masterItemId != null
          ? `mid:${invRow.masterItemId}`
          : `name:${invRow.itemName.toLowerCase()}`
        : null;

      const willRename = !!mid && !!itemName && !!masterName && !sameName(itemName, masterName);
      // If id is provided but not found in master, we flag missing.
      // If id is NOT provided, we also flag missing (needs master creation / id mapping).
      const masterMissing = (!!mid && !masterName && !masterNamesLoading) || (!mid && !!itemName);
      const stockName = invRow?.itemName ? norm(invRow.itemName) : "";
      const stockMismatch = !!mid && !!masterName && !!stockName && !sameName(stockName, masterName);

      let status = "SKIPPED";
      let note = "";
      if (!mid && !itemName) note = "Missing id and item_name";
      else if (!Number.isFinite(count)) note = "Invalid qty";
      else if (!hasFrom) {
        status = "PENDING";
        note = "Select FROM location to validate";
      } else if (!key) note = "Not in FROM location";
      else status = "APPLIED";

      if (!mid && itemName) {
        // make it explicit why create is needed
        note = note ? `${note} • Missing id (master mapping needed)` : "Missing id (master mapping needed)";
      } else if (mid && !masterName && !masterNamesLoading) {
        note = note ? `${note} • Master id not found` : "Master id not found";
      }

      return {
        rowNo: r.rowNo,
        sheet: r.sheet || "",
        row_in_sheet: r.rowInSheet ?? "",
        master_item_id: mid || "",
        master_item_name: masterName || "",
        stock_item_name: stockName || "",
        item_name: itemName || "",
        transfer_qty: r.qty ?? "",
        match_key: key || "",
        status,
        will_rename: willRename ? "YES" : "NO",
        master_missing: masterMissing ? "YES" : "NO",
        stock_mismatch: stockMismatch ? "YES" : "NO",
        note:
          invRow && status === "APPLIED"
            ? `${note}${note ? " • " : ""}From warehouse: ${invRow.warehouse} • Avl: ${invRow.available}`
            : note,
      };
    });
  }, [excelRows, fromInventoryIndex, masterNameById, pickInvRowForExcel, masterNamesLoading, selectedFrom]);

  const masterNameChangeRows = useMemo(
    () =>
      (excelPreview || []).filter(
        (r) => r.will_rename === "YES" || r.stock_mismatch === "YES"
      ),
    [excelPreview]
  );

  /** Rows that rename-and-migrate can run on (same rules as handleFixNames). */
  const rowsEligibleForNameFix = useMemo(
    () =>
      (excelPreview || []).filter(
        (r) =>
          (r.will_rename === "YES" || r.stock_mismatch === "YES") &&
          r.master_item_id &&
          norm(r.item_name)
      ),
    [excelPreview]
  );

  const gating = useMemo(() => {
    const list = excelPreview || [];
    const needsRename = list.some((r) => r.will_rename === "YES");
    const missingMaster = list.some((r) => r.master_missing === "YES");
    const stockMismatch = list.some((r) => r.stock_mismatch === "YES");
    const pending = list.some((r) => r.status === "PENDING");
    const hasExcel = (excelRows || []).length > 0;
    const hasFromTo = !!fromKey && !!toKey;
    return {
      hasExcel,
      hasFromTo,
      pending,
      needsRename,
      missingMaster,
      stockMismatch,
      canTransfer:
        hasExcel && hasFromTo && !pending && !needsRename && !missingMaster && !stockMismatch && !submitting,
      // Rename API does not need FROM/TO — only Excel + master ids (wait until master names are loaded).
      canFixNames:
        hasExcel &&
        rowsEligibleForNameFix.length > 0 &&
        !masterNamesLoading &&
        !fixingNames &&
        !submitting,
      canCreateMasters: hasExcel && missingMaster && !creatingMasters && !submitting,
    };
  }, [
    creatingMasters,
    excelPreview,
    excelRows,
    fixingNames,
    fromKey,
    masterNamesLoading,
    rowsEligibleForNameFix.length,
    submitting,
    toKey,
  ]);

  const handleFixNames = async () => {
    const list = rowsEligibleForNameFix;
    if (!list.length) return;
    setFixingNames(true);
    setError("");
    try {
      for (const row of list) {
        const id = String(row.master_item_id);
        const override = norm(renameOverrideByMid?.[id]);
        const desiredName = override || norm(row.item_name);
        if (!desiredName) continue;
        // ✅ New atomic API (master + stock) to avoid drift
        await axios.patch(`${apiBase}/master-item/rename-and-migrate/${id}`, {
          new_item_name: desiredName,
          // optional safety: if we know current master name, send it
          old_item_name: norm(masterNameById[id]) || undefined,
          updated_by_email: norm(email) || null,
        });
      }
      // refresh master names so preview updates
      setMasterNameById({});
      // refresh inventory list in background (so stock names update in UI after rename)
      onSuccess?.();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Failed to apply name changes.");
    } finally {
      setFixingNames(false);
    }
  };

  const handleCreateMasters = async () => {
    // Best-effort creation: create master item by name with a default type/base_price.
    // ID-specific creation is not supported by backend create-master-item.
    const list = excelPreview.filter((r) => r.master_missing === "YES" && r.item_name);
    if (!list.length) return;
    setCreatingMasters(true);
    setError("");
    try {
      for (const row of list) {
        await axios.post(`${apiBase}/create-master-item`, {
          item_name: norm(row.item_name),
          item_type: "GENERAL",
          base_price: 0,
          quantity: 0,
          minimum_quantity: 0,
        });
      }
      setMasterNameById({});
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Failed to create master items.");
    } finally {
      setCreatingMasters(false);
    }
  };

  const excelPreviewCounts = useMemo(() => {
    const list = excelPreview || [];
    const applied = list.filter((x) => x.status === "APPLIED").length;
    const skipped = list.filter((x) => x.status === "SKIPPED").length;
    const pending = list.filter((x) => x.status === "PENDING").length;
    return { applied, skipped, pending, total: list.length };
  }, [excelPreview]);

  const excelRowCountWarning = useMemo(() => {
    const n = excelRows.length || 0;
    if (n <= RECOMMENDED_MAX_EXCEL_ROWS) return "";
    if (n <= STRONG_WARNING_MAX_EXCEL_ROWS) {
      return `You uploaded ${n} rows. Recommended max is ${RECOMMENDED_MAX_EXCEL_ROWS} for best speed.`;
    }
    return `Large workbook: ${n} rows. Transfers run sequentially — expect several minutes. You can split into smaller files if the browser feels slow. (Soft limit ${RECOMMENDED_MAX_EXCEL_ROWS}, heavy above ${STRONG_WARNING_MAX_EXCEL_ROWS}.)`;
  }, [excelRows.length]);

  useEffect(() => {
    // Apply excel rows to qtyByKey + uploadedNameByMid whenever rows are available
    if (!open) return;
    if (!excelRows.length) return;
    // apply based on current FROM location inventory index
    if (!selectedFrom) return;

    const nextQty = {};
    const nextNamesByMid = {};
    let applied = 0;
    let skipped = 0;

    excelRows.forEach((r) => {
      const itemName = norm(r.item_name);
      const mid = norm(r.id);
      const invRow = pickInvRowForExcel(mid, itemName);
      const key = invRow
        ? (invRow.masterItemId != null ? `mid:${invRow.masterItemId}` : `name:${invRow.itemName.toLowerCase()}`)
        : null;
      const count = Number(r.qty);
      if (!key || !Number.isFinite(count)) {
        skipped += 1;
        return;
      }
      nextQty[key] = String(count);
      applied += 1;
      if (mid && itemName) nextNamesByMid[mid] = itemName;
    });

    setQtyByKey((prev) => ({ ...prev, ...nextQty }));
    setUploadedNameByMid((prev) => ({ ...prev, ...nextNamesByMid }));
    const multi = new Set((excelRows || []).map((r) => r.sheet).filter(Boolean)).size > 1;
    const head = multi
      ? `${excelRows.length} rows (multi-sheet) — `
      : `${excelRows.length} row(s) — `;
    setUploadNotice(`${head}matched to FROM: ${applied} item(s). Skipped: ${skipped}.`);
  }, [excelRows, fromInventoryIndex, open, pickInvRowForExcel, selectedFrom]);

  // No default-qty from an items table (excel-driven flow)

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  const handleSubmit = async () => {
    setError("");
    setResults(null);

    const fl = norm(selectedFrom?.location);
    const tl = norm(selectedTo?.location);
    if (!fl) return setError("Please select FROM location.");
    if (!tl) return setError("Please select TO location.");
    if (fl.toLowerCase() === tl.toLowerCase())
      return setError("FROM and TO cannot be the same.");
    if (!norm(employeeCode)) return setError("Employee code is required.");
    if (!norm(email) || !norm(email).includes("@")) return setError("Valid email is required.");
    // We require Excel rows for bulk transfer
    if (!excelRows.length) return setError("Please upload Excel first (id, item_name, qty).");

    // Build plan from excel + FROM location inventory index
    const plan = excelRows
      .map((er) => {
        const mid = norm(er.id);
        const excelName = norm(er.item_name);
        const invRow = pickInvRowForExcel(mid, excelName);
        if (!invRow) return null;
        const key = invRow.masterItemId != null ? `mid:${invRow.masterItemId}` : `name:${invRow.itemName.toLowerCase()}`;
        const count = Number(er.qty);
        return {
          key,
          masterItemId: invRow.masterItemId ?? null,
          itemName: invRow.itemName,
          warehouse: invRow.warehouse,
          available: invRow.available,
          excelMid: mid,
          excelItemName: excelName,
          count,
        };
      })
      .filter(Boolean)
      .filter((r) => Number.isFinite(r.count) && r.count > 0);

    if (!plan.length) return setError("Please enter quantity for at least one item.");
    const invalid = plan.find((r) => r.count > r.available);
    if (invalid) return setError(`Quantity exceeds available for "${invalid.itemName}" (${invalid.available}).`);

    setSubmitting(true);
    setProgress({ done: 0, total: plan.length });

    const ok = [];
    const failed = [];
    const renamed = new Set(); // mids already processed

    for (let i = 0; i < plan.length; i++) {
      const r = plan[i];
      try {
        const fw = norm(r.warehouse);
        const tw = fw; // ✅ keep same warehouse; we ignore warehouse in UI

        // 1) If Excel provided id + new name, rename master + stock first (atomic)
        const mid = r.masterItemId != null ? String(r.masterItemId) : "";
        const desiredName = mid ? norm(renameOverrideByMid?.[mid] || uploadedNameByMid[mid] || r.excelItemName) : "";
        if (mid && desiredName && !renamed.has(mid) && !sameName(desiredName, r.itemName)) {
          await axios.patch(`${apiBase}/master-item/rename-and-migrate/${mid}`, {
            new_item_name: desiredName,
            old_item_name: norm(masterNameById[mid]) || undefined,
            updated_by_email: norm(email) || null,
          });
          renamed.add(mid);
        }

        // 2) Transfer (use desiredName if provided, else current row name)
        const transferItemName = desiredName || r.itemName;
        await axios.patch(`${apiBase}/transfer-stock`, {
          master_item_id: r.masterItemId ?? null,
          item_name: transferItemName,
          from_warehouse: fw,
          from_location: fl,
          to_warehouse: tw,
          to_location: tl,
          count: r.count,
          employee_code: norm(employeeCode),
          email: norm(email),
          reason: norm(reason) || null,
          avenue_created_invoice_id: "STOCK_TRANSFER_BULK_UI",
          status: "TRANSFER",
        });
        ok.push({ itemName: transferItemName, count: r.count });
      } catch (e) {
        const msg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || "Transfer failed.";
        failed.push({ itemName: r.itemName, count: r.count, error: String(msg) });
      } finally {
        setProgress({ done: i + 1, total: plan.length });
      }
    }

    setResults({ ok, failed });
    setSubmitting(false);
    onSuccess?.();
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xl">
      <DialogTitle sx={{ fontWeight: 900 }}>Bulk Transfer</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {error ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : null}

        {submitting ? (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: "#475569", fontWeight: 800, mb: 0.75 }}>
              Transferring... {progress.done} / {progress.total}
            </Typography>
            <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 999 }} />
          </Box>
        ) : null}

        {results ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity={results.failed.length ? "warning" : "success"}>
              {results.failed.length
                ? `Completed with errors: ${results.ok.length} success, ${results.failed.length} failed.`
                : `Completed: ${results.ok.length} items transferred.`}
            </Alert>
          </Box>
        ) : null}

        {uploadNotice ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info">{uploadNotice}</Alert>
          </Box>
        ) : null}

        {emptyIdSummary?.emptyIdRows ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity="warning">
              <b>Empty ID detected:</b> {emptyIdSummary.emptyIdRows} row(s) across{" "}
              {emptyIdSummary.sheetsWithEmptyId?.length || 1} sheet(s) have blank <b>id</b> (treated as new master items).
              Use <b>Create missing masters</b> to create them first.
            </Alert>
          </Box>
        ) : null}

        {excelRowCountWarning ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity={excelRows.length > STRONG_WARNING_MAX_EXCEL_ROWS ? "warning" : "info"}>
              {excelRowCountWarning}
            </Alert>
          </Box>
        ) : null}

        <Box sx={{ mb: 2 }}>
          <Alert severity="info">
            <b>Multi-sheet:</b> all tabs are merged in order (empty sheets skipped). Same columns on each sheet:{" "}
            <b>id</b>, <b>item_name</b>, <b>qty</b>. Preview shows the first {PREVIEW_TABLE_MAX_ROWS} rows; Transfer still
            processes every row. Soft limits: ~{RECOMMENDED_MAX_EXCEL_ROWS} rows recommended, &gt;{" "}
            {STRONG_WARNING_MAX_EXCEL_ROWS} is heavy.
          </Alert>
        </Box>

        {excelPreview.length > 0 ? (
          <Box sx={{ mb: 2 }}>
            <Paper
              elevation={0}
              sx={{
                border: "1px solid rgba(15, 23, 42, 0.10)",
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "#fff",
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  background: "#F9FAFB",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 1.25,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography sx={{ fontWeight: 900, color: "#0F172A" }}>Excel preview</Typography>
                  <Typography sx={{ fontSize: 12.5, color: "#64748B" }}>
                    Check which rows will apply before clicking Transfer.
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: "#475569", fontWeight: 800, mt: 0.5 }}>
                    Total: {excelPreviewCounts.total} • Applied: {excelPreviewCounts.applied} • Skipped:{" "}
                    {excelPreviewCounts.skipped}
                    {excelPreviewCounts.pending ? ` • Pending: ${excelPreviewCounts.pending}` : ""}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant={masterNameChangeRows.length ? "contained" : "outlined"}
                  color={masterNameChangeRows.length ? "warning" : "inherit"}
                  startIcon={<VisibilityIcon />}
                  disabled={!excelRows.length || masterNamesLoading || !masterNameChangeRows.length}
                  onClick={() => setNameChangesDialogOpen(true)}
                  sx={{ borderRadius: 999, fontWeight: 900, textTransform: "none", flexShrink: 0 }}
                >
                  Master name changes
                  {masterNameChangeRows.length ? ` (${masterNameChangeRows.length})` : ""}
                </Button>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12, width: 120 }}>Sheet</TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12, width: 56 }}>Line</TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12, width: 56 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12, width: 140 }}>Master ID</TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12 }}>Master item name</TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12 }}>Stock item name</TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12 }}>Item name (from Excel)</TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12, width: 120, textAlign: "right" }}>
                      Qty
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12, width: 120 }}>Master exists</TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12, width: 110 }}>Name change</TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12, width: 120 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: 12 }}>Note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {excelPreview.slice(0, PREVIEW_TABLE_MAX_ROWS).map((r) => (
                    <TableRow key={`${r.sheet || "default"}-${r.rowNo}-${r.row_in_sheet}`} hover>
                      <TableCell
                        sx={{ fontSize: 11.5, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}
                        title={r.sheet || ""}
                      >
                        {r.sheet || "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{r.row_in_sheet || "—"}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: "#64748B" }}>{r.rowNo}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{r.master_item_id || "—"}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: masterNamesLoading ? "#64748B" : "#0F172A" }}>
                        {r.master_item_name || (r.master_item_id ? (masterNamesLoading ? "Loading..." : "—") : "—")}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: r.stock_mismatch === "YES" ? "#B91C1C" : "#0F172A" }}>
                        {r.stock_item_name || "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{r.item_name || "—"}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, textAlign: "right", fontWeight: 800 }}>
                        {String(r.transfer_qty ?? "") || "—"}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 900,
                          color: r.master_missing === "YES" ? "#B91C1C" : "#047857",
                        }}
                      >
                        {r.master_item_id ? (r.master_missing === "YES" ? "NO" : "YES") : "—"}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 900,
                          color: r.will_rename === "YES" ? "#B45309" : "#047857",
                        }}
                      >
                        {r.will_rename || "—"}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 900,
                          color:
                            r.status === "APPLIED"
                              ? "#047857"
                              : r.status === "PENDING"
                                ? "#92400E"
                                : "#B91C1C",
                        }}
                      >
                        {r.status}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: "#64748B" }}>{r.note || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {excelPreview.length > PREVIEW_TABLE_MAX_ROWS ? (
                    <TableRow>
                      <TableCell colSpan={12} sx={{ fontSize: 12.5, color: "#64748B", py: 1.25 }}>
                        Showing first {PREVIEW_TABLE_MAX_ROWS} of {excelPreview.length} rows. Transfer uses all rows.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        ) : null}

        <Paper elevation={0} sx={{ border: "1px solid rgba(15, 23, 42, 0.10)", borderRadius: 2, p: 1.5 }}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 900, mb: 0.5 }}>
                  From (Location)
                </Typography>
                <Select
                  value={fromKey}
                  onChange={(e) => {
                    setFromKey(e.target.value);
                    setResults(null);
                    setError("");
                  }}
                  size="small"
                  fullWidth
                  displayEmpty
                  disabled={submitting}
                >
                  <MenuItem value="">
                    <em>Select FROM location</em>
                  </MenuItem>
                  {fromOptions.length === 0 ? (
                    <MenuItem value="" disabled>
                      No locations found (inventory not loaded yet)
                    </MenuItem>
                  ) : null}
                  {fromOptions.map((o) => (
                    <MenuItem key={o.key} value={o.key}>
                      {o.location} • Total {Math.round(o.totalQty)}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 900, mb: 0.5 }}>
                  To
                </Typography>
                <Select
                  value={toKey}
                  onChange={(e) => {
                    setToKey(e.target.value);
                    setResults(null);
                    setError("");
                  }}
                  size="small"
                  fullWidth
                  displayEmpty
                  disabled={submitting}
                >
                  <MenuItem value="">
                    <em>Select TO location</em>
                  </MenuItem>
                  {toOptions.map((o) => (
                    <MenuItem key={o.key} value={o.key}>
                      {o.location}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </Stack>

            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <TextField
                label="Employee code"
                size="small"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                fullWidth
                disabled={submitting}
              />
              <TextField
                label="Email"
                size="small"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                disabled={submitting}
              />
            </Stack>

            <TextField
              label="Reason (optional)"
              size="small"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              disabled={submitting}
            />
          </Stack>
        </Paper>

        <Box sx={{ mt: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1}>
            <Typography sx={{ fontWeight: 900, color: "#0F172A" }}>Upload Excel</Typography>
            <Button
              component="label"
              size="small"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              disabled={submitting}
              sx={{ borderRadius: 999, fontWeight: 900, textTransform: "none" }}
            >
              Upload Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  handleUploadExcel(f);
                }}
              />
            </Button>
          </Stack>

          <Typography sx={{ mt: 1, fontSize: 12.5, color: "#64748B" }}>
            Columns on every sheet: <b>id</b>, <b>item_name</b>, <b>qty</b>. All sheets are merged into one run.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="outlined" disabled={submitting}>
          Close
        </Button>
        <Button
          onClick={handleCreateMasters}
          variant="outlined"
          startIcon={<PlaylistAddIcon />}
          disabled={!gating.canCreateMasters}
        >
          Create missing masters
        </Button>

        <Button
          onClick={handleFixNames}
          variant="outlined"
          startIcon={<DriveFileRenameOutlineIcon />}
          disabled={!gating.canFixNames}
          title={
            masterNamesLoading
              ? "Loading master names from server…"
              : rowsEligibleForNameFix.length === 0
                ? "No rows need a name fix (or add id + item_name in Excel)."
                : ""
          }
        >
          Apply name changes
          {rowsEligibleForNameFix.length > 0 ? ` (${rowsEligibleForNameFix.length})` : ""}
        </Button>

        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<SwapHorizIcon />}
          disabled={!gating.canTransfer}
        >
          {submitting ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} sx={{ color: "#fff" }} />
              Transferring...
            </Box>
          ) : (
            "Transfer"
          )}
        </Button>
      </DialogActions>

      <Dialog
        open={nameChangesDialogOpen}
        onClose={() => setNameChangesDialogOpen(false)}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle sx={{ fontWeight: 900, pr: 6 }}>
          Understand name changes
          <Typography sx={{ fontSize: 13, color: "#64748B", fontWeight: 500, mt: 0.5 }}>
            Same data as the preview table, shown in plain language.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 0 }}>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 0.75 }}>What you are looking at</Typography>
            <Typography component="div" sx={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
              <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                <Box component="li" sx={{ mb: 0.75 }}>
                  <b>Excel vs master:</b> Your sheet can spell an item differently than the master catalog.{" "}
                  <b>Apply name changes</b> renames the master record and updates stock rows to match the Excel
                  spelling.
                </Box>
                <Box component="li" sx={{ mb: 0.75 }}>
                  <b>Stock label:</b> The FROM location may still show an older name on the quantity line. That is
                  highlighted when it does not match the master; fixing names brings stock text in line.
                </Box>
                <Box component="li">
                  <b>Transfer:</b> After names are aligned (or if there was nothing to fix), use <b>Transfer</b> to
                  move quantity.
                </Box>
              </Box>
            </Typography>
          </Alert>

          <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#64748B", mb: 1.25, textTransform: "uppercase" }}>
            Row-by-row
          </Typography>

          {masterNameChangeRows.length > NAME_CHANGE_DIALOG_MAX_ROWS ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Showing first {NAME_CHANGE_DIALOG_MAX_ROWS} of {masterNameChangeRows.length} name-change rows here. All{" "}
              {masterNameChangeRows.length} are included when you use <b>Apply name changes</b>.
            </Alert>
          ) : null}

          <Stack spacing={1.5}>
            {masterNameChangeRows.slice(0, NAME_CHANGE_DIALOG_MAX_ROWS).map((r) => {
              const showRename = r.will_rename === "YES";
              const showStockIssue = r.stock_mismatch === "YES";
              const loc =
                r.sheet && r.row_in_sheet != null && r.row_in_sheet !== ""
                  ? `${r.sheet} · line ${r.row_in_sheet}`
                  : `File row ${r.rowNo}`;
              const mid = String(r.master_item_id || "");
              const defaultDesired = norm(r.item_name) || norm(r.master_item_name);
              const override = mid ? norm(renameOverrideByMid?.[mid]) : "";
              const effectiveDesired = override || defaultDesired;
              return (
                <Paper
                  key={`${r.sheet || "s"}-${r.rowNo}-${r.row_in_sheet}`}
                  elevation={0}
                  sx={{
                    border: "1px solid rgba(15, 23, 42, 0.12)",
                    borderRadius: 2,
                    p: 1.5,
                    bgcolor: "#FAFBFC",
                  }}
                >
                  <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#64748B" }}>{loc}</Typography>
                    <Typography sx={{ fontSize: 12, color: "#94A3B8" }}>•</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>
                      #{r.rowNo} · Master ID {r.master_item_id || "—"}
                    </Typography>
                  </Stack>

                  {showRename ? (
                    <Box sx={{ mb: showStockIssue ? 1.25 : 0 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#64748B", mb: 0.75 }}>
                        Catalog name will change (master → Excel)
                      </Typography>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", sm: "center" }}
                      >
                        <Typography
                          sx={{
                            fontSize: 13,
                            px: 1.25,
                            py: 1,
                            borderRadius: 1,
                            bgcolor: "#F1F5F9",
                            color: "#0F172A",
                            wordBreak: "break-word",
                            flex: 1,
                          }}
                        >
                          {r.master_item_name || "—"}
                        </Typography>
                        <Stack direction="row" alignItems="center" justifyContent="center" sx={{ color: "#64748B" }}>
                          <ArrowForwardIcon fontSize="small" />
                        </Stack>
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 800,
                            px: 1.25,
                            py: 1,
                            borderRadius: 1,
                            bgcolor: "#FFF7ED",
                            color: "#C2410C",
                            border: "1px solid #FDBA74",
                            wordBreak: "break-word",
                            flex: 1,
                          }}
                        >
                          {effectiveDesired || "—"}
                        </Typography>
                      </Stack>
                    </Box>
                  ) : null}

                  {mid && (showRename || showStockIssue) ? (
                    <Box sx={{ mt: showRename ? 0 : 1 }}>
                      <TextField
                        label="New item name (optional override)"
                        size="small"
                        fullWidth
                        value={override}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRenameOverrideByMid((prev) => {
                            const next = { ...(prev || {}) };
                            const nv = norm(v);
                            if (!nv) delete next[mid];
                            else next[mid] = v;
                            return next;
                          });
                        }}
                        placeholder={defaultDesired || "Type the exact new name"}
                        helperText={
                          override
                            ? "This override will be used when you click Apply name changes (and during Transfer rename)."
                            : "Leave empty to use the Excel item_name (or master name if Excel is empty)."
                        }
                      />
                    </Box>
                  ) : null}

                  {showStockIssue ? (
                    <Box>
                      <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#64748B", mb: 0.5 }}>
                        Stock line at FROM location (may differ until fixed)
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 13,
                          px: 1.25,
                          py: 1,
                          borderRadius: 1,
                          bgcolor: showRename ? "#FEF2F2" : "#FFF7ED",
                          color: showRename ? "#991B1B" : "#9A3412",
                          border: `1px solid ${showRename ? "#FECACA" : "#FDBA74"}`,
                          wordBreak: "break-word",
                        }}
                      >
                        {r.stock_item_name || "—"}
                      </Typography>
                      {!showRename && r.master_item_name ? (
                        <Typography sx={{ fontSize: 12, color: "#64748B", mt: 0.75 }}>
                          Master catalog already matches Excel ({r.master_item_name}). Applying name changes still
                          reconciles the stock label with the system.
                        </Typography>
                      ) : null}
                    </Box>
                  ) : null}
                </Paper>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Button onClick={() => setNameChangesDialogOpen(false)} variant="contained" sx={{ fontWeight: 900 }}>
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

