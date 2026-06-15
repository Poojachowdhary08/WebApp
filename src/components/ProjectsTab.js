// src/components/ProjectsTab.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Collapse,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  CircularProgress,
  Stack,
  TableSortLabel,
  TablePagination,
  IconButton,
  Divider,
  Grid,
  MenuItem,
  TextField,
  Tooltip,
  Paper,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";

const COLORS = {
  textSecondary: "#6B7280",
  badgeOnHold: "#FBBF24",
  badgePending: "#F97316",
  badgeCompleted: "#22C55E",
  badgePlanning: "#F97316",
  badgeOngoing: "#3B82F6",
};

const statusChipStyle = (status) => {
  let bg = "#E5E7EB";
  let color = "#374151";

  if (status === "On-Hold") {
    bg = "rgba(251, 191, 36, 0.12)";
    color = COLORS.badgeOnHold;
  } else if (status === "Pending") {
    bg = "rgba(249, 115, 22, 0.12)";
    color = COLORS.badgePending;
  } else if (status === "Completed") {
    bg = "rgba(34, 197, 94, 0.12)";
    color = COLORS.badgeCompleted;
  } else if (status === "Planning") {
    bg = "rgba(249, 115, 22, 0.12)";
    color = COLORS.badgePlanning;
  } else if (status === "Ongoing") {
    bg = "rgba(59, 130, 246, 0.12)";
    color = COLORS.badgeOngoing;
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
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

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date)) return "-";
  return date.toLocaleDateString("en-GB");
};

const formatMoneyINR = (value) => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

const humanizeJoinedWords = (value) => {
  if (!value) return "";
  const s = String(value);
  // Insert spaces in cases like "AndhraPradeshVilla" or "PradeshResidential"
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .trim();
};

const labelValue = (label, value) => (
  <Box sx={{ minWidth: 120 }}>
    <Typography sx={{ fontSize: 12, color: "#6B7280", mb: 0.3 }}>{label}</Typography>
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{value}</Typography>
  </Box>
);

export default function ProjectsTab({
  search,
  refreshKey,
  onOpenProjectDetails,
  viewMode = "list", // ✅ comes from Projects.jsx
  filtersOpen = false,
}) {
  const [projects, setProjects] = useState([]);
  const [segmentsMap, setSegmentsMap] = useState({});
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showPip, setShowPip] = useState(false);
  const [pipContent, setPipContent] = useState(null);

  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  // data-driven filters (derived from dataset)
  const [statusFilter, setStatusFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const CARDS_PER_PAGE = 12;

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get("http://localhost:8080/projects_m", {
        params: { page: 1, page_size: 10000 },
      });

      setProjects(response.data.projects || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects, refreshKey]);

  useEffect(() => {
    setPage(0);
  }, [search, sortBy, sortDirection, viewMode, statusFilter, managerFilter, locationFilter]);

  const filterOptions = useMemo(() => {
    const norm = (v) => String(v || "").trim();

    const statuses = new Set();
    const managers = new Set();
    const locations = new Set();

    for (const p of projects) {
      const s = norm(p.project_status);
      const m = norm(p.project_manager);
      const city = norm(p.project_location_city);
      const state = norm(p.project_location_state);
      const loc =
        city && state ? `${city}, ${state}` : city ? city : state ? state : "";
      if (s) statuses.add(s);
      if (m) managers.add(m);
      if (loc) locations.add(loc);
    }

    const sortAlpha = (a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });

    return {
      statuses: Array.from(statuses).sort(sortAlpha),
      managers: Array.from(managers).sort(sortAlpha),
      locations: Array.from(locations).sort(sortAlpha),
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== "all" && String(p.project_status || "") !== statusFilter) return false;
      if (managerFilter !== "all" && String(p.project_manager || "") !== managerFilter) return false;
      if (locationFilter !== "all") {
        const city = String(p.project_location_city || "").trim();
        const state = String(p.project_location_state || "").trim();
        const loc = city && state ? `${city}, ${state}` : city || state;
        if (loc !== locationFilter) return false;
      }

      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (p.project_id || "").toLowerCase().includes(q) ||
        (p.project_name || "").toLowerCase().includes(q) ||
        (p.project_location_city || "").toLowerCase().includes(q) ||
        (p.project_location_state || "").toLowerCase().includes(q) ||
        (p.project_manager || "").toLowerCase().includes(q) ||
        (p.project_status || "").toLowerCase().includes(q)
      );
    });
  }, [projects, search, statusFilter, managerFilter, locationFilter]);

  const hasActiveFilters =
    statusFilter !== "all" || managerFilter !== "all" || locationFilter !== "all";

  const clearFilters = () => {
    setStatusFilter("all");
    setManagerFilter("all");
    setLocationFilter("all");
  };

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (statusFilter !== "all") chips.push({ key: "status", label: `Status: ${statusFilter}` });
    if (managerFilter !== "all") chips.push({ key: "manager", label: `Manager: ${managerFilter}` });
    if (locationFilter !== "all") chips.push({ key: "location", label: `Location: ${locationFilter}` });
    return chips;
  }, [statusFilter, managerFilter, locationFilter]);

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(columnKey);
      setSortDirection("asc");
    }
  };

  const sortedProjects = useMemo(() => {
    const multiplier = sortDirection === "asc" ? 1 : -1;

    const getValue = (p, key) => {
      switch (key) {
        case "project_id":
          return p.project_id || "";
        case "project_name":
          return p.project_name || "";
        case "project_location_city":
          return p.project_location_city || "";
        case "project_location_state":
          return p.project_location_state || "";
        case "location":
          return `${p.project_location_city || ""}, ${p.project_location_state || ""}`.trim();
        case "project_type":
          return p.project_type || "";
        case "project_manager":
          return p.project_manager || "";
        case "project_status":
          return p.project_status || "";
        case "total_budget":
          return typeof p.total_budget === "number"
            ? p.total_budget
            : Number(p.total_budget) || 0;
        case "start_date":
          return p.start_date ? new Date(p.start_date).getTime() : 0;
        case "created_at":
          return p.created_at ? new Date(p.created_at).getTime() : 0;
        default:
          return "";
      }
    };

    const isNumericKey =
      sortBy === "total_budget" || sortBy === "start_date" || sortBy === "created_at";

    const arr = [...filteredProjects];

    arr.sort((a, b) => {
      const aVal = getValue(a, sortBy);
      const bVal = getValue(b, sortBy);

      if (isNumericKey) {
        if (aVal < bVal) return -1 * multiplier;
        if (aVal > bVal) return 1 * multiplier;
        return 0;
      }

      return (
        String(aVal)
          .toLowerCase()
          .localeCompare(String(bVal).toLowerCase(), undefined, {
            numeric: true,
            sensitivity: "base",
          }) * multiplier
      );
    });

    return arr;
  }, [filteredProjects, sortBy, sortDirection]);

  const paginatedProjects = useMemo(() => {
    const effectiveRowsPerPage = viewMode === "cards" ? CARDS_PER_PAGE : rowsPerPage;
    const start = page * effectiveRowsPerPage;
    return sortedProjects.slice(start, start + effectiveRowsPerPage);
  }, [sortedProjects, page, rowsPerPage, viewMode]);
  

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    const value = parseInt(event.target.value, 10);
    setRowsPerPage(value);
    setPage(0);
  };

  const sortOptions = [
    { key: "project_name", label: "Project Name" },
    { key: "location", label: "Location" },
    { key: "project_type", label: "Type" },
    { key: "project_manager", label: "Manager" },
    { key: "total_budget", label: "Total Budget" },
    { key: "start_date", label: "Start Date" },
    { key: "created_at", label: "Created At" },
    { key: "project_status", label: "Status" },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 240,
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
      {/* Filters summary + dropdowns (controlled by parent, sits under search) */}
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {activeFilterChips.map((c) => (
            <Chip
              key={c.key}
              size="small"
              label={c.label}
              sx={{
                fontWeight: 800,
                bgcolor: "rgba(37,99,235,0.08)",
                color: "#1D4ED8",
                border: "1px solid rgba(37,99,235,0.18)",
              }}
            />
          ))}

          {hasActiveFilters && (
            <Button
              variant="text"
              size="small"
              startIcon={<ClearRoundedIcon />}
              onClick={clearFilters}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              Clear
            </Button>
          )}

          <Box sx={{ flex: 1 }} />

          <Typography sx={{ fontSize: 12.5, color: "#6B7280", fontWeight: 700 }}>
            {hasActiveFilters || Boolean(search?.trim()) ? (
              <>
                Showing <span style={{ color: "#111827" }}>{filteredProjects.length}</span> of{" "}
                <span style={{ color: "#111827" }}>{projects.length}</span> projects
              </>
            ) : (
              <>
                <span style={{ color: "#111827" }}>{projects.length}</span> projects
              </>
            )}
          </Typography>
        </Stack>

        <Collapse in={filtersOpen} timeout="auto" unmountOnExit>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: "1px solid #E5E7EB",
              bgcolor: "#FFFFFF",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
              flexWrap="wrap"
            >
              <TextField
                select
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">All</MenuItem>
                {filterOptions.statuses.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Manager"
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="all">All</MenuItem>
                {filterOptions.managers.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                sx={{ minWidth: 240 }}
              >
                <MenuItem value="all">All</MenuItem>
                {filterOptions.locations.map((loc) => (
                  <MenuItem key={loc} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Paper>
        </Collapse>
      </Stack>

      {/* ================= LIST VIEW ================= */}
      {viewMode === "list" && (
        <Card
          sx={{
            borderRadius: 2,
            boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
            border: "1px solid #E5E7EB",
            bgcolor: "#FFFFFF",
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Table
              size="small"
              sx={{
                tableLayout: "fixed",
                borderCollapse: "separate",
                borderSpacing: 0,
                "& thead th": {
                  backgroundColor: "#F9FAFB",
                  borderBottom: "1px solid #E5E7EB",
                  borderTop: "1px solid #E5E7EB",
                  fontSize: 13,
                  textTransform: "none",
                  letterSpacing: 0.4,
                  color: "#6B7280",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  padding: "10px 16px",
                },
                "& tbody td": {
                  fontSize: 13,
                  borderBottom: "1px solid #E5E7EB",
                  padding: "10px 16px",
                  textTransform: "capitalize",
                },
                "& tbody tr:hover": {
                  backgroundColor: "#F9FAFB",
                },
                "& th, & td": { borderRight: "1px solid #E5E7EB" },
                "& th:last-of-type, & td:last-of-type": { borderRight: "none" },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={sortBy === "project_name" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortBy === "project_name"}
                      direction={sortBy === "project_name" ? sortDirection : "asc"}
                      onClick={() => handleSort("project_name")}
                    >
                      Project Name
                    </TableSortLabel>
                  </TableCell>

                  <TableCell
                    sortDirection={sortBy === "location" ? sortDirection : false}
                  >
                    <TableSortLabel
                      active={sortBy === "location"}
                      direction={sortBy === "location" ? sortDirection : "asc"}
                      onClick={() => handleSort("location")}
                    >
                      Location
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sortDirection={sortBy === "project_type" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortBy === "project_type"}
                      direction={sortBy === "project_type" ? sortDirection : "asc"}
                      onClick={() => handleSort("project_type")}
                    >
                      Project Type
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sortDirection={sortBy === "project_manager" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortBy === "project_manager"}
                      direction={sortBy === "project_manager" ? sortDirection : "asc"}
                      onClick={() => handleSort("project_manager")}
                    >
                      Project Manager
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sortDirection={sortBy === "total_budget" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortBy === "total_budget"}
                      direction={sortBy === "total_budget" ? sortDirection : "asc"}
                      onClick={() => handleSort("total_budget")}
                    >
                      Total Budget
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sortDirection={sortBy === "start_date" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortBy === "start_date"}
                      direction={sortBy === "start_date" ? sortDirection : "asc"}
                      onClick={() => handleSort("start_date")}
                    >
                      Start Date
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sortDirection={sortBy === "created_at" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortBy === "created_at"}
                      direction={sortBy === "created_at" ? sortDirection : "asc"}
                      onClick={() => handleSort("created_at")}
                    >
                      Created At
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sortDirection={sortBy === "project_status" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortBy === "project_status"}
                      direction={sortBy === "project_status" ? sortDirection : "asc"}
                      onClick={() => handleSort("project_status")}
                    >
                      Project Status
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedProjects.map((p) => {
                  const projectId = p.project_id;
                  const name = p.project_name || "-";
                  const city = humanizeJoinedWords(p.project_location_city || "-");
                  const state = humanizeJoinedWords(p.project_location_state || "-");
                  const location =
                    city === "-" && state === "-"
                      ? "-"
                      : [city, state].filter((x) => x && x !== "-").join(", ");
                  const type = p.project_type || "-";
                  const manager = p.project_manager || "-";

                  const budget = formatMoneyINR(p.total_budget);
                  const startDate = formatDate(p.start_date);
                  const createdDate = formatDate(p.created_at);
                  const status = p.project_status || "-";

                  return (
                    <React.Fragment key={projectId}>
                      <TableRow
                        hover
                        onClick={() => onOpenProjectDetails?.(projectId)}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { backgroundColor: "#F3F4F6 !important" },
                        }}
                      >
                        <TableCell sx={{ fontSize: 13, whiteSpace: "nowrap" }}>{name}</TableCell>
                        <TableCell
                          sx={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 220,
                          }}
                        >
                          <Tooltip title={location} arrow placement="top">
                            <Box component="span" sx={{ display: "inline-block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "bottom" }}>
                              {location}
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{type}</TableCell>
                        <TableCell>{manager}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>₹ {budget}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{startDate}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{createdDate}</TableCell>
                        <TableCell>
                          <Box sx={statusChipStyle(status)}>{status}</Box>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}

                {sortedProjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Box sx={{ py: 6, textAlign: "center", color: "#6B7280" }}>
                        <Typography variant="body2">
                          No projects found for the selected filters.
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
        <Box sx={{ mt: 0.5 }}>
          <Grid container spacing={2}>
            {paginatedProjects.map((p) => {
              const projectId = p.project_id || "-";
              const name = p.project_name || "-";
              const type = p.project_type || "-";
              const manager = p.project_manager || "-";
              const city = humanizeJoinedWords(p.project_location_city || "-");
              const state = humanizeJoinedWords(p.project_location_state || "-");
              const location =
                city === "-" && state === "-"
                  ? "-"
                  : [city, state].filter((x) => x && x !== "-").join(", ");
              const budget = formatMoneyINR(p.total_budget);
              const startDate = formatDate(p.start_date);
              const createdDate = formatDate(p.created_at);
              const status = p.project_status || "-";

              return (
<Grid item xs={12} sm={6} md={4} lg={3} key={projectId}>
<Paper
                    elevation={0}
                    onClick={() => onOpenProjectDetails?.(projectId)}
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
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1.5} alignItems="center">
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
                                fontWeight: 700,
                                letterSpacing: 0.6,
                              }}
                            >
                              {projectId}
                            </Typography>
                            <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                              {name}
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: "#6B7280", mt: 0.2 }}>
                              <Tooltip title={location} arrow placement="top">
                                <Box
                                  component="span"
                                  sx={{
                                    display: "inline-block",
                                    maxWidth: 220,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    verticalAlign: "bottom",
                                  }}
                                >
                                  {location}
                                </Box>
                              </Tooltip>
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>
                            {createdDate}
                          </Typography>
                          <Tooltip title="Open Project">
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenProjectDetails?.(projectId);
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

                      <Box sx={{ mt: 2 }}>
                        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                          {labelValue("Budget", `₹ ${budget}`)}
                          {labelValue("Manager", manager)}
                          {labelValue("Type", type)}
                          <Box sx={{ minWidth: 120 }}>
                            <Typography sx={{ fontSize: 12, color: "#6B7280", mb: 0.3 }}>
                              Status
                            </Typography>
                            <Box sx={statusChipStyle(status)}>{status}</Box>
                          </Box>
                        </Stack>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                  
                    </Box>
                  </Paper>
                </Grid>
              );
            })}

            {sortedProjects.length === 0 && (
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
                  <Typography variant="body2">No projects found for the selected filters.</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Pagination */}
      <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
      <TablePagination
  component="div"
  count={sortedProjects.length}
  page={page}
  onPageChange={handleChangePage}
  rowsPerPage={viewMode === "cards" ? CARDS_PER_PAGE : rowsPerPage}
  onRowsPerPageChange={viewMode === "cards" ? undefined : handleChangeRowsPerPage}
  rowsPerPageOptions={viewMode === "cards" ? [] : [10, 25, 50, 100]}
  sx={{
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-select": {
      display: viewMode === "cards" ? "none" : "inline-flex",
    },
  }}
/>

      </Box>

      {showPip && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: "#FFFFFF",
            boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
            border: "1px solid #E5E7EB",
          }}
        >
          {pipContent}
        </Box>
      )}
    </Box>
  );
}
