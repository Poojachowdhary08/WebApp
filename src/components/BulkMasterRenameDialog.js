import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Divider,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import axios from "axios";
import * as XLSX from "xlsx";

const norm = (v) => String(v ?? "").trim();

const ID_KEYS = ["id", "ID", "master_item_id", "masterItemId", "item_id", "Item Id", "MASTER_ID", "Master ID"];
const NEW_NAME_KEYS = [
  "new_item_name",
  "NEW_ITEM_NAME",
  "New item name",
  "New Item Name",
  "new_name",
  "NEW_NAME",
  "New Name",
  "target_name",
  "desired_name",
  "item_name",
  "ITEM_NAME",
  "Item Name",
  "Item",
];
// For creating NEW masters (when id is empty)
const TYPE_KEYS = ["item_type", "ITEM_TYPE", "Item Type", "type", "TYPE"];
const BASE_PRICE_KEYS = ["base_price", "BASE_PRICE", "Base Price", "price", "PRICE"];
const QTY_KEYS = ["quantity", "qty", "QTY", "Quantity"];
const MIN_QTY_KEYS = ["minimum_quantity", "min_qty", "MIN_QTY", "Minimum Quantity"];

const pick = (row, keys) => {
  for (const k of keys) {
    if (row && row[k] != null && String(row[k]).trim() !== "") return row[k];
  }
  return "";
};

const sameName = (a, b) => norm(a).toLowerCase() === norm(b).toLowerCase();
const numLoose = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return NaN;
  // handle "1,200.50" etc.
  const cleaned = s.replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
};

const MASTER_FETCH_CHUNK = 25;
/** Max rows when showing "All rows" (large workbooks). */
const PREVIEW_MAX_ALL_ROWS = 800;
/** Rename-only list shows every PATCH row (capped for safety). */
const PREVIEW_MAX_RENAME_ROWS = 5000;

const STATUS_SORT = {
  RENAME: 0,
  CONFLICT: 1,
  PENDING: 2,
  SKIP: 3,
  NO_CHANGE: 4,
};

function buildRenamePayload(oldName, newName) {
  return {
    new_item_name: norm(newName),
    old_item_name: norm(oldName) || null,
    updated_by_email: typeof localStorage !== "undefined" ? localStorage.getItem("email") || null : null,
  };
}

export default function BulkMasterRenameDialog({ open, onClose, apiBase = "http://localhost:8080", onApplied }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [emptyIdSummary, setEmptyIdSummary] = useState(null); // { emptyIdRows, sheets: string[], sample: [] }
  const [rawRows, setRawRows] = useState([]);
  const [masterNameById, setMasterNameById] = useState({});
  const [namesLoading, setNamesLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [creatingMasters, setCreatingMasters] = useState(false);
  const [createLog, setCreateLog] = useState(null); // { ok, failed, failedRows: [] }
  const [applyLog, setApplyLog] = useState(null);
  /** rename_only = show only rows that will get PATCH (default). all = every Excel row, rename rows first. */
  const [previewFilter, setPreviewFilter] = useState("rename_only");
  /** Step-by-step: one unique rename at a time for manual check. */
  const [reviewActive, setReviewActive] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [patching, setPatching] = useState(false);
  const reviewAccumRef = useRef({ applied: [], skipped: [], failed: [] });
  // Step-by-step creation for empty-id (new) masters
  const [createReviewActive, setCreateReviewActive] = useState(false);
  const [createReviewIndex, setCreateReviewIndex] = useState(0);
  const [creatingOne, setCreatingOne] = useState(false);
  const createAccumRef = useRef({ created: [], skipped: [], failed: [] });

  useEffect(() => {
    if (!open) {
      setError("");
      setNotice("");
      setEmptyIdSummary(null);
      setRawRows([]);
      setMasterNameById({});
      setApplyLog(null);
      setCreateLog(null);
      setPreviewFilter("rename_only");
      setReviewActive(false);
      setReviewIndex(0);
      setPatching(false);
      setCreatingMasters(false);
      setCreateReviewActive(false);
      setCreateReviewIndex(0);
      setCreatingOne(false);
      reviewAccumRef.current = { applied: [], skipped: [], failed: [] };
      createAccumRef.current = { created: [], skipped: [], failed: [] };
    }
  }, [open]);

  useEffect(() => {
    if (!open || rawRows.length === 0) {
      setMasterNameById({});
      setNamesLoading(false);
      return;
    }
    const ids = new Set();
    rawRows.forEach((r) => {
      const id = norm(r.masterId);
      if (id && /^\d+$/.test(id)) ids.add(id);
    });
    const uniqueIds = Array.from(ids);
    if (uniqueIds.length === 0) {
      setMasterNameById({});
      setNamesLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setNamesLoading(true);
      const next = {};
      try {
        for (let i = 0; i < uniqueIds.length; i += MASTER_FETCH_CHUNK) {
          if (cancelled) return;
          const chunk = uniqueIds.slice(i, i + MASTER_FETCH_CHUNK);
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
        if (!cancelled) setMasterNameById(next);
      } finally {
        if (!cancelled) setNamesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, apiBase, rawRows]);

  const previewRows = useMemo(() => {
    const idToNewNames = new Map();
    (rawRows || []).forEach((r) => {
      const id = norm(r.masterId);
      const nn = norm(r.newName);
      if (!id || !nn) return;
      if (!idToNewNames.has(id)) idToNewNames.set(id, []);
      idToNewNames.get(id).push(nn);
    });

    return (rawRows || []).map((r) => {
      const id = norm(r.masterId);
      const newName = norm(r.newName);
      const current = id ? masterNameById[id] : "";
      const idConflict =
        id &&
        idToNewNames.has(id) &&
        new Set(idToNewNames.get(id).map((x) => x.toLowerCase())).size > 1;

      let status = "OK";
      let detail = "";
      if (!id) {
        status = "SKIP";
        detail = "Missing master id";
      } else if (!/^\d+$/.test(id)) {
        status = "SKIP";
        detail = "Master id must be numeric";
      } else if (!newName) {
        status = "SKIP";
        detail = "Missing new name";
      } else if (idConflict) {
        status = "CONFLICT";
        detail = "Same id has different new names in file";
      } else if (namesLoading) {
        status = "PENDING";
        detail = "Loading current name…";
      } else if (!current) {
        status = "SKIP";
        detail = "Master id not found";
      } else if (sameName(current, newName)) {
        status = "NO_CHANGE";
        detail = "Already this name";
      } else {
        status = "RENAME";
        detail = "Will rename master + stock";
      }

      return {
        ...r,
        currentName: current,
        newName,
        status,
        detail,
      };
    });
  }, [rawRows, masterNameById, namesLoading]);

  const counts = useMemo(() => {
    const list = previewRows || [];
    return {
      rename: list.filter((x) => x.status === "RENAME").length,
      noChange: list.filter((x) => x.status === "NO_CHANGE").length,
      skip: list.filter((x) => x.status === "SKIP").length,
      conflict: list.filter((x) => x.status === "CONFLICT").length,
      total: list.length,
    };
  }, [previewRows]);

  /** Distinct master IDs that will get PATCH (duplicate Excel rows for same id = one call each). */
  const uniqueRenameCount = useMemo(() => {
    const s = new Set();
    (previewRows || []).forEach((r) => {
      if (r.status === "RENAME" && r.masterId) s.add(String(r.masterId));
    });
    return s.size;
  }, [previewRows]);

  /** RENAME first, then CONFLICT, … then NO_CHANGE; stable tie-break by sheet + row. */
  const sortedPreviewRows = useMemo(() => {
    const list = [...(previewRows || [])];
    list.sort((a, b) => {
      const da = STATUS_SORT[a.status] ?? 99;
      const db = STATUS_SORT[b.status] ?? 99;
      if (da !== db) return da - db;
      const sa = String(a.sheet || "").localeCompare(String(b.sheet || ""));
      if (sa !== 0) return sa;
      return (a.rowInSheet || 0) - (b.rowInSheet || 0);
    });
    return list;
  }, [previewRows]);

  /** One row per unique id (RENAME only), same order as Apply — used for step-by-step review. */
  const renameQueueUnique = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const r of sortedPreviewRows) {
      if (r.status !== "RENAME" || !r.masterId) continue;
      const id = String(r.masterId);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(r);
    }
    return out;
  }, [sortedPreviewRows]);

  const displayRows = useMemo(() => {
    if (previewFilter === "rename_only") {
      return sortedPreviewRows.filter((r) => r.status === "RENAME").slice(0, PREVIEW_MAX_RENAME_ROWS);
    }
    return sortedPreviewRows.slice(0, PREVIEW_MAX_ALL_ROWS);
  }, [sortedPreviewRows, previewFilter]);

  const canStartReview =
    open &&
    !namesLoading &&
    !applying &&
    !patching &&
    !reviewActive &&
    renameQueueUnique.length > 0 &&
    counts.conflict === 0;

  const canApplyBatch =
    open &&
    !namesLoading &&
    !applying &&
    !patching &&
    !reviewActive &&
    counts.rename > 0 &&
    counts.conflict === 0;

  const handleFile = async (file) => {
    setError("");
    setNotice("");
    setApplyLog(null);
    setEmptyIdSummary(null);
    setCreateLog(null);
    setRawRows([]);
    if (!file) return;
    const name = String(file.name || "").toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Use an Excel file (.xlsx or .xls).");
      return;
    }
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sheetNames = wb.SheetNames || [];
      if (!sheetNames.length) throw new Error("Workbook has no sheets.");

      const out = [];
      let globalRow = 0;
      const perSheet = [];
      let emptyIdRows = 0;
      const sheetsWithEmptyId = new Set();
      const emptyIdSamples = [];

      for (const sheetName of sheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!Array.isArray(json) || !json.length) continue;
        let n = 0;
        json.forEach((row, idx) => {
          const idRaw = pick(row, ID_KEYS);
          const newRaw = pick(row, NEW_NAME_KEYS);
          if (!norm(idRaw) && !norm(newRaw)) return;
          const idNorm = norm(idRaw);
          const newNorm = norm(newRaw);
          const typeNorm = norm(pick(row, TYPE_KEYS));
          const basePriceRaw = pick(row, BASE_PRICE_KEYS);
          const qtyRaw = pick(row, QTY_KEYS);
          const minQtyRaw = pick(row, MIN_QTY_KEYS);
          const basePrice = basePriceRaw === "" ? "" : numLoose(basePriceRaw);
          const quantity = qtyRaw === "" ? "" : Number(qtyRaw);
          const minimum_quantity = minQtyRaw === "" ? "" : Number(minQtyRaw);
          if (!idNorm && newNorm) {
            emptyIdRows += 1;
            sheetsWithEmptyId.add(sheetName);
            if (emptyIdSamples.length < 5) {
              emptyIdSamples.push({
                sheet: sheetName,
                rowInSheet: idx + 1,
                item_name: newNorm,
                item_type: typeNorm || "—",
                base_price: basePriceRaw === "" ? "—" : String(basePriceRaw),
              });
            }
          }
          globalRow += 1;
          n += 1;
          out.push({
            rowNo: globalRow,
            sheet: sheetName,
            rowInSheet: idx + 1,
            masterId: idNorm,
            newName: newNorm,
            // Optional create-master-item fields (used only when masterId is empty)
            itemType: typeNorm,
            basePrice,
            basePriceInput: basePriceRaw,
            quantity,
            minimum_quantity,
          });
        });
        if (n > 0) perSheet.push({ name: sheetName, count: n });
      }

      if (!out.length) {
        setError(
          "No rows found. Each sheet needs at least a master id column (id, master_item_id, …) and a new name column (new_item_name, new_name, item_name, …)."
        );
        return;
      }

      setRawRows(out);
      if (emptyIdRows > 0) {
        setEmptyIdSummary({
          emptyIdRows,
          sheets: Array.from(sheetsWithEmptyId.values()),
          sample: emptyIdSamples,
        });
      }
      setReviewActive(false);
      setReviewIndex(0);
      reviewAccumRef.current = { applied: [], skipped: [], failed: [] };
      setPreviewFilter("rename_only");
      const summary =
        perSheet.length > 1
          ? `${perSheet.length} sheets merged · ${out.length} row(s). `
          : `${out.length} row(s). `;
      setNotice(`${summary}Loading current names from the server for preview…`);
    } catch (e) {
      setError(e?.message || "Failed to read Excel.");
    }
  };

  const createCandidates = useMemo(() => {
    const list = rawRows || [];
    // one per unique (name,type) to avoid duplicate creates from multi-sheets
    const seen = new Set();
    const out = [];
    for (const r of list) {
      const id = norm(r.masterId);
      if (id) continue;
      const item_name = norm(r.newName);
      if (!item_name) continue;
      const item_type = norm(r.itemType) || "GENERAL";
      const base_price =
        typeof r.basePrice === "number" && Number.isFinite(r.basePrice)
          ? r.basePrice
          : numLoose(r.basePriceInput);
      const finalBasePrice = Number.isFinite(base_price) ? base_price : 0;
      const k = `${item_name.toLowerCase()}||${item_type.toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        item_name,
        item_type,
        base_price: finalBasePrice,
        quantity:
          typeof r.quantity === "number" && Number.isFinite(r.quantity) ? r.quantity : 0,
        minimum_quantity:
          typeof r.minimum_quantity === "number" && Number.isFinite(r.minimum_quantity) ? r.minimum_quantity : 0,
      });
    }
    return out;
  }, [rawRows]);

  const canCreateMasters = useMemo(() => {
    if (!open) return false;
    if (creatingMasters || creatingOne || applying || patching || namesLoading || reviewActive || createReviewActive) return false;
    return createCandidates.length > 0;
  }, [open, creatingMasters, creatingOne, applying, patching, namesLoading, reviewActive, createReviewActive, createCandidates.length]);

  const canStartCreateReview = useMemo(() => {
    if (!open) return false;
    if (creatingMasters || creatingOne || applying || patching || namesLoading || reviewActive) return false;
    return createCandidates.length > 0 && !createReviewActive;
  }, [open, creatingMasters, creatingOne, applying, patching, namesLoading, reviewActive, createReviewActive, createCandidates.length]);

  const currentCreateRow = createCandidates[createReviewIndex] || null;

  const startCreateReview = () => {
    if (!createCandidates.length) return;
    setCreateLog(null);
    createAccumRef.current = { created: [], skipped: [], failed: [] };
    setCreateReviewIndex(0);
    setCreateReviewActive(true);
  };

  const exitCreateReview = () => {
    setCreateReviewActive(false);
    setCreateReviewIndex(0);
    const { created, skipped, failed } = createAccumRef.current;
    if (created.length || skipped.length || failed.length) {
      setCreateLog({
        ok: created.length,
        failed: failed.length,
        failedRows: failed,
        skippedInReview: skipped.length,
        fromReview: true,
        exitedEarly: true,
      });
      if (created.length) onApplied?.();
    }
    createAccumRef.current = { created: [], skipped: [], failed: [] };
  };

  const finalizeCreateReview = () => {
    const { created, skipped, failed } = createAccumRef.current;
    setCreateReviewActive(false);
    setCreateReviewIndex(0);
    setCreateLog({
      ok: created.length,
      failed: failed.length,
      failedRows: failed,
      skippedInReview: skipped.length,
      fromReview: true,
    });
    if (created.length) onApplied?.();
  };

  const handleCreateReviewSkip = () => {
    if (!currentCreateRow) return;
    createAccumRef.current.skipped.push(`${currentCreateRow.item_name} (${currentCreateRow.item_type})`);
    const next = createReviewIndex + 1;
    if (next >= createCandidates.length) finalizeCreateReview();
    else setCreateReviewIndex(next);
  };

  const applyCreatedIdToRows = (item_name, item_type, item_id) => {
    const key = `${String(item_name).toLowerCase()}||${String(item_type).toLowerCase()}`;
    setRawRows((prev) =>
      (prev || []).map((r) => {
        if (norm(r.masterId)) return r;
        const n = norm(r.newName);
        const t = norm(r.itemType) || "GENERAL";
        const rk = `${n.toLowerCase()}||${t.toLowerCase()}`;
        if (rk !== key) return r;
        return { ...r, masterId: String(item_id) };
      })
    );
  };

  const handleCreateReviewCreateThis = async () => {
    if (!currentCreateRow || creatingOne) return;
    setCreatingOne(true);
    setError("");
    try {
      const res = await axios.post(`${apiBase}/create-master-item`, {
        item_name: currentCreateRow.item_name,
        item_type: currentCreateRow.item_type,
        base_price: currentCreateRow.base_price,
        quantity: currentCreateRow.quantity ?? 0,
        minimum_quantity: currentCreateRow.minimum_quantity ?? 0,
      });
      const itemId = res?.data?.item_id;
      if (itemId == null) throw new Error("No item_id returned");
      applyCreatedIdToRows(currentCreateRow.item_name, currentCreateRow.item_type, itemId);
      createAccumRef.current.created.push({
        item_name: currentCreateRow.item_name,
        item_type: currentCreateRow.item_type,
        item_id: itemId,
        status: res?.data?.status,
      });
    } catch (e) {
      createAccumRef.current.failed.push({
        item_name: currentCreateRow.item_name,
        item_type: currentCreateRow.item_type,
        message: e?.response?.data?.detail || e?.response?.data?.message || e?.message || "Create failed",
      });
    } finally {
      setCreatingOne(false);
    }
    const next = createReviewIndex + 1;
    if (next >= createCandidates.length) finalizeCreateReview();
    else setCreateReviewIndex(next);
  };

  const handleCreateReviewCreateAllRemaining = async () => {
    if (creatingOne || creatingMasters || applying || patching) return;
    setCreatingMasters(true);
    setError("");
    try {
      for (let i = createReviewIndex; i < createCandidates.length; i++) {
        const c = createCandidates[i];
        try {
          const res = await axios.post(`${apiBase}/create-master-item`, {
            item_name: c.item_name,
            item_type: c.item_type,
            base_price: c.base_price,
            quantity: c.quantity ?? 0,
            minimum_quantity: c.minimum_quantity ?? 0,
          });
          const itemId = res?.data?.item_id;
          if (itemId == null) throw new Error("No item_id returned");
          applyCreatedIdToRows(c.item_name, c.item_type, itemId);
          createAccumRef.current.created.push({
            item_name: c.item_name,
            item_type: c.item_type,
            item_id: itemId,
            status: res?.data?.status,
          });
        } catch (e) {
          createAccumRef.current.failed.push({
            item_name: c.item_name,
            item_type: c.item_type,
            message: e?.response?.data?.detail || e?.response?.data?.message || e?.message || "Create failed",
          });
        }
      }
      finalizeCreateReview();
    } catch (e) {
      setError(e?.message || "Create failed.");
    } finally {
      setCreatingMasters(false);
    }
  };

  const handleCreateMasters = async () => {
    if (!canCreateMasters) return;
    setCreatingMasters(true);
    setError("");
    setCreateLog(null);
    try {
      const ok = [];
      const failed = [];
      const createdIdByKey = new Map(); // name||type -> item_id

      for (const c of createCandidates) {
        const key = `${c.item_name.toLowerCase()}||${c.item_type.toLowerCase()}`;
        try {
          const res = await axios.post(`${apiBase}/create-master-item`, {
            item_name: c.item_name,
            item_type: c.item_type,
            base_price: c.base_price,
            quantity: c.quantity ?? 0,
            minimum_quantity: c.minimum_quantity ?? 0,
          });
          const itemId = res?.data?.item_id;
          if (itemId == null) throw new Error("No item_id returned");
          createdIdByKey.set(key, String(itemId));
          ok.push({ item_name: c.item_name, item_type: c.item_type, item_id: itemId, status: res?.data?.status });
        } catch (e) {
          failed.push({
            item_name: c.item_name,
            item_type: c.item_type,
            message: e?.response?.data?.detail || e?.response?.data?.message || e?.message || "Create failed",
          });
        }
      }

      // Fill masterId for matching empty-id rows so the same file can be reused in this dialog
      if (createdIdByKey.size > 0) {
        setRawRows((prev) =>
          (prev || []).map((r) => {
            if (norm(r.masterId)) return r;
            const item_name = norm(r.newName);
            const item_type = norm(r.itemType);
            if (!item_name || !item_type) return r;
            const k = `${item_name.toLowerCase()}||${item_type.toLowerCase()}`;
            const id = createdIdByKey.get(k);
            return id ? { ...r, masterId: id } : r;
          })
        );
      }

      setCreateLog({ ok: ok.length, failed: failed.length, failedRows: failed });
      if (ok.length) {
        setNotice(
          `Created ${ok.length} master item(s). Preview will reload current names and you can proceed with renames (if any).`
        );
      }
      if (ok.length) onApplied?.();
    } catch (e) {
      setError(e?.message || "Create masters failed.");
    } finally {
      setCreatingMasters(false);
    }
  };

  const handleApply = async () => {
    if (!canApplyBatch) return;
    const toRun = (previewRows || []).filter((r) => r.status === "RENAME");
    if (!toRun.length) return;
    setApplying(true);
    setError("");
    const ok = [];
    const failed = [];
    try {
      const seen = new Set();
      for (const r of toRun) {
        const id = r.masterId;
        if (seen.has(id)) continue;
        seen.add(id);
        try {
          await axios.patch(
            `${apiBase}/master-item/rename-and-migrate/${id}`,
            buildRenamePayload(r.currentName, r.newName)
          );
          ok.push({ id, newName: r.newName });
        } catch (e) {
          failed.push({
            id,
            message: e?.response?.data?.detail || e?.message || "Request failed",
          });
        }
      }
      setApplyLog({ ok: ok.length, failed: failed.length, failedRows: failed });
      if (ok.length) onApplied?.();
    } catch (e) {
      setError(e?.message || "Apply failed.");
    } finally {
      setApplying(false);
    }
  };

  const finalizeReview = () => {
    const { applied, skipped, failed } = reviewAccumRef.current;
    setReviewActive(false);
    setReviewIndex(0);
    setApplyLog({
      ok: applied.length,
      failed: failed.length,
      failedRows: failed,
      skippedInReview: skipped.length,
      fromReview: true,
    });
    if (applied.length) onApplied?.();
  };

  const startReview = () => {
    if (!renameQueueUnique.length || counts.conflict > 0) return;
    reviewAccumRef.current = { applied: [], skipped: [], failed: [] };
    setApplyLog(null);
    setReviewIndex(0);
    setReviewActive(true);
  };

  const exitReview = () => {
    setReviewActive(false);
    setReviewIndex(0);
    const { applied, skipped, failed } = reviewAccumRef.current;
    if (applied.length || skipped.length || failed.length) {
      setApplyLog({
        ok: applied.length,
        failed: failed.length,
        failedRows: failed,
        skippedInReview: skipped.length,
        fromReview: true,
        exitedEarly: true,
      });
      if (applied.length) onApplied?.();
    }
    reviewAccumRef.current = { applied: [], skipped: [], failed: [] };
  };

  const currentReviewRow = renameQueueUnique[reviewIndex] || null;

  const handleReviewSkip = () => {
    if (!currentReviewRow) return;
    reviewAccumRef.current.skipped.push(String(currentReviewRow.masterId));
    const next = reviewIndex + 1;
    if (next >= renameQueueUnique.length) {
      finalizeReview();
    } else {
      setReviewIndex(next);
    }
  };

  const handleReviewApplyThis = async () => {
    if (!currentReviewRow || patching) return;
    const row = currentReviewRow;
    setPatching(true);
    setError("");
    try {
      await axios.patch(
        `${apiBase}/master-item/rename-and-migrate/${row.masterId}`,
        buildRenamePayload(row.currentName, row.newName)
      );
      reviewAccumRef.current.applied.push(String(row.masterId));
    } catch (e) {
      reviewAccumRef.current.failed.push({
        id: row.masterId,
        message: e?.response?.data?.detail || e?.message || "Request failed",
      });
    } finally {
      setPatching(false);
    }
    const next = reviewIndex + 1;
    if (next >= renameQueueUnique.length) {
      finalizeReview();
    } else {
      setReviewIndex(next);
    }
  };

  const handleReviewApplyAllRemaining = async () => {
    if (patching || applying || !renameQueueUnique.length) return;
    setApplying(true);
    setError("");
    try {
      for (let i = reviewIndex; i < renameQueueUnique.length; i++) {
        const row = renameQueueUnique[i];
        try {
          await axios.patch(
            `${apiBase}/master-item/rename-and-migrate/${row.masterId}`,
            buildRenamePayload(row.currentName, row.newName)
          );
          reviewAccumRef.current.applied.push(String(row.masterId));
        } catch (e) {
          reviewAccumRef.current.failed.push({
            id: row.masterId,
            message: e?.response?.data?.detail || e?.message || "Request failed",
          });
        }
      }
      finalizeReview();
    } catch (e) {
      setError(e?.message || "Apply failed.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !applying && !patching && onClose?.()} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Bulk rename master items (Excel)</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Upload a workbook with <b>one or more sheets</b>. Each row needs a numeric <b>master id</b> and the{" "}
          <b>new catalog name</b>. Sheets are merged into one list. Use <b>Review each item…</b> to confirm renames
          one at a time (old name → new name) before applying, or <b>Apply all</b> to run every unique id in sequence.
        </Typography>

        {/* API block removed as requested */}

        <Typography variant="caption" display="block" sx={{ mb: 1, color: "text.secondary" }}>
          Id columns: id, master_item_id, item_id… · New name columns: new_item_name, new_name, item_name…
        </Typography>

        <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={applying} sx={{ mb: 2 }}>
          Choose Excel
          <input type="file" accept=".xlsx,.xls" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        </Button>

        {namesLoading && <LinearProgress sx={{ mb: 1 }} />}
        {error ? (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        ) : null}
        {notice ? (
          <Alert severity="info" sx={{ mb: 1 }}>
            {notice}
          </Alert>
        ) : null}
        {emptyIdSummary?.emptyIdRows ? (
          <Alert severity="warning" sx={{ mb: 1 }}>
            <b>Empty master id detected:</b> {emptyIdSummary.emptyIdRows} row(s) across{" "}
            {emptyIdSummary.sheets?.length || 1} sheet(s) have blank <b>id</b>. This rename screen can only rename
            existing masters, so these rows will be <b>skipped</b>.
          </Alert>
        ) : null}
        {createLog ? (
          <Alert severity={createLog.failed ? "warning" : "success"} sx={{ mb: 1 }}>
            Master creation finished: <b>{createLog.ok}</b> created, <b>{createLog.failed}</b> failed.
            {createLog.failedRows?.length
              ? ` First errors: ${createLog.failedRows
                  .slice(0, 3)
                  .map((x) => `${x.item_name} (${x.item_type}): ${x.message}`)
                  .join(" · ")}`
              : ""}
          </Alert>
        ) : null}
        {applyLog ? (
          <Alert severity={applyLog.failed ? "warning" : "success"} sx={{ mb: 1 }}>
            Finished: <b>{applyLog.ok}</b> successful <code>PATCH …/master-item/rename-and-migrate/{"{id}"}</code> call(s).
            {applyLog.failed ? ` Failed ${applyLog.failed}.` : ""}
            {applyLog.skippedInReview ? (
              <>
                {" "}
                Skipped in review: <b>{applyLog.skippedInReview}</b>.
              </>
            ) : null}
            {applyLog.exitedEarly ? " You left review before finishing the queue." : ""}
            {applyLog.failedRows?.length
              ? ` First errors: ${applyLog.failedRows
                  .slice(0, 3)
                  .map((x) => `#${x.id}: ${x.message}`)
                  .join(" · ")}`
              : ""}
          </Alert>
        ) : null}

        {createReviewActive && currentCreateRow ? (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 2,
              border: "2px solid #B45309",
              borderRadius: 2,
              bgcolor: "#FFFBEB",
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#92400E", mb: 1.5 }}>
              Create new master items — item {createReviewIndex + 1} of {createCandidates.length}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip size="small" label={`Name: ${currentCreateRow.item_name}`} />
              <Chip size="small" label={`Type: ${currentCreateRow.item_type}`} />
              <Chip size="small" label={`Base price: ${currentCreateRow.base_price}`} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              This will call <code>POST …/create-master-item</code>. After creation, the new master id will be filled into
              this preview so you can proceed with renames (if any).
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
              <Button variant="outlined" color="inherit" onClick={exitCreateReview} disabled={creatingOne || creatingMasters}>
                Back to full table
              </Button>
              <Button variant="outlined" onClick={handleCreateReviewSkip} disabled={creatingOne || creatingMasters}>
                Skip this item
              </Button>
              <Button variant="contained" color="warning" onClick={handleCreateReviewCreateThis} disabled={creatingOne || creatingMasters}>
                {creatingOne ? "Creating…" : "Create this item"}
              </Button>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />
              <Button
                variant="outlined"
                color="warning"
                onClick={handleCreateReviewCreateAllRemaining}
                disabled={creatingOne || creatingMasters}
              >
                {creatingMasters ? "Creating…" : `Create all remaining (${createCandidates.length - createReviewIndex})`}
              </Button>
            </Stack>
          </Paper>
        ) : null}

        {reviewActive && currentReviewRow ? (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 2,
              border: "2px solid #2563EB",
              borderRadius: 2,
              bgcolor: "#F8FAFF",
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#1E40AF", mb: 1.5 }}>
              Review each rename — item {reviewIndex + 1} of {renameQueueUnique.length}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip size="small" label={`Sheet: ${currentReviewRow.sheet}`} />
              <Chip size="small" label={`Excel row: ${currentReviewRow.rowInSheet}`} />
              <Chip size="small" color="primary" variant="outlined" label={`Master ID: ${currentReviewRow.masterId}`} />
            </Stack>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Box sx={{ flex: 1, p: 1.5, bgcolor: "#fff", borderRadius: 1, border: "1px solid #E2E8F0" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Current catalog name
                </Typography>
                <Typography sx={{ fontWeight: 700, wordBreak: "break-word" }}>{currentReviewRow.currentName}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "center", alignSelf: "center" }}>
                <ArrowForwardIcon color="primary" />
              </Box>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: "#EFF6FF", borderRadius: 1, border: "1px solid #BFDBFE" }}>
                <Typography variant="caption" color="primary" fontWeight={700}>
                  New name (from Excel)
                </Typography>
                <Typography sx={{ fontWeight: 800, color: "#1D4ED8", wordBreak: "break-word" }}>
                  {currentReviewRow.newName}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              Confirm this pair, skip to leave the master item unchanged for now, or apply the rest in one batch.
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
              <Button variant="outlined" color="inherit" onClick={exitReview} disabled={patching || applying}>
                Back to full table
              </Button>
              <Button variant="outlined" onClick={handleReviewSkip} disabled={patching || applying}>
                Skip this item
              </Button>
              <Button variant="contained" onClick={handleReviewApplyThis} disabled={patching || applying}>
                {patching ? "Applying…" : "Apply this rename"}
              </Button>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />
              <Button
                variant="outlined"
                color="primary"
                onClick={handleReviewApplyAllRemaining}
                disabled={patching || applying}
              >
                {applying ? "Applying…" : `Apply all remaining (${renameQueueUnique.length - reviewIndex})`}
              </Button>
            </Stack>
          </Paper>
        ) : null}

        {previewRows.length > 0 ? (
          <>
            <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#1E3A8A", mb: 1 }}>
                Name change summary
              </Typography>
              <Typography sx={{ fontSize: 14, color: "#0F172A" }}>
                <b style={{ fontSize: 18 }}>{uniqueRenameCount}</b>{" "}
                {uniqueRenameCount === 1 ? "master item" : "master items"} will be renamed
                {counts.rename !== uniqueRenameCount && counts.rename > 0 ? (
                  <span style={{ color: "#64748B" }}>
                    {" "}
                    ({counts.rename} Excel rows — duplicates share one PATCH per id)
                  </span>
                ) : null}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Each rename calls{" "}
                <code style={{ fontSize: 12 }}>PATCH …/master-item/rename-and-migrate/{"{id}"}</code> once per unique id,
                updating the catalog name, stock, and request line <code>item_name</code> values together.
              </Typography>
            </Paper>

            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                flexWrap: "wrap",
                mb: 1.5,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                <Chip size="small" label={`Excel rows: ${counts.total}`} />
                <Chip size="small" color="primary" variant="outlined" label={`→ Will rename: ${uniqueRenameCount}`} />
                {counts.rename !== uniqueRenameCount ? (
                  <Chip size="small" label={`Rename rows (incl. dupes): ${counts.rename}`} />
                ) : null}
                <Chip size="small" label={`No change: ${counts.noChange}`} />
                <Chip size="small" label={`Skip: ${counts.skip}`} />
                {counts.conflict > 0 ? <Chip size="small" color="error" label={`Conflict: ${counts.conflict}`} /> : null}
              </Box>
              <ToggleButtonGroup
                size="small"
                value={previewFilter}
                exclusive
                onChange={(_e, v) => v && setPreviewFilter(v)}
                sx={{ flexShrink: 0 }}
              >
                <ToggleButton value="rename_only" sx={{ textTransform: "none", fontWeight: 800, px: 1.5 }}>
                  Rename only ({counts.rename})
                </ToggleButton>
                <ToggleButton value="all" sx={{ textTransform: "none", fontWeight: 700, px: 1.5 }}>
                  All rows ({counts.total})
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Typography variant="caption" color="primary" sx={{ display: "block", fontWeight: 700, mb: 1 }}>
              {previewFilter === "rename_only"
                ? `Table shows only rows that will be renamed (same order as Apply). ${counts.rename === 0 ? "Nothing to rename." : ""}`
                : `All rows: renames listed first, then conflicts, skips, no change. Showing first ${displayRows.length} of ${sortedPreviewRows.length}.`}
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Sheet</TableCell>
                    <TableCell align="right">Row</TableCell>
                    <TableCell>Master ID</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Old name (current catalog)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>New name (from Excel)</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayRows.map((r) => (
                    <TableRow
                      key={`${r.sheet}-${r.rowNo}-${r.masterId}`}
                      sx={r.status === "RENAME" ? { bgcolor: "rgba(37, 99, 235, 0.04)" } : undefined}
                    >
                      <TableCell>{r.sheet}</TableCell>
                      <TableCell align="right">{r.rowInSheet}</TableCell>
                      <TableCell>{r.masterId || "—"}</TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>{r.currentName || (namesLoading ? "…" : "—")}</TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>{r.newName || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={r.status}
                          color={
                            r.status === "RENAME"
                              ? "primary"
                              : r.status === "CONFLICT"
                                ? "error"
                                : r.status === "NO_CHANGE"
                                  ? "default"
                                  : "warning"
                          }
                          variant={r.status === "SKIP" ? "outlined" : "filled"}
                        />
                        {r.detail ? (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {r.detail}
                          </Typography>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {previewFilter === "all" && sortedPreviewRows.length > PREVIEW_MAX_ALL_ROWS ? (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Preview capped at {PREVIEW_MAX_ALL_ROWS} rows. Apply still uses every eligible row in the file.
              </Typography>
            ) : null}
            {previewFilter === "rename_only" && counts.rename > PREVIEW_MAX_RENAME_ROWS ? (
              <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: "block" }}>
                Showing first {PREVIEW_MAX_RENAME_ROWS} rename rows (very large list). Apply still processes all.
              </Typography>
            ) : null}
          </>
        ) : null}
      </DialogContent>
      <DialogActions
        sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1, justifyContent: "flex-end", alignItems: "center" }}
      >
        <Button onClick={() => !applying && !patching && onClose?.()} disabled={applying || patching}>
          Close
        </Button>
        {/*
          Create-master-items actions hidden as requested (rename-only dialog).
          (Keeping underlying create logic intact for potential re-enable later.)
        */}
        <Button
          variant="outlined"
          color="primary"
          disabled={!canStartReview}
          onClick={startReview}
          sx={{ fontWeight: 700 }}
        >
          Review each item…
        </Button>
        <Button variant="contained" disabled={!canApplyBatch} onClick={handleApply}>
          {applying
            ? "Applying…"
            : `Apply all ${uniqueRenameCount} rename${uniqueRenameCount === 1 ? "" : "s"} (PATCH ×${uniqueRenameCount})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
