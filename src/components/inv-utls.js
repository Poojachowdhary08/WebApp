import React, { useState } from "react";
import { Box, Paper, Tabs, Tab, Typography } from "@mui/material";
import RequestedInventory from "./RequestedInventory";
import InventoryList from "./InventoryList";
import ManageInventory from "./ManageInventory";
import MasterItemsTable from "./MasterItems";
import EstimateList from "./estimateList";

const InventoryTabs = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event, newValue) => setSelectedTab(newValue);

  return (
    <Paper elevation={0} sx={{ width: "100%", backgroundColor: "white" }}>
      <Box sx={{ px: 2, pt: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#111827" }}>
          Inventory
        </Typography>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Inventory Requests" />
          <Tab label="Stock Requests" />
          <Tab label="Manage Inventory" />
          <Tab label="Stock" />
          <Tab label="Master Items" />
          <Tab label="Estimate List" />
        </Tabs>
      </Box>
      <Box sx={{ padding: 0 }}>
        {selectedTab === 0 && <RequestedInventory statusTab="inventory" />}
        {selectedTab === 1 && <RequestedInventory statusTab="stock" />}
        {selectedTab === 2 && <ManageInventory />}
        {selectedTab === 3 && <InventoryList />}
        {selectedTab === 4 && <MasterItemsTable />}
        {selectedTab === 5 && <EstimateList />}
      </Box>
    </Paper>
  );
};

export default InventoryTabs;
