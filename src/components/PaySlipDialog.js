import React from "react";
import {
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Divider,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Paper,
  Collapse,
  Switch,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { API_BASE } from "../config";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import {
  company,
  skilledUnskilledMultiplyByDays,
  contractorMultiplierAppliesTo,
  paymentModes,
  computeEarnings,
  runCoercePolicies,
  runValidationPolicies,
} from "../config/payslipConfig";

const primaryColor = "#2563eb"; // cleaner blue like screenshot
const subtle = "#f8fafc";
const border = "#e5e7eb";
const bgPage = "#f3f4f6";

// ---- helper utils ----
const formatINR = (val) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(isFinite(val) ? Number(val) : 0);

// Round to 2 decimal places for currency (avoids floating-point errors)
const roundCurrency = (val) =>
  Number.isFinite(val) ? Math.round(Number(val) * 100) / 100 : 0;

const waitForPaint = (ms = 120) => new Promise((res) => setTimeout(res, ms));

const todayISTString = () => {
  try {
    const now = new Date();
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(now);
  } catch {
    return new Date().toLocaleString();
  }
};

// Small helper row to render a toggle + inline rate input (kept for functionality)
const ToggleWithRate = ({
  label,
  checked,
  onCheck,
  rateLabel,
  rateValue,
  onRateChange,
  disabled = false,
}) => {
  return (
    <Grid
      container
      spacing={1}
      alignItems="center"
      sx={{
        mb: 0.5,
        py: 0.35,
        px: 0.75,
        borderRadius: 2,
        "&:hover": { background: "#f9fafb" },
      }}
    >
      <Grid item xs={7}>
        <FormControlLabel
          sx={{
            m: 0,
            "& .MuiFormControlLabel-label": { width: "100%" },
          }}
          control={
            <Checkbox
              checked={checked}
              onChange={(e) => onCheck(e.target.checked)}
              disabled={disabled}
              sx={{
                p: 0.5,
                mr: 1,
                "&.Mui-checked": { color: primaryColor },
              }}
            />
          }
          label={
            <Typography sx={{ fontSize: 13, fontWeight: 650, color: "#111827" }}>
              {label}
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={5}>
        {checked && (
          <TextField
            label={rateLabel}
            fullWidth
            size="small"
            type="number"
            value={rateValue}
            onChange={(e) => onRateChange(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                background: "#fff",
              },
            }}
          />
        )}
      </Grid>
    </Grid>
  );
};

const RateTypeSelect = ({ value, onChange, disabledOptions = {} }) => {
  const options = [
    { key: "sqft", label: "Rate per Square Feet" },
    { key: "cbm", label: "Rate per CBM" },
    { key: "rft", label: "Rate per RFT" },
    { key: "m3", label: "Rate per M³" },
    { key: "auger12", label: "Rate per Auger 12" },
    { key: "auger15", label: "Rate per Auger 15" },
    { key: "auger18", label: "Rate per Auger 18" },
    { key: "cbft", label: "Rate per CBFT" },
    { key: "daily", label: "Daily Rate" },
    { key: "hourly", label: "Hourly Rate" },
    { key: "skilled", label: "Skilled Worker Rate" },
    { key: "unskilled", label: "Unskilled Worker Rate" },
  ];

  return (
    <TextField
      label="Payment Calculation Type*"
      fullWidth
      select
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        "& .MuiOutlinedInput-root": {
          background: "#fff",
        },
      }}
    >
      {options.map((o) => (
        <MenuItem key={o.key} value={o.key} disabled={!!disabledOptions[o.key]}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

// ---- PAGE component ----
//
// PROPS:
//   workerData (object) – work summary row passed from FinanceView → Work-Summary (onOpenPaySlip).
//   onBack (function)   – called when dialog is closed (e.g. after success).
//
// workerData FIELDS (used for prefill / validation / API):
//   Identity:     worker_id, worker_name, worker_type, property_id, property_name, propertyName,
//                 project_id, project_name, work_duration_type, day_type, entry_type, date_range,
//                 created_by_engineer_id, start_date, end_date
//   Metrics:      total_hours_worked, total_hours, total_sqft_completed, total_sqft, total_cubic_meter,
//                 total_cbm, total_work_completed, total_rft, total_m3, total_auger_12, total_auger_15,
//                 total_auger_18, total_cbft, unit_types, total_days, days_count,
//                 total_workers, num_workers, total_skilled, skilled_workers, skilledCount,
//                 total_unskilled, unskilled_workers, unskilledCount
//   References:   daily_work_ids (array of ids), individual_entries (array of { id, date, hours_worked,
//                 work_completed_sqft, work_completed_cubic_meter, num_workers, skilled_count,
//                 unskilled_count, division, division_name, remarks })
//
const validPaymentWorkDurationTypes = new Set([
  "daily",
  "hourly",
  "per_sqft",
  "per_rft",
  "per_m3",
  "per_auger_12",
  "per_auger_15",
  "per_auger_18",
  "per_cbft",
]);

const getWorkDurationTypeOrDaily = (value) => {
  const values = String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const validValue = values.find((item) => validPaymentWorkDurationTypes.has(item));
  return validValue || "daily";
};

const getDailyWorkIds = (workerData = {}) => {
  const sourceIds =
    Array.isArray(workerData.daily_work_ids) && workerData.daily_work_ids.length > 0
      ? workerData.daily_work_ids
      : Array.isArray(workerData.individual_entries)
      ? workerData.individual_entries.map((entry) => entry?.id ?? entry?.daily_work_id)
      : [];

  return [
    ...new Set(
      sourceIds.filter((id) => id !== null && id !== undefined && String(id).trim() !== "")
    ),
  ];
};

const PaySlipDialog = ({ workerData, onBack }) => {
  /** Property-assigned fixed amount for this worker (from assign-worker flow). */
  const [fixedAssignCap, setFixedAssignCap] = React.useState(0);

  const [form, setForm] = React.useState({
    // metrics
    totalHoursWorked: 0,
    totalSqftCompleted: 0,
    totalCubicMeter: 0,
    totalWorkCompleted: 0,
    totalRft: 0,
    totalM3: 0,
    totalAuger12: 0,
    totalAuger15: 0,
    totalAuger18: 0,
    totalCbft: 0,
    unitTypes: "",
    totalDays: 0,
    numWorkers: 1,
    skilledCount: 0,
    unskilledCount: 0,

    // identity
    workerId: "",
    workerName: "",
    propertyName: "",
    propertyId: "",
    projectId: "",
    projectName: "",
    workerType: "",
    workDurationType: "",
    dayType: "",
    entryType: "",
    dateRange: "",

    // rate toggles
    useDaily: false,
    useHourly: false,
    useSqft: false,
    useCBM: false,
    useRft: false,
    useM3: false,
    useAuger12: false,
    useAuger15: false,
    useAuger18: false,
    useCbft: false,
    useSkilled: false,
    useUnskilled: false,

    // rates
    dailyRate: "",
    hourlyRate: "",
    sqftRate: "",
    cbmRate: "",
    rftRate: "",
    m3Rate: "",
    auger12Rate: "",
    auger15Rate: "",
    auger18Rate: "",
    cbftRate: "",
    skilledRate: "",
    unskilledRate: "",

    // finance
    tdsPercent: "",
    remarks: "",
    paymentMode: "",
    referenceNumber: "",

    // direct gross (skip rate components)
    useDirectGross: false,
    directGrossAmount: "",
  });

  // UI-only state (no functionality removal)
  const [rateType, setRateType] = React.useState("sqft");

  const pdfRef = React.useRef(null);
  const [showDateBreakdown, setShowDateBreakdown] = React.useState(false);
  const [showAdvancedRates, setShowAdvancedRates] = React.useState(false);

  // 🔔 Message dialog state
  const [msgOpen, setMsgOpen] = React.useState(false);
  const [msgTitle, setMsgTitle] = React.useState("");
  const [msgContent, setMsgContent] = React.useState("");
  const [msgType, setMsgType] = React.useState("success");

  const showMessage = (title, content, type = "success") => {
    setMsgTitle(title);
    setMsgContent(content);
    setMsgType(type);
    setMsgOpen(true);
  };

  const handleMessageClose = () => {
    setMsgOpen(false);
    if (msgType === "success") {
      onBack && onBack();
    }
  };

  // preload from workerData
  React.useEffect(() => {
    if (!workerData) return;

    const { worker_type } = workerData;
    const work_duration_type = getWorkDurationTypeOrDaily(workerData.work_duration_type);
    const entries = Array.isArray(workerData.individual_entries)
      ? workerData.individual_entries
      : [];

    const sum = (key) =>
      entries.reduce((acc, e) => acc + (Number(e?.[key]) || 0), 0);

    const uniqueDatesCount = (() => {
      if (entries.length === 0) return 0;
      const set = new Set();
      entries.forEach((e) => {
        if (!e?.date) return;
        const d = new Date(e.date);
        if (!Number.isFinite(d.getTime())) return;
        set.add(d.toISOString().slice(0, 10));
      });
      return set.size;
    })();

    const derivedTotals = {
      totalHoursWorked: sum("hours_worked"),
      totalSqftCompleted: sum("work_completed_sqft"),
      totalCubicMeter: sum("work_completed_cubic_meter"),
      skilledManDays: sum("skilled_count"),
      unskilledManDays: sum("unskilled_count"),
      totalDays: uniqueDatesCount || entries.length,
    };

    const incomingSkilled =
      workerData.total_skilled ??
      workerData.skilled_workers ??
      workerData.skilledCount ??
      0;

    const incomingUnskilled =
      workerData.total_unskilled ??
      workerData.unskilled_workers ??
      workerData.unskilledCount ??
      0;

    const combinedWorkers = incomingSkilled + incomingUnskilled;
    const inferredWorkers =
      workerData.total_workers ??
      workerData.num_workers ??
      (combinedWorkers || 1);

    const formData = {
      totalHoursWorked:
        workerData.total_hours_worked ||
        workerData.total_hours ||
        derivedTotals.totalHoursWorked ||
        0,
      totalSqftCompleted:
        workerData.total_sqft_completed ||
        workerData.total_sqft ||
        derivedTotals.totalSqftCompleted ||
        0,
      totalCubicMeter:
        workerData.total_cubic_meter ||
        workerData.total_cbm ||
        derivedTotals.totalCubicMeter ||
        0,
      totalWorkCompleted: workerData.total_work_completed || 0,
      totalRft: workerData.total_rft || 0,
      totalM3: workerData.total_m3 || 0,
      totalAuger12: workerData.total_auger_12 || 0,
      totalAuger15: workerData.total_auger_15 || 0,
      totalAuger18: workerData.total_auger_18 || 0,
      totalCbft: workerData.total_cbft || 0,
      unitTypes: workerData.unit_types || "",
      totalDays: workerData.total_days || workerData.days_count || derivedTotals.totalDays || 0,
      numWorkers: inferredWorkers,
      skilledCount: incomingSkilled,
      unskilledCount: incomingUnskilled,

      workerId: workerData.worker_id || "",
      workerName: workerData.worker_name || "",
      propertyName: workerData.property_name || workerData.propertyName || "",
      propertyId: workerData.property_id || "",
      projectId: workerData.project_id || "",
      projectName: workerData.project_name || "",
      workerType: worker_type || "",
      workDurationType: work_duration_type || "",
      dayType: workerData.day_type || "",
      entryType: workerData.entry_type || "",
      dateRange: workerData.date_range || "",

      skilledRate: "",
      unskilledRate: "",
    };

    setForm((prev) => ({ ...prev, ...formData }));
    setShowDateBreakdown(false);

    // smart default rate type based on data
    const hasSqft = (formData.totalSqftCompleted || 0) > 0;
    const hasCbm = (formData.totalCubicMeter || 0) > 0;
    const hasRft = (workerData.total_rft || 0) > 0;
    const hasM3 = (workerData.total_m3 || 0) > 0;
    const hasAuger12 = (workerData.total_auger_12 || 0) > 0;
    const hasAuger15 = (workerData.total_auger_15 || 0) > 0;
    const hasAuger18 = (workerData.total_auger_18 || 0) > 0;
    const hasCbft = (workerData.total_cbft || 0) > 0;
    const hasDays = (formData.totalDays || 0) > 0;
    const hasHours = (formData.totalHoursWorked || 0) > 0;
    const hasSkilled = incomingSkilled > 0;
    const hasUnskilled = incomingUnskilled > 0;

    let nextType = "sqft";
    if (hasSqft) nextType = "sqft";
    else if (hasCbm) nextType = "cbm";
    else if (hasRft) nextType = "rft";
    else if (hasM3) nextType = "m3";
    else if (hasAuger12) nextType = "auger12";
    else if (hasAuger15) nextType = "auger15";
    else if (hasAuger18) nextType = "auger18";
    else if (hasCbft) nextType = "cbft";
    else if (hasDays) nextType = "daily";
    else if (hasHours) nextType = "hourly";
    else if (hasSkilled) nextType = "skilled";
    else if (hasUnskilled) nextType = "unskilled";

    // ✅ IMPORTANT: show advanced rate components by default (no "Add Rate Type" button)
    // and align like your screenshot by auto-selecting a primary type AND enabling its toggle.
    setRateType(nextType);
    setForm((prev) => {
      const base = {
        ...prev,
        ...formData,
        useDaily: false,
        useHourly: false,
        useSqft: false,
        useCBM: false,
        useRft: false,
        useM3: false,
        useAuger12: false,
        useAuger15: false,
        useAuger18: false,
        useCbft: false,
        useSkilled: false,
        useUnskilled: false,
      };
      if (nextType === "daily") base.useDaily = true;
      if (nextType === "hourly") base.useHourly = true;
      if (nextType === "sqft") base.useSqft = true;
      if (nextType === "cbm") base.useCBM = true;
      if (nextType === "rft") base.useRft = true;
      if (nextType === "m3") base.useM3 = true;
      if (nextType === "auger12") base.useAuger12 = true;
      if (nextType === "auger15") base.useAuger15 = true;
      if (nextType === "auger18") base.useAuger18 = true;
      if (nextType === "cbft") base.useCbft = true;
      if (nextType === "skilled") base.useSkilled = true;
      if (nextType === "unskilled") base.useUnskilled = true;
      return base;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerData]);

  // Load assigned property amount cap for this worker (same sources as Labour Expenses).
  React.useEffect(() => {
    if (!workerData) return;
    let cancelled = false;
    const pid = String(workerData.property_id || "").trim();
    const wid = String(workerData.worker_id || "").trim();
    const fromRow = Number(workerData.assign_amount ?? workerData.assignAmount ?? 0) || 0;

    const applyCap = (fetchedCap) => {
      if (cancelled) return;
      const best = Math.max(Number(fetchedCap) || 0, fromRow);
      setFixedAssignCap(best > 0 ? roundCurrency(best) : 0);
    };

    if (!pid || !wid) {
      applyCap(0);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      let cap = fromRow;
      try {
        const labourResponse = await axios.get(`${API_BASE}/properties-labor/${pid}`);
        const labours = Array.isArray(labourResponse.data) ? labourResponse.data : [];
        labours.forEach((labour) => {
          if (String(labour.employee_code || "").trim() === wid) {
            cap = Math.max(cap, Number(labour.assign_amount) || 0);
          }
        });
        try {
          const assignedResponse = await axios.get(`${API_BASE}/property/${pid}/assigned-workers`);
          const labourLogs = assignedResponse.data?.labour_logs || [];
          const contractorLogs = assignedResponse.data?.contractor_logs || [];
          [...labourLogs, ...contractorLogs].forEach((log) => {
            const id = String(log.labour_id || log.contractor_id || "").trim();
            if (id !== wid) return;
            cap = Math.max(cap, Number(log.assign_amount) || 0);
          });
        } catch {
          /* optional second source */
        }
      } catch {
        /* ignore */
      }
      applyCap(cap);
    })();

    return () => {
      cancelled = true;
    };
  }, [workerData]);

  const handleChange = (key, value) => {
    setForm((prev) => {
      const numericKeys = [
        "totalHoursWorked",
        "totalSqftCompleted",
        "totalCubicMeter",
        "totalWorkCompleted",
        "totalRft",
        "totalM3",
        "totalAuger12",
        "totalAuger15",
        "totalAuger18",
        "totalCbft",
        "totalDays",
        "numWorkers",
        "skilledCount",
        "unskilledCount",
        "tdsPercent",
        "directGrossAmount",
      ];

      const next = {
        ...prev,
        [key]:
          numericKeys.includes(key) && value !== "" && value !== null
            ? Number(value)
            : value,
      };

      // Policy layer: auto-fix invalid combos (e.g. Cash → TDS 0)
      const coerced = runCoercePolicies(next);
      Object.assign(next, coerced);

      // Only sync numWorkers from skilled+unskilled when using those components.
      // For contractor with e.g. 200 workers (daily rate only), numWorkers stays 200.
      if (key === "skilledCount" || key === "unskilledCount") {
        const skilled =
          key === "skilledCount" ? Number(value) || 0 : Number(next.skilledCount) || 0;
        const unskilled =
          key === "unskilledCount" ? Number(value) || 0 : Number(next.unskilledCount) || 0;
        if (next.useSkilled || next.useUnskilled) {
          next.numWorkers = skilled + unskilled;
        }
      }

      return next;
    });
  };

  // Map dropdown -> existing toggles (no logic deleted; we just drive the existing ones)
  const activateRateType = React.useCallback((typeKey) => {
    setRateType(typeKey);

    setForm((prev) => {
      const base = {
        ...prev,
        useDaily: false,
        useHourly: false,
        useSqft: false,
        useCBM: false,
        useRft: false,
        useM3: false,
        useAuger12: false,
        useAuger15: false,
        useAuger18: false,
        useCbft: false,
        useSkilled: false,
        useUnskilled: false,
      };
      if (typeKey === "daily") base.useDaily = true;
      if (typeKey === "hourly") base.useHourly = true;
      if (typeKey === "sqft") base.useSqft = true;
      if (typeKey === "cbm") base.useCBM = true;
      if (typeKey === "rft") base.useRft = true;
      if (typeKey === "m3") base.useM3 = true;
      if (typeKey === "auger12") base.useAuger12 = true;
      if (typeKey === "auger15") base.useAuger15 = true;
      if (typeKey === "auger18") base.useAuger18 = true;
      if (typeKey === "cbft") base.useCbft = true;
      if (typeKey === "skilled") base.useSkilled = true;
      if (typeKey === "unskilled") base.useUnskilled = true;
      return base;
    });
  }, []);

  // Keep dropdown consistent if user manually toggles stuff
  React.useEffect(() => {
    const selected = [
      form.useSqft && "sqft",
      form.useCBM && "cbm",
      form.useDaily && "daily",
      form.useHourly && "hourly",
      form.useRft && "rft",
      form.useM3 && "m3",
      form.useAuger12 && "auger12",
      form.useAuger15 && "auger15",
      form.useAuger18 && "auger18",
      form.useCbft && "cbft",
      form.useSkilled && "skilled",
      form.useUnskilled && "unskilled",
    ].filter(Boolean);

    // if exactly one selected, sync dropdown
    if (selected.length === 1 && selected[0] !== rateType) {
      setRateType(selected[0]);
    }
  }, [
    form.useSqft,
    form.useCBM,
    form.useDaily,
    form.useHourly,
    form.useRft,
    form.useM3,
    form.useAuger12,
    form.useAuger15,
    form.useAuger18,
    form.useCbft,
    form.useSkilled,
    form.useUnskilled,
    rateType,
  ]);

  const contractorMultiplier = React.useMemo(() => {
    if (form.workerType?.toLowerCase() !== "contractor") return 1;
    const n = parseInt(form.numWorkers, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [form.workerType, form.numWorkers]);

  // If per-day skilled/unskilled headcount varies, use man-days from date-wise entries.
  // Example: 5th=5, 6th=4 → skilledManDays=9 (not 5×2 or 4×2).
  const skilledManDays = React.useMemo(() => {
    const entries = workerData?.individual_entries;
    if (!Array.isArray(entries) || entries.length === 0) return null;
    const sum = entries.reduce((acc, e) => acc + (Number(e?.skilled_count) || 0), 0);
    return Number.isFinite(sum) ? sum : null;
  }, [workerData]);

  const unskilledManDays = React.useMemo(() => {
    const entries = workerData?.individual_entries;
    if (!Array.isArray(entries) || entries.length === 0) return null;
    const sum = entries.reduce((acc, e) => acc + (Number(e?.unskilled_count) || 0), 0);
    return Number.isFinite(sum) ? sum : null;
  }, [workerData]);

  const earnings = React.useMemo(() => {
    return computeEarnings(form, {
      contractorMultiplier,
      contractorMultiplierAppliesTo,
      skilledUnskilledMultiplyByDays,
      skilledManDays,
      unskilledManDays,
    });
  }, [
    form,
    contractorMultiplier,
    contractorMultiplierAppliesTo.daily,
    contractorMultiplierAppliesTo.hourly,
    skilledUnskilledMultiplyByDays,
    skilledManDays,
    unskilledManDays,
  ]);

  const gross = React.useMemo(() => {
    if (form.useDirectGross && Number(form.directGrossAmount) > 0) {
      return roundCurrency(Number(form.directGrossAmount));
    }
    return earnings.total;
  }, [form.useDirectGross, form.directGrossAmount, earnings.total]);

  const tdsAmt = React.useMemo(() => {
    const pct = parseFloat(form.tdsPercent || 0);
    const amt = (pct / 100) * gross;
    return roundCurrency(Number.isFinite(amt) ? amt : 0);
  }, [form.tdsPercent, gross]);

  const netPay = React.useMemo(() => {
    const n = roundCurrency(gross - tdsAmt);
    return Number.isFinite(n) ? n : 0;
  }, [gross, tdsAmt]);

  const fixedCap = React.useMemo(
    () => (Number(fixedAssignCap) > 0 ? roundCurrency(Number(fixedAssignCap)) : 0),
    [fixedAssignCap]
  );

  const grossOverAssignExtra = React.useMemo(() => {
    if (!(fixedCap > 0) || !(gross > 0)) return 0;
    return roundCurrency(Math.max(0, gross - fixedCap));
  }, [fixedCap, gross]);

  const exceedsAssignedPropertyAmount = grossOverAssignExtra > 0;

  const isAnyComponentSelected =
    form.useDaily || form.useHourly || form.useSqft || form.useCBM ||
    form.useRft || form.useM3 || form.useAuger12 || form.useAuger15 || form.useAuger18 || form.useCbft ||
    form.useSkilled || form.useUnskilled;

  const canSubmit =
    gross > 0 && (isAnyComponentSelected || (form.useDirectGross && Number(form.directGrossAmount) > 0));

  const disabledOptions = React.useMemo(() => {
    return {
      sqft: !(form.totalSqftCompleted > 0),
      cbm: !(form.totalCubicMeter > 0),
      daily: !(form.totalDays > 0),
      hourly: !(form.totalHoursWorked > 0),
      rft: !(form.totalRft > 0),
      m3: !(form.totalM3 > 0),
      auger12: !(form.totalAuger12 > 0),
      auger15: !(form.totalAuger15 > 0),
      auger18: !(form.totalAuger18 > 0),
      cbft: !(form.totalCbft > 0),
      skilled: !(form.skilledCount > 0),
      unskilled: !(form.unskilledCount > 0),
    };
  }, [
    form.totalSqftCompleted,
    form.totalCubicMeter,
    form.totalDays,
    form.totalHoursWorked,
    form.totalRft,
    form.totalM3,
    form.totalAuger12,
    form.totalAuger15,
    form.totalAuger18,
    form.totalCbft,
    form.skilledCount,
    form.unskilledCount,
  ]);

  const workMeasureLabel = React.useMemo(() => {
    if (rateType === "skilled") return "Skilled Workers";
    if (rateType === "unskilled") return "Unskilled Workers";
    return "Work Measure";
  }, [rateType]);

  const workMeasureUnit = React.useMemo(() => {
    if (rateType === "sqft") return "Sq Ft";
    if (rateType === "cbm") return "CBM";
    if (rateType === "daily") return "Days";
    if (rateType === "hourly") return "Hours";
    if (rateType === "rft") return "RFT";
    if (rateType === "m3") return "M³";
    if (rateType === "auger12") return "Auger 12";
    if (rateType === "auger15") return "Auger 15";
    if (rateType === "auger18") return "Auger 18";
    if (rateType === "cbft") return "CBFT";
    if (rateType === "skilled") return "Workers";
    if (rateType === "unskilled") return "Workers";
    return "";
  }, [rateType]);

  const workMeasureValue = React.useMemo(() => {
    if (rateType === "sqft") return form.totalSqftCompleted || 0;
    if (rateType === "cbm") return form.totalCubicMeter || 0;
    if (rateType === "daily") return form.totalDays || 0;
    if (rateType === "hourly") return form.totalHoursWorked || 0;
    if (rateType === "rft") return form.totalRft || 0;
    if (rateType === "m3") return form.totalM3 || 0;
    if (rateType === "auger12") return form.totalAuger12 || 0;
    if (rateType === "auger15") return form.totalAuger15 || 0;
    if (rateType === "auger18") return form.totalAuger18 || 0;
    if (rateType === "cbft") return form.totalCbft || 0;
    if (rateType === "skilled") return form.skilledCount || 0;
    if (rateType === "unskilled") return form.unskilledCount || 0;
    return 0;
  }, [
    rateType,
    form.totalSqftCompleted,
    form.totalCubicMeter,
    form.totalDays,
    form.totalHoursWorked,
    form.totalRft,
    form.totalM3,
    form.totalAuger12,
    form.totalAuger15,
    form.totalAuger18,
    form.totalCbft,
    form.skilledCount,
    form.unskilledCount,
  ]);

  const appliedRateValue = React.useMemo(() => {
    if (rateType === "sqft") return form.sqftRate;
    if (rateType === "cbm") return form.cbmRate;
    if (rateType === "daily") return form.dailyRate;
    if (rateType === "hourly") return form.hourlyRate;
    if (rateType === "rft") return form.rftRate;
    if (rateType === "m3") return form.m3Rate;
    if (rateType === "auger12") return form.auger12Rate;
    if (rateType === "auger15") return form.auger15Rate;
    if (rateType === "auger18") return form.auger18Rate;
    if (rateType === "cbft") return form.cbftRate;
    if (rateType === "skilled") return form.skilledRate;
    if (rateType === "unskilled") return form.unskilledRate;
    return "";
  }, [
    rateType,
    form.sqftRate,
    form.cbmRate,
    form.dailyRate,
    form.hourlyRate,
    form.rftRate,
    form.m3Rate,
    form.auger12Rate,
    form.auger15Rate,
    form.auger18Rate,
    form.cbftRate,
    form.skilledRate,
    form.unskilledRate,
  ]);

  const appliedRateUnit = React.useMemo(() => {
    if (rateType === "sqft") return "Per Sq Ft";
    if (rateType === "cbm") return "Per CBM";
    if (rateType === "daily") return "Per Day";
    if (rateType === "hourly") return "Per Hour";
    if (rateType === "rft") return "Per RFT";
    if (rateType === "m3") return "Per M³";
    if (rateType === "auger12") return "Per Auger 12";
    if (rateType === "auger15") return "Per Auger 15";
    if (rateType === "auger18") return "Per Auger 18";
    if (rateType === "cbft") return "Per CBFT";
    if (rateType === "skilled") return "Per Worker";
    if (rateType === "unskilled") return "Per Worker";
    return "";
  }, [rateType]);

  const setRateForActiveType = (val) => {
    if (rateType === "sqft") handleChange("sqftRate", val);
    else if (rateType === "cbm") handleChange("cbmRate", val);
    else if (rateType === "daily") handleChange("dailyRate", val);
    else if (rateType === "hourly") handleChange("hourlyRate", val);
    else if (rateType === "rft") handleChange("rftRate", val);
    else if (rateType === "m3") handleChange("m3Rate", val);
    else if (rateType === "auger12") handleChange("auger12Rate", val);
    else if (rateType === "auger15") handleChange("auger15Rate", val);
    else if (rateType === "auger18") handleChange("auger18Rate", val);
    else if (rateType === "cbft") handleChange("cbftRate", val);
    else if (rateType === "skilled") handleChange("skilledRate", val);
    else if (rateType === "unskilled") handleChange("unskilledRate", val);
  };

  const handleSubmit = async () => {
    const { valid, errors } = runValidationPolicies(form, {
      gross,
      netPay,
      isAnyComponentSelected,
      useDirectGross: form.useDirectGross,
      directGrossAmount: form.directGrossAmount,
      workerData,
    });
    if (!valid) {
      showMessage("Validation Error", errors.join(" "), "error");
      return;
    }

    if (exceedsAssignedPropertyAmount) {
      window.alert(
        `This payslip gross (${formatINR(gross)}) exceeds the assigned property amount (${formatINR(
          fixedCap
        )}) by ${formatINR(grossOverAssignExtra)}. You can still save if this is intentional.`
      );
    }

    const finalForm = {
      worker_id: form.workerId || workerData?.worker_id || "",
      worker_name: form.workerName || workerData?.worker_name || "",
      worker_type: form.workerType || workerData?.worker_type || "",

      property_id: form.propertyId || workerData?.property_id || "",
      property_name: form.propertyName || workerData?.property_name || "",
      project_id: form.projectId || workerData?.project_id || "",
      project_name: form.projectName || workerData?.project_name || "",

      work_duration_type: getWorkDurationTypeOrDaily(
        form.workDurationType || workerData?.work_duration_type
      ),
      day_type: form.dayType || workerData?.day_type || "",
      entry_type: workerData?.entry_type || "Regular",
      created_by_engineer_id: workerData?.created_by_engineer_id || "",
      date_range: form.dateRange || workerData?.date_range || "",
      start_date: workerData?.start_date || "",
      end_date: workerData?.end_date || "",

      daily_work_ids: getDailyWorkIds(workerData),

      total_hours_worked: Number(form.totalHoursWorked || 0),
      total_work_completed: Number(form.totalWorkCompleted || 0),
      total_sqft_completed: Number(form.totalSqftCompleted || 0),
      total_rft: Number(form.totalRft || 0),
      total_m3: Number(form.totalM3 || 0),
      total_auger_12: Number(form.totalAuger12 || 0),
      total_auger_15: Number(form.totalAuger15 || 0),
      total_auger_18: Number(form.totalAuger18 || 0),
      total_cbft: Number(form.totalCbft || 0),
      total_cubic_meter: Number(form.totalCubicMeter || 0),
      unit_types: form.unitTypes || "",
      total_days: Number(form.totalDays || 0),
      num_workers: (() => {
        const n = parseInt(form.numWorkers, 10);
        return Number.isFinite(n) && n >= 0 ? n : 1;
      })(),

      skilled_workers: Number(form.skilledCount || 0),
      unskilled_workers: Number(form.unskilledCount || 0),
      skilled_rate: parseFloat(form.skilledRate || 0),
      unskilled_rate: parseFloat(form.unskilledRate || 0),
      skilled_amount: roundCurrency(earnings.parts.skilledAmt),
      unskilled_amount: roundCurrency(earnings.parts.unskilledAmt),

      daily_rate: form.useDaily ? parseFloat(form.dailyRate || 0) : undefined,
      hourly_rate: form.useHourly ? parseFloat(form.hourlyRate || 0) : undefined,
      sqft_rate: form.useSqft ? parseFloat(form.sqftRate || 0) : undefined,
      cbm_rate: form.useCBM ? parseFloat(form.cbmRate || 0) : undefined,
      rft_rate: form.useRft ? parseFloat(form.rftRate || 0) : undefined,
      m3_rate: form.useM3 ? parseFloat(form.m3Rate || 0) : undefined,
      auger_12_rate: form.useAuger12 ? parseFloat(form.auger12Rate || 0) : undefined,
      auger_15_rate: form.useAuger15 ? parseFloat(form.auger15Rate || 0) : undefined,
      auger_18_rate: form.useAuger18 ? parseFloat(form.auger18Rate || 0) : undefined,
      cbft_rate: form.useCbft ? parseFloat(form.cbftRate || 0) : undefined,

      daily_amount: roundCurrency(earnings.parts.dayAmt),
      hourly_amount: roundCurrency(earnings.parts.hourAmt),
      sqft_amount: roundCurrency(earnings.parts.sqftAmt),
      cbm_amount: roundCurrency(earnings.parts.cbmAmt),
      rft_amount: roundCurrency(earnings.parts.rftAmt),
      m3_amount: roundCurrency(earnings.parts.m3Amt),
      auger_12_amount: roundCurrency(earnings.parts.auger12Amt),
      auger_15_amount: roundCurrency(earnings.parts.auger15Amt),
      auger_18_amount: roundCurrency(earnings.parts.auger18Amt),
      cbft_amount: roundCurrency(earnings.parts.cbftAmt),

      gross_amount: roundCurrency(gross),
      tds_percent: parseFloat(form.tdsPercent || 0),
      tds_amount: roundCurrency(tdsAmt),
      net_pay: roundCurrency(netPay),

      payment_mode: form.paymentMode || "",
      reference_number: form.referenceNumber || "",
      remarks: form.remarks || "",

      created_by: localStorage.getItem("email") || "admin@avenuereality.in",
    };

    const missingRequiredFields = [
      ["Worker ID", finalForm.worker_id],
      ["Worker Name", finalForm.worker_name],
      ["Worker Type", finalForm.worker_type],
      ["Property ID", finalForm.property_id],
      ["Work Duration Type", finalForm.work_duration_type],
    ]
      .filter(([, value]) => !String(value || "").trim())
      .map(([label]) => label);

    if (missingRequiredFields.length > 0) {
      showMessage(
        "Missing Payslip Data",
        `Cannot create payslip because ${missingRequiredFields.join(", ")} ${
          missingRequiredFields.length === 1 ? "is" : "are"
        } missing. These values should come from Work Summary, not manual typing. Refresh Work Summary, clear/reapply the date and property filters, then reopen the payslip. If the same field is still missing, check the daily work entry for this worker/property in backend data.`,
        "error"
      );
      return;
    }

    if (!Array.isArray(finalForm.daily_work_ids) || finalForm.daily_work_ids.length === 0) {
      showMessage(
        "Missing Daily Work IDs",
        `Cannot create payslip for ${finalForm.worker_name || "this worker"} because no linked daily work record IDs were found. Try refreshing Work Summary, then reopen this payslip from the same worker/property row. If it still fails, confirm the backend /daily-work/property-wise-summary response contains all_records for worker ${finalForm.worker_id || "-"}, property ${finalForm.property_id || "-"}, and this date range.`,
        "error"
      );
      return;
    }

    Object.keys(finalForm).forEach((k) => finalForm[k] === undefined && delete finalForm[k]);

    try {
      const payload = { payments: [finalForm] };
      console.log("PAYSLIP CREATE PAYLOAD:", payload);
      console.log("PAYSLIP CREATE DAILY WORK IDS:", finalForm.daily_work_ids);
      await axios.post("https://prod.datso.io/payments/create", payload, {
        headers: { "Content-Type": "application/json" },
      });
      showMessage("Success", "Payslip saved and generated successfully!", "success");
    } catch (error) {
      let errorMessage = "Error generating payslip. Please try again.";
      const errorData = error.response?.data;

      if (errorData?.detail) {
        if (typeof errorData.detail === "string") errorMessage = errorData.detail;
        else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e) => `${e.loc?.join(".")}: ${e.msg}`).join(", ");
        } else if (errorData.detail?.message) errorMessage = errorData.detail.message;
      } else if (errorData?.message) errorMessage = errorData.message;

      showMessage("Error", errorMessage, "error");
    }
  };

  const handleDownloadPDF = async () => {
    const node = pdfRef.current;
    if (!node) {
      showMessage("Error", "PDF preview is not ready yet.", "error");
      return;
    }

    try {
      await waitForPaint(140);

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        filter: (el) => !el?.dataset?.ignoreForPdf,
      });

      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;

      const imgProps = pdf.getImageProperties(dataUrl);
      const imgRatio = imgProps.width / imgProps.height;

      const renderWidth = pageWidth - margin * 2;
      const renderHeight = renderWidth / imgRatio;

      pdf.addImage(dataUrl, "PNG", margin, margin, renderWidth, renderHeight, undefined, "FAST");

      // watermark (best-effort)
      try {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(70);
        pdf.setTextColor(160);
        pdf.text(company.watermark, pageWidth / 2, pageHeight / 2, {
          angle: 35,
          align: "center",
        });
      } catch {}

      // footer
      pdf.setFontSize(9);
      pdf.setTextColor(90);
      const footerY = pageHeight - 18;
      pdf.text(company.footerNote, pageWidth / 2, footerY, { align: "center" });

      pdf.setFontSize(8);
      pdf.text(`Generated: ${todayISTString()}`, pageWidth - margin, footerY - 10, {
        align: "right",
      });

      pdf.save(`Payslip_${form.workerName || "Unnamed"}.pdf`);
      showMessage("Success", "PDF downloaded successfully.", "success");
    } catch (e) {
      showMessage("Error", "Failed to generate PDF. Please try again.", "error");
    }
  };

  if (!workerData) return null;

  return (
    <Box sx={{ bgcolor: bgPage, p: 2, borderRadius: 3, minHeight: "calc(100vh - 200px)" }}>
      {/* TOP APP BAR */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 3,
          border: `1px solid ${border}`,
          background: "#fff",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
            #{form.workerName || "Worker"}{" "}
            <Typography component="span" sx={{ fontWeight: 700, color: "#6b7280" }}>
              {form.workerType ? `(${form.workerType})` : ""}
            </Typography>
          </Typography>
          {gross > 0 && (
            <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
              Gross {formatINR(gross)} → TDS {formatINR(tdsAmt)} → Net {formatINR(netPay)}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!canSubmit}
            sx={{
              textTransform: "none",
              fontWeight: 900,
              borderRadius: 2,
              px: 3,
              backgroundColor: "#4f7cf3",
              "&:hover": { backgroundColor: "#3b67e8" },
            }}
          >
            Save
          </Button>

          <Button
            variant="text"
            onClick={onBack}
            sx={{
              borderRadius: 2,
              border: "1px solid #FCA5A5",
              color: "#DC2626",
              backgroundColor: "rgba(220,38,38,0.06)",
              fontWeight: 900,
              px: 2,
              "&:hover": {
                backgroundColor: "rgba(220,38,38,0.10)",
                borderColor: "#EF4444",
              },
            }}
          >
            X&nbsp;Close
          </Button>
        </Box>
      </Paper>

      {fixedCap > 0 && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Assigned property amount for this worker: <strong>{formatINR(fixedCap)}</strong> (gross payslip is
          compared to this cap).
        </Alert>
      )}
      {exceedsAssignedPropertyAmount && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          Gross <strong>{formatINR(gross)}</strong> is above the assigned amount by{" "}
          <strong>{formatINR(grossOverAssignExtra)}</strong>. Saving will still be allowed after you confirm in
          the alert.
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* LEFT: Edit Payslip */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${border}`,
              background: "#fff",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 16, mb: 0.5 }}>
                Edit Payslip
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set earnings, then worker details and payment info.
              </Typography>

              {/* 1. Earnings: direct gross or rate-based */}
              <Typography sx={{ fontWeight: 800, fontSize: 13, color: "#475569", mb: 1 }}>
                1. Earnings
              </Typography>
              <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e5e7eb" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    Use direct gross salary
                  </Typography>
                  <Switch
                    checked={!!form.useDirectGross}
                    onChange={(e) => handleChange("useDirectGross", e.target.checked)}
                    color="primary"
                    size="medium"
                  />
                </Box>
                {form.useDirectGross && (
                  <TextField
                    label="Gross amount (₹)"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.directGrossAmount}
                    onChange={(e) => handleChange("directGrossAmount", e.target.value)}
                    sx={{ mt: 1.5, "& .MuiOutlinedInput-root": { background: "#fff" } }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                )}
              </Box>

              {/* Rate components: hide when direct gross is selected */}
              {!form.useDirectGross && (
                <>
                  <RateTypeSelect value={rateType} onChange={(v) => activateRateType(v)} disabledOptions={disabledOptions} />

                  <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label={workMeasureLabel}
                        fullWidth
                        size="small"
                        value={workMeasureValue}
                        InputProps={{
                          readOnly: true,
                          endAdornment: (
                            <Typography sx={{ color: "#9ca3af", fontSize: 12, ml: 1 }}>
                              {workMeasureUnit}
                            </Typography>
                          ),
                        }}
                        sx={{ "& .MuiOutlinedInput-root": { background: "#f9fafb" } }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Applied Rate"
                        fullWidth
                        size="small"
                        type="number"
                        value={appliedRateValue}
                        onChange={(e) => setRateForActiveType(e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <Typography sx={{ color: "#9ca3af", fontSize: 12, ml: 1 }}>
                              {appliedRateUnit}
                            </Typography>
                          ),
                        }}
                        sx={{ "& .MuiOutlinedInput-root": { background: "#fff" } }}
                      />
                    </Grid>
                  </Grid>

                  {isAnyComponentSelected && gross > 0 && (
                    <Typography variant="body2" sx={{ mt: 1, color: "#0f766e", fontWeight: 600 }}>
                      Estimated gross: {formatINR(gross)}
                    </Typography>
                  )}

                  <Box sx={{ mt: 1.5 }}>
                    <Button
                      size="small"
                      onClick={() => setShowAdvancedRates((v) => !v)}
                      sx={{ textTransform: "none", fontWeight: 700, color: "#475569", p: 0, minHeight: 0 }}
                    >
                      {showAdvancedRates ? "− Hide" : "+ Show"} other rate types
                    </Button>
                    <Collapse in={showAdvancedRates}>
                      <Box sx={{ mt: 1 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: 12,
                            color: "#64748b",
                            mb: 0.75,
                          }}
                        >
                          Toggle more than one type if needed
                        </Typography>

                        <Grid container spacing={1.5}>
                          <Grid item xs={12} md={6}>
                            <ToggleWithRate
                              label={`Use Daily${form.totalDays ? ` — ${form.totalDays} day(s)` : ""}`}
                              checked={!!form.useDaily}
                              onCheck={(v) => handleChange("useDaily", v)}
                              rateLabel="Daily Rate"
                              rateValue={form.dailyRate}
                              onRateChange={(v) => handleChange("dailyRate", v)}
                              disabled={!(form.totalDays > 0)}
                            />
                            <ToggleWithRate
                              label={`Use Hourly${form.totalHoursWorked ? ` — ${form.totalHoursWorked} hour(s)` : ""}`}
                              checked={!!form.useHourly}
                              onCheck={(v) => handleChange("useHourly", v)}
                              rateLabel="Hourly Rate"
                              rateValue={form.hourlyRate}
                              onRateChange={(v) => handleChange("hourlyRate", v)}
                              disabled={!(form.totalHoursWorked > 0)}
                            />
                            <ToggleWithRate
                              label={`Use Per Sqft${form.totalSqftCompleted ? ` — ${form.totalSqftCompleted} sqft` : ""}`}
                              checked={!!form.useSqft}
                              onCheck={(v) => handleChange("useSqft", v)}
                              rateLabel="Per Sqft Rate"
                              rateValue={form.sqftRate}
                              onRateChange={(v) => handleChange("sqftRate", v)}
                              disabled={!(form.totalSqftCompleted > 0)}
                            />
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <ToggleWithRate
                              label={`Use Per CBM${form.totalCubicMeter ? ` — ${form.totalCubicMeter} cbm` : ""}`}
                              checked={!!form.useCBM}
                              onCheck={(v) => handleChange("useCBM", v)}
                              rateLabel="Per CBM Rate"
                              rateValue={form.cbmRate}
                              onRateChange={(v) => handleChange("cbmRate", v)}
                              disabled={!(form.totalCubicMeter > 0)}
                            />
                            <ToggleWithRate
                              label={`Use Skilled${form.skilledCount ? ` — ${form.skilledCount} worker(s)` : ""}`}
                              checked={!!form.useSkilled}
                              onCheck={(v) => handleChange("useSkilled", v)}
                              rateLabel={
                                skilledUnskilledMultiplyByDays && form.totalDays > 0
                                  ? "Skilled Rate (per worker per day)"
                                  : "Skilled Rate"
                              }
                              rateValue={form.skilledRate}
                              onRateChange={(v) => handleChange("skilledRate", v)}
                              disabled={!(form.skilledCount > 0)}
                            />
                            <ToggleWithRate
                              label={`Use Unskilled${form.unskilledCount ? ` — ${form.unskilledCount} worker(s)` : ""}`}
                              checked={!!form.useUnskilled}
                              onCheck={(v) => handleChange("useUnskilled", v)}
                              rateLabel={
                                skilledUnskilledMultiplyByDays && form.totalDays > 0
                                  ? "Unskilled Rate (per worker per day)"
                                  : "Unskilled Rate"
                              }
                              rateValue={form.unskilledRate}
                              onRateChange={(v) => handleChange("unskilledRate", v)}
                              disabled={!(form.unskilledCount > 0)}
                            />
                          </Grid>
                        </Grid>

                        {!isAnyComponentSelected && (
                          <Typography variant="caption" color="error">
                            Select at least one earning component.
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography sx={{ fontWeight: 800, fontSize: 13, color: "#475569", mb: 1 }}>
                2. Worker & property
              </Typography>
              <Typography variant="caption" display="block" sx={{ color: "#94a3b8", mb: 1 }}>
                Prefilled from summary; change only if needed.
              </Typography>

              <Grid container spacing={1.5}>
                <Grid item xs={12}>
                  <TextField
                    label="Property Name"
                    fullWidth
                    size="small"
                    value={form.propertyName || ""}
                    onChange={(e) => handleChange("propertyName", e.target.value)}
                    sx={{ "& .MuiOutlinedInput-root": { background: "#f9fafb" } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="No. of Workers"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.numWorkers}
                    onChange={(e) => handleChange("numWorkers", e.target.value)}
                    helperText={
                      form.workerType?.toLowerCase() === "contractor"
                        ? "Daily/Hourly pay = rate × days/hours × this number"
                        : undefined
                    }
                    sx={{ "& .MuiOutlinedInput-root": { background: "#f9fafb" } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Worker Type"
                    fullWidth
                    size="small"
                    value={form.workerType || ""}
                    onChange={(e) => handleChange("workerType", e.target.value)}
                    helperText='Type "contractor" to pay per day/hour × No. of Workers (e.g. 200 employees)'
                    sx={{ "& .MuiOutlinedInput-root": { background: "#f9fafb" } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Skilled Workers"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.skilledCount}
                    onChange={(e) => handleChange("skilledCount", e.target.value)}
                    sx={{ "& .MuiOutlinedInput-root": { background: "#f9fafb" } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Unskilled Workers"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.unskilledCount}
                    onChange={(e) => handleChange("unskilledCount", e.target.value)}
                    sx={{ "& .MuiOutlinedInput-root": { background: "#f9fafb" } }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography sx={{ fontWeight: 800, fontSize: 13, color: "#475569", mb: 1 }}>
                3. Payment & deductions
              </Typography>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Payment Mode"
                    fullWidth
                    select
                    size="small"
                    value={form.paymentMode}
                    onChange={(e) => handleChange("paymentMode", e.target.value)}
                    sx={{ "& .MuiOutlinedInput-root": { background: "#f9fafb" } }}
                  >
                    {paymentModes.map((mode) => (
                      <MenuItem key={mode} value={mode}>
                        {mode}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="TDS (%)"
                    fullWidth
                    size="small"
                    type="number"
                    value={form.tdsPercent}
                    disabled={form.paymentMode === "Cash"}
                    onChange={(e) => handleChange("tdsPercent", e.target.value)}
                    helperText={form.paymentMode === "Cash" ? "N/A for Cash" : undefined}
                    sx={{ "& .MuiOutlinedInput-root": { background: "#f9fafb" } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Reference No. / UTR"
                    fullWidth
                    size="small"
                    value={form.referenceNumber}
                    onChange={(e) => handleChange("referenceNumber", e.target.value)}
                    placeholder={form.paymentMode === "Cash" ? "Optional" : "For bank/UPI"}
                    sx={{ "& .MuiOutlinedInput-root": { background: "#f9fafb" } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Remarks"
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    value={form.remarks}
                    onChange={(e) => handleChange("remarks", e.target.value)}
                    placeholder="Optional"
                    sx={{ "& .MuiOutlinedInput-root": { background: "#f9fafb" } }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* RIGHT: Preview */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${border}`,
              background: "#fff",
              overflow: "hidden",
            }}
          >
            {/* Preview header with summary + Download */}
            <Box
              sx={{
                p: 2,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                borderBottom: `1px solid ${border}`,
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 16 }}>Preview</Typography>
                {gross > 0 && (
                  <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600, mt: 0.25 }}>
                    Gross {formatINR(gross)} · TDS {formatINR(tdsAmt)} · Net {formatINR(netPay)}
                  </Typography>
                )}
              </Box>

              <Button
                onClick={handleDownloadPDF}
                variant="outlined"
                sx={{
                  textTransform: "none",
                  fontWeight: 900,
                  borderRadius: 2,
                  borderColor: "#e5e7eb",
                  color: "#111827",
                  "&:hover": { background: "#f9fafb", borderColor: "#e5e7eb" },
                }}
              >
                Download PDF
              </Button>
            </Box>

            <Box
              sx={{
                p: 2,
                maxHeight: "calc(100vh - 160px)",
                overflow: "auto",
                bgcolor: "#fff",
              }}
            >
              {/* Actual printable area */}
              <Card
                ref={pdfRef}
                elevation={0}
                sx={{
                  width: "794px",
                  maxWidth: "100%",
                  mx: "auto",
                  p: 3,
                  borderRadius: 2.5,
                  border: `1px solid ${border}`,
                  background: "#ffffff",
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <img
                      src={company.logo}
                      alt="Avenue Realty Logo"
                      style={{ height: 40, borderRadius: 8 }}
                    />
                  </Box>

                  <Box textAlign="right">
                    <Typography variant="h6" fontWeight="bold">
                      Salary Slip
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Date: {new Date().toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                <Grid container spacing={0.75}>
                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Name
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.workerName || "-"}</Typography>
                  </Grid>

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Worker ID
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.workerId || "-"}</Typography>
                  </Grid>

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Property Name
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.propertyName || "-"}</Typography>
                  </Grid>

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Worker Type
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.workerType || "-"}</Typography>
                  </Grid>

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Work Duration
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.workDurationType || "-"}</Typography>
                  </Grid>

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Day Type
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.dayType || "-"}</Typography>
                  </Grid>

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Entry Type
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{workerData?.entry_type || "-"}</Typography>
                  </Grid>

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Period
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.dateRange || "-"}</Typography>
                  </Grid>

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Days Worked
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.totalDays || 0}</Typography>
                  </Grid>

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Hours Worked
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.totalHoursWorked || 0}</Typography>
                  </Grid>

                  {form.unitTypes && (
                    <>
                      <Grid item xs={7}>
                        <Typography variant="body2" color="text.secondary">Unit Types</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">{form.unitTypes || "-"}</Typography>
                      </Grid>
                    </>
                  )}

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">Total Work Completed</Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.totalWorkCompleted || 0}</Typography>
                  </Grid>

                  {form.totalSqftCompleted > 0 && (
                    <>
                      <Grid item xs={7}>
                        <Typography variant="body2" color="text.secondary">Sqft Completed</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">{form.totalSqftCompleted || 0}</Typography>
                      </Grid>
                    </>
                  )}

                  {form.totalRft > 0 && (
                    <>
                      <Grid item xs={7}>
                        <Typography variant="body2" color="text.secondary">RFT Completed</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">{form.totalRft || 0}</Typography>
                      </Grid>
                    </>
                  )}

                  {form.totalM3 > 0 && (
                    <>
                      <Grid item xs={7}>
                        <Typography variant="body2" color="text.secondary">M³ Completed</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">{form.totalM3 || 0}</Typography>
                      </Grid>
                    </>
                  )}

                  {form.totalAuger12 > 0 && (
                    <>
                      <Grid item xs={7}>
                        <Typography variant="body2" color="text.secondary">Auger 12 Completed</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">{form.totalAuger12 || 0}</Typography>
                      </Grid>
                    </>
                  )}

                  {form.totalAuger15 > 0 && (
                    <>
                      <Grid item xs={7}>
                        <Typography variant="body2" color="text.secondary">Auger 15 Completed</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">{form.totalAuger15 || 0}</Typography>
                      </Grid>
                    </>
                  )}

                  {form.totalAuger18 > 0 && (
                    <>
                      <Grid item xs={7}>
                        <Typography variant="body2" color="text.secondary">Auger 18 Completed</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">{form.totalAuger18 || 0}</Typography>
                      </Grid>
                    </>
                  )}

                  {form.totalCbft > 0 && (
                    <>
                      <Grid item xs={7}>
                        <Typography variant="body2" color="text.secondary">CBFT Completed</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">{form.totalCbft || 0}</Typography>
                      </Grid>
                    </>
                  )}

                  {form.totalCubicMeter > 0 && (
                    <>
                      <Grid item xs={7}>
                        <Typography variant="body2" color="text.secondary">CBM Completed</Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">{form.totalCubicMeter || 0}</Typography>
                      </Grid>
                    </>
                  )}

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Skilled Workers
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.skilledCount || 0}</Typography>
                  </Grid>

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Unskilled Workers
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.unskilledCount || 0}</Typography>
                  </Grid>

                  <Grid item xs={7}>
                    <Typography variant="body2" color="text.secondary">
                      Total Workers
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="body2">{form.numWorkers || 0}</Typography>
                  </Grid>

                  {workerData?.created_by_engineer_id && (
                    <>
                      <Grid item xs={7}>
                        <Typography variant="body2" color="text.secondary">
                          Engineer ID
                        </Typography>
                      </Grid>
                      <Grid item xs={5}>
                        <Typography variant="body2">
                          {workerData.created_by_engineer_id || "-"}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>

                {workerData?.individual_entries?.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Box>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={1}
                      >
                        <Typography
                          variant="subtitle2"
                          fontWeight="bold"
                          sx={{ color: primaryColor }}
                        >
                          Date-wise Breakdown ({workerData.individual_entries.length})
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setShowDateBreakdown(!showDateBreakdown)}
                          sx={{ textTransform: "none", fontSize: "0.75rem" }}
                        >
                          {showDateBreakdown ? "Hide" : "Show"} Details
                        </Button>
                      </Box>

                      {showDateBreakdown && (
                        <Card
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            borderColor: border,
                            background: subtle,
                          }}
                        >
                          <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
                            <TableContainer sx={{ maxWidth: "100%", overflowX: "auto" }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Date</TableCell>
                                  <TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Division</TableCell>
                                  <TableCell sx={{ fontSize: 11, fontWeight: 700 }} align="right">
                                    Hours
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 11, fontWeight: 700 }} align="right">
                                    Sqft
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 11, fontWeight: 700 }} align="right">
                                    CBM
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 11, fontWeight: 700 }} align="right">
                                    Workers
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 11, fontWeight: 700 }} align="right">
                                    Skilled
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 11, fontWeight: 700 }} align="right">
                                    Unskilled
                                  </TableCell>
                                  <TableCell
                                    sx={{ fontSize: 11, fontWeight: 700, minWidth: 120, maxWidth: 280 }}
                                  >
                                    Remarks
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 11, fontWeight: 700 }}>ID</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {workerData.individual_entries.map((entry, idx) => {
                                  const dateLabel = entry.date
                                    ? new Date(entry.date).toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "Unknown";
                                  const divisionLabel =
                                    entry.division_name || entry.division || "-";
                                  const remarksText =
                                    entry.remarks && String(entry.remarks).trim()
                                      ? String(entry.remarks).trim()
                                      : "—";
                                  return (
                                    <TableRow key={entry.id || idx}>
                                      <TableCell sx={{ fontSize: 11 }}>{dateLabel}</TableCell>
                                      <TableCell sx={{ fontSize: 11 }}>{divisionLabel}</TableCell>
                                      <TableCell sx={{ fontSize: 11 }} align="right">
                                        {entry.hours_worked ?? 0}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: 11 }} align="right">
                                        {entry.work_completed_sqft > 0
                                          ? entry.work_completed_sqft
                                          : ""}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: 11 }} align="right">
                                        {entry.work_completed_cubic_meter > 0
                                          ? entry.work_completed_cubic_meter
                                          : ""}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: 11 }} align="right">
                                        {entry.num_workers || 0}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: 11 }} align="right">
                                        {entry.skilled_count || 0}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: 11 }} align="right">
                                        {entry.unskilled_count || 0}
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          fontSize: 11,
                                          maxWidth: 280,
                                          whiteSpace: "normal",
                                          wordBreak: "break-word",
                                          verticalAlign: "top",
                                          color: "text.secondary",
                                        }}
                                      >
                                        {remarksText}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: 11 }}>
                                        {entry.id ? (
                                          <Typography
                                            component="span"
                                            sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
                                          >
                                            {entry.id}
                                          </Typography>
                                        ) : (
                                          "-"
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                            </TableContainer>
                          </CardContent>
                        </Card>
                      )}
                    </Box>
                  </>
                )}

                <Divider sx={{ my: 1.5 }} />

                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    sx={{ color: primaryColor, mb: 0.5 }}
                  >
                    Earnings
                  </Typography>

                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: border,
                      background: subtle,
                      mb: 1,
                    }}
                  >
                    <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                      <Grid container spacing={0.5}>
                        {form.useDirectGross && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2" fontWeight="bold">
                                Direct gross (no rate breakdown)
                              </Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(gross)}
                              </Typography>
                            </Grid>
                          </>
                        )}
                        {form.useDaily && form.totalDays > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">
                                Daily × {earnings.parts.days}
                                {contractorMultiplier > 1 && contractorMultiplierAppliesTo.daily
                                  ? ` × ${contractorMultiplier} worker(s)`
                                  : ""}
                              </Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.dayAmt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        {form.useHourly && form.totalHoursWorked > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">
                                Hourly × {earnings.parts.hours}
                                {contractorMultiplier > 1 && contractorMultiplierAppliesTo.hourly
                                  ? ` × ${contractorMultiplier} worker(s)`
                                  : ""}
                              </Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.hourAmt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        {form.useSqft && form.totalSqftCompleted > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">
                                Per Sqft × {earnings.parts.sqft}
                              </Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.sqftAmt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        {form.useCBM && form.totalCubicMeter > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">
                                Per CBM × {earnings.parts.cbm}
                              </Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.cbmAmt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        {form.useRft && form.totalRft > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">Per RFT × {earnings.parts.rft}</Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.rftAmt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        {form.useM3 && form.totalM3 > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">Per M³ × {earnings.parts.m3}</Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.m3Amt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        {form.useAuger12 && form.totalAuger12 > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">Per Auger 12 × {earnings.parts.auger12}</Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.auger12Amt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        {form.useAuger15 && form.totalAuger15 > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">Per Auger 15 × {earnings.parts.auger15}</Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.auger15Amt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        {form.useAuger18 && form.totalAuger18 > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">Per Auger 18 × {earnings.parts.auger18}</Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.auger18Amt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        {form.useCbft && form.totalCbft > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">Per CBFT × {earnings.parts.cbft}</Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.cbftAmt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        {form.useSkilled && form.skilledCount > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">
                                Skilled × {earnings.parts.skilledCount}
                                {skilledUnskilledMultiplyByDays && form.totalDays > 0
                                  ? ` × ${earnings.parts.days} days`
                                  : ""}
                              </Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.skilledAmt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        {form.useUnskilled && form.unskilledCount > 0 && (
                          <>
                            <Grid item xs={8}>
                              <Typography variant="body2">
                                Unskilled × {earnings.parts.unskilledCount}
                                {skilledUnskilledMultiplyByDays && form.totalDays > 0
                                  ? ` × ${earnings.parts.days} days`
                                  : ""}
                              </Typography>
                            </Grid>
                            <Grid item xs={4} textAlign="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatINR(earnings.parts.unskilledAmt)}
                              </Typography>
                            </Grid>
                          </>
                        )}

                        <Grid item xs={8}>
                          <Typography variant="body2" fontWeight="bold">
                            Gross
                          </Typography>
                        </Grid>
                        <Grid item xs={4} textAlign="right">
                          <Typography fontWeight={700}>{formatINR(gross)}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    sx={{ color: primaryColor, mb: 0.5 }}
                  >
                    Summary
                  </Typography>

                  <Grid container spacing={0.5}>
                    <Grid item xs={7}>
                      <Typography fontWeight="bold">Gross Salary</Typography>
                    </Grid>
                    <Grid item xs={5} textAlign="right">
                      <Typography>{formatINR(gross)}</Typography>
                    </Grid>

                    <Grid item xs={7}>
                      <Typography fontWeight="bold">TDS</Typography>
                    </Grid>
                    <Grid item xs={5} textAlign="right">
                      <Typography>{formatINR(tdsAmt)}</Typography>
                    </Grid>

                    <Grid item xs={7} display="flex" alignItems="center" gap={1}>
                      <Typography fontWeight="bold" sx={{ color: primaryColor }}>
                        Net Pay
                      </Typography>
                      <Chip size="small" label="Final" variant="outlined" />
                    </Grid>
                    <Grid item xs={5} textAlign="right">
                      <Typography sx={{ color: "#16a34a" }} fontWeight="bold">
                        {formatINR(netPay)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />
              </Card>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Message Dialog */}
      <Dialog open={msgOpen} onClose={handleMessageClose}>
        <DialogTitle sx={{ color: msgType === "error" ? "red" : "green", fontWeight: 700 }}>
          {msgTitle}
        </DialogTitle>
        <DialogContent>
          <Typography>{msgContent}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleMessageClose}
            variant="contained"
            color={msgType === "error" ? "error" : "success"}
            startIcon={msgType === "error" ? <CloseIcon /> : null}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaySlipDialog;