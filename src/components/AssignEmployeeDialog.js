// AssignEmployeeDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  Box,
  Typography,
  CircularProgress,
  Button,
  TextField,
  MenuItem,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  Divider,
  InputAdornment,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import axios from "axios";

// Fixed list of departments
const departmentsList = [
  "Architecture",
  "Construction",
  "Electrical",
  "Project Management",
  "Procurement",
  "Quality Control",
  "Safety",
  "Administration",
  "HR",
  "Design",
  "Datso Engineer",
];

const fieldSx = {
  "& .MuiInputLabel-root": {
    fontWeight: 700,
    color: "#6B7280",
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.5,
    backgroundColor: "#F3F4F6",
    "& fieldset": { borderColor: "transparent" },
    "&:hover fieldset": { borderColor: "transparent" },
    "&.Mui-focused fieldset": { borderColor: "#D1D5DB" },
  },
};

const sectionTitleSx = {
  fontWeight: 900,
  fontSize: 16,
  color: "#111827",
  mt: 2,
  mb: 1,
};

const AssignEmployeeDialog = ({ open, onClose, onEmployeeSelect }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("Construction");
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      setSelectedEmployees([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8080/employees");
      setEmployees(response.data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return (employees || []).filter((emp) => {
      const fullName = `${emp.first_name} ${emp.last_name || ""}`.toLowerCase();
      const matchesName = fullName.includes(searchQuery.toLowerCase());
      const matchesDepartment = departmentFilter
        ? String(emp.department || "").toLowerCase() ===
          String(departmentFilter).toLowerCase()
        : true;
      return matchesName && matchesDepartment;
    });
  }, [employees, searchQuery, departmentFilter]);

  const handleToggle = (emp) => {
    const isSelected = selectedEmployees.some(
      (e) => e.employee_id === emp.employee_id
    );
    if (isSelected) {
      setSelectedEmployees(
        selectedEmployees.filter((e) => e.employee_id !== emp.employee_id)
      );
    } else {
      setSelectedEmployees([...selectedEmployees, emp]);
    }
  };

  const handleConfirmSelection = () => {
    onEmployeeSelect(selectedEmployees);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 4,
          p: 0,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          pt: 2.5,
          pb: 2,
          borderBottom: "1px solid #F3F4F6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <PeopleAltOutlinedIcon sx={{ color: "#111827" }} />
          <Typography sx={{ fontWeight: 900, fontSize: 18, color: "#111827" }}>
            Assign Engineers
          </Typography>
        </Box>

        <Chip
          label={`Selected: ${selectedEmployees.length}`}
          sx={{
            bgcolor: "#EEF2FF",
            color: "#1F3A8A",
            fontWeight: 800,
            borderRadius: 2,
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ px: 3, pb: 2.5, pt: 2 }}>
        {/* Fields like the screenshot */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField
            label="Search"
            placeholder="Search engineer name"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#6B7280" }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            label="Department"
            fullWidth
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BusinessOutlinedIcon sx={{ color: "#6B7280" }} />
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="">All Departments</MenuItem>
            {departmentsList.map((dept) => (
              <MenuItem key={dept} value={dept}>
                {dept}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Typography sx={sectionTitleSx}>Engineers</Typography>

        {/* List */}
        <Box
          sx={{
            border: "1px solid #F3F4F6",
            borderRadius: 3,
            overflow: "hidden",
            maxHeight: 360,
            bgcolor: "#FFFFFF",
          }}
        >
          {loading ? (
            <Box
              sx={{
                height: 160,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={22} />
            </Box>
          ) : filteredEmployees.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Typography sx={{ color: "#9CA3AF", fontSize: 13 }}>
                No engineers found.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredEmployees.map((emp, idx) => {
                const isSelected = selectedEmployees.some(
                  (e) => e.employee_id === emp.employee_id
                );

                return (
                  <React.Fragment key={emp.employee_id}>
                    <ListItem
                      onClick={() => handleToggle(emp)}
                      sx={{
                        px: 2,
                        py: 1.2,
                        cursor: "pointer",
                        "&:hover": { bgcolor: "#F9FAFB" },
                        display: "flex",
                        alignItems: "center",
                        gap: 1.2,
                      }}
                    >
                      <Checkbox checked={isSelected} />

                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 900,
                                color: "#111827",
                                fontSize: 14,
                              }}
                            >
                              {emp.first_name} {emp.last_name || ""}
                            </Typography>
                            <Chip
                              label={emp.department || "—"}
                              size="small"
                              sx={{
                                height: 22,
                                borderRadius: 2,
                                bgcolor: "#F3F4F6",
                                color: "#6B7280",
                                fontWeight: 800,
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Typography sx={{ color: "#9CA3AF", fontSize: 12 }}>
                            Code: {emp.employee_code}
                          </Typography>
                        }
                      />
                    </ListItem>

                    {idx !== filteredEmployees.length - 1 && (
                      <Divider sx={{ borderColor: "#F3F4F6" }} />
                    )}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>

        {/* Footer buttons like modern forms */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            pt: 2.5,
          }}
        >
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 800,
              borderColor: "#E5E7EB",
              color: "#111827",
              "&:hover": { borderColor: "#D1D5DB" },
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleConfirmSelection}
            variant="contained"
            disabled={selectedEmployees.length === 0}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 900,
              bgcolor: "#2A3663",
              "&:hover": { bgcolor: "#1E2A48" },
            }}
          >
            Add Selected ({selectedEmployees.length})
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default AssignEmployeeDialog;
