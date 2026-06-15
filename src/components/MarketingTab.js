// Modern MarketingTab.js – Campaign Dashboard
import React, { useState } from "react";
import {
  Box, Typography, Button, Table, TableHead, TableBody,
  TableRow, TableCell, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Chip
} from "@mui/material";

const channels = ["Facebook", "Google Ads", "Walk-in", "Referral"];

const MarketingTab = () => {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState([
    {
      name: "May Facebook Push",
      start: "2025-05-01",
      end: "2025-05-15",
      budget: "₹50,000",
      channel: "Facebook",
      leads: 120,
      conversionRate: "12%",
      status: "Active"
    }
  ]);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    budget: "",
    channel: "Facebook",
    start: "",
    end: ""
  });

  const handleSave = () => {
    setCampaigns([...campaigns, { ...newCampaign, leads: 0, conversionRate: "0%", status: "Planned" }]);
    setOpen(false);
    setNewCampaign({ name: "", budget: "", channel: "Facebook", start: "", end: "" });
  };

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h5" sx={{ mb: 0, color: "#1E3A8A" }}>
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0 }}>
        <Typography variant="subtitle1"></Typography>
        <Button variant="contained" sx={{ backgroundColor: "#1E3A8A" , mb : 2,mt :-11 }} onClick={() => setOpen(true)}>
          + New Campaign
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 3, overflowX: "auto" }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#f0f4ff" }}>
            <TableRow>
              {[
                "Campaign", "Channel", "Budget", "Start", "End", "Leads", "Conversion", "Status"
              ].map((head) => (
                <TableCell key={head} sx={{ fontWeight: 600 }}>{head}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map((camp, index) => (
              <TableRow key={index} hover>
                <TableCell>{camp.name}</TableCell>
                <TableCell><Chip label={camp.channel} color="info" variant="outlined" /></TableCell>
                <TableCell>{camp.budget}</TableCell>
                <TableCell>{camp.start}</TableCell>
                <TableCell>{camp.end}</TableCell>
                <TableCell>{camp.leads}</TableCell>
                <TableCell>{camp.conversionRate}</TableCell>
                <TableCell>
                  <Chip
                    label={camp.status}
                    color={camp.status === "Active" ? "success" : camp.status === "Planned" ? "warning" : "default"}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Dialog to Add New Campaign */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Campaign</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <TextField
            fullWidth
            label="Campaign Name"
            value={newCampaign.name}
            onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Budget"
            value={newCampaign.budget}
            onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            select
            label="Channel"
            value={newCampaign.channel}
            onChange={(e) => setNewCampaign({ ...newCampaign, channel: e.target.value })}
            sx={{ mb: 2 }}
          >
            {channels.map((ch) => (
              <MenuItem key={ch} value={ch}>{ch}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            type="date"
            label="Start Date"
            value={newCampaign.start}
            onChange={(e) => setNewCampaign({ ...newCampaign, start: e.target.value })}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            type="date"
            label="End Date"
            value={newCampaign.end}
            onChange={(e) => setNewCampaign({ ...newCampaign, end: e.target.value })}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" sx={{ backgroundColor: "#1E3A8A" }} onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MarketingTab;