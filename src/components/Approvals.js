import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Stack,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PendingIcon from "@mui/icons-material/Pending";

const Approvals = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // TODO: Replace with actual API endpoint
    // fetchApprovals();
  }, []);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <CheckCircleIcon sx={{ color: "#4caf50", fontSize: 20 }} />;
      case "rejected":
        return <CancelIcon sx={{ color: "#f44336", fontSize: 20 }} />;
      case "pending":
      default:
        return <PendingIcon sx={{ color: "#ff9800", fontSize: 20 }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return { bg: "#e8f5e9", color: "#2e7d32" };
      case "rejected":
        return { bg: "#ffebee", color: "#c62828" };
      case "pending":
      default:
        return { bg: "#fff3e0", color: "#e65100" };
    }
  };

  const filteredApprovals = approvals.filter((approval) =>
    Object.values(approval)
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ p: 3, backgroundColor: "#F9F9F9", minHeight: "100vh" }}>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#2a3663" }}>
          Approvals
        </Typography>
        <TextField
          size="small"
          placeholder="Search approvals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            backgroundColor: "#fff",
            borderRadius: "15px",
            width: 300,
          }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      ) : filteredApprovals.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            bgcolor: "#fff",
            borderRadius: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <Typography variant="h6" sx={{ color: "#6c757d", mb: 1 }}>
            No approvals found
          </Typography>
          <Typography variant="body2" sx={{ color: "#adb5bd" }}>
            {searchQuery ? "Try adjusting your search criteria" : "Approvals will appear here once they are created"}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <Table>
            <TableHead sx={{ backgroundColor: "#2a3663" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>ID</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Type</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Project</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Property</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Requested By</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Date</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Status</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredApprovals.map((approval) => {
                const statusColors = getStatusColor(approval.status);
                return (
                  <TableRow key={approval.id} hover>
                    <TableCell>{approval.id || "N/A"}</TableCell>
                    <TableCell>{approval.type || "N/A"}</TableCell>
                    <TableCell>{approval.project_name || approval.project_id || "N/A"}</TableCell>
                    <TableCell>{approval.property_name || approval.property_id || "N/A"}</TableCell>
                    <TableCell>{approval.requested_by || "N/A"}</TableCell>
                    <TableCell>
                      {approval.created_at
                        ? new Date(approval.created_at).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(approval.status)}
                        label={approval.status || "Pending"}
                        sx={{
                          backgroundColor: statusColors.bg,
                          color: statusColors.color,
                          fontWeight: 600,
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {approval.status?.toLowerCase() === "pending" && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              sx={{ textTransform: "none", fontWeight: 600 }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              sx={{ textTransform: "none", fontWeight: 600 }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Approvals;





