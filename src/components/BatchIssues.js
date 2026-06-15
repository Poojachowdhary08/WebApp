// src/components/BatchIssues.js
import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
  TableSortLabel,
  TextField,
  InputAdornment,
  Button,
  Divider,
  Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";

const BORDER = "1px solid rgba(15, 23, 42, 0.10)";
const HEAD_BG = "#F9FAFB";
const HEAD_TXT = "#0F172A";
const SUB_TXT = "#64748B";

const safeStr = (v) => String(v ?? "").trim();
const norm = (v) => safeStr(v).toLowerCase();
const capWords = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
const num0 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * BatchIssues Component
 * Displays batch issues information for a specific item
 *
 * @param {Array} batches - Array of batch objects from API
 * @param {boolean} loading - Loading state
 * @param {boolean} hideProjectPropertyColumns - hide project/property columns in property-scoped views
 * @param {string|number} maxHeight - table container max height
 */
export default function BatchIssues({
  batches = [],
  loading = false,
  hideProjectPropertyColumns = false,
  maxHeight = "60vh",
}) {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [orderBy, setOrderBy] = useState("batch_created_date");
  const [order, setOrder] = useState("desc"); // 'asc' or 'desc'
  const [query, setQuery] = useState("");

  const toggleRow = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Sort batches based on current sort settings
  const sortedBatches = useMemo(() => {
    if (!batches || batches.length === 0) return [];

    const sorted = [...batches].sort((a, b) => {
      let aValue, bValue;

      switch (orderBy) {
        case "batch_id":
          aValue = a.batch_id || 0;
          bValue = b.batch_id || 0;
          break;
        case "invoice_id":
          aValue = (a.invoice_id || "").toString().toLowerCase();
          bValue = (b.invoice_id || "").toString().toLowerCase();
          break;
        case "batch_created_date":
          aValue = a.batch_created_date ? new Date(a.batch_created_date).getTime() : 0;
          bValue = b.batch_created_date ? new Date(b.batch_created_date).getTime() : 0;
          break;
        case "total_received_quantity":
          aValue = num0(a.total_received_quantity ?? a.received_quantity ?? a.quantity);
          bValue = num0(b.total_received_quantity ?? b.received_quantity ?? b.quantity);
          break;
        case "total_issued_quantity":
          aValue = a.total_issued_quantity || 0;
          bValue = b.total_issued_quantity || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        return order === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return order === "asc" ? aValue - bValue : bValue - aValue;
      }
    });

    return sorted;
  }, [batches, orderBy, order]);

  const filteredBatches = useMemo(() => {
    const q = norm(query);
    if (!q) return sortedBatches;

    const matches = (batch) => {
      const issueDetails = Array.isArray(batch?.issue_details) ? batch.issue_details : [];
      const projectNames = Array.isArray(batch?.project_names) ? batch.project_names : [];
      const propertyNames = Array.isArray(batch?.property_names) ? batch.property_names : [];
      const issuedDates = Array.isArray(batch?.issued_dates) ? batch.issued_dates : [];

      const hay = [
        batch?.batch_id,
        batch?.invoice_id,
        batch?.batch_created_date,
        batch?.total_received_quantity ?? batch?.received_quantity ?? batch?.quantity,
        batch?.total_issued_quantity,
        ...projectNames,
        ...propertyNames,
        ...issuedDates,
        ...issueDetails.flatMap((d) => [
          d?.issue_date,
          d?.quantity,
          d?.property_name,
          d?.project_name,
          d?.request_id,
          d?.status,
        ]),
      ]
        .map(norm)
        .filter(Boolean)
        .join(" ");

      return hay.includes(q);
    };

    return sortedBatches.filter(matches);
  }, [sortedBatches, query]);

  const issueCounts = useMemo(() => {
    const list = filteredBatches || [];
    const withIssues = list.filter((b) => Array.isArray(b?.issue_details) && b.issue_details.length > 0).length;
    const txns = list.reduce(
      (sum, b) => sum + (Array.isArray(b?.issue_details) ? b.issue_details.length : 0),
      0
    );
    return { batches: list.length, withIssues, txns };
  }, [filteredBatches]);

  const expandAll = () => {
    const s = new Set();
    (filteredBatches || []).forEach((b, idx) => {
      const issueDetails = Array.isArray(b?.issue_details) ? b.issue_details : [];
      if (issueDetails.length > 0) s.add(idx);
    });
    setExpandedRows(s);
  };

  const collapseAll = () => setExpandedRows(new Set());

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 3 }}>
        <CircularProgress size={22} sx={{ color: "#64748B" }} />
        <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 500 }}>
          Loading batch issues...
        </Typography>
      </Box>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: BORDER,
          bgcolor: "#fff",
          textAlign: "center",
          boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
        }}
      >
        <Typography sx={{ fontWeight: 900, color: HEAD_TXT, mb: 0.5 }}>Batch Issues</Typography>
        <Typography variant="body2" sx={{ color: SUB_TXT }}>
          No batch issues found for this item.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: BORDER,
        backgroundColor: "#fff",
        boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* Header + controls */}
      <Box sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 900, color: HEAD_TXT }}>Batch Issues</Typography>
            <Typography sx={{ fontSize: 12.5, color: SUB_TXT }}>
              {issueCounts.batches} batches • {issueCounts.txns} transactions
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
            <TextField
              size="small"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search batch, invoice, project, request id..."
              sx={{ width: 320, bgcolor: "#fff", borderRadius: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title="Expand all batches with issues">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={expandAll}
                  disabled={issueCounts.withIssues === 0}
                  sx={{ borderRadius: 999, textTransform: "none", fontWeight: 900 }}
                >
                  Expand all
                </Button>
              </span>
            </Tooltip>

            <Button
              size="small"
              variant="outlined"
              onClick={collapseAll}
              sx={{ borderRadius: 999, textTransform: "none", fontWeight: 900 }}
            >
              Collapse
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Divider />

      <TableContainer
        sx={{
          flex: 1,
          minHeight: 0,
          maxHeight,
          overflowY: "auto",
          overflowX: "auto",
          backgroundColor: "#fff",
        }}
      >
      <Table
        stickyHeader
        size="small"
        sx={{
          "& th, & td": { borderRight: BORDER, borderBottom: BORDER },
          "& th:last-child, & td:last-child": { borderRight: "none" },
        }}
      >
        <TableHead>
          <TableRow sx={{ height: 42 }}>
            <TableCell
              sx={{
                position: "sticky",
                top: 0,
                backgroundColor: HEAD_BG,
                color: HEAD_TXT,
                fontWeight: 900,
                zIndex: 1,
                py: 1.15,
                px: 1.5,
                fontSize: 12,
                letterSpacing: 0.3,
                width: 44,
                borderRight: BORDER,
                borderBottom: BORDER,
              }}
            >
              {/* Expand */}
            </TableCell>
            {[
              { id: "batch_id", label: "Batch ID" },
              { id: "invoice_id", label: "Invoice ID" },
              { id: "batch_created_date", label: "Created Date" },
              { id: "total_received_quantity", label: "Received" },
              { id: "total_issued_quantity", label: "Total Issued" },
              { id: "issued_dates", label: "Issued Dates", sortable: false },
              { id: "project_names", label: "Projects", sortable: false },
              { id: "property_names", label: "Properties", sortable: false },
            ]
              .filter((col) =>
                hideProjectPropertyColumns
                  ? col.id !== "project_names" && col.id !== "property_names"
                  : true
              )
              .map((col) => (
              <TableCell
                key={col.id}
                sx={{
                  position: "sticky",
                  top: 0,
                  backgroundColor: HEAD_BG,
                  color: HEAD_TXT,
                  fontWeight: 900,
                  zIndex: 1,
                  py: 1.15,
                  px: 1.5,
                  fontSize: 12,
                  letterSpacing: 0.3,
                  borderRight: BORDER,
                  borderBottom: BORDER,
                }}
              >
                {col.sortable !== false ? (
                  <TableSortLabel
                    active={orderBy === col.id}
                    direction={orderBy === col.id ? order : "asc"}
                    onClick={() => handleSort(col.id)}
                    sx={{
                      color: HEAD_TXT,
                      "&:hover": { color: "#334155" },
                      "& .MuiTableSortLabel-icon": { color: "#94A3B8", opacity: 1 },
                    }}
                  >
                    {col.label}
                  </TableSortLabel>
                ) : (
                  col.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredBatches.map((batch, i) => {
            const isExpanded = expandedRows.has(i);
            const issueDetails = batch.issue_details || [];

            return (
              <React.Fragment key={i}>
                <TableRow hover sx={{ height: 42, "&:hover td": { backgroundColor: "#F9FAFB" } }}>
                  <TableCell sx={{ py: 1.15, px: 1.5, fontSize: 13, width: 44, borderRight: BORDER, borderBottom: BORDER }}>
                    {issueDetails.length > 0 && (
                      <IconButton
                        size="small"
                        onClick={() => toggleRow(i)}
                        sx={{
                          p: 0.5,
                          color: "#64748B",
                          "&:hover": { backgroundColor: "#E2E8F0", color: "#0F172A" },
                        }}
                      >
                        {isExpanded ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )}
                      </IconButton>
                    )}
                  </TableCell>
                  <TableCell sx={{ py: 1.15, px: 1.5, fontSize: 13, borderRight: BORDER, borderBottom: BORDER }}>
                    {batch.batch_id || "-"}
                  </TableCell>
                  <TableCell sx={{ py: 1.15, px: 1.5, fontSize: 13, borderRight: BORDER, borderBottom: BORDER }}>
                    {batch.invoice_id ? capWords(batch.invoice_id) : "-"}
                  </TableCell>
                  <TableCell sx={{ py: 1.15, px: 1.5, fontSize: 13, borderRight: BORDER, borderBottom: BORDER }}>
                    {formatDate(batch.batch_created_date)}
                  </TableCell>
                  <TableCell sx={{ py: 1.15, px: 1.5, fontSize: 13, fontWeight: 700, borderRight: BORDER, borderBottom: BORDER }}>
                    {num0(batch.total_received_quantity ?? batch.received_quantity ?? batch.quantity)}
                  </TableCell>
                  <TableCell sx={{ py: 1.15, px: 1.5, fontSize: 13, fontWeight: 600, borderRight: BORDER, borderBottom: BORDER }}>
                    {batch.total_issued_quantity || 0}
                  </TableCell>
                  <TableCell sx={{ py: 1.15, px: 1.5, fontSize: 13, borderRight: BORDER, borderBottom: BORDER }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {Array.isArray(batch.issued_dates) && batch.issued_dates.length > 0 ? (
                        batch.issued_dates.slice(0, 3).map((date, idx) => (
                          <Chip
                            key={idx}
                            label={formatDate(date)}
                            size="small"
                            sx={{
                              fontSize: 10,
                              height: 20,
                              borderRadius: 1,
                              bgcolor: "#ECFDF5",
                              color: "#047857",
                              border: "1px solid #A7F3D0",
                            }}
                          />
                        ))
                      ) : (
                        <Typography sx={{ fontSize: 13, color: "#64748B" }}>-</Typography>
                      )}
                      {Array.isArray(batch.issued_dates) && batch.issued_dates.length > 3 && (
                        <Tooltip title={batch.issued_dates.slice(3).map(d => formatDate(d)).join(", ")}>
                          <Chip
                            label={`+${batch.issued_dates.length - 3}`}
                            size="small"
                            sx={{
                              fontSize: 10,
                              height: 20,
                              borderRadius: 1,
                              bgcolor: "#F1F5F9",
                              color: "#475569",
                            }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  {!hideProjectPropertyColumns && (
                  <TableCell sx={{ py: 1.15, px: 1.5, fontSize: 13, borderRight: BORDER, borderBottom: BORDER }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {Array.isArray(batch.project_names) && batch.project_names.length > 0 ? (
                        <>
                          {batch.project_names.slice(0, 2).map((proj, idx) => (
                            <Chip
                              key={idx}
                              label={proj}
                              size="small"
                              sx={{
                                fontSize: 11,
                                height: 22,
                                borderRadius: 1,
                                bgcolor: "#EEF2FF",
                                color: "#4338CA",
                                border: "1px solid #C7D2FE",
                              }}
                            />
                          ))}
                          {batch.project_names.length > 2 && (
                            <Tooltip title={batch.project_names.slice(2).join(", ")}>
                              <Chip
                                label={`+${batch.project_names.length - 2}`}
                                size="small"
                                sx={{
                                  fontSize: 11,
                                  height: 22,
                                  borderRadius: 1,
                                  bgcolor: "#F1F5F9",
                                  color: "#475569",
                                }}
                              />
                            </Tooltip>
                          )}
                        </>
                      ) : (
                        <Typography sx={{ fontSize: 13, color: "#64748B" }}>-</Typography>
                      )}
                    </Box>
                  </TableCell>
                  )}
                  {!hideProjectPropertyColumns && (
                  <TableCell sx={{ py: 1.15, px: 1.5, fontSize: 13, borderRight: BORDER, borderBottom: BORDER }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {Array.isArray(batch.property_names) && batch.property_names.length > 0 ? (
                        <>
                          {batch.property_names.slice(0, 2).map((prop, idx) => (
                            <Chip
                              key={idx}
                              label={prop}
                              size="small"
                              sx={{
                                fontSize: 11,
                                height: 22,
                                borderRadius: 1,
                                bgcolor: "#FFFBEB",
                                color: "#92400E",
                                border: "1px solid #FDE68A",
                              }}
                            />
                          ))}
                          {batch.property_names.length > 2 && (
                            <Tooltip title={batch.property_names.slice(2).join(", ")}>
                              <Chip
                                label={`+${batch.property_names.length - 2}`}
                                size="small"
                                sx={{
                                  fontSize: 11,
                                  height: 22,
                                  borderRadius: 1,
                                  bgcolor: "#F1F5F9",
                                  color: "#475569",
                                }}
                              />
                            </Tooltip>
                          )}
                        </>
                      ) : (
                        <Typography sx={{ fontSize: 13, color: "#64748B" }}>-</Typography>
                      )}
                    </Box>
                  </TableCell>
                  )}
                </TableRow>

                {/* Expandable row with issue details */}
                {issueDetails.length > 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={hideProjectPropertyColumns ? 7 : 9}
                      sx={{ py: 0, px: 0, borderBottom: isExpanded ? BORDER : "none", backgroundColor: "#fff" }}
                    >
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: "#F8FAFC", borderTop: BORDER }}>
                          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: HEAD_TXT, fontSize: 12.5 }}>
                            Issue details ({issueDetails.length} transaction{issueDetails.length !== 1 ? "s" : ""})
                          </Typography>
                          <Table size="small" sx={{ "& th, & td": { borderRight: BORDER, borderBottom: BORDER }, "& th:last-child, & td:last-child": { borderRight: "none" } }}>
                            <TableHead>
                              <TableRow>
                                {[
                                  "Issue Date",
                                  "Quantity",
                                  "Property",
                                  "Project",
                                  "Request ID",
                                  "Status",
                                ]
                                  .filter((hdr) =>
                                    hideProjectPropertyColumns
                                      ? hdr !== "Property" && hdr !== "Project"
                                      : true
                                  )
                                  .map((hdr) => (
                                  <TableCell
                                    key={hdr}
                                    sx={{
                                      backgroundColor: HEAD_BG,
                                      fontWeight: 900,
                                      fontSize: 12,
                                      letterSpacing: 0.3,
                                      color: HEAD_TXT,
                                      py: 0.9,
                                      px: 1.25,
                                      borderRight: BORDER,
                                      borderBottom: BORDER,
                                    }}
                                  >
                                    {hdr}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {issueDetails.map((issue, idx) => (
                                <TableRow key={idx} hover sx={{ "&:hover td": { backgroundColor: "#F9FAFB" } }}>
                                  <TableCell sx={{ fontSize: 12.5, py: 0.9, px: 1.25, borderRight: BORDER, borderBottom: BORDER }}>
                                    {formatDate(issue.issue_date)}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12.5, py: 0.9, px: 1.25, fontWeight: 600, borderRight: BORDER, borderBottom: BORDER }}>
                                    {issue.quantity || 0}
                                  </TableCell>
                                  {!hideProjectPropertyColumns && (
                                    <TableCell sx={{ fontSize: 12.5, py: 0.9, px: 1.25, borderRight: BORDER, borderBottom: BORDER }}>
                                      {issue.property_name || "-"}
                                    </TableCell>
                                  )}
                                  {!hideProjectPropertyColumns && (
                                    <TableCell sx={{ fontSize: 12.5, py: 0.9, px: 1.25, borderRight: BORDER, borderBottom: BORDER }}>
                                      {issue.project_name || "-"}
                                    </TableCell>
                                  )}
                                  <TableCell sx={{ fontSize: 12.5, py: 0.9, px: 1.25, borderRight: BORDER, borderBottom: BORDER }}>
                                    {issue.request_id || "-"}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12.5, py: 0.9, px: 1.25, borderRight: BORDER, borderBottom: BORDER }}>
                                    {issue.status ? (
                                      <Chip
                                        label={issue.status}
                                        size="small"
                                        sx={{
                                          fontSize: 10.5,
                                          height: 20,
                                          borderRadius: 1,
                                          fontWeight: 700,
                                          bgcolor:
                                            issue.status.toLowerCase() === "completed"
                                              ? "#D1FAE5"
                                              : issue.status.toLowerCase() === "pending"
                                              ? "#FEF3C7"
                                              : "#FEE2E2",
                                          color:
                                            issue.status.toLowerCase() === "completed"
                                              ? "#065F46"
                                              : issue.status.toLowerCase() === "pending"
                                              ? "#92400E"
                                              : "#991B1B",
                                          border: "1px solid transparent",
                                        }}
                                      />
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
    </Paper>
  );
}