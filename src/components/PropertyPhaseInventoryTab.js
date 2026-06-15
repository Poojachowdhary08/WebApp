// PropertyPhaseInventoryTab.js – Phase Inventory / Forecast workflow (schedule, templates, draft, plan, results)
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Divider,
  Alert,
  Chip,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
  Tooltip,
  Autocomplete,
  Tabs,
  Tab,
  InputAdornment,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import axios from "axios";
import * as XLSX from "xlsx";
import { testLog, testLogApi, testLogError } from "../utils/testLogger";
import { getApiErrorMessage } from "../utils/apiErrorUtils";
import AddMaterialsMissingPhasesModal from "./AddMaterialsMissingPhasesModal";
import TemplateSelectionPage from "./TemplateSelectionPage";
import InventoryForecastSummaryCards, { FixedPhaseInventorySummaryCards } from "./InventoryForecastSummaryCards";

const COMPONENT = "PropertyPhaseInventoryTab";
const MASTER_ITEMS_API = "http://localhost:8080/get-all-masteritems-new-non-paginated";

const AREA_TYPES = [
  { value: "construction_area", label: "Construction area" },
  { value: "slab_area", label: "Slab area" },
  { value: "brick_work_area", label: "Brick work area" },
  { value: "plastering_area", label: "Plastering area" },
];

function phaseStatusChip(status) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  let bg = "#EEF2FF";
  let fg = "#3730A3";
  if (s.includes("completed")) {
    bg = "#ECFDF5";
    fg = "#065F46";
  } else if (s.includes("in progress") || s.includes("in_progress")) {
    bg = "#FFFBEB";
    fg = "#92400E";
  } else if (s.includes("hold") || s.includes("paused")) {
    bg = "#FEF2F2";
    fg = "#991B1B";
  }
  return (
    <Chip label={status} size="small" sx={{ fontWeight: 600, fontSize: 11, bgcolor: bg, color: fg, border: "1px solid rgba(0,0,0,0.06)", borderRadius: 1.5 }} />
  );
}

const PropertyPhaseInventoryTab = ({
  property,
  baseUrl = "http://localhost:8080",
  showDialog,
  onScheduleUploaded,
}) => {
  const propertyId = property?.propertyid;

  // Property areas (shown before template selection)
  const [propertyAreas, setPropertyAreas] = useState(null); // { construction_area_sqft, total_slab_area_sqft, total_brick_work_area_sqft, total_plastering_area_sqft, floors[] }
  const [loadingPropertyAreas, setLoadingPropertyAreas] = useState(false);

  // Schedule: fetch and show status (so we don't ask for upload when schedule already exists)
  const [scheduleStatus, setScheduleStatus] = useState(null); // null = loading, { hasSchedule: true, count } or { hasSchedule: false }
  const [loadingScheduleStatus, setLoadingScheduleStatus] = useState(false);

  // Schedule upload
  const [scheduleUploadOpen, setScheduleUploadOpen] = useState(false);
  const [scheduleFile, setScheduleFile] = useState(null);
  const [uploadingSchedule, setUploadingSchedule] = useState(false);

  // Template upload
  const [templateUploadOpen, setTemplateUploadOpen] = useState(false);
  const [templateFile, setTemplateFile] = useState(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  // Templates list & selection (templates = deduped list, templatesAllRows = full rows for view)
  const [templates, setTemplates] = useState([]);
  const [templatesAllRows, setTemplatesAllRows] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateViewOpen, setTemplateViewOpen] = useState(false);
  const [templateViewId, setTemplateViewId] = useState(null);
  // When user selects a template, show "Draft plan" popup to guide next steps
  const [draftPlanDialogOpen, setDraftPlanDialogOpen] = useState(false);
  // Separate page for template selection (cards view)
  const [templateSelectionView, setTemplateSelectionView] = useState(false);

  // Draft / Plan / Results
  const [draftResult, setDraftResult] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [forecastResults, setForecastResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [forecastStatusFilter, setForecastStatusFilter] = useState("planned");
  const deletingPlannedState = useState(false);
  const deletingPlanned = deletingPlannedState[0];
  const setDeletingPlanned = deletingPlannedState[1];

  // Add materials for missing/new phase
  const [addMaterialsOpen, setAddMaterialsOpen] = useState(false);
  const [addMaterialsItemTypeFilter, setAddMaterialsItemTypeFilter] = useState(""); // filter items by type when adding materials to template
  const [addMaterialsPhase, setAddMaterialsPhase] = useState(null); // { phase_name, phase_start_date?, phase_end_date? } or { phase_name: "" } for manual/new phase
  const [addMaterialsItems, setAddMaterialsItems] = useState([{ item_name: "", unit: "", area_type: "construction_area", consumption_rate_per_sqft: "", wastage_percentage: "0", floor_name: "", item_category: "" }]);
  const [addingMaterials, setAddingMaterials] = useState(false);
  const [addMaterialsPhaseNameManual, setAddMaterialsPhaseNameManual] = useState(""); // when opening for "new phase" without prefilled phase

  // Multiple-table screen: phases in schedule but not in inventory template (one table per phase)
  const [missingPhasesDialogOpen, setMissingPhasesDialogOpen] = useState(false);
  const [missingPhasesTables, setMissingPhasesTables] = useState([]); // [{ phase_name, phase_start_date?, phase_end_date?, items: [{ item_name, unit, area_type, consumption_rate_per_sqft, wastage_percentage, floor_name }] }]
  const [addingMissingPhases, setAddingMissingPhases] = useState(false);

  // Draft: add items not in template (extra items, saved with plan)
  const [draftExtraItems, setDraftExtraItems] = useState([]); // [{ _clientId, phase_name, phase_start_date?, phase_end_date?, item_name, unit, input_mode, quantity?, forecasted_quantity?, required_order?, forecast_cost?, item_cost_per_unit?, area_type?, area_value?, consumption_rate_per_sqft?, wastage_percentage? }]
  const [addDraftItemOpen, setAddDraftItemOpen] = useState(false);
  const [addDraftItemPhase, setAddDraftItemPhase] = useState(null); // { phase_name, phase_start_date?, phase_end_date? }
  const [propertyInventory, setPropertyInventory] = useState([]); // [{ item, unit, material_cost }]
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [masterItems, setMasterItems] = useState([]); // [{ id, name }] for Add Item and Add materials
  const [loadingMasterItems, setLoadingMasterItems] = useState(false);
  const [addDraftItemForm, setAddDraftItemForm] = useState({ item_key: "", unit: "", input_mode: "manual", quantity: "", area_type: "construction_area", area_value: "", consumption_rate_per_sqft: "", wastage_percentage: "0", item_cost_per_unit: "", item_type_filter: "" });
  const [missingPhasesExpanded, setMissingPhasesExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Mode: template (area × rate) vs fixed (quantities only) — default Fixed (primary client path)
  const [mode, setMode] = useState("fixed"); // "template" | "fixed"
  const [fixedPhases, setFixedPhases] = useState([]); // [{ phase_name, phase_start_date?, phase_end_date?, items: [{ item_name, unit, quantity }] }]
  const [fixedPhasesLoading, setFixedPhasesLoading] = useState(false);
  const [fixedSaving, setFixedSaving] = useState(false);
  const [recalculatingPrices, setRecalculatingPrices] = useState(false);
  const [fixedPhaseSearch, setFixedPhaseSearch] = useState("");
  const [selectedFixedPhaseIndex, setSelectedFixedPhaseIndex] = useState(0);

  const [templatesError, setTemplatesError] = useState(null);
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplatesError(null);
    testLogApi(COMPONENT, "GET", `${baseUrl}/inventory/forecast/templates`);
    try {
      const res = await axios.get(`${baseUrl}/inventory/forecast/templates`);
      const list = res?.data?.templates ?? res?.data ?? [];
      const arr = Array.isArray(list) ? list : [];
      testLogApi(COMPONENT, "GET", `${baseUrl}/inventory/forecast/templates`, null, { count: arr.length });
      setTemplatesAllRows(arr);
      const seen = new Set();
      const unique = arr.filter((t) => {
        const id = t.template_id ?? t.id;
        if (id == null || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setTemplates(unique);
      if (unique.length > 0 && !selectedTemplateId) setSelectedTemplateId(String(unique[0].template_id ?? unique[0].id ?? ""));
    } catch (e) {
      testLogError(COMPONENT, "fetchTemplates", e);
      setTemplates([]);
      setTemplatesAllRows([]);
      setTemplatesError(getApiErrorMessage(e, "Failed to load templates."));
    } finally {
      setLoadingTemplates(false);
    }
  }, [baseUrl, selectedTemplateId]);

  useEffect(() => {
    if (propertyId) {
      testLog(COMPONENT, "mount", { propertyId });
      fetchTemplates();
    }
  }, [propertyId, fetchTemplates]);

  const fetchScheduleStatus = useCallback(async () => {
    if (!propertyId) return;
    setLoadingScheduleStatus(true);
    testLogApi(COMPONENT, "GET", `${baseUrl}/properties/${propertyId}/schedule`);
    try {
      const res = await axios.get(`${baseUrl}/properties/${propertyId}/schedule`);
      const list = res?.data?.schedule ?? [];
      const count = Array.isArray(list) ? list.length : 0;
      testLogApi(COMPONENT, "GET", `${baseUrl}/properties/${propertyId}/schedule`, null, { hasSchedule: true, count });
      setScheduleStatus({ hasSchedule: true, count });
    } catch (e) {
      testLogApi(COMPONENT, "GET", `${baseUrl}/properties/${propertyId}/schedule`, null, { hasSchedule: false, status: e?.response?.status });
      if (e?.response?.status === 404) setScheduleStatus({ hasSchedule: false });
      else setScheduleStatus({ hasSchedule: false });
    } finally {
      setLoadingScheduleStatus(false);
    }
  }, [baseUrl, propertyId]);

  useEffect(() => {
    if (propertyId) fetchScheduleStatus();
  }, [propertyId, fetchScheduleStatus]);

  const fetchFixedPhases = useCallback(async () => {
    if (!propertyId) return;
    setFixedPhasesLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/properties/${propertyId}/schedule`);
      const list = res?.data?.schedule ?? [];
      const byPhase = {};
      (Array.isArray(list) ? list : []).forEach((s) => {
        const pn = s.phasename ?? s.phase_name ?? "";
        if (!pn) return;
        if (!byPhase[pn]) byPhase[pn] = { phase_name: pn, phase_start_date: s.startdate ?? s.start_date ?? null, phase_end_date: s.enddate ?? s.end_date ?? null, items: [] };
      });
      const phases = Object.values(byPhase).map((p) => ({ ...p, phase_start_date: p.phase_start_date ? String(p.phase_start_date).slice(0, 10) : null, phase_end_date: p.phase_end_date ? String(p.phase_end_date).slice(0, 10) : null }));
      setFixedPhases(phases);
    } catch (e) {
      testLogError(COMPONENT, "fetchFixedPhases", e);
      setFixedPhases([]);
    } finally {
      setFixedPhasesLoading(false);
    }
  }, [baseUrl, propertyId]);

  useEffect(() => {
    if (propertyId && mode === "fixed") fetchFixedPhases();
  }, [propertyId, mode, fetchFixedPhases]);

  const addFixedPhaseItem = (phaseIndex) => {
    setFixedPhases((prev) => {
      const next = [...prev];
      const phase = next[phaseIndex] || { phase_name: "", items: [] };
      phase.items = [...(phase.items || []), { item_name: "", unit: "", quantity: "", cost_per_unit: "" }];
      next[phaseIndex] = { ...phase };
      return next;
    });
  };

  const updateFixedPhaseItem = (phaseIndex, itemIndex, field, value) => {
    setFixedPhases((prev) => {
      const next = prev.map((p, i) => (i === phaseIndex ? { ...p, items: (p.items || []).map((it, j) => (j === itemIndex ? { ...it, [field]: value } : it)) } : p));
      return next;
    });
  };

  const removeFixedPhaseItem = (phaseIndex, itemIndex) => {
    setFixedPhases((prev) => {
      const next = prev.map((p, i) => (i === phaseIndex ? { ...p, items: (p.items || []).filter((_, j) => j !== itemIndex) } : p));
      return next;
    });
  };
  const recalculatePlannedPricing = async () => {
    if (!propertyId) return;
    setRecalculatingPrices(true);
    try {
      const res = await axios.get(`${baseUrl}/inventory/forecast/forecast/planned-pricing`, {
        params: { property_id: propertyId },
      });
      const priced = Array.isArray(res?.data?.items) ? res.data.items : [];
      if (!priced.length) {
        showDialog?.("No planned items found to recalculate pricing.", "info");
        return;
      }
      const pricedById = new Map(
        priced
          .filter((r) => r.forecast_id != null)
          .map((r) => [String(r.forecast_id), r])
      );
      const pricedByKey = new Map(
        priced.map((r) => [
          `${(r.phase_name || "").trim()}|${(r.item_name || "").trim()}|${(r.unit || "").trim()}`,
          r,
        ])
      );
      setForecastResults((prev) => {
        const list = Array.isArray(prev?.forecasts) ? prev.forecasts : [];
        const merged = list.map((f) => {
          if (String(f.forecast_status || "").toLowerCase() !== "planned") return f;
          const byId = f.forecast_id != null ? pricedById.get(String(f.forecast_id)) : null;
          const byKey = pricedByKey.get(`${(f.phase_name || "").trim()}|${(f.item_name || "").trim()}|${(f.unit || "").trim()}`);
          const row = byId || byKey;
          if (!row) return f;
          return {
            ...f,
            planned_unit_price: Number(row.planned_unit_price) || Number(f.planned_unit_price) || Number(f.item_cost_per_unit) || 0,
            current_master_price: Number(row.current_master_price) || 0,
            unit_price_delta: Number(row.unit_price_delta) || 0,
            current_value: Number(row.current_value) || 0,
            value_delta: Number(row.value_delta) || 0,
          };
        });
        return { ...(prev || {}), forecasts: merged };
      });
      showDialog?.("Current prices recalculated. Deviation updated.", "success");
    } catch (err) {
      showDialog?.(getApiErrorMessage(err, "Failed to recalculate prices."), "error");
    } finally {
      setRecalculatingPrices(false);
    }
  };
  const loadPlannedRowToEditInputs = (phaseIndex, row) => {
    setFixedPhases((prev) => {
      const next = [...prev];
      const phase = next[phaseIndex];
      if (!phase) return prev;
      const normalizedName = (row?.item_name || "").trim();
      const normalizedUnit = (row?.unit || "").trim();
      const normalizedQty = String(Number(row?.forecasted_quantity || 0) || "");
      const normalizedCost = String(Number(row?.planned_unit_price || row?.item_cost_per_unit || 0) || "");
      const items = [...(phase.items || [])];
      const existingIdx = items.findIndex(
        (it) => (it.item_name || "").trim() === normalizedName && (it.unit || "").trim() === normalizedUnit
      );
      const payload = {
        item_name: normalizedName,
        unit: normalizedUnit,
        quantity: normalizedQty,
        cost_per_unit: normalizedCost,
      };
      if (existingIdx >= 0) {
        items[existingIdx] = { ...items[existingIdx], ...payload };
      } else {
        items.push(payload);
      }
      next[phaseIndex] = { ...phase, items };
      return next;
    });
  };

  const saveFixedPlan = async (targetPhaseName = null) => {
    if (!propertyId) return;
    const items = [];
    fixedPhases.forEach((p) => {
      if (targetPhaseName && (p.phase_name ?? "") !== targetPhaseName) return;
      (p.items || []).forEach((it) => {
        const qty = Number(it.quantity);
        if (!it.item_name?.trim() || !it.unit?.trim() || !(qty > 0)) return;
        const costPerUnit = Number(it.cost_per_unit) || 0;
        items.push({
          phase_name: p.phase_name,
          phase_start_date: p.phase_start_date || undefined,
          phase_end_date: p.phase_end_date || undefined,
          item_name: it.item_name.trim(),
          unit: it.unit.trim(),
          input_mode: "manual",
          quantity: qty,
          item_cost_per_unit: costPerUnit,
        });
      });
    });
    if (items.length === 0) {
      showDialog?.(
        targetPhaseName
          ? `Add at least one valid item with quantity for phase "${targetPhaseName}".`
          : "Add at least one item with quantity for at least one phase.",
        "error"
      );
      return;
    }
    setFixedSaving(true);
    try {
      // Full save replaces all planned rows. Phase save should keep other phases intact.
      const plannedCount = forecastStatusCounts?.planned ?? 0;
      if (!targetPhaseName && plannedCount > 0) {
        await axios.delete(`${baseUrl}/inventory/forecast/forecast/results?property_id=${encodeURIComponent(propertyId)}&forecast_status=planned`);
      }
      await axios.post(`${baseUrl}/inventory/forecast/forecast/save-ad-hoc-items`, {
        property_id: propertyId,
        forecast_status: "planned",
        items,
      });
      showDialog?.(
        targetPhaseName
          ? `Phase "${targetPhaseName}" saved as planned.`
          : "Fixed quantities saved as planned.",
        "success"
      );
      fetchForecastResults("planned");
    } catch (err) {
      testLogError(COMPONENT, "saveFixedPlan", err);
      showDialog?.(getApiErrorMessage(err, "Failed to save fixed plan."), "error");
    } finally {
      setFixedSaving(false);
    }
  };

  const fetchPropertyAreas = useCallback(async () => {
    if (!propertyId) return;
    setLoadingPropertyAreas(true);
    try {
      const res = await axios.get(`${baseUrl}/property/${propertyId}/floors-and-areas`);
      const data = res?.data ?? null;
      if (data && (data.construction_area_sqft > 0 || data.total_slab_area_sqft > 0 || data.total_brick_work_area_sqft > 0 || data.total_plastering_area_sqft > 0)) {
        setPropertyAreas(data);
      } else {
        const fallback = computeAreasFromProperty(property);
        setPropertyAreas(fallback);
      }
    } catch (e) {
      testLogError(COMPONENT, "fetchPropertyAreas", e);
      const fallback = computeAreasFromProperty(property);
      setPropertyAreas(fallback);
    } finally {
      setLoadingPropertyAreas(false);
    }
  }, [baseUrl, propertyId, property]);

  useEffect(() => {
    if (propertyId) fetchPropertyAreas();
  }, [propertyId, fetchPropertyAreas]);

  // When property (with floors) loads after complete API, show areas below so they match "areas above"
  useEffect(() => {
    const fallback = computeAreasFromProperty(property);
    if (fallback) setPropertyAreas((prev) => (prev && (prev.construction_area_sqft > 0 || prev.total_slab_area_sqft > 0 || prev.total_brick_work_area_sqft > 0 || prev.total_plastering_area_sqft > 0)) ? prev : fallback);
  }, [property]);

  const computeAreasFromProperty = (prop) => {
    if (!prop) return null;
    const floors = Array.isArray(prop?.floors) ? prop.floors : [];
    let totalSlab = 0;
    let totalBrick = 0;
    let totalPlaster = 0;
    for (const f of floors) {
      const slab = Number(f.total_slab_area ?? 0) || (Number(f.slab_area_regular ?? f.slab_area ?? 0) + Number(f.slab_area_customer_add_on ?? 0) + Number(f.slab_area_avenue_add_on ?? 0));
      const brick = Number(f.total_brick_work_area ?? 0) || (Number(f.brick_work_regular ?? f.brick_work_area ?? 0) + Number(f.brick_work_customer_add_on ?? 0) + Number(f.brick_work_avenue_add_on ?? 0));
      const plaster = Number(f.total_plastering_area ?? 0) || (Number(f.plastering_area_regular ?? f.plastering_area ?? 0) + Number(f.plastering_area_customer_add_on ?? 0) + Number(f.plastering_area_avenue_add_on ?? 0));
      totalSlab += slab;
      totalBrick += brick;
      totalPlaster += plaster;
    }
    const constructionArea = Number(prop?.construction_area ?? 0);
    if (constructionArea === 0 && totalSlab === 0 && totalBrick === 0 && totalPlaster === 0) return null;
    return {
      construction_area_sqft: constructionArea,
      total_slab_area_sqft: totalSlab,
      total_brick_work_area_sqft: totalBrick,
      total_plastering_area_sqft: totalPlaster,
    };
  };

  const handleScheduleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      testLog(COMPONENT, "scheduleFileSelected", { name: f.name, size: f.size });
      setScheduleFile(f);
    }
  };

  const handleInventoryFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (json.length < 2) {
          showDialog?.("Excel must have header row and at least one data row.", "error");
          return;
        }
        const headers = (json[0] || []).map((h) => String(h || "").trim().toLowerCase());
        const find = (pred, def) => { const i = headers.findIndex(pred); return i >= 0 ? i : def; };
        const idx = {
          phase: find((h) => h === "phase" || (h.includes("phase") && !h.includes("start") && !h.includes("end")), 0),
          item: find((h) => h.includes("item"), 3),
          unit: find((h) => h === "unit", 4),
          qty: find((h) => h.includes("qty") || h.includes("quantity"), 5),
          cost: find((h) => h.includes("cost") && (h.includes("unit") || h.includes("per")), 6),
          phaseStart: find((h) => (h.includes("phase") && h.includes("start")) || h === "phase start", 1),
          phaseEnd: find((h) => (h.includes("phase") && h.includes("end")) || h === "phase end", 2),
        };
        const byPhase = new Map();
        for (let i = 1; i < json.length; i++) {
          const row = json[i] || [];
          const phaseName = String(row[idx.phase] ?? "").trim();
          const itemName = String(row[idx.item] ?? "").trim();
          const unit = String(row[idx.unit] ?? "").trim();
          const qty = Number(row[idx.qty]);
          if (!phaseName || !itemName || !unit || !(qty > 0)) continue;
          const phaseStart = row[idx.phaseStart] ? String(row[idx.phaseStart]).slice(0, 10) : null;
          const phaseEnd = row[idx.phaseEnd] ? String(row[idx.phaseEnd]).slice(0, 10) : null;
          const costPerUnit = idx.cost >= 0 ? Number(row[idx.cost]) : 0;
          if (!byPhase.has(phaseName)) byPhase.set(phaseName, { phase_name: phaseName, phase_start_date: phaseStart, phase_end_date: phaseEnd, items: [] });
          byPhase.get(phaseName).items.push({ item_name: itemName, unit, quantity: String(qty), cost_per_unit: costPerUnit > 0 ? String(costPerUnit) : "" });
        }
        const parsedPhases = Array.from(byPhase.values());
        if (parsedPhases.length === 0) {
          showDialog?.("No valid rows (Phase, Item, Unit, Quantity). Check column names.", "error");
          return;
        }
        setFixedPhases((prev) => {
          const existingByName = new Map(prev.map((p) => [p.phase_name ?? "", p]));
          parsedPhases.forEach((pp) => {
            const key = pp.phase_name ?? "";
            existingByName.set(key, { ...(existingByName.get(key) || pp), items: pp.items });
          });
          return Array.from(existingByName.values());
        });
        showDialog?.(`Loaded ${parsedPhases.length} phase(s) from Excel.`, "success");
        testLog(COMPONENT, "uploadInventoryExcel", { phases: parsedPhases.length });
      } catch (err) {
        testLogError(COMPONENT, "uploadInventoryExcel", err);
        showDialog?.(getApiErrorMessage(err, "Failed to parse inventory Excel."), "error");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const uploadSchedule = async () => {
    if (!scheduleFile || !propertyId) {
      showDialog?.("Please select a file and ensure property is loaded.", "error");
      return;
    }
    setUploadingSchedule(true);
    testLogApi(COMPONENT, "POST", `${baseUrl}/create-schedule-up`, { propertyId, fileName: scheduleFile.name });
    try {
      const formData = new FormData();
      formData.append("file", scheduleFile);
      formData.append("property_id", propertyId);
      await axios.post(`${baseUrl}/create-schedule-up`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      testLog(COMPONENT, "uploadScheduleSuccess", { propertyId });
      showDialog?.("Schedule uploaded successfully!", "success");
      setScheduleUploadOpen(false);
      setScheduleFile(null);
      fetchScheduleStatus();
      if (mode === "fixed") fetchFixedPhases();
      if (typeof onScheduleUploaded === "function") onScheduleUploaded();
    } catch (err) {
      testLogError(COMPONENT, "uploadSchedule", err);
      showDialog?.(getApiErrorMessage(err, "Failed to upload schedule."), "error");
    } finally {
      setUploadingSchedule(false);
    }
  };

  const handleTemplateFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setTemplateFile(f);
  };

  const uploadTemplate = async () => {
    if (!templateFile) {
      showDialog?.("Please select an Excel file.", "error");
      return;
    }
    setUploadingTemplate(true);
    testLogApi(COMPONENT, "POST", `${baseUrl}/inventory/forecast/templates/upload-excel`, { fileName: templateFile.name });
    try {
      const formData = new FormData();
      formData.append("file", templateFile);
      const res = await axios.post(`${baseUrl}/inventory/forecast/templates/upload-excel`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      testLog(COMPONENT, "uploadTemplateSuccess", { fileName: templateFile.name });
      showDialog?.("Template(s) uploaded successfully!", "success");
      setTemplateUploadOpen(false);
      setTemplateFile(null);
      fetchTemplates();
    } catch (err) {
      testLogError(COMPONENT, "uploadTemplate", err);
      showDialog?.(getApiErrorMessage(err, "Failed to upload template."), "error");
    } finally {
      setUploadingTemplate(false);
    }
  };

  const downloadSampleExcel = () => {
    window.open(`${baseUrl}/inventory/forecast/templates/sample-excel`, "_blank");
  };

  /** Download a sample inventory Excel (Fixed mode – Phase, Item, Unit, Quantity, Cost/unit) for upload testing. */
  const downloadInventorySampleExcel = () => {
    const headers = ["Phase", "Phase start", "Phase end", "Item", "Unit", "Quantity", "Cost/unit (₹)"];
    const sampleRows = [
      ["Foundation", "2025-01-15", "2025-01-30", "Cement", "bags", 50, 400],
      ["Foundation", "2025-01-15", "2025-01-30", "Steel rods", "kg", 200, 65],
      ["Slab", "2025-02-01", "2025-02-20", "Cement", "bags", 80, 400],
      ["Slab", "2025-02-01", "2025-02-20", "River sand", "cft", 500, 45],
      ["Brick work", "2025-02-25", "2025-03-15", "Bricks", "nos", 5000, 8],
      ["Brick work", "2025-02-25", "2025-03-15", "Cement", "bags", 30, 400],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(wb, ws, "Fixed amounts");
    const filename = `inventory_sample_fixed_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    showDialog?.("Sample inventory Excel downloaded. Upload it to populate phases.", "success");
    testLog(COMPONENT, "downloadInventorySampleExcel", { filename });
  };

  /** Download a sample schedule Excel for upload testing (Fixed mode). */
  const downloadScheduleSampleExcel = () => {
    const headers = ["Phase", "Phase start", "Phase end"];
    const samplePhases = [
      ["Foundation", "2025-01-15", "2025-01-30"],
      ["Slab", "2025-02-01", "2025-02-20"],
      ["Brick work", "2025-02-25", "2025-03-15"],
      ["Plastering", "2025-03-20", "2025-04-05"],
      ["Flooring", "2025-04-10", "2025-04-25"],
      ["Painting", "2025-04-28", "2025-05-15"],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...samplePhases]);
    XLSX.utils.book_append_sheet(wb, ws, "Schedule");
    const filename = `schedule_sample_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    showDialog?.("Sample schedule downloaded. Upload it to test the upload flow.", "success");
    testLog(COMPONENT, "downloadScheduleSampleExcel", { filename });
  };

  const runDraftAllPhases = async () => {
    if (!propertyId) return;
    if (!scheduleStatus?.hasSchedule) {
      showDialog?.("No schedule found for this property. Upload schedule first (Schedule section above).", "error");
      return;
    }
    if (!selectedTemplateId || !templates.length) {
      showDialog?.("Upload or select a phase inventory template first.", "error");
      return;
    }
    setLoadingDraft(true);
    setDraftResult(null);
    testLogApi(COMPONENT, "POST", `${baseUrl}/inventory/forecast/forecast/draft-all-phases`, { propertyId, templateId: selectedTemplateId });
    try {
      const form = new FormData();
      form.append("property_id", propertyId);
      form.append("template_id", selectedTemplateId);
      const res = await axios.post(`${baseUrl}/inventory/forecast/forecast/draft-all-phases`, form, { headers: { "Content-Type": "multipart/form-data" } });
      // Handle direct response, wrapped { data: { ... } }, or string body
      let payload = res.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = {};
        }
      }
      const raw = payload?.data ?? payload ?? {};
      // Normalize: API may return phases_draft, phase_draft, draft_phases, phases, or nested under data
      const phasesDraft = Array.isArray(raw.phases_draft)
        ? raw.phases_draft
        : Array.isArray(raw.phase_draft)
          ? raw.phase_draft
          : Array.isArray(raw.draft_phases)
            ? raw.draft_phases
            : Array.isArray(raw.phases)
              ? raw.phases
              : Array.isArray(raw.data?.phases_draft)
                ? raw.data.phases_draft
                : Array.isArray(raw.data?.phases)
                  ? raw.data.phases
                  : [];
      const phasesMissing = Array.isArray(raw.phases_missing)
        ? raw.phases_missing
        : Array.isArray(raw.data?.phases_missing)
          ? raw.data.phases_missing
          : [];
      // Normalize each phase: items may be in forecast_items, items, phase_items, or template_items
      const phasesDraftNormalized = phasesDraft.map((p) => {
        const items = Array.isArray(p.forecast_items)
          ? p.forecast_items
          : Array.isArray(p.items)
            ? p.items
            : Array.isArray(p.phase_items)
              ? p.phase_items
              : Array.isArray(p.template_items)
                ? p.template_items
                : [];
        return { ...p, forecast_items: items };
      });
      const data = {
        ...raw,
        phases_draft: phasesDraftNormalized,
        phases_missing: phasesMissing,
        total_estimated_cost: raw.total_estimated_cost ?? raw.total_cost ?? raw.data?.total_estimated_cost,
        property_areas: raw.property_areas ?? raw.data?.property_areas,
      };
      testLog(COMPONENT, "runDraftAllPhasesSuccess", { phases_draft: data.phases_draft?.length, phases_missing: data.phases_missing?.length });
      setDraftResult(data);
      if (phasesDraft.length === 0 && phasesMissing.length === 0) {
        showDialog?.("Draft completed but no phases to show. Check that the property has a schedule and floors/areas.", "warning");
      } else {
        showDialog?.("Draft forecast generated. Review and click Save as planned when ready.", "success");
      }
    } catch (err) {
      testLogError(COMPONENT, "runDraftAllPhases", err);
      const msg = getApiErrorMessage(err, "Draft failed.");
      showDialog?.(msg, "error");
    } finally {
      setLoadingDraft(false);
    }
  };

  const runPlanAllPhases = async () => {
    if (!propertyId) return;
    if (!scheduleStatus?.hasSchedule) {
      showDialog?.("No schedule found for this property. Upload schedule first.", "error");
      return;
    }
    if (!selectedTemplateId || !templates.length) {
      showDialog?.("Upload or select a phase inventory template first.", "error");
      return;
    }
    setLoadingPlan(true);
    testLogApi(COMPONENT, "POST", `${baseUrl}/inventory/forecast/forecast/plan-all-phases`, { propertyId, templateId: selectedTemplateId, forecast_status: "planned" });
    try {
      const form = new FormData();
      form.append("property_id", propertyId);
      form.append("template_id", selectedTemplateId);
      form.append("forecast_status", "planned");
      await axios.post(`${baseUrl}/inventory/forecast/forecast/plan-all-phases`, form, { headers: { "Content-Type": "multipart/form-data" } });
      testLog(COMPONENT, "runPlanAllPhasesSuccess", { propertyId });
      if (draftExtraItems.length > 0) {
        const payload = {
          property_id: propertyId,
          forecast_status: "planned",
          items: draftExtraItems.map((e) => ({
            phase_name: e.phase_name,
            phase_start_date: e.phase_start_date ?? undefined,
            phase_end_date: e.phase_end_date ?? undefined,
            item_name: e.item_name,
            unit: e.unit,
            input_mode: e.input_mode || "manual",
            quantity: e.input_mode === "manual" ? e.forecasted_quantity : undefined,
            area_type: e.area_type || "construction_area",
            area_value: e.area_value ?? undefined,
            consumption_rate_per_sqft: e.consumption_rate_per_sqft ?? undefined,
            wastage_percentage: e.wastage_percentage ?? undefined,
            item_cost_per_unit: e.item_cost_per_unit ?? 0,
          })),
        };
        await axios.post(`${baseUrl}/inventory/forecast/forecast/save-ad-hoc-items`, payload);
        setDraftExtraItems([]);
        showDialog?.("Forecast and extra items saved as planned.", "success");
      } else {
        showDialog?.("Forecast saved as planned.", "success");
      }
      setForecastStatusFilter("planned");
      fetchForecastResults("planned");
    } catch (err) {
      testLogError(COMPONENT, "runPlanAllPhases", err);
      showDialog?.(getApiErrorMessage(err, "Plan failed."), "error");
    } finally {
      setLoadingPlan(false);
    }
  };

  const fetchMasterItemsForAddMaterials = useCallback(async () => {
    setLoadingMasterItems(true);
    try {
      const res = await axios.get(MASTER_ITEMS_API, { params: { limit: 500, offset: 0 } });
      const items = res?.data?.items ?? [];
      setMasterItems((Array.isArray(items) ? items : []).map((it) => ({ id: it.id, name: it.item_name ?? it.name ?? "", item_type: it.item_type ?? "" })).filter((it) => it.name));
    } catch (e) {
      setMasterItems([]);
    } finally {
      setLoadingMasterItems(false);
    }
  }, []);

  useEffect(() => {
    if (addMaterialsOpen || mode === "fixed") fetchMasterItemsForAddMaterials();
  }, [addMaterialsOpen, mode, fetchMasterItemsForAddMaterials]);

  /** Display "item name - type" so user can search by type in 1000+ list */
  const getMasterItemLabel = (opt) => {
    if (!opt) return "";
    if (typeof opt === "string") return opt;
    const name = opt.name ?? "";
    const type = opt.item_type ?? "";
    return type ? `${name} - ${type}` : name;
  };

  /** Unique item types from master items for "Item type" filter (Add draft item, Add materials) */
  const uniqueItemTypes = useMemo(() => {
    const types = new Set();
    masterItems.forEach((m) => {
      const t = (m.item_type ?? "").toString().trim();
      if (t) types.add(t);
    });
    return ["", ...Array.from(types).sort((a, b) => a.localeCompare(b))]; // "" = All
  }, [masterItems]);

  const openAddMaterials = (phase) => {
    setAddMaterialsPhase(phase);
    const phaseName = phase?.phase_name ?? "";
    const isBrick = phaseName.toLowerCase().includes("brick");
    const brickDefault = isBrick ? { area_type: "brick_work_area", consumption_rate_per_sqft: "10" } : { area_type: "construction_area", consumption_rate_per_sqft: "" };
    setAddMaterialsItems([{ item_name: "", unit: "", area_type: brickDefault.area_type, consumption_rate_per_sqft: brickDefault.consumption_rate_per_sqft, wastage_percentage: "0", floor_name: "", item_category: "" }]);
    setAddMaterialsItemTypeFilter("");
    setAddMaterialsOpen(true);
  };

  /** Open the multiple-table screen for all phases that are in schedule but not in inventory template */
  const openMissingPhasesDialog = () => {
    const missing = draftResult?.phases_missing ?? [];
    testLog(COMPONENT, "openMissingPhasesDialog", { phaseCount: missing.length, phases: missing.map((p) => p.phase_name) });
    const isBrickPhase = (name) => (name ?? "").toLowerCase().includes("brick");
    setMissingPhasesTables(
      missing.map((p) => {
        const brickDefault = isBrickPhase(p.phase_name) ? { area_type: "brick_work_area", consumption_rate_per_sqft: "10" } : { area_type: "construction_area", consumption_rate_per_sqft: "" };
        return {
          phase_name: p.phase_name ?? "",
          phase_start_date: p.phase_start_date ?? null,
          phase_end_date: p.phase_end_date ?? null,
          items: [{ item_name: "", unit: "", input_mode: "calculated", area_type: brickDefault.area_type, consumption_rate_per_sqft: brickDefault.consumption_rate_per_sqft, fixed_quantity: "", wastage_percentage: "0", floor_name: "", item_category: "" }],
        };
      })
    );
    setMissingPhasesDialogOpen(true);
  };

  const closeMissingPhasesDialog = () => {
    setMissingPhasesDialogOpen(false);
    setMissingPhasesTables([]);
  };

  const updateMissingPhaseRow = (phaseIndex, rowIndex, field, value) => {
    setMissingPhasesTables((prev) => {
      const next = prev.map((p, i) => {
        if (i !== phaseIndex) return p;
        const items = (p.items || []).map((row, j) =>
          j === rowIndex ? { ...row, [field]: value } : row
        );
        return { ...p, items };
      });
      return next;
    });
  };

  const addMissingPhaseRow = (phaseIndex) => {
    setMissingPhasesTables((prev) => {
      const next = [...prev];
      const phaseData = next[phaseIndex] || {};
      const isBrick = (phaseData.phase_name ?? "").toLowerCase().includes("brick");
      const brickDefault = isBrick ? { area_type: "brick_work_area", consumption_rate_per_sqft: "10" } : { area_type: "construction_area", consumption_rate_per_sqft: "" };
      const newRow = { item_name: "", unit: "", input_mode: "calculated", area_type: brickDefault.area_type, consumption_rate_per_sqft: brickDefault.consumption_rate_per_sqft, fixed_quantity: "", wastage_percentage: "0", floor_name: "", item_category: "" };
      const phase = { ...phaseData, items: [...(phaseData.items || []), newRow] };
      next[phaseIndex] = phase;
      return next;
    });
  };

  const removeMissingPhaseRow = (phaseIndex, rowIndex) => {
    setMissingPhasesTables((prev) => {
      const next = [...prev];
      const phaseData = next[phaseIndex] || {};
      const phase = { ...phaseData, items: (phaseData.items || []).filter((_, i) => i !== rowIndex) };
      if (phase.items.length === 0) {
        const isBrick = (phase.phase_name ?? "").toLowerCase().includes("brick");
        const brickDefault = isBrick ? { area_type: "brick_work_area", consumption_rate_per_sqft: "10" } : { area_type: "construction_area", consumption_rate_per_sqft: "" };
        phase.items = [{ item_name: "", unit: "", input_mode: "calculated", area_type: brickDefault.area_type, consumption_rate_per_sqft: brickDefault.consumption_rate_per_sqft, fixed_quantity: "", wastage_percentage: "0", floor_name: "", item_category: "" }];
      }
      next[phaseIndex] = phase;
      return next;
    });
  };

  const submitMissingPhasesMaterials = async () => {
    if (!selectedTemplateId) return;
    let anyValid = false;
    for (const phase of missingPhasesTables) {
      const items = (phase.items || [])
        .filter((r) => {
          if (!r.item_name?.trim() || !r.unit?.trim()) return false;
          const isPieces = (r.input_mode || "calculated") === "pieces";
          const hasFixedQty = r.fixed_quantity != null && r.fixed_quantity !== "" && Number(r.fixed_quantity) > 0;
          const hasRate = r.consumption_rate_per_sqft != null && r.consumption_rate_per_sqft !== "" && Number(r.consumption_rate_per_sqft) > 0;
          return isPieces ? hasFixedQty : hasRate;
        })
        .map((r) => {
          const isPieces = (r.input_mode || "calculated") === "pieces";
          return {
            item_name: r.item_name.trim(),
            unit: r.unit.trim(),
            area_type: r.area_type || "construction_area",
            consumption_rate_per_sqft: isPieces ? 0 : Number(r.consumption_rate_per_sqft),
            wastage_percentage: Number(r.wastage_percentage) || 0,
            floor_name: r.floor_name?.trim() || null,
            item_category: r.item_category?.trim() || null,
            fixed_quantity: isPieces && r.fixed_quantity != null && r.fixed_quantity !== "" ? Number(r.fixed_quantity) : null,
          };
        });
      if (items.length > 0) anyValid = true;
    }
    if (!anyValid) {
      showDialog?.("Add at least one item (with name, unit, and either rate/sqft or pieces qty) for at least one phase.", "error");
      return;
    }
    const missingCount = missingPhasesTables.length;
    const shouldCreateNew = missingCount > 4;
    setAddingMissingPhases(true);
    try {
      let targetTemplateId = selectedTemplateId;
      if (shouldCreateNew) {
        const selectedTpl = templates.find((t) => String(t.template_id ?? t.id) === selectedTemplateId);
        const baseName = selectedTpl?.template_name ?? selectedTpl?.name ?? "Template";
        const newName = `${baseName} + ${missingCount} phases`;
        testLog(COMPONENT, "submitMissingPhasesCopyTemplate", { sourceId: selectedTemplateId, missingCount });
        const copyRes = await axios.post(`${baseUrl}/inventory/forecast/templates/copy`, {
          source_template_id: selectedTemplateId,
          new_name: newName,
        });
        const newId = copyRes?.data?.template_id ?? copyRes?.data?.id;
        if (!newId) throw new Error("Backend did not return new template ID");
        targetTemplateId = String(newId);
        setSelectedTemplateId(targetTemplateId);
      }
      for (const phase of missingPhasesTables) {
        const items = (phase.items || [])
          .filter((r) => {
            if (!r.item_name?.trim() || !r.unit?.trim()) return false;
            const isPieces = (r.input_mode || "calculated") === "pieces";
            const hasFixedQty = r.fixed_quantity != null && r.fixed_quantity !== "" && Number(r.fixed_quantity) > 0;
            const hasRate = r.consumption_rate_per_sqft != null && r.consumption_rate_per_sqft !== "" && Number(r.consumption_rate_per_sqft) > 0;
            return isPieces ? hasFixedQty : hasRate;
          })
          .map((r) => {
            const isPieces = (r.input_mode || "calculated") === "pieces";
            return {
              item_name: r.item_name.trim(),
              unit: r.unit.trim(),
              area_type: r.area_type || "construction_area",
              consumption_rate_per_sqft: isPieces ? 0 : Number(r.consumption_rate_per_sqft),
              wastage_percentage: Number(r.wastage_percentage) || 0,
              floor_name: r.floor_name?.trim() || null,
              item_category: r.item_category?.trim() || null,
              fixed_quantity: isPieces && r.fixed_quantity != null && r.fixed_quantity !== "" ? Number(r.fixed_quantity) : null,
            };
          });
        if (items.length === 0) continue;
        await axios.post(`${baseUrl}/inventory/forecast/templates/${targetTemplateId}/add-phase-items`, {
          phase_name: phase.phase_name,
          items,
          change_reason: shouldCreateNew ? "Added materials for phase (new template from copy)" : "Added materials for phase in schedule but not in template (multi-phase screen)",
        });
      }
      testLog(COMPONENT, "submitMissingPhasesMaterialsSuccess", { phaseCount: missingPhasesTables.length, createdNew: shouldCreateNew, targetTemplateId });
      showDialog?.(
        shouldCreateNew
          ? `New template created with ${missingCount} phases. Generate draft again to include them.`
          : "Materials added for all phases. Generate draft again to include them.",
        "success"
      );
      closeMissingPhasesDialog();
      fetchTemplates();
      setDraftResult(null);
    } catch (err) {
      testLogError(COMPONENT, "submitMissingPhasesMaterials", err);
      showDialog?.(getApiErrorMessage(err, "Failed to add materials."), "error");
    } finally {
      setAddingMissingPhases(false);
    }
  };

  const closeAddMaterials = () => {
    setAddMaterialsOpen(false);
    setAddMaterialsItemTypeFilter("");
    setAddMaterialsPhase(null);
  };

  const addMaterialRow = () => {
    const phaseName = addMaterialsPhase?.phase_name ?? addMaterialsPhaseNameManual ?? "";
    const isBrick = phaseName.toLowerCase().includes("brick");
    const brickDefault = isBrick ? { area_type: "brick_work_area", consumption_rate_per_sqft: "10" } : { area_type: "construction_area", consumption_rate_per_sqft: "" };
    setAddMaterialsItems((prev) => [...prev, { item_name: "", unit: "", area_type: brickDefault.area_type, consumption_rate_per_sqft: brickDefault.consumption_rate_per_sqft, wastage_percentage: "0", floor_name: "", item_category: "" }]);
  };

  const updateMaterialRow = (index, field, value) => {
    setAddMaterialsItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeMaterialRow = (index) => {
    if (addMaterialsItems.length <= 1) return;
    setAddMaterialsItems((prev) => prev.filter((_, i) => i !== index));
  };

  const openAddDraftItem = async (phase) => {
    setAddDraftItemPhase(phase);
    const isBrick = (phase?.phase_name ?? "").toLowerCase().includes("brick");
    const brickDefault = isBrick ? { area_type: "brick_work_area", input_mode: "calculated", consumption_rate_per_sqft: "10" } : { area_type: "construction_area", input_mode: "manual", consumption_rate_per_sqft: "" };
    setAddDraftItemForm({ item_key: "", unit: "", input_mode: brickDefault.input_mode, quantity: "", area_type: brickDefault.area_type, area_value: "", consumption_rate_per_sqft: brickDefault.consumption_rate_per_sqft, wastage_percentage: "0", item_cost_per_unit: "", item_type_filter: "" });
    setAddDraftItemOpen(true);
    setLoadingMasterItems(true);
    setLoadingInventory(true);
    try {
      const promises = [axios.get(MASTER_ITEMS_API, { params: { limit: 500, offset: 0 } })];
      if (propertyId) promises.push(axios.get(`${baseUrl}/inventory/property/${propertyId}`));
      const results = await Promise.all(promises);
      const itemsRes = results[0];
      const items = itemsRes?.data?.items ?? [];
      setMasterItems((Array.isArray(items) ? items : []).map((it) => ({ id: it.id, name: it.item_name ?? it.name ?? "", item_type: it.item_type ?? "" })).filter((it) => it.name));
      if (propertyId && results[1]) {
        const list = results[1]?.data?.inventory ?? [];
        setPropertyInventory(Array.isArray(list) ? list : []);
      } else {
        setPropertyInventory([]);
      }
    } catch (e) {
      console.error("Error fetching:", e);
      setPropertyInventory([]);
      setMasterItems([]);
    } finally {
      setLoadingInventory(false);
      setLoadingMasterItems(false);
    }
  };

  const closeAddDraftItem = () => {
    setAddDraftItemOpen(false);
    setAddDraftItemPhase(null);
  };

  const getPropertyAreaForType = (areaType) => {
    const a = draftResult?.property_areas || propertyAreas;
    if (!a) return 0;
    const v = (key) => Number(a[key]);
    if (areaType === "construction_area") return v("construction_area_sqft") || v("construction_area") || 0;
    if (areaType === "slab_area" || areaType === "total_slab_area") return v("total_slab_area_sqft") || v("total_slab_area") || 0;
    if (areaType === "brick_work_area" || areaType === "total_brick_work_area") return v("total_brick_work_area_sqft") || v("total_brick_work_area") || 0;
    if (areaType === "plastering_area" || areaType === "total_plastering_area") return v("total_plastering_area_sqft") || v("total_plastering_area") || 0;
    return 0;
  };

  const addDraftItemToDraft = () => {
    if (!addDraftItemPhase) return;
    const inv = propertyInventory.find((i) => (i.item || i.item_name) === addDraftItemForm.item_key);
    const itemName = addDraftItemForm.item_key || inv?.item || inv?.item_name;
    const unit = addDraftItemForm.unit || inv?.unit || "";
    const unitCost = Number(addDraftItemForm.item_cost_per_unit) || Number(inv?.material_cost) || 0;
    if (!itemName || !unit) {
      showDialog?.("Select an item (and ensure unit is set).", "error");
      return;
    }
    let forecastedQuantity = 0;
    let forecastCost = 0;
    let areaValue = 0;
    let consumptionRate = 0;
    let wastagePct = 0;
    if (addDraftItemForm.input_mode === "manual") {
      forecastedQuantity = Number(addDraftItemForm.quantity) || 0;
      if (forecastedQuantity <= 0) {
        showDialog?.("Enter a valid quantity.", "error");
        return;
      }
      forecastCost = forecastedQuantity * unitCost;
    } else {
      areaValue = Number(addDraftItemForm.area_value) || getPropertyAreaForType(addDraftItemForm.area_type);
      consumptionRate = Number(addDraftItemForm.consumption_rate_per_sqft) || 0;
      wastagePct = Number(addDraftItemForm.wastage_percentage) || 0;
      const baseQty = areaValue * consumptionRate;
      const wastageQty = baseQty * (wastagePct / 100);
      forecastedQuantity = baseQty + wastageQty;
      if (forecastedQuantity <= 0) {
        showDialog?.("Area × rate must be > 0.", "error");
        return;
      }
      forecastCost = forecastedQuantity * unitCost;
    }
    const requiredOrder = forecastedQuantity; // backend will subtract current inventory
    const extra = {
      _clientId: Date.now() + "_" + Math.random().toString(36).slice(2),
      phase_name: addDraftItemPhase.phase_name,
      phase_start_date: addDraftItemPhase.phase_start_date ?? null,
      phase_end_date: addDraftItemPhase.phase_end_date ?? null,
      item_name: itemName,
      unit,
      input_mode: addDraftItemForm.input_mode,
      quantity: addDraftItemForm.input_mode === "manual" ? forecastedQuantity : undefined,
      forecasted_quantity: forecastedQuantity,
      required_order: requiredOrder,
      forecast_cost: forecastCost,
      item_cost_per_unit: unitCost,
      area_type: addDraftItemForm.area_type,
      area_value: addDraftItemForm.input_mode === "calculated" ? areaValue : 0,
      consumption_rate_per_sqft: addDraftItemForm.input_mode === "calculated" ? consumptionRate : 0,
      wastage_percentage: addDraftItemForm.input_mode === "calculated" ? wastagePct : 0,
    };
    setDraftExtraItems((prev) => [...prev, extra]);
    closeAddDraftItem();
    showDialog?.("Item added to draft. It will be saved when you click Save as planned.", "success");
  };

  const removeDraftExtraItem = (clientId) => {
    setDraftExtraItems((prev) => prev.filter((e) => e._clientId !== clientId));
  };

  const submitAddPhaseItems = async () => {
    const phaseName = (addMaterialsPhase?.phase_name || addMaterialsPhaseNameManual || "").trim();
    if (!phaseName || !selectedTemplateId) {
      showDialog?.("Enter phase name.", "error");
      return;
    }
    const items = addMaterialsItems
      .filter((r) => r.item_name?.trim() && r.unit?.trim() && r.consumption_rate_per_sqft !== "" && Number(r.consumption_rate_per_sqft) > 0)
      .map((r) => ({
        item_name: r.item_name.trim(),
        unit: r.unit.trim(),
        area_type: r.area_type || "construction_area",
        consumption_rate_per_sqft: Number(r.consumption_rate_per_sqft),
        wastage_percentage: Number(r.wastage_percentage) || 0,
        floor_name: r.floor_name?.trim() || null,
        item_category: r.item_category?.trim() || null,
      }));
    if (items.length === 0) {
      showDialog?.("Add at least one item with name, unit, and rate.", "error");
      return;
    }
    setAddingMaterials(true);
    try {
      await axios.post(`${baseUrl}/inventory/forecast/templates/${selectedTemplateId}/add-phase-items`, {
        phase_name: phaseName,
        items,
        change_reason: "Added materials for phase (from UI)",
      });
      showDialog?.("Materials added for this phase. Generate draft again to include it.", "success");
      closeAddMaterials();
      fetchTemplates();
      setDraftResult(null);
    } catch (err) {
      showDialog?.(getApiErrorMessage(err, "Failed to add materials."), "error");
    } finally {
      setAddingMaterials(false);
    }
  };

  const fetchForecastResults = useCallback(async (statusOverride) => {
    if (!propertyId) return;
    setLoadingResults(true);
    const filter = statusOverride != null ? statusOverride : forecastStatusFilter;
    const params = new URLSearchParams({ property_id: propertyId });
    if (filter) params.set("forecast_status", filter);
    testLogApi(COMPONENT, "GET", `${baseUrl}/inventory/forecast/forecast/results?${params.toString()}`, null, { filter });
    try {
      const res = await axios.get(`${baseUrl}/inventory/forecast/forecast/results?${params.toString()}`);
      const raw = res?.data ?? {};
      // Normalize: API may return forecasts, results, forecast_list, items, or a top-level array
      const list = Array.isArray(raw.forecasts)
        ? raw.forecasts
        : Array.isArray(raw.results)
          ? raw.results
          : Array.isArray(raw.forecast_list)
            ? raw.forecast_list
            : Array.isArray(raw.items)
              ? raw.items
              : Array.isArray(raw)
                ? raw
                : Array.isArray(raw.data)
                  ? raw.data
                  : [];
      const total_forecast_cost = raw.total_forecast_cost ?? raw.total_cost ?? null;
      const normalized = { ...raw, forecasts: list, total_forecast_cost };
      testLog(COMPONENT, "fetchForecastResultsSuccess", { count: list.length, total_forecast_cost });
      setForecastResults(normalized);
    } catch (err) {
      testLogError(COMPONENT, "fetchForecastResults", err);
      setForecastResults({ success: false, forecasts: [], count: 0 });
    } finally {
      setLoadingResults(false);
    }
  }, [baseUrl, propertyId, forecastStatusFilter]);

  useEffect(() => {
    if (propertyId) fetchForecastResults();
  }, [propertyId, forecastStatusFilter, fetchForecastResults]);

  /** When opening Fixed mode, pull planned lines from the server into empty phase rows (so edits continue where you left off). */
  useEffect(() => {
    if (mode !== "fixed" || fixedPhasesLoading || !propertyId) return;
    const list = forecastResults?.forecasts ?? [];
    const plannedRows = list.filter((f) => String(f.forecast_status || "").toLowerCase() === "planned");
    if (!plannedRows.length || !fixedPhases.length) return;
    setFixedPhases((prev) => {
      let changed = false;
      const out = prev.map((p) => {
        const rows = plannedRows.filter((r) => (r.phase_name ?? "") === (p.phase_name ?? ""));
        if (!rows.length) return p;
        const hasLocal = (p.items || []).some((i) => i.item_name?.trim() && Number(i.quantity) > 0);
        if (hasLocal) return p;
        changed = true;
        return {
          ...p,
          items: rows.map((f) => ({
            item_name: f.item_name ?? "",
            unit: f.unit ?? "",
            quantity: f.forecasted_quantity != null ? String(f.forecasted_quantity) : "",
            cost_per_unit: f.item_cost_per_unit != null ? String(f.item_cost_per_unit) : "",
          })),
        };
      });
      return changed ? out : prev;
    });
  }, [mode, fixedPhasesLoading, forecastResults, fixedPhases.length, propertyId]);

  const savedForecastsAnchorRef = useRef(null);

  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const deleteTemplate = async (templateId) => {
    if (!templateId) return;
    setDeletingTemplate(true);
    try {
      await axios.delete(`${baseUrl}/inventory/forecast/templates/${templateId}`);
      showDialog?.("Template deleted.", "success");
      if (selectedTemplateId === String(templateId)) {
        setSelectedTemplateId("");
        setDraftResult(null);
      }
      fetchTemplates();
      setTemplateSelectionView(false);
    } catch (err) {
      testLogError(COMPONENT, "deleteTemplate", err);
      showDialog?.(getApiErrorMessage(err, "Failed to delete template."), "error");
    } finally {
      setDeletingTemplate(false);
    }
  };

  const deletePlanned = async () => {
    if (!propertyId) return;
    if (!window.confirm("Delete all planned forecasts for this property? This cannot be undone.")) return;
    setDeletingPlanned(true);
    testLogApi(COMPONENT, "DELETE", `${baseUrl}/inventory/forecast/forecast/results`, { propertyId, forecast_status: "planned" });
    try {
      const res = await axios.delete(`${baseUrl}/inventory/forecast/forecast/results?property_id=${encodeURIComponent(propertyId)}&forecast_status=planned`);
      testLog(COMPONENT, "deletePlannedSuccess", { propertyId });
      const msg = res?.data?.message ?? "Planned forecasts deleted.";
      showDialog?.(msg, "success");
      fetchForecastResults();
    } catch (err) {
      testLogError(COMPONENT, "deletePlanned", err);
      showDialog?.(getApiErrorMessage(err, "Failed to delete planned."), "error");
    } finally {
      setDeletingPlanned(false);
    }
  };

  /** Export fixed phases (phase + items with quantities) to Excel. */
  const downloadFixedPhasesExcel = () => {
    if (!fixedPhases.length) {
      showDialog?.("No phases to export. Add phases from schedule first.", "info");
      return;
    }
    const headers = ["Phase", "Phase start", "Phase end", "Item", "Unit", "Quantity", "Cost/unit (₹)"];
    const rows = [];
    fixedPhases.forEach((p) => {
      (p.items || []).forEach((it) => {
        const qty = Number(it.quantity);
        if (!it.item_name?.trim() || !it.unit?.trim() || !(qty > 0)) return;
        const cost = Number(it.cost_per_unit) || 0;
        rows.push([
          p.phase_name ?? "",
          p.phase_start_date ?? "",
          p.phase_end_date ?? "",
          (it.item_name || "").trim(),
          (it.unit || "").trim(),
          qty,
          cost,
        ]);
      });
    });
    if (rows.length === 0) {
      showDialog?.("Add at least one item with quantity for any phase to export.", "info");
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "Fixed amounts");
    const filename = `phase_inventory_fixed_${propertyId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    showDialog?.("Fixed amounts exported to Excel.", "success");
    testLog(COMPONENT, "downloadFixedPhasesExcel", { rowCount: rows.length, filename });
  };

  /** Export current saved forecasts to Excel (detailed + summary sheets). */
  const downloadForecastsExcel = () => {
    const list = forecastResults?.forecasts ?? [];
    if (list.length === 0) {
      showDialog?.("No forecasts to export.", "info");
      return;
    }
    const wb = XLSX.utils.book_new();
    const headers = ["Phase", "Item", "Unit", "Qty", "Order", "Cost (₹)", "Status", "Phase start", "Phase end"];
    const rows = list.map((f) => [
      f.phase_name ?? "",
      f.item_name ?? "",
      f.unit ?? "",
      f.forecasted_quantity != null ? Number(f.forecasted_quantity) : "",
      f.required_order != null ? Number(f.required_order) : "",
      f.forecast_cost != null ? Number(f.forecast_cost) : "",
      f.forecast_status ?? "",
      f.phase_start_date ?? "",
      f.phase_end_date ?? "",
    ]);
    const wsDetail = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Saved forecasts");
    const sumHeaders = ["Item", "Unit", "Total qty", "Total order", "Total cost (₹)"];
    const sumRows = itemSummary.map((r) => [
      r.item_name, r.unit,
      Number(r.quantity).toFixed(2), Number(r.required_order).toFixed(2),
      Number(r.forecast_cost).toFixed(2),
    ]);
    if (itemSummary.length > 0) {
      sumRows.push(["Total villa", "", "", "", Number(totalVillaCost).toFixed(2)]);
    }
    const wsSummary = XLSX.utils.aoa_to_sheet([sumHeaders, ...sumRows]);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary by items");
    const filename = `phase_inventory_forecasts_${propertyId}_${forecastStatusFilter || "all"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    showDialog?.("Forecast exported to Excel.", "success");
    testLog(COMPONENT, "downloadForecastsExcel", { rowCount: list.length, filename });
  };

  /** Summary by item + unit (aggregated across phases) – for collapsible section */
  const itemSummary = React.useMemo(() => {
    const list = forecastResults?.forecasts ?? [];
    const map = new Map();
    list.forEach((f) => {
      const name = (f.item_name ?? "").trim() || "—";
      const unit = (f.unit ?? "").trim() || "";
      const key = `${name}|${unit}`;
      const existing = map.get(key) || { item_name: name, unit, quantity: 0, required_order: 0, forecast_cost: 0 };
      existing.quantity += Number(f.forecasted_quantity) || 0;
      existing.required_order += Number(f.required_order) || 0;
      existing.forecast_cost += Number(f.forecast_cost) || 0;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => (a.item_name || "").localeCompare(b.item_name || "") || (a.unit || "").localeCompare(b.unit || ""));
  }, [forecastResults]);

  const totalVillaCost = React.useMemo(() => itemSummary.reduce((s, r) => s + (Number(r.forecast_cost) || 0), 0), [itemSummary]);

  // Forecast status summary (counts by forecast_status from saved results) – must be before any early return (rules of hooks)
  const forecastStatusCounts = React.useMemo(() => {
    const list = forecastResults?.forecasts ?? [];
    const counts = { draft: 0, planned: 0, forecast: 0, archived: 0 };
    list.forEach((f) => {
      const s = String(f.forecast_status || "").toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [forecastResults]);

  const fixedMaterialLinesCount = React.useMemo(
    () =>
      fixedPhases.reduce(
        (n, p) => n + (p.items || []).filter((i) => i.item_name?.trim() && i.unit?.trim() && Number(i.quantity) > 0).length,
        0
      ),
    [fixedPhases]
  );
  const fixedPhasesFilledCount = React.useMemo(
    () => fixedPhases.filter((p) => (p.items || []).some((i) => i.item_name?.trim() && i.unit?.trim() && Number(i.quantity) > 0)).length,
    [fixedPhases]
  );
  const plannedTotals = React.useMemo(() => {
    const list = (forecastResults?.forecasts ?? []).filter(
      (f) => String(f.forecast_status || "").toLowerCase() === "planned"
    );
    const phases = new Set();
    let totalQty = 0;
    let totalValue = 0;
    let currentValue = 0;
    list.forEach((f) => {
      if (f.phase_name) phases.add(f.phase_name);
      totalQty += Number(f.forecasted_quantity) || 0;
      totalValue += Number(f.forecast_cost) || 0;
      currentValue += Number(f.current_value) || ((Number(f.forecasted_quantity) || 0) * (Number(f.current_master_price) || 0));
    });
    return {
      plannedRows: list.length,
      plannedPhases: phases.size,
      totalQty,
      totalValue,
      currentValue,
      valueDelta: currentValue - totalValue,
    };
  }, [forecastResults]);
  const filteredFixedPhaseIndices = React.useMemo(() => {
    const q = (fixedPhaseSearch || "").trim().toLowerCase();
    return fixedPhases
      .map((phase, idx) => ({ phase, idx }))
      .filter(({ phase }) => !q || String(phase.phase_name || "").toLowerCase().includes(q))
      .map(({ idx }) => idx);
  }, [fixedPhases, fixedPhaseSearch]);
  const selectedPhaseIndexResolved = React.useMemo(() => {
    if (filteredFixedPhaseIndices.length === 0) return -1;
    if (filteredFixedPhaseIndices.includes(selectedFixedPhaseIndex)) return selectedFixedPhaseIndex;
    return filteredFixedPhaseIndices[0];
  }, [filteredFixedPhaseIndices, selectedFixedPhaseIndex]);
  const selectedFixedPhase = selectedPhaseIndexResolved >= 0 ? fixedPhases[selectedPhaseIndexResolved] : null;
  useEffect(() => {
    if (fixedPhases.length === 0) {
      setSelectedFixedPhaseIndex(0);
      return;
    }
    if (selectedFixedPhaseIndex >= fixedPhases.length) {
      setSelectedFixedPhaseIndex(0);
    }
  }, [fixedPhases.length, selectedFixedPhaseIndex]);
  const normalizePhaseKey = React.useCallback((s) => String(s ?? "").trim().toLowerCase(), []);
  const plannedItemsByPhase = React.useMemo(() => {
    const list = forecastResults?.forecasts ?? [];
    const byPhase = new Map();
    list.forEach((f) => {
      if (String(f.forecast_status || "").toLowerCase() !== "planned") return;
      const phaseName = normalizePhaseKey(f.phase_name);
      const itemName = (f.item_name || "").trim();
      if (!phaseName || !itemName) return;
      const set = byPhase.get(phaseName) || new Set();
      set.add(itemName);
      byPhase.set(phaseName, set);
    });
    return byPhase;
  }, [forecastResults, normalizePhaseKey]);
  const plannedRowsByPhase = React.useMemo(() => {
    const list = forecastResults?.forecasts ?? [];
    const byPhase = new Map();
    list.forEach((f) => {
      if (String(f.forecast_status || "").toLowerCase() !== "planned") return;
      const phaseName = normalizePhaseKey(f.phase_name);
      if (!phaseName) return;
      const rows = byPhase.get(phaseName) || [];
      rows.push({
        item_name: f.item_name ?? "",
        unit: f.unit ?? "",
        forecasted_quantity: Number(f.forecasted_quantity) || 0,
        required_order: Number(f.required_order) || 0,
        forecast_cost: Number(f.forecast_cost) || 0,
        item_cost_per_unit: Number(f.item_cost_per_unit) || 0,
        planned_unit_price: Number(f.planned_unit_price) || Number(f.item_cost_per_unit) || 0,
        current_master_price: Number(f.current_master_price) || 0,
        unit_price_delta: Number(f.unit_price_delta) || ((Number(f.current_master_price) || 0) - (Number(f.planned_unit_price) || Number(f.item_cost_per_unit) || 0)),
        current_value: Number(f.current_value) || ((Number(f.forecasted_quantity) || 0) * (Number(f.current_master_price) || 0)),
        value_delta: Number(f.value_delta) || (((Number(f.forecasted_quantity) || 0) * (Number(f.current_master_price) || 0)) - (Number(f.forecast_cost) || 0)),
        current_inventory: Number(f.current_inventory) || 0,
        pending_requests: Number(f.pending_requests) || 0,
        phase_start_date: f.phase_start_date ?? "",
        phase_end_date: f.phase_end_date ?? "",
        forecast_status: f.forecast_status ?? "",
      });
      byPhase.set(phaseName, rows);
    });
    return byPhase;
  }, [forecastResults, normalizePhaseKey]);

  if (!propertyId) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">No property selected.</Typography>
      </Box>
    );
  }

  const hasSetup = scheduleStatus?.hasSchedule && templates.length > 0 && selectedTemplateId;
  const hasDraft = draftResult?.phases_draft?.length > 0 || draftResult?.phases_missing?.length > 0;
  const activeStep = !hasSetup ? 0 : !draftResult ? 1 : hasDraft && (draftResult?.phases_missing?.length || 0) > 0 ? 2 : 3;
  const hasSavedForecasts = (forecastResults?.forecasts?.length ?? 0) > 0;

  // Dynamic "next step" – short, action-focused for first-timers
  const nextStepHint = !scheduleStatus?.hasSchedule
    ? "Upload your schedule file (Excel with phases)"
    : !selectedTemplateId || !templates.length
      ? "Select a template or upload one"
      : !draftResult
        ? "Click Generate Draft to preview forecast"
        : (draftResult?.phases_missing?.length ?? 0) > 0
          ? "Add materials for missing phases, then Generate Draft again"
          : "Review draft, then Save as Planned";
  const plannedDoneHint = (forecastStatusCounts?.planned ?? 0) > 0 ? "To replan: Delete planned below, then Generate Draft and Save as Planned." : null;

  const selectedTemplate = templates.find((t) => String(t.template_id ?? t.id) === selectedTemplateId);
  const selectedTemplateName = selectedTemplate?.template_name ?? selectedTemplate?.name ?? selectedTemplateId ? `Template ${selectedTemplateId}` : null;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1100,
        mx: "auto",
        py: { xs: 1.5, sm: 2 },
        px: { xs: 1.5, sm: 2 },
        overflowX: "hidden",
      }}
    >
      {templateSelectionView ? (
        <TemplateSelectionPage
          templates={templates}
          loadingTemplates={loadingTemplates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={(id) => {
            setSelectedTemplateId(id);
            setTemplateSelectionView(false);
            if (id) setDraftPlanDialogOpen(true);
          }}
          onDownloadSample={downloadSampleExcel}
          onUpload={() => setTemplateUploadOpen(true)}
          onViewTemplate={(id) => {
            setTemplateViewId(id);
            setTemplateViewOpen(true);
          }}
          onDeleteTemplate={deleteTemplate}
          onBack={() => setTemplateSelectionView(false)}
        />
      ) : (
        <>
      {/* Page header – property context */}
      <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
        <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: "#111827", letterSpacing: "-0.03em" }}>
          {mode === "fixed" ? "Phase inventory (fixed quantities)" : "Inventory forecast planning"}
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5, fontSize: { xs: 13, sm: 14 } }}>
          {property?.name ? `${property.name} · ` : ""}{propertyId || "—"}
        </Typography>
      </Box>

      {/* Mode tabs: Fixed first (primary client path) */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ minHeight: 44 }}>
          <Tab label="Fixed quantities" value="fixed" sx={{ textTransform: "none", fontWeight: 600, fontSize: 14 }} />
          <Tab label="Template (area × rate)" value="template" sx={{ textTransform: "none", fontWeight: 600, fontSize: 14 }} />
        </Tabs>
      </Box>

      {/* Critical alerts – blocking states */}
      {templatesError && mode === "template" && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setTemplatesError(null)}>
          {templatesError}
        </Alert>
      )}
      {mode === "template" && propertyId && !loadingPropertyAreas && propertyAreas && (Number(propertyAreas.construction_area_sqft) || 0) + (Number(propertyAreas.total_slab_area_sqft) || 0) + (Number(propertyAreas.total_brick_work_area_sqft) || 0) + (Number(propertyAreas.total_plastering_area_sqft) || 0) === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Property has no areas defined. Add floors with slab, brick work, and plastering areas (Edit property → Floors) to enable forecast planning.
        </Alert>
      )}
      {propertyId && !loadingScheduleStatus && scheduleStatus && !scheduleStatus.hasSchedule && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No schedule found. Upload a schedule (Excel with phases) in the Schedule section above to continue.
        </Alert>
      )}
      {mode === "template" && !loadingTemplates && !templatesError && templates.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No templates yet. Upload an Excel file with phases and materials, or download the sample, to create templates.
        </Alert>
      )}

      {/* Fixed mode — primary UX: quantities per schedule phase, save as planned */}
      {mode === "fixed" && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            mb: 2,
            borderRadius: 2,
            border: "1px solid #e5e7eb",
            borderLeft: { xs: "1px solid #e5e7eb", sm: "4px solid #16a34a" },
            bgcolor: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "flex-start" }, justifyContent: "space-between", gap: 1.5, mb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: { xs: 16, sm: 17 }, fontWeight: 700, color: "#111827", mb: 0.5 }}>
                Enter materials by phase
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#64748b", maxWidth: 720, lineHeight: 1.6 }}>
                Uses your property schedule for phase names. Add line items (or upload Excel), then save the plan. Planned lines load automatically when you open this tab.
              </Typography>
            </Box>
            {hasSavedForecasts && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={() => savedForecastsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, flexShrink: 0 }}
              >
                View saved plan below
              </Button>
            )}
          </Box>

          <FixedPhaseInventorySummaryCards
            schedulePhasesCount={scheduleStatus?.count ?? 0}
            materialLinesCount={fixedMaterialLinesCount}
            phasesFilledCount={fixedPhasesFilledCount}
            plannedLinesSaved={forecastStatusCounts?.planned ?? 0}
            loadingSchedule={loadingScheduleStatus}
          />

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase" }}>Steps</Typography>
            <Chip size="small" label="1. Schedule" color={scheduleStatus?.hasSchedule ? "success" : "default"} variant={scheduleStatus?.hasSchedule ? "filled" : "outlined"} sx={{ fontWeight: 600 }} />
            <Typography sx={{ color: "#cbd5e1", fontSize: 12 }}>→</Typography>
            <Chip size="small" label="2. Materials" color={fixedMaterialLinesCount > 0 ? "primary" : "default"} variant="outlined" sx={{ fontWeight: 600 }} />
            <Typography sx={{ color: "#cbd5e1", fontSize: 12 }}>→</Typography>
            <Chip size="small" label="3. Save plan" color={fixedPhasesFilledCount > 0 && fixedPhases.length > 0 && fixedPhasesFilledCount === fixedPhases.length ? "success" : "default"} variant="outlined" sx={{ fontWeight: 600 }} />
          </Box>

          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>Quick start (new users)</Typography>
            <Box component="ol" sx={{ m: 0, pl: 2.5, color: "#475569", fontSize: 12, lineHeight: 1.7 }}>
              <li>Open a phase and click <strong>Add item</strong>.</li>
              <li>Select item, unit, and quantity.</li>
              <li>Click <strong>Save this phase</strong> to publish only that phase.</li>
              <li>Use <strong>Save entered phases as Planned</strong> to publish all filled phases together.</li>
            </Box>
          </Alert>

          {/* 1. Upload schedule – when no schedule (disabled here; schedule is managed from Workflow) */}
          {!scheduleStatus?.hasSchedule && false && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>1. Upload schedule</Typography>
              <Typography sx={{ fontSize: 12, mb: 2 }}>Upload an Excel file with phase names (and dates) to continue. Use the sample to test the upload.</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={downloadScheduleSampleExcel} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                  Download sample Excel
                </Button>
              </Box>
            </Alert>
          )}

          {/* Schedule status */}
          {scheduleStatus?.hasSchedule && (
            <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 0.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>Schedule linked</Typography>
                <Chip label={`${scheduleStatus.count ?? 0} phases`} size="small" sx={{ fontWeight: 600, bgcolor: "#dcfce7", color: "#166534" }} />
              </Box>
              <Typography sx={{ fontSize: 12, color: "#15803d" }}>Phase names below match your schedule. Add at least one material line per phase before saving.</Typography>
            </Box>
          )}

          {fixedPhasesLoading ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}><CircularProgress size={28} /></Box>
          ) : fixedPhases.length === 0 && scheduleStatus?.hasSchedule ? (
            <Typography sx={{ fontSize: 14, color: "#64748b" }}>No phases in schedule. Upload an Excel file with phase names.</Typography>
          ) : scheduleStatus?.hasSchedule && fixedPhases.length > 0 ? (
            <>
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>3. Phase planning workspace</Typography>
                <Chip size="small" variant="outlined" color="success" label={`Planned items: ${plannedTotals.plannedRows}`} />
                <Chip size="small" variant="outlined" color="success" label={`Planned phases: ${plannedTotals.plannedPhases}`} />
                <Chip size="small" variant="outlined" color="success" label={`Planned qty: ${Number(plannedTotals.totalQty || 0).toFixed(2)}`} />
                <Chip size="small" variant="outlined" color="success" label={`Planned value: Rs ${Number(plannedTotals.totalValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                <Chip size="small" variant="outlined" color="primary" label={`Current value: Rs ${Number(plannedTotals.currentValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                <Chip
                  size="small"
                  variant="outlined"
                  color={Number(plannedTotals.valueDelta || 0) >= 0 ? "warning" : "success"}
                  label={`Delta: Rs ${Number(plannedTotals.valueDelta || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={recalculatePlannedPricing}
                  disabled={recalculatingPrices || plannedTotals.plannedRows === 0}
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                >
                  {recalculatingPrices ? <CircularProgress size={16} /> : "Recalculate prices"}
                </Button>
                <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={downloadInventorySampleExcel} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                  Download sample inventory Excel
                </Button>
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleInventoryFileChange} id="fixed-inventory-file" />
                <label htmlFor="fixed-inventory-file">
                  <Button variant="outlined" size="small" startIcon={<AddIcon />} component="span" sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                    Upload inventory Excel
                  </Button>
                </label>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "260px minmax(0, 1fr)" }, gap: 2 }}>
                <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25, bgcolor: "#f8fafc" }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Search phase..."
                    value={fixedPhaseSearch}
                    onChange={(e) => setFixedPhaseSearch(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, maxHeight: 560, overflow: "auto" }}>
                    {filteredFixedPhaseIndices.map((phaseIndex) => {
                      const phase = fixedPhases[phaseIndex];
                      const enteredCount = (phase?.items || []).filter((i) => i.item_name?.trim() && Number(i.quantity) > 0).length;
                      const plannedCount = plannedRowsByPhase.get(normalizePhaseKey(phase?.phase_name))?.length ?? 0;
                      const selected = selectedPhaseIndexResolved === phaseIndex;
                      return (
                        <Box
                          key={`${phase?.phase_name || "phase"}-${phaseIndex}`}
                          onClick={() => setSelectedFixedPhaseIndex(phaseIndex)}
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            border: "1px solid",
                            borderColor: selected ? "#16a34a" : "#e2e8f0",
                            bgcolor: selected ? "#f0fdf4" : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{phase?.phase_name || `Phase ${phaseIndex + 1}`}</Typography>
                          <Box sx={{ mt: 0.75, display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                            <Chip size="small" label={`Entered ${enteredCount}`} variant="outlined" />
                            <Chip size="small" label={`Planned ${plannedCount}`} color={plannedCount > 0 ? "success" : "default"} variant="outlined" />
                          </Box>
                        </Box>
                      );
                    })}
                    {filteredFixedPhaseIndices.length === 0 && (
                      <Typography sx={{ px: 0.5, py: 1.5, color: "#64748b", fontSize: 12 }}>No phase matches your search.</Typography>
                    )}
                  </Box>
                </Paper>

                <Box>
                  {!selectedFixedPhase ? (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography sx={{ color: "#64748b", fontSize: 13 }}>Select a phase from the left to start entering items.</Typography>
                    </Paper>
                  ) : (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#111827", mb: 1 }}>
                        {selectedFixedPhase.phase_name}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.75, mb: 1.25 }}>
                        <Chip
                          size="small"
                          color="success"
                          variant="outlined"
                          label={`Planned (${plannedRowsByPhase.get(normalizePhaseKey(selectedFixedPhase.phase_name))?.length ?? 0})`}
                        />
                        <Typography sx={{ fontSize: 11, color: "#64748b" }}>Planned rows are shown below as read-only.</Typography>
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                        <Typography sx={{ fontSize: 11, color: "#64748b" }}>
                          Fast entry: add rows, search item, enter qty, then save this phase.
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button size="small" startIcon={<AddIcon />} onClick={() => addFixedPhaseItem(selectedPhaseIndexResolved)} sx={{ textTransform: "none" }}>
                            Add item
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => saveFixedPlan(selectedFixedPhase.phase_name)}
                            disabled={fixedSaving || !(selectedFixedPhase.items || []).some((i) => i.item_name?.trim() && i.unit?.trim() && Number(i.quantity) > 0)}
                            sx={{ textTransform: "none" }}
                          >
                            Save this phase
                          </Button>
                        </Box>
                      </Box>

                      <TableContainer sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                              <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Item</TableCell>
                              <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Unit</TableCell>
                              <TableCell align="right" sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Quantity</TableCell>
                              <TableCell width={48} />
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(selectedFixedPhase.items || []).map((it, itemIndex) => (
                              <TableRow key={itemIndex}>
                                <TableCell sx={{ py: 1 }}>
                                  <Autocomplete
                                    size="small"
                                    freeSolo
                                    options={masterItems}
                                    getOptionLabel={getMasterItemLabel}
                                    value={masterItems.find((m) => m.name === (it.item_name || "")) || (it.item_name ? it.item_name : null)}
                                    onInputChange={(_, v) => updateFixedPhaseItem(selectedPhaseIndexResolved, itemIndex, "item_name", v ?? "")}
                                    onChange={(_, v) => updateFixedPhaseItem(selectedPhaseIndexResolved, itemIndex, "item_name", (typeof v === "string" ? v : v?.name ?? "") ?? "")}
                                    renderInput={(params) => (
                                      <TextField {...params} placeholder="Search by item name or type" />
                                    )}
                                  />
                                </TableCell>
                                <TableCell sx={{ py: 1, minWidth: 100 }}>
                                  <Select
                                    size="small"
                                    fullWidth
                                    displayEmpty
                                    value={it.unit || ""}
                                    onChange={(e) => updateFixedPhaseItem(selectedPhaseIndexResolved, itemIndex, "unit", e.target.value)}
                                    renderValue={(v) => v || "Unit"}
                                  >
                                    <MenuItem value="">Unit</MenuItem>
                                    <MenuItem value="bags">bags</MenuItem>
                                    <MenuItem value="kg">kg</MenuItem>
                                    <MenuItem value="cft">cft</MenuItem>
                                    <MenuItem value="nos">nos</MenuItem>
                                    <MenuItem value="sqft">sqft</MenuItem>
                                    <MenuItem value="ltr">ltr</MenuItem>
                                    <MenuItem value="mtr">mtr</MenuItem>
                                  </Select>
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1 }}>
                                  <TextField
                                    size="small"
                                    type="number"
                                    inputProps={{ min: 0, step: 0.01 }}
                                    sx={{ width: 100 }}
                                    value={it.quantity ?? ""}
                                    onChange={(e) => updateFixedPhaseItem(selectedPhaseIndexResolved, itemIndex, "quantity", e.target.value)}
                                  />
                                </TableCell>
                                <TableCell sx={{ py: 1 }}>
                                  <IconButton size="small" onClick={() => removeFixedPhaseItem(selectedPhaseIndexResolved, itemIndex)}>
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                            {(selectedFixedPhase.items || []).length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} sx={{ py: 2, color: "#94a3b8", fontSize: 13 }}>No items yet. Click Add item.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {(plannedRowsByPhase.get(normalizePhaseKey(selectedFixedPhase.phase_name))?.length ?? 0) > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#0f766e", mb: 0.75 }}>
                            Planned details (read-only)
                          </Typography>
                          <TableContainer sx={{ border: "1px solid #dcfce7", borderRadius: 2, bgcolor: "#f0fdf4" }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Item</TableCell>
                                  <TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Unit</TableCell>
                                  <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>Planned qty</TableCell>
                                  <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>Planned price</TableCell>
                                  <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>Current price</TableCell>
                                  <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>Price delta</TableCell>
                                  <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>Value delta</TableCell>
                                  <TableCell align="center" sx={{ fontSize: 11, fontWeight: 700 }}>Action</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(plannedRowsByPhase.get(normalizePhaseKey(selectedFixedPhase.phase_name)) || []).map((row, idx) => (
                                  <TableRow key={`${row.item_name}-${row.unit}-${idx}`}>
                                    <TableCell sx={{ fontSize: 12 }}>{row.item_name || "—"}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{row.unit || "—"}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 12 }}>{Number(row.forecasted_quantity || 0).toFixed(2)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 12 }}>{Number(row.planned_unit_price || row.item_cost_per_unit || 0).toFixed(2)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 12 }}>{Number(row.current_master_price || 0).toFixed(2)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 12, color: Number(row.unit_price_delta || 0) >= 0 ? "#b45309" : "#166534" }}>
                                      {Number(row.unit_price_delta || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: 12, color: Number(row.value_delta || 0) >= 0 ? "#b45309" : "#166534" }}>
                                      {Number(row.value_delta || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontSize: 12 }}>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => {
                                          loadPlannedRowToEditInputs(selectedPhaseIndexResolved, row);
                                          showDialog?.("Planned row copied to input for editing.", "info");
                                        }}
                                        sx={{ textTransform: "none", minWidth: 64 }}
                                      >
                                        Edit
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </Paper>
                  )}
                </Box>
              </Box>
            </>
          ) : null}
          {fixedPhases.length > 0 && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 1.5, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={downloadFixedPhasesExcel}
                disabled={!fixedPhases.some((p) => (p.items || []).some((i) => i.item_name?.trim() && i.unit?.trim() && Number(i.quantity) > 0))}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}
                startIcon={<DownloadIcon fontSize="small" />}
                title="Export phase items and quantities to Excel"
              >
                Download Excel
              </Button>
              <Button
                variant="contained"
                onClick={saveFixedPlan}
                disabled={fixedSaving || !fixedPhases.some((p) => (p.items || []).some((i) => i.item_name?.trim() && i.unit?.trim() && Number(i.quantity) > 0))}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2, bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}
                title={!fixedPhases.some((p) => (p.items || []).some((i) => i.item_name?.trim() && i.unit?.trim() && Number(i.quantity) > 0)) ? "Add at least one item with quantity in any phase" : ""}
              >
                {fixedSaving ? <CircularProgress size={22} /> : "Save entered phases as Planned"}
              </Button>
            </Box>
          )}
          {fixedPhases.length > 0 && (
            <Typography sx={{ mt: 1, fontSize: 11, color: "#64748b" }}>
              Tip: Phase save is useful during onboarding and staggered planning. Final save publishes all currently filled phases.
            </Typography>
          )}
        </Paper>
      )}

      {/* Template mode content */}
      {mode === "template" && (
        <>
      {/* First-time intro – how it works */}
      {!hasSavedForecasts && !hasSetup && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            mb: { xs: 1.5, sm: 2 },
            borderRadius: 2,
            border: "1px solid #e0f2fe",
            bgcolor: "#f0f9ff",
          }}
        >
          <Typography sx={{ fontSize: { xs: 13, sm: 14 }, fontWeight: 700, color: "#0369a1", mb: 1 }}>How it works</Typography>
          <Box component="ol" sx={{ m: 0, pl: { xs: 2, sm: 2.5 }, fontSize: { xs: 12, sm: 13 }, color: "#475569", lineHeight: 1.8, "& li": { mb: 0.5 } }}>
            <li><strong>Upload schedule</strong> – Excel file with your construction phases (Foundation, Slab, etc.)</li>
            <li><strong>Select template</strong> – Choose an inventory template (or upload one) that defines materials per phase</li>
            <li><strong>Generate Draft</strong> – Preview the forecast. Add materials for any phases missing from the template</li>
            <li><strong>Save as Planned</strong> – Finalize and save the inventory plan for this property</li>
          </Box>
        </Paper>
      )}

      {/* KPI summary cards */}
      {/* draftTotalCost: prices commented for now – was draftResult ? total_estimated_cost + draftExtraItems forecast_cost : null */}
      <InventoryForecastSummaryCards
        schedulePhasesCount={scheduleStatus?.count ?? 0}
        selectedTemplateName={selectedTemplateName}
        draftTotalCost={null}
        plannedItemsCount={forecastStatusCounts?.planned ?? 0}
        missingPhasesCount={draftResult?.phases_missing?.length ?? 0}
        loadingSchedule={loadingScheduleStatus}
        loadingTemplates={loadingTemplates}
      />

      {/* Step wizard and guidance */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          border: "1px solid #e5e7eb",
          bgcolor: "#f8fafc",
          overflow: "hidden",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#475569", mb: 0.5 }}>Your progress</Typography>
            {!hasSavedForecasts ? (
              <Typography variant="body2" sx={{ color: "#0f766e", fontWeight: 500 }}>Next: {nextStepHint}</Typography>
            ) : (
              plannedDoneHint && (
                <Typography variant="body2" sx={{ color: "#92400e", fontWeight: 500 }}>{plannedDoneHint}</Typography>
              )
            )}
          </Box>
          {!hasSavedForecasts && (
            <Stepper
              activeStep={activeStep}
              orientation="horizontal"
              sx={{
                width: "100%",
                "& .MuiStepLabel-label": { fontSize: { xs: 10, sm: 11 }, fontWeight: 600 },
                "& .MuiStepConnector-line": { minWidth: { xs: 12, sm: 24 } },
              }}
            >
              <Step><StepLabel>Setup</StepLabel></Step>
              <Step><StepLabel>Draft</StepLabel></Step>
              <Step><StepLabel>Verify</StepLabel></Step>
              <Step><StepLabel>Plan</StepLabel></Step>
            </Stepper>
          )}
        </Box>
      </Paper>

      {/* Forecast status – only when there are saved forecasts */}
      {hasSavedForecasts && (
        <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2, border: "1px solid #e5e7eb", bgcolor: "#f8fafc" }}>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            {loadingResults ? <CircularProgress size={20} /> : (
              <>
                {forecastStatusCounts.draft > 0 && <Chip size="small" label={`Draft: ${forecastStatusCounts.draft}`} sx={{ height: 26, fontWeight: 600, borderRadius: 1.5 }} variant="outlined" />}
                {forecastStatusCounts.planned > 0 && <Chip size="small" label={`Planned: ${forecastStatusCounts.planned}`} color="success" sx={{ height: 26, fontWeight: 600, borderRadius: 1.5 }} variant="outlined" />}
                {forecastStatusCounts.forecast > 0 && <Chip size="small" label={`Forecast: ${forecastStatusCounts.forecast}`} sx={{ height: 26, fontWeight: 600, borderRadius: 1.5 }} variant="outlined" />}
                {forecastStatusCounts.archived > 0 && <Chip size="small" label={`Archived: ${forecastStatusCounts.archived}`} sx={{ height: 26, fontWeight: 600, borderRadius: 1.5 }} variant="outlined" />}
              </>
            )}
          </Box>
          {forecastStatusCounts.planned > 0 && (
            <Typography sx={{ fontSize: 12, color: "#92400e", mt: 1, fontWeight: 500 }}>To replan or create a new draft, delete planned first (use Delete planned below), then Generate Draft and Save as Planned.</Typography>
          )}
        </Paper>
      )}

      {/* Section 1: Setup – collapsible when user already has saved forecasts */}
      {hasSavedForecasts ? (
        <Accordion defaultExpanded={false} disableGutters elevation={0} sx={{ mb: 2, borderRadius: 2, border: "1px solid #e5e7eb", "&:before": { display: "none" }, overflow: "hidden" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, bgcolor: "#f8fafc", "& .MuiAccordionSummary-content": { my: 1 } }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Schedule & template</Typography>
            {scheduleStatus?.hasSchedule && selectedTemplateId && (
              <Typography sx={{ fontSize: 12, color: "#64748b", ml: 1 }}>({scheduleStatus.count} phases · template selected)</Typography>
            )}
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, bgcolor: "#fff" }}>
      <Box sx={{ p: 2, pt: 0 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#64748b", mb: 1.5 }}>To replan: delete planned in Saved forecasts below, then Generate Draft and Save as Planned.</Typography>
        {propertyAreas && (propertyAreas.construction_area_sqft > 0 || propertyAreas.total_slab_area_sqft > 0 || propertyAreas.total_brick_work_area_sqft > 0 || propertyAreas.total_plastering_area_sqft > 0) && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#64748b", mr: 0.5 }}>Areas:</Typography>
            {propertyAreas.construction_area_sqft > 0 && <Chip size="small" label={`Const ${Number(propertyAreas.construction_area_sqft).toLocaleString()}`} sx={{ height: 22, fontSize: 10, borderRadius: 1 }} />}
            {propertyAreas.total_slab_area_sqft > 0 && <Chip size="small" label={`Slab ${Number(propertyAreas.total_slab_area_sqft).toLocaleString()}`} sx={{ height: 22, fontSize: 10, borderRadius: 1 }} />}
            {propertyAreas.total_brick_work_area_sqft > 0 && <Chip size="small" label={`Brick ${Number(propertyAreas.total_brick_work_area_sqft).toLocaleString()}`} sx={{ height: 22, fontSize: 10, borderRadius: 1 }} />}
            {propertyAreas.total_plastering_area_sqft > 0 && <Chip size="small" label={`Plaster ${Number(propertyAreas.total_plastering_area_sqft).toLocaleString()}`} sx={{ height: 22, fontSize: 10, borderRadius: 1 }} />}
          </Box>
        )}
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {loadingScheduleStatus ? (
              <CircularProgress size={22} />
            ) : scheduleStatus?.hasSchedule ? (
              <Chip label={`${scheduleStatus.count} phases`} color="success" size="small" sx={{ height: 32, fontWeight: 600, borderRadius: 2 }} variant="outlined" />
            ) : (
              <Chip label="No schedule" size="small" sx={{ height: 32, fontWeight: 600, borderRadius: 2 }} variant="outlined" />
            )}
            {!scheduleStatus?.hasSchedule && false && (
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setScheduleUploadOpen(true)} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                Upload schedule
              </Button>
            )}
          </Box>
          <Divider orientation="vertical" flexItem sx={{ borderColor: "#e5e7eb" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Paper elevation={0} sx={{ px: 2, py: 1, borderRadius: 2, bgcolor: "#fafafa", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                {selectedTemplateName ? `Template: ${selectedTemplateName}` : "No template selected"}
              </Typography>
              {selectedTemplateId && (
                <IconButton size="small" onClick={() => { setTemplateViewId(selectedTemplateId); setTemplateViewOpen(true); }} sx={{ color: "#64748b" }} title="View template"><VisibilityIcon fontSize="small" /></IconButton>
              )}
            </Paper>
            <Button size="small" variant="outlined" onClick={() => setTemplateSelectionView(true)} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              {selectedTemplateId ? "Change template" : "Select template"}
            </Button>
            {selectedTemplateId && (
              <Button size="small" variant="outlined" color="error" onClick={() => { if (window.confirm(`Delete template "${selectedTemplateName}"? This cannot be undone.`)) deleteTemplate(selectedTemplateId); }} disabled={deletingTemplate} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }} startIcon={deletingTemplate ? <CircularProgress size={18} /> : <DeleteOutlineIcon fontSize="small" />}>Delete template</Button>
            )}
          </Box>
          <Button size="small" variant="outlined" onClick={downloadSampleExcel} startIcon={<DownloadIcon />} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Sample</Button>
          <Button size="small" variant="outlined" onClick={() => setTemplateUploadOpen(true)} startIcon={<AddIcon />} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Upload template</Button>
          <Button size="small" variant="outlined" onClick={() => openAddMaterials(null)} disabled={!selectedTemplateId} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }} title="Add materials for a phase">+ Phase materials</Button>
        </Box>
        {loadingTemplates && <Box sx={{ mt: 2 }}><CircularProgress size={20} /></Box>}
        <Divider sx={{ my: 2, borderColor: "#e5e7eb" }} />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
          <Button variant="outlined" size="medium" onClick={runDraftAllPhases} disabled={loadingDraft || !scheduleStatus?.hasSchedule || !selectedTemplateId || !templates.length} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}>
            {loadingDraft ? <CircularProgress size={22} /> : "Generate Draft"}
          </Button>
          <Button variant="contained" size="medium" onClick={runPlanAllPhases} disabled={loadingPlan || !scheduleStatus?.hasSchedule || !selectedTemplateId || !templates.length || (forecastStatusCounts?.planned ?? 0) > 0 || (draftResult?.phases_missing?.length ?? 0) > 0} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2, bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }} title={(forecastStatusCounts?.planned ?? 0) > 0 ? "Delete planned first to save a new plan" : (draftResult?.phases_missing?.length ?? 0) > 0 ? "Add materials for missing phases first" : ""}>
            {loadingPlan ? <CircularProgress size={22} /> : "Save as Planned"}
          </Button>
        </Box>
      </Box>
          </AccordionDetails>
        </Accordion>
      ) : (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          mb: { xs: 1.5, sm: 2.5 },
          borderRadius: 2,
          border: "1px solid #e5e7eb",
          bgcolor: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <Typography sx={{ fontSize: { xs: 14, sm: 15 }, fontWeight: 700, color: "#111827", mb: 1 }}>Step 1: Schedule & template</Typography>
        <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: "#64748b", mb: 1.5 }}>Add your construction phases and choose a materials template.</Typography>
        {loadingPropertyAreas ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <CircularProgress size={18} />
            <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>Loading property areas…</Typography>
          </Box>
        ) : propertyAreas ? (
          <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#475569", mb: 1 }}>Property areas (sq ft)</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {propertyAreas.construction_area_sqft > 0 && (
                <Chip size="small" label={`Construction: ${Number(propertyAreas.construction_area_sqft).toLocaleString()}`} sx={{ fontWeight: 600, fontSize: 11, borderRadius: 1.5 }} />
              )}
              {propertyAreas.total_slab_area_sqft > 0 && (
                <Chip size="small" label={`Slab: ${Number(propertyAreas.total_slab_area_sqft).toLocaleString()}`} sx={{ fontWeight: 600, fontSize: 11, borderRadius: 1.5 }} />
              )}
              {propertyAreas.total_brick_work_area_sqft > 0 && (
                <Chip size="small" label={`Brick work: ${Number(propertyAreas.total_brick_work_area_sqft).toLocaleString()}`} sx={{ fontWeight: 600, fontSize: 11, borderRadius: 1.5 }} />
              )}
              {propertyAreas.total_plastering_area_sqft > 0 && (
                <Chip size="small" label={`Plastering: ${Number(propertyAreas.total_plastering_area_sqft).toLocaleString()}`} sx={{ fontWeight: 600, fontSize: 11, borderRadius: 1.5 }} />
              )}
              {!(propertyAreas.construction_area_sqft > 0 || propertyAreas.total_slab_area_sqft > 0 || propertyAreas.total_brick_work_area_sqft > 0 || propertyAreas.total_plastering_area_sqft > 0) && (
                <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>No areas set — add property details or floors.</Typography>
              )}
            </Box>
          </Paper>
        ) : null}
        <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, flexWrap: "wrap", gap: { xs: 1, sm: 2 } }}>
            {loadingScheduleStatus ? (
              <CircularProgress size={22} />
            ) : scheduleStatus?.hasSchedule ? (
              <Chip label={`${scheduleStatus.count} phases`} color="success" size="small" sx={{ height: 32, fontWeight: 600, borderRadius: 2 }} />
            ) : (
              <Chip label="No schedule" size="small" sx={{ height: 32, fontWeight: 600, borderRadius: 2 }} variant="outlined" color="warning" />
            )}
            {!scheduleStatus?.hasSchedule && (
              <>
            <Tooltip title="Upload Excel with phase names and dates. Download Sample to see format.">
              <Button
                variant="contained"
                size="medium"
                startIcon={<AddIcon />}
                onClick={() => setScheduleUploadOpen(true)}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 2,
                  bgcolor: "#0f766e",
                  "&:hover": { bgcolor: "#0d5c4a" },
                }}
              >
                1. Upload schedule
              </Button>
            </Tooltip>
              <Typography component="span" sx={{ fontSize: 12, color: "#94a3b8" }}>or <Button size="small" sx={{ textTransform: "none", fontSize: 12, p: 0, minWidth: 0 }} onClick={downloadSampleExcel}>download sample</Button></Typography>
              </>
            )}
          </Box>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, flexWrap: "wrap", gap: { xs: 1, sm: 2 } }}>
            <Paper elevation={0} sx={{ px: 2, py: 1, borderRadius: 2, bgcolor: "#fafafa", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: selectedTemplateId ? "#111827" : "#94a3b8" }}>
                {selectedTemplateName ? selectedTemplateName : "No template"}
              </Typography>
              {selectedTemplateId && (
                <IconButton size="small" onClick={() => { setTemplateViewId(selectedTemplateId); setTemplateViewOpen(true); }} sx={{ color: "#64748b" }} title="View template"><VisibilityIcon fontSize="small" /></IconButton>
              )}
            </Paper>
            <Tooltip title="Choose an existing template or upload your own (Excel).">
              <Button
                variant={!selectedTemplateId && scheduleStatus?.hasSchedule ? "contained" : "outlined"}
                size="medium"
                onClick={() => setTemplateSelectionView(true)}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 2,
                  ...(!selectedTemplateId && scheduleStatus?.hasSchedule && { bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5c4a" } }),
                }}
              >
                {selectedTemplateId ? "Change template" : "2. Select template"}
              </Button>
            </Tooltip>
            <Button size="small" variant="text" onClick={() => setTemplateUploadOpen(true)} sx={{ textTransform: "none", fontSize: 13, color: "#64748b" }}>Upload new</Button>
            {selectedTemplateId && (
              <Button size="small" variant="text" color="error" onClick={() => { if (window.confirm(`Delete template "${selectedTemplateName}"?`)) deleteTemplate(selectedTemplateId); }} disabled={deletingTemplate} sx={{ textTransform: "none", fontSize: 13 }}>Delete template</Button>
            )}
            <Tooltip title="Add materials for a phase not in the template">
              <span><Button size="small" variant="text" onClick={() => openAddMaterials(null)} disabled={!selectedTemplateId} sx={{ textTransform: "none", fontSize: 13, color: "#64748b" }}>+ Phase materials</Button></span>
            </Tooltip>
          </Box>
        </Box>
        {loadingTemplates && <Box sx={{ mt: 2 }}><CircularProgress size={20} /></Box>}
        <Divider sx={{ my: 2, borderColor: "#e5e7eb" }} />
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
          <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: "#64748b" }}>
            {hasSetup ? "Ready to preview" : "Complete Step 1 first"}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Tooltip title="Compare schedule with template and preview inventory forecast">
              <span>
                <Button variant="outlined" size="medium" onClick={runDraftAllPhases} disabled={loadingDraft || !hasSetup} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}>
                  {loadingDraft ? <CircularProgress size={22} /> : "3. Generate Draft"}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={(forecastStatusCounts?.planned ?? 0) > 0 ? "Delete planned first to create a new plan" : (draftResult?.phases_missing?.length ?? 0) > 0 ? "Add materials for missing phases first" : draftResult ? "Save this forecast as the final plan" : "Generate draft first"}>
              <span>
                <Button
                  variant="contained"
                  size="medium"
                  onClick={runPlanAllPhases}
                  disabled={loadingPlan || !hasSetup || (forecastStatusCounts?.planned ?? 0) > 0 || (draftResult?.phases_missing?.length ?? 0) > 0}
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2, bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}
                >
                  {loadingPlan ? <CircularProgress size={22} /> : "4. Save as Planned"}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Paper>
      )}

      </>
      )}

      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {/* Section 2: Draft + Inventory plan – Template mode only, when no forecast or when draft exists */}
        {mode === "template" && ((forecastResults?.forecasts?.length ?? 0) === 0 || draftResult) && (
          <Grid item xs={12}>
            {!draftResult && (forecastResults?.forecasts?.length ?? 0) === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 2,
                  border: "1px dashed #e5e7eb",
                  bgcolor: "#f8fafc",
                  textAlign: "center",
                }}
              >
                <Typography sx={{ fontSize: { xs: 14, sm: 15 }, fontWeight: 600, color: "#475569", mb: 1 }}>Step 2: Preview your forecast</Typography>
                <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: "#64748b", mb: 2 }}>
                  {hasSetup
                    ? "Click \u201CGenerate Draft\u201D above to see your inventory forecast by phase. You can add extra items or fix missing phases, then Save as Planned."
                    : "Complete Step 1 above (upload schedule and select a template), then click Generate Draft."}
                </Typography>
                {hasSetup && (
                  <Button variant="contained" onClick={runDraftAllPhases} disabled={loadingDraft} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 3, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5c4a" } }}>
                    {loadingDraft ? <CircularProgress size={20} /> : "Generate Draft now"}
                  </Button>
                )}
              </Paper>
            ) : (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2.5 },
                borderRadius: 2,
                border: "1px solid #e5e7eb",
                bgcolor: "#fff",
                mb: 2,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                overflow: "hidden",
              }}
            >
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#111827", mb: 1.5 }}>2. Draft & inventory plan</Typography>
              {/* Hint: draft is built from schedule, not template. If only one phase shows, schedule likely has only that phase. */}
              {draftResult?.phases_draft && draftResult.phases_draft.length > 0 && draftResult.phases_draft.length <= 2 && (
                <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Only {draftResult.phases_draft.length} phase(s) in draft?</Typography>
                  <Typography sx={{ fontSize: 12, mt: 0.5 }}>The draft is built from your <strong>property schedule</strong>, not the template. The template defines items per phase; the schedule defines which phases exist. If you expect more phases (e.g. Foundation, Structure, Hand over), your schedule may have only one phase — update the schedule in Workflow or re-upload an Excel with all phase names so they match the template, then Generate Draft again.</Typography>
                </Alert>
              )}
              {/* Inventory plan – missing phase names (in schedule but not in template) */}
              {draftResult?.phases_missing && draftResult.phases_missing.length > 0 && (
                <Alert
                  severity="warning"
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    "& .MuiAlert-message": { width: "100%" },
                  }}
                  action={
                    <Button size="small" variant="outlined" onClick={openMissingPhasesDialog} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, borderColor: "#d97706", color: "#b45309" }}>
                      Add materials
                    </Button>
                  }
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Missing phases (not in template)</Typography>
                  <Typography sx={{ fontSize: 12, color: "#64748b", mb: 1 }}>These phases are in your schedule but not in the template. Add materials for each to include them in the plan.</Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1, alignItems: "center" }}>
                    {draftResult.phases_missing.map((p, i) => (
                      <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Chip label={p.phase_name ?? `Phase ${i + 1}`} size="small" sx={{ fontWeight: 600, borderRadius: 1.5 }} />
                        {p.phase_status && phaseStatusChip(p.phase_status)}
                      </Box>
                    ))}
                  </Box>
                </Alert>
              )}
              {(!draftResult?.phases_draft || draftResult.phases_draft.length === 0) && (!draftResult?.phases_missing || draftResult.phases_missing.length === 0) && (
                <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>No phases in draft</Typography>
                  <Typography sx={{ fontSize: 12, mt: 0.5 }}>The draft ran successfully but returned no phases. Ensure the property has a schedule uploaded and (if required) floors/areas set in Edit Property, then click Generate Draft again.</Typography>
                </Alert>
              )}
              {draftResult?.phases_draft && draftResult.phases_draft.length > 0 && (
                <>
                  {/* Hint when phases exist but no items / zero total (items not counted) */}
                  {(() => {
                    const totalCost = Number(draftResult.total_estimated_cost) || 0;
                    const extraCost = (draftExtraItems || []).reduce((s, e) => s + (Number(e.forecast_cost) || 0), 0);
                    const total = totalCost + extraCost;
                    const phasesWithItems = (draftResult.phases_draft || []).filter((p) => (p.forecast_items ?? []).length > 0).length;
                    const allPhasesEmpty = phasesWithItems === 0 && draftExtraItems.length === 0;
                    if (total === 0 && allPhasesEmpty) {
                      return (
                        <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Items not populated (Total ₹0)</Typography>
                          <Typography sx={{ fontSize: 12, mt: 0.5 }}>
                            Phases are showing but no quantities or costs. Usually because: (1) <strong>Phase names</strong> in your schedule must match the template <em>exactly</em> (e.g. &quot;Foundation Work&quot; in both). (2) Property must have <strong>floors/areas</strong> set (Edit Property → add floors with slab/brick/plaster areas) so the backend can calculate quantities from area × rate. (3) Template must have materials added for each phase. Check the template and property details, then Generate Draft again.
                          </Typography>
                        </Alert>
                      );
                    }
                    return null;
                  })()}
                  <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 2 }}>
                    <Chip size="small" label={`${draftResult.phases_draft.length} phase(s)`} sx={{ fontWeight: 600, borderRadius: 1.5 }} />
                    {/* Total ₹ – prices commented for now */}
                    {/* <Typography sx={{ fontSize: 14, color: "#64748b" }}>Total ₹{(() => { const base = Number(draftResult.total_estimated_cost) || 0; const extra = (draftExtraItems || []).reduce((s, e) => s + (Number(e.forecast_cost) || 0), 0); return (base + extra).toLocaleString(); })()}</Typography> */}
                  </Box>
                  {draftResult.phases_draft.map((phase, idx) => {
                const phaseExtra = (draftExtraItems || []).filter((e) => e.phase_name === (phase.phase_name ?? ""));
                const templateItems = (phase.forecast_items ?? []).map((item, i) => ({ ...item, _source: "template", _key: `t-${idx}-${i}` }));
                const extraRows = phaseExtra.map((e) => ({ item: e.item_name, forecasted_quantity: e.forecasted_quantity, required_order: e.required_order, forecast_cost: e.forecast_cost, _source: "extra", _clientId: e._clientId }));
                const allRows = [...templateItems, ...extraRows];
                const phaseTotalWithExtra = (phase.total_forecast_cost ?? phase.phase_estimated_cost ?? 0) + phaseExtra.reduce((s, e) => s + (e.forecast_cost ?? 0), 0);
                return (
                  <Accordion key={`draft-phase-${idx}-${phase.phase_name ?? ""}`} disableGutters elevation={0} sx={{ "&:before": { display: "none" }, border: "1px solid #e5e7eb", borderRadius: 2, mb: 1, "&:last-of-type": { mb: 0 }, overflow: "hidden" }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, bgcolor: "#f8fafc", "& .MuiAccordionSummary-content": { my: 1, alignItems: "center", minWidth: 0 } }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 }, width: "100%", pr: 1, flexWrap: "wrap", minWidth: 0 }}>
                        <Typography sx={{ fontSize: { xs: 13, sm: 14 }, fontWeight: 600, color: "#111827", flexShrink: 0 }}>{phase.phase_name ?? "Phase"}</Typography>
                        {phase.phase_status && phaseStatusChip(phase.phase_status)}
                        {(phase.phase_start_date || phase.phase_end_date) && (
                          <Typography sx={{ fontSize: 11, color: "#64748b", display: { xs: "none", sm: "inline" } }}>({phase.phase_start_date ?? "—"} to {phase.phase_end_date ?? "—"})</Typography>
                        )}
                        {/* Phase total ₹ – prices commented for now */}
                        {/* <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: "#64748b", flexShrink: 0 }}>₹{Number(phaseTotalWithExtra).toLocaleString()}</Typography> */}
                        {phaseExtra.length > 0 && <Chip size="small" label={`+${phaseExtra.length} extra`} sx={{ height: 20, fontSize: 10, fontWeight: 600, borderRadius: 1.5 }} />}
                        <Button size="small" variant="outlined" sx={{ ml: "auto", textTransform: "none", fontSize: { xs: 11, sm: 12 }, fontWeight: 600, borderRadius: 1.5, flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); openAddDraftItem({ phase_name: phase.phase_name, phase_start_date: phase.phase_start_date, phase_end_date: phase.phase_end_date }); }}>+ Item</Button>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, px: { xs: 1, sm: 2 }, pb: 2, bgcolor: "#fff", overflowX: "auto" }}>
                      <TableContainer sx={{ overflowX: "auto", minWidth: 280 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                            <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Item</TableCell>
                            <TableCell align="right" sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Qty</TableCell>
                            <TableCell align="right" sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Order</TableCell>
                            {/* Cost – prices commented for now */}
                            {/* <TableCell align="right" sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Cost</TableCell> */}
                            <TableCell width={48} sx={{ py: 1 }} />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {allRows.map((item, i) => (
                            <TableRow key={item.info_id != null ? `item-${item.info_id}` : item._key ?? item._clientId ?? `row-${idx}-${i}`} sx={{ "&:hover": { bgcolor: "#fafafa" }, ...(item._source === "extra" ? { bgcolor: "#fefce8" } : {}) }}>
                              <TableCell sx={{ py: 1, fontSize: 14 }}>{item.item ?? item.item_name ?? item.template_name ?? "—"}{item._source === "extra" && " · extra"}</TableCell>
                              <TableCell align="right" sx={{ py: 1, fontSize: 14 }}>{item.forecasted_quantity != null ? Number(item.forecasted_quantity).toFixed(2) : "—"}</TableCell>
                              <TableCell align="right" sx={{ py: 1, fontSize: 14 }}>{item.required_order != null ? Number(item.required_order).toFixed(2) : "—"}</TableCell>
                              {/* <TableCell align="right" sx={{ py: 1, fontSize: 14 }}>{item.forecast_cost != null ? `₹${Number(item.forecast_cost).toLocaleString()}` : "—"}</TableCell> */}
                              <TableCell sx={{ py: 1 }}>{item._source === "extra" && <IconButton size="small" onClick={() => removeDraftExtraItem(item._clientId)} sx={{ p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
                </>
              )}
            </Paper>
            )}
          </Grid>
        )}

        {/* Section 3: Saved forecasts – shared by both Template and Fixed modes */}
        <Grid item xs={12}>
          {hasSavedForecasts ? (
          <Paper ref={savedForecastsAnchorRef} elevation={0} sx={{ p: 2.5, borderRadius: 2, border: "1px solid #e5e7eb", bgcolor: "#fff" }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#111827", mb: 2 }}>{mode === "fixed" ? "Saved plan (read-only)" : "3. Saved forecasts"}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select value={forecastStatusFilter} onChange={(e) => { const v = e.target.value; testLog(COMPONENT, "forecastStatusFilterChange", { filter: v }); setForecastStatusFilter(v); }} label="Status" variant="outlined" sx={{ borderRadius: 2, bgcolor: "#fafafa" }}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="planned">Planned</MenuItem>
                  <MenuItem value="forecast">Forecast</MenuItem>
                </Select>
              </FormControl>
              <Button size="small" variant="outlined" onClick={fetchForecastResults} disabled={loadingResults} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>{loadingResults ? <CircularProgress size={20} /> : "Refresh"}</Button>
              <Button size="small" variant="contained" onClick={downloadForecastsExcel} disabled={loadingResults || !forecastResults?.forecasts?.length} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5c4a" } }} startIcon={<DownloadIcon fontSize="small" />}>Export / Save</Button>
              <Button size="small" variant="outlined" color="error" onClick={deletePlanned} disabled={deletingPlanned || loadingResults} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }} startIcon={deletingPlanned ? <CircularProgress size={18} /> : <DeleteOutlineIcon fontSize="small" />}>Delete planned</Button>
              {/* Total ₹ – prices commented for now */}
              {false && forecastResults?.total_forecast_cost != null && forecastResults.forecasts?.length > 0 && (
                <Typography sx={{ ml: "auto", fontSize: 14, fontWeight: 600, color: "#111827" }}>Total ₹{Number(forecastResults.total_forecast_cost).toLocaleString()}</Typography>
              )}
            </Box>
            {loadingResults ? (
              <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}><CircularProgress size={28} /></Box>
            ) : forecastResults?.forecasts?.length > 0 ? (
              <>
              <Accordion disableGutters elevation={0} expanded={summaryExpanded} onChange={() => setSummaryExpanded((p) => !p)} sx={{ mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, "&:before": { display: "none" }, overflow: "hidden" }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, bgcolor: "#f8fafc", "& .MuiAccordionSummary-content": { my: 1 } }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Summary by items (Total villa) – click to expand</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                  <TableContainer sx={{ border: "1px solid #e5e7eb", borderRadius: 2, overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                          <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Item</TableCell>
                          <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Unit</TableCell>
                          <TableCell align="right" sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Total qty</TableCell>
                          <TableCell align="right" sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Total order</TableCell>
                          {/* Total cost – prices commented for now */}
                          {/* <TableCell align="right" sx={{ py: 1, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Total cost</TableCell> */}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {itemSummary.map((r, i) => (
                          <TableRow key={i} sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                            <TableCell sx={{ py: 1, fontSize: 14 }}>{r.item_name}</TableCell>
                            <TableCell sx={{ py: 1, fontSize: 14 }}>{r.unit}</TableCell>
                            <TableCell align="right" sx={{ py: 1, fontSize: 14 }}>{Number(r.quantity).toFixed(2)}</TableCell>
                            <TableCell align="right" sx={{ py: 1, fontSize: 14 }}>{Number(r.required_order).toFixed(2)}</TableCell>
                            {/* <TableCell align="right" sx={{ py: 1, fontSize: 14 }}>₹{Number(r.forecast_cost).toLocaleString()}</TableCell> */}
                          </TableRow>
                        ))}
                        {itemSummary.length > 0 && (
                          <TableRow sx={{ bgcolor: "#f0fdf4", borderTop: "2px solid #22c55e" }}>
                            <TableCell colSpan={3} sx={{ py: 1.5, fontSize: 14, fontWeight: 700, color: "#111827" }}>Total villa</TableCell>
                            <TableCell align="right" sx={{ py: 1.5, fontSize: 14, fontWeight: 700, color: "#111827" }}>—</TableCell>
                            {/* <TableCell align="right" sx={{ py: 1.5, fontSize: 14, fontWeight: 700, color: "#111827" }}>₹{Number(totalVillaCost).toLocaleString()}</TableCell> */}
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
              <TableContainer sx={{ maxHeight: 320, border: "1px solid #e5e7eb", borderRadius: 2, overflow: "auto", overflowX: "auto" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                      <TableCell sx={{ py: 1.25, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Phase</TableCell>
                      <TableCell sx={{ py: 1.25, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Item</TableCell>
                      <TableCell align="right" sx={{ py: 1.25, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Qty</TableCell>
                      <TableCell align="right" sx={{ py: 1.25, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Order</TableCell>
                      {/* Cost – prices commented for now */}
                      {/* <TableCell align="right" sx={{ py: 1.25, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Cost</TableCell> */}
                      <TableCell sx={{ py: 1.25, fontSize: 12, fontWeight: 600, color: "#64748b" }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {forecastResults.forecasts.map((f, i) => (
                      <TableRow key={f.forecast_id ?? i} sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                        <TableCell sx={{ py: 1.25, fontSize: 14 }}>{f.phase_name ?? "—"}</TableCell>
                        <TableCell sx={{ py: 1.25, fontSize: 14 }}>{f.item_name ?? "—"}</TableCell>
                        <TableCell align="right" sx={{ py: 1.25, fontSize: 14 }}>{f.forecasted_quantity != null ? Number(f.forecasted_quantity).toFixed(2) : "—"}</TableCell>
                        <TableCell align="right" sx={{ py: 1.25, fontSize: 14 }}>{f.required_order != null ? Number(f.required_order).toFixed(2) : "—"}</TableCell>
                        {/* <TableCell align="right" sx={{ py: 1.25, fontSize: 14 }}>{f.forecast_cost != null ? `₹${Number(f.forecast_cost).toLocaleString()}` : "—"}</TableCell> */}
                        <TableCell sx={{ py: 1.25, fontSize: 14 }}>{f.forecast_status ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              </>
            ) : (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography sx={{ fontSize: 14, color: "#64748b" }}>No rows for this status filter.</Typography>
                <Typography sx={{ fontSize: 13, color: "#94a3b8", mt: 0.5 }}>
                  {mode === "fixed" ? "Try Status: Planned, or save materials above with Save as Planned." : "Generate draft and Save as Planned to see results here."}
                </Typography>
              </Box>
            )}
          </Paper>
          ) : (
            <Typography sx={{ fontSize: 13, color: "#64748b", py: 1 }}>
              {mode === "fixed"
                ? "No saved plan yet. Enter materials by phase above, then Save as Planned."
                : "No saved forecasts. Generate draft and Save as Planned above to see results here."}
            </Typography>
          )}
        </Grid>
      </Grid>
        </>
      )}

      {/* Dialogs – always rendered */}
      {/* Draft plan popup – shown when user selects a template */}
      <Dialog open={draftPlanDialogOpen} onClose={() => setDraftPlanDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontSize: 18, fontWeight: 600, color: "#111827", pb: 0 }}>Good! Template selected</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography sx={{ fontSize: 14, color: "#475569", mb: 1.5 }}>
            Next step: click <strong>Generate Draft</strong> to preview your inventory forecast. The system will match your schedule phases with the template.
          </Typography>
          <Typography sx={{ fontSize: 13, color: "#64748b", mb: 1.5 }}>
            If any phase is missing materials, you\u2019ll be prompted to add them. After reviewing, click <strong>Save as Planned</strong> to finalize.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setDraftPlanDialogOpen(false)} variant="contained" sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2.5, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5c4a" } }}>Got it</Button>
        </DialogActions>
      </Dialog>

      {/* Schedule upload dialog (disabled – schedule is now managed from Workflow view) */}
      {false && (
        <Dialog open={scheduleUploadOpen} onClose={() => !uploadingSchedule && setScheduleUploadOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
          <DialogTitle sx={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>Upload schedule</DialogTitle>
          <DialogContent dividers sx={{ pt: 2 }}>
            <Typography sx={{ fontSize: 14, color: "#64748b", mb: 2 }}>Select an Excel or CSV file with schedule phases.</Typography>
            <input accept=".xlsx,.xls,.csv" type="file" style={{ display: "none" }} id="phase-schedule-file" onChange={handleScheduleFileChange} />
            <label htmlFor="phase-schedule-file">
              <Button variant="outlined" component="span" sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Choose file</Button>
            </label>
            {scheduleFile && (
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, border: "1px solid #e5e7eb", px: 2, py: 1, borderRadius: 2, ml: 1.5, bgcolor: "#f8fafc" }}>
                <Typography sx={{ fontSize: 14 }}>{scheduleFile.name}</Typography>
                <IconButton size="small" onClick={() => setScheduleFile(null)}><CloseIcon fontSize="small" /></IconButton>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 2.5, py: 2 }}>
            <Button onClick={() => setScheduleUploadOpen(false)} disabled={uploadingSchedule} sx={{ textTransform: "none", fontWeight: 600 }}>Cancel</Button>
            <Button variant="contained" onClick={uploadSchedule} disabled={!scheduleFile || uploadingSchedule} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}>
              {uploadingSchedule ? <CircularProgress size={22} /> : "Upload"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Template upload dialog */}
      <Dialog open={templateUploadOpen} onClose={() => !uploadingTemplate && setTemplateUploadOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>Upload phase inventory template</DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: 14, color: "#64748b", mb: 2 }}>Select an Excel or CSV file with template phases and materials.</Typography>
          <input accept=".xlsx,.xls,.csv" type="file" style={{ display: "none" }} id="phase-template-file" onChange={handleTemplateFileChange} />
          <label htmlFor="phase-template-file">
            <Button variant="outlined" component="span" sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Choose file</Button>
          </label>
          {templateFile && (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, border: "1px solid #e5e7eb", px: 2, py: 1, borderRadius: 2, ml: 1.5, bgcolor: "#f8fafc" }}>
              <Typography sx={{ fontSize: 14 }}>{templateFile.name}</Typography>
              <IconButton size="small" onClick={() => setTemplateFile(null)}><CloseIcon fontSize="small" /></IconButton>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button onClick={() => setTemplateUploadOpen(false)} disabled={uploadingTemplate} sx={{ textTransform: "none", fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={uploadTemplate} disabled={!templateFile || uploadingTemplate} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}>
            {uploadingTemplate ? <CircularProgress size={22} /> : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template view dialog – show template phases and items */}
      <Dialog open={templateViewOpen} onClose={() => setTemplateViewOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: "85vh", borderRadius: 2 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 18, fontWeight: 600, color: "#111827" }}>
          <span>Template details</span>
          <IconButton onClick={() => setTemplateViewOpen(false)} size="small" sx={{ color: "#64748b" }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {templateViewId && (() => {
            const rows = templatesAllRows.filter((r) => String(r.template_id ?? r.id) === templateViewId);
            const meta = rows[0];
            const templateName = meta?.template_name ?? meta?.name ?? `Template ${templateViewId}`;
            const byPhase = {};
            rows.forEach((r) => {
              const p = r.phase_name ?? "Other";
              if (!byPhase[p]) byPhase[p] = [];
              byPhase[p].push(r);
            });
            const phases = Object.keys(byPhase).sort();
            return (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{templateName}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>ID: {templateViewId} · {rows.length} row(s) · {phases.length} phase(s)</Typography>
                {phases.map((phaseName) => (
                  <Box key={phaseName} sx={{ mb: 2 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>{phaseName}</Typography>
                    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 1 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                            <TableCell>Item</TableCell>
                            <TableCell>Unit</TableCell>
                            <TableCell>Area type</TableCell>
                            <TableCell align="right">Rate / sqft</TableCell>
                            <TableCell align="right">Wastage %</TableCell>
                            <TableCell>Floor</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {byPhase[phaseName].map((r, i) => (
                            <TableRow key={i}>
                              <TableCell>{r.item_name ?? "—"}</TableCell>
                              <TableCell>{r.unit ?? "—"}</TableCell>
                              <TableCell>{r.area_type ?? "—"}</TableCell>
                              <TableCell align="right">{r.consumption_rate_per_sqft != null ? Number(r.consumption_rate_per_sqft) : "—"}</TableCell>
                              <TableCell align="right">{r.wastage_percentage != null ? `${Number(r.wastage_percentage)}%` : "—"}</TableCell>
                              <TableCell>{r.floor_name ?? "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add item not in template (draft) – enhanced UI */}
      <Dialog open={addDraftItemOpen} onClose={closeAddDraftItem} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: "90vh", borderRadius: 2 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: { xs: 16, sm: 18 }, fontWeight: 600, color: "#111827", pb: 1, pr: { xs: 1, sm: 2 } }}>
          <span>Add item not in template</span>
          <IconButton onClick={closeAddDraftItem} size="small" sx={{ color: "#64748b" }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2, pb: 1 }}>
          {addDraftItemPhase && (
            <>
              {/* Phase banner */}
              <Paper elevation={0} sx={{ p: 1.5, mb: 2, bgcolor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2 }}>
                <Typography sx={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>
                  Phase: {addDraftItemPhase.phase_name}
                  {addDraftItemPhase.phase_start_date || addDraftItemPhase.phase_end_date ? ` · ${addDraftItemPhase.phase_start_date ?? "—"} → ${addDraftItemPhase.phase_end_date ?? "—"}` : ""}
                </Typography>
              </Paper>

              {/* 1. Item selection */}
              <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, bgcolor: "#fafafa" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <CategoryOutlinedIcon sx={{ fontSize: 20, color: "#64748b" }} />
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Item selection</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Item type</InputLabel>
                      <Select
                        value={addDraftItemForm.item_type_filter ?? ""}
                        label="Item type"
                        onChange={(e) => setAddDraftItemForm((prev) => ({ ...prev, item_type_filter: e.target.value, item_key: "" }))}
                      >
                        <MenuItem value="">All types</MenuItem>
                        {uniqueItemTypes.filter((t) => t).map((t) => (
                          <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      size="small"
                      fullWidth
                      options={masterItems.filter((m) => !addDraftItemForm.item_type_filter || (m.item_type ?? "") === addDraftItemForm.item_type_filter)}
                      getOptionLabel={getMasterItemLabel}
                      value={masterItems.filter((m) => !addDraftItemForm.item_type_filter || (m.item_type ?? "") === addDraftItemForm.item_type_filter).find((m) => m.name === addDraftItemForm.item_key) || null}
                      onChange={(_, val) => {
                        const name = typeof val === "string" ? val : val?.name ?? "";
                        const inv = propertyInventory.find((i) => (i.item || i.item_name || "").toLowerCase() === (name || "").toLowerCase());
                        setAddDraftItemForm((prev) => ({
                          ...prev,
                          item_key: name,
                          unit: inv?.unit ?? prev.unit,
                          item_cost_per_unit: inv?.material_cost != null ? String(inv.material_cost) : prev.item_cost_per_unit,
                        }));
                      }}
                      loading={loadingMasterItems}
                      renderInput={(params) => (
                        <TextField {...params} label="Item" placeholder="Search by name or type" />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="Unit" value={addDraftItemForm.unit} onChange={(e) => setAddDraftItemForm((prev) => ({ ...prev, unit: e.target.value }))} placeholder="e.g. bags, kg, nos" />
                  </Grid>
                </Grid>
              </Paper>

              {/* 2. Quantity & area */}
              <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, bgcolor: "#fafafa" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <CalculateOutlinedIcon sx={{ fontSize: 20, color: "#64748b" }} />
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Quantity & area</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Input mode</InputLabel>
                      <Select
                        value={addDraftItemForm.input_mode}
                        label="Input mode"
                        onChange={(e) => {
                          const mode = e.target.value;
                          setAddDraftItemForm((prev) => ({
                            ...prev,
                            input_mode: mode,
                            ...(mode === "calculated" && prev.area_value === "" ? { area_value: String(getPropertyAreaForType(prev.area_type || "construction_area")) } : {}),
                          }));
                        }}
                      >
                        <MenuItem value="manual">Manual quantity</MenuItem>
                        <MenuItem value="calculated">Calculate from area</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  {addDraftItemForm.input_mode === "manual" && (
                    <Grid item xs={12} sm={6}>
                      <TextField size="small" fullWidth type="number" inputProps={{ min: 0, step: 0.01 }} label="Quantity" value={addDraftItemForm.quantity} onChange={(e) => setAddDraftItemForm((prev) => ({ ...prev, quantity: e.target.value }))} />
                    </Grid>
                  )}
                  {addDraftItemForm.input_mode === "calculated" && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Area type</InputLabel>
                          <Select value={addDraftItemForm.area_type} label="Area type" onChange={(e) => setAddDraftItemForm((prev) => ({ ...prev, area_type: e.target.value, area_value: String(getPropertyAreaForType(e.target.value)) }))}>
                            {AREA_TYPES.map((a) => (<MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField size="small" fullWidth type="number" inputProps={{ min: 0, step: 0.01 }} label="Area (sqft)" value={addDraftItemForm.area_value} onChange={(e) => setAddDraftItemForm((prev) => ({ ...prev, area_value: e.target.value }))} placeholder={String(getPropertyAreaForType(addDraftItemForm.area_type))} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField size="small" fullWidth type="number" inputProps={{ min: 0, step: 0.001 }} label="Consumption rate / sqft" value={addDraftItemForm.consumption_rate_per_sqft} onChange={(e) => setAddDraftItemForm((prev) => ({ ...prev, consumption_rate_per_sqft: e.target.value }))} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField size="small" fullWidth type="number" inputProps={{ min: 0, max: 100, step: 0.5 }} label="Wastage %" value={addDraftItemForm.wastage_percentage} onChange={(e) => setAddDraftItemForm((prev) => ({ ...prev, wastage_percentage: e.target.value }))} InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
                      </Grid>
                    </>
                  )}
                </Grid>
              </Paper>

              {/* 3. Cost – prices commented for now */}
              {false && (
              <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, bgcolor: "#fafafa" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <AttachMoneyIcon sx={{ fontSize: 20, color: "#64748b" }} />
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Unit cost</Typography>
                </Box>
                <TextField size="small" fullWidth type="number" inputProps={{ min: 0, step: 0.01 }} label="Cost per unit" value={addDraftItemForm.item_cost_per_unit} onChange={(e) => setAddDraftItemForm((prev) => ({ ...prev, item_cost_per_unit: e.target.value }))} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} sx={{ maxWidth: 200 }} />
              </Paper>
              )}

              {/* Live preview – price in preview commented for now */}
              {addDraftItemForm.item_key && addDraftItemForm.unit && (() => {
                const unitCost = Number(addDraftItemForm.item_cost_per_unit) || 0;
                let qty = 0;
                if (addDraftItemForm.input_mode === "manual") {
                  qty = Number(addDraftItemForm.quantity) || 0;
                } else {
                  const areaVal = Number(addDraftItemForm.area_value) || getPropertyAreaForType(addDraftItemForm.area_type || "construction_area");
                  const rate = Number(addDraftItemForm.consumption_rate_per_sqft) || 0;
                  const wastage = Number(addDraftItemForm.wastage_percentage) || 0;
                  qty = areaVal * rate * (1 + wastage / 100);
                }
                if (qty <= 0) return null;
                return (
                  <Paper elevation={0} sx={{ p: 1.5, bgcolor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 13, color: "#1e40af", fontWeight: 600 }}>
                      Preview: {addDraftItemForm.item_key} · {qty.toFixed(2)} {addDraftItemForm.unit}
                      {/* unitCost > 0 ? ` → ₹${(qty * unitCost).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "" */}
                    </Typography>
                  </Paper>
                );
              })()}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button onClick={closeAddDraftItem} sx={{ textTransform: "none", fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={addDraftItemToDraft} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}>Add to draft</Button>
        </DialogActions>
      </Dialog>

      {/* Add materials for missing/new phase */}
      <Dialog open={addMaterialsOpen} onClose={() => !addingMaterials && closeAddMaterials()} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: "90vh", borderRadius: 2 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: { xs: 16, sm: 18 }, fontWeight: 600, color: "#111827", pb: 1, pr: { xs: 1, sm: 2 } }}>
          <span>Add materials for {addMaterialsPhase?.phase_name ? addMaterialsPhase.phase_name : "a phase"}</span>
          <IconButton onClick={closeAddMaterials} size="small" disabled={addingMaterials} sx={{ color: "#64748b" }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {addMaterialsPhase != null && (
            <>
              <Typography sx={{ fontSize: 14, color: "#64748b", mb: 2 }}>
                Attach materials to the selected template for this phase. When a new phase is added to the schedule later, use this flow to attach materials.
              </Typography>
              {!addMaterialsPhase?.phase_name && (
                <TextField fullWidth label="Phase name" value={addMaterialsPhaseNameManual} onChange={(e) => setAddMaterialsPhaseNameManual(e.target.value)} placeholder="e.g. New Phase" sx={{ mb: 2 }} size="small" />
              )}
              <FormControl size="small" sx={{ minWidth: 180, mb: 2 }}>
                <InputLabel>Item type</InputLabel>
                <Select
                  value={addMaterialsItemTypeFilter}
                  label="Item type"
                  onChange={(e) => setAddMaterialsItemTypeFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueItemTypes.filter((t) => t).map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                <Button size="small" startIcon={<AddIcon />} onClick={addMaterialRow} sx={{ textTransform: "none" }}>Add row</Button>
              </Box>
              <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e5e7eb" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                      <TableCell>Item</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Area type</TableCell>
                      <TableCell align="right">Rate / sqft</TableCell>
                      <TableCell align="right">Wastage %</TableCell>
                      <TableCell>Floor (opt)</TableCell>
                      <TableCell width={48} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {addMaterialsItems.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ minWidth: 160 }}>
                          <Autocomplete
                            size="small"
                            options={masterItems.filter((m) => !addMaterialsItemTypeFilter || (m.item_type ?? "") === addMaterialsItemTypeFilter)}
                            getOptionLabel={getMasterItemLabel}
                            value={masterItems.filter((m) => !addMaterialsItemTypeFilter || (m.item_type ?? "") === addMaterialsItemTypeFilter).find((m) => m.name === (row.item_name || "")) || null}
                            onChange={(_, val) => updateMaterialRow(index, "item_name", typeof val === "string" ? val : val?.name ?? "")}
                            loading={loadingMasterItems}
                            renderInput={(params) => (
                              <TextField {...params} placeholder="Search by item name or type" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth placeholder="e.g. bags" value={row.unit} onChange={(e) => updateMaterialRow(index, "unit", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Select size="small" fullWidth value={row.area_type || "construction_area"} onChange={(e) => updateMaterialRow(index, "area_type", e.target.value)}>
                            {AREA_TYPES.map((a) => (<MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>))}
                          </Select>
                        </TableCell>
                        <TableCell align="right">
                          <TextField size="small" type="number" inputProps={{ min: 0, step: 0.01 }} sx={{ width: 90 }} value={row.consumption_rate_per_sqft} onChange={(e) => updateMaterialRow(index, "consumption_rate_per_sqft", e.target.value)} />
                        </TableCell>
                        <TableCell align="right">
                          <TextField size="small" type="number" inputProps={{ min: 0, max: 100, step: 0.5 }} sx={{ width: 70 }} value={row.wastage_percentage} onChange={(e) => updateMaterialRow(index, "wastage_percentage", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth placeholder="GF / FF" value={row.floor_name} onChange={(e) => updateMaterialRow(index, "floor_name", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => removeMaterialRow(index)} disabled={addMaterialsItems.length <= 1}><CloseIcon fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button onClick={closeAddMaterials} disabled={addingMaterials} sx={{ textTransform: "none", fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={submitAddPhaseItems} disabled={addingMaterials} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}>
            {addingMaterials ? <CircularProgress size={22} /> : "Add materials"}
          </Button>
        </DialogActions>
      </Dialog>

      <AddMaterialsMissingPhasesModal
        open={missingPhasesDialogOpen}
        onClose={closeMissingPhasesDialog}
        phases={missingPhasesTables}
        onUpdateRow={updateMissingPhaseRow}
        onAddRow={addMissingPhaseRow}
        onRemoveRow={removeMissingPhaseRow}
        onSave={submitMissingPhasesMaterials}
        saving={addingMissingPhases}
      />
    </Box>
  );
};

export default PropertyPhaseInventoryTab;
