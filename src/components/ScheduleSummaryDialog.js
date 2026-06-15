import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Box,
  Paper,
  Button,
  TextField,
  TablePagination,
} from "@mui/material";
import EditHoldsDialog from "./EditHoldsDialog";

const parseFlexibleDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  const s = String(value).trim();
  if (!s) return null;

  // If browser can parse it directly (often true for ISO strings
  // and sometimes for slash-formatted dates depending on locale),
  // prefer that to match the rest of the app.
  const direct = new Date(s);
  if (!isNaN(direct)) return direct;

  // Fallback for "DD/MM/YYYY" (common in this app).
  if (s.includes("/")) {
    const [dd, mm, yyyy] = s.split("/");
    if (!dd || !mm || !yyyy) return null;
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return isNaN(d) ? null : d;
  }

  return null;
};

const diffDaysCeil = (later, earlier) => {
  if (!later || !earlier) return 0;
  const ms = later.getTime() - earlier.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const formatShortDate = (d) => (d ? d.toLocaleDateString("en-GB") : "—");

const ScheduleSummaryDialog = ({
  open,
  onClose,
  nodes = [],
  schedule = [],
  holdLogs = [],
  projectMeta = {},
  propertyMeta = {},
}) => {
  const [tickets, setTickets] = React.useState([]);
  const [ticketError, setTicketError] = React.useState(null);
  const [manageHoldsOpen, setManageHoldsOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [delaySearch, setDelaySearch] = useState("");
  const [delaySortConfig, setDelaySortConfig] = useState({
    key: null,
    direction: "asc",
  });

  // Pagination states
  const [delayPage, setDelayPage] = useState(0);
  const [delayRowsPerPage, setDelayRowsPerPage] = useState(5);

  const [holdPage, setHoldPage] = useState(0);
  const [holdRowsPerPage, setHoldRowsPerPage] = useState(5);

  const [ticketPage, setTicketPage] = useState(0);
  const [ticketRowsPerPage, setTicketRowsPerPage] = useState(5);

  const delayedPhases = schedule.filter(
    (s) => {
      const actual = parseFlexibleDate(s.enddate);
      const expected = parseFlexibleDate(s.exp_enddate || s.initial_enddate);
      return Boolean(actual && expected && actual > expected);
    }
  );

  const delays = delayedPhases.map((s) => {
    const actual = parseFlexibleDate(s.enddate);
    const expected = parseFlexibleDate(s.exp_enddate || s.initial_enddate);
    const delay = actual && expected ? diffDaysCeil(actual, expected) : 0;
    return { ...s, delay };
  });

  const filteredAndSortedDelays = useMemo(() => {
    let filtered = delays.filter(
      (phase) =>
        phase.phasename?.toLowerCase().includes(delaySearch.toLowerCase()) ||
        phase.status?.toLowerCase().includes(delaySearch.toLowerCase())
    );

    if (delaySortConfig.key) {
      filtered.sort((a, b) => {
        const valA = a[delaySortConfig.key];
        const valB = b[delaySortConfig.key];

        if (typeof valA === "string") {
          const aLower = valA.toLowerCase();
          const bLower = valB.toLowerCase();
          if (aLower < bLower) return delaySortConfig.direction === "asc" ? -1 : 1;
          if (aLower > bLower) return delaySortConfig.direction === "asc" ? 1 : -1;
          return 0;
        } else {
          return delaySortConfig.direction === "asc" ? valA - valB : valB - valA;
        }
      });
    }

    return filtered;
  }, [delays, delaySearch, delaySortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };
  const handleDelaySort = (key) => {
    setDelaySortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };
  
  const filteredAndSortedTickets = useMemo(() => {
    let filtered = tickets.filter(
      (ticket) =>
        ticket.issue_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.issue_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.reported_by_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key]?.toString().toLowerCase() || "";
        const valB = b[sortConfig.key]?.toString().toLowerCase() || "";
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [tickets, searchTerm, sortConfig]);

  useEffect(() => {
    if (!propertyMeta?.propertyId) return;

    fetch(`http://localhost:8080/tickets/property/${propertyMeta.propertyId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tickets");
        return res.json();
      })
      .then((data) => setTickets(data.tickets || []))
      .catch((err) => {
        console.error("❌ Error fetching tickets:", err);
        setTicketError("No tickets found or failed to load.");
      });
  }, [propertyMeta?.propertyId]);

  // Reset pagination when filters change
  useEffect(() => setDelayPage(0), [delaySearch, delaySortConfig, delays.length]);
  useEffect(() => setTicketPage(0), [searchTerm, sortConfig, tickets.length]);
  useEffect(() => setHoldPage(0), [holdLogs.length]);

  if (schedule.length === 0) return null;
  
  const isAdmin = (() => {
    try {
      const roleRaw = localStorage.getItem("role") || "";
      const role = roleRaw.toLowerCase();
      const roleParts = roleRaw
        .split(",")
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean);
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

  const totalPhases = schedule.length;
  const completedPhases = schedule.filter(
    (s) => s.status?.toLowerCase() === "completed"
  ).length;

  const holdPhaseIds = new Set(
    holdLogs
      .map((h) => h.scheduleid)
      .filter(Boolean)
      .map((id) => String(id).trim())
  );

  const holdPhases = schedule.filter((s) =>
    holdPhaseIds.has(String(s.schedule_id).trim())
  ).length;

  const totalPercentage = nodes.reduce(
    (sum, node) => sum + (node.data?.percentage || 0),
    0
  );

  const avgPercentage =
    totalPhases > 0 ? (totalPercentage / totalPhases).toFixed(1) : "0.0";

  const avgDelay = delays.length
    ? (delays.reduce((sum, d) => sum + d.delay, 0) / delays.length).toFixed(1)
    : "0.0";

  const totalHoldEntries = holdLogs.length;
  const totalHoldDays = holdLogs.reduce(
    (sum, h) => sum + (h.hold_duration || 0),
    0
  );

  const plannedStartDate = schedule
    .map((s) => parseFlexibleDate(s.exp_startdate || s.initial_startdate))
    .filter(Boolean)
    .reduce((min, d) => (d < min ? d : min), null);

  const plannedEndDate = schedule
    .map((s) => parseFlexibleDate(s.exp_enddate || s.initial_enddate))
    .filter(Boolean)
    .reduce((max, d) => (d > max ? d : max), null);

  const actualEndDates = schedule
    .filter((s) => s.enddate)
    .map((s) => parseFlexibleDate(s.enddate))
    .filter(Boolean);

  const actualEndDate = actualEndDates.length
    ? actualEndDates.reduce((max, d) => (d > max ? d : max))
    : null;

  const projectOnTrack =
    Boolean(actualEndDate && plannedEndDate && actualEndDate <= plannedEndDate);

  const projectDelayDays =
    actualEndDate && plannedEndDate
      ? Math.max(0, diffDaysCeil(actualEndDate, plannedEndDate))
      : 0;

  const projectStatusLabel =
    projectOnTrack
      ? "✅ On Track"
      : projectDelayDays > 0
        ? `❌ Delayed by ${projectDelayDays} days`
        : "❌ Delayed";

  const openCount = tickets.filter((t) => t.status?.toLowerCase() === "open").length;
  const inProgressCount = tickets.filter(
    (t) => t.status?.toLowerCase() === "in progress"
  ).length;
  const closedCount = tickets.filter(
    (t) => t.status?.toLowerCase() === "closed"
  ).length;

  const sectionCardSx = {
    p: 2,
    borderRadius: 2,
    border: "1px solid #E5E7EB",
    background: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  };

  const kpiCardSx = {
    p: 1.5,
    borderRadius: 2,
    border: "1px solid #E5E7EB",
    background: "#fff",
  };

  const tableWrapSx = {
    borderRadius: 2,
    overflow: "hidden",
    border: "1px solid #E5E7EB",
  };

  const headCellSx = {
    fontWeight: 1000,
    fontSize: 12,
    py: 1,
    whiteSpace: "nowrap",
    background: "#F9FAFB",
  };

  const bodyCellSx = {
    fontSize: 12,
    py: 0.75,
    whiteSpace: "nowrap",
  };

  const softStatusChip = (status) => {
    const s = (status || "").toLowerCase();

    let bg = "#EEF2FF";
    let fg = "#3730A3";

    if (s.includes("completed")) {
      bg = "#ECFDF5";
      fg = "#065F46";
    } else if (s.includes("in progress")) {
      bg = "#FFFBEB";
      fg = "#92400E";
    } else if (s.includes("open")) {
      bg = "#ECFDF5";
      fg = "#065F46";
    } else if (s.includes("closed")) {
      bg = "#F3F4F6";
      fg = "#374151";
    } else if (s.includes("hold") || s.includes("paused")) {
      bg = "#FEF2F2";
      fg = "#991B1B";
    }

    return (
      <Chip
        label={status || "-"}
        size="small"
        sx={{
          fontWeight: 900,
          fontSize: 11,
          bgcolor: bg,
          color: fg,
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      />
    );
  };

  // Pagination slicing
  const delaySlice = filteredAndSortedDelays.slice(
    delayPage * delayRowsPerPage,
    delayPage * delayRowsPerPage + delayRowsPerPage
  );

  const holdSlice = holdLogs.slice(
    holdPage * holdRowsPerPage,
    holdPage * holdRowsPerPage + holdRowsPerPage
  );

  const ticketSlice = filteredAndSortedTickets.slice(
    ticketPage * ticketRowsPerPage,
    ticketPage * ticketRowsPerPage + ticketRowsPerPage
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(255,255,255,1) 60%)",
          color: "#0F172A",
          py: 1.25,
          px: 2.25,
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 1000, fontSize: 16, letterSpacing: "-0.01em" }}>
              Property Schedule Summary
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 12, color: "#475569", mt: 0.25 }}>
              Planned: {formatShortDate(plannedStartDate)} → {formatShortDate(plannedEndDate)}
              {"  "}•{"  "}
              Actual End: {formatShortDate(actualEndDate)}
            </Typography>

            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
              {propertyMeta?.propertyId && (
                <Chip
                  label={`Property: ${propertyMeta.propertyId}`}
                  size="small"
                  sx={{ fontWeight: 950, bgcolor: "rgba(15,23,42,0.04)" }}
                />
              )}
              {projectMeta?.projectId && (
                <Chip
                  label={`Project: ${projectMeta.projectId}`}
                  size="small"
                  sx={{ fontWeight: 950, bgcolor: "rgba(15,23,42,0.04)" }}
                />
              )}
              <Chip
                label={projectStatusLabel}
                size="small"
                sx={{
                  fontWeight: 950,
                  bgcolor: projectOnTrack ? "rgba(16,185,129,0.14)" : "rgba(239,68,68,0.12)",
                  color: projectOnTrack ? "#065F46" : "#991B1B",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              />
            </Box>
          </Box>

          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              borderRadius: 2,
              fontWeight: 950,
              px: 2,
              bgcolor: "#0F172A",
              color: "#fff",
              boxShadow: "0 10px 24px rgba(15,23,42,0.18)",
              "&:hover": { bgcolor: "#111827" },
            }}
          >
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, background: "#F8FAFC" }}>

        {/* KPIs */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4} md={4}>
            <Paper sx={kpiCardSx}>
              <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#6B7280" }}>
                Total Phases
              </Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 1000 }}>
                {totalPhases}
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>
                Completed: {completedPhases} • On Hold: {holdPhases}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4} md={4}>
            <Paper sx={kpiCardSx}>
              <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#6B7280" }}>
                Avg Completion
              </Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 1000 }}>
                {avgPercentage}%
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>
                Avg Delay: {avgDelay} days
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4} md={4}>
            <Paper sx={kpiCardSx}>
              <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#6B7280" }}>
                Holds
              </Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 1000 }}>
                {totalHoldEntries}
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>
                Hold Days: {totalHoldDays}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tickets snapshot */}
        <Paper sx={{ ...sectionCardSx, mb: 2 }}>
          <Typography sx={{ fontWeight: 1000, fontSize: 13, mb: 1 }}>
            Tickets Snapshot
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={`Total ${tickets.length}`} sx={{ fontWeight: 900, bgcolor: "#F3F4F6" }} />
            <Chip size="small" label={`🟢 Open ${openCount}`} sx={{ fontWeight: 900, bgcolor: "#ECFDF5", color: "#065F46" }} />
            <Chip size="small" label={`🟡 In Progress ${inProgressCount}`} sx={{ fontWeight: 900, bgcolor: "#FFFBEB", color: "#92400E" }} />
            <Chip size="small" label={`🔴 Closed ${closedCount}`} sx={{ fontWeight: 900, bgcolor: "#F3F4F6", color: "#374151" }} />
          </Box>
        </Paper>

        {/* Delayed phases */}
        <Paper sx={{ ...sectionCardSx, mb: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography sx={{ fontWeight: 1000, fontSize: 14 }}>
              ⚠️ Delayed Phases
            </Typography>
            <Chip
              size="small"
              label={delays.length === 0 ? "No delays" : `${delays.length} delayed`}
              sx={{ fontWeight: 900, bgcolor: "#F3F4F6" }}
            />
          </Box>

          <TextField
            placeholder="Search delayed phases..."
            value={delaySearch}
            onChange={(e) => setDelaySearch(e.target.value)}
            fullWidth
            sx={{ my: 1.5 }}
            size="small"
          />

          {delays.length === 0 ? (
            <Typography sx={{ color: "#6B7280", fontWeight: 700 }}>
              No delayed phases.
            </Typography>
          ) : (
            <>
              <Paper sx={tableWrapSx}>
                {/* ✅ same table UI, just smaller */}
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell onClick={() => handleDelaySort("phasename")} sx={{ ...headCellSx, cursor: "pointer" }}>
                        Phase
                      </TableCell>
                      <TableCell onClick={() => handleDelaySort("exp_enddate")} sx={{ ...headCellSx, cursor: "pointer" }}>
                        Expected End
                      </TableCell>
                      <TableCell onClick={() => handleDelaySort("enddate")} sx={{ ...headCellSx, cursor: "pointer" }}>
                        Actual End
                      </TableCell>
                      <TableCell onClick={() => handleDelaySort("delay")} sx={{ ...headCellSx, cursor: "pointer" }}>
                        Delay
                      </TableCell>
                      <TableCell onClick={() => handleDelaySort("status")} sx={{ ...headCellSx, cursor: "pointer" }}>
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {delaySlice.map((s, i) => (
                      <TableRow key={`${s.schedule_id || s.scheduleid || i}-${i}`} hover>
                        <TableCell sx={bodyCellSx}>{s.phasename}</TableCell>
                        <TableCell sx={bodyCellSx}>
                          {new Date(s.exp_enddate || s.initial_enddate).toLocaleDateString()}
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          {new Date(s.enddate).toLocaleDateString()}
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Chip
                            label={`${s.delay} days`}
                            size="small"
                            sx={{
                              fontWeight: 900,
                              fontSize: 11,
                              bgcolor:
                                s.delay > 7 ? "#FEF2F2" : s.delay > 3 ? "#FFFBEB" : "#ECFDF5",
                              color:
                                s.delay > 7 ? "#991B1B" : s.delay > 3 ? "#92400E" : "#065F46",
                              border: "1px solid rgba(0,0,0,0.06)",
                            }}
                          />
                        </TableCell>
                        <TableCell sx={bodyCellSx}>{softStatusChip(s.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              <TablePagination
                component="div"
                count={filteredAndSortedDelays.length}
                page={delayPage}
                onPageChange={(e, newPage) => setDelayPage(newPage)}
                rowsPerPage={delayRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setDelayRowsPerPage(parseInt(e.target.value, 10));
                  setDelayPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </>
          )}
        </Paper>

        {/* Hold Logs */}
        <Paper sx={{ ...sectionCardSx, mb: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography sx={{ fontWeight: 1000, fontSize: 14 }}>
              ⏸️ Hold Summary
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isAdmin && propertyMeta?.propertyId && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => setManageHoldsOpen(true)}
                  sx={{ fontWeight: 900, borderRadius: 2 }}
                >
                  Manage holds
                </Button>
              )}
              <Chip
                size="small"
                label={holdLogs.length === 0 ? "No holds" : `${holdLogs.length} entries`}
                sx={{ fontWeight: 900, bgcolor: "#F3F4F6" }}
              />
            </Box>
          </Box>

          {holdLogs.length === 0 ? (
            <Typography sx={{ color: "#6B7280", fontWeight: 700 }}>
              No active or past holds.
            </Typography>
          ) : (
            <>
              <Paper sx={tableWrapSx}>
                {/* ✅ same table UI, just smaller */}
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCellSx}>Phase</TableCell>
                      <TableCell sx={headCellSx}>Type</TableCell>
                      <TableCell sx={headCellSx}>Reason</TableCell>
                      <TableCell sx={headCellSx}>Held By</TableCell>
                      <TableCell sx={headCellSx}>Days</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {holdSlice.map((h, i) => (
                      <TableRow key={`${h.scheduleid || i}-${i}`} hover>
                        <TableCell sx={bodyCellSx}>{h.phasename}</TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Chip
                            label={h.hold_type || "-"}
                            size="small"
                            sx={{
                              fontWeight: 900,
                              fontSize: 11,
                              bgcolor: "#FEF2F2",
                              color: "#991B1B",
                              border: "1px solid rgba(0,0,0,0.06)",
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ ...bodyCellSx, whiteSpace: "normal" }}>
                          {h.hold_reason}
                        </TableCell>
                        <TableCell sx={bodyCellSx}>{h.hold_by_email}</TableCell>
                        <TableCell sx={bodyCellSx}>{h.hold_duration ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              <TablePagination
                component="div"
                count={holdLogs.length}
                page={holdPage}
                onPageChange={(e, newPage) => setHoldPage(newPage)}
                rowsPerPage={holdRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setHoldRowsPerPage(parseInt(e.target.value, 10));
                  setHoldPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </>
          )}
        </Paper>

        {/* Tickets */}
        <Paper sx={sectionCardSx}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography sx={{ fontWeight: 1000, fontSize: 14 }}>
              🎫 Tickets Summary
            </Typography>
            <Chip
              size="small"
              label={ticketError ? "Failed to load" : `${tickets.length} tickets`}
              sx={{ fontWeight: 900, bgcolor: "#F3F4F6" }}
            />
          </Box>

          {ticketError ? (
            <Typography sx={{ color: "#DC2626", fontWeight: 900 }}>
              {ticketError}
            </Typography>
          ) : tickets.length === 0 ? (
            <Typography sx={{ color: "#6B7280", fontWeight: 700 }}>
              No tickets found for this property.
            </Typography>
          ) : (
            <>
              <TextField
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                sx={{ mt: 1.5, mb: 1.5 }}
                size="small"
              />

              <Paper sx={tableWrapSx}>
                {/* ✅ same table UI, just smaller */}
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell onClick={() => handleSort("issue_id")} sx={{ ...headCellSx, cursor: "pointer" }}>
                        Issue ID
                      </TableCell>
                      <TableCell onClick={() => handleSort("issue_type")} sx={{ ...headCellSx, cursor: "pointer" }}>
                        Type
                      </TableCell>
                      <TableCell onClick={() => handleSort("severity")} sx={{ ...headCellSx, cursor: "pointer" }}>
                        Severity
                      </TableCell>
                      <TableCell onClick={() => handleSort("priority")} sx={{ ...headCellSx, cursor: "pointer" }}>
                        Priority
                      </TableCell>
                      <TableCell onClick={() => handleSort("status")} sx={{ ...headCellSx, cursor: "pointer" }}>
                        Status
                      </TableCell>
                      <TableCell onClick={() => handleSort("reported_by_email")} sx={{ ...headCellSx, cursor: "pointer" }}>
                        Reported By
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {ticketSlice.map((ticket, i) => (
                      <TableRow key={`${ticket.issue_id || i}-${i}`} hover>
                        <TableCell sx={bodyCellSx}>{ticket.issue_id}</TableCell>
                        <TableCell sx={bodyCellSx}>{ticket.issue_type}</TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Chip
                            label={ticket.severity || "-"}
                            size="small"
                            sx={{
                              fontWeight: 900,
                              fontSize: 11,
                              bgcolor: "#EEF2FF",
                              color: "#3730A3",
                              border: "1px solid rgba(0,0,0,0.06)",
                            }}
                          />
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Chip
                            label={ticket.priority || "-"}
                            size="small"
                            sx={{
                              fontWeight: 900,
                              fontSize: 11,
                              bgcolor: "#F3F4F6",
                              color: "#374151",
                              border: "1px solid rgba(0,0,0,0.06)",
                            }}
                          />
                        </TableCell>
                        <TableCell sx={bodyCellSx}>{softStatusChip(ticket.status)}</TableCell>
                        <TableCell sx={bodyCellSx}>{ticket.reported_by_email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              <TablePagination
                component="div"
                count={filteredAndSortedTickets.length}
                page={ticketPage}
                onPageChange={(e, newPage) => setTicketPage(newPage)}
                rowsPerPage={ticketRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setTicketRowsPerPage(parseInt(e.target.value, 10));
                  setTicketPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </>
          )}


        </Paper>
      </DialogContent>
      
      <EditHoldsDialog
        open={manageHoldsOpen}
        onClose={() => setManageHoldsOpen(false)}
        propertyId={propertyMeta?.propertyId}
        propertyName={propertyMeta?.propertyName || propertyMeta?.name}
      />
    </Dialog>
  );
};

export default ScheduleSummaryDialog;
