// src/components/ChatBoxAi.js
import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Stack,
  TextField,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Divider,
  TablePagination,
  CircularProgress,
  InputAdornment,
} from "@mui/material";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import CloseIcon from "@mui/icons-material/Close";

import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ✅ PDF deps
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TEST_API_BASE = "http://localhost:8080";

const AVENUE_LOGO_URL =
  "https://avenuerealty.in/wp-content/uploads/2022/12/cropped-Avenue-reality-logo.png";

const COLORS = {
  pageBg: "#F3F4F6",
  topBarBg: "#F3F4F6",
  border: "rgba(226,232,240,1)",
  text: "rgba(15,23,42,0.92)",
  textDim: "rgba(15,23,42,0.52)",
  blue: "#2563eb",
  blueDark: "#1d4ed8",
  cardShadow: "0 14px 40px rgba(15,23,42,0.08)",
  softShadow: "0 10px 26px rgba(15,23,42,0.06)",
  heroShadow: "0 18px 60px rgba(15,23,42,0.08)",
  errorBg: "#F3F4F6",
  errorBorder: "rgba(226,232,240,1)",
  errorText: "rgba(15,23,42,0.92)",
};

// -------------------- History Storage (3 days) --------------------
const HISTORY_KEY = "avenue_ask_history_v1";
const HISTORY_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function nowISO() {
  return new Date().toISOString();
}

function safeParseJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = safeParseJson(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list || []));
  } catch {}
}

function pruneHistory(list) {
  const t = Date.now();
  return (list || []).filter((x) => {
    const created = x?.created_at ? new Date(x.created_at).getTime() : 0;
    if (!Number.isFinite(created) || created <= 0) return false;
    return t - created <= HISTORY_TTL_MS;
  });
}

// -------------------- CSV helpers --------------------
function escapeCsvCell(v) {
  if (v === null || v === undefined) return "";
  let s = "";
  if (typeof v === "string") s = v;
  else if (typeof v === "number" || typeof v === "boolean") s = String(v);
  else {
    try {
      s = JSON.stringify(v);
    } catch {
      s = String(v);
    }
  }
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob({ filename, mime, content }) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function generateCsvForTable({ question, cols, rows }) {
  const safeCols = Array.isArray(cols) ? cols : getColumns(rows || []);
  const safeRows = Array.isArray(rows) ? rows : [];
  const BOM = "\uFEFF";
  const header = safeCols.map(escapeCsvCell).join(",");
  const body = safeRows
    .map((r) => safeCols.map((c) => escapeCsvCell(r?.[c])).join(","))
    .join("\n");
  const csv = `${BOM}${header}\n${body}\n`;
  const name = safeFilenameFromQuestion(question) || "results";
  downloadBlob({
    filename: `${name}.csv`,
    mime: "text/csv;charset=utf-8",
    content: csv,
  });
}

function formatDayTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function isThisWeek(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const day = now.getDay(); // 0..6
    const diffToMonday = (day + 6) % 7; // Monday=0
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - diffToMonday);
    return d >= monday;
  } catch {
    return true;
  }
}

// -------------------- Role utils --------------------
function readLocalStorageRole() {
  try {
    const candidates = ["role", "user_role", "userRole"];
    for (const k of candidates) {
      const v = localStorage.getItem(k);
      if (v && String(v).trim()) return String(v).trim();
    }
  } catch {}
  return "";
}

function readLocalStorageRolesArray() {
  try {
    const rawRoles = localStorage.getItem("roles");
    if (rawRoles) {
      try {
        const parsed = JSON.parse(rawRoles);
        if (Array.isArray(parsed)) {
          return parsed.map((x) => String(x || "").trim()).filter(Boolean);
        }
      } catch {}
    }
  } catch {}

  const single = readLocalStorageRole();
  return single ? [single] : [];
}

function normalizeRole(raw) {
  const r = String(raw || "").trim();
  if (!r) return "";
  const key = r.toLowerCase().replace(/\s+/g, "_");
  if (
    key === "stock_management_team" ||
    key === "stockmanager" ||
    key === "stock_manager" ||
    key === "stock_manager_team"
  ) {
    return "STOCK_MANAGER_TEAM";
  }
  if (key === "finance_team" || key === "finance") return "FINANCE_TEAM";
  if (key === "admin" || key === "administrator") return "ADMIN";
  return r.toUpperCase();
}

function normalizeRolesList(list) {
  const out = [];
  const seen = new Set();
  for (const item of list || []) {
    const nr = normalizeRole(item);
    if (!nr) continue;
    if (seen.has(nr)) continue;
    seen.add(nr);
    out.push(nr);
  }
  return out;
}

function prettyRoleLabel(role) {
  return String(role || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettyRolesLabel(roles) {
  const arr = (roles || []).map(prettyRoleLabel).filter(Boolean);
  if (arr.length === 0) return "Admin";
  if (arr.length === 1) return arr[0];
  return arr.join(" + ");
}

function pickEffectiveRoleForApi(roles) {
  const arr = Array.isArray(roles) ? roles : [];
  if (arr.includes("ADMIN")) return "ADMIN";
  return arr[0] || "ADMIN";
}

// -------------------- Response helpers --------------------
async function safeJson(res) {
  const txt = await res.text();
  if (!txt) return "";
  try {
    return JSON.parse(txt);
  } catch {
    return txt;
  }
}

function coerceText(payload) {
  if (payload == null) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload === "number" || typeof payload === "boolean") return String(payload);
  if (payload.answer && typeof payload.answer === "string") return payload.answer;
  if (payload.text && typeof payload.text === "string") return payload.text;
  if (payload.data?.text && typeof payload.data.text === "string") return payload.data.text;
  return null;
}

function isNoDataPayload(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  if (Array.isArray(data.rows) && data.rows.length === 0) return true;
  if (data.error) return true;
  if (data.detail) return true;
  if (typeof data.message === "string" && data.message.toLowerCase().includes("no data"))
    return true;
  if (typeof data.answer === "string" && data.answer.toLowerCase().includes("no results"))
    return true;
  return false;
}

function fmt(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? v.toString()
      : v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string") return v.trim();
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function getColumns(rows) {
  const set = new Set();
  (rows || []).forEach((r) => Object.keys(r || {}).forEach((k) => set.add(k)));
  return Array.from(set);
}

function getBackendSuggestions(payload) {
  const raw =
    (Array.isArray(payload?.suggested_queries) && payload.suggested_queries) ||
    (Array.isArray(payload?.suggestions) && payload.suggestions) ||
    (Array.isArray(payload?.related_queries) && payload.related_queries) ||
    [];
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const s = String(x || "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function fallbackRoleSuggestions(allowedSet, askedQuestion, limit = 8) {
  const asked = String(askedQuestion || "").trim();
  if (!allowedSet) return [];
  const arr = Array.from(allowedSet).map((s) => String(s).trim()).filter(Boolean);
  const filtered = arr.filter((q) => q !== asked);
  return filtered.slice(0, limit);
}

// -------------------- PDF helpers --------------------
function safeFilenameFromQuestion(q) {
  return (q || "avenue_ask")
    .toString()
    .slice(0, 60)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function downloadPdfBlob(filename, doc) {
  const finalName = `${filename || "avenue_ask"}.pdf`;
  doc.save(finalName);
}

function generatePdfForTable({ question, cols, rows }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  const title = "Avenue Ask";
  const subtitle = question ? `Question: ${question}` : "";
  const ts = `Generated: ${new Date().toLocaleString()}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (subtitle) doc.text(subtitle, 40, 60);
  doc.text(ts, 40, subtitle ? 78 : 60);

  const limitedRows = (rows || []).slice(0, 1000);

  autoTable(doc, {
    startY: subtitle ? 92 : 78,
    head: [cols],
    body: limitedRows.map((r) => cols.map((c) => fmt(r?.[c]))),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fontStyle: "bold" },
    margin: { left: 40, right: 40 },
  });

  const name = safeFilenameFromQuestion(question) || "results";
  downloadPdfBlob(name, doc);
}

function generatePdfForText({ question, text }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const title = "Avenue Ask";
  const subtitle = question ? `Question: ${question}` : "";
  const ts = `Generated: ${new Date().toLocaleString()}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (subtitle) doc.text(subtitle, 40, 60);
  doc.text(ts, 40, subtitle ? 78 : 60);

  doc.setFontSize(11);
  const body = String(text || "");
  const lines = doc.splitTextToSize(body, 515);
  doc.text(lines, 40, subtitle ? 105 : 92);

  const name = safeFilenameFromQuestion(question) || "response";
  downloadPdfBlob(name, doc);
}

// -------------------- UI pieces --------------------
function AvenueMark({ size = 78 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: "drop-shadow(0 14px 28px rgba(37,99,235,0.18))",
      }}
      aria-label="Avenue Ask"
    >
      <Box
        component="img"
        src={AVENUE_LOGO_URL}
        alt="Avenue Realty"
        sx={{ width: "200%", height: "200%", objectFit: "contain", display: "block" }}
      />
    </Box>
  );
}

function BotMarkdown({ children }) {
  return (
    <Box
      sx={{
        "& p": { m: 0, mb: 1.25, lineHeight: 1.65 },
        "& ul, & ol": { pl: 3, mb: 1.25 },
        "& code": {
          px: 0.6,
          py: 0.25,
          borderRadius: 1,
          bgcolor: "rgba(15,23,42,0.06)",
          fontSize: 12,
        },
        "& pre": {
          m: 0,
          mb: 1.25,
          p: 1.2,
          borderRadius: 2,
          overflow: "auto",
          border: `1px solid ${COLORS.border}`,
          bgcolor: "#fff",
          fontSize: 12,
        },
        "& a": { color: COLORS.blue, textDecoration: "none" },
        "& a:hover": { textDecoration: "underline" },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </Box>
  );
}

function TopTabs({ active, setActive }) {
  const tabs = ["AI Assistant", "Chat History"];

  return (
    <Box sx={{ width: "100%", bgcolor: COLORS.topBarBg }}>
      <Box sx={{ width: "min(1200px, 96vw)", mx: "auto", px: 2, pt: 2.5 }}>
        <Stack direction="row" spacing={3.5} alignItems="flex-end">
          {tabs.map((t) => {
            const isActive = active === t;
            return (
              <Box
                key={t}
                onClick={() => setActive(t)}
                sx={{ cursor: "pointer", position: "relative", pb: 1.6 }}
              >
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? "rgba(15,23,42,0.92)" : "rgba(15,23,42,0.45)",
                  }}
                >
                  {t}
                </Typography>

                {isActive && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      bottom: 0,
                      height: 3,
                      width: 80,
                      borderRadius: 999,
                      bgcolor: COLORS.blue,
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>
      <Divider sx={{ borderColor: "rgba(226,232,240,0.9)" }} />
    </Box>
  );
}

function SuggestedChips({ suggestions, onPick, disabled }) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) return null;

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: "wrap", rowGap: 1 }}>
      {suggestions.slice(0, 8).map((s, idx) => (
        <Chip
          key={`${s}-${idx}`}
          label={String(s)}
          onClick={() => !disabled && onPick && onPick(String(s))}
          size="small"
          variant="outlined"
          sx={{
            borderRadius: 999,
            fontSize: 12,
            height: 28,
            borderColor: "rgba(226,232,240,1)",
            bgcolor: "rgba(248,250,252,1)",
            cursor: disabled ? "default" : "pointer",
            "&:hover": disabled
              ? {}
              : {
                  bgcolor: "rgba(191,219,254,0.45)",
                  borderColor: "rgba(37,99,235,0.35)",
                },
          }}
        />
      ))}
    </Stack>
  );
}

function CategoryPills() {
  const pills = [
    { label: "Schedules", icon: <CalendarTodayOutlinedIcon sx={{ fontSize: 18 }} /> },
    { label: "Projects", icon: <FolderOutlinedIcon sx={{ fontSize: 18 }} /> },
    { label: "Inventory", icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} /> },
    { label: "labor", icon: <GroupsOutlinedIcon sx={{ fontSize: 18 }} /> },
    { label: "Finance", icon: <AccountBalanceOutlinedIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
      {pills.map((p) => (
        <Chip
          key={p.label}
          icon={p.icon}
          label={p.label}
          variant="outlined"
          sx={{
            borderRadius: 999,
            borderColor: "rgba(226,232,240,1)",
            bgcolor: "rgba(248,250,252,1)",
            fontWeight: 700,
            px: 0.75,
            height: 36,
            "& .MuiChip-label": { fontSize: 13, fontWeight: 700 },
            "& .MuiChip-icon": { color: "rgba(15,23,42,0.60)", ml: 1 },
          }}
        />
      ))}
    </Stack>
  );
}

function HomeScreen({
  input,
  setInput,
  onAsk,
  loading,
  onExampleClick,
  quickQueries,
  quickLoading,
  roleLabel,
  paused,
  onPauseToggle,
}) {
  return (
    <Box
      sx={{
        minHeight: "calc(92vh - 64px)",
        display: "flex",
        justifyContent: "center",
        pt: 6.5,
        pb: 6,
      }}
    >
      <Stack spacing={2.4} sx={{ width: "80vw" }} alignItems="center">
        <AvenueMark size={78} />

        <Typography
          sx={{
            fontSize: 16,
            color: "rgba(15,23,42,0.45)",
            textAlign: "center",
            maxWidth: 820,
            lineHeight: 1.7,
            fontWeight: 600,
          }}
        >
          Ask questions and get instant insights across projects, inventory, schedules, labor, and
          finance.
        </Typography>

        <Paper
          elevation={0}
          sx={{
            width: "100%",
            borderRadius: 4,
            border: `1px solid ${COLORS.border}`,
            bgcolor: "#fff",
            boxShadow: COLORS.heroShadow,
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 2.6, pt: 2.2, pb: 1.2 }}>
            <Stack direction="row" spacing={1.3} alignItems="flex-start">
              <TextField
                value={input}
                onChange={(e) => setInput(e.target.value)}
                multiline
                minRows={3}
                maxRows={7}
                placeholder="Type your question here..."
                variant="standard"
                fullWidth
                disabled={loading && paused} // ✅ freeze typing while paused (optional)
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    fontSize: 15,
                    fontWeight: 600,
                    color: "rgba(15,23,42,0.86)",
                    "& textarea::placeholder": {
                      color: "rgba(15,23,42,0.38)",
                      opacity: 1,
                    },
                  },
                }}
              />
            </Stack>
          </Box>

          <Box
            sx={{
              px: 2.6,
              pb: 2.2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            {/* <CategoryPills /> */}
            <Button
                
              >
            
              </Button>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Button
                onClick={onAsk}
                disabled={loading || !input.trim() || (loading && paused)}
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 800,
                  px: 2.4,
                  height: 44,
                  bgcolor: COLORS.blue,
                  boxShadow: "0 10px 24px rgba(37,99,235,0.28)",
                  "&:hover": { bgcolor: COLORS.blueDark },
                }}
              >
                Ask
              </Button>

              {/* ✅ pause/play while loading */}
              {loading ? (
                <Tooltip title={paused ? "Play (resume)" : "Pause"}>
                  <span>
                    <IconButton
                      onClick={() => onPauseToggle && onPauseToggle()}
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        border: `1px solid ${COLORS.border}`,
                        bgcolor: "rgba(37,99,235,0.06)",
                        color: COLORS.blue,
                      }}
                    >
                      {paused ? <PlayArrowIcon /> : <PauseIcon />}
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
            </Stack>
          </Box>

          {/* ✅ small paused banner */}
          {loading && paused ? (
            <Box sx={{ px: 2.6, pb: 2 }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${COLORS.border}`,
                  bgcolor: "rgba(15,23,42,0.03)",
                  p: 1.2,
                }}
              >
                <Typography sx={{ fontWeight: 800, color: "rgba(15,23,42,0.65)", fontSize: 13 }}>
                  Paused. The request is still running — hit Play to show the result.
                </Typography>
              </Paper>
            </Box>
          ) : null}
        </Paper>

        <Box sx={{ width: "100%", mt: 0.8 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 800,
                color: "rgba(15,23,42,0.45)",
                letterSpacing: "0.3px",
                textTransform: "uppercase",
                textAlign: "left",
              }}
            >
              Get started with an example below
            </Typography>

            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "rgba(15,23,42,0.45)" }}>
              Role: {String(roleLabel)}
            </Typography>
          </Stack>

          {quickLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: COLORS.textDim }}>
              <CircularProgress size={16} />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Loading role queries…</Typography>
            </Box>
          ) : (
            <Stack
              direction="row"
              spacing={1.8}
              sx={{ flexWrap: "wrap", justifyContent: "flex-start", rowGap: 1.8 }}
            >
              {(quickQueries || []).map((q) => (
                <Paper
                  key={`${q.id ?? "x"}::${q.question}`}
                  onClick={() => onExampleClick(q.question)}
                  elevation={0}
                  sx={{
                    cursor: "pointer",
                    width: 260,
                    p: 1.8,
                    borderRadius: 3,
                    border: `1px solid ${COLORS.border}`,
                    bgcolor: "#fff",
                    boxShadow: COLORS.softShadow,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 1,
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 16px 36px rgba(15,23,42,0.10)",
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(15,23,42,0.82)",
                      fontWeight: 700,
                      lineHeight: 1.35,
                      maxWidth: 200,
                    }}
                  >
                    {q.question}
                  </Typography>

                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      border: `1px solid ${COLORS.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(15,23,42,0.55)",
                      flexShrink: 0,
                      bgcolor: "rgba(248,250,252,1)",
                    }}
                  >
                    <NorthEastIcon sx={{ fontSize: 18 }} />
                  </Box>
                </Paper>
              ))}

              {(quickQueries || []).length === 0 && (
                <Typography sx={{ color: COLORS.textDim, fontWeight: 700 }}>
                  No quick queries configured for this role.
                </Typography>
              )}
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

function UserBubble({ text }) {
  return (
    <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.25,
          borderRadius: 999,
          bgcolor: "#fff",
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 10px 25px rgba(15,23,42,0.06)",
          maxWidth: 560,
        }}
      >
        <Typography variant="body2" sx={{ color: "rgba(15,23,42,0.9)", fontWeight: 650 }}>
          {text}
        </Typography>
      </Paper>
    </Box>
  );
}

function LoadingPanel({ paused }) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        borderRadius: 4,
        bgcolor: paused ? "rgba(15,23,42,0.03)" : "#f7f7f7",
        border: `1px solid rgba(226,232,240,0.9)`,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "2px solid rgba(148,163,184,0.8)",
              bgcolor: "#fff",
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 900 }}>
            {paused ? "Paused..." : "Analyzing data..."}
          </Typography>
        </Stack>

        <Box sx={{ mt: 1.5, ml: 2 }}>
          <Box sx={{ width: 1, height: 14, bgcolor: "rgba(148,163,184,0.7)" }} />
          <Typography variant="caption" sx={{ color: COLORS.textDim, ml: 2 }}>
            {paused ? "Hit Play to show the result when it arrives" : "This may take a few seconds"}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

function SystemErrorBanner({ message }) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        borderRadius: 4,
        bgcolor: COLORS.errorBg,
        border: `1px solid ${COLORS.errorBorder}`,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          {/* <ErrorOutlineIcon sx={{ color: COLORS.errorText, mt: "2px" }} /> */}
          <Box>
            {/* <Typography variant="subtitle2" sx={{ fontWeight: 900, color: COLORS.errorText }}>
              System Errors
            </Typography> */}
            <Typography
              variant="body2"
              sx={{ color: "rgba(15,23,42,0.55)", mt: 0.5, fontWeight: 600 }}
            >
              {message || "No data found for this query. Try refining your question."}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}

function StatusChip({ value }) {
  if (!value) return <Typography variant="body2">—</Typography>;
  const v = String(value);
  return (
    <Chip
      label={v}
      size="small"
      sx={{
        borderRadius: 1,
        fontSize: 12,
        px: 0.5,
        bgcolor: "rgba(37,99,235,0.14)",
        color: COLORS.blue,
        fontWeight: 800,
      }}
    />
  );
}

// -------------------- Table Search UI --------------------
function DataTableLikeScreenshot({ rows, question, onDownloadPdf, disabled }) {
  const cols = useMemo(() => getColumns(rows), [rows]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [tableSearch, setTableSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searching, setSearching] = useState(false);

  useLayoutEffect(() => setPage(0), [rows]);

  useEffect(() => {
    setSearching(true);
    const t = setTimeout(() => {
      setDebouncedSearch(String(tableSearch || "").trim());
      setSearching(false);
    }, 180);
    return () => clearTimeout(t);
  }, [tableSearch]);

  const filteredRows = useMemo(() => {
    const all = Array.isArray(rows) ? rows : [];
    const q = String(debouncedSearch || "").trim().toLowerCase();
    if (!q) return all;

    return all.filter((r) => {
      for (const c of cols) {
        const v = r?.[c];
        if (v === null || v === undefined) continue;
        const s =
          typeof v === "string"
            ? v
            : typeof v === "number" || typeof v === "boolean"
            ? String(v)
            : (() => {
                try {
                  return JSON.stringify(v);
                } catch {
                  return String(v);
                }
              })();
        if (String(s).toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [rows, cols, debouncedSearch]);

  useEffect(() => setPage(0), [debouncedSearch]);

  const total = filteredRows?.length || 0;
  const start = page * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = useMemo(() => (filteredRows || []).slice(start, end), [filteredRows, start, end]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    const v = parseInt(e.target.value, 10);
    setRowsPerPage(Number.isFinite(v) ? v : 10);
    setPage(0);
  };

  const clearSearch = () => {
    setTableSearch("");
    setDebouncedSearch("");
    setSearching(false);
    setPage(0);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          bgcolor: "#fff",
          px: 1.5,
          py: 1.1,
          mb: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1.2,
          flexWrap: "wrap",
        }}
      >
        <TextField
          value={tableSearch}
          onChange={(e) => setTableSearch(e.target.value)}
          placeholder="Search in this table…"
          variant="standard"
          fullWidth
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon sx={{ color: "rgba(15,23,42,0.35)" }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {tableSearch ? (
                  <IconButton
                    size="small"
                    onClick={clearSearch}
                    sx={{ mr: 0.5, color: "rgba(15,23,42,0.45)" }}
                    aria-label="Clear table search"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {searching ? <CircularProgress size={14} /> : null}
              </InputAdornment>
            ),
            sx: { fontWeight: 700, color: "rgba(15,23,42,0.85)", fontSize: 14.5 },
          }}
          sx={{ minWidth: 260, flex: 1 }}
          disabled={disabled}
        />

        <Typography sx={{ fontSize: 12, fontWeight: 800, color: "rgba(15,23,42,0.45)" }}>
          Rows: {total}
        </Typography>
      </Paper>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          bgcolor: "#fff",
          overflow: "auto",
          maxHeight: "52vh",
        }}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 860 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(248,250,252,1)" }}>
              {cols.map((c) => (
                <TableCell key={c} sx={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                  {c}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {pageRows.map((r, idx) => (
              <TableRow key={`${start + idx}`} hover>
                {cols.map((c) => {
                  const val = r?.[c];
                  if (c.toLowerCase() === "status") {
                    return (
                      <TableCell key={c} sx={{ whiteSpace: "nowrap" }}>
                        <StatusChip value={val} />
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell
                      key={c}
                      sx={{ whiteSpace: "nowrap" }}
                      title={val != null ? String(val) : ""}
                    >
                      {fmt(val)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}

            {total === 0 && (
              <TableRow>
                <TableCell colSpan={Math.max(cols.length, 1)} sx={{ color: COLORS.textDim }}>
                  No rows.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50]}
          sx={{
            borderTop: `1px solid ${COLORS.border}`,
            "& .MuiTablePagination-toolbar": { px: 2 },
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
              fontWeight: 700,
              color: "rgba(15,23,42,0.65)",
            },
          }}
        />
      </TableContainer>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Tooltip title="Download PDF">
          <span>
            <IconButton
              size="small"
              disabled={disabled}
              onClick={() =>
                onDownloadPdf && onDownloadPdf({ kind: "table", cols, rows: filteredRows, question })
              }
              sx={{ border: `1px solid ${COLORS.border}` }}
            >
              <DownloadIcon fontSize="small" /> PDF
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Download CSV">
          <span>
            <IconButton
              size="small"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                generateCsvForTable({ question, cols, rows: filteredRows });
              }}
              sx={{ border: `1px solid ${COLORS.border}` }}
            >
              <DownloadIcon fontSize="small" /> CSV
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
}

function AssistantResponse({
  payload,
  question,
  onSuggestedClick,
  disabled,
  allowedSet,
  onDownloadPdf,
}) {
  const rows = useMemo(() => {
    if (Array.isArray(payload?.rows)) return payload.rows;
    if (Array.isArray(payload) && payload.every((x) => typeof x === "object")) return payload;
    return null;
  }, [payload]);

  const showError = useMemo(() => isNoDataPayload(payload), [payload]);

  const suggestions = useMemo(() => {
    const backend = getBackendSuggestions(payload);
    if (backend.length > 0) return backend.slice(0, 8);
    return fallbackRoleSuggestions(allowedSet, question, 8);
  }, [payload, allowedSet, question]);

  const msg =
    payload?.detail ||
    payload?.error ||
    payload?.message ||
    payload?.answer ||
    (showError ? "No data found." : "");

  if (showError) {
    return (
      <Box sx={{ width: "100%" }}>
        <SystemErrorBanner message={msg} />
        <SuggestedChips suggestions={suggestions} onPick={onSuggestedClick} disabled={disabled} />
      </Box>
    );
  }

  if (rows && rows.length > 0) {
    const answerText =
      (typeof payload?.answer === "string" && payload.answer.trim()) ||
      (typeof payload?.text === "string" && payload.text.trim()) ||
      "";

    return (
      <Box sx={{ width: "100%" }}>
        {answerText ? (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${COLORS.border}`,
              bgcolor: "#fff",
              p: 2.25,
              mb: 1.5,
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 900,
                color: "rgba(15,23,42,0.55)",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
                mb: 1,
              }}
            >
              Answer
            </Typography>

            <BotMarkdown>{answerText}</BotMarkdown>

            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Tooltip title="Download Answer PDF">
                <span>
                  <IconButton
                    size="small"
                    disabled={disabled}
                    onClick={() =>
                      onDownloadPdf && onDownloadPdf({ kind: "text", text: answerText, question })
                    }
                    sx={{ border: `1px solid ${COLORS.border}` }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Paper>
        ) : null}

        <DataTableLikeScreenshot
          rows={rows}
          question={question}
          onDownloadPdf={onDownloadPdf}
          disabled={disabled}
        />

        <SuggestedChips suggestions={suggestions} onPick={onSuggestedClick} disabled={disabled} />
      </Box>
    );
  }

  const text = coerceText(payload);
  if (text != null && String(text).trim()) {
    return (
      <Box sx={{ width: "100%" }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: `1px solid ${COLORS.border}`,
            bgcolor: "#fff",
            p: 2.25,
          }}
        >
          <BotMarkdown>{String(text)}</BotMarkdown>

          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Tooltip title="Download PDF">
              <span>
                <IconButton
                  size="small"
                  disabled={disabled}
                  onClick={() =>
                    onDownloadPdf && onDownloadPdf({ kind: "text", text: String(text), question })
                  }
                  sx={{ border: `1px solid ${COLORS.border}` }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Paper>

        <SuggestedChips suggestions={suggestions} onPick={onSuggestedClick} disabled={disabled} />
      </Box>
    );
  }

  const jsonText = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);

  return (
    <Box sx={{ width: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          border: `1px solid ${COLORS.border}`,
          bgcolor: "#fff",
          p: 2.25,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 12.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {jsonText}

        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Tooltip title="Download PDF">
            <span>
              <IconButton
                size="small"
                disabled={disabled}
                onClick={() =>
                  onDownloadPdf && onDownloadPdf({ kind: "text", text: String(jsonText), question })
                }
                sx={{ border: `1px solid ${COLORS.border}` }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Paper>

      <SuggestedChips suggestions={suggestions} onPick={onSuggestedClick} disabled={disabled} />
    </Box>
  );
}

/**
 * ✅ Bottom input Pause/Play:
 * - While loading: button toggles paused state (does NOT cancel fetch)
 * - While paused: disable typing/sending (optional)
 */
function BottomChatInput({ input, setInput, onSend, loading, paused, onPauseToggle }) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        borderRadius: 999,
        border: `1px solid ${COLORS.border}`,
        bgcolor: "#fff",
        boxShadow: COLORS.cardShadow,
        px: 1.25,
        py: 0.75,
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      {/* <IconButton size="small" sx={{ width: 38, height: 38, borderRadius: 999 }}>
        <AttachFileIcon fontSize="small" />
      </IconButton> */}

      <TextField
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your question here..."
        variant="standard"
        fullWidth
        multiline
        maxRows={4}
        disabled={loading && paused} // ✅ freeze typing while paused (optional)
        InputProps={{ disableUnderline: true, sx: { fontSize: 15 } }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!loading && input.trim()) onSend();
          }
        }}
      />

      <IconButton
        onClick={() => {
          if (loading) onPauseToggle && onPauseToggle();
          else onSend();
        }}
        disabled={!loading && !input.trim()}
        sx={{
          width: 42,
          height: 42,
          borderRadius: 999,
          border: `2px solid rgba(37,99,235,0.22)`,
          color: COLORS.blue,
          bgcolor: "rgba(37,99,235,0.06)",
        }}
      >
        {loading ? (paused ? <PlayArrowIcon /> : <PauseIcon />) : <ArrowForwardIcon />}
      </IconButton>
    </Paper>
  );
}

// -------------------- Chat History UI --------------------
function ChatHistoryView({ items, onDelete, onClearAll }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return items || [];
    return (items || []).filter((x) => String(x?.question || "").toLowerCase().includes(q));
  }, [items, search]);

  const thisWeek = filtered.filter((x) => isThisWeek(x?.created_at));
  const older = filtered.filter((x) => !isThisWeek(x?.created_at));

  const Row = ({ x }) => (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${COLORS.border}`,
        bgcolor: "#fff",
        boxShadow: "0 10px 26px rgba(15,23,42,0.05)",
        px: 2,
        py: 1.55,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
      }}
    >
      <Stack direction="row" spacing={1.4} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 999,
            border: `1px solid ${COLORS.border}`,
            bgcolor: "rgba(248,250,252,1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <SearchOutlinedIcon sx={{ fontSize: 18, color: "rgba(15,23,42,0.55)" }} />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              color: "rgba(15,23,42,0.90)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "65vw",
            }}
          >
            {String(x?.question || "")}
          </Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 650, color: "rgba(15,23,42,0.45)", mt: 0.3 }}>
            {formatDayTime(x?.created_at)}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
        <Tooltip title="Delete">
          <span>
            <IconButton
              onClick={() => onDelete && onDelete(x?.id)}
              size="small"
              sx={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: "1px solid rgba(239,68,68,0.25)",
                bgcolor: "rgba(239,68,68,0.08)",
                color: "rgba(239,68,68,0.95)",
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Open">
          <span>
            <IconButton
              onClick={() => setSelected(x)}
              size="small"
              sx={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: `1px solid ${COLORS.border}`,
                bgcolor: "rgba(37,99,235,0.08)",
                color: COLORS.blue,
              }}
            >
              <NorthEastIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Paper>
  );

  if (selected) {
    const q = String(selected?.question || "").trim();
    const answer = selected?.answer ?? { message: "No saved answer." };

    return (
      <Box sx={{ width: "min(1200px, 96vw)", mx: "auto", pt: 2.5, pb: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 800, color: "rgba(15,23,42,0.65)" }}>
            <span style={{ opacity: 0.55 }}>›</span> Avenue Ask{" "}
            <span style={{ opacity: 0.55 }}>›</span> History
          </Typography>

          <Button
            onClick={() => setSelected(null)}
            variant="outlined"
            sx={{ borderRadius: 999, textTransform: "none", fontWeight: 800 }}
          >
            ← Back
          </Button>
        </Stack>

        <Divider sx={{ borderColor: "rgba(226,232,240,0.9)", mb: 2 }} />

        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: `1px solid ${COLORS.border}`,
            bgcolor: "#fff",
            p: 2,
            mb: 2,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: "rgba(15,23,42,0.45)" }}>
            Question
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "rgba(15,23,42,0.90)", mt: 0.5 }}>
            {q}
          </Typography>

          <Typography sx={{ fontSize: 12, fontWeight: 650, color: "rgba(15,23,42,0.45)", mt: 1 }}>
            Asked: {formatDayTime(selected?.created_at)}
          </Typography>
        </Paper>

        <AssistantResponse
          payload={answer}
          question={q}
          disabled={false}
          allowedSet={new Set()}
          onSuggestedClick={() => {}}
          onDownloadPdf={() => {}}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "min(1200px, 96vw)", mx: "auto", pt: 2.5, pb: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, gap: 2 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 999,
            border: `1px solid ${COLORS.border}`,
            bgcolor: "#fff",
            px: 1.5,
            py: 0.5,
            display: "flex",
            alignItems: "center",
            marginLeft: 40,
            gap: 1,
            width: 600,
          }}
        >
          <SearchOutlinedIcon sx={{ color: "rgba(15,23,42,0.35)" }} />
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="standard"
            placeholder="Search"
            fullWidth
            InputProps={{
              disableUnderline: true,
              sx: { fontWeight: 650, color: "rgba(15,23,42,0.85)" },
            }}
          />
        </Paper>

        <Tooltip title="Clear all history">
          <span>
            <Button
              onClick={() => onClearAll && onClearAll()}
              variant="outlined"
              startIcon={<DeleteOutlineIcon />}
              sx={{
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 800,
                borderColor: "rgba(239,68,68,0.25)",
                color: "rgba(239,68,68,0.95)",
                bgcolor: "rgba(239,68,68,0.06)",
                "&:hover": { bgcolor: "rgba(239,68,68,0.10)" },
              }}
              disabled={(items || []).length === 0}
            >
              Clear history
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Divider sx={{ borderColor: "rgba(226,232,240,0.9)", mb: 2 }} />

      <Box sx={{ mt: 2 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: "rgba(15,23,42,0.45)", mb: 1 }}>
          This Week
        </Typography>

        <Stack spacing={1.4}>
          {(thisWeek || []).map((x) => (
            <Row key={x.id} x={x} />
          ))}
          {thisWeek.length === 0 && (
            <Typography sx={{ color: "rgba(15,23,42,0.45)", fontWeight: 650 }}>
              No history for this week.
            </Typography>
          )}
        </Stack>
      </Box>

      {older.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: "rgba(15,23,42,0.45)", mb: 1 }}>
            Older
          </Typography>
          <Stack spacing={1.4}>
            {older.map((x) => (
              <Row key={x.id} x={x} />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

function clearHistoryStorage() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
}

// -------------------- Main Component --------------------
export default function ChatBoxAi({ initialQuestion, role }) {
  const [activeTab, setActiveTab] = useState("AI Assistant");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Pause state (UI pause, NOT cancel)
  const [paused, setPaused] = useState(false);

  // ✅ if response arrives while paused, we stash it here
  const pendingAssistantRef = useRef(null); // { exchangeId, data, q }

  const [quickQueries, setQuickQueries] = useState([]);
  const [quickLoading, setQuickLoading] = useState(true);

  const [historyItems, setHistoryItems] = useState(() => pruneHistory(loadHistory()));

  const [resolvedRoles, setResolvedRoles] = useState(() => {
    const fromProp = String(role || "").trim();
    if (fromProp) return normalizeRolesList([fromProp]);

    const fromLS = readLocalStorageRolesArray();
    const normalized = normalizeRolesList(fromLS);
    return normalized.length ? normalized : ["ADMIN"];
  });

  useEffect(() => {
    const fromProp = String(role || "").trim();
    if (fromProp) setResolvedRoles(normalizeRolesList([fromProp]));
  }, [role]);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e) return;
      if (e.key === "roles" || e.key === "role" || e.key === "user_role" || e.key === "userRole") {
        const next = normalizeRolesList(readLocalStorageRolesArray());
        setResolvedRoles(next.length ? next : ["ADMIN"]);
      }
      if (e.key === HISTORY_KEY) {
        setHistoryItems(pruneHistory(loadHistory()));
      }
    };
    window.addEventListener("storage", onStorage);

    const pruned = pruneHistory(loadHistory());
    saveHistory(pruned);
    setHistoryItems(pruned);

    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const roleLabel = useMemo(() => prettyRolesLabel(resolvedRoles), [resolvedRoles]);
  const apiRole = useMemo(() => pickEffectiveRoleForApi(resolvedRoles), [resolvedRoles]);

  const scrollContainerRef = useRef(null);
  const endRef = useRef(null);
  const lastInitialIdRef = useRef(null);

  const pushMessage = useCallback((msgRole, payload) => {
    setMessages((m) => [
      ...m,
      {
        id: Date.now().toString() + Math.random(),
        role: msgRole,
        payload,
        ts: new Date().toISOString(),
      },
    ]);
  }, []);

  const allowedSet = useMemo(() => {
    const set = new Set();
    (quickQueries || []).forEach((q) => q?.question && set.add(String(q.question).trim()));
    return set;
  }, [quickQueries]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function loadQuickQueriesUnion() {
      setQuickLoading(true);
      setQuickQueries([]);

      try {
        const rolesToFetch =
          Array.isArray(resolvedRoles) && resolvedRoles.length ? resolvedRoles : ["ADMIN"];

        const results = await Promise.all(
          rolesToFetch.map(async (r) => {
            const usp = new URLSearchParams({ role: String(r) });
            const url = `${TEST_API_BASE}/quickqueries?${usp.toString()}`;

            const res = await fetch(url, { signal: controller.signal });
            const data = await safeJson(res);

            const list = Array.isArray(data?.queries) ? data.queries : [];
            return list
              .map((x) => ({
                id: x?.id,
                question: String(x?.question || "").trim(),
                _role: r,
              }))
              .filter((x) => x.question);
          })
        );

        const merged = [];
        const seen = new Set();
        for (const arr of results) {
          for (const q of arr || []) {
            const key = q.question;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(q);
          }
        }

        if (alive) setQuickQueries(merged);
      } catch (e) {
        if (e?.name !== "AbortError") console.error("❌ quickqueries failed:", e);
        if (alive) setQuickQueries([]);
      } finally {
        if (alive) setQuickLoading(false);
      }
    }

    loadQuickQueriesUnion();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [resolvedRoles]);

  useLayoutEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, loading, paused]);

  // ---- History updaters ----
  const upsertHistoryItem = useCallback((item) => {
    setHistoryItems((prev) => {
      const next = pruneHistory(prev || []);
      const idx = next.findIndex((x) => x?.id === item?.id);
      if (idx >= 0) next[idx] = { ...next[idx], ...item };
      else next.unshift(item);
      const pruned = pruneHistory(next);
      saveHistory(pruned);
      return pruned;
    });
  }, []);

  const deleteHistoryItem = useCallback((id) => {
    setHistoryItems((prev) => {
      const next = pruneHistory((prev || []).filter((x) => x?.id !== id));
      saveHistory(next);
      return next;
    });
  }, []);

  const clearCurrentChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setLoading(false);
    setPaused(false);
    pendingAssistantRef.current = null;
  }, []);

  const clearAllHistory = useCallback(() => {
    const ok = window.confirm("Clear all chat history? This cannot be undone.");
    if (!ok) return;

    clearHistoryStorage();
    setHistoryItems([]);
  }, []);

  // ✅ pause/play toggle:
  // - pause: just flips state (does NOT cancel request)
  // - play: if response already arrived, flush it
  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  // ✅ When unpausing, if we have a pending assistant response, flush it now
  useEffect(() => {
    if (!paused && pendingAssistantRef.current) {
      const { exchangeId, data } = pendingAssistantRef.current;

      pushMessage("assistant", data);
      upsertHistoryItem({
        id: exchangeId,
        status: "done",
        completed_at: nowISO(),
        answer: data,
      });

      pendingAssistantRef.current = null;
      setLoading(false);
    }
  }, [paused, pushMessage, upsertHistoryItem]);

  const sendQuestion = useCallback(
    async (question) => {
      const q = (question || "").trim();
      if (!q || loading) return;

      const exchangeId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      upsertHistoryItem({
        id: exchangeId,
        question: q,
        role: String(apiRole || "ADMIN"),
        created_at: nowISO(),
        status: "pending",
        answer: null,
      });

      pushMessage("user", q);
      setInput("");
      setLoading(true);
      setPaused(false);
      pendingAssistantRef.current = null;

      try {
        const usp = new URLSearchParams({
          question: q,
          role: String(apiRole || "ADMIN"),
        });

        const url = `${TEST_API_BASE}/askquery?${usp.toString()}`;
        const res = await fetch(url);
        let data = await safeJson(res);

        if (data && typeof data === "object" && !Array.isArray(data)) {
          data = { ...data, _role: apiRole };
        }

        // ✅ if paused, stash response and wait for Play
        if (paused) {
          pendingAssistantRef.current = { exchangeId, data, q };
          // keep loading=true so UI still shows "paused/loading"
          return;
        }

        // normal flow
        pushMessage("assistant", data);
        upsertHistoryItem({
          id: exchangeId,
          status: "done",
          completed_at: nowISO(),
          answer: data,
        });
      } catch (e) {
        const errPayload = { error: true, detail: String(e) };

        if (paused) {
          pendingAssistantRef.current = { exchangeId, data: errPayload, q };
          return;
        }

        pushMessage("assistant", errPayload);
        upsertHistoryItem({
          id: exchangeId,
          status: "error",
          completed_at: nowISO(),
          answer: errPayload,
        });
      } finally {
        // ✅ If paused and response is stashed, we keep loading=true until resume
        if (!paused && !pendingAssistantRef.current) setLoading(false);
      }
    },
    [loading, pushMessage, apiRole, upsertHistoryItem, paused]
  );

  useEffect(() => {
    const id = initialQuestion?.id;
    const text = (initialQuestion?.text || "").trim();
    if (!id || !text) return;
    if (lastInitialIdRef.current === id) return;
    lastInitialIdRef.current = id;
    sendQuestion(text);
  }, [initialQuestion, sendQuestion]);

  const hasMessages = messages.length > 0;

  const handleAsk = useCallback(() => {
    if (!input.trim()) return;
    sendQuestion(input);
  }, [input, sendQuestion]);

  const handleExampleClick = useCallback(
    (ex) => {
      setInput("");
      sendQuestion(ex);
    },
    [sendQuestion]
  );

  const prevUserForIndex = useCallback(
    (idx) => {
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") return String(messages[i].payload || "");
      }
      return "";
    },
    [messages]
  );

  const handleDownloadPdf = useCallback(async (info) => {
    try {
      if (!info) return;

      if (info.kind === "table" && info.cols && info.rows) {
        generatePdfForTable({ question: info.question, cols: info.cols, rows: info.rows });
        return;
      }

      if (info.kind === "text") {
        generatePdfForText({ question: info.question, text: info.text || "" });
        return;
      }
    } catch (e) {
      console.error("PDF download failed:", e);
    }
  }, []);

  return (
    <Box sx={{ minHeight: "92vh", bgcolor: COLORS.pageBg }}>
      <TopTabs active={activeTab} setActive={setActiveTab} />

      {activeTab === "AI Assistant" ? (
        !hasMessages ? (
          <HomeScreen
            roleLabel={roleLabel}
            input={input}
            setInput={setInput}
            onAsk={handleAsk}
            loading={loading}
            paused={paused}
            onPauseToggle={togglePause}
            onExampleClick={handleExampleClick}
            quickQueries={quickQueries}
            quickLoading={quickLoading}
          />
        ) : (
          <Box sx={{ width: "100%", display: "flex", justifyContent: "center", pt: 3, pb: 3 }}>
            <Paper
              elevation={0}
              sx={{
                width: `85vw`,
                borderRadius: 4,
                border: `1px solid ${COLORS.border}`,
                bgcolor: "rgba(255,255,255,0.65)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                height: "calc(92vh - 92px)",
              }}
            >
              <Box
                sx={{
                  px: 2.25,
                  py: 1.6,
                  borderBottom: `1px solid ${COLORS.border}`,
                  bgcolor: "rgba(255,255,255,0.85)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Box
                  component="img"
                  src={AVENUE_LOGO_URL}
                  alt="Avenue Realty"
                  sx={{ width: 50, height: 50, objectFit: "contain", borderRadius: 1 }}
                />

                <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>Avenue Ask</Typography>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="Clear current chat">
                      <span>
                        <Button
                          onClick={clearCurrentChat}
                          variant="outlined"
                          startIcon={<DeleteOutlineIcon />}
                          sx={{
                            borderRadius: 999,
                            textTransform: "none",
                            fontWeight: 800,
                            borderColor: "rgba(239,68,68,0.25)",
                            color: "rgba(239,68,68,0.95)",
                            bgcolor: "rgba(239,68,68,0.06)",
                            "&:hover": { bgcolor: "rgba(239,68,68,0.10)" },
                          }}
                        >
                          Clear chat
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </Box>
              </Box>

              <Box ref={scrollContainerRef} sx={{ flex: 1, overflowY: "auto", px: 3, py: 3 }}>
                <Stack spacing={3} sx={{ width: "100%" }}>
                  {messages.map((m, i) => {
                    if (m.role === "user") return <UserBubble key={m.id} text={m.payload} />;
                    const prevQ = prevUserForIndex(i);
                    return (
                      <AssistantResponse
                        key={m.id}
                        payload={m.payload}
                        question={prevQ}
                        disabled={loading && paused} // ✅ prevent clicks while paused
                        allowedSet={allowedSet}
                        onSuggestedClick={(text) => sendQuestion(text)}
                        onDownloadPdf={handleDownloadPdf}
                      />
                    );
                  })}

                  {loading && <LoadingPanel paused={paused} />}
                  <div ref={endRef} />
                </Stack>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderTop: `1px solid ${COLORS.border}`,
                  bgcolor: "rgba(255,255,255,0.85)",
                }}
              >
                <BottomChatInput
                  input={input}
                  setInput={setInput}
                  onSend={handleAsk}
                  loading={loading}
                  paused={paused}
                  onPauseToggle={togglePause}
                />
              </Box>
            </Paper>
          </Box>
        )
      ) : activeTab === "Chat History" ? (
        <ChatHistoryView items={historyItems} onDelete={deleteHistoryItem} onClearAll={clearAllHistory} />
      ) : (
        <Box sx={{ width: "min(1200px, 96vw)", mx: "auto", pt: 3 }} />
      )}
    </Box>
  );
}