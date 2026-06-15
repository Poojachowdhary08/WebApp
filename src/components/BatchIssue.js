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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

/**
 * BatchIssues Component
 * Displays batch issues information for a specific item
 * 
 * @param {Array} batches - Array of batch objects from API
 * @param {boolean} loading - Loading state
 */
export default function BatchIssues({ batches = [], loading = false }) {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [orderBy, setOrderBy] = useState("batch_created_date");
  const [order, setOrder] = useState("desc"); // 'asc' or 'desc'

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

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading batch issues...</Typography>
      </Box>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <Typography variant="body2">No batch issues found for this item.</Typography>
    );
  }

  return (
    <TableContainer
      component={Paper}
      sx={{ maxHeight: 500, borderRadius: 2, boxShadow: 2 }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow sx={{ height: 32 }}>
            <TableCell
              sx={{
                position: "sticky",
                top: 0,
                backgroundColor: "#2A3663",
                color: "#fff",
                fontWeight: "bold",
                zIndex: 1,
                py: 0.5,
                px: 1.25,
                fontSize: 13,
                width: 40,
              }}
            >
              {/* Expand/Collapse column */}
            </TableCell>
            {[
              { id: "batch_id", label: "Batch ID" },
              { id: "invoice_id", label: "Invoice ID" },
              { id: "batch_created_date", label: "Created Date" },
              { id: "total_issued_quantity", label: "Total Issued" },
              { id: "issued_dates", label: "Issued Dates", sortable: false },
              { id: "project_names", label: "Projects", sortable: false },
              { id: "property_names", label: "Properties", sortable: false },
            ].map((col) => (
              <TableCell
                key={col.id}
                sx={{
                  position: "sticky",
                  top: 0,
                  backgroundColor: "#2A3663",
                  color: "#fff",
                  fontWeight: "bold",
                  zIndex: 1,
                  py: 0.5,
                  px: 1.25,
                  fontSize: 13,
                }}
              >
                {col.sortable !== false ? (
                  <TableSortLabel
                    active={orderBy === col.id}
                    direction={orderBy === col.id ? order : "asc"}
                    onClick={() => handleSort(col.id)}
                    sx={{
                      color: "#fff",
                      "& svg": { color: "#fff" },
                      "& .MuiTableSortLabel-icon": { opacity: 1 },
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
          {sortedBatches.map((batch, i) => {
            const isExpanded = expandedRows.has(i);
            const issueDetails = batch.issue_details || [];
            
            return (
              <React.Fragment key={i}>
                <TableRow hover sx={{ height: 32 }}>
                  <TableCell sx={{ py: 0.5, px: 1.25, fontSize: 13, width: 40 }}>
                    {issueDetails.length > 0 && (
                      <IconButton
                        size="small"
                        onClick={() => toggleRow(i)}
                        sx={{ p: 0.5 }}
                      >
                        {isExpanded ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )}
                      </IconButton>
                    )}
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1.25, fontSize: 13 }}>
                    {batch.batch_id || "-"}
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1.25, fontSize: 13 }}>
                    {batch.invoice_id || "-"}
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1.25, fontSize: 13 }}>
                    {formatDate(batch.batch_created_date)}
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1.25, fontSize: 13, fontWeight: 600 }}>
                    {batch.total_issued_quantity || 0}
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1.25, fontSize: 13 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {Array.isArray(batch.issued_dates) && batch.issued_dates.length > 0 ? (
                        batch.issued_dates.slice(0, 3).map((date, idx) => (
                          <Chip
                            key={idx}
                            label={formatDate(date)}
                            size="small"
                            sx={{
                              fontSize: 10,
                              height: 18,
                              bgcolor: "#F0FDF4",
                              color: "#166534",
                            }}
                          />
                        ))
                      ) : (
                        <Typography sx={{ fontSize: 13 }}>-</Typography>
                      )}
                      {Array.isArray(batch.issued_dates) && batch.issued_dates.length > 3 && (
                        <Tooltip title={batch.issued_dates.slice(3).map(d => formatDate(d)).join(", ")}>
                          <Chip
                            label={`+${batch.issued_dates.length - 3}`}
                            size="small"
                            sx={{
                              fontSize: 10,
                              height: 18,
                              bgcolor: "#F1F5F9",
                            }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1.25, fontSize: 13 }}>
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
                                height: 20,
                                bgcolor: "#EEF2FF",
                                color: "#4338CA",
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
                                  height: 20,
                                  bgcolor: "#F1F5F9",
                                }}
                              />
                            </Tooltip>
                          )}
                        </>
                      ) : (
                        <Typography sx={{ fontSize: 13 }}>-</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1.25, fontSize: 13 }}>
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
                                height: 20,
                                bgcolor: "#FEF3C7",
                                color: "#92400E",
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
                                  height: 20,
                                  bgcolor: "#F1F5F9",
                                }}
                              />
                            </Tooltip>
                          )}
                        </>
                      ) : (
                        <Typography sx={{ fontSize: 13 }}>-</Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
                
                {/* Expandable row with issue details */}
                {issueDetails.length > 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{ py: 0, px: 0, borderBottom: isExpanded ? "1px solid #e0e0e0" : "none" }}
                    >
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: "#FAFAFA" }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mb: 1.5 }}>
                            Issue Details ({issueDetails.length} transaction{issueDetails.length !== 1 ? "s" : ""})
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                {[
                                  "Issue Date",
                                  "Quantity",
                                  "Property",
                                  "Project",
                                  "Request ID",
                                  // "Issued To",
                                  //"Issued By",
                                  "Status",
                                ].map((hdr) => (
                                  <TableCell
                                    key={hdr}
                                    sx={{
                                      backgroundColor: "#E5E7EB",
                                      fontWeight: 600,
                                      fontSize: 12,
                                      py: 0.75,
                                      px: 1,
                                    }}
                                  >
                                    {hdr}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {issueDetails.map((issue, idx) => (
                                <TableRow key={idx} hover>
                                  <TableCell sx={{ fontSize: 12, py: 0.75, px: 1 }}>
                                    {formatDate(issue.issue_date)}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12, py: 0.75, px: 1, fontWeight: 600 }}>
                                    {issue.quantity || 0}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12, py: 0.75, px: 1 }}>
                                    {issue.property_name || "-"}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12, py: 0.75, px: 1 }}>
                                    {issue.project_name || "-"}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12, py: 0.75, px: 1 }}>
                                    {issue.request_id || "-"}
                                  </TableCell>
                                  {/* <TableCell sx={{ fontSize: 12, py: 0.75, px: 1 }}>
                                    {issue.issued_to || "-"}
                                  </TableCell> */}
                                  {/* <TableCell sx={{ fontSize: 12, py: 0.75, px: 1 }}>
                                    {issue.issued_by || "-"}
                                  </TableCell> */}
                                  <TableCell sx={{ fontSize: 12, py: 0.75, px: 1 }}>
                                    {issue.status ? (
                                      <Chip
                                        label={issue.status}
                                        size="small"
                                        sx={{
                                          fontSize: 10,
                                          height: 18,
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
  );
}
