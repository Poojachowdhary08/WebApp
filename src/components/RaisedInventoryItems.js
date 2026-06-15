import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import { useMediaQuery, useTheme } from "@mui/material";
import axios from "axios";

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ----- Raised Inventory Items Component -----
const RaisedInventoryItems = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Filter states
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // View mode: 'aggregated' or 'detailed'
  const [viewMode, setViewMode] = useState("aggregated");
  
  // Selected request details
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Fetch raised inventory items
  const fetchRaisedInventoryItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/raised-inventory-items");
      
      if (response.data && Array.isArray(response.data)) {
        // Sort by newest first
        const sortedData = response.data.sort(
          (a, b) => new Date(b.created_at || b.deli_date || 0) - new Date(a.created_at || a.deli_date || 0)
        );
        setData(sortedData);
      } else if (response.data.items && Array.isArray(response.data.items)) {
        const sortedData = response.data.items.sort(
          (a, b) => new Date(b.created_at || b.deli_date || 0) - new Date(a.created_at || a.deli_date || 0)
        );
        setData(sortedData);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error("Error fetching raised inventory items:", err);
      setError(err.message || "Failed to fetch raised inventory items");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRaisedInventoryItems();
  }, []);

  // Extract unique values for filter dropdowns
  const uniqueProjects = useMemo(() => {
    return Array.from(new Set(data.map(item => item.project_name).filter(Boolean))).sort();
  }, [data]);

  const uniqueProperties = useMemo(() => {
    return Array.from(new Set(data.map(item => item.property_name).filter(Boolean))).sort();
  }, [data]);

  const uniqueWarehouses = useMemo(() => {
    return Array.from(new Set(data.map(item => item.warehouse).filter(Boolean))).sort();
  }, [data]);

  // Filter and search logic
  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter((item) => 
        String(item.status || "").toLowerCase() === filterStatus.toLowerCase()
      );
    }

    // Apply project filter
    if (filterProject) {
      filtered = filtered.filter((item) => 
        String(item.project_name || "").toLowerCase() === filterProject.toLowerCase()
      );
    }

    // Apply property filter
    if (filterProperty) {
      filtered = filtered.filter((item) => 
        String(item.property_name || "").toLowerCase() === filterProperty.toLowerCase()
      );
    }

    // Apply warehouse filter
    if (filterWarehouse) {
      filtered = filtered.filter((item) => 
        String(item.warehouse || "").toLowerCase() === filterWarehouse.toLowerCase()
      );
    }

    // Apply date filter
    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      filterDateObj.setHours(0, 0, 0, 0);
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.created_at || item.deli_date || item.requested_date);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === filterDateObj.getTime();
      });
    }

    // Apply search query
    if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          String(item.item_name || "").toLowerCase().includes(query) ||
          String(item.project_name || "").toLowerCase().includes(query) ||
          String(item.property_name || "").toLowerCase().includes(query) ||
          String(item.warehouse || "").toLowerCase().includes(query) ||
          String(item.request_id || "").toLowerCase().includes(query) ||
          String(item.quantity || "").toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [data, filterStatus, filterProject, filterProperty, filterWarehouse, filterDate, debouncedSearchQuery]);

  // Aggregated data by item_name
  const aggregatedData = useMemo(() => {
    const grouped = {};
    
    filteredData.forEach((item) => {
      const itemName = item.item_name || "unknown";
      if (!grouped[itemName]) {
        grouped[itemName] = {
          item_name: itemName,
          items: [],
          request_ids: new Set(),
          total_items: 0,
          total_quantity: 0,
          project_name: item.project_name,
          property_name: item.property_name,
          warehouse: item.warehouse,
          status: item.status,
          created_at: item.created_at || item.deli_date || item.requested_date,
        };
      }
      grouped[itemName].items.push(item);
      grouped[itemName].total_items += 1;
      grouped[itemName].total_quantity += Number(item.quantity || item.requested_quantity || 0);
      if (item.request_id) {
        grouped[itemName].request_ids.add(item.request_id);
      }
    });

    // Convert Set to Array for request_ids
    return Object.values(grouped).map(group => ({
      ...group,
      request_ids: Array.from(group.request_ids),
      request_count: group.request_ids.size
    }));
  }, [filteredData]);

  // Sorting logic
  const sortedData = useMemo(() => {
    const dataToSort = viewMode === "aggregated" ? aggregatedData : filteredData;
    if (!sortConfig.key) return dataToSort;
    return [...dataToSort].sort((a, b) => {
      let aVal = a[sortConfig.key] ?? "";
      let bVal = b[sortConfig.key] ?? "";
      
      // For aggregated view, handle special keys
      if (viewMode === "aggregated") {
        if (sortConfig.key === "total_items") {
          aVal = a.total_items;
          bVal = b.total_items;
        } else if (sortConfig.key === "total_quantity") {
          aVal = a.total_quantity;
          bVal = b.total_quantity;
        } else if (sortConfig.key === "item_name") {
          aVal = a.item_name;
          bVal = b.item_name;
        } else if (sortConfig.key === "request_count") {
          aVal = a.request_count || 0;
          bVal = b.request_count || 0;
        }
      }
      
      if (["quantity", "request_id", "total_quantity", "total_items", "request_count"].includes(sortConfig.key)) {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, aggregatedData, viewMode, sortConfig]);

  // Handle request click to show details
  const handleRequestClick = (request) => {
    if (viewMode === "aggregated") {
      setSelectedRequest(request);
      setDetailsDialogOpen(true);
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">Loading raised inventory items...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Error: {error}</Typography>
        <Button onClick={fetchRaisedInventoryItems} sx={{ mt: 2 }} variant="contained">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 2 }}>
      {/* View Mode Toggle and Summary */}
      <Box sx={{ mb: 2, px: 2, display: "flex", justifyContent: "flex-start", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="aggregated">Aggregated</ToggleButton>
          <ToggleButton value="detailed">Detailed</ToggleButton>
        </ToggleButtonGroup>
        
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: "auto", mt:"-9%" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Total Items: {filteredData.length}
          </Typography>
          {viewMode === "aggregated" && (
            <Typography variant="body2" color="text.secondary">
              {aggregatedData.length} Item{aggregatedData.length !== 1 ? "s" : ""}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Filters and Search */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: { xs: "flex-start", sm: "flex-end" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: 2,
          px: 2,
          mt: isMobile ? 0 : "-4.2%",
        }}
      >
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search Items"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          sx={{
            maxWidth: { xs: "100%", sm: "200px" },
            "& .MuiOutlinedInput-root": {
              borderRadius: "25px",
              flexDirection: "row-reverse",
              padding: 0,
            },
            "& input": {
              textAlign: "start",
              padding: "8px 12px",
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment
                position="end"
                sx={{ cursor: "pointer", ml: 1 }}
              >
                <SearchIcon sx={{ color: "#2C3E50" }} />
              </InputAdornment>
            ),
          }}
        />

        <Button
          variant={showFilters ? "contained" : "outlined"}
          size="small"
          onClick={() => setShowFilters(!showFilters)}
          startIcon={<FilterListIcon />}
          sx={{
            borderRadius: "25px",
            textTransform: "none",
            minWidth: { xs: "100%", sm: "auto" },
          }}
        >
          {showFilters ? "Hide Filters" : "More Filters"}
        </Button>
      </Box>

      {/* Advanced Filters Section */}
      {showFilters && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            mb: 2,
            px: 2,
            flexWrap: "wrap",
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: "180px" } }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="">
                <em>All Statuses</em>
              </MenuItem>
              <MenuItem value="raised">Raised</MenuItem>
              <MenuItem value="issued">Issued</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: "180px" } }}>
            <InputLabel>Project</InputLabel>
            <Select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              label="Project"
            >
              <MenuItem value="">
                <em>All Projects</em>
              </MenuItem>
              {uniqueProjects.map((project) => (
                <MenuItem key={project} value={project}>
                  {project}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: "180px" } }}>
            <InputLabel>Property</InputLabel>
            <Select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              label="Property"
            >
              <MenuItem value="">
                <em>All Properties</em>
              </MenuItem>
              {uniqueProperties.map((property) => (
                <MenuItem key={property} value={property}>
                  {property}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: "180px" } }}>
            <InputLabel>Warehouse</InputLabel>
            <Select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              label="Warehouse"
            >
              <MenuItem value="">
                <em>All Warehouses</em>
              </MenuItem>
              {uniqueWarehouses.map((warehouse) => (
                <MenuItem key={warehouse} value={warehouse}>
                  {warehouse}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            type="date"
            size="small"
            label="Requested Date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ minWidth: { xs: "100%", sm: "180px" } }}
          />

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setFilterStatus("");
              setFilterProject("");
              setFilterProperty("");
              setFilterWarehouse("");
              setFilterDate("");
              setSearchQuery("");
            }}
            sx={{
              borderRadius: "25px",
              textTransform: "none",
              minWidth: { xs: "100%", sm: "auto" },
              height: "40px",
            }}
          >
            Clear All Filters
          </Button>
        </Box>
      )}

      {/* Data Display */}
      {sortedData.length > 0 ? (
        isMobile ? (
          <Box display="flex" flexDirection="column" gap={2}>
            {sortedData.map((item, index) => (
              <Paper
                key={viewMode === "aggregated" ? item.item_name : (item.request_id || index)}
                elevation={3}
                sx={{ 
                  p: 2, 
                  borderLeft: `4px solid #1976d2`,
                  cursor: viewMode === "aggregated" ? "pointer" : "default",
                  "&:hover": viewMode === "aggregated" ? { boxShadow: 6 } : {}
                }}
                onClick={() => viewMode === "aggregated" && handleRequestClick(item)}
              >
                {viewMode === "aggregated" ? (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: "#1565C0" }}>
                      Item: {item.item_name}
                    </Typography>
                    <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Chip label={`Total Qty: ${item.total_quantity}`} size="small" color="primary" />
                      <Chip label={`${item.request_count || 0} Request${(item.request_count || 0) !== 1 ? "s" : ""}`} size="small" variant="outlined" />
                      <Chip label={`${item.total_items} Entries`} size="small" />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Project:</strong> {item.project_name || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Property:</strong> {item.property_name || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Warehouse:</strong> {item.warehouse || "N/A"}
                    </Typography>
                    {item.created_at && (
                      <Typography variant="body2">
                        <strong>Date:</strong> {new Date(item.created_at).toLocaleDateString()}
                      </Typography>
                    )}
                  </>
                ) : (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: "#1565C0" }}>
                      {item.request_id || `Item ${index + 1}`}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Item:</strong> {item.item_name || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Project:</strong> {item.project_name || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Property:</strong> {item.property_name || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Warehouse:</strong> {item.warehouse || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Quantity:</strong> {item.quantity || item.requested_quantity || "N/A"}
                    </Typography>
                    {item.status && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Status:</strong> {item.status}
                      </Typography>
                    )}
                  </>
                )}
              </Paper>
            ))}
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="raised inventory items table">
              <TableHead sx={{ backgroundColor: "#2A3663" }}>
                <TableRow>
                  {viewMode === "aggregated" ? (
                    <>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} onClick={() => handleSort("item_name")}>
                        Item Name {sortConfig.key === "item_name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} align="center" onClick={() => handleSort("total_quantity")}>
                        Total Quantity {sortConfig.key === "total_quantity" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} align="center" onClick={() => handleSort("request_count")}>
                        Request Count {sortConfig.key === "request_count" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} align="center" onClick={() => handleSort("total_items")}>
                        Entries {sortConfig.key === "total_items" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} onClick={() => handleSort("project_name")}>
                        Project {sortConfig.key === "project_name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} onClick={() => handleSort("property_name")}>
                        Property {sortConfig.key === "property_name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase" }}>
                        Warehouse
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} onClick={() => handleSort("request_id")}>
                        Request ID {sortConfig.key === "request_id" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} onClick={() => handleSort("item_name")}>
                        Item Name {sortConfig.key === "item_name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} onClick={() => handleSort("project_name")}>
                        Project {sortConfig.key === "project_name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} onClick={() => handleSort("property_name")}>
                        Property {sortConfig.key === "property_name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} onClick={() => handleSort("warehouse")}>
                        Warehouse {sortConfig.key === "warehouse" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase", cursor: "pointer" }} align="center" onClick={() => handleSort("quantity")}>
                        Quantity {sortConfig.key === "quantity" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      {data[0]?.status && (
                        <TableCell sx={{ color: "white", fontWeight: "bold", textTransform: "uppercase" }}>
                          Status
                        </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedData.map((item, index) => (
                  <TableRow 
                    key={viewMode === "aggregated" ? item.item_name : (item.request_id || index)} 
                    hover
                    onClick={() => viewMode === "aggregated" && handleRequestClick(item)}
                    sx={{ cursor: viewMode === "aggregated" ? "pointer" : "default" }}
                  >
                    {viewMode === "aggregated" ? (
                      <>
                        <TableCell sx={{ color: "#1565C0", fontWeight: "bold" }}>{item.item_name}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>{item.total_quantity}</TableCell>
                        <TableCell align="center">
                          <Chip label={item.request_count || 0} size="small" color="secondary" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={item.total_items} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{item.project_name || "N/A"}</TableCell>
                        <TableCell>{item.property_name || "N/A"}</TableCell>
                        <TableCell>{item.warehouse || "N/A"}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{item.request_id || `Item ${index + 1}`}</TableCell>
                        <TableCell>{item.item_name || "N/A"}</TableCell>
                        <TableCell>{item.project_name || "N/A"}</TableCell>
                        <TableCell>{item.property_name || "N/A"}</TableCell>
                        <TableCell>{item.warehouse || "N/A"}</TableCell>
                        <TableCell align="center">{item.quantity || item.requested_quantity || "N/A"}</TableCell>
                        {item.status && (
                          <TableCell>{item.status}</TableCell>
                        )}
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        <Typography align="center" sx={{ py: 4 }}>
          No raised inventory items found.
        </Typography>
      )}

      {/* Request Details Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: "#2A3663", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Item Details - {selectedRequest?.item_name}
          </Typography>
          <IconButton onClick={() => setDetailsDialogOpen(false)} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedRequest && (
            <>
              <Box sx={{ mb: 3, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>Summary</Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Chip label={`Total Quantity: ${selectedRequest.total_quantity}`} color="primary" />
                  <Chip label={`${selectedRequest.request_count || 0} Request${(selectedRequest.request_count || 0) !== 1 ? "s" : ""}`} variant="outlined" />
                  <Chip label={`${selectedRequest.total_items} Entries`} />
                  <Typography variant="body2">
                    <strong>Project:</strong> {selectedRequest.project_name || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Property:</strong> {selectedRequest.property_name || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Warehouse:</strong> {selectedRequest.warehouse || "N/A"}
                  </Typography>
                  {selectedRequest.created_at && (
                    <Typography variant="body2">
                      <strong>Date:</strong> {new Date(selectedRequest.created_at).toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>All Requests for this Item</Typography>
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: "#e3f2fd" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>Request ID</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="center">Quantity</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Project</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Property</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Request Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedRequest.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ color: "#1565C0" }}>{item.request_id || "N/A"}</TableCell>
                        <TableCell align="center">{item.quantity || item.requested_quantity || "N/A"}</TableCell>
                        <TableCell>
                          {item.status && <Chip label={item.status} size="small" />}
                        </TableCell>
                        <TableCell>{item.project_name || "N/A"}</TableCell>
                        <TableCell>{item.property_name || "N/A"}</TableCell>
                        <TableCell>
                          {item.created_at || item.deli_date || item.requested_date
                            ? new Date(item.created_at || item.deli_date || item.requested_date).toLocaleString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RaisedInventoryItems;

