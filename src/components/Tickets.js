import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TicketDetailsDialog from "./TicketDetailsDialog"

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "open":
      return "#F3E5F5";   // same yellow fill
    case "close":
      return "#c1f5c1";   // reuse the “completed” green for closed
    default:
      return "#e0e0e0";   // fallback gray
  }
};

const getTextColor = (status) => {
  switch (status?.toLowerCase()) {
    case "open":
      return "#4527A0";   // same orange text
    case "close":
      return "#4caf50";   // green text
    default:
      return "#424242";   // fallback dark gray
  }
};


const Tickets = () => {
const [tickets, setTickets] = useState([]);
const [searchQuery, setSearchQuery] = useState("");
const [selectedIssueId, setSelectedIssueId] = useState(null);
const [dialogOpen, setDialogOpen] = useState(false);

 // 1) Sorting state
 const [sortField, setSortField] = useState("issue_id");
 const [sortOrder, setSortOrder] = useState("asc");

 // 2) Column definitions
 const columns = [
   { label: "Issue ID",       field: "issue_id" },
   { label: "Property",       field: "property_id" },
   { label: "Issue Type",     field: "issue_type" },
   { label: "Severity",       field: "severity" },
   { label: "Priority",       field: "priority" },
   { label: "Reported By",    field: "reported_by_email" },
   { label: "Created Date",   field: "created_at" },
   { label: "Status",         field: "status" },
 ];

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch("http://localhost:8080/tickets/all");
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : data.tickets || []);
      } catch (err) {
        console.error("Error fetching tickets:", err);
        setTickets([]);
      }
    };
    fetchTickets();
  }, []);

  // 3) Toggle sort order
  const handleSortChange = (field) => {
    if (field === sortField) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
     else {
      // new column: default to asc
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredTickets = useMemo(() => {
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter((t) => {
      // join all searchable fields into one string
      const hay = [
        t.issue_id,
        t.property_id,
        t.issue_type,
        t.severity,
        t.priority,
        t.reported_by_email,
        t.created_at,
        t.status,
      ]
        .map((v) => String(v).toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [tickets, searchQuery]);

  // 4) Build a sorted copy
  const sortedTickets = useMemo(() => {
    const arr = [...filteredTickets];
    arr.sort((a, b) => {
      let aVal = a[sortField] ?? "";
      let bVal = b[sortField] ?? "";

      if (sortField === "created_at") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredTickets, sortField, sortOrder]);

  return (
    <Box sx={{ p: 0, paddingTop: 2 }}>
      {/* Header + Search */}
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-end",  // pushes the TextField to the right
        alignItems: "center",
        mb: 2,
        px: 2,
        mt: -6,
      }}
    >
      
      {/* Search bar */}
      <TextField
        size="small"
        placeholder="Search tickets..."
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
          width: 300,
          backgroundColor: "#fff",
          borderRadius: "8px",
        }}
      />
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 1000}}>
          <TableHead sx={{ backgroundColor: "#2A3663" }}>
          <TableRow>
              {columns.map(({ label, field }) => (
                <TableCell
                  key={field}
                  onClick={() => handleSortChange(field)}
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {label}{" "}
                  {sortField === field
                    ? sortOrder === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedTickets.map((ticket) => (
              <TableRow key={ticket.issue_id}>
                {/* Issue ID clickable */}
                <TableCell
                  sx={{
                    color: "#1565C0",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedIssueId(ticket.issue_id);
                    setDialogOpen(true);
                  }}
                >
                  {ticket.issue_id}
                </TableCell>

                <TableCell>{ticket.property_id}</TableCell>
                <TableCell>{ticket.issue_type}</TableCell>
                <TableCell>{ticket.severity}</TableCell>
                <TableCell>{ticket.priority}</TableCell>
                <TableCell>{ticket.reported_by_email}</TableCell>
                <TableCell>
                  {ticket.created_at
                    ? new Date(ticket.created_at).toLocaleDateString("en-GB")
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      backgroundColor: getStatusColor(ticket.status),
                      color: getTextColor(ticket.status),
                      p: "4px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      textAlign: "center",
                      border: `1px solid ${getTextColor(ticket.status)}`,
                      width: "120px",
                    }}
                  >
                    {ticket.status?.toUpperCase()}
                  </Box>
                </TableCell>
              </TableRow>
            ))}

            {sortedTickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No tickets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TicketDetailsDialog
        issueId={selectedIssueId}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedIssueId(null);
        }}
      />
    </Box>
  );
};

export default Tickets;