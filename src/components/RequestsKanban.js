import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Avatar,
  IconButton,
  Chip,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,

} from "@mui/material";
import { Edit, MoreVert } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";

// Define background colors for each column
const columnStyles = {
  requested: {
    header: "#1976d2", // Blue for header
    background: "#e3f2fd", // Light blue
  },
  blocked: {
    header: "#d32f2f", // Red
    background: "#ffebee", // Light red
  },
  issued: {
    header: "#2e7d32", // Green
    background: "#e8f5e9", // Light green
  },
  rejected: {
    header: "#6a1b9a", // Purple
    background: "#f3e5f5", // Light purple
  },
};

const RequestsKanban = () => {
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const API_URL = `${API_BASE}/all-requests`;

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // First request to get total count
      const firstUrl = `${API_URL}?limit=100&offset=0`;
      const firstResponse = await fetch(firstUrl);
      const firstData = await firstResponse.json();
      
      let allRequests = firstData.requests || [];
      const total = firstData.total || 0;
      const limit = 100;
      const totalPages = Math.ceil(total / limit);

      // If there are more pages, fetch them in parallel batches
      if (firstData.has_more && totalPages > 1) {
        const batchSize = 5; // Fetch 5 pages at a time
        const remainingPages = totalPages - 1;
        
        for (let batchStart = 1; batchStart <= remainingPages; batchStart += batchSize) {
          const batchEnd = Math.min(batchStart + batchSize - 1, remainingPages);
          const batchPromises = [];
          
          for (let page = batchStart; page <= batchEnd; page++) {
            const offset = page * limit;
            batchPromises.push(
              fetch(`${API_URL}?limit=${limit}&offset=${offset}`).then(res => res.json())
            );
          }
          
          const batchResults = await Promise.all(batchPromises);
          batchResults.forEach((jsonData) => {
            if (jsonData.success && jsonData.requests && Array.isArray(jsonData.requests)) {
              allRequests = [...allRequests, ...jsonData.requests];
            }
          });
        }
      }

      setData(allRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter data based on search query (filtering by item name; adjust as needed)
//   -  // Filter data based on search query (filtering by item name; adjust as needed)
//   -  const filteredData = data.filter((item) =>
//   -    (item.item_name || "").toLowerCase().includes(searchQuery.toLowerCase())
//   -  );
    // Filter data based on search query (searches both item name and property id)
    const filteredData = data.filter((item) =>
      (item.item_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.project_name ? item.project_name.toString().toLowerCase() : "").includes(searchQuery.toLowerCase()) ||
      (item.property_name ? item.property_name.toString().toLowerCase() : "").includes(searchQuery.toLowerCase())

    );
  

  // Define the statuses to display as columns
  const statuses = ["requested", "blocked", "issued", "rejected"];

  // Group filtered data by status (ignoring case)
  const groupedData = statuses.reduce((acc, status) => {
    acc[status] = filteredData.filter(
      (item) => item.status && item.status.toLowerCase() === status
    );
    return acc;
  }, {});

  const handleCardClick = (item) => {
    setSelectedRequest(item);
    setOpenEditDialog(true);
  };

  return (
    <Box sx={{ p: 2, backgroundColor: "white", minHeight: "100vh" }}>
      {/* Top Title Bar and Search */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
        </Typography>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search requests"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: "300px",
            "& .MuiOutlinedInput-root": { borderRadius: "25px" },
            marginBottom: 2,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {statuses.map((status) => {
            const column = columnStyles[status] || {};
            const requests = groupedData[status] || [];

            return (
              <Grid item xs={12} sm={6} md={3} key={status}>
                <Box
                  sx={{
                    backgroundColor: column.background,
                    borderRadius: 2,
                    p: 2,
                    minHeight: "75vh",
                    boxShadow: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      textTransform: "capitalize",
                      color: column.header,
                      borderBottom: `2px solid ${column.header}`,
                      pb: 1,
                      mb: 2,
                      fontWeight: 600,
                    }}
                  >
                    {status}
                  </Typography>

                  {requests.map((item) => (
                    <Paper
                      key={item.request_id}
                      sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: 2,
                        boxShadow: 1,
                        transition: "box-shadow 0.2s",
                        "&:hover": { boxShadow: 4 },
                        cursor: "pointer",
                        backgroundColor: "white",
                      }}
                      onClick={() => handleCardClick(item)}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {item.item_name}
                        </Typography>
                        <IconButton size="small">
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Avatar
                          sx={{ width: 24, height: 24, mr: 1, fontSize: 12 }}
                        >
                          {item.item_name?.[0]?.toUpperCase() || "?"}
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          {item.project_name || "No Project"}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Chip
                          label={item.property_name || "No Property"}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${item.requested_quantity || 0} qty`}
                          size="small"
                          color="primary"
                        />
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Edit Dialog for the selected request */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          {selectedRequest && (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Edit Request
              </Typography>
              <TextField
                label="Item Name"
                value={selectedRequest.item_name}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Status"
                value={selectedRequest.status}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Warehouse"
                value={selectedRequest.warehouse}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Requested Quantity"
                value={selectedRequest.requested_quantity}
                fullWidth
                margin="normal"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} variant="outlined">
            Close
          </Button>
          <Button variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequestsKanban;
