import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const RequestedInventory = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = `http://localhost:8080/all-requests`;

  const fetchRequests = async () => {
    try {
      setIsLoading(true);

      // First request to get total count
      const firstUrl = `${API_URL}?limit=100&offset=0`;
      const firstResponse = await fetch(firstUrl);
      const firstData = await firstResponse.json();
      console.log("Fetching Updated Data...");

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
              fetch(`${API_URL}?limit=${limit}&offset=${offset}`).then((res) => res.json())
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

      if (allRequests.length > 0) {
        setData(allRequests);
        setFilteredData(allRequests);
      } else {
        setData([]);
        setFilteredData([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      setData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(data);
      return;
    }
    const lowerCaseQuery = searchQuery.toLowerCase().trim();
    setFilteredData(
      data.filter(
        (item) =>
          (item.item_name?.toLowerCase() || "").includes(lowerCaseQuery) ||
          (item.status?.toLowerCase() || "").includes(lowerCaseQuery) ||
          (item.project_name?.toLowerCase() || "").includes(lowerCaseQuery) ||
          (item.property_name?.toLowerCase() || "").includes(lowerCaseQuery)
      )
    );
  }, [searchQuery, data]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleItemClick = (item) => {
    // ✅ React Router v6 navigation + state (replacement for useHistory.push)
    navigate("/EditDeleteInventory", {
      state: {
        request_id: item.request_id,
        item_name: item.item_name,
        status: item.status,
        warehouse: item.warehouse,
        requested_quantity: String(item.requested_quantity ?? ""),
      },
    });
  };

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "requested":
        return "#d1e7dd";
      case "blocked":
        return "#f8d7da";
      default:
        return "#e7e7ff";
    }
  };

  const getStatusTextColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "requested":
        return "#155724";
      case "blocked":
        return "#721c24";
      default:
        return "#6c63ff";
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ textAlign: "center", marginTop: 4 }}>
        <CircularProgress />
        <Typography sx={{ marginTop: 2 }}>Loading inventory requests...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 2 }}>
      {/* Header and Search */}
      <Box
        sx={{
          marginBottom: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5">Requested Inventory</Typography>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search Inventory"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </Box>

      {/* List of Requests */}
      {filteredData.length > 0 ? (
        <Grid container spacing={2}>
          {filteredData.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.request_id}>
              <Paper
                onClick={() => handleItemClick(item)}
                sx={{
                  padding: 2,
                  cursor: "pointer",
                  border: `1px solid ${getStatusTextColor(item.status)}`,
                  backgroundColor: getStatusColor(item.status),
                  transition: "box-shadow 0.3s",
                  "&:hover": { boxShadow: 3 },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 1,
                    gap: 1,
                  }}
                >
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {item.item_name}
                  </Typography>

                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: getStatusTextColor(item.status),
                      color: getStatusTextColor(item.status),
                      textTransform: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {String(item.status || "unknown").toUpperCase()}
                  </Button>
                </Box>

                <Typography variant="body2">
                  {item.project_name || "No Project"} &mdash; {item.property_name || "No Property"}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography>No requests found.</Typography>
      )}
    </Box>
  );
};

export default RequestedInventory;
