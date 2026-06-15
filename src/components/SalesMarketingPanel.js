import React, { useState } from "react";
import {
  Tabs,
  Tab,
  Box,
  Typography,
  Divider,
  Paper
} from "@mui/material";
import SalesTab from ".//SalesTab";
import MarketingTab from "./MarketingTab";

const primaryColor = "#1E3A8A";

const SalesMarketingPanel = () => {
  const [tab, setTab] = useState(0);

  const handleChange = (event, newValue) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      <Paper
        elevation={4}
        sx={{
          borderRadius: 4,
          backgroundColor: "#f9fafe",
          p: 2,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
        }}
      >
        <Typography variant="h5" sx={{ color: primaryColor, mb: 2 }}>
          Sales & Marketing Dashboard
        </Typography>

        <Tabs
          value={tab}
          onChange={handleChange}
          textColor="inherit"
          TabIndicatorProps={{ style: { background: primaryColor } }}
        >
          <Tab label="Sales" sx={{ fontWeight: "bold", color: tab === 0 ? primaryColor : "#333" }} />
          <Tab label="Marketing" sx={{ fontWeight: "bold", color: tab === 1 ? primaryColor : "#333" }} />
         
        </Tabs>

        <Divider sx={{ my: 2 }} />

        {tab === 0 && <SalesTab />}
         {tab === 1 && <MarketingTab />}
        
      </Paper>
    </Box>
  );
};

export default SalesMarketingPanel;
