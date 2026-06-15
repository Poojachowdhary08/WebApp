import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Dialog,
  TextField,
  InputAdornment,
  Grid,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  LinearProgress,
  Tooltip,
  Avatar,
  Card,
  CardContent,
  useMediaQuery,
  TableSortLabel,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ViewModuleIcon from "@mui/icons-material/ViewModule"; // card view
import ViewAgendaIcon from "@mui/icons-material/ViewAgenda"; // table view
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import LaunchOutlinedIcon from "@mui/icons-material/LaunchOutlined";

import { useTheme } from "@mui/material";

import ProjectDetails from "./ProjectDetails";
import ProjectOnBoardingForm from "./ProjectOnboardingForm";

/* ---------------- helpers (used by your reference CSS) ---------------- */
const toPascalCase = (text) =>
  text
    ?.replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join("");

const daysSince = (iso) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const managerInitials = (name) => {
  if (!name) return "";
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const statusStyles = (status) => {
  switch (status) {
    case "Completed":
      return { bg: "#c1f5c1", fg: "#4caf50", br: "#4caf50" };
    case "In Progress":
      return { bg: "#f5c69d", fg: "#f0882e", br: "#f0882e" };
    case "Pending":
      return { bg: "#ffe1e1", fg: "#f44336", br: "#f44336" };
    case "Planning":
      return { bg: "#e6e9ff", fg: "#0000cc", br: "#0000cc" };
    default:
      return { bg: "#eeeeee", fg: "#666", br: "#999" };
  }
};

/* ============================ Component ============================ */
const ProjectOnboarding = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // data state
  const [projects, setProjects] = useState([]);

  // ui state
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // sorting/pagination for TABLE (and shared for cards)
  const [projSortField, setProjSortField] = useState("created_at");
  const [projSortOrder, setProjSortOrder] = useState("desc");
  const [projPage, setProjPage] = useState(0);
  const [projRows, setProjRows] = useState(15);

  // dialogs
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isPipOpen, setIsPipOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch("http://localhost:8080/projects_m");
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (err) {
        console.error("Error fetching projects:", err);
      }
    };
    fetchProjects();
  }, []);

  const sortedProjects = useMemo(() => {
    const arr = [...projects];
    arr.sort((a, b) => {
      const A = a?.[projSortField] ? String(a[projSortField]).toLowerCase() : "";
      const B = b?.[projSortField] ? String(b[projSortField]).toLowerCase() : "";
      return projSortOrder === "asc" ? A.localeCompare(B) : B.localeCompare(A);
    });
    return arr;
  }, [projects, projSortField, projSortOrder]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return sortedProjects.filter((p) => {
      const matchesStatus = statusFilter === "ALL" || p.project_status === statusFilter;
      const matchesSearch =
        ["project_name", "project_manager", "project_type", "project_id", "start_date", "project_location_city", "project_status"]
          .some((k) => p[k]?.toString().toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [sortedProjects, statusFilter, searchQuery]);

  const paginatedProjects = useMemo(
    () => filteredProjects.slice(projPage * projRows, projPage * projRows + projRows),
    [filteredProjects, projPage, projRows]
  );

  const openDetails = (projectId) => {
    setSelectedProjectId(projectId);
    setIsPipOpen(true);
  };

  /* ======= Projects: table (uses your reference CSS) ======= */
  const ProjectsTable = (
    <TableContainer
      component={Paper}
      sx={{ borderRadius: 2, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
    >
      <Table size="small" sx={{ minWidth: 900, "& td, & th": { whiteSpace: "nowrap" } }}>
        <TableHead>
          <TableRow sx={{ background: "linear-gradient(90deg, #2A3663 0%, #3b4c8a 100%)" }}>
            {[
              { label: "ID", field: "project_id" },
              { label: "NAME", field: "project_name" },
              { label: "LOCATION", field: "project_location_city" },
              { label: "TYPE", field: "project_type" },
              { label: "MANAGER", field: "project_manager" },
              { label: "START", field: "start_date" },
              { label: "CREATED", field: "created_at" },
              { label: "STATUS", field: "project_status", sortable: false },
            ].map(({ label, field, sortable = true }) => (
              <TableCell key={field} sx={{ color: "white", fontWeight: 700 }}>
                {sortable ? (
                  <TableSortLabel
                    active={projSortField === field}
                    direction={projSortField === field ? projSortOrder : "asc"}
                    onClick={() => {
                      const isAsc = projSortField === field && projSortOrder === "asc";
                      setProjSortField(field);
                      setProjSortOrder(isAsc ? "desc" : "asc");
                    }}
                    sx={{ color: "inherit", "& .MuiTableSortLabel-icon": { color: "inherit !important" } }}
                  >
                    {label}
                  </TableSortLabel>
                ) : (
                  label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody
          sx={{
            "& tr:nth-of-type(odd)": { backgroundColor: "rgba(0,0,0,0.015)" },
            "& td .clickable-id": {
              color: "#1565C0",
              textDecoration: "underline",
              cursor: "pointer",
            },
            "& td .clickable-id:hover": {
              color: "#0d47a1",
            },
            "& tr:hover td": {
              backgroundColor: "rgba(42,54,99,0.04)",
            },
          }}
        >
          {paginatedProjects.map((p) => {
            const st = statusStyles(p.project_status);
            const createdDays = daysSince(p.created_at);
            const initial = managerInitials(p.project_manager);

            return (
              <TableRow
                key={p.project_id}
                hover
                role="button"
                tabIndex={0}
                onClick={() => openDetails(p.project_id)}
                onKeyDown={(e) => e.key === "Enter" && openDetails(p.project_id)}
                sx={{ cursor: "pointer", transition: "transform .12s ease", "&:hover": { transform: "translateX(2px)" } }}
              >
                <TableCell
                  onClick={(e) => {
                    e.stopPropagation();
                    openDetails(p.project_id);
                  }}
                >
                  {p.project_id}
                </TableCell>

                <TableCell sx={{ textTransform: "uppercase" }}>{p.project_name}</TableCell>

                <TableCell sx={{ textTransform: "uppercase" }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <LocationOnOutlinedIcon fontSize="small" />
                    <span>{p.project_location_city || "—"}</span>
                  </Stack>
                </TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    label={p.project_type || "—"}
                    icon={<BusinessCenterOutlinedIcon />}
                    variant="outlined"
                  />
                </TableCell>

                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 26, height: 26, fontSize: 12 }}>{initial || "?"}</Avatar>
                    <span>{toPascalCase(p.project_manager) || "—"}</span>
                  </Stack>
                </TableCell>

                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <CalendarMonthOutlinedIcon fontSize="small" />
                    <span>
                      {p.start_date ? new Date(p.start_date).toLocaleDateString("en-GB") : "N/A"}
                    </span>
                  </Stack>
                </TableCell>

                <TableCell>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                </TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    label={(p.project_status || "—").toUpperCase()}
                    sx={{ bgcolor: st.bg, color: st.fg, borderColor: st.br, fontWeight: 700 }}
                    variant="outlined"
                  />
                </TableCell>

              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={filteredProjects.length}
        page={projPage}
        onPageChange={(_, p) => setProjPage(p)}
        rowsPerPage={projRows}
        onRowsPerPageChange={(e) => {
          setProjRows(parseInt(e.target.value, 10));
          setProjPage(0);
        }}
        rowsPerPageOptions={[15, 30, 50, 100]}
      />
    </TableContainer>
  );

  /* ======= Projects: cards (uses your reference CSS) ======= */
  const ProjectsCards = (
    <Box display="grid" gap={2} gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }} mt={1}>
      {paginatedProjects.map((p) => {
        const st = statusStyles(p.project_status);
        const createdDays = daysSince(p.created_at);
        const startDays = daysSince(p.start_date);
        const managerName = toPascalCase(p.project_manager) || "—";
        const initials = managerInitials(p.project_manager) || "?";
        const progress =
          p.project_status === "In Progress"
            ? Math.min(95, 10 + (startDays ? Math.floor(startDays / 3) : 10))
            : p.project_status === "Completed"
            ? 100
            : p.project_status === "Planning"
            ? 5
            : 0;

        return (
          <Card
            key={p.project_id}
            role="button"
            tabIndex={0}
            onClick={() => openDetails(p.project_id)}
            onKeyDown={(e) => e.key === "Enter" && openDetails(p.project_id)}
            sx={{
              p: 0,
              cursor: "pointer",
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              transition: "transform .2s ease, box-shadow .2s ease, outline-color .2s ease",
              outline: "2px solid transparent",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
                outlineColor: st.br,
              },
              "&:focus-visible": { outlineColor: st.br },
              background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 100%)",
            }}
          >
            <Box
              sx={{
                height: 84,
                background: `linear-gradient(120deg, ${st.bg} 0%, rgba(255,255,255,0) 100%)`,
                borderBottom: `1px solid ${st.br}`,
                px: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: st.fg,
                    color: "#fff",
                    width: 36,
                    height: 36,
                    fontSize: 14,
                    border: `2px solid ${st.br}`,
                  }}
                >
                  {initials}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#2a3663" }} noWrap title={p.project_name}>
                    {p.project_name}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={(p.project_status || "—").toUpperCase()}
                      sx={{ bgcolor: st.bg, color: st.fg, borderColor: st.br, height: 22 }}
                      variant="outlined"
                    />
                    {createdDays !== null && (
                      <Chip size="small" variant="outlined" label={`${createdDays}d`} title={`Created ${createdDays} day(s) ago`} sx={{ height: 22 }} />
                    )}
                  </Stack>
                </Box>
              </Stack>
              <Tooltip title="Open details">
                <IconButton size="small">
                  <LaunchOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <CardContent sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                  <Chip size="small" icon={<LocationOnOutlinedIcon />} label={p.project_location_city || "—"} variant="outlined" />
                  <Chip size="small" icon={<BusinessCenterOutlinedIcon />} label={p.project_type || "—"} variant="outlined" />
                  <Chip size="small" icon={<CalendarMonthOutlinedIcon />} label={p.start_date ? new Date(p.start_date).toLocaleDateString("en-GB") : "N/A"} variant="outlined" />
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    ID: <strong>{p.project_id}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap title={managerName}>
                    Manager: <strong>{managerName}</strong>
                  </Typography>
                </Stack>

                <Box sx={{ mt: 0.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {progress}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 6,
                      borderRadius: 999,
                      bgcolor: "rgba(0,0,0,0.06)",
                      "& .MuiLinearProgress-bar": { borderRadius: 999 },
                    }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );

  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: "#F9F9F9",
        borderRadius: 2,
        [theme.breakpoints.down("sm")]: { mt: 0 },
        [theme.breakpoints.up("sm")]: { mt: "-4.6%" },
      }}
    >
      {/* header / toolbar: perfectly aligned like your screenshots */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        spacing={1.25}
        sx={{ mb: 1 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827" }}>
          
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent={{ xs: "space-between", md: "flex-end" }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setProjPage(0);
              }}
              displayEmpty
              sx={{ background: "#fff", borderRadius: 2 }}
            >
              <MenuItem value="ALL">Status: ALL</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Planning">Planning</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
            </Select>
          </FormControl>

          <TextField
            placeholder="Search tickets"
            size="small"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setProjPage(0);
            }}
            sx={{
              width: { xs: 1, sm: 280 },
              backgroundColor: "#fff",
              borderRadius: 2,
              "& .MuiOutlinedInput-root": { borderRadius: 2 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={0.5} sx={{ bgcolor: "#fff", borderRadius: 2, p: 0.25, border: "1px solid #e5e7eb" }}>
            <Tooltip title="Table view">
              <IconButton
                size="small"
                onClick={() => setViewMode("table")}
                sx={{ bgcolor: viewMode === "table" ? "#eef2ff" : "transparent" }}
              >
                <ViewAgendaIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Card view">
              <IconButton
                size="small"
                onClick={() => setViewMode("card")}
                sx={{ bgcolor: viewMode === "card" ? "#eef2ff" : "transparent" }}
              >
                <ViewModuleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsFormOpen(true)}
            sx={{ backgroundColor: "#2A3663", borderRadius: 2 }}
          >
            Add Project
          </Button>
        </Stack>
      </Stack>

      {/* content */}
      {viewMode === "table" ? ProjectsTable : ProjectsCards}

      {/* PIP dialog */}
      <Dialog
        open={isPipOpen}
        onClose={() => setIsPipOpen(false)}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            height: "90vh",
            mt: 7,
            mx: 1,
            width: "calc(100% - 16px)",
            borderRadius: 3,
          },
        }}
      >
        {selectedProjectId && (
          <ProjectDetails projectId={selectedProjectId} onClose={() => setIsPipOpen(false)} />
        )}
      </Dialog>

      {/* Add Project dialog */}
      <Dialog open={isFormOpen} onClose={() => setIsFormOpen(false)} fullWidth maxWidth="md">
        <ProjectOnBoardingForm onClose={() => setIsFormOpen(false)} />
      </Dialog>
    </Box>
  );
};

export default ProjectOnboarding;