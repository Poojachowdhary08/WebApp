import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import { API_BASE } from "../config";

const formatDate = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? String(d) : x.toLocaleDateString();
};

const getEffectiveHoldDuration = (log) => {
  if (log.hold_duration != null && log.hold_duration !== "") return Number(log.hold_duration);
  if (log.hold_date && log.resume_date) {
    const start = new Date(String(log.hold_date).slice(0, 10));
    const end = new Date(String(log.resume_date).slice(0, 10));
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
      return Math.max(0, days);
    }
  }
  return null;
};

export default function EditHoldsDialog({ open, onClose, propertyId, propertyName }) {
  const [holdLogs, setHoldLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "open" | "closed"
  const [scheduleIndex, setScheduleIndex] = useState(new Map()); // scheduleid -> { status, phasename }
  const [bulkCloseSubmitting, setBulkCloseSubmitting] = useState(false);
  const [closeHoldDialog, setCloseHoldDialog] = useState({ open: false, log: null });
  const [closeHoldResumeDate, setCloseHoldResumeDate] = useState("");
  const [closeHoldReason, setCloseHoldReason] = useState("");
  const [closeHoldResumedBy, setCloseHoldResumedBy] = useState("");
  const [closeHoldSubmitting, setCloseHoldSubmitting] = useState(false);
  const [alsoResumeSchedule, setAlsoResumeSchedule] = useState(true);

  const isAdmin = (() => {
    try {
      const roleRaw = localStorage.getItem("role") || "";
      const role = roleRaw.toLowerCase();
      const roleParts = roleRaw.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
      let roles = [];
      try {
        roles = JSON.parse(localStorage.getItem("roles") || "[]");
      } catch (_) {}
      const rolesStr = Array.isArray(roles) ? roles.map((r) => String(r || "").toLowerCase()) : [];
      const allRoleStrings = [role, ...roleParts, ...rolesStr];
      return allRoleStrings.some((r) => r === "admin" || r.includes("admin"));
    } catch {
      return false;
    }
  })();

  const currentUserEmail = localStorage.getItem("email") || "anonymous@system";

  const fetchScheduleIndex = useCallback(async () => {
    if (!propertyId) return;
    try {
      const res = await fetch(`${API_BASE}/properties/${propertyId}/schedule`);
      const data = await res.json();
      const sched = Array.isArray(data?.schedule) ? data.schedule : [];
      const idx = new Map();
      for (const s of sched) {
        const id = s?.scheduleid ?? s?.schedule_id;
        if (id == null) continue;
        idx.set(String(id), { status: s?.status || "", phasename: s?.phasename || "" });
      }
      setScheduleIndex(idx);
    } catch (err) {
      console.error("Failed to fetch schedule for holds dialog:", err);
      setScheduleIndex(new Map());
    }
  }, [propertyId]);

  const fetchHolds = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/holds/${propertyId}`);
      const data = await res.json();
      setHoldLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch hold logs:", err);
      setHoldLogs([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (open && propertyId) {
      fetchHolds();
      fetchScheduleIndex();
    }
  }, [open, propertyId, fetchHolds, fetchScheduleIndex]);

  const filteredLogs = holdLogs.filter((log) => {
    const isOpen = !log.resume_date;
    if (filter === "open") return isOpen;
    if (filter === "closed") return !isOpen;
    return true;
  });

  const enrich = (log) => {
    const key = String(log?.scheduleid ?? "");
    const sched = scheduleIndex.get(key);
    const scheduleStatus = (sched?.status || "").toLowerCase();
    const scheduleCompleted = scheduleStatus === "completed";
    const isOpen = !log.resume_date;
    const isStaleOpenHold = isOpen && scheduleCompleted;
    return { sched, isOpen, scheduleCompleted, isStaleOpenHold };
  };

  const holdDateStr = closeHoldDialog.log?.hold_date
    ? String(closeHoldDialog.log.hold_date).slice(0, 10)
    : "";
  const resumeDateValid = !holdDateStr || closeHoldResumeDate > holdDateStr; // only rule: resume date > hold date
  const minResumeDate = holdDateStr
    ? (() => {
        const d = new Date(holdDateStr + "T12:00:00");
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
      })()
    : "";

  const handleCloseHoldSubmit = async () => {
    const log = closeHoldDialog.log;
    if (!resumeDateValid) {
      alert("Resume date must be after hold date (e.g. if hold is 3 Jan, use 4 Jan or later).");
      return;
    }
    const canClose =
      log &&
      closeHoldResumeDate.trim() &&
      closeHoldReason.trim() &&
      closeHoldResumedBy.trim() &&
      (log.hold_id || (log.scheduleid != null && propertyId));
    if (!canClose) {
      alert("Please fill Resume date, Resume reason, and Resumed by.");
      return;
    }
    setCloseHoldSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("resume_date_str", closeHoldResumeDate.trim());
      formData.append("resume_reason", closeHoldReason.trim());
      formData.append("resumed_by_email", closeHoldResumedBy.trim());
      const hasScheduleRef = log?.scheduleid != null && propertyId;

      let res;
      if (alsoResumeSchedule && hasScheduleRef) {
        // Close hold + shift schedule (same logic as /resume-schedule), but with manual resume_date.
        const fd = new FormData();
        fd.append("scheduleid", String(log.scheduleid));
        fd.append("propertyid", String(propertyId));
        fd.append("resume_date_str", closeHoldResumeDate.trim());
        fd.append("resume_reason", closeHoldReason.trim());
        fd.append("resumed_by_email", closeHoldResumedBy.trim());
        res = await fetch(`${API_BASE}/close-hold-resume-schedule`, { method: "POST", body: fd });
      } else {
        // Log-only close (manual entry).
        if (log.hold_id) {
          formData.append("hold_id", log.hold_id);
        } else {
          formData.append("scheduleid", String(log.scheduleid));
          formData.append("propertyid", propertyId);
        }
        res = await fetch(`${API_BASE}/close-hold`, { method: "POST", body: formData });
      }

      const data = await res.json();
      if (res.ok) {
        setCloseHoldDialog({ open: false, log: null });
        setCloseHoldResumeDate("");
        setCloseHoldReason("");
        setCloseHoldResumedBy("");
        await fetchHolds();
        await fetchScheduleIndex();
      } else {
        alert(data.detail || "Failed to close hold.");
      }
    } catch (err) {
      console.error("Close hold error:", err);
      alert("Failed to close hold. Please try again.");
    } finally {
      setCloseHoldSubmitting(false);
    }
  };

  const todayStr = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };

  const openCloseHoldDialogPrefilled = (log, { resumeReason }) => {
    setCloseHoldDialog({ open: true, log });
    const holdStr = log?.hold_date ? String(log.hold_date).slice(0, 10) : "";
    const minResume = holdStr
      ? (() => {
          const d = new Date(holdStr + "T12:00:00");
          d.setDate(d.getDate() + 1);
          return d.toISOString().slice(0, 10);
        })()
      : "";
    const today = todayStr();
    setCloseHoldResumeDate(minResume && today <= holdStr ? minResume : today);
    setCloseHoldReason(resumeReason || "");
    setCloseHoldResumedBy(currentUserEmail);
    setAlsoResumeSchedule(true);
  };

  const openCount = holdLogs.filter((l) => !l.resume_date).length;
  const closedCount = holdLogs.length - openCount;
  const staleOpenHolds = holdLogs.filter((l) => enrich(l).isStaleOpenHold);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { minHeight: "70vh" } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EditIcon color="action" />
            <span>Edit holds</span>
            {propertyName && (
              <Chip size="small" label={propertyName} sx={{ ml: 1 }} />
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchHolds} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {!propertyId ? (
            <Typography color="text.secondary">No property selected.</Typography>
          ) : (
            <>
              <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ mb: 2 }}>
                <Tab label={`All (${holdLogs.length})`} value="all" />
                <Tab label={`Open (${openCount})`} value="open" />
                <Tab label={`Closed (${closedCount})`} value="closed" />
              </Tabs>
              
              {isAdmin && staleOpenHolds.length > 0 && (
                <Box
                  sx={{
                    mb: 2,
                    p: 1.25,
                    borderRadius: 2,
                    border: "1px solid rgba(2,132,199,0.25)",
                    background: "rgba(2,132,199,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {staleOpenHolds.length} stale open hold(s) detected (phase already completed).
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    color="info"
                    disabled={bulkCloseSubmitting}
                    onClick={async () => {
                      // We intentionally avoid auto-closing (no silent resume date).
                      // Admin should pick/confirm resume date + reason in the close dialog.
                      const first = staleOpenHolds[0];
                      if (!first) return;
                      setFilter("open");
                      openCloseHoldDialogPrefilled(first, {
                        resumeReason: "Auto-close stale hold (phase completed)",
                      });
                    }}
                    sx={{ fontWeight: 900, borderRadius: 2 }}
                  >
                    Review stale holds
                  </Button>
                </Box>
              )}

              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={120}>
                  <CircularProgress />
                </Box>
              ) : filteredLogs.length === 0 ? (
                <Typography color="text.secondary">No holds match the selected filter.</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Phase</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Hold date</strong></TableCell>
                        <TableCell><strong>Resume date</strong></TableCell>
                        <TableCell><strong>Duration</strong></TableCell>
                        <TableCell><strong>Reason</strong></TableCell>
                        <TableCell><strong>By</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        {isAdmin && <TableCell align="right"><strong>Actions</strong></TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredLogs.map((log, idx) => {
                        const { isOpen, isStaleOpenHold } = enrich(log);
                        return (
                          <TableRow key={log.hold_id || idx} hover>
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                <span>{log.phasename || "—"}</span>
                                {isStaleOpenHold && (
                                  <Chip
                                    size="small"
                                    label="Stale (phase completed)"
                                    color="info"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>{log.hold_type || "—"}</TableCell>
                            <TableCell>{formatDate(log.hold_date)}</TableCell>
                            <TableCell>{formatDate(log.resume_date)}</TableCell>
                            <TableCell>
                              {(() => {
                                const d = getEffectiveHoldDuration(log);
                                return d == null ? "—" : (d === 0 ? "Same day" : `${d} day(s)`);
                              })()}
                            </TableCell>
                            <TableCell sx={{ maxWidth: 200 }} title={log.hold_reason}>
                              {log.hold_reason ? (log.hold_reason.length > 40 ? `${log.hold_reason.slice(0, 40)}…` : log.hold_reason) : "—"}
                            </TableCell>
                            <TableCell>{log.hold_by_email || "—"}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={isOpen ? "Open" : "Closed"}
                                color={isOpen ? "warning" : "default"}
                                variant={isOpen ? "filled" : "outlined"}
                              />
                            </TableCell>
                            {isAdmin && (
                              <TableCell align="right">
                                {isOpen && (
                                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
                                    {isStaleOpenHold && (
                                      <Button
                                        size="small"
                                        variant="contained"
                                        color="info"
                                        onClick={() =>
                                          openCloseHoldDialogPrefilled(log, {
                                            resumeReason: "Auto-close stale hold (phase completed)",
                                          })
                                        }
                                      >
                                        Close stale…
                                      </Button>
                                    )}
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="warning"
                                      onClick={() => openCloseHoldDialogPrefilled(log, { resumeReason: "" })}
                                    >
                                      Close hold
                                    </Button>
                                  </Box>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Done</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={closeHoldDialog.open}
        onClose={() => !closeHoldSubmitting && setCloseHoldDialog({ open: false, log: null })}
      >
        <DialogTitle>Manual resume entry</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the resume details for this hold.
          </Typography>
          {closeHoldDialog.log && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              <b>Phase: {closeHoldDialog.log.phasename}</b>
              {holdDateStr && ` · Hold date: ${holdDateStr}`}
            </Typography>
          )}
          <TextField
            label="Resume date"
            type="date"
            fullWidth
            required
            value={closeHoldResumeDate}
            onChange={(e) => setCloseHoldResumeDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: minResumeDate }}
            error={!resumeDateValid && !!closeHoldResumeDate}
            helperText={!resumeDateValid && !!closeHoldResumeDate ? "Resume date must be after hold date (e.g. if hold is 3 Jan, use 4 Jan or later)." : null}
            sx={{ mb: 2, minWidth: 360 }}
          />
          <TextField
            label="Resume reason"
            fullWidth
            multiline
            rows={3}
            required
            placeholder="e.g. Phase completed without formal resume; technical workaround"
            value={closeHoldReason}
            onChange={(e) => setCloseHoldReason(e.target.value)}
            sx={{ mb: 2, minWidth: 360 }}
          />
          <TextField
            label="Resumed by (email)"
            fullWidth
            type="email"
            required
            placeholder="email@example.com"
            value={closeHoldResumedBy}
            onChange={(e) => setCloseHoldResumedBy(e.target.value)}
            sx={{ minWidth: 360 }}
          />
          {!!closeHoldDialog.log?.scheduleid && !!propertyId && (
            <FormControlLabel
              sx={{ mt: 1.5 }}
              control={
                <Checkbox
                  checked={alsoResumeSchedule}
                  onChange={(e) => setAlsoResumeSchedule(e.target.checked)}
                />
              }
              label="Also resume schedule (shift downstream dates)"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseHoldDialog({ open: false, log: null })} disabled={closeHoldSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleCloseHoldSubmit}
            disabled={
              closeHoldSubmitting ||
              !closeHoldResumeDate.trim() ||
              !closeHoldReason.trim() ||
              !closeHoldResumedBy.trim() ||
              !resumeDateValid
            }
          >
            {closeHoldSubmitting ? "Saving…" : "Save resume"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
