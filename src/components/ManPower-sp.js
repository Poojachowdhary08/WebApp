// ManpowerWithCardsUI.js — FULL COMPONENT (cards + table) — UI updated to match PaymentWorkerTab
// Drop-in replacement for plain JS (no TypeScript syntax).

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
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
  Chip,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Grid,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Divider,
  Stack,
} from "@mui/material";
import { Tabs, Tab } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import LaunchOutlinedIcon from "@mui/icons-material/LaunchOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import TableRowsIcon from "@mui/icons-material/TableRows";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";

// Child components (keep your originals)
import WorkSummary from "./Work-Summary";
import EmployeeTab from "./EmployeeTab";
import LaborOnboardingForm from "./LaborOnboardingForm";
import ContractorOnboardingForm from "./ContractorOnboardingForm";
import ManpowerDetail from "./ManpowerDetails";
import AssignManpowerDialog from "./AssignManpowerDialog";

/* ---------- plain CSS to mirror PaymentWorkerTab look ---------- */
const css = `
.mp-header {
  position: sticky; top: 0; z-index: 2;
  background: linear-gradient(180deg, #F7F9FC 0%, #F4F6F9 100%);
  border-bottom: 1px solid #E5E7EB; padding: 16px 12px;
}
.mp-title { font-weight: 800; color: #2A3663; letter-spacing: .3px; }
.mp-chip-pill { font-weight: 700; letter-spacing: .3px; }
.mp-table-head th {
  background: linear-gradient(90deg, #2A3663 0%, #3b4c8a 100%);
  color:#fff;font-weight:800; white-space:nowrap;
}
.mp-row:hover td { background: rgba(59,130,246,.08); }
.mp-card{ border-radius:16px; overflow:hidden; cursor:pointer;
  border:1px solid #E5E7EB; transition:transform .15s ease, box-shadow .15s ease;
  background: linear-gradient(180deg, #fff 60%, rgba(59,130,246,.08) 100%);
}
.mp-card:hover{ transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,.08); }
.mp-card-top{ height:70px; border-bottom:1px solid #E5E7EB; display:flex;
  align-items:center; justify-content:space-between; padding:0 16px;
  background: linear-gradient(120deg, #EEF2FF 0%, rgba(255,255,255,0) 100%);
}
.mp-chip-row .MuiChip-root{ border-radius:6px; }
.mp-progress-wrap{ margin-top:10px }
.mp-progress-label{ font-size: 11px; color:#6B7280; margin-bottom:6px }
.mp-slim .MuiLinearProgress-root{ height:7px; border-radius:999px; background:#E5E7EB }
`;

// ---- helpers ----
const statusPill = (status) => {
  const s = (status || "OPEN").toUpperCase();
  if (s === "OPEN" || s === "ACTIVE")
    return { bg: "#E8F1FF", color: "#1E63D1", border: "1px solid #BFD6FF" };
  if (s === "PENDING")
    return { bg: "#FFF8E1", color: "#9C6F19", border: "1px solid #FFE082" };
  if (s === "COMPLETED" || s === "CLOSED")
    return { bg: "#EAF7ED", color: "#2E7D32", border: "1px solid #B7E0BE" };
  if (s === "INACTIVE")
    return { bg: "#F5F5F5", color: "#616161", border: "1px solid #E0E0E0" };
  return { bg: "#ECEFF1", color: "#455A64", border: "1px solid #CFD8DC" };
};

const headerBlue = "#20335A";
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n ?? 0));
const toAge = (age) => (age === 0 || age ? String(age) : "");

// ---- main component ----
export default function Manpower() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Data & UI state
  const [manpower, setManpower] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("manpower");

  // dialogs/forms
  const [openDialog, setOpenDialog] = useState(false);
  const [formType, setFormType] = useState(null); // "labor" | "contractor"
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);

  // assignment
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectProperties, setProjectProperties] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedContractors, setSelectedContractors] = useState([]);
  const [selectedLabors, setSelectedLabors] = useState([]);
  const [assignAmount, setAssignAmount] = useState(0);
  const [expandedContractors, setExpandedContractors] = useState({});
  const [contractorSearch, setContractorSearch] = useState("");
  const [laborSearch, setLaborSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");

  // top bar filters
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // context menu
  const [contextMenu, setContextMenu] = useState(null); // {mouseX, mouseY, id, type}

  // alerts
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMsg, setAlertMsg] = useState("");

  const openAlert = (title, msg) => {
    setAlertTitle(title);
    setAlertMsg(msg);
    setAlertOpen(true);
  };
  const closeAlert = () => setAlertOpen(false);

  // ---- effects ----
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:8080/labors-contractors");
        if (!res.ok) throw new Error("Failed to fetch manpower data");
        const data = await res.json();
        if (!alive) return;
        setManpower(Array.isArray(data) ? data.filter(Boolean) : []);
      } catch (e) {
        if (alive) setError(e?.message || "Unexpected error");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadProjects = async () => {
      try {
        const res = await fetch("http://localhost:8080/projects_m");
        if (!res.ok) throw new Error("Failed to fetch projects");
        const data = await res.json();
        if (!alive) return;
        const list = Array.isArray(data)
          ? data
              .map((p) => ({ project_id: p?.project_id, project_name: p?.project_name }))
              .filter((p) => p.project_id && p.project_name)
          : Array.isArray(data?.projects)
          ? data.projects
              .map((p) => ({ project_id: p?.project_id, project_name: p?.project_name }))
              .filter((p) => p.project_id && p.project_name)
          : [];
        setProjects(list);
      } catch {
        // ignore
      }
    };
    loadProjects();
    return () => {
      alive = false;
    };
  }, []);

  // ---- derived data ----
  const flattened = useMemo(() => {
    return (Array.isArray(manpower) ? manpower : [])
      .flatMap((person) => {
        if (!person) return [];
        if (person.type === "CONTRACTOR" && Array.isArray(person.labors)) {
          return [
            { ...person, isParent: true },
            ...person.labors.map((l) => ({ ...l, parentId: person.id })),
          ];
        }
        return person;
      })
      .filter(Boolean);
  }, [manpower]);

  const contractors = useMemo(
    () => flattened.filter((p) => p?.type === "CONTRACTOR"),
    [flattened]
  );
  const labors = useMemo(
    () => flattened.filter((p) => p?.type === "LABOR"),
    [flattened]
  );
  const unassignedLabors = useMemo(
    () => labors.filter((l) => !l.parentId),
    [labors]
  );
  const parentRows = useMemo(
    () =>
      flattened.filter(
        (p) => p.type === "CONTRACTOR" || (p.type === "LABOR" && !p.parentId)
      ),
    [flattened]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parentRows.filter((p) => {
      const f = [
        p.name,
        p.employee_id,
        p.work_type,
        p.type,
        p.number,
        p.status,
        p.property_name,
      ].map((x) => (x ? String(x).toLowerCase() : ""));
      const byText = !q || f.some((x) => x.includes(q));
      const byStatus =
        statusFilter === "ALL" ||
        (p.status || "OPEN").toUpperCase() === statusFilter;
      return byText && byStatus;
    });
  }, [parentRows, search, statusFilter]);

  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });
  const sorted = useMemo(() => {
    const data = [...filtered];
    const { key, direction } = sortConfig;
    data.sort((a, b) => {
      const av = a?.[key] ?? "";
      const bv = b?.[key] ?? "";
      if (typeof av === "number" && typeof bv === "number")
        return direction === "asc" ? av - bv : bv - av;
      if (key === "created_at") {
        return direction === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      return direction === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return data;
  }, [filtered, sortConfig]);

  const paginated = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return sorted.slice(start, start + itemsPerPage);
  }, [sorted, currentPage, itemsPerPage]);

  // ---- handlers ----
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleExpand = (id) =>
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const openCreateDialog = (type) => {
    setFormType(type);
    setOpenDialog(true);
  };
  const closeCreateDialog = () => {
    setOpenDialog(false);
    setFormType(null);
  };

  const handleContextOpen = (e, person) => {
    e.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: e.clientX + 2,
            mouseY: e.clientY - 6,
            id: person.id,
            type: person.type,
          }
        : null
    );
  };
  const handleContextClose = () => setContextMenu(null);

  const handleEditFromMenu = () => {
    if (!contextMenu?.id) return;
    const person = flattened.find((p) => p.id === contextMenu.id);
    if (!person) return;
    setSelectedPerson(person);
    setOpenDetail(true);
    handleContextClose();
  };

  const onRowClick = (person) => {
    if (!person?.id) return;
    setSelectedPerson(person);
    setOpenDetail(true);
  };

  const openAssign = (prefilledProject = null, prefilledProperty = null) => {
    setOpenAssignDialog(true);
    if (prefilledProject && prefilledProperty) {
      // Pre-fill project and property if provided
      setSelectedProject(prefilledProject);
      setSelectedProperty(prefilledProperty);
      // Fetch properties for the pre-filled project
      onProjectChange({ project_id: prefilledProject });
    } else {
      setSelectedProject("");
      setSelectedProperty("");
    }
    setSelectedContractors([]);
    setSelectedLabors([]);
    setAssignAmount(0);
    setExpandedContractors({});
  };
  const closeAssign = () => {
    setOpenAssignDialog(false);
    setSelectedProject("");
    setSelectedProperty("");
    setSelectedContractors([]);
    setSelectedLabors([]);
    setAssignAmount(0);
    setProjectProperties([]);
    setContractorSearch("");
    setLaborSearch("");
    setProjectSearch("");
    setPropertySearch("");
    setExpandedContractors({});
  };

  const onProjectChange = async (project) => {
    if (!project) {
      setSelectedProject("");
      setSelectedProperty("");
      setProjectProperties([]);
      return;
    }
    setSelectedProject(project.project_id);
    setSelectedProperty("");
    setProjectProperties([]);
    try {
      const res = await fetch(
        `http://localhost:8080/projects_m/${project.project_id}/properties`
      );
      if (!res.ok) throw new Error("Failed to fetch project properties");
      const data = await res.json();
      setProjectProperties(Array.isArray(data?.properties) ? data.properties : []);
    } catch (e) {
      openAlert("Error", e?.message || "Could not load properties");
    }
  };

  const submitAssign = async () => {
    if (!selectedProject || !selectedProperty) {
      openAlert("Missing Selection", "Please select both project and property");
      return;
    }
    const payload = {
      projectId: selectedProject,
      propertyId: selectedProperty,
      contractorIds: selectedContractors.map((i) => i.employee_id || i.id),
      laborIds: selectedLabors.map((i) => i.employee_id || i.id),
      assignAmount: assignAmount || 0,
    };
    try {
      const res = await fetch("http://localhost:8080/manpower/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create assignments");
      closeAssign();
      openAlert("Success", "Assigned successfully");
    } catch (e) {
      openAlert("Error", e?.message || "Assignment failed");
    }
  };

  /* ---------- Header (matches PaymentWorkerTab layout) ---------- */
  const HeaderFilters = () => (
    <Box className="mp-header"  >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        marginTop="-50px"
      >
        <Typography variant="h5" className="mp-title">
          {/* Man Power */}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 140, background: "#fff", borderRadius: 1 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {["ALL", "OPEN", "ACTIVE", "PENDING", "INACTIVE", "COMPLETED"].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search manpower"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260, background: "#fff", borderRadius: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
          >
            <ToggleButton value="table">
              <TableRowsIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="card">
              <ViewModuleIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>

          {/* <Button
            variant="contained"
            onClick={openAssign}
            sx={{ textTransform: "none", fontWeight: 700, height: 40 }}
          >
            Assign Manpower
          </Button> */}
        </Stack>
      </Stack>
    </Box>
  );

  /* ---------- Card (mirrors PaymentWorkerTab look) ---------- */
  const CardTile = ({ person }) => {
    const subject = person?.name || "No subject";
    const property = person?.property_name || person?.work_type || "—";
    const created = person?.created_at || "—";
    const age = toAge(person?.age);
    const progress = clamp(person?.progress ?? 40);
    const pill = statusPill(person?.status);

    return (
      <Card
        className="mp-card"
        onClick={() => onRowClick(person)}
        onContextMenu={(e) => handleContextOpen(e, person)}
      >
        <div className="mp-card-top">
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, color: "#2A3663" }}
            noWrap
            title={subject}
          >
            {subject}
          </Typography>
          <Chip
            size="small"
            className="mp-chip-pill"
            label={(person?.status || "OPEN").toUpperCase()}
            variant="outlined"
            sx={{ bgcolor: pill.bg, color: pill.color, border: pill.border, height: 22, borderWidth: 1.5 }}
          />
        </div>

        <CardContent sx={{ p: 2 }}>
          {/* chip row: property • created • age */}
          <Stack direction="row" spacing={1} className="mp-chip-row" flexWrap="wrap">
            <Chip size="small" icon={<BusinessOutlinedIcon />} label={property} variant="outlined" />
            <Chip size="small" icon={<EventOutlinedIcon />} label={created} variant="outlined" />
            {!!age && <Chip size="small" label={age} variant="outlined" />}
          </Stack>

          {/* progress */}
          <div className="mp-progress-wrap">
            <div className="mp-progress-label">Progress</div>
            <div className="mp-slim">
              <LinearProgress variant="determinate" value={progress} />
            </div>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {progress}%
            </Typography>
          </div>

          <Divider sx={{ my: 1.25 }} />

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: "75%" }}>
              ID: <b>{person?.employee_id || person?.id}</b>
            </Typography>
            <LaunchOutlinedIcon fontSize="small" color="action" />
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const HeaderCell = ({ label, k }) => (
    <TableCell
      onClick={() => handleSort(k)}
      sx={{
        fontWeight: 700,
        color: "white",
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontSize: 13,
        borderBottom: "none",
        py: 1.2,
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.5}>
        <span>{label}</span>
        {sortConfig.key === k ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
      </Stack>
    </TableCell>
  );

  const StatusPillCell = ({ value }) => {
    const p = statusPill(value);
    return (
      <Chip
        size="small"
        label={(value || "OPEN").toUpperCase()}
        variant="outlined"
        sx={{ bgcolor: p.bg, color: p.color, border: p.border, fontWeight: 700, height: 22, borderWidth: 1.5 }}
      />
    );
  };

  // ---- render ----
  return (
    <Box sx={{ p: 0, backgroundColor: "#F6F7FB" }}>
      <style>{css}</style>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        indicatorColor="primary"
        textColor="primary"
        sx={{ mb: 0 }}
      >
        <Tab label="Man Power" value="manpower" />
        <Tab label="Work Summary" value="work-summary" />
        <Tab label="Employees" value="employees" />
      </Tabs>

      {activeTab === "manpower" && (
        <>
          <HeaderFilters />

          {/* CARD VIEW */}
          {viewMode === "card" && (
            <Grid container spacing={2} sx={{ px: 2, pb: 2 }}>
              {loading ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: "center" }}>Loading...</Paper>
                </Grid>
              ) : error ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: "center" }}>{error}</Paper>
                </Grid>
              ) : paginated.length === 0 ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: "center" }}>No results</Paper>
                </Grid>
              ) : (
                paginated.map((p) => (
                  <Grid key={p.id} item xs={12} sm={6} md={6} lg={4} xl={3}>
                    <CardTile person={p} />
                  </Grid>
                ))
              )}
            </Grid>
          )}

          {/* TABLE VIEW */}
          {viewMode === "table" && (
        <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          mx: 2,
        }}
      >
        <Table
          sx={{
            tableLayout: "fixed",
            width: "100%",
            minWidth: 950,
            "& td, & th": { whiteSpace: "nowrap" },
          }}
          size="small"
        >
          <TableHead>
          <TableRow sx={{ background: "linear-gradient(90deg, #2A3663 0%, #3b4c8a 100%)" }}>
              <HeaderCell label="ID" k="employee_id" />
              <HeaderCell label="PROPERTY" k="property_name" />
              <HeaderCell label="NAME" k="name" />
              <HeaderCell label="CREATED" k="created_at" />
              <TableCell
                sx={{ fontWeight: 800, color: "white", borderBottom: "none", fontSize: 13 }}
              >
                Status
              </TableCell>
              {/* <TableCell
                sx={{
                  fontWeight: 800,
                  color: "white",
                  borderBottom: "none",
                  fontSize: 13,
                  textAlign: "right",
                }}
              >
                Age
              </TableCell> */}
            </TableRow>
          </TableHead>
      
          <TableBody
            sx={{
              "& tr:nth-of-type(odd)": { backgroundColor: "rgba(0,0,0,0.015)" },
              "& tr:hover td": { backgroundColor: "rgba(42,54,99,0.04)" },
              "& td": { borderColor: "#ECF0F6" },
            }}
          >
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {error}
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((person) => (
                <React.Fragment key={person.id}>
                  {/* Contractor row */}
                  {person.type === "CONTRACTOR" && (
                    <TableRow
                      hover
                      className="pwt-row"
                      onClick={() => onRowClick(person)}
                      onContextMenu={(e) => handleContextOpen(e, person)}
                      sx={{
                        cursor: "pointer",
                        transition: "transform .12s ease",
                        "&:hover": { transform: "translateX(2px)" },
                      }}
                    >
                      <TableCell sx={{ py: 1.1 }}>
                        {person.labors?.length > 0 && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExpand(person.id);
                            }}
                            sx={{ mr: 0.5 }}
                          >
                            {expandedRows[person.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        )}
                        {person.employee_id || person.id}
                      </TableCell>
                      <TableCell sx={{ py: 1.1 }}>
                        {person.property_name || person.work_type || "—"}
                      </TableCell>
                      <TableCell sx={{ py: 1.1, textTransform: "none" }}>
                        {person.name || "No subject"}
                      </TableCell>
                      <TableCell sx={{ py: 1.1 }}>
                        {person.created_at || "—"}
                      </TableCell>
                      <TableCell sx={{ py: 1.1 }}>
                        <StatusPillCell value={person.status} />
                      </TableCell>
                      {/* <TableCell sx={{ py: 1.1, textAlign: "right" }}>
                        <Chip size="small" label={toAge(person.age) || ""} variant="outlined" sx={{ borderRadius: 6 }} />
                      </TableCell> */}
                    </TableRow>
                  )}
      
                  {/* expanded labors under contractor */}
                  {person.type === "CONTRACTOR" &&
                    expandedRows[person.id] &&
                    Array.isArray(person.labors) &&
                    person.labors.map((labor) => (
                      <TableRow
                        key={`lab-${labor.id}`}
                        hover
                        className="pwt-row"
                        onClick={() => onRowClick(labor)}
                        onContextMenu={(e) => handleContextOpen(e, labor)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell sx={{ py: 1.1 }}>
                          <SubdirectoryArrowRightIcon
                            sx={{ color: "gray", mr: 1, verticalAlign: "middle" }}
                          />
                          {labor.employee_id || labor.id}
                        </TableCell>
                        <TableCell sx={{ py: 1.1 }}>
                          {labor.property_name || labor.work_type || "—"}
                        </TableCell>
                        <TableCell sx={{ py: 1.1 }}>{labor.name || "No subject"}</TableCell>
                        <TableCell sx={{ py: 1.1 }}>{labor.created_at || "—"}</TableCell>
                        <TableCell sx={{ py: 1.1 }}>
                          <StatusPillCell value={labor.status} />
                        </TableCell>
                        {/* <TableCell sx={{ py: 1.1, textAlign: "right" }}>
                          <Chip size="small" label={toAge(labor.age) || ""} variant="outlined" sx={{ borderRadius: 6 }} />
                        </TableCell> */}
                      </TableRow>
                    ))}
      
                  {/* standalone labor */}
                  {person.type === "LABOR" && !person.parentId && (
                    <TableRow
                      hover
                      className="pwt-row"
                      onClick={() => onRowClick(person)}
                      onContextMenu={(e) => handleContextOpen(e, person)}
                      sx={{
                        cursor: "pointer",
                        transition: "transform .12s ease",
                        "&:hover": { transform: "translateX(2px)" },
                      }}
                    >
                      <TableCell sx={{ py: 1.1 }}>
                        {person.employee_id || person.id}
                      </TableCell>
                      <TableCell sx={{ py: 1.1 }}>
                        {person.property_name || person.work_type || "—"}
                      </TableCell>
                      <TableCell sx={{ py: 1.1 }}>{person.name || "No subject"}</TableCell>
                      <TableCell sx={{ py: 1.1 }}>{person.created_at || "—"}</TableCell>
                      <TableCell sx={{ py: 1.1 }}>
                        <StatusPillCell value={person.status} />
                      </TableCell>
                      {/* <TableCell sx={{ py: 1.1, textAlign: "right" }}>
                        <Chip size="small" label={toAge(person.age) || ""} variant="outlined" sx={{ borderRadius: 6 }} />
                      </TableCell> */}
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      
        <TablePagination
          component="div"
          count={sorted.length}
          page={currentPage}
          onPageChange={(_, n) => setCurrentPage(n)}
          rowsPerPage={itemsPerPage}
          onRowsPerPageChange={(e) => {
            setItemsPerPage(parseInt(e.target.value, 15));
            setCurrentPage(0);
          }}
          rowsPerPageOptions={[15, 30, 45, 50, 100]}
        />
      </TableContainer>
      
          )}

          {/* Create / Edit dialogs */}
          <Dialog open={openDialog} onClose={closeCreateDialog} fullWidth maxWidth="md">
            <DialogTitle>{formType === "labor" ? "Add Labor" : "Add Contractor"}</DialogTitle>
            <DialogContent>
              {formType === "labor" ? (
                <LaborOnboardingForm
                  onClose={closeCreateDialog}
                  isEdit={!!selectedPerson}
                  selectedPerson={selectedPerson}
                />
              ) : (
                <ContractorOnboardingForm
                  onClose={closeCreateDialog}
                  isEdit={!!selectedPerson}
                  selectedPerson={selectedPerson}
                />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={closeCreateDialog}>Close</Button>
            </DialogActions>
          </Dialog>

          {/* Assign manpower */}
          <AssignManpowerDialog
            open={openAssignDialog}
            onClose={closeAssign}
            contractors={contractors}
            unassignedLabors={unassignedLabors}
            projects={projects}
            projectProperties={projectProperties}
            selectedProject={selectedProject}
            selectedProperty={selectedProperty}
            selectedContractors={selectedContractors}
            selectedLabors={selectedLabors}
            assignAmount={assignAmount}
            contractorSearch={contractorSearch}
            laborSearch={laborSearch}
            projectSearch={projectSearch}
            propertySearch={propertySearch}
            expandedContractors={expandedContractors}
            setSelectedContractors={setSelectedContractors}
            setSelectedLabors={setSelectedLabors}
            setContractorSearch={setContractorSearch}
            setLaborSearch={setLaborSearch}
            setProjectSearch={setProjectSearch}
            setPropertySearch={setPropertySearch}
            setSelectedProperty={setSelectedProperty}
            setAssignAmount={setAssignAmount}
            toggleContractorExpand={(id) =>
              setExpandedContractors((prev) => ({ ...prev, [id]: !prev[id] }))
            }
            onProjectChange={onProjectChange}
            onSubmit={submitAssign}
          />

          {/* Context menu */}
          <Menu
            open={contextMenu !== null}
            onClose={handleContextClose}
            anchorReference="anchorPosition"
            anchorPosition={
              contextMenu !== null
                ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                : undefined
            }
          >
            <MenuItem onClick={handleEditFromMenu}>
              <MoreVertIcon sx={{ mr: 1 }} />
              Edit
            </MenuItem>
          </Menu>

          {/* Alerts */}
          <Dialog open={alertOpen} onClose={closeAlert}>
            <DialogTitle>{alertTitle}</DialogTitle>
            <DialogContent>
              <Typography>{alertMsg}</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeAlert}>OK</Button>
            </DialogActions>
          </Dialog>

          {/* Detail modal */}
          {selectedPerson && (
            <ManpowerDetail
              open={openDetail}
              onClose={() => setOpenDetail(false)}
              id={selectedPerson.id}
              type={selectedPerson.type}
            />
          )}
        </>
      )}
      {activeTab === "work-summary" && <WorkSummary />}
      {activeTab === "employees" && <EmployeeTab />}
    </Box>
  );
}