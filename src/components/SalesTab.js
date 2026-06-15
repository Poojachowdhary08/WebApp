import React, { useState } from "react";
import {
  Box,
  Select,
  MenuItem,
  Typography,
  Paper
} from "@mui/material";
import SalesStatusView from "./SalesStatusView";

const primaryColor = "#1E3A8A";

const statuses = [
  "New",
  "Contacted",
  "Pending",
  "Scheduled Visit",
  "Converted",
  "Dropped",
];

const SalesTab = () => {
  const [status, setStatus] = useState("New");

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      {/* Dropdown aligned to top-right of Sales tab */}
      <Box
        sx={{
          position: "absolute",
          top: -80,
          right: 10,
          zIndex: 10,
        }}
      >
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          size="small"
          sx={{
            minWidth: 200,
            backgroundColor: "#fff",
            borderRadius: 2,
            boxShadow: "0px 2px 6px rgba(0,0,0,0.08)",
            "& fieldset": { border: "none" },
          }}
        >
          {statuses.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <SalesStatusView status={status} />
    </Box>
  );
};

export default SalesTab;
