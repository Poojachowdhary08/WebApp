import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  InputAdornment,
  List,
  ListItem,
  Link,
  Skeleton,
  MenuItem,
  TablePagination,
  Tooltip,
  useTheme,
  useMediaQuery,
  IconButton,
  Collapse,
  TableSortLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import {
  AiFillFileImage,
  AiFillFileExcel,
  AiFillFilePdf,
  AiFillFile,
} from "react-icons/ai";

// ❌ removed PropertyDetailsDialog import — parent (Projects.jsx) renders it now
import TemplateComponent from "./TemplateComponent";
import CreatePropertyDialog from "./CreatePropertyDialog";
import { useUiPolish } from "../plugins/uiPolish";

/* -------------------------- constants & helpers -------------------------- */

const NAVY = "#2A3663";
const MAX_VISIBLE_DOCS = 10;
const ROW_HEIGHT = 54;

const STATUS_STYLES = {
  completed: { bg: "#e8f5e9", fg: "#1b5e20", border: "#a5d6a7" },
  "in progress": { bg: "#fff3e0", fg: "#e65100", border: "#ffcc80" },
  planning: { bg: "#f3e9ff", fg: "#6b21a8", border: "#e9d5ff" },
  "not started": { bg: "#fff8e1", fg: "#8d6e63", border: "#ffe082" },
  default: { bg: "#eceff1", fg: "#455a64", border: "#cfd8dc" },
};

const statusChip = (val) => {
  const key = String(val || "").trim().toLowerCase();
  const s = STATUS_STYLES[key] || STATUS_STYLES.default;
  return (
    <Chip
      label={String(val || "N/A")}
      size="small"
      sx={{
        px: 1.5,
        borderRadius: 999,
        fontWeight: 600,
        fontSize: 11,
        bgcolor: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
      }}
    />
  );
};

const toPascalCase = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const getFilenameFromUrl = (url) => {
  if (!url || typeof url !== "string") return "Unknown Document";
  try {
    const last = url.split("?")[0].split("/").pop();
    return last || "Document";
  } catch {
    return "Document";
  }
};

const getFileIcon = (fileUrl) => {
  const extension = (fileUrl?.split(".").pop() || "").toLowerCase();
  const iconSize = 22;
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(extension))
    return <AiFillFileImage size={iconSize} color="#2196F3" />;
  if (["xls", "xlsx", "csv"].includes(extension))
    return <AiFillFileExcel size={iconSize} color="#4CAF50" />;
  if (["pdf"].includes(extension))
    return <AiFillFilePdf size={iconSize} color="#F44336" />;
  return <AiFillFile size={iconSize} color="#757575" />;
};

/* ----- sorting helpers for table columns ----- */

function descendingComparator(a, b, orderBy) {
  const av = (a[orderBy] ?? "").toString().toLowerCase();
  const bv = (b[orderBy] ?? "").toString().toLowerCase();
  if (bv < av) return -1;
  if (bv > av) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilized = array.map((el, index) => [el, index]);
  stabilized.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

const headCells = [
  { id: "propertyid", label: "Property ID", sortable: true },
  { id: "name", label: "Name", sortable: true },
  { id: "type", label: "Type", sortable: true },
  { id: "dimensions", label: "Size", sortable: true },
  { id: "status", label: "Status", sortable: true },
];

/* -------------------------------- component -------------------------------- */

const ProjectDetails = ({ projectId, onClose, onOpenPropertyDetails }) => {
  const ui = useUiPolish();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // data
  const [project, setProject] = useState(null);
  const [properties, setProperties] = useState([]);

  // fetching state
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingProperty, setLoadingProperty] = useState(false);
  const [errorProject, setErrorProject] = useState("");
  const [errorProperties, setErrorProperties] = useState("");

  // inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState({});

  // docs dialog
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);

  // template dialog
  const [opentemplateDialog, setOpentemplateDialog] = useState(false);

  // uploading
  const [uploading, setUploading] = useState(false);

  // upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // sorting
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("propertyid");

  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [createPropertyDialogOpen, setCreatePropertyDialogOpen] = useState(false);

  /* ------------------------------- fetch data ------------------------------ */

  const fetchProjectDetails = useCallback(async () => {
    setLoadingProject(true);
    setErrorProject("");
    try {
      const res = await fetch(`http://localhost:8080/projects_m/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project details.");
      const data = await res.json();

      const base = data.project || {};
      const docs = data.documents?.map((d) => d.url || "").filter(Boolean) || [];

      setProject({ ...base, documents: docs });
      setEditedProject({ ...base, documents: docs });
    } catch (err) {
      setErrorProject(err?.message || "Unable to load project.");
    } finally {
      setLoadingProject(false);
    }
  }, [projectId]);

  const fetchProperties = useCallback(async () => {
    setLoadingProperty(true);
    setErrorProperties("");
    try {
      const res = await fetch(
        `http://localhost:8080/projects_m/${projectId}/properties`
      );
      if (!res.ok) throw new Error("Failed to fetch properties.");
      const data = await res.json();
      setProperties(data.properties || []);
    } catch (err) {
      setErrorProperties(err?.message || "Unable to load properties.");
    } finally {
      setLoadingProperty(false);
    }
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchProjectDetails();
      await fetchProperties();
    })();
    return () => {
      alive = false;
    };
  }, [fetchProjectDetails, fetchProperties]);

  /* ------------------------------- handlers ------------------------------- */

  const handleUploadFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xls|xlsx)$/i)) {
      ui.notify("error", "Only Excel files (.xls, .xlsx) are allowed.");
      event.target.value = "";
      setSelectedUploadFile(null);
      return;
    }

    setSelectedUploadFile(file);
  };

  const handleConfirmUpload = async () => {
    if (!selectedUploadFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedUploadFile);
      formData.append("projectId", projectId);

      const response = await fetch("http://localhost:8080/properties/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Failed to upload properties. Please try again.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // ignore
        }
        throw new Error(errorMessage);
      }

      ui.notify("success", "Properties uploaded successfully!");
      setUploadDialogOpen(false);
      setSelectedUploadFile(null);
      fetchProperties();
    } catch (error) {
      ui.notify("error", ui.getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const startEditing = () => {
    setEditedProject(project || {});
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedProject(project || {});
    setIsEditing(false);
  };

  const handleInlineSave = async () => {
    try {
      const response = await fetch(`http://localhost:8080/projects_m/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedProject),
      });
      if (!response.ok) throw new Error("Failed to update project.");
      const updated = await response.json();
      setProject((prev) => ({
        ...(updated || {}),
        documents: prev?.documents || [],
      }));
      setIsEditing(false);
      ui.notify("success", "Project updated successfully!");
    } catch (error) {
      ui.notify("error", "Failed to update project. Please try again.");
    }
  };

  const documents = useMemo(
    () => (project?.documents?.length ? project.documents : []),
    [project]
  );

  const handleRequestSort = (propertyId) => {
    if (propertyId === "actions") return; // no sort on actions
    const isAsc = orderBy === propertyId && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(propertyId);
  };

  /* -------------------------- list, filter, sort, page -------------------------- */

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const statusKey = statusFilter.toLowerCase();

    let arr = [...properties];

    if (q) {
      arr = arr.filter((p) => {
        const id = String(p.propertyid || "").toLowerCase();
        const name = String(p.name || "").toLowerCase();
        const type = String(p.type || "").toLowerCase();
        const size = String(p.dimensions || "").toLowerCase();
        return id.includes(q) || name.includes(q) || type.includes(q) || size.includes(q);
      });
    }

    if (statusKey !== "all") {
      arr = arr.filter(
        (p) => String(p.status || "").trim().toLowerCase() === statusKey
      );
    }

    const sortableKey = orderBy === "actions" ? "propertyid" : orderBy;
    return stableSort(arr, getComparator(order, sortableKey));
  }, [properties, search, statusFilter, order, orderBy]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredSorted.slice(start, start + rowsPerPage);
  }, [filteredSorted, page, rowsPerPage]);

  /* -------------------------------- subviews -------------------------------- */

  const DocumentList = ({ documents }) => (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, mb: 1, color: "#4B5563" }}
      >
        Documents
      </Typography>

      {documents.length === 0 ? (
        <Typography sx={{ fontStyle: "italic", color: "#9CA3AF" }}>
          No documents available.
        </Typography>
      ) : (
        <>
          <Grid container spacing={1.5}>
            {documents.slice(0, MAX_VISIBLE_DOCS).map((doc, index) => (
              <Grid item xs={6} sm={4} md={2.4} key={index}>
                <Tooltip title={getFilenameFromUrl(doc)} arrow>
                  <Box
                    onClick={() => window.open(doc, "_blank")}
                    sx={{
                      cursor: "pointer",
                      textAlign: "center",
                      p: 1,
                      borderRadius: 2,
                      bgcolor: "#F3F4F6",
                      border: "1px solid #E5E7EB",
                      transition: "0.2s",
                      "&:hover": { bgcolor: "#E5E7EB", transform: "translateY(-1px)" },
                    }}
                  >
                    {getFileIcon(doc)}
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 1,
                        display: "block",
                        fontSize: "11px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {getFilenameFromUrl(doc)}
                    </Typography>
                  </Box>
                </Tooltip>
              </Grid>
            ))}
          </Grid>

          {documents.length > MAX_VISIBLE_DOCS && (
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setDocsDialogOpen(true)}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                Show All Documents
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );

  /* ----------------------------- loading & error ---------------------------- */

  if (loadingProject) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="50vh"
        sx={{ bgcolor: "#1118270f" }}
      >
        <Stack spacing={2} width={isMobile ? "90%" : 600}>
          <Skeleton variant="text" height={48} />
          <Skeleton variant="rounded" height={160} />
          <Skeleton variant="rounded" height={220} />
        </Stack>
      </Box>
    );
  }

  if (errorProject && !project) {
    return (
      <Paper sx={{ p: 3, m: 2 }}>
        <Typography variant="h6" color="error" gutterBottom>
          {errorProject}
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchProjectDetails}>
          Retry
        </Button>
      </Paper>
    );
  }

  /* ---------------------------------- render ---------------------------------- */

  return (
    <Box
      sx={{
        p: 3,
        bgcolor: "#ECEEF4",
        minHeight: "100%",
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
      }}
    >
      {/* PROJECT DETAILS CARD */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "18px",
          mb: 3,
          p: 3,
          bgcolor: "#FFFFFF",
          boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
        }}
      >
        {/* header row inside card */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827" }}>
            {toPascalCase(project?.project_name)} Details
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Tooltip title={showProjectDetails ? "Hide project details" : "Show project details"}>
              <IconButton
                size="small"
                onClick={() => setShowProjectDetails((prev) => !prev)}
                sx={{ borderRadius: 999, border: "1px solid #E5E7EB", bgcolor: "#F9FAFB" }}
              >
                {showProjectDetails ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            {isEditing ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleInlineSave}
                  sx={{
                    textTransform: "none",
                    px: 3,
                    borderRadius: 999,
                    bgcolor: "#16A34A",
                    "&:hover": { bgcolor: "#15803D" },
                  }}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  onClick={cancelEditing}
                  sx={{
                    textTransform: "none",
                    borderRadius: 999,
                    borderColor: "#E5E7EB",
                    color: "#374151",
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={startEditing}
                sx={{
                  textTransform: "none",
                  px: 3,
                  borderRadius:2,
                  bgcolor: "#3B82F6",
                  "&:hover": { bgcolor: "#2563EB" },
                }}
              >
                Edit Project
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                fetchProjectDetails();
                fetchProperties();
              }}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                borderColor: "#E5E7EB",
                color: "#374151",
              }}
            >
              Refresh
            </Button>

            <Button
    variant="text"
    onClick={onClose}
    sx={{
      borderRadius: 2,
      border: "1px solid #FCA5A5",
      color: "#DC2626",
      backgroundColor: "rgba(220,38,38,0.06)",
      fontWeight: 900,
      px: 2,
      "&:hover": {
        backgroundColor: "rgba(220,38,38,0.10)",
        borderColor: "#EF4444",
      },
    }}
  >
    X&nbsp;Close
  </Button>
          </Stack>
        </Box>

        <Collapse in={showProjectDetails}>
          <Grid container spacing={2}>
            {/* Project ID */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 600 }}>
                Project ID:
              </Typography>
              <Box
                sx={{
                  mt: 0.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1.5,
                  bgcolor: "#F3F4F6",
                  border: "1px solid #E5E7EB",
                  fontSize: 14,
                  color: "#111827",
                }}
              >
                {project.project_id || "N/A"}
              </Box>
            </Grid>

            {/* Project Name */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 600 }}>
                Project Name
              </Typography>
              {isEditing ? (
                <TextField
                  fullWidth
                  margin="dense"
                  size="small"
                  value={editedProject.project_name || ""}
                  onChange={(e) =>
                    setEditedProject((prev) => ({ ...prev, project_name: e.target.value }))
                  }
                />
              ) : (
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    bgcolor: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    fontSize: 14,
                    color: "#111827",
                  }}
                >
                  {project.project_name || "N/A"}
                </Box>
              )}
            </Grid>

            {/* Type */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 600 }}>
                Type
              </Typography>
              {isEditing ? (
                <TextField
                  fullWidth
                  margin="dense"
                  size="small"
                  value={editedProject.project_type || ""}
                  onChange={(e) =>
                    setEditedProject((prev) => ({ ...prev, project_type: e.target.value }))
                  }
                />
              ) : (
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    bgcolor: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    fontSize: 14,
                    color: "#111827",
                  }}
                >
                  {toPascalCase(project.project_type) || "N/A"}
                </Box>
              )}
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 600 }}>
                Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>{statusChip(project.project_status)}</Box>
            </Grid>

            {/* Location */}
            <Grid item xs={12} sm={12} md={6}>
              <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 600 }}>
                Location
              </Typography>
              {isEditing ? (
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    margin="dense"
                    size="small"
                    label="City"
                    value={editedProject.project_location_city || ""}
                    onChange={(e) =>
                      setEditedProject((prev) => ({
                        ...prev,
                        project_location_city: e.target.value,
                      }))
                    }
                  />
                  <TextField
                    fullWidth
                    margin="dense"
                    size="small"
                    label="State"
                    value={editedProject.project_location_state || ""}
                    onChange={(e) =>
                      setEditedProject((prev) => ({
                        ...prev,
                        project_location_state: e.target.value,
                      }))
                    }
                  />
                </Stack>
              ) : (
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    bgcolor: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    fontSize: 14,
                    color: "#111827",
                  }}
                >
                  {[
                    toPascalCase(project.project_location_city),
                    toPascalCase(project.project_location_state),
                  ]
                    .filter(Boolean)
                    .join(", ") || "N/A"}
                </Box>
              )}
            </Grid>

            {/* GPS */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 600 }}>
                GPS
              </Typography>
              {isEditing ? (
                <TextField
                  fullWidth
                  margin="dense"
                  size="small"
                  value={editedProject.project_location_gps || ""}
                  onChange={(e) =>
                    setEditedProject((prev) => ({
                      ...prev,
                      project_location_gps: e.target.value,
                    }))
                  }
                  helperText="e.g., 37.7749° N, 122.4194° W"
                />
              ) : (
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    bgcolor: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    fontSize: 14,
                    color: "#111827",
                  }}
                >
                  {project.project_location_gps || "N/A"}
                </Box>
              )}
            </Grid>

            {/* Start Date */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 600 }}>
                Start Date
              </Typography>
              {isEditing ? (
                <TextField
                  type="date"
                  fullWidth
                  margin="dense"
                  size="small"
                  value={editedProject.start_date || ""}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarTodayIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  onChange={(e) =>
                    setEditedProject((prev) => ({ ...prev, start_date: e.target.value }))
                  }
                />
              ) : (
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    bgcolor: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    fontSize: 14,
                    color: "#111827",
                  }}
                >
                  {project.start_date
                    ? new Date(project.start_date).toLocaleDateString("en-GB")
                    : "N/A"}
                </Box>
              )}
            </Grid>

            {/* Completion Date */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 600 }}>
                Completion Date
              </Typography>
              {isEditing ? (
                <TextField
                  type="date"
                  fullWidth
                  margin="dense"
                  size="small"
                  value={editedProject.expected_completion_date || ""}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarTodayIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  onChange={(e) =>
                    setEditedProject((prev) => ({
                      ...prev,
                      expected_completion_date: e.target.value,
                    }))
                  }
                />
              ) : (
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    bgcolor: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    fontSize: 14,
                    color: "#111827",
                  }}
                >
                  {project.expected_completion_date
                    ? new Date(project.expected_completion_date).toLocaleDateString("en-GB")
                    : "N/A"}
                </Box>
              )}
            </Grid>

            {/* Documents */}
            <Grid item xs={12} sm={6} md={3}>
              <DocumentList documents={documents} />
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* PROPERTIES CARD */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "18px",
          bgcolor: "#FFFFFF",
          boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
          p: 3,
        }}
      >
        {/* header bar */}
        <Box
          display="flex"
          flexDirection={isMobile ? "column" : "row"}
          justifyContent="space-between"
          alignItems={isMobile ? "flex-start" : "center"}
          mb={2.5}
          gap={1.5}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827" }}>
            Property Details
          </Typography>

          <Stack
            direction={isMobile ? "column" : "row"}
            spacing={1.5}
            alignItems={isMobile ? "stretch" : "center"}
            sx={{ width: isMobile ? "100%" : "auto" }}
          >
            <TextField
              placeholder="Search"
              size="small"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              sx={{
                minWidth: isMobile ? "100%" : 260,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 999,
                  bgcolor: "#F3F4F6",
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#9CA3AF" }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Planning">Planning</MenuItem>
              <MenuItem value="Not Started">Not Started</MenuItem>
            </TextField>

            <Button
              variant="contained"
              onClick={() => setCreatePropertyDialogOpen(true)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                bgcolor: "#059669",
                "&:hover": { bgcolor: "#047857" },
                fontWeight: 600,
              }}
            >
              + Create Property
            </Button>
            <Button
              variant="contained"
              disabled={uploading}
              onClick={() => setUploadDialogOpen(true)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                bgcolor: "#3B82F6",
                "&:hover": { bgcolor: "#2563EB" },
              }}
            >
              {uploading ? "Uploading..." : "Upload Properties"}
            </Button>
          </Stack>
        </Box>

        {/* TABLE */}
        <Paper
          variant="outlined"
          sx={{
            mt: 1,
            borderRadius: "16px",
            overflow: "hidden",
            borderColor: "#E5E7EB",
          }}
        >
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table stickyHeader size="small" aria-label="properties table">
              <TableHead>
                <TableRow>
                  {headCells.map((headCell) => (
                    <TableCell
                      key={headCell.id}
                      sortDirection={orderBy === headCell.id ? order : false}
                      sx={{
                        backgroundColor: "#F3F4F6",
                        color: "#6B7280",
                        fontWeight: 700,
                        letterSpacing: 0.3,
                        fontSize: 12,
                        borderBottom: "1px solid #E5E7EB",
                      }}
                    >
                      {headCell.sortable ? (
                        <TableSortLabel
                          active={orderBy === headCell.id}
                          direction={orderBy === headCell.id ? order : "asc"}
                          onClick={() => handleRequestSort(headCell.id)}
                        >
                          {headCell.label}
                        </TableSortLabel>
                      ) : (
                        headCell.label
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {loadingProperty ? (
                  [...Array(rowsPerPage)].map((_, idx) => (
                    <TableRow key={idx} sx={{ height: ROW_HEIGHT }}>
                      <TableCell colSpan={5}>
                        <Skeleton variant="rounded" height={32} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : errorProperties ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="error" sx={{ py: 2 }}>
                        {errorProperties}
                      </Typography>
                      <Button startIcon={<RefreshIcon />} onClick={fetchProperties}>
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography sx={{ py: 2, color: "text.secondary" }}>
                        No properties match your filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((property, index) => {
                    const zebra = index % 2 === 0 ? "#FFFFFF" : "#F9FAFB";
                    return (
                      <TableRow
                        key={property.propertyid ?? index}
                        hover
                        onClick={() => onOpenPropertyDetails?.(property)} // ✅ PARENT NAV
                        sx={{
                          height: ROW_HEIGHT,
                          bgcolor: zebra,
                          cursor: "pointer",
                          "& .MuiTableCell-root": {
                            borderBottom: "1px solid #F3F4F6",
                          },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600, color: "#111827", fontSize: 13 }}>
                          {property.propertyid || "n/a"}
                        </TableCell>

                        <TableCell
                          sx={{
                            fontWeight: 500,
                            color: "#111827",
                            textTransform: "capitalize",
                            fontSize: 13,
                          }}
                        >
                          {property.name || "n/a"}
                        </TableCell>

                        <TableCell
                          sx={{
                            color: "#4B5563",
                            textTransform: "capitalize",
                            fontSize: 13,
                          }}
                        >
                          {property.type || "n/a"}
                        </TableCell>

                        <TableCell sx={{ color: "#4B5563", fontSize: 13 }}>
                          {property.dimensions || "n/a"}
                        </TableCell>

                        <TableCell>
                          <Box sx={{ textTransform: "uppercase" }}>
                            {statusChip(property.status)}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredSorted.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{
              borderTop: "1px solid #E5E7EB",
              ".MuiTablePagination-toolbar": { py: 1 },
            }}
          />
        </Paper>
      </Paper>

      {/* All Documents dialog */}
      <Dialog
        open={docsDialogOpen}
        onClose={() => setDocsDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>All Documents</DialogTitle>
        <DialogContent dividers>
          <List>
            {documents.map((doc, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <Link
                  href={doc}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: "#2563EB", textDecoration: "none" }}
                >
                  {getFilenameFromUrl(doc)}
                </Link>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Template dialog */}
      <Dialog
        open={opentemplateDialog}
        onClose={() => setOpentemplateDialog(false)}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            height: "90vh",
            mt: "100px",
            mx: "10px",
            width: "calc(100% - 30px)",
            borderRadius: 3,
          },
        }}
      >
        <DialogContent dividers>
          <TemplateComponent onClose={() => setOpentemplateDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Upload Properties dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => {
          if (!uploading) {
            setUploadDialogOpen(false);
            setSelectedUploadFile(null);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Upload Properties</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Choose an Excel file (.xls / .xlsx) containing properties for this project.
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="outlined"
                component="label"
                disabled={uploading}
                sx={{ textTransform: "none" }}
              >
                Browse
                <input
                  type="file"
                  hidden
                  accept=".xls,.xlsx"
                  onChange={handleUploadFileSelect}
                />
              </Button>

              <Typography
                variant="body2"
                sx={{
                  maxWidth: "240px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selectedUploadFile?.name || "No file selected"}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!uploading) {
                setUploadDialogOpen(false);
                setSelectedUploadFile(null);
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUpload}
            variant="contained"
            disabled={!selectedUploadFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Property Dialog */}
      <CreatePropertyDialog
        open={createPropertyDialogOpen}
        onClose={() => setCreatePropertyDialogOpen(false)}
        projectId={projectId}
        onSuccess={() => {
          setCreatePropertyDialogOpen(false);
          fetchProperties();
        }}
      />
    </Box>
  );
};

export default ProjectDetails;
