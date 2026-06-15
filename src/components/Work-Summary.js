// src/components/Work-Summary.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Tooltip,
  TablePagination,
  CircularProgress,
  TableSortLabel,
  Tabs,
  Tab,
  Grid,
  Typography,
  Stack,
  Chip,
  Divider,
  IconButton,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ---------- constants ---------- */
const PAGE_BG = "#F4F6F9";

const OUTER_BORDER = "1px solid rgba(15, 23, 42, 0.10)";
const COL_DIVIDER = "1px solid rgba(15, 23, 42, 0.08)";
const ROW_DIVIDER = "1px solid rgba(15, 23, 42, 0.06)";

const tableWrapSx = {
  borderRadius: 1.5,
  overflow: "hidden",
  border: OUTER_BORDER,
  backgroundColor: "#fff",
};

const tableSx = {
  tableLayout: "fixed",
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,

  "& th, & td": {
    py: 0.95,
    px: 1.4,
    fontSize: 12.5,
    lineHeight: 1.7,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle",
    borderBottom: ROW_DIVIDER,
    borderRight: COL_DIVIDER,
    backgroundColor: "#fff",
  },

  "& th:last-child, & td:last-child": { borderRight: "none" },
  "& tbody tr:last-child td": { borderBottom: "none" },
};

const tableHeadSx = {
  backgroundColor: "#F9FAFB",
  "& th": {
    fontWeight: 700,
    backgroundColor: "#F9FAFB",
    color: "rgba(15, 23, 42, 0.55)",
    fontSize: 12,
    letterSpacing: 0.2,
    userSelect: "none",
  },
};

const rowHoverSx = { "&:hover": { backgroundColor: "rgba(15, 23, 42, 0.02)" } };

const rowClickableSx = {
  cursor: "pointer",
  "&:hover": { backgroundColor: "rgba(15, 23, 42, 0.02)" },
  "&:focus": {
    outline: "2px solid rgba(59, 130, 246, 0.25)",
    outlineOffset: -2,
  },
};

/* ---------- helpers ---------- */
const formatNumber = (value, fractionDigits = 0) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("en-IN", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
};

const formatDateDDMMYYYY = (input) => {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/* ---------- sorting helpers ---------- */
const parseDateRangeStart = (rangeStr) => {
  if (!rangeStr || typeof rangeStr !== "string") return new Date(0);
  try {
    const match = rangeStr.match(/(\d{1,2})(st|nd|rd|th)?\s+([A-Za-z]+)\s+to/i);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthMap = {
        jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
        apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
        aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
        nov: 10, november: 10, dec: 11, december: 11,
      };
      const monthIndex = monthMap[String(match[3]).toLowerCase()];
      if (monthIndex !== undefined) {
        const d = new Date(new Date().getFullYear(), monthIndex, day);
        return Number.isNaN(d.getTime()) ? new Date(0) : d;
      }
    }
    const firstPart = rangeStr.split(/\s+to\s+/i)[0]?.trim();
    if (firstPart && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(firstPart)) {
      const [dd, mm, yyyy] = firstPart.split("/").map(Number);
      const d = new Date(yyyy, mm - 1, dd);
      return Number.isNaN(d.getTime()) ? new Date(0) : d;
    }
  } catch {
    /* ignore */
  }
  return new Date(0);
};

const toSortable = (key, row) => {
  const v = row?.[key];

  if (key === "start_date" || key === "end_date") return v ? new Date(v).getTime() : 0;
  if (key === "date_range") return parseDateRangeStart(v || "").getTime();

  const numericKeys = new Set(["total_hours", "total_workers", "total_skilled", "total_unskilled", "entryCount"]);
  if (numericKeys.has(key)) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  return String(v ?? "").trim().toLowerCase();
};

const stableSort = (arr, comparator) => {
  const indexed = arr.map((el, idx) => [el, idx]);
  indexed.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return indexed.map(([el]) => el);
};

const getComparator = (order, orderBy) => {
  return (a, b) => {
    const av = toSortable(orderBy, a);
    const bv = toSortable(orderBy, b);
    if (av < bv) return order === "asc" ? -1 : 1;
    if (av > bv) return order === "asc" ? 1 : -1;
    return 0;
  };
};

const normalizeSummaryValue = (value) => String(value || "").trim().toLowerCase();

const summaryIncludesRecordValue = (summaryValue, recordValue) => {
  const values = String(summaryValue || "")
    .split(",")
    .map(normalizeSummaryValue)
    .filter(Boolean);
  const normalizedRecordValue = normalizeSummaryValue(recordValue);

  if (values.length === 0) return true;
  return values.includes(normalizedRecordValue);
};

const getDailyWorkId = (entry) => entry?.id ?? entry?.daily_work_id;

const uniqueDailyWorkIds = (entries = []) => [
  ...new Set(
    entries
      .map(getDailyWorkId)
      .filter((id) => id !== null && id !== undefined && String(id).trim() !== "")
  ),
];

const getRecordWorkerId = (record) =>
  String(
    record?.worker_id ??
      (record?.labour_id ? String(record.labour_id) : String(record?.contractor_id || ""))
  );

const isWithinRowDateRange = (row, record) => {
  if (!row?.start_date || !row?.end_date || !record?.date) return true;
  const recordDate = String(record.date).slice(0, 10);
  const startDate = String(row.start_date).slice(0, 10);
  const endDate = String(row.end_date).slice(0, 10);
  return recordDate >= startDate && recordDate <= endDate;
};

const inferWorkDurationType = (row, entries = []) => {
  const rowDuration = String(row?.work_duration_type || "").trim();
  if (rowDuration) return rowDuration;

  const entryDurations = [
    ...new Set(
      (entries || [])
        .map((entry) => String(entry?.work_duration_type || "").trim())
        .filter(Boolean)
    ),
  ];
  if (entryDurations.length > 0) return entryDurations.join(", ");

  const totalHours = Number(row?.total_hours ?? row?.total_hours_worked ?? 0);
  if (totalHours > 0) return "hourly";

  const totalDays = Number(row?.days_count ?? row?.total_days ?? 0);
  const totalWorkers = Number(row?.total_workers ?? row?.num_workers ?? 0);
  const skilledWorkers = Number(row?.total_skilled ?? row?.skilled_workers ?? 0);
  const unskilledWorkers = Number(row?.total_unskilled ?? row?.unskilled_workers ?? 0);

  if (totalDays > 0 || totalWorkers > 0 || skilledWorkers > 0 || unskilledWorkers > 0) {
    return "daily";
  }

  return "";
};

const getLinkedDailyWorkEntries = (row, allRecords = []) => {
  const sameWorkerPropertyDate = (record) =>
    getRecordWorkerId(record) === String(row?.worker_id || "") &&
    String(record?.property_id || "") === String(row?.property_id || "") &&
    isWithinRowDateRange(row, record);

  const strictMatches = (allRecords || []).filter((record) => {
    const recordDurationType = normalizeSummaryValue(record.work_duration_type);
    const dayTypeMatches =
      recordDurationType !== "daily" ||
      summaryIncludesRecordValue(row.day_type, record.day_type);

    return (
      sameWorkerPropertyDate(record) &&
      summaryIncludesRecordValue(row.work_duration_type, record.work_duration_type) &&
      dayTypeMatches &&
      summaryIncludesRecordValue(row.entry_type, record.entry_type)
    );
  });

  if (strictMatches.length > 0) return strictMatches;

  return (allRecords || []).filter(sameWorkerPropertyDate);
};

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ mt: 1.5 }}>{children}</Box>;
}

/* ---------- reusable table renderer ---------- */
function DataTable({
  columns,
  rows,
  loading = false,
  sortable = false,
  orderBy,
  order,
  onSort,
  clickableRow = false,
  onRowClick,
  pagination = false,
  page,
  rowsPerPage,
  count,
  onPageChange,
  onRowsPerPageChange,
}) {
  return (
    <Paper sx={tableWrapSx}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table size="small" sx={tableSx}>
              <TableHead sx={tableHeadSx}>
                <TableRow>
                  {columns.map((col) => {
                    const active = sortable && orderBy === col.key;
                    const align = col.align || "left";
                    return (
                      <TableCell key={col.key} sx={{ width: col.width }} align={align} sortDirection={active ? order : false}>
                        {sortable ? (
                          <TableSortLabel
                            active={active}
                            direction={active ? order : "asc"}
                            onClick={() => onSort?.(col.key)}
                            sx={{
                              ...(align === "center"
                                ? { justifyContent: "center" }
                                : align === "right"
                                ? { justifyContent: "flex-end" }
                                : { justifyContent: "flex-start" }),
                              "& .MuiTableSortLabel-icon": { opacity: active ? 1 : 0.25 },
                              color: "rgba(15, 23, 42, 0.55)",
                            }}
                          >
                            {col.label}
                          </TableSortLabel>
                        ) : (
                          col.label
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow
                    key={row.__rowKey || idx}
                    hover
                    tabIndex={clickableRow ? 0 : -1}
                    role={clickableRow ? "button" : undefined}
                    onClick={clickableRow ? () => onRowClick?.(row) : undefined}
                    onKeyDown={
                      clickableRow
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowClick?.(row);
                            }
                          }
                        : undefined
                    }
                    sx={clickableRow ? rowClickableSx : rowHoverSx}
                  >
                    {columns.map((col, cidx) => {
                      const raw = row?.[col.key];

                      const display =
                        col.render?.(raw, row) ??
                        (col.numeric ? formatNumber(raw, col.fractionDigits ?? (col.key === "total_hours" ? 1 : 0)) : raw ?? "—");

                      return (
                        <TableCell
                          key={`${col.key}-${cidx}`}
                          align={col.align || "left"}
                          sx={{ color: "rgba(15, 23, 42, 0.9)", ...(col.cellSx || {}) }}
                        >
                          <Tooltip title={String(display ?? "")} arrow>
                            <span>{String(display ?? "—")}</span>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {pagination ? (
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={count}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={onPageChange}
              onRowsPerPageChange={onRowsPerPageChange}
              sx={{
                borderTop: ROW_DIVIDER,
                "& .MuiTablePagination-toolbar": { minHeight: 44, px: 1.5 },
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                  fontSize: 12,
                  color: "rgba(15, 23, 42, 0.55)",
                },
              }}
            />
          ) : null}
        </>
      )}
    </Paper>
  );
}

// ✅ card view fixed page size
const CARDS_PER_PAGE = 12;

export default function UnpaidWorkSummary({
  headerSearch = "",
  startDate = "",
  endDate = "",
  propertyId = "",
  durationType = "",
  trigger = 0,
  onOpenPaySlip,
  viewMode = "list", // ✅ from FinanceView
}) {
  const [summary, setSummary] = useState([]);

  const [orderBy, setOrderBy] = useState("worker_id");
  const [order, setOrder] = useState("asc");

  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(10);

  const [pPage, setPPage] = useState(0);
  const [pRows, setPRows] = useState(10);

  const [dPage, setDPage] = useState(0);
  const [dRows, setDRows] = useState(10);

  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [allRecords, setAllRecords] = useState([]); // Individual daily entries for payslip breakdown

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append("start_date", startDate);
        params.append("end_date", endDate);
      }
      if (propertyId) params.append("property_id", propertyId);

      const url = `https://prod.datso.io/daily-work/property-wise-summary?${params.toString()}`;
      const response = await axios.get(url);

      let summaryData = [];
      if (Array.isArray(response.data)) summaryData = response.data;
      else if (response.data?.summary) summaryData = response.data.summary;
      else if (response.data?.data) summaryData = response.data.data;

      const detailedRecords = response.data?.all_records || [];
      setAllRecords(detailedRecords);

      setSummary(summaryData);
      setPage(0);
      setPPage(0);
      setDPage(0);
    } catch (e) {
      console.error("❌ Work summary fetch error:", e);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  useEffect(() => {
    setPage(0);
  }, [headerSearch, durationType, viewMode, tab]);

  const flattened = useMemo(() => {
    const data = summary || [];
    if (data.length === 0) return [];

    if (data[0]?.workers && Array.isArray(data[0].workers)) {
      return data.flatMap((property) =>
        (property.workers || []).map((worker) => ({
          ...worker,
          property_name: property.property_name || worker.property_name,
          property_id: property.property_id || worker.property_id,
          project_name: property.project_name || worker.project_name,
          project_id: property.project_id || worker.project_id,
          date_range:
            worker.start_date && worker.end_date
              ? `${formatDateDDMMYYYY(worker.start_date)} to ${formatDateDDMMYYYY(worker.end_date)}`
              : "-",
        }))
      );
    }
    return data.map((worker) => ({
      ...worker,
      date_range:
        worker.start_date && worker.end_date
          ? `${formatDateDDMMYYYY(worker.start_date)} to ${formatDateDDMMYYYY(worker.end_date)}`
          : "-",
    }));
  }, [summary]);

  const filteredSummary = useMemo(() => {
    let data = flattened;

    if (headerSearch) {
      const q = String(headerSearch).toLowerCase();
      data = data.filter(
        (w) =>
          String(w.property_name || "").toLowerCase().includes(q) ||
          String(w.project_name || "").toLowerCase().includes(q) ||
          String(w.worker_name || "").toLowerCase().includes(q) ||
          String(w.worker_id || "").toLowerCase().includes(q)
      );
    }

    if (durationType) {
      data = data.filter((w) => String(w.work_duration_type || "") === String(durationType));
    }

    return stableSort([...data], getComparator(order, orderBy));
  }, [flattened, headerSearch, durationType, order, orderBy]);

  const { propertySummaryRows, dateSummaryRows } = useMemo(() => {
    const propertyMap = new Map();
    const dateMap = new Map();

    filteredSummary.forEach((worker) => {
      const workersCount = Number(worker.total_workers ?? worker.num_workers ?? 0);
      const skilledCount = Number(worker.total_skilled ?? worker.skilled_workers ?? 0);
      const unskilledCount = Number(worker.total_unskilled ?? worker.unskilled_workers ?? 0);
      const hoursValue = Number(worker.total_hours ?? worker.total_hours_worked ?? 0);
      const sqftValue = Number(worker.total_sqft ?? worker.total_sqft_completed ?? 0);
      const cbmValue = Number(worker.total_cubic_meter ?? worker.total_cbm ?? 0);
      const rftValue = Number(worker.total_rft ?? 0);
      const m3Value = Number(worker.total_m3 ?? 0);
      const auger12Value = Number(worker.total_auger_12 ?? 0);
      const auger15Value = Number(worker.total_auger_15 ?? 0);
      const auger18Value = Number(worker.total_auger_18 ?? 0);
      const cbftValue = Number(worker.total_cbft ?? 0);
      const workCompletedValue = Number(worker.total_work_completed ?? 0);

      const propertyKey = worker.property_id || worker.property_name || "UNKNOWN";
      const p = propertyMap.get(propertyKey) || {
        __rowKey: propertyKey,
        property_id: worker.property_id,
        property_name: worker.property_name || "Unknown Property",
        project_name: worker.project_name || "",
        total_workers: 0,
        total_skilled: 0,
        total_unskilled: 0,
        total_hours: 0,
        total_sqft: 0,
        total_cubic_meter: 0,
        total_rft: 0,
        total_m3: 0,
        total_auger_12: 0,
        total_auger_15: 0,
        total_auger_18: 0,
        total_cbft: 0,
        total_work_completed: 0,
        entryCount: 0,
      };

      p.total_workers += workersCount;
      p.total_skilled += skilledCount;
      p.total_unskilled += unskilledCount;
      p.total_hours += hoursValue;
      p.total_sqft += sqftValue;
      p.total_cubic_meter += cbmValue;
      p.total_rft += rftValue;
      p.total_m3 += m3Value;
      p.total_auger_12 += auger12Value;
      p.total_auger_15 += auger15Value;
      p.total_auger_18 += auger18Value;
      p.total_cbft += cbftValue;
      p.total_work_completed += workCompletedValue;
      p.entryCount += 1;
      propertyMap.set(propertyKey, p);

      const raw =
        worker.work_date ||
        worker.entry_date ||
        worker.start_date ||
        (typeof worker.date_range === "string" ? worker.date_range.split(/\s+to\s+/i)[0] : undefined) ||
        worker.created_at ||
        worker.updated_at;

      let normalizedDate = null;
      if (typeof raw === "string") {
        if (raw.toLowerCase().includes("to")) {
          normalizedDate = parseDateRangeStart(raw);
        } else {
          const parsed = new Date(raw);
          if (!Number.isNaN(parsed.getTime())) normalizedDate = parsed;
        }
      } else if (raw) {
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) normalizedDate = parsed;
      }

      const dateKey =
        normalizedDate && !Number.isNaN(normalizedDate.getTime())
          ? normalizedDate.toISOString().slice(0, 10)
          : (raw ? String(raw) : "Unknown");

      const entry = dateMap.get(dateKey) || {
        __rowKey: dateKey,
        date: dateKey,
        display:
          normalizedDate && !Number.isNaN(normalizedDate.getTime())
            ? formatDateDDMMYYYY(normalizedDate)
            : (typeof raw === "string" ? raw : "Unknown"),
        sortValue:
          normalizedDate && !Number.isNaN(normalizedDate.getTime())
            ? normalizedDate.getTime()
            : Number.MIN_SAFE_INTEGER,
        total_workers: 0,
        total_skilled: 0,
        total_unskilled: 0,
        total_hours: 0,
        total_sqft: 0,
        total_cubic_meter: 0,
        total_rft: 0,
        total_m3: 0,
        total_auger_12: 0,
        total_auger_15: 0,
        total_auger_18: 0,
        total_cbft: 0,
        total_work_completed: 0,
        entryCount: 0,
      };

      entry.total_workers += workersCount;
      entry.total_skilled += skilledCount;
      entry.total_unskilled += unskilledCount;
      entry.total_hours += hoursValue;
      entry.total_sqft += sqftValue;
      entry.total_cubic_meter += cbmValue;
      entry.total_rft += rftValue;
      entry.total_m3 += m3Value;
      entry.total_auger_12 += auger12Value;
      entry.total_auger_15 += auger15Value;
      entry.total_auger_18 += auger18Value;
      entry.total_cbft += cbftValue;
      entry.total_work_completed += workCompletedValue;
      entry.entryCount += 1;
      dateMap.set(dateKey, entry);
    });

    return {
      propertySummaryRows: Array.from(propertyMap.values()).sort((a, b) => (b.total_workers || 0) - (a.total_workers || 0)),
      dateSummaryRows: Array.from(dateMap.values()).sort((a, b) => (b.sortValue || 0) - (a.sortValue || 0)),
    };
  }, [filteredSummary]);

  // keep pages in range
  useEffect(() => {
    const effective = viewMode === "cards" && tab === 0 ? CARDS_PER_PAGE : rows;
    const maxPage = Math.max(0, Math.ceil(filteredSummary.length / effective) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredSummary.length, rows, page, viewMode, tab]);

  useEffect(() => {
    const maxP = Math.max(0, Math.ceil(propertySummaryRows.length / pRows) - 1);
    if (pPage > maxP) setPPage(maxP);
  }, [propertySummaryRows.length, pRows, pPage]);

  useEffect(() => {
    const maxD = Math.max(0, Math.ceil(dateSummaryRows.length / dRows) - 1);
    if (dPage > maxD) setDPage(maxD);
  }, [dateSummaryRows.length, dRows, dPage]);

  const handleSort = (field) => {
    if (!field) return;
    if (orderBy === field) setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setOrderBy(field);
      setOrder("asc");
    }
    setPage(0);
  };

  const mainColumns = useMemo(
    () => [
      { key: "worker_id", label: "ID", width: 120, align: "left" },
      { key: "worker_name", label: "NAME", width: 220, align: "left" },
      { key: "property_name", label: "PROPERTY", width: 180, align: "left" },
      { key: "project_name", label: "PROJECT", width: 180, align: "left" },
      {
        key: "skilled_unskilled",
        label: "SKILLED / UNSKILLED",
        width: 200,
        align: "center",
        render: (_v, row) => `${formatNumber(row.total_skilled)} / ${formatNumber(row.total_unskilled)}`,
      },
      { key: "entry_type", label: "ENTRY TYPE", width: 130, align: "center" },
      {
        key: "total_workers",
        label: "WORKERS / HOURS",
        width: 180,
        align: "right",
        cellSx: { overflow: "visible", textOverflow: "clip", minWidth: 0 },
        render: (_v, row) => {
          const workersRaw = row.total_workers ?? row.num_workers;
          const workersPart =
            workersRaw != null && workersRaw !== "" ? formatNumber(workersRaw, 0) : "—";
          const rawHours = row.total_hours ?? row.total_hours_worked;
          const hoursNum = Number(rawHours);
          const hoursPart =
            rawHours != null && rawHours !== "" && Number.isFinite(hoursNum)
              ? `${formatNumber(hoursNum, 1)} hrs`
              : "—";
          return `${workersPart} / ${hoursPart}`;
        },
      },
      {
        key: "date_range",
        label: "DATE RANGE",
        width: 260,
        align: "center",
        render: (_v, row) =>
          row.start_date && row.end_date
            ? `${formatDateDDMMYYYY(row.start_date)} to ${formatDateDDMMYYYY(row.end_date)}`
            : "-",
      },
    ],
    []
  );

  const propertyColumns = useMemo(
    () => [
      { key: "property_name", label: "PROPERTY", width: 260, align: "left" },
      { key: "project_name", label: "PROJECT", width: 220, align: "left" },
      { key: "total_workers", label: "WORKERS", width: 140, numeric: true, align: "right" },
      {
        key: "skilled_unskilled",
        label: "SKILLED / UNSKILLED",
        width: 200,
        align: "center",
        render: (_v, row) => `${formatNumber(row.total_skilled)} / ${formatNumber(row.total_unskilled)}`,
      },
      { key: "total_hours", label: "HOURS", width: 140, numeric: true, fractionDigits: 1, align: "right" },
      { key: "entryCount", label: "ENTRIES", width: 120, numeric: true, align: "right" },
    ],
    []
  );

  const dateColumns = useMemo(
    () => [
      { key: "display", label: "DATE", width: 220, align: "center" },
      { key: "total_workers", label: "WORKERS", width: 140, numeric: true, align: "right" },
      {
        key: "skilled_unskilled",
        label: "SKILLED / UNSKILLED",
        width: 200,
        align: "center",
        render: (_v, row) => `${formatNumber(row.total_skilled)} / ${formatNumber(row.total_unskilled)}`,
      },
      { key: "total_hours", label: "HOURS", width: 140, numeric: true, fractionDigits: 1, align: "right" },
      { key: "entryCount", label: "ENTRIES", width: 120, numeric: true, align: "right" },
    ],
    []
  );

  const openRow = (row) => {
    if (typeof onOpenPaySlip !== "function") return;

    const individualEntries = getLinkedDailyWorkEntries(row, allRecords);
    const rowDailyWorkIds =
      Array.isArray(row.daily_work_ids) && row.daily_work_ids.length > 0
        ? row.daily_work_ids
        : [];
    const dailyWorkIds =
      rowDailyWorkIds.length > 0 ? rowDailyWorkIds : uniqueDailyWorkIds(individualEntries);

    if (dailyWorkIds.length === 0) {
      console.warn("PAYSLIP OPEN MISSING DAILY WORK IDS:", {
        worker_id: row.worker_id,
        worker_name: row.worker_name,
        property_id: row.property_id,
        date_range: {
          start_date: row.start_date,
          end_date: row.end_date,
        },
        suggestion:
          "Refresh Work Summary, confirm the backend all_records response includes this worker/property/date range, or add daily_work_ids to the backend summary row.",
      });
    }

    const dateRange =
      row.start_date && row.end_date
        ? `${formatDateDDMMYYYY(row.start_date)} to ${formatDateDDMMYYYY(row.end_date)}`
        : "-";
    const workDurationType = inferWorkDurationType(row, individualEntries);

    const enrichedWorker = {
      ...row,
      worker_id: row.worker_id || "",
      worker_name: row.worker_name || "",
      worker_type: row.worker_type || "",
      property_id: row.property_id || "",
      property_name: row.property_name || "",
      project_id: row.project_id || "",
      project_name: row.project_name || "",
      work_duration_type: workDurationType,
      day_type: row.day_type || "",
      entry_type: row.entry_type || "",
      created_by_engineer_id: row.created_by_engineer_id || "",
      total_hours: row.total_hours ?? row.total_hours_worked ?? 0,
      total_hours_worked: row.total_hours ?? row.total_hours_worked ?? 0,
      total_work_completed: row.total_work_completed ?? 0,
      total_sqft: row.total_sqft ?? row.total_sqft_completed ?? 0,
      total_sqft_completed: row.total_sqft ?? row.total_sqft_completed ?? 0,
      total_rft: row.total_rft ?? 0,
      total_m3: row.total_m3 ?? 0,
      total_auger_12: row.total_auger_12 ?? 0,
      total_auger_15: row.total_auger_15 ?? 0,
      total_auger_18: row.total_auger_18 ?? 0,
      total_cbft: row.total_cbft ?? 0,
      total_cubic_meter: row.total_cubic_meter ?? row.total_cbm ?? 0,
      total_days: row.days_count ?? row.total_days ?? 0,
      days_count: row.days_count ?? row.total_days ?? 0,
      unit_types: row.unit_types || "",
      total_workers: row.total_workers ?? row.num_workers ?? 0,
      num_workers: row.total_workers ?? row.num_workers ?? 1,
      total_skilled: row.total_skilled ?? row.skilled_workers ?? 0,
      skilled_workers: row.total_skilled ?? row.skilled_workers ?? 0,
      total_unskilled: row.total_unskilled ?? row.unskilled_workers ?? 0,
      unskilled_workers: row.total_unskilled ?? row.unskilled_workers ?? 0,
      start_date: row.start_date || "",
      end_date: row.end_date || "",
      date_range: dateRange,
      daily_work_ids: dailyWorkIds,
      individual_entries: individualEntries
        .map((entry) => ({
          id: entry.id || entry.daily_work_id || "",
          daily_work_id: entry.id || entry.daily_work_id || "",
          date: entry.date || "",
          hours_worked:
            Number(
              entry.hours_worked ??
                entry.total_hours_worked ??
                entry.total_hours ??
                entry.hours ??
                0
            ) || 0,
          work_duration_type: entry.work_duration_type || "",
          day_type: entry.day_type || "",
          entry_type: entry.entry_type || "",
          unit_type: entry.unit_type || entry.unitType || "SQFT",
          work_completed_sqft: entry.work_completed_sqft ?? entry.work_completed ?? 0,
          work_completed_cubic_meter: entry.work_completed_cubic_meter ?? 0,
          work_completed: entry.work_completed_sqft ?? entry.work_completed ?? 0,
          num_workers: entry.num_workers ?? 0,
          skilled_count: entry.skilled_count ?? 0,
          unskilled_count: entry.unskilled_count ?? 0,
          division: entry.division,
          division_name: entry.division_name,
          remarks: (entry.remarks && String(entry.remarks).trim()) || "",
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    };

    console.log("PAYSLIP OPEN DAILY WORK IDS:", enrichedWorker.daily_work_ids);
    console.log("PAYSLIP OPEN INDIVIDUAL ENTRIES:", enrichedWorker.individual_entries);

    onOpenPaySlip(enrichedWorker);
  };

  const mainPageSize = viewMode === "cards" ? CARDS_PER_PAGE : rows;

  const mainPageRows = useMemo(() => {
    const start = page * mainPageSize;
    return filteredSummary.slice(start, start + mainPageSize).map((r, idx) => ({
      ...r,
      __rowKey: `${r.worker_id || "w"}-${idx}`,
    }));
  }, [filteredSummary, page, mainPageSize]);

  const propertyPageRows = useMemo(() => {
    const start = pPage * pRows;
    return propertySummaryRows.slice(start, start + pRows);
  }, [propertySummaryRows, pPage, pRows]);

  const datePageRows = useMemo(() => {
    const start = dPage * dRows;
    return dateSummaryRows.slice(start, start + dRows);
  }, [dateSummaryRows, dPage, dRows]);

  const exportExcel = async () => {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");

      // These are already derived from filteredSummary, so they respect the current filters.
      const workerRows = filteredSummary.map((r) => ({
        worker_id: r.worker_id ?? "",
        worker_name: r.worker_name ?? "",
        property_name: r.property_name ?? "",
        project_name: r.project_name ?? "",
        work_duration_type: r.work_duration_type ?? "",
        day_type: r.day_type ?? "",
        entry_type: r.entry_type ?? "",
        total_workers: r.total_workers ?? "",
        total_skilled: r.total_skilled ?? "",
        total_unskilled: r.total_unskilled ?? "",
        total_hours: r.total_hours ?? "",
        date_range:
          r.start_date && r.end_date
            ? `${formatDateDDMMYYYY(r.start_date)} to ${formatDateDDMMYYYY(r.end_date)}`
            : (r.date_range || ""),
      }));

      const propRows = propertySummaryRows.map((r) => ({
        property_id: r.property_id ?? "",
        property_name: r.property_name ?? "",
        project_name: r.project_name ?? "",
        total_workers: r.total_workers ?? "",
        total_skilled: r.total_skilled ?? "",
        total_unskilled: r.total_unskilled ?? "",
        total_hours: r.total_hours ?? "",
        entries: r.entryCount ?? "",
      }));

      const byDateRows = dateSummaryRows.map((r) => ({
        date: r.display ?? r.date ?? "",
        total_workers: r.total_workers ?? "",
        total_skilled: r.total_skilled ?? "",
        total_unskilled: r.total_unskilled ?? "",
        total_hours: r.total_hours ?? "",
        entries: r.entryCount ?? "",
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workerRows), "Worker Summary");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(propRows), "By Property");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byDateRows), "By Date");

      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const fileName = `WorkSummary_Filtered_${yyyy}-${mm}-${dd}.xlsx`;
      saveAs(blob, fileName);
    } catch (e) {
      console.error("Work summary export failed:", e);
      alert("Export failed. Please try again.");
    }
  };

  const renderWorkerCards = () => (
    <Box>
      <Grid container spacing={2}>
        {mainPageRows.map((w) => {
          const title = w.worker_name || "—";
          const dur = w.work_duration_type || "—";
          const workers = Number(w.total_workers ?? 0);
          const dateRange =
            w.start_date && w.end_date ? `${formatDateDDMMYYYY(w.start_date)} to ${formatDateDDMMYYYY(w.end_date)}` : "—";

          return (
            <Grid item xs={12} sm={6} md={3} lg={3} key={w.__rowKey}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  bgcolor: "#fff",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
                  overflow: "hidden",
                  transition: "transform 120ms ease, box-shadow 120ms ease",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: "0px 14px 36px rgba(15,23,42,0.10)" },
                  cursor: "pointer",
                }}
                onClick={() => openRow(w)}
              >
                <Box sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}>
                        {w.worker_id || "—"}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 16,
                          fontWeight: 900,
                          color: "#111827",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={title}
                      >
                        {title}
                      </Typography>

                      <Typography sx={{ fontSize: 12.5, color: "#6B7280", mt: 0.25 }}>
                        {w.project_name || "—"} • {w.property_name || "—"}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "#9CA3AF", mt: 0.25 }}>
                        {dur}
                      </Typography>
                    </Box>

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        openRow(w);
                      }}
                      sx={{
                        border: "1px solid #E5E7EB",
                        bgcolor: "#fff",
                        borderRadius: 2,
                        "&:hover": { bgcolor: "#F9FAFB" },
                      }}
                    >
                      <VisibilityOutlinedIcon sx={{ fontSize: 18, color: "#2563EB" }} />
                    </IconButton>
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Workers</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>
                        {formatNumber(workers)}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Hours</Typography>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: "#111827" }}>
                        {(() => {
                          const rawH = w.total_hours ?? w.total_hours_worked;
                          const n = Number(rawH);
                          return rawH != null && rawH !== "" && Number.isFinite(n)
                            ? `${formatNumber(n, 1)} hrs`
                            : "—";
                        })()}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Date Range</Typography>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: "#111827" }}>
                        {dateRange}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Stack direction="row" alignItems="center" sx={{ mt: 1.5 }}>
                    <Chip
                      size="small"
                      label={w.day_type || "—"}
                      sx={{
                        height: 24,
                        fontSize: 11.5,
                        borderRadius: "999px",
                        bgcolor: "#EEF2FF",
                        color: "#1E40AF",
                        fontWeight: 900,
                      }}
                    />
                    <Box sx={{ flex: 1 }} />
                    <Chip
                      size="small"
                      label={w.entry_type || "—"}
                      sx={{
                        height: 24,
                        fontSize: 11.5,
                        borderRadius: "999px",
                        bgcolor: "#ECFDF5",
                        color: "#047857",
                        fontWeight: 900,
                        border: "1px solid #A7F3D0",
                      }}
                    />
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          );
        })}

        {mainPageRows.length === 0 && !loading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
              <Typography color="text.secondary">No data.</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <TablePagination
        component="div"
        count={filteredSummary.length}
        page={page}
        rowsPerPage={CARDS_PER_PAGE}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={() => {}}
        rowsPerPageOptions={[CARDS_PER_PAGE]}
        labelRowsPerPage="Items per page:"
        sx={{ mt: 1 }}
      />
    </Box>
  );

  return (
    <Box sx={{ p: 2.5, backgroundColor: PAGE_BG, minHeight: "70vh" }}>
      {/* Tabs header */}
      <Paper sx={{ ...tableWrapSx, mb: 2, px: 1, py: 0.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 44,
              "& .MuiTab-root": { fontWeight: 900, textTransform: "none", minHeight: 44 },
            }}
          >
            <Tab label={`Worker Summary (${formatNumber(filteredSummary.length)})`} />
            <Tab label={`Summary by Property (${formatNumber(propertySummaryRows.length)})`} />
            <Tab label={`Summary by Date (${formatNumber(dateSummaryRows.length)})`} />
          </Tabs>

          <Tooltip title="Download Excel (Filtered)">
            <span>
              <IconButton
                size="small"
                onClick={exportExcel}
                disabled={loading || filteredSummary.length === 0}
                sx={{
                  border: "1px solid #E5E7EB",
                  bgcolor: "#fff",
                  borderRadius: 2,
                  "&:hover": { bgcolor: "#F9FAFB" },
                }}
              >
                <DownloadIcon sx={{ fontSize: 18, color: "#2563EB" }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Paper>

      <TabPanel value={tab} index={0}>
        {/* ✅ Worker summary supports cards */}
        {viewMode === "cards" ? (
          renderWorkerCards()
        ) : (
          <DataTable
            columns={mainColumns}
            rows={mainPageRows}
            loading={loading}
            sortable
            orderBy={orderBy}
            order={order}
            onSort={handleSort}
            clickableRow
            onRowClick={openRow}
            pagination
            page={page}
            rowsPerPage={rows}
            count={filteredSummary.length}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              const next = parseInt(e.target.value, 10);
              setRows(Number.isFinite(next) ? next : 10);
              setPage(0);
            }}
          />
        )}
      </TabPanel>

      {/* other tabs remain tables (clean + fast) */}
      <TabPanel value={tab} index={1}>
        <DataTable
          columns={propertyColumns}
          rows={propertyPageRows}
          loading={loading}
          pagination
          page={pPage}
          rowsPerPage={pRows}
          count={propertySummaryRows.length}
          onPageChange={(_, p) => setPPage(p)}
          onRowsPerPageChange={(e) => {
            const next = parseInt(e.target.value, 10);
            setPRows(Number.isFinite(next) ? next : 10);
            setPPage(0);
          }}
        />
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <DataTable
          columns={dateColumns}
          rows={datePageRows}
          loading={loading}
          pagination
          page={dPage}
          rowsPerPage={dRows}
          count={dateSummaryRows.length}
          onPageChange={(_, p) => setDPage(p)}
          onRowsPerPageChange={(e) => {
            const next = parseInt(e.target.value, 10);
            setDRows(Number.isFinite(next) ? next : 10);
            setDPage(0);
          }}
        />
      </TabPanel>
    </Box>
  );
}