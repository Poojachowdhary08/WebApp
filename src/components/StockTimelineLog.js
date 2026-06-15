import React, { useState } from "react";
import { Box, Typography, Paper, IconButton } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { FaSortNumericDown, FaSortNumericUpAlt } from "react-icons/fa";

const actionIcons = {
  requested: <WarningAmberIcon sx={{ color: "#FFC107", mr: 1 }} />,
  raised: <ArrowUpwardIcon sx={{ color: "#2196F3", mr: 1 }} />,
  issued: <CheckCircleIcon sx={{ color: "#4CAF50", mr: 1 }} />,
  rejected: <CancelIcon sx={{ color: "#F44336", mr: 1 }} />,
  default: <ArrowUpwardIcon sx={{ color: "#9E9E9E", mr: 1 }} />,
};

const StockTimelineLog = ({ requestUpdates = [] }) => {
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSortOrder = () => {
    setSortAsc((prev) => !prev);
  };

  const sortedLogs = requestUpdates
    .flatMap((req) => {
      const status = req.status?.toLowerCase() || "default";
      const employee = req.employee_name || "Unknown";
      const property = req.property_name || "Unknown Property";
      const quantity = req.requested_quantity ?? 0;
      const warehouse = req.warehouse || "Unknown Warehouse";
      const createdAt = new Date(req.created_at).toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      let message = "";

      if (status === "requested") {
        message = `${employee} requested ${quantity} for ${property} and submitted the request to Stock Management Team.`;
      } else if (status === "raised") {
        message = `${employee} raised a stock request for ${quantity} at ${property} and forwarded it to the Backend team.`;
      } else if (status === "issued") {
        message = `${employee} checked the request and issued ${quantity} items from Warehouse ${warehouse} for ${property}.`;
      } else if (status === "rejected") {
        const lastRemark =
          req.remarks_history?.[req.remarks_history.length - 1]?.remark || "No reason given.";
        message = `${employee} rejected the request for ${quantity} at ${property}, The reason is: "${lastRemark}"`;
      } else {
        message = `${employee} marked status "${status}" at ${property}`;
      }

      return {
        time: createdAt,
        icon: actionIcons[status] || actionIcons["default"],
        message,
        rawTime: new Date(req.created_at).getTime(),
      };
    })
    .sort((a, b) => (sortAsc ? a.rawTime - b.rawTime : b.rawTime - a.rawTime));

  return (
    <Box mt={4}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="flex-start"
        onClick={toggleSortOrder}
        sx={{ cursor: "pointer", mb: 2 }}
      >
        <Typography variant="h6" fontWeight="bold" sx={{ color: "#000", mr: 1 }}>
          Stock Log Timeline
        </Typography>
        <IconButton
          size="small"
          sx={{
            color: "#000", // Pure black
            p: 0.5,
            mt: "1px", // visually align with text
          }}
        >
          {sortAsc ? <FaSortNumericDown size={16} /> : <FaSortNumericUpAlt size={16} />}
        </IconButton>
      </Box>

      {sortedLogs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No stock logs available.
        </Typography>
      ) : (
        sortedLogs.map((log, index) => (
          <Paper
            key={index}
            sx={{
              mb: 2,
              p: 2,
              display: "flex",
              alignItems: "flex-start",
              backgroundColor: "#fdfdfd",
              borderLeft: "5px solid #dcdcdc",
            }}
          >
            {log.icon}
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                {log.time}
              </Typography>
              <Typography variant="body1">{log.message}</Typography>
            </Box>
          </Paper>
        ))
      )}
    </Box>
  );
};

export default StockTimelineLog;