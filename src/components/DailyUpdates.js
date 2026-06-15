// src/components/DailyUpdates.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  CircularProgress,
  Stack,
  Divider,
  MenuItem,
  Grid,
  Avatar,
  Tabs,
  Tab,
  Tooltip,
  TablePagination,
} from "@mui/material";

// Icons
import {
  Description as FileIcon,
  Search as SearchIcon,
  Notifications as AlertIcon,
  CheckCircleOutline as CompletedIcon,
  PeopleOutline as TotalIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";

// ✅ Import PropertyDetailsDialog (same as Projects.jsx flow)
import PropertyDetailsDialog from "../components/PropertyDetailsDialog";

/* ------------------------- Utils ------------------------- */

const toYyyyMmDd = (date) => date.toISOString().split("T")[0];

const getToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toYyyyMmDd(d);
};

const getYesterday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  return toYyyyMmDd(d);
};

const toCamelCase = (value) =>
  value.replace(/[_-][a-z]/g, (match) => match.slice(-1).toUpperCase());

const camelize = (input) => {
  if (Array.isArray(input)) return input.map((x) => camelize(x));
  if (input && typeof input === "object" && input.constructor === Object) {
    return Object.entries(input).reduce((acc, [key, val]) => {
      acc[toCamelCase(key)] = camelize(val);
      return acc;
    }, {});
  }
  return input;
};

const formatTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

const formatDateOnly = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return value;
  }
};

const formatImageDate = (value) => {
  if (!value) return "—";
  return `${formatTime(value)} - ${formatDateOnly(value)}`;
};

const safeLower = (v) => (v == null ? "" : String(v).toLowerCase());

/* ------------------------- Small UI Bits ------------------------- */

const SummaryCard = ({ title, value, icon: Icon, iconBgColor, height = 92 }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: "1px solid #E6EAF2",
        bgcolor: "#FFFFFF",
        px: 2.2,
        py: 1.6,
        height,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ width: "100%" }}
      >
        <Box>
          <Typography sx={{ color: "#6B7280", fontSize: 13, fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography
            sx={{
              mt: 0.6,
              fontSize: 30,
              fontWeight: 900,
              color: "#111827",
              lineHeight: 1,
            }}
          >
            {value ?? "—"}
          </Typography>
        </Box>

        <Avatar
          sx={{
            bgcolor: iconBgColor,
            width: 46,
            height: 46,
            boxShadow: "0 10px 22px rgba(17,24,39,0.14)",
          }}
        >
          <Icon sx={{ color: "#fff" }} />
        </Avatar>
      </Stack>
    </Paper>
  );
};

const PropertyChip = ({ label, onClick }) => (
  <Chip
    label={label}
    size="small"
    onClick={onClick}
    clickable
    sx={{
      mr: 1,
      mb: 1,
      bgcolor: "#EEF2FF",
      color: "#1F2A5A",
      fontWeight: 800,
      border: "1px solid #E5E7EB",
      borderRadius: 2,
      height: 26,
      "& .MuiChip-label": { px: 1.1, fontSize: 12 },
      "&:hover": { bgcolor: "#E0E7FF" },
    }}
  />
);

const PhaseAlertBox = ({ record }) => {
  const progress = record.progressPercentage ?? record.progress_percentage ?? 0;
  const daysOverdue = record.daysOverdue ?? record.days_overdue;
  const isOverdue = typeof daysOverdue === "number" && daysOverdue > 0;

  const phaseName = record.phaseName || record.phase_name || "Phase";
  const projectName =
    record.projectName ||
    record.project_name ||
    record.projectId ||
    record.project_id ||
    "Project";
  const propertyLabel =
    record.propertyName ||
    record.property_name ||
    record.propertyId ||
    record.property_id ||
    "Property";

  const endDate = record.endDate || record.end_date;

  const ringColor =
    progress >= 75 ? "#2ECC71" : progress > 50 ? "#F2C94C" : "#F44336";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 1.5,
        border: "1px solid #E6EAF2",
        borderRadius: 2.25,
        bgcolor: "#fff",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
      >
        <Box sx={{ minWidth: "70%" }}>
          {isOverdue && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "#EF4444",
                fontWeight: 900,
                mb: 0.3,
              }}
            >
              • {daysOverdue} day{daysOverdue === 1 ? "" : "s"} overdue
            </Typography>
          )}

          <Typography
            sx={{
              fontSize: 13.5,
              fontWeight: 900,
              color: "#111827",
              lineHeight: 1.2,
            }}
          >
            {phaseName}
          </Typography>

          <Typography
            sx={{
              mt: 0.3,
              fontSize: 12,
              color: "#6B7280",
              fontWeight: 700,
            }}
          >
            {propertyLabel} — {projectName}
          </Typography>

          {endDate && (
            <Typography
              sx={{ mt: 0.7, fontSize: 12, color: "#6B7280", fontWeight: 800 }}
            >
              End date: {formatDateOnly(endDate)}
            </Typography>
          )}
        </Box>

        <Box sx={{ textAlign: "right", minWidth: "30%" }}>
          <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, Number(progress) || 0))}
              size={44}
              thickness={6}
              sx={{ color: ringColor }}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: "absolute",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}
              >
                {`${Math.round(Number(progress) || 0)}%`}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
};

/* ------------------------- Main Component ------------------------- */

const DailyUpdates = ({ onClose, onBack }) => {
  const handleClose = () => {
    if (typeof onClose === "function") return onClose();
    if (typeof onBack === "function") return onBack();
    window.history.back(); // last fallback
  };
  const BASE_URL = "http://localhost:8080";

  const defaultDate = useMemo(() => getToday(), []);
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phaseError, setPhaseError] = useState(null);

  const [data, setData] = useState(null);
  const [phaseAlerts, setPhaseAlerts] = useState(null);

  const [selectedProject, setSelectedProject] = useState("ALL");
  const [selectedProperty, setSelectedProperty] = useState("ALL");
  const [searchText, setSearchText] = useState("");

  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");

  const [alertTab, setAlertTab] = useState("due");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [powuTab, setPowuTab] = useState(0);

  // ✅ NEW: Embedded PropertyDetails flow (same as Projects.jsx)
  const [selectedPropertyDetails, setSelectedPropertyDetails] = useState(null);
  const [propertyDetailsLoading, setPropertyDetailsLoading] = useState(false);
  const [propertyDetailsError, setPropertyDetailsError] = useState(null);

  useEffect(() => {
    setPowuTab(0);
  }, [selectedDate, selectedProject, selectedProperty, searchText, data]);

  const fetchUpdates = async (date) => {
    if (!date) return;

    setLoading(true);
    setError(null);
    setPhaseError(null);
    setData(null);
    setPhaseAlerts(null);

    try {
      const [summaryRes, phaseRes] = await Promise.all([
        axios.get(`${BASE_URL}/d_summary/task-updates/${date}`),
        axios.get(`${BASE_URL}/d_summary/phase-alerts/${date}`),
      ]);

      setData(camelize(summaryRes.data));
      setPhaseAlerts(camelize(phaseRes.data));
    } catch (err) {
      console.error("Error fetching task updates summary", err);

      setError("Failed to load task updates for the selected date.");
      setData(null);

      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setPhaseAlerts(null);
      } else {
        setPhaseError("Failed to load phase alerts for the selected date.");
        setPhaseAlerts(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    setPage(0);
  }, [selectedProject, selectedProperty, searchText, selectedDate, orderBy, order]);

  const flattenedUpdatesRaw = useMemo(() => {
    if (!data?.updatesByProject) return [];

    const rows = [];
    data.updatesByProject.forEach((project) => {
      const projectName =
        project.projectName && project.projectName !== "-"
          ? project.projectName
          : project.projectId || "Unassigned Project";

      (project.properties || []).forEach((property) => {
        const propertyName =
          property.propertyName && property.propertyName !== "-"
            ? property.propertyName
            : property.propertyId || "Unnamed Property";

        (property.updates || []).forEach((update) => {
          rows.push({
            ...update,
            projectId: project.projectId,
            projectName,
            propertyId: property.propertyId,
            propertyName,
          });
        });
      });
    });

    return rows.sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [data]);

  const uniqueProjects = useMemo(() => {
    const map = new Map();

    flattenedUpdatesRaw.forEach((item) => {
      const id = item.projectId || item.projectName || "UNASSIGNED";
      if (!map.has(id)) map.set(id, { id, label: item.projectName || id });
    });

    (data?.propertiesWithoutUpdates || []).forEach((prop) => {
      const id = prop.projectId || prop.projectName || "UNASSIGNED";
      if (!map.has(id)) map.set(id, { id, label: prop.projectName || id });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [flattenedUpdatesRaw, data]);

  const uniqueProperties = useMemo(() => {
    const map = new Map();

    const pushProp = (projectKey, propertyKey, label) => {
      const key = `${projectKey}::${propertyKey}`;
      if (!map.has(key))
        map.set(key, { id: propertyKey, label, projectId: projectKey });
    };

    flattenedUpdatesRaw.forEach((item) => {
      const projectKey = item.projectId || item.projectName || "UNASSIGNED";
      const propertyKey =
        item.propertyId || item.propertyName || "UNASSIGNED_PROPERTY";
      const label =
        item.propertyName && item.propertyName !== "-"
          ? item.propertyName
          : propertyKey;
      pushProp(projectKey, propertyKey, label);
    });

    (data?.propertiesWithoutUpdates || []).forEach((prop) => {
      const projectKey = prop.projectId || prop.projectName || "UNASSIGNED";
      const propertyKey =
        prop.propertyId || prop.propertyName || "UNASSIGNED_PROPERTY";
      const label =
        prop.propertyName && prop.propertyName !== "-"
          ? prop.propertyName
          : propertyKey;
      pushProp(projectKey, propertyKey, label);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [flattenedUpdatesRaw, data]);

  const flattenedUpdates = useMemo(() => {
    let filtered = flattenedUpdatesRaw.filter((item) => {
      const matchesProject =
        selectedProject === "ALL" ||
        item.projectId === selectedProject ||
        item.projectName === selectedProject;

      const matchesProperty =
        selectedProperty === "ALL" ||
        item.propertyId === selectedProperty ||
        item.propertyName === selectedProperty;

      const matchesSearch =
        !searchText ||
        [
          item.propertyName,
          item.projectName,
          item.updateText,
          item.engineerName,
          item.phaseName,
        ]
          .map((f) => safeLower(f))
          .some((v) => v.includes(safeLower(searchText)));

      return matchesProject && matchesProperty && matchesSearch;
    });

    filtered.sort((a, b) => {
      let aV, bV;

      switch (orderBy) {
        case "date":
          aV = new Date(a.createdAt || a.created_at || 0).getTime();
          bV = new Date(b.createdAt || b.created_at || 0).getTime();
          return order === "asc" ? aV - bV : bV - aV;

        case "project":
          aV = safeLower(a.projectName || a.project_name);
          bV = safeLower(b.projectName || b.project_name);
          break;

        case "property":
          aV = safeLower(a.propertyName || a.property_name);
          bV = safeLower(b.propertyName || b.property_name);
          break;

        case "phase":
          aV = safeLower(a.phaseName || a.phase_name);
          bV = safeLower(b.phaseName || b.phase_name);
          break;

        case "engineer":
          aV = safeLower(a.engineerName || a.engineer_name);
          bV = safeLower(b.engineerName || b.engineer_name);
          break;

        default:
          aV = 0;
          bV = 0;
      }

      if (aV < bV) return order === "asc" ? -1 : 1;
      if (aV > bV) return order === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    flattenedUpdatesRaw,
    selectedProject,
    selectedProperty,
    searchText,
    orderBy,
    order,
  ]);

  const paginatedUpdates = useMemo(() => {
    const start = page * rowsPerPage;
    return flattenedUpdates.slice(start, start + rowsPerPage);
  }, [flattenedUpdates, page, rowsPerPage]);

  const propertiesWithoutUpdates = useMemo(() => {
    return (data?.propertiesWithoutUpdates || []).map((prop) => ({
      ...prop,
      projectName:
        prop.projectName && prop.projectName !== "-"
          ? prop.projectName
          : prop.projectId || "Unassigned Project",
      propertyName:
        prop.propertyName && prop.propertyName !== "-"
          ? prop.propertyName
          : prop.propertyId || "Unnamed Property",
    }));
  }, [data]);

  const propertiesGroupedByProject = useMemo(() => {
    const grouped = new Map();
    propertiesWithoutUpdates.forEach((prop) => {
      const projectKey = prop.projectId || prop.projectName || "UNASSIGNED";
      if (!grouped.has(projectKey)) {
        grouped.set(projectKey, {
          projectId: prop.projectId,
          projectName: prop.projectName,
          properties: [],
        });
      }
      grouped.get(projectKey).properties.push(prop);
    });
    return Array.from(grouped.values()).sort((a, b) =>
      (a.projectName || "").localeCompare(b.projectName || "")
    );
  }, [propertiesWithoutUpdates]);

  const summary = data?.summary;

  const handleSort = (col) => {
    const isAsc = orderBy === col && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(col);
  };

  const imageFileTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/jpg",
  ];

  const isImageFile = (file) => {
    const mime =
      file?.fileType ||
      file?.file_type ||
      file?.mimeType ||
      file?.mime_type ||
      "";
    if (mime) return imageFileTypes.includes(String(mime).toLowerCase());

    const name = String(file?.fileName || file?.file_name || "").toLowerCase();
    return [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) =>
      name.endsWith(ext)
    );
  };

  const firstFileThumb = (files) => {
    if (!files?.length) return null;
    const f = files[0];
    if (isImageFile(f)) return f.fileUrl || f.file_url || null;
    return null;
  };

  const handleResetYesterday = () => {
    setSelectedDate(getYesterday());
    setSelectedProject("ALL");
    setSelectedProperty("ALL");
    setSearchText("");
    setOrderBy("date");
    setOrder("desc");
  };

  // ✅ NEW: open embedded PropertyDetails (same feel as Projects.jsx)
  const openPropertyDetailsFromPowu = async (prop) => {
    const propertyId = prop?.propertyId || prop?.property_id || prop?.propertyid;
    const projectId = prop?.projectId || prop?.project_id || prop?.projectid;

    if (!propertyId) return;

    setPropertyDetailsLoading(true);
    setPropertyDetailsError(null);
    setSelectedPropertyDetails(null);

    try {
      // ✅ Best approach: fetch property full details
      // If you have a direct endpoint like /properties/{propertyId}, use it.
      // Otherwise, use project list endpoint (same logic you used in PropertyDetailsDialog).
      let full = null;

      if (projectId) {
        const res = await axios.get(`${BASE_URL}/projects_m/${projectId}/properties`);
        const list = res?.data?.properties || [];
        full = list.find((x) => x?.propertyid === propertyId) || null;
      } else {
        // fallback: try direct endpoint if exists
        const res = await axios.get(`${BASE_URL}/properties/${propertyId}`);
        full = res?.data || null;
      }

      if (!full) {
        throw new Error("Property not found from backend list.");
      }

      setSelectedPropertyDetails(full);
    } catch (e) {
      console.error("Failed to open property details:", e?.response?.data || e);
      setPropertyDetailsError(
        e?.response?.data?.detail ||
          e?.message ||
          "Failed to load property details."
      );
      setSelectedPropertyDetails(null);
    } finally {
      setPropertyDetailsLoading(false);
    }
  };

  // ✅ If property details selected -> render embedded view (like Projects.jsx)
  if (selectedPropertyDetails || propertyDetailsLoading || propertyDetailsError) {
    return (
      <Box sx={{ p: 2, bgcolor: "#ECEEF4", minHeight: "calc(100vh - 120px)" }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            
            bgcolor: "#fff",
            boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1.2 }}
          >
        

            {propertyDetailsLoading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography sx={{ fontSize: 13, color: "#6B7280", fontWeight: 800 }}>
                  Loading property…
                </Typography>
              </Stack>
            )}
          </Stack>

          {propertyDetailsError && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid #FECACA",
                bgcolor: "#FEF2F2",
                mb: 2,
              }}
            >
              <Typography sx={{ fontWeight: 900, color: "#B91C1C" }}>
                {propertyDetailsError}
              </Typography>
            </Paper>
          )}

          {selectedPropertyDetails && (
            <PropertyDetailsDialog
              open={true}
              embedded={true} // ✅ same as Projects.jsx
              property={selectedPropertyDetails}
              onClose={() => setSelectedPropertyDetails(null)}
              loading={false}
            />
          )}
        </Paper>
      </Box>
    );
  }

  // ✅ Normal DailyUpdates page
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#EEF2F7" }}>
      <Box sx={{ p: { xs: 1, sm: 2 }, backgroundColor: "#F3F4F6", minHeight: "100vh" }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #E6EAF2",
            bgcolor: "#FFFFFF",
            boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
            p: 2.2,
            mb: 1.4,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ flexWrap: "wrap" }}>
            <Box sx={{ minWidth: 260 }}>
              <Typography sx={{ fontSize: 28, fontWeight: 900, color: "#1E2A78", lineHeight: 1.1 }}>
                Daily Task Updates
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 13.5, color: "#6B7280", fontWeight: 700 }}>
                Track engineer updates & inactive properties for {formatDateOnly(selectedDate)}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ flexWrap: "wrap" }}>
              <TextField
                label="Project"
                select
                value={selectedProject}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  setSelectedProperty("ALL");
                }}
                size="small"
                sx={{
                  width: 170,
                  "& .MuiOutlinedInput-root": { borderRadius: 2, height: 40 },
                  "& .MuiInputLabel-root": { fontWeight: 800 },
                }}
              >
                <MenuItem value="ALL">All Projects</MenuItem>
                {uniqueProjects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Property"
                select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                size="small"
                sx={{
                  width: 170,
                  "& .MuiOutlinedInput-root": { borderRadius: 2, height: 40 },
                  "& .MuiInputLabel-root": { fontWeight: 800 },
                }}
              >
                <MenuItem value="ALL">All Properties</MenuItem>
                {uniqueProperties
                  .filter((pr) => selectedProject === "ALL" || pr.projectId === selectedProject)
                  .map((pr) => (
                    <MenuItem key={`${pr.projectId}::${pr.id}`} value={pr.id}>
                      {pr.label}
                    </MenuItem>
                  ))}
              </TextField>

              <TextField
                placeholder="Search (engineer, phase, property, project, notes...)"
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{
                  width: 340,
                  "& .MuiOutlinedInput-root": { borderRadius: 2, height: 40 },
                }}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
            </Stack>

            <Stack direction="row" spacing={1.2} alignItems="center">
  <TextField
    label="Date"
    type="date"
    InputLabelProps={{ shrink: true }}
    value={selectedDate}
    onChange={(e) => setSelectedDate(e.target.value)}
    size="small"
    sx={{
      width: 170,
      "& .MuiOutlinedInput-root": { borderRadius: 2, height: 40 },
    }}
  />

  <Button
    variant="outlined"
    onClick={handleResetYesterday}
    sx={{
      height: 40,
      borderRadius: 2,
      fontWeight: 900,
      px: 2,
      whiteSpace: "nowrap",
    }}
  >
    YESTERDAY
  </Button>

  <Button
  variant="contained"
  onClick={handleClose}
  sx={{
    height: 40,
    borderRadius: 2,
    fontWeight: 900,
    px: 2,
    whiteSpace: "nowrap",

    // ✅ red outline + light shade background
    backgroundColor: "#FEF2F2",     // light red tint
    color: "#7F1D1D",               // dark red text
    border: "1.5px solid #7F1D1D",  // dark red border
    boxShadow: "none",

    "&:hover": {
      backgroundColor: "#FEE2E2",   // slightly darker tint
      borderColor: "#991B1B",
      color: "#991B1B",
      boxShadow: "none",
    },
  }}
>
X  CLOSE
</Button>

</Stack>

          </Stack>

          {(error || phaseError) && (
            <Box sx={{ mt: 1.2 }}>
              {error && <Typography sx={{ color: "#EF4444", fontWeight: 900 }}>{error}</Typography>}
              {phaseError && <Typography sx={{ color: "#EF4444", fontWeight: 900 }}>{phaseError}</Typography>}
            </Box>
          )}
        </Paper>

        {/* ✅ Summary cards updated: 1 big + 2 small (same row) + POWU unchanged */}
        <Grid container spacing={2.2} sx={{ mb: 1.4 }}>
          <Grid item xs={12} md={5.5}>
            <Grid container spacing={2.2}>
              <Grid item xs={12} md={6}>
                <SummaryCard
                  title="Total Properties"
                  value={summary?.totalProperties ?? "—"}
                  icon={TotalIcon}
                  iconBgColor="#7C3AED"
                  height={260}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack spacing={2.2}>
                  <SummaryCard
                    title="With Updates"
                    value={summary?.withUpdates ?? "—"}
                    icon={CompletedIcon}
                    iconBgColor="#16A34A"
                    height={120}
                  />
                  <SummaryCard
                    title="Without Updates"
                    value={summary?.withoutUpdates ?? "—"}
                    icon={AlertIcon}
                    iconBgColor="#F59E0B"
                    height={120}
                  />
                </Stack>
              </Grid>
            </Grid>
          </Grid>

          {/* Properties Without Updates */}
          <Grid item xs={12} md={6.5}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid #E6EAF2",
                bgcolor: "#FFFFFF",
                boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
                p: 2,
                mb: 2.2,
                height: 260,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>
                  Properties Without Updates
                </Typography>

                <Chip
                  size="small"
                  label={`${propertiesWithoutUpdates?.length || 0}`}
                  sx={{ fontWeight: 900, borderRadius: 2 }}
                />
              </Stack>

              <Divider sx={{ my: 1.2 }} />

              {!propertiesGroupedByProject.length ? (
                <Typography sx={{ fontSize: 13, color: "#6B7280", fontWeight: 800 }}>
                  None 🎉
                </Typography>
              ) : (
                <>
                  <Tabs
                    value={Math.min(powuTab, Math.max(0, propertiesGroupedByProject.length - 1))}
                    onChange={(_, v) => setPowuTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                      minHeight: 34,
                      mb: 1.1,
                      "& .MuiTab-root": {
                        minHeight: 34,
                        textTransform: "none",
                        fontWeight: 900,
                        px: 1.2,
                      },
                      "& .MuiTabs-indicator": { height: 3, borderRadius: 2 },
                    }}
                  >
                    {propertiesGroupedByProject.map((group) => (
                      <Tab
                        key={group.projectId || group.projectName}
                        label={
                          <Stack direction="row" spacing={0.8} alignItems="center">
                            <Typography sx={{ fontSize: 12.5, fontWeight: 900, textTransform: "uppercase" }}>
                              {group.projectName || group.projectId || "Unassigned"}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${group.properties?.length || 0}`}
                              sx={{
                                height: 20,
                                fontSize: 11,
                                fontWeight: 900,
                                bgcolor: "#EEF2FF",
                                border: "1px solid #E5E7EB",
                              }}
                            />
                          </Stack>
                        }
                      />
                    ))}
                  </Tabs>

                  <Box
                    sx={{
                      flex: 1,
                      overflowY: "auto",
                      pr: 0.5,
                      "&::-webkit-scrollbar": { width: 8 },
                      "&::-webkit-scrollbar-thumb": { background: "#CBD5E1", borderRadius: 10 },
                      "&::-webkit-scrollbar-track": { background: "#F1F5F9", borderRadius: 10 },
                    }}
                  >
                    {(() => {
                      const safeIndex = Math.min(powuTab, Math.max(0, propertiesGroupedByProject.length - 1));
                      const activeGroup = propertiesGroupedByProject[safeIndex];

                      return (
                        <Box>
                          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                            {(activeGroup?.properties || []).map((prop, i) => (
                              <PropertyChip
                                key={`${prop.propertyId || prop.property_id || i}`}
                                label={
                                  prop.propertyName ||
                                  prop.property_name ||
                                  prop.propertyId ||
                                  prop.property_id ||
                                  "Unknown"
                                }
                                onClick={() => openPropertyDetailsFromPowu(prop)}
                              />
                            ))}
                          </Box>
                        </Box>
                      );
                    })()}
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Main grid */}
        <Grid container spacing={2.2} alignItems="stretch">
          {/* Left: Table */}
          <Grid item xs={12} lg={9}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid #E6EAF2",
                bgcolor: "#FFFFFF",
                boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
                p: 2.2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Typography sx={{ fontSize: 20, fontWeight: 900, color: "#111827" }}>
                  Details
                </Typography>
              </Stack>

              <Divider sx={{ my: 1.6 }} />

              {loading && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                  <CircularProgress size={18} />
                  <Typography sx={{ fontSize: 13, color: "#6B7280", fontWeight: 800 }}>
                    Loading…
                  </Typography>
                </Stack>
              )}

              {!loading && !flattenedUpdates.length ? (
                <Box sx={{ py: 7, textAlign: "center" }}>
                  <Typography sx={{ fontWeight: 900 }}>No updates found.</Typography>
                  <Typography sx={{ fontSize: 13, color: "#6B7280", fontWeight: 700 }}>
                    Try a different date or clear filters.
                  </Typography>
                </Box>
              ) : (
                <TableContainer
                  sx={{
                    maxHeight: 560,
                    borderRadius: 2,
                    border: "1px solid #EEF2F7",
                    flex: 1,
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#F3F6FB" }}>
                        {[
                          { id: "date", label: "Date", sortable: true },
                          { id: "project", label: "Project", sortable: true },
                          { id: "property", label: "Property", sortable: true },
                          { id: "phase", label: "Phase", sortable: true },
                          { id: "engineer", label: "Engineer", sortable: true },
                          { id: "update", label: "Update", sortable: false },
                          { id: "files", label: "Files", sortable: false },
                        ].map((col) => (
                          <TableCell
                            key={col.id}
                            sx={{
                              fontWeight: 900,
                              color: "#374151",
                              py: 1.2,
                              borderBottom: "1px solid #E6EAF2",
                              fontSize: 12.5,
                            }}
                          >
                            {col.sortable ? (
                              <TableSortLabel
                                active={orderBy === col.id}
                                direction={orderBy === col.id ? order : "asc"}
                                onClick={() => handleSort(col.id)}
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
                      {paginatedUpdates.map((item, idx) => {
                        const files = item.files || [];
                        const thumb = firstFileThumb(files);

                        return (
                          <TableRow
                            key={item.updateId || item.update_id || `${idx}`}
                            hover
                            sx={{
                              "&:nth-of-type(odd)": { bgcolor: "#FFFFFF" },
                              "&:nth-of-type(even)": { bgcolor: "#FAFAFA" },
                              "& td": { borderBottom: "1px solid #EEF2F7" },
                            }}
                          >
                            <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 800 }}>
                              {formatImageDate(item.createdAt || item.created_at)}
                            </TableCell>

                            <TableCell sx={{ fontWeight: 800 }}>
                              {item.projectName || item.project_name || item.projectId || item.project_id || "—"}
                            </TableCell>

                            <TableCell sx={{ fontWeight: 800 }}>
                              {item.propertyName || item.property_name || item.propertyId || item.property_id || "—"}
                            </TableCell>

                            <TableCell sx={{ fontWeight: 700 }}>
                              {item.phaseName || item.phase_name || "—"}
                            </TableCell>

                            <TableCell sx={{ fontWeight: 700 }}>
                              {item.engineerName || item.engineer_name || "—"}
                            </TableCell>

                            <TableCell sx={{ maxWidth: 320 }}>
                              <Typography sx={{ fontSize: 13, whiteSpace: "pre-line", fontWeight: 700 }}>
                                {item.updateText || item.update_text || "—"}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              {files.length > 0 ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Tooltip title={files[0]?.fileName || files[0]?.file_name || "Attachment"}>
                                    <Avatar
                                      variant="rounded"
                                      src={thumb || undefined}
                                      sx={{
                                        width: 42,
                                        height: 42,
                                        border: "1px solid #E6EAF2",
                                        cursor: thumb ? "zoom-in" : "default",
                                        bgcolor: thumb ? "#fff" : "#EEF2F7",
                                        color: "#334155",
                                      }}
                                    >
                                      <FileIcon fontSize="small" />
                                    </Avatar>
                                  </Tooltip>

                                  <Stack spacing={0.3}>
                                    {files.slice(0, 1).map((f) => (
                                      <Button
                                        key={f.fileId || f.file_id || f.fileUrl || f.file_url}
                                        href={f.fileUrl || f.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variant="text"
                                        sx={{
                                          p: 0,
                                          minWidth: 0,
                                          justifyContent: "flex-start",
                                          textTransform: "none",
                                          fontWeight: 900,
                                          fontSize: 12.5,
                                        }}
                                      >
                                        {(f.fileName || f.file_name || "Open file").slice(0, 26)}
                                        {(f.fileName || f.file_name || "").length > 26 ? "…" : ""}
                                      </Button>
                                    ))}
                                    {files.length > 1 && (
                                      <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 900 }}>
                                        +{files.length - 1} more
                                      </Typography>
                                    )}
                                  </Stack>
                                </Stack>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <TablePagination
                component="div"
                count={flattenedUpdates.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 20, 50]}
                sx={{
                  mt: 1.2,
                  borderTop: "1px solid #EEF2F7",
                  "& .MuiTablePagination-toolbar": { px: 0 },
                  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                    fontWeight: 800,
                    color: "#6B7280",
                  },
                }}
              />
            </Paper>
          </Grid>

          {/* Right: Sidebar */}
          <Grid item xs={12} lg={3}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid #E6EAF2",
                bgcolor: "#FFFFFF",
                boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
                p: 2,
                height: 720,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography sx={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>
                  Phase Alerts
                </Typography>

                <Chip size="small" label="Due" sx={{ fontWeight: 900, borderRadius: 2 }} color="primary" />
              </Stack>

              <Tabs
                value={alertTab}
                onChange={(_, v) => setAlertTab(v)}
                variant="fullWidth"
                sx={{
                  mb: 1.2,
                  minHeight: 34,
                  "& .MuiTab-root": { minHeight: 34, fontWeight: 900, textTransform: "none" },
                }}
              >
                <Tab value="due" label="Due" />
                <Tab value="today" label="Today" />
              </Tabs>

              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  pr: 0.5,
                  "&::-webkit-scrollbar": { width: 8 },
                  "&::-webkit-scrollbar-thumb": { background: "#CBD5E1", borderRadius: 10 },
                  "&::-webkit-scrollbar-track": { background: "#F1F5F9", borderRadius: 10 },
                }}
              >
                {alertTab === "due" ? (
                  (phaseAlerts?.phasesDue?.records || []).length > 0 ? (
                    (phaseAlerts.phasesDue.records || []).map((r, i) => (
                      <PhaseAlertBox key={`${r.scheduleId || r.schedule_id || i}-due`} record={r} />
                    ))
                  ) : (
                    <Typography sx={{ fontSize: 13, color: "#6B7280", fontWeight: 800 }}>
                      No due/overdue phases.
                    </Typography>
                  )
                ) : (phaseAlerts?.phasesStartingToday?.records || []).length > 0 ? (
                  (phaseAlerts.phasesStartingToday.records || []).map((r, i) => (
                    <PhaseAlertBox key={`${r.scheduleId || r.schedule_id || i}-today`} record={r} />
                  ))
                ) : (
                  <Typography sx={{ fontSize: 13, color: "#6B7280", fontWeight: 800 }}>
                    No phases starting today.
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default DailyUpdates;
