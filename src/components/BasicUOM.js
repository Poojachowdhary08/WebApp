import React, { useState, useEffect, useMemo } from "react";
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
  Drawer,
  IconButton,
  Tooltip,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Grid,
  Skeleton,
  TextField,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import CategoryIcon from "@mui/icons-material/Category";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import Switch from "@mui/material/Switch";
import axios from "axios";
import BasicUOMForm from "./BasicUOMForm";

const BasicUOM = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  
  const [uomList, setUomList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUom, setEditingUom] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [activeStatusFilter, setActiveStatusFilter] = useState("ACTIVE"); // "ALL", "ACTIVE", "INACTIVE" - Default: Active Only
  const [viewMode, setViewMode] = useState("table"); // "table" or "cards"
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [togglingStatus, setTogglingStatus] = useState({}); // Track which UOM is being toggled

  // Fetch UOM list with status filter
  const fetchUOMList = async (statusFilter = null) => {
    try {
      setLoading(true);
      // Build URL with status query parameter if specified
      let url = "http://localhost:8080/get-all-uom";
      const params = {};
      
      // Add status filter if not "ALL"
      if (statusFilter && statusFilter !== "ALL") {
        params.is_active = statusFilter === "ACTIVE" ? "true" : "false";
      }
      
      // Add query parameters if any
      const queryString = Object.keys(params).length > 0
        ? "?" + new URLSearchParams(params).toString()
        : "";
      
      const response = await axios.get(url + queryString);
      if (response.data && response.data.success && response.data.uom_list) {
        // Map backend fields to component format
        const mappedList = response.data.uom_list.map((uom) => ({
          id: uom.basic_uom_id,
          uom_code: uom.uom_code,
          uom_name: uom.uom_name,
          uom_category: uom.uom_category,
          allow_fractional: uom.allow_fractional,
          default_precision: uom.default_precision,
          description: uom.description || "",
          is_active: uom.is_active,
          created_at: uom.created_at,
          updated_at: uom.updated_at,
        }));
        setUomList(mappedList);
      } else {
        setUomList([]);
      }
    } catch (error) {
      console.error("Error fetching UOM list:", error);
      setUomList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUOMList(activeStatusFilter);
  }, [activeStatusFilter]);

  const handleOpenDrawer = (uom = null) => {
    setEditingUom(uom);
    setDrawerOpen(true);
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    // Delay clearing editingUom to allow form to read it during close animation
    setTimeout(() => {
      setEditingUom(null);
    }, 300);
  };

  const handleSave = async (formData, isEdit = false, bulkMode = false) => {
    try {
      if (isEdit && editingUom) {
        // Update existing UOM
        await axios.put(`http://localhost:8080/update-uom/${editingUom.id}`, formData);
        if (!bulkMode) {
          showSnackbar("UOM updated successfully!", "success");
          handleCloseDrawer();
        }
      } else {
        // Create new UOM
        await axios.post("http://localhost:8080/create-uom", formData);
        if (!bulkMode) {
          showSnackbar("UOM created successfully!", "success");
          handleCloseDrawer();
        }
      }
      
      // Refresh list only if not in bulk mode (will refresh after all are done)
      if (!bulkMode) {
        await fetchUOMList(activeStatusFilter);
      }
    } catch (error) {
      console.error("Error saving UOM:", error);
      if (!bulkMode) {
        showSnackbar(
          `Failed to ${isEdit ? "update" : "create"} UOM: ${error.response?.data?.detail || error.message}`,
          "error"
        );
      }
      throw error; // Re-throw so form can handle it
    }
  };

  const handleToggleStatus = async (uomId, currentStatus) => {
    try {
      setTogglingStatus((prev) => ({ ...prev, [uomId]: true }));
      const newStatus = !currentStatus;
      
      // Use PUT endpoint to set is_active explicitly
      const response = await axios.put(`http://localhost:8080/update-uom-status/${uomId}`, {
        is_active: newStatus
      });
      
      if (response.data && response.data.success) {
        // Update local state immediately (optimistic update)
        setUomList((prevList) =>
          prevList.map((uom) =>
            uom.id === uomId
              ? { ...uom, is_active: response.data.is_active }
              : uom
          )
        );
        showSnackbar(
          response.data.message || `UOM ${response.data.is_active ? "activated" : "deactivated"} successfully!`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error updating UOM status:", error);
      showSnackbar(
        `Failed to update UOM status: ${error.response?.data?.detail || error.message}`,
        "error"
      );
      // Refresh list to get correct state
      await fetchUOMList(activeStatusFilter);
    } finally {
      setTogglingStatus((prev) => ({ ...prev, [uomId]: false }));
    }
  };


  // Filter and search (status filter is now handled by API, only category and search remain)
  const filteredUomList = useMemo(() => {
    let filtered = uomList;

    // Category filter
    if (categoryFilter !== "ALL") {
      filtered = filtered.filter((uom) => uom.uom_category === categoryFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (uom) =>
          uom.uom_name.toLowerCase().includes(query) ||
          uom.uom_code.toLowerCase().includes(query) ||
          (uom.description && uom.description.toLowerCase().includes(query)) ||
          (uom.uom_category && uom.uom_category.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [uomList, searchQuery, categoryFilter]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(uomList.map((uom) => uom.uom_category).filter(Boolean));
    return ["ALL", ...Array.from(cats).sort()];
  }, [uomList]);

  const getCategoryColor = (category) => {
    const colors = {
      WEIGHT: "#FEF3C7",
      LENGTH: "#DBEAFE",
      COUNT: "#D1FAE5",
      VOLUME: "#E9D5FF",
    };
    return colors[category] || "#F3F4F6";
  };

  const getCategoryTextColor = (category) => {
    const colors = {
      WEIGHT: "#92400E",
      LENGTH: "#1E40AF",
      COUNT: "#065F46",
      VOLUME: "#6B21A8",
    };
    return colors[category] || "#374151";
  };

  return (
    <Box sx={{ p: 0, backgroundColor: "#F7F9FC", minHeight: "100vh",mt :'-5%' }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3, 
        }}
      >
        <Box>

        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {/* View Toggle */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              bgcolor: "#fff",
              borderRadius: "999px",
              p: 0.25,
              border: "1px solid #E5E7EB",
            }}
          >
            <Tooltip title="Table view">
              <IconButton
                size="small"
                onClick={() => setViewMode("table")}
                sx={{
                  bgcolor: viewMode === "table" ? "#E8EEF9" : "transparent",
                  "&:hover": { bgcolor: "#EEF2FF" },
                }}
              >
                <ViewListIcon
                  fontSize="small"
                  sx={{ color: viewMode === "table" ? "#1E40AF" : "#475569" }}
                />
              </IconButton>
            </Tooltip>
            <Tooltip title="Card view">
              <IconButton
                size="small"
                onClick={() => setViewMode("cards")}
                sx={{
                  bgcolor: viewMode === "cards" ? "#E8EEF9" : "transparent",
                  "&:hover": { bgcolor: "#EEF2FF" },
                }}
              >
                <ViewModuleIcon
                  fontSize="small"
                  sx={{ color: viewMode === "cards" ? "#1E40AF" : "#475569" }}
                />
              </IconButton>
            </Tooltip>
          </Box>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchUOMList(activeStatusFilter)}
            disabled={loading}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              borderColor: "#2a3663",
              color: "#2a3663",
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDrawer(null)}
            sx={{
              bgcolor: "#2a3663",
              borderRadius: "8px",
              textTransform: "none",
              px: 3,
              "&:hover": { bgcolor: "#1e2a4a" },
            }}
          >
            Add UOM
          </Button>
        </Box>
      </Box>

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by name, code, category, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={activeStatusFilter}
                    onChange={(e) => setActiveStatusFilter(e.target.value)}
                    label="Status"
                    sx={{ backgroundColor: "#fff", borderRadius: "8px" }}
                  >
                    <MenuItem value="ALL">All Status</MenuItem>
                    <MenuItem value="ACTIVE">Active Only</MenuItem>
                    <MenuItem value="INACTIVE">Inactive Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Category"
                    sx={{ backgroundColor: "#fff", borderRadius: "8px" }}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat === "ALL" ? "All Categories" : cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary" align="center">
                  {filteredUomList.length} {filteredUomList.length === 1 ? "entry" : "entries"}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

      {/* Content */}
      {loading ? (
        <Box>
          {[1, 2, 3, 4, 5].map((i) => (
            <Paper key={i} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
            </Paper>
          ))}
        </Box>
      ) : filteredUomList.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 2,
            boxShadow: 1,
            backgroundColor: "#fff",
          }}
        >
          <CategoryIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {uomList.length === 0
              ? "No UOM entries found"
              : "No matching UOM entries"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {uomList.length === 0
              ? "Get started by adding your first unit of measurement"
              : "Try adjusting your search or filter criteria"}
          </Typography>
          {uomList.length === 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDrawer(null)}
              sx={{
                bgcolor: "#2a3663",
                borderRadius: "8px",
                textTransform: "none",
                px: 3,
              }}
            >
              Add Your First UOM
            </Button>
          )}
        </Paper>
      ) : viewMode === "table" ? (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#2A3663" }}>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                  UOM Code
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                  UOM Name
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                  Category
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                  Description
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                  Settings
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                  Status
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: 14, width: 120 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUomList.map((uom) => (
                <TableRow key={uom.id} hover sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
                  <TableCell>
                    <Chip
                      label={uom.uom_code}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        bgcolor: "#E0EDFF",
                        color: "#1E40AF",
                        fontFamily: "monospace",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {uom.uom_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {uom.uom_category && (
                      <Chip
                        icon={<CategoryIcon sx={{ fontSize: 14 }} />}
                        label={uom.uom_category}
                        size="small"
                        sx={{
                          bgcolor: getCategoryColor(uom.uom_category),
                          color: getCategoryTextColor(uom.uom_category),
                          fontWeight: 500,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        maxWidth: 300,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {uom.description || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {uom.allow_fractional ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />
                        ) : (
                          <CancelIcon sx={{ fontSize: 16, color: "error.main" }} />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Fractional: {uom.allow_fractional ? "Yes" : "No"}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Precision: {uom.default_precision || 6}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={uom.is_active ? "Active" : "Inactive"}
                        size="small"
                        sx={{
                          bgcolor: uom.is_active ? "#D1FAE5" : "#FEE2E2",
                          color: uom.is_active ? "#065F46" : "#991B1B",
                          fontWeight: 600,
                        }}
                      />
                      <Tooltip title={uom.is_active ? "Deactivate" : "Activate"}>
                        <Switch
                          checked={uom.is_active}
                          onChange={() => handleToggleStatus(uom.id, uom.is_active)}
                          disabled={togglingStatus[uom.id]}
                          size="small"
                          color="success"
                        />
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit UOM">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDrawer(uom)}
                        sx={{
                          color: "#2a3663",
                          "&:hover": { bgcolor: "#E0EDFF" },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        // Card View
        <Grid container spacing={2}>
          {filteredUomList.map((uom) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={uom.id}>
              <Paper
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  boxShadow: 2,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
              >
                {/* Header */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box sx={{ flex: 1 }}>
                    <Chip
                      label={uom.uom_code}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: "#E0EDFF",
                        color: "#1E40AF",
                        fontFamily: "monospace",
                        mb: 1,
                      }}
                    />
                    <Typography variant="h6" fontWeight={700} sx={{ color: "#172B4D", mb: 0.5 }}>
                      {uom.uom_name}
                    </Typography>
                  </Box>
                  <Tooltip title="Edit UOM">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDrawer(uom)}
                      sx={{
                        color: "#2a3663",
                        "&:hover": { bgcolor: "#E0EDFF" },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Category */}
                {uom.uom_category && (
                  <Chip
                    icon={<CategoryIcon sx={{ fontSize: 16 }} />}
                    label={uom.uom_category}
                    size="small"
                    sx={{
                      bgcolor: getCategoryColor(uom.uom_category),
                      color: getCategoryTextColor(uom.uom_category),
                      fontWeight: 600,
                      width: "fit-content",
                    }}
                  />
                )}

                {/* Description */}
                {uom.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      flex: 1,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {uom.description}
                  </Typography>
                )}

                <Divider />

                {/* Settings */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">
                      Fractional
                    </Typography>
                    {uom.allow_fractional ? (
                      <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
                    ) : (
                      <CancelIcon sx={{ fontSize: 18, color: "error.main" }} />
                    )}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">
                      Precision
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {uom.default_precision || 6}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Tooltip title={uom.is_active ? "Deactivate" : "Activate"}>
                      <Switch
                        checked={uom.is_active}
                        onChange={() => handleToggleStatus(uom.id, uom.is_active)}
                        disabled={togglingStatus[uom.id]}
                        size="small"
                        color="success"
                      />
                    </Tooltip>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Drawer for Add/Edit */}
      <Drawer
        anchor={isMobile ? "bottom" : "right"}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: {
            width: isMobile ? "100%" : 600,
            maxWidth: "100vw",
            maxHeight: "100vh",
            borderRadius: isMobile ? "16px 16px 0 0" : 0,
            display: "flex",
            flexDirection: "column",
            boxShadow: isMobile 
              ? "0 -4px 20px rgba(0,0,0,0.15)" 
              : "-4px 0 20px rgba(0,0,0,0.15)",
          },
        }}
        ModalProps={{
          keepMounted: false,
          BackdropProps: {
            sx: {
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        }}
        SlideProps={{
          direction: isMobile ? "up" : "left",
        }}
      >
        <BasicUOMForm
          mode={editingUom ? "edit" : "add"}
          initialData={editingUom}
          inDialog={true}
          onSave={async (formData, isEdit = false, bulkMode = false) => {
            await handleSave(formData, isEdit, bulkMode);
            // If bulk mode, refresh list after all operations
            if (bulkMode) {
              await fetchUOMList(activeStatusFilter);
            }
          }}
          onCancel={handleCloseDrawer}
          onBulkComplete={async () => {
            // Refresh list after bulk upload completes
            await fetchUOMList(activeStatusFilter);
          }}
        />
      </Drawer>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BasicUOM;
