import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  TextField,
  InputAdornment,
  Pagination,
  MenuItem,
  Select,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import RequestChatDialog from "./RequestChatDialog";

dayjs.extend(customParseFormat);

const statusColors = {
  requested: "#FFC107",
  issued: "#4CAF50",
  rejected: "#F44336",
  delayed: "#D32F2F",
  raised: "#607D8B",
};

const ITEMS_PER_PAGE = 12;

const ChatUpdates = ({ requestUpdates = [] }) => {
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatRequest, setChatRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  const handleTileClick = (req) => {
    setChatRequest(req);
    setChatDialogOpen(true);
  };


  const filteredRequests = useMemo(() => {
    let results = [...requestUpdates];
  
    if (statusFilter !== "all") {
      results = results.filter((r) => r.status === statusFilter);
    }
  
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
  
      results = results.filter((r) => {
        const idMatch = r.request_id.toLowerCase().includes(q);
        const nameMatch = r.employee_name?.toLowerCase().includes(q);
  
        const createdFormatted = dayjs(r.created_at).format("DD-MM-YYYY");
        const compactDate = dayjs(r.created_at).format("DDMMYYYY");
        const dayMonth = dayjs(r.created_at).format("DD-MM");
        const daySlashMonth = dayjs(r.created_at).format("DD/MM");
  
        const dateMatch =
          createdFormatted.includes(q) ||
          compactDate.includes(q) ||
          dayMonth.includes(q) ||
          daySlashMonth.includes(q);
  
        return idMatch || nameMatch || dateMatch;
      });
    }
  
    results.sort((a, b) =>
      sortOrder === "newest"
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at)
    );
  
    return results;
  }, [requestUpdates, statusFilter, searchQuery, sortOrder]);
  

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
  };

  return (
    <Box>
      {/* Top Header with Title + Sort Icon */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        gap={2}
        flexWrap="wrap"
      >
        <Box
          display="flex"
          alignItems="center"
          sx={{ cursor: "pointer" }}
          onClick={toggleSortOrder}
        >
          <Typography variant="h6" fontWeight="bold" mr={1}>
            All Requests for Item
          </Typography>
          <Tooltip title={`Sort by ${sortOrder === "newest" ? "Newest" : "Oldest"}`}>
            <IconButton size="small">
              {sortOrder === "newest" ? (
                <ArrowDownwardIcon fontSize="small" />
              ) : (
                <ArrowUpwardIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        <Box display="flex" alignItems="center" gap={1} ml="auto">
          {/* Search */}
          <TextField
            placeholder="Search by Request ID, Name or Date"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            size="small"
            sx={{ width: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            size="small"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="requested">Requested</MenuItem>
            <MenuItem value="issued">Issued</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="delayed">Delayed</MenuItem>
            <MenuItem value="raised">Raised</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* Grid of Requests */}
      <Grid container spacing={2}>
        {paginatedRequests.map((req) => (
          <Grid item xs={12} sm={6} md={4} key={req.request_id}>
            <Paper
              onClick={() => handleTileClick(req)}
              sx={{
                p: 2,
                cursor: "pointer",
                borderRadius: 2,
                borderLeft: `6px solid ${statusColors[req.status] || "#ccc"}`,
                transition: "0.2s",
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                },
              }}
            >
              <Typography fontWeight="bold">
                {req.request_id.replace(/^12\s*[-–]?\s*/, "")}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {req.employee_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {dayjs(req.created_at).format("DD MMM YYYY, hh:mm A")}
              </Typography>
              <Box mt={1}>
                <Chip
                  label={req.status.toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: statusColors[req.status] || "#999",
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box mt={3} display="flex" justifyContent="center">
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(e, value) => setCurrentPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Chat Dialog */}
      {chatDialogOpen && chatRequest && (
        <RequestChatDialog
          open={chatDialogOpen}
          onClose={() => setChatDialogOpen(false)}
          selectedRequest={chatRequest}
          allRequests={requestUpdates}
        />
      )}
    </Box>
  );
};

export default ChatUpdates;