// src/components/Employee_Details.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  TextField,
  Checkbox,
  Snackbar,
  Grid,
  Autocomplete,
  InputAdornment,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  Switch,
  FormControlLabel,
  MenuItem,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import axios from "axios";

const BRAND = {
  navy: "#2A3663",
  border: "#E5E7EB",
  bg: "#F5F7FB",
  textMuted: "#6B7280",
  headerBg: "#ffffff",
  stripShadow: "0 10px 30px rgba(0,0,0,0.06)",
  assignedOrange: "#ff9800",
  tableHeader: "#F3F4F6",
};

const getProjectId = (p) => p?.projectid || p?.project_id || p?.projectId || "";
const getProjectName = (p) => p?.project_name || p?.name || "N/A";

const getPropertyId = (p) => p?.propertyid || p?.property_id || p?.propertyId || "";
const getPropertyName = (p) => p?.property_name || p?.name || "Unnamed Property";

const StatusChip = ({ status }) => {
  const s = String(status || "ACTIVE").toUpperCase();
  const isActive = s === "ACTIVE";
  return (
    <Chip
      size="small"
      label={s}
      sx={{
        height: 24,
        borderRadius: 1.5,
        fontWeight: 900,
        fontSize: 11,
        px: 1,
        background: isActive ? "#DCEBFF" : "#E5E7EB",
        color: isActive ? "#2563EB" : "#374151",
      }}
    />
  );
};

/**
 * ✅ variant:
 * - "page": render like contractor details page (NO fixed overlay)
 * - "overlay": current fixed-fullscreen overlay (kept)
 * - "dialog": dialog render (kept)
 */
const Employee_Details = ({
  open = true,
  onClose,
  employeeCode,
  variant = "overlay", // ✅ NEW
}) => {
  const [properties, setProperties] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Edit mode + form
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [originalForm, setOriginalForm] = useState({});

  // Dropdown options
  const [departments, setDepartments] = useState([
    "Construction",
    "Engineering",
    "Management",
    "Finance",
    "HR",
    "IT",
    "Operations",
    "Sales",
    "Marketing",
  ]);

  const [jobTitles, setJobTitles] = useState([
    "Site Engineer",
    "Project Manager",
    "Construction Manager",
    "Architect",
    "Surveyor",
    "Foreman",
    "Supervisor",
    "Technician",
    "Administrator",
    "Coordinator",
    "Manager",
    "Director",
    "Specialist",
    "Analyst",
    "Consultant",
    "Lead",
    "Senior Engineer",
  ]);

  // Assignment dialog + data
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [projectProperties, setProjectProperties] = useState({}); // { [projectId]: properties[] }
  const [loadingProperties, setLoadingProperties] = useState({}); // { [projectId]: bool }

  // Selected & assigned state (kept same behavior)
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [assignedProperties, setAssignedProperties] = useState([]); // [{ propertyid, project_id }]
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]); // [{ propertyid, project_id, ...prop }]

  const [assignLoading, setAssignLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search (dialog)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ projects: 0, properties: 0 });

  // Tree open states (main view + dialog)
  const [openProjectsMain, setOpenProjectsMain] = useState({}); // {pid: bool}
  const [openProjectsDialog, setOpenProjectsDialog] = useState({}); // {pid: bool}

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastSeverity, setToastSeverity] = useState("success");

  useEffect(() => {
    if ((variant === "dialog" ? open : true) && employeeCode) fetchEmployeeAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeCode, variant]);

  useEffect(() => {
    if (!employeeDetails) return;
    const formData = {
      first_name: employeeDetails.first_name || "",
      last_name: employeeDetails.last_name || "",
      email: employeeDetails.email || "",
      phone_number: employeeDetails.phone_number || "",
      department: employeeDetails.department || "",
      job_title: employeeDetails.job_title || "",
    };
    setForm(formData);
    setOriginalForm(formData);
  }, [employeeDetails]);

  const handleDepartmentChange = (_, newValue) => {
    setForm((prev) => ({ ...prev, department: newValue || "" }));
    if (newValue && !departments.includes(newValue)) setDepartments((prev) => [...prev, newValue]);
  };

  const handleJobTitleChange = (_, newValue) => {
    setForm((prev) => ({ ...prev, job_title: newValue || "" }));
    if (newValue && !jobTitles.includes(newValue)) setJobTitles((prev) => [...prev, newValue]);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setFilteredProjects(availableProjects);
    setSearchResults({ projects: availableProjects.length, properties: 0 });
  };

  const fetchEmployeeAssignments = async () => {
    setLoading(true);
    setError("");
    try {
      // employee details
      const employeeResponse = await axios.get("http://localhost:8080/employees");
      const employee = (employeeResponse.data || []).find((emp) => emp.employee_code === employeeCode);
      if (employee) setEmployeeDetails(employee);

      // projects
      const projectsResponse = await axios.get(`http://localhost:8080/employee-project/${employeeCode}`);
      const projectsData = projectsResponse.data?.projects || projectsResponse.data || [];
      setProjects(projectsData);

      // properties per project
      if (projectsData && projectsData.length > 0) {
        const allProperties = [];

        for (const project of projectsData) {
          const pid = getProjectId(project);
          if (!pid) continue;

          try {
            const propertiesResponse = await axios.get(
              `http://localhost:8080/employee-properties/${pid}/${employeeCode}`
            );
            const propertiesData = propertiesResponse.data?.properties || propertiesResponse.data || [];
            if (Array.isArray(propertiesData) && propertiesData.length > 0) {
              allProperties.push(
                ...propertiesData.map((prop) => ({
                  ...prop,
                  project_id: pid,
                  project_name: getProjectName(project),
                }))
              );
            }
          } catch (propErr) {
            console.error(`Error fetching properties for project ${pid}:`, propErr);
          }
        }

        setProperties(allProperties);

        // ✅ default open all projects in MAIN view (tree open)
        const openMap = {};
        projectsData.forEach((p) => {
          const pid = getProjectId(p);
          if (pid) openMap[pid] = true;
        });
        setOpenProjectsMain(openMap);
      } else {
        setProperties([]);
        setOpenProjectsMain({});
      }
    } catch (err) {
      console.error("Error fetching employee assignments:", err);
      setError("Failed to fetch employee assignments");
    } finally {
      setLoading(false);
      await loadCurrentAssignments();
    }
  };

  const loadCurrentAssignments = async () => {
    if (!employeeCode) return;

    const assignedProjectIds = (projects || []).map((p) => getProjectId(p)).filter(Boolean);
    setAssignedProjects(assignedProjectIds);

    const assignedPropertyIds = (properties || [])
      .map((p) => ({
        propertyid: getPropertyId(p),
        project_id: p.project_id || p.projectid || p.project_id,
      }))
      .filter((p) => p.propertyid && p.project_id);

    setAssignedProperties(assignedPropertyIds);

    setSelectedProjects(assignedProjectIds);
    setSelectedProperties(assignedPropertyIds);
  };

  const fetchAvailableProjects = async () => {
    try {
      const response = await axios.get("http://localhost:8080/projects_m");
      const projectsData = response.data?.projects || response.data || [];
      const projectsArray = Array.isArray(projectsData) ? projectsData : [];

      setAvailableProjects(projectsArray);
      setFilteredProjects(projectsArray);
      setSearchResults({ projects: projectsArray.length, properties: 0 });

      // ✅ default open first project in DIALOG
      const first = projectsArray[0] ? getProjectId(projectsArray[0]) : null;
      if (first) setOpenProjectsDialog({ [first]: true });

      await loadCurrentAssignments();
    } catch (error) {
      console.error("Error fetching available projects:", error);
      setAvailableProjects([]);
      setFilteredProjects([]);
      setSearchResults({ projects: 0, properties: 0 });
    }
  };

  const fetchAvailableProperties = async (projectId) => {
    if (!projectId) return [];
    try {
      const response = await axios.get(`http://localhost:8080/projects_m/${projectId}/properties`);
      const propertiesData = response.data?.properties || response.data || [];
      return Array.isArray(propertiesData) ? propertiesData : [];
    } catch (error) {
      console.error("Error fetching available properties for project", projectId, ":", error);
      return [];
    }
  };

  const ensureProjectPropsLoaded = async (projectId) => {
    if (!projectId) return;
    if (projectProperties[projectId]) return;

    setLoadingProperties((prev) => ({ ...prev, [projectId]: true }));
    try {
      const props = await fetchAvailableProperties(projectId);
      setProjectProperties((prev) => ({ ...prev, [projectId]: props }));
    } catch (e) {
      setProjectProperties((prev) => ({ ...prev, [projectId]: [] }));
    } finally {
      setLoadingProperties((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const handleDialogProjectToggleOpen = async (projectId) => {
    setOpenProjectsDialog((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
    if (!openProjectsDialog[projectId]) await ensureProjectPropsLoaded(projectId);
  };

  // Assignment search (dialog)
  const handleSearchChange = async (event) => {
    const query = (event.target.value || "").toLowerCase();
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredProjects(availableProjects);
      setSearchResults({ projects: availableProjects.length, properties: 0 });
      return;
    }

    const filtered = availableProjects.filter((project) => {
      const projectName = (getProjectName(project) || "").toLowerCase();
      const projectId = (getProjectId(project) || "").toLowerCase();
      const projectMatches = projectName.includes(query) || projectId.includes(query);

      const pid = getProjectId(project);
      const projectProps = projectProperties[pid] || [];
      const propertyMatches = projectProps.some((prop) => {
        const pn = (getPropertyName(prop) || "").toLowerCase();
        const pId = (getPropertyId(prop) || "").toLowerCase();
        return pn.includes(query) || pId.includes(query);
      });

      return projectMatches || propertyMatches;
    });

    let propertyCount = 0;
    filtered.forEach((project) => {
      const pid = getProjectId(project);
      const props = projectProperties[pid] || [];
      propertyCount += props.filter((prop) => {
        const pn = (getPropertyName(prop) || "").toLowerCase();
        const pId = (getPropertyId(prop) || "").toLowerCase();
        return pn.includes(query) || pId.includes(query);
      }).length;
    });

    setFilteredProjects(filtered);
    setSearchResults({ projects: filtered.length, properties: propertyCount });
  };

  const handleSelectAllProjects = async () => {
    const allSelected = selectedProjects.length === filteredProjects.length && filteredProjects.length > 0;

    if (allSelected) {
      setSelectedProjects([]);
      setSelectedProperties([]);
      return;
    }

    const allProjectIds = filteredProjects.map((p) => getProjectId(p)).filter(Boolean);
    setSelectedProjects(allProjectIds);

    const allProps = [];
    for (const project of filteredProjects) {
      const pid = getProjectId(project);
      if (!pid) continue;

      try {
        const props = projectProperties[pid] || (await fetchAvailableProperties(pid));
        if (!projectProperties[pid]) setProjectProperties((prev) => ({ ...prev, [pid]: props }));

        props.forEach((prop) => {
          const propId = getPropertyId(prop);
          if (!propId) return;
          allProps.push({ ...prop, project_id: pid, propertyid: propId });
        });
      } catch (error) {
        console.error("Error loading properties for project", pid, ":", error);
      }
    }
    setSelectedProperties(allProps);

    const openMap = {};
    allProjectIds.forEach((pid) => (openMap[pid] = true));
    setOpenProjectsDialog(openMap);
  };

  const handleProjectToggle = async (project) => {
    const projectId = getProjectId(project);
    if (!projectId) return;

    const isSelected = selectedProjects.includes(projectId);

    if (isSelected) {
      setSelectedProjects((prev) => prev.filter((id) => id !== projectId));
      setSelectedProperties((prev) => prev.filter((prop) => prop.project_id !== projectId));
    } else {
      setSelectedProjects((prev) => [...prev, projectId]);

      const props = projectProperties[projectId] || (await fetchAvailableProperties(projectId));
      if (!projectProperties[projectId]) setProjectProperties((prev) => ({ ...prev, [projectId]: props }));

      const projectProps = props
        .map((prop) => ({
          ...prop,
          project_id: projectId,
          propertyid: getPropertyId(prop),
        }))
        .filter((p) => p.propertyid);

      setSelectedProperties((prev) => [...prev, ...projectProps]);
    }

    setOpenProjectsDialog((prev) => ({ ...prev, [projectId]: true }));
    await ensureProjectPropsLoaded(projectId);
  };

  const handlePropertyToggle = (property, projectId) => {
    const propId = getPropertyId(property);
    if (!propId || !projectId) return;

    const isSelected = selectedProperties.some((p) => p.propertyid === propId && p.project_id === projectId);

    if (isSelected) {
      const newSelected = selectedProperties.filter((p) => !(p.propertyid === propId && p.project_id === projectId));
      setSelectedProperties(newSelected);

      const remainingForProject = newSelected.filter((p) => p.project_id === projectId);
      if (remainingForProject.length === 0) {
        setSelectedProjects((prev) => prev.filter((id) => id !== projectId));
      }
    } else {
      const newSelected = [...selectedProperties, { ...property, project_id: projectId, propertyid: propId }];
      setSelectedProperties(newSelected);

      const projectProps = projectProperties[projectId] || [];
      const allProjectPropsSelected =
        projectProps.length > 0 &&
        projectProps.every((prop) =>
          newSelected.some((p) => p.propertyid === getPropertyId(prop) && p.project_id === projectId)
        );

      if (allProjectPropsSelected) {
        setSelectedProjects((prev) => (prev.includes(projectId) ? prev : [...prev, projectId]));
      }
    }
  };

  const handleSaveAssignments = async () => {
    setAssignLoading(true);
    try {
      const currentlyAssignedProjects = assignedProjects || [];
      const currentlyAssignedProperties = assignedProperties || [];

      const projectsToAssign = selectedProjects.filter((projectId) => !currentlyAssignedProjects.includes(projectId));
      const projectsToUnassign = currentlyAssignedProjects.filter((projectId) => !selectedProjects.includes(projectId));

      const propertiesToAssign = selectedProperties.filter((prop) => {
        const pid = prop.propertyid || getPropertyId(prop);
        return !currentlyAssignedProperties.some(
          (assigned) => assigned.propertyid === pid && assigned.project_id === prop.project_id
        );
      });

      const propertiesToUnassign = currentlyAssignedProperties.filter((assigned) => {
        return !selectedProperties.some((prop) => {
          const pid = prop.propertyid || getPropertyId(prop);
          return pid === assigned.propertyid && prop.project_id === assigned.project_id;
        });
      });

      // Assign
      if (projectsToAssign.length > 0 || propertiesToAssign.length > 0) {
        const assignmentRequest = {
          project_ids: projectsToAssign,
          property_assignments: propertiesToAssign.map((prop) => ({
            property_id: prop.propertyid || getPropertyId(prop),
            project_id: prop.project_id,
          })),
        };

        await axios.post(`http://localhost:8080/employee/${employeeCode}/assign`, assignmentRequest);
      }

      // Unassign
      if (projectsToUnassign.length > 0 || propertiesToUnassign.length > 0) {
        const unassignmentRequest = {
          project_ids: projectsToUnassign,
          property_ids: propertiesToUnassign.map((prop) => prop.propertyid),
        };

        await axios.post(`http://localhost:8080/employee/${employeeCode}/unassign`, unassignmentRequest);
      }

      const totalChanges =
        projectsToAssign.length +
        propertiesToAssign.length +
        projectsToUnassign.length +
        propertiesToUnassign.length;

      if (totalChanges > 0) {
        let message = "✅ ";
        if (projectsToAssign.length > 0) message += `${projectsToAssign.length} project(s) assigned, `;
        if (propertiesToAssign.length > 0) message += `${propertiesToAssign.length} property(ies) assigned, `;
        if (projectsToUnassign.length > 0) message += `${projectsToUnassign.length} project(s) unassigned, `;
        if (propertiesToUnassign.length > 0) message += `${propertiesToUnassign.length} property(ies) unassigned, `;
        message = message.replace(/,\s*$/, " successfully! Data refreshed.");

        setToastMessage(message);
        setToastSeverity("success");
        setToastOpen(true);

        setAssignDialogOpen(false);

        setRefreshing(true);
        await fetchEmployeeAssignments();
        setRefreshing(false);
      } else {
        setToastMessage("ℹ️ No changes to save");
        setToastSeverity("info");
        setToastOpen(true);
      }
    } catch (error) {
      console.error("Error saving assignments:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || "Unknown error";
      setToastMessage(`❌ Error saving assignments: ${errorMessage}`);
      setToastSeverity("error");
      setToastOpen(true);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const changes = {};
      Object.keys(form).forEach((key) => {
        if (form[key] !== originalForm[key]) changes[key] = form[key];
      });

      if (Object.keys(changes).length === 0) {
        setToastMessage("ℹ️ No changes to save");
        setToastSeverity("info");
        setToastOpen(true);
        setEditMode(false);
        return;
      }

      const response = await axios.put(`http://localhost:8080/employee/${employeeCode}`, changes);

      if (response.data?.success) {
        setToastMessage(`✅ Employee details updated successfully! Updated: ${Object.keys(changes).join(", ")}`);
        setToastSeverity("success");
        setToastOpen(true);
        setEditMode(false);
        setOriginalForm((prev) => ({ ...prev, ...changes }));
        fetchEmployeeAssignments();
      } else {
        throw new Error(response.data?.message || "Update failed");
      }
    } catch (error) {
      console.error("Error updating employee:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || "Unknown error";
      setToastMessage(`❌ Error updating employee: ${errorMessage}`);
      setToastSeverity("error");
      setToastOpen(true);
    }
  };

  const handleClose = () => {
    setProperties([]);
    setProjects([]);
    setEmployeeDetails(null);
    setError("");
    setEditMode(false);
    setSearchQuery("");
    setOpenProjectsDialog({});
    onClose?.();
  };

  // ---------- UI helpers ----------
  const fullName = `${employeeDetails?.first_name || ""} ${employeeDetails?.last_name || ""}`.trim() || "N/A";

  const grouped = useMemo(() => {
    const byPid = {};
    (projects || []).forEach((p) => {
      const pid = getProjectId(p);
      if (!pid) return;
      byPid[pid] = { project: p, properties: [] };
    });

    (properties || []).forEach((prop) => {
      const pid = prop.project_id || prop.projectid || prop.project_id;
      if (!pid) return;
      if (!byPid[pid]) byPid[pid] = { project: { project_id: pid, project_name: prop.project_name }, properties: [] };
      byPid[pid].properties.push(prop);
    });

    return Object.keys(byPid).map((pid) => ({
      projectId: pid,
      project: byPid[pid].project,
      properties: byPid[pid].properties,
    }));
  }, [projects, properties]);

  const renderTopStrip = () => (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${BRAND.border}`,
        background: "#fff",
        boxShadow: BRAND.stripShadow,
        px: 1.2,
        py: 1.6,
        marginTop: "20px",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(7, minmax(0, 1fr))" },
            gap: { xs: 1.5, md: 2.5 },
            width: "100%",
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textMuted, fontWeight: 700 }}>Employee Code</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
              {employeeDetails?.employee_code || employeeCode || "—"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textMuted, fontWeight: 700 }}>Name</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>{fullName}</Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textMuted, fontWeight: 700 }}>Email</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#111827", wordBreak: "break-word" }}>
              {employeeDetails?.email || "—"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textMuted, fontWeight: 700 }}>Phone No.</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
              {employeeDetails?.phone_number || "—"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textMuted, fontWeight: 700 }}>Department</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
              {employeeDetails?.department || "—"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textMuted, fontWeight: 700 }}>Job Title</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
              {employeeDetails?.job_title || "—"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textMuted, fontWeight: 700 }}>Status</Typography>
            <Box sx={{ mt: 0.3 }}>
              <StatusChip status={employeeDetails?.status || "ACTIVE"} />
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setEditMode((p) => !p)}
              sx={{
                borderRadius: 2,
                fontWeight: 900,
                px: 2.2,
                
              }}
            >
              EDIT
            </Button>


          <Button
            variant="outlined"
            onClick={handleClose}
            sx={{
              height: 36,
              borderRadius: 2,
              border: "1px solid #FCA5A5",
              color: "#DC2626",
              backgroundColor: "rgba(220,38,38,0.06)",
              fontWeight: 900,
              px: 1.6,
              textTransform: "none",
              minWidth: 0,
              "&:hover": {
                backgroundColor: "rgba(220,38,38,0.10)",
                borderColor: "#EF4444",
              },
            }}
          >
            X&nbsp;Close
          </Button>
        </Box>
      </Box>
    </Paper>
  );

  const renderAssignmentsSection = () => (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        borderRadius: 3,
        border: `1px solid ${BRAND.border}`,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <Box sx={{ px: 2, py: 1.6, borderBottom: `1px solid ${BRAND.border}` }}>
        <Typography sx={{ fontWeight: 900, color: "#111827" }}>Assign Properties</Typography>
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1.6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <TextField select size="small" label="Select Project" value="" sx={{ minWidth: 320 }}>
          <MenuItem value="">
            <Typography sx={{ color: BRAND.textMuted }}>Demo Project Name</Typography>
          </MenuItem>
        </TextField>

        <Button
          variant="contained"
          onClick={async () => {
            await fetchAvailableProjects();
            setAssignDialogOpen(true);
          }}
          sx={{
            backgroundColor: "#3B82F6",
            textTransform: "none",
            fontWeight: 900,
            borderRadius: 2,
            "&:hover": { backgroundColor: "#2563EB" },
          }}
        >
          MANAGE ASSIGNMENTS
        </Button>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        {refreshing && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
            <CircularProgress size={18} />
            <Typography sx={{ color: BRAND.textMuted, fontWeight: 700 }}>Refreshing…</Typography>
          </Box>
        )}

        <TableContainer sx={{ borderRadius: 2, border: `1px solid ${BRAND.border}` }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: BRAND.tableHeader }}>
                <TableCell sx={{ fontWeight: 900, color: "#111827", width: 40 }} />
                <TableCell sx={{ fontWeight: 900, color: "#111827" }}>Property ID</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#111827" }}>Project Name</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#111827" }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#111827" }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#111827" }}>Size</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#111827" }}>Status</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {grouped.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ color: BRAND.textMuted, py: 3 }}>
                    No assignments found.
                  </TableCell>
                </TableRow>
              ) : (
                grouped.map(({ projectId, project, properties: props }) => {
                  const isOpen = !!openProjectsMain[projectId];
                  const projectName = getProjectName(project);

                  return (
                    <React.Fragment key={projectId}>
                      <TableRow sx={{ background: "#fff", "&:hover": { background: "#FAFAFA" } }}>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setOpenProjectsMain((prev) => ({ ...prev, [projectId]: !prev[projectId] }))
                            }
                          >
                            {isOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                          </IconButton>
                        </TableCell>

                        <TableCell colSpan={7} sx={{ py: 1.4 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography sx={{ fontWeight: 700 }}>
                              {projectName} ({projectId})
                            </Typography>
                            <Chip
                              size="small"
                              label={`${props.length} properties`}
                              sx={{ height: 22, fontWeight: 900, background: "#EEF2FF", color: BRAND.navy }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell colSpan={8} sx={{ p: 0, borderBottom: "none" }}>
                          <Collapse in={isOpen} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 1.5, pb: 1.5 }}>
                              <Table size="small">
                                <TableBody>
                                  {props.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={7} sx={{ color: BRAND.textMuted, py: 2 }}>
                                        No properties assigned under this project.
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    props.map((prop, idx) => (
                                      <TableRow key={`${getPropertyId(prop)}_${idx}`} hover>
                                        <TableCell sx={{ width: 40 }} />
                                        <TableCell>{getPropertyId(prop) || "—"}</TableCell>
                                        <TableCell>{projectName}</TableCell>
                                        <TableCell>{getPropertyName(prop)}</TableCell>
                                        <TableCell>{prop?.type || prop?.property_type || "—"}</TableCell>
                                        <TableCell>{prop?.size || prop?.area || "—"}</TableCell>
                                        <TableCell>
                                          <Chip
                                            size="small"
                                            label={prop?.status || "Planning"}
                                            sx={{
                                              height: 22,
                                              fontWeight: 900,
                                              background: "#E8F0FF",
                                              color: "#2563EB",
                                            }}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ pt: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: 12, color: BRAND.textMuted }}>
            Showing {properties.length > 0 ? `1-${Math.min(10, properties.length)}` : "0"} of {properties.length} results
          </Typography>
          <Typography sx={{ fontSize: 12, color: BRAND.textMuted }}>
            Rows per page: 100 &nbsp; • &nbsp; Pagination UI can stay where you already have it
          </Typography>
        </Box>
      </Box>
    </Paper>
  );

  const renderEditArea = () => (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        borderRadius: 3,
        border: `1px solid ${BRAND.border}`,
        background: "#fff",
        p: 2,
      }}
    >
      <Typography sx={{ fontWeight: 900, color: BRAND.navy, mb: 1 }}>Edit Employee</Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Employee Code" value={employeeDetails?.employee_code || ""} disabled />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="First Name"
            value={form.first_name || ""}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Last Name"
            value={form.last_name || ""}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Email"
            value={form.email || ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Phone"
            value={form.phone_number || ""}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Autocomplete
            freeSolo
            options={departments}
            value={form.department || ""}
            onChange={handleDepartmentChange}
            onInputChange={(_, newInputValue) => setForm({ ...form, department: newInputValue })}
            renderInput={(params) => <TextField {...params} label="Department" fullWidth />}
          />
        </Grid>
        <Grid item xs={12}>
          <Autocomplete
            freeSolo
            options={jobTitles}
            value={form.job_title || ""}
            onChange={handleJobTitleChange}
            onInputChange={(_, newInputValue) => setForm({ ...form, job_title: newInputValue })}
            renderInput={(params) => <TextField {...params} label="Job Title" fullWidth />}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
        <Button onClick={() => setEditMode(false)} variant="outlined" sx={{ textTransform: "none", fontWeight: 900 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{ backgroundColor: BRAND.navy, textTransform: "none", fontWeight: 900 }}
        >
          Save Changes
        </Button>
      </Box>
    </Paper>
  );

  const renderManageDialog = () => (
    <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#fff",
          borderBottom: `1px solid ${BRAND.border}`,
          py: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 900, color: BRAND.navy, fontSize: 18 }}>Manage Assignments</Typography>
          <Typography sx={{ color: BRAND.textMuted, fontSize: 12 }}>
            Pre-selected items are already assigned.
          </Typography>
        </Box>

        <IconButton onClick={() => setAssignDialogOpen(false)}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <TextField
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search projects / properties..."
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#6b7280" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="outlined" onClick={clearSearch} disabled={!searchQuery.trim()}>
            Clear
          </Button>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography sx={{ fontWeight: 900, color: "#111827" }}>Assign Properties</Typography>

          <FormControlLabel
            control={
              <Switch
                checked={selectedProjects.length === filteredProjects.length && filteredProjects.length > 0}
                onChange={handleSelectAllProjects}
              />
            }
            label={<Typography sx={{ fontWeight: 800, color: BRAND.textMuted }}>Assign All</Typography>}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ maxHeight: 520, overflow: "auto" }}>
          {filteredProjects.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", color: BRAND.textMuted }}>
              <Typography sx={{ fontWeight: 900 }}>{searchQuery ? "No matches" : "No projects found"}</Typography>
              <Typography sx={{ fontSize: 12 }}>Try a different search.</Typography>
            </Box>
          ) : (
            filteredProjects.map((project) => {
              const projectId = getProjectId(project);
              const projectName = getProjectName(project);
              const isOpen = !!openProjectsDialog[projectId];
              const isProjectSelected = selectedProjects.includes(projectId);
              const isProjectAssigned = assignedProjects.includes(projectId);

              const props = projectProperties[projectId] || [];
              const propsLoading = !!loadingProperties[projectId];

              return (
                <Paper
                  key={projectId}
                  elevation={0}
                  sx={{
                    border: `1px solid ${BRAND.border}`,
                    borderRadius: 2,
                    mb: 1.5,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <Box
                    onClick={() => handleDialogProjectToggleOpen(projectId)}
                    sx={{
                      px: 1.2,
                      py: 1.2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: isProjectAssigned ? "#FFF7ED" : "#F9FAFB",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <IconButton size="small">{isOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />}</IconButton>

                      <Checkbox
                        checked={isProjectSelected}
                        onChange={() => handleProjectToggle(project)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <Box>
                        <Typography sx={{ fontWeight: 900, color: BRAND.navy }}>{projectName}</Typography>
                        <Typography sx={{ fontSize: 12, color: BRAND.textMuted }}>{projectId}</Typography>
                      </Box>

                      {isProjectAssigned ? (
                        <Chip
                          size="small"
                          label="Assigned"
                          sx={{ ml: 1, height: 22, fontWeight: 900, background: BRAND.assignedOrange, color: "#fff" }}
                        />
                      ) : null}
                    </Box>

                    <Typography sx={{ fontSize: 12, color: BRAND.textMuted, fontWeight: 800 }}>
                      {propsLoading ? "Loading…" : `${props.length} properties`}
                    </Typography>
                  </Box>

                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <Box sx={{ px: 2, pb: 1.5, pt: 1 }}>
                      {propsLoading ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
                          <CircularProgress size={18} />
                          <Typography sx={{ color: BRAND.textMuted, fontWeight: 800 }}>Loading properties…</Typography>
                        </Box>
                      ) : props.length === 0 ? (
                        <Typography sx={{ color: BRAND.textMuted, py: 1.5 }}>No properties available.</Typography>
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ background: BRAND.tableHeader }}>
                              <TableCell sx={{ fontWeight: 900 }}>Property ID</TableCell>
                              <TableCell sx={{ fontWeight: 900 }}>Property Name</TableCell>
                              <TableCell sx={{ fontWeight: 900, width: 120 }}>Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {props.map((prop) => {
                              const pid = getPropertyId(prop);
                              const isChecked = selectedProperties.some(
                                (p) => p.propertyid === pid && p.project_id === projectId
                              );

                              return (
                                <TableRow key={`${projectId}_${pid}`} hover>
                                  <TableCell sx={{ color: BRAND.textMuted }}>{pid}</TableCell>
                                  <TableCell>{getPropertyName(prop)}</TableCell>
                                  <TableCell>
                                    <Switch checked={isChecked} onChange={() => handlePropertyToggle(prop, projectId)} />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              );
            })
          )}
        </Box>

        <Box sx={{ mt: 1.5 }}>
          <Chip
            size="small"
            label={`Matches: ${searchResults.projects} projects, ${searchResults.properties} properties`}
            sx={{ backgroundColor: "#EEF2FF", color: BRAND.navy, fontWeight: 900 }}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 2,
          py: 1.6,
          borderTop: `1px solid ${BRAND.border}`,
          background: "#fff",
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ fontSize: 12, color: BRAND.textMuted, fontWeight: 800 }}>
          Selected: {selectedProjects.length} project(s), {selectedProperties.length} property(ies)
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" onClick={() => setAssignDialogOpen(false)} sx={{ textTransform: "none", fontWeight: 900 }}>
            Cancel
          </Button>

          <Button
            onClick={handleSaveAssignments}
            variant="contained"
            disabled={assignLoading}
            sx={{
              backgroundColor: "#3B82F6",
              textTransform: "none",
              fontWeight: 900,
              "&:hover": { backgroundColor: "#2563EB" },
              "&:disabled": { backgroundColor: "#CBD5E1" },
            }}
          >
            {assignLoading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} sx={{ color: "white" }} />
                Saving…
              </Box>
            ) : (
              "Assign"
            )}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );

  const body = (
    <Box sx={{ p: 2, background: BRAND.bg, minHeight: "100%" }}>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          {renderTopStrip()}
          {editMode ? renderEditArea() : null}
          {renderAssignmentsSection()}
          {renderManageDialog()}
        </>
      )}
    </Box>
  );

  if (!employeeCode) return null;

  // ✅ PAGE render (same feel as Contractor detail page)
  if (variant === "page") {
    return (
      <Box sx={{ width: "100%", background: BRAND.bg, minHeight: "100vh" }}>
        {body}
        <Snackbar
          open={toastOpen}
          autoHideDuration={4000}
          onClose={() => setToastOpen(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: "100%" }}>
            {toastMessage}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // ✅ OVERLAY render (your old fullscreen fixed)
  if (variant === "overlay") {
    return (
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: BRAND.bg,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ flex: 1, overflow: "auto" }}>{body}</Box>
        <Snackbar
          open={toastOpen}
          autoHideDuration={4000}
          onClose={() => setToastOpen(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: "100%" }}>
            {toastMessage}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // ✅ DIALOG render (kept)
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          height: "90vh",
          marginTop: "100px",
          marginX: "10px",
          width: "calc(100% - 30px)",
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ p: 0 }} />
      <DialogContent dividers sx={{ p: 0 }}>
        {body}
      </DialogContent>

      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: "100%" }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default Employee_Details;
