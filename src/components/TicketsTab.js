// src/components/TicketsTab.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  TablePagination,
  Grid,
  Paper,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

const COLORS = {
  badgeOpen: "#22C55E",
  badgeClosed: "#6B7280",
  priorityHigh: "#DC2626",
  priorityMedium: "#D97706",
  priorityLow: "#059669",
};

const CARDS_PER_PAGE = 12;

const statusChipStyle = (status) => {
  let bg = "#E5E7EB";
  let color = "#374151";

  if (String(status).toLowerCase() === "open") {
    bg = "rgba(34, 197, 94, 0.12)";
    color = COLORS.badgeOpen;
  } else if (String(status).toLowerCase() === "closed") {
    bg = "rgba(107, 114, 128, 0.12)";
    color = COLORS.badgeClosed;
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    px: 1.5,
    py: 0.55,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    backgroundColor: bg,
    color,
    letterSpacing: 0.6,
  };
};

const priorityBadgeStyle = (priority) => {
  const p = String(priority || "").toLowerCase();
  let bg = "rgba(107,114,128,0.12)";
  let color = "#6B7280";

  if (p === "high") {
    bg = "rgba(220,38,38,0.10)";
    color = COLORS.priorityHigh;
  } else if (p === "medium") {
    bg = "rgba(217,119,6,0.10)";
    color = COLORS.priorityMedium;
  } else if (p === "low") {
    bg = "rgba(5,150,105,0.10)";
    color = COLORS.priorityLow;
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 78,
    px: 1.4,
    py: 0.5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    backgroundColor: bg,
    color,
    letterSpacing: 0.6,
  };
};

const priorityCellStyle = (priority) => {
  const base = { fontSize: 13, fontWeight: 500 };
  if (!priority) return base;

  const p = String(priority).toLowerCase();
  if (p === "high") return { ...base, color: COLORS.priorityHigh };
  if (p === "medium") return { ...base, color: COLORS.priorityMedium };
  if (p === "low") return { ...base, color: COLORS.priorityLow };
  return base;
};

const formatDate = (raw) => {
  if (!raw) return "-";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB");
};

const labelValue = (label, value) => (
  <Box sx={{ minWidth: 120 }}>
    <Typography sx={{ fontSize: 12, color: "#6B7280", mb: 0.3 }}>{label}</Typography>
    <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{value}</Typography>
  </Box>
);

export default function TicketsTab({ search, onOpenTicketDetails, viewMode = "list" }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reset to first page when search changes or view changes
  useEffect(() => {
    setPage(0);
  }, [search, viewMode]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const resp = await axios.get("http://localhost:8080/tickets/all");
      setTickets(resp.data.tickets || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Failed to load tickets");
      setLoading(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (t.issue_id || "").toLowerCase().includes(q) ||
        (t.ticket_title || "").toLowerCase().includes(q) ||
        (t.project_id || "").toLowerCase().includes(q) ||
        (t.property_id || "").toLowerCase().includes(q) ||
        (t.issue_type || "").toLowerCase().includes(q) ||
        (t.priority || "").toLowerCase().includes(q) ||
        (t.status || "").toLowerCase().includes(q) ||
        (t.reported_by_name || "").toLowerCase().includes(q) ||
        (t.reported_by || "").toLowerCase().includes(q)
      );
    });
  }, [tickets, search]);

  // ✅ pagination logic: cards fixed to 12, list uses rowsPerPage
  const paginatedTickets = useMemo(() => {
    const effectiveRowsPerPage = viewMode === "cards" ? CARDS_PER_PAGE : rowsPerPage;
    const start = page * effectiveRowsPerPage;
    return filteredTickets.slice(start, start + effectiveRowsPerPage);
  }, [filteredTickets, page, rowsPerPage, viewMode]);

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    const value = parseInt(event.target.value, 10);
    setRowsPerPage(value);
    setPage(0);
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#F3F4F6",
          borderRadius: 3,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "error.main",
          bgcolor: "#F3F4F6",
          borderRadius: 3,
        }}
      >
        <Typography variant="body1">Error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "calc(100vh - 280px)",
        bgcolor: "#F3F4F6",
        borderRadius: 3,
        p: 2,
      }}
    >
      {/* ================= LIST VIEW ================= */}
      {viewMode === "list" && (
        <Card
          sx={{
            borderRadius: 2,
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
            border: "1px solid #F3F4F6",
            bgcolor: "#FFFFFF",
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Table
              size="small"
              sx={{
                borderCollapse: "separate",
                borderSpacing: 0,
                "& th, & td": {
                  borderRight: "1px solid #E5E7EB",
                  borderBottom: "1px solid #E5E7EB",
                },
                "& th:last-of-type, & td:last-of-type": {
                  borderRight: "none",
                },
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    "& th": {
                      backgroundColor: "#F9FAFB",
                      fontWeight: 600,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  <TableCell>Issue ID</TableCell>
                  <TableCell>Property</TableCell>
                  <TableCell>Issue Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Reported By</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedTickets.map((t) => {
                  const reportedBy =
                    t.reported_by_name || t.reported_by || t.created_by_name || t.created_by || "-";

                  const rawCreated = t.created_at || t.created_date || t.created_on || null;
                  const createdDateStr = formatDate(rawCreated);

                  return (
                    <TableRow
                      key={t.issue_id}
                      hover
                      onClick={() => onOpenTicketDetails?.(t.issue_id)}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { backgroundColor: "#F3F4F6 !important" },
                        "& td": { fontSize: 13 },
                      }}
                    >
                      <TableCell>{t.issue_id}</TableCell>
                      <TableCell>{t.canonical_property_name || "-"}</TableCell>
                      <TableCell>{t.issue_type || "-"}</TableCell>
                      <TableCell>{t.severity || "-"}</TableCell>

                      <TableCell sx={priorityCellStyle(t.priority)}>
                        {t.priority ? `• ${t.priority}` : "-"}
                      </TableCell>

                      <TableCell>{reportedBy}</TableCell>
                      <TableCell>{createdDateStr}</TableCell>

                      <TableCell>
                        <Box sx={{ ...statusChipStyle(t.status) }}>{t.status || "-"}</Box>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Box sx={{ py: 6, textAlign: "center", color: "#6B7280" }}>
                        <Typography variant="body2">
                          No tickets found for the selected filters.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ================= CARD VIEW ================= */}
      {viewMode === "cards" && (
        <Box>
          <Grid container spacing={2}>
            {paginatedTickets.map((t) => {
              const issueId = t.issue_id || "-";
              const title = t.ticket_title || t.issue_type || "-";
              const property = t.canonical_property_name || t.property_id || "-";
              const issueType = t.issue_type || "-";
              const severity = t.severity || "-";
              const priority = t.priority || "-";
              const status = t.status || "-";

              const reportedBy =
                t.reported_by_name || t.reported_by || t.created_by_name || t.created_by || "-";

              const rawCreated = t.created_at || t.created_date || t.created_on || null;
              const createdDateStr = formatDate(rawCreated);

              return (
                // ✅ 4 per row on lg (lg=3)
                <Grid item xs={12} sm={6} md={4} lg={3} key={issueId}>
                  <Paper
                    elevation={0}
                    onClick={() => onOpenTicketDetails?.(issueId)}
                    sx={{
                      cursor: "pointer",
                      borderRadius: 3,
                      bgcolor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
                      overflow: "hidden",
                      transition: "transform 120ms ease, box-shadow 120ms ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0px 14px 36px rgba(15,23,42,0.10)",
                      },
                    }}
                  >
                    <Box sx={{ p: 2 }}>
                      {/* Header */}
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          {/* icon block like your screenshot */}
                          <Box
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: 2,
                              bgcolor: "#EEF2FF",
                              border: "1px solid #E5E7EB",
                            }}
                          />
                          <Box>
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: "#6B7280",
                                fontWeight: 800,
                                letterSpacing: 0.6,
                              }}
                            >
                              {issueId}
                            </Typography>

                            <Typography sx={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>
                              {title}
                            </Typography>

                            <Typography sx={{ fontSize: 13, color: "#6B7280", mt: 0.2 }}>
                              {property}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                         

                          <Tooltip title="Open Ticket">
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenTicketDetails?.(issueId);
                              }}
                              sx={{
                                border: "1px solid #E5E7EB",
                                bgcolor: "#fff",
                                "&:hover": { bgcolor: "#F9FAFB" },
                              }}
                            >
                              <VisibilityOutlinedIcon sx={{ fontSize: 18, color: "#2563EB" }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>

                      {/* Chips row */}
                      <Box sx={{ mt: 2 }}>
                        <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                          <Box sx={statusChipStyle(status)}>{status}</Box>
                          <Box sx={priorityBadgeStyle(priority)}>{priority}</Box>
                        </Stack>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      {/* Details */}
                      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                        {labelValue("Issue Type", issueType)}
                        {labelValue("Severity", severity)}
                        {labelValue("Reported By", reportedBy)}
                      </Stack>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}

            {filteredTickets.length === 0 && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    py: 6,
                    textAlign: "center",
                    color: "#6B7280",
                    bgcolor: "#FFFFFF",
                    borderRadius: 3,
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <Typography variant="body2">
                    No tickets found for the selected filters.
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Pagination bottom-right */}
      <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
        <TablePagination
          component="div"
          count={filteredTickets.length}
          page={page}
          onPageChange={handleChangePage}
          // ✅ cards fixed to 12
          rowsPerPage={viewMode === "cards" ? CARDS_PER_PAGE : rowsPerPage}
          // ✅ disable rows-per-page changing in cards view
          onRowsPerPageChange={viewMode === "cards" ? undefined : handleChangeRowsPerPage}
          rowsPerPageOptions={viewMode === "cards" ? [] : [15, 25, 50, 100]}
          sx={{
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-select": {
              display: viewMode === "cards" ? "none" : "inline-flex",
            },
          }}
        />
      </Box>
    </Box>
  );
}
