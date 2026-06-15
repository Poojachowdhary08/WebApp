// src/pages/NotificationsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Chip,
  Grid,
  useTheme,
  CircularProgress,
  Button,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import NumbersOutlinedIcon from "@mui/icons-material/NumbersOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";

const API_URL = "http://localhost:8080/alerts";

/* ---------- tiny helpers ---------- */
function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const m = Math.floor((now - d) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dY = Math.floor(h / 24);
  if (dY < 7) return `${dY}d ago`;
  return d.toLocaleString();
}

function chipColorByType(type) {
  switch (String(type || "").toUpperCase()) {
    case "BELOW_MIN":
      return "error";
    case "BELOW_THRESHOLD":
      return "warning";
    case "AT_15_PERCENT":
      return "info";
    default:
      return "default";
  }
}

function leftStripeColor(theme, type) {
  const c = chipColorByType(type);
  const map = {
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
    default: theme.palette.divider,
  };
  return map[c] || theme.palette.divider;
}

/* ---------- component ----------
   Props:
     - onClose?: () => void
     - title?: string
     - fetchInside?: boolean (default true)
     - alerts?: array (used when fetchInside === false)
     - compact?: boolean (default true) (tight padding for Drawer)
     - onOpenItemDetails?: (payload) => void
*/
export default function NotificationsPage({
  onClose,
  title = "Notifications",
  fetchInside = true,
  alerts: externalAlerts = [],
  compact = true,
  onOpenItemDetails,
}) {
  const theme = useTheme();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [alerts, setAlerts] = useState([]);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("auth_token");

      const res = await fetch(API_URL, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.alerts)
        ? data.alerts
        : [];
      setAlerts(list);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchInside) doFetch();
  }, [fetchInside, doFetch]);

  const items = useMemo(() => {
    const src = fetchInside ? alerts : externalAlerts;
    return (src || [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.generated_at || b.created_at || 0) -
          new Date(a.generated_at || a.created_at || 0)
      );
  }, [alerts, externalAlerts, fetchInside]);

  const handleOpenDetails = useCallback(
    (a) => {
      if (!onOpenItemDetails) return;

      const itemId =
        a?.item_id ??
        a?.master_item_id ??
        a?.masterItemId ??
        a?.itemId ??
        a?.item?.id ??
        a?.id;

      const payload = {
        id: itemId,
        item_name: a?.item_name || a?.item?.item_name || "",
        item_type: a?.item_type || a?.item?.item_type || "",
        base_price: a?.base_price ?? a?.item?.base_price ?? null,
        __alert: a,
      };

      onOpenItemDetails(payload);
    },
    [onOpenItemDetails]
  );

  const clickable = !!onOpenItemDetails;

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#FFFFFF",
        width:"400px",

      }}
    >
      {/* ✅ STICKY HEADER (close ALWAYS visible) */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
          px: compact ? 2 : 3,
          py: 1.5,
          marginTop:"65px",
          width:"350px",


        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Stack spacing={0.25}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#111827", lineHeight: 1.1 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {loading ? "Refreshing…" : err ? "Failed to refresh" : `${items.length} alert(s)`}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.75}>
            {fetchInside && (
              <Tooltip title="Refresh">
                <span>
                  <IconButton
                    onClick={doFetch}
                    disabled={loading}
                    size="small"
                    sx={{
                      border: "1px solid #E5E7EB",
                      borderRadius: 2,
                      bgcolor: "#F9FAFB",
                    }}
                  >
                    {loading ? <CircularProgress size={16} /> : <RefreshRoundedIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {onClose && (
              <Tooltip title="Close">
                <IconButton
                  onClick={onClose}
                  size="small"
                  sx={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 2,
                    bgcolor: "#FFFFFF",
                  }}
                >
                  <CloseRoundedIcon />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* BODY */}
      <Box
        sx={{
          px: compact ? 2 : 3,
          py: 2,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          bgcolor: "#F8FAFC",
        }}
      >
        {/* Error */}
        {err && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              borderColor: theme.palette.error.light,
              bgcolor: "rgba(239,68,68,0.06)",
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
              <ErrorOutlineRoundedIcon sx={{ color: theme.palette.error.main, mt: 0.2 }} />
              <Box>
                <Typography sx={{ fontWeight: 800, color: theme.palette.error.main }}>
                  Failed to load alerts
                </Typography>
                <Typography variant="body2" sx={{ color: "#6B7280" }}>
                  {err}
                </Typography>
                {fetchInside && (
                  <Button
                    onClick={doFetch}
                    variant="contained"
                    size="small"
                    sx={{ mt: 1.25, borderRadius: 2 }}
                  >
                    Try again
                  </Button>
                )}
              </Box>
            </Stack>
          </Paper>
        )}

        {/* Empty */}
        {!err && !loading && items.length === 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 2,
              borderColor: "#E5E7EB",
              bgcolor: "#FFFFFF",
            }}
          >
            <Stack spacing={1} alignItems="center">
              <NotificationsNoneRoundedIcon sx={{ fontSize: 34, color: "#94A3B8" }} />
              <Typography sx={{ fontWeight: 900, color: "#111827" }}>
                No alerts
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                You’re all clear. (Enjoy it while it lasts 😄)
              </Typography>
            </Stack>
          </Paper>
        )}

        {/* List */}
        <Stack spacing={1.25}>
          {items.map((a, idx) => {
            const when = formatWhen(a.generated_at || a.created_at || a.createdAt || a.timestamp);
            const sev = chipColorByType(a.alert_type);
            const id = a.id ?? idx;

            const isActive = a.is_active;

            const loc = [a.location, a.warehouse ? `WH: ${a.warehouse}` : ""]
              .filter(Boolean)
              .join(" • ");

            const qty = [
              `Avail: ${a.available_quantity ?? "—"}`,
              `Min: ${a.minimum_quantity ?? "—"}`,
              `Thresh: ${a.threshold_quantity ?? "—"}`,
            ].join(" • ");

            return (
              <Paper
                key={id}
                variant="outlined"
                onClick={() => clickable && handleOpenDetails(a)}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (!clickable) return;
                  if (e.key === "Enter" || e.key === " ") handleOpenDetails(a);
                }}
                sx={(theme) => ({
                  borderRadius: 2,
                  overflow: "hidden",
                  position: "relative",
                  p: 1.5,
                  pl: 2.25,
                  width:"350px",
                  cursor: clickable ? "pointer" : "default",
                  outline: "none",
                  bgcolor: "#FFFFFF",

                  "&:before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 5,
                    backgroundColor: leftStripeColor(theme, a.alert_type),
                  },

                  transition: "box-shadow 0.2s, border-color 0.2s, transform 0.05s",
                  "&:hover": {
                    boxShadow: theme.shadows[2],
                    borderColor: theme.palette.grey[300],
                  },
                  "&:active": clickable ? { transform: "scale(0.998)" } : undefined,
                })}
              >
                {/* Top row */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                  <Stack spacing={0.4} sx={{ minWidth: 80 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                      <Chip
                        size="small"
                        label={isActive ? "ACTIVE" : "RESOLVED"}
                        color={isActive ? "primary" : "default"}
                        variant={isActive ? "filled" : "outlined"}
                        sx={{ height: 22, fontWeight: 800 }}
                      />

                      <Chip
                        size="small"
                        label={(a.alert_type || "ALERT").replaceAll("_", " ")}
                        color={sev}
                        variant="outlined"
                        sx={{ height: 22, fontWeight: 800 }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                      <Inventory2OutlinedIcon sx={{ fontSize: 18, color: "#64748B" }} />
                      <Typography
                        sx={{
                          fontWeight: 900,
                          color: "#0F172A",
                          fontSize: 14,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={a.item_name || "Item"}
                      >
                        {a.item_name || "Item"}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mt: 0.25 }}>
                    {when}
                  </Typography>
                </Stack>

                <Divider sx={{ my: 1.25 }} />

                {/* Details */}
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <PlaceOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">
                        {loc ? `Location: ${loc}` : "Location: —"}
                      </Typography>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <NumbersOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">
                        {`Quantities: ${qty}`}
                      </Typography>
                    </Stack>
                  </Grid>

                  {clickable && (
                    <Grid item xs={12}>
                      <Typography
                        variant="caption"
                        sx={{ color: theme.palette.primary.main, fontWeight: 800 }}
                      >
                        Open item details →
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
