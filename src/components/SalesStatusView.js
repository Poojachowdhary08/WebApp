import React, { useState } from "react";
import {
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Paper,
  Chip,
  Button,
} from "@mui/material";
import LeadDetailsDialog from "./LeadDetailsDialog";

const dummyLeads = {
  New: [
    {
      id: "LD_0001",
      name: "Rahul Sharma",
      contact: "9876543210",
      email: "rahul@example.com",
      source: "Facebook",
      agent: "Anita",
      budget: "₹40-50L",
      visitDate: "2025-05-14",
      createdAt: "2025-05-10",
      status: "New",
    },
  ],
};

const getStatusColor = (status) => {
  const map = {
    New: "info",
    Contacted: "primary",
    Pending: "warning",
    "Scheduled Visit": "success",
    Converted: "success",
    Dropped: "error",
  };
  return map[status] || "default";
};

const SalesStatusView = ({ status }) => {
  const leads = dummyLeads[status] || [];
  const [selectedLead, setSelectedLead] = useState(null);

  if (leads.length === 0) {
    return <Typography>No leads found for "{status}"</Typography>;
  }

  return (
    <>
      <Paper sx={{ overflowX: "auto", borderRadius: 3, p: 0 }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#f0f4ff" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Assigned Agent</TableCell>
              <TableCell>Budget</TableCell>
              <TableCell>Visit Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created On</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leads.map((lead, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Button
                    variant="text"
                    sx={{ fontWeight: "bold", color: "#1E3A8A" }}
                    onClick={() => setSelectedLead(lead)}
                  >
                    {lead.id}
                  </Button>
                </TableCell>
                <TableCell>{lead.name}</TableCell>
                <TableCell>{lead.contact}</TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>{lead.source}</TableCell>
                <TableCell>{lead.agent}</TableCell>
                <TableCell>{lead.budget}</TableCell>
                <TableCell>{lead.visitDate}</TableCell>
                <TableCell>
                  <Chip
                    label={lead.status}
                    color={getStatusColor(lead.status)}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>{lead.createdAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {selectedLead && (
        <LeadDetailsDialog
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </>
  );
};

export default SalesStatusView;
