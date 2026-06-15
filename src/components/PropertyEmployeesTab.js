// PropertyEmployeesTab.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Typography,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import axios from "axios";
import AssignEmployeeDialog from "./AssignEmployeeDialog";
import AssignWorker from "./AssignWorker";

const avatarFallback = (name = "") => {
  const parts = String(name).trim().split(" ").filter(Boolean);
  const a = (parts[0]?.[0] || "").toUpperCase();
  const b = (parts[1]?.[0] || "").toUpperCase();
  return (a + b) || "?";
};

const roleChipSx = {
  height: 22,
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 1.5,
  bgcolor: "#F3F4F6",
  color: "#6B7280",
  "& .MuiChip-label": { px: 1 },
};

const cardSx = {
  borderRadius: 3,
  border: "1px solid #E5E7EB",
  bgcolor: "#FFFFFF",
  overflow: "hidden",
  boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
};

const headerSx = {
  px: 2,
  pt: 2,
  pb: 1.2,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const listWrapperSx = {
  px: 1,
  pb: 1.5,
};

const PropertyEmployeesTab = ({ property, showDialog }) => {
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [assignedLabors, setAssignedLabors] = useState([]);
  const [loadingLabors, setLoadingLabors] = useState(false);

  const [assignEmployeeDialogOpen, setAssignEmployeeDialogOpen] = useState(false);

  // ✅ NEW: AssignWorker dialog open state
  const [assignWorkerOpen, setAssignWorkerOpen] = useState(false);

  // Menus
  const [empMenu, setEmpMenu] = useState({ anchorEl: null, row: null });
  const [labMenu, setLabMenu] = useState({ anchorEl: null, row: null });

  // IDs
  const propertyId = property?.propertyid || property?.property_id || property?.id;

  // ✅ Try common names for project id (adjust if your property object uses a different key)
  const projectId =
    property?.projectid ||
    property?.project_id ||
    property?.projectId ||
    property?.project?.project_id ||
    property?.project?.id ||
    null;

  const fetchEmployees = useCallback(async () => {
    if (!propertyId) return;
    setLoadingEmployees(true);
    try {
      const response = await axios.get(
        `http://localhost:8080/properties-employee/${propertyId}`
      );
      setAssignedEmployees(response.data.assignments || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setAssignedEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [propertyId]);

  const fetchLabors = useCallback(async () => {
    if (!propertyId) return;
    setLoadingLabors(true);
    try {
      const response = await axios.get(
        `http://localhost:8080/properties-labor/${propertyId}`
      );
      setAssignedLabors(response.data || []);
    } catch (error) {
      console.error("Error fetching labors:", error);
      setAssignedLabors([]);
    } finally {
      setLoadingLabors(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (propertyId) {
      fetchEmployees();
      fetchLabors();
    }
  }, [propertyId, fetchEmployees, fetchLabors]);

  const handleAddSelectedEmployees = async (selectedEmployees) => {
    try {
      const payload = {
        property_id: propertyId,
        employees: selectedEmployees.map((emp) => emp.employee_code),
      };

      const response = await axios.post(
        "http://localhost:8080/properties-employee/bulk",
        payload
      );

      if (response.status === 200) {
        showDialog?.("Employees added successfully!", "success");
        fetchEmployees();
      }
    } catch (error) {
      console.error("Error adding employees:", error);
      showDialog?.("Failed to add employees.", "error");
    }
  };

  // ✅ NOW: Labour “+ Add” opens AssignWorker dialog
  const handleAddLaboursClick = () => {
    if (!propertyId) {
      showDialog?.("Property ID missing. Can't assign workers.", "error");
      return;
    }
    setAssignWorkerOpen(true);
  };

  // Display helpers
  const employeeRows = useMemo(() => {
    return (assignedEmployees || []).map((emp) => ({
      key: emp.assignment_id ?? `${emp.employee_code}-${emp.first_name}`,
      name: emp.first_name || emp.name || "Unknown",
      roleLabel: emp.department || "Engineer",
      subtitle: "Support Staff",
      raw: emp,
    }));
  }, [assignedEmployees]);

  const labourRows = useMemo(() => {
    return (assignedLabors || []).map((labor) => ({
      key: labor.assignment_id ?? `${labor.labor_id}-${labor.name}`,
      name: labor.name || "Unknown",
      roleLabel: labor.work_type || "Labour",
      subtitle: "Support Staff",
      raw: labor,
    }));
  }, [assignedLabors]);

  const renderList = ({ rows, loading, emptyText, onMenuOpen }) => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={22} />
        </Box>
      );
    }

    if (!rows?.length) {
      return (
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography sx={{ color: "#9CA3AF", fontSize: 13 }}>
            {emptyText}
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={listWrapperSx}>
        <List disablePadding sx={{ maxHeight: 380, overflowY: "auto" }}>
          {rows.map((row, idx) => (
            <React.Fragment key={row.key}>
              <ListItem
                sx={{
                  px: 1.25,
                  py: 1,
                  borderRadius: 2,
                  "&:hover": { bgcolor: "#F9FAFB" },
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={(e) => onMenuOpen(e, row)}
                    sx={{ color: "#111827" }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      fontWeight: 800,
                      bgcolor: "#E5E7EB",
                      color: "#111827",
                    }}
                  >
                    {avatarFallback(row.name)}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontWeight: 800, color: "#111827" }}>
                        {row.name}
                      </Typography>
                      <Chip label={row.roleLabel} sx={roleChipSx} />
                    </Box>
                  }
                  secondary={
                    <Typography sx={{ color: "#9CA3AF", fontSize: 12 }}>
                      {row.subtitle}
                    </Typography>
                  }
                />
              </ListItem>

              {idx !== rows.length - 1 && (
                <Divider sx={{ borderColor: "#F3F4F6", mx: 1.25 }} />
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
    );
  };

  return (
    <>
      <Grid container spacing={2}>
        {/* LEFT: Assigned Employees */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={cardSx}>
            <Box sx={headerSx}>
              <Typography sx={{ fontWeight: 900, color: "#111827" }}>
                Assigned Employees
              </Typography>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAssignEmployeeDialogOpen(true)}
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  borderRadius: 2,
                  bgcolor: "#E8F0FF",
                  color: "#1F3A8A",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#DDE7FF", boxShadow: "none" },
                }}
              >
                Add
              </Button>
            </Box>

            {renderList({
              rows: employeeRows,
              loading: loadingEmployees,
              emptyText: "No employees assigned.",
              onMenuOpen: (e, row) => setEmpMenu({ anchorEl: e.currentTarget, row }),
            })}
          </Paper>
        </Grid>

        {/* RIGHT: Assigned Labour */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={cardSx}>
            <Box sx={headerSx}>
              <Typography sx={{ fontWeight: 900, color: "#111827" }}>
                Assigned Labour
              </Typography>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddLaboursClick}
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  borderRadius: 2,
                  bgcolor: "#E8F0FF",
                  color: "#1F3A8A",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#DDE7FF", boxShadow: "none" },
                }}
              >
                Add
              </Button>
            </Box>

            {renderList({
              rows: labourRows,
              loading: loadingLabors,
              emptyText: "No labours assigned.",
              onMenuOpen: (e, row) => setLabMenu({ anchorEl: e.currentTarget, row }),
            })}
          </Paper>
        </Grid>
      </Grid>

      {/* Employee row menu */}
      <Menu
        anchorEl={empMenu.anchorEl}
        open={Boolean(empMenu.anchorEl)}
        onClose={() => setEmpMenu({ anchorEl: null, row: null })}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 180 } }}
      >
        <MenuItem
          onClick={() => {
            showDialog?.("Remove employee is not available in this view. Use project-level assignment to change assignments.", "info");
            setEmpMenu({ anchorEl: null, row: null });
          }}
        >
          Remove
        </MenuItem>
        <MenuItem
          onClick={() => {
            showDialog?.("View profile is not available here. Open the employee from the main list to see full profile.", "info");
            setEmpMenu({ anchorEl: null, row: null });
          }}
        >
          View Profile
        </MenuItem>
      </Menu>

      {/* Labour row menu */}
      <Menu
        anchorEl={labMenu.anchorEl}
        open={Boolean(labMenu.anchorEl)}
        onClose={() => setLabMenu({ anchorEl: null, row: null })}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 180 } }}
      >
        <MenuItem
          onClick={() => {
            showDialog?.("Remove labour is not available in this view. Use project-level assignment to change assignments.", "info");
            setLabMenu({ anchorEl: null, row: null });
          }}
        >
          Remove
        </MenuItem>
        <MenuItem
          onClick={() => {
            showDialog?.("View details is not available here. Open the worker from the main list to see full details.", "info");
            setLabMenu({ anchorEl: null, row: null });
          }}
        >
          View Details
        </MenuItem>
      </Menu>

      {/* Assign Engineers dialog */}
      <AssignEmployeeDialog
        open={assignEmployeeDialogOpen}
        onClose={() => setAssignEmployeeDialogOpen(false)}
        onEmployeeSelect={(selectedEmps) => {
          handleAddSelectedEmployees(selectedEmps);
          setAssignEmployeeDialogOpen(false);
        }}
      />

      {/* ✅ Assign Workers dialog (used for Labour Add) */}
      <AssignWorker
        open={assignWorkerOpen}
        onClose={() => setAssignWorkerOpen(false)}
        prefilledProjectId={projectId}
        prefilledPropertyId={propertyId}
        onSuccess={() => {
          showDialog?.("Workers assigned successfully!", "success");
          fetchLabors(); // refresh labour list
        }}
      />
    </>
  );
};

export default PropertyEmployeesTab;
