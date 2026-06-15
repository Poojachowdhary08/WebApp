import React, { useEffect, useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

const allDashboards = {
  admin: {
    label: "Admin",
    url: "https://superset.datso.io/superset/dashboard/952fb48b-4d3d-473b-b323-33152848133f/?permalink_key=M6bRKjmzO81&standalone=true",
  },
  finance_team: {
    label: "Finance",
    url: "https://superset.datso.io/superset/dashboard/79781d19-77e5-4ada-bc73-c3c20c44373b/?permalink_key=JLazbLKXKOx&standalone=true",
  },
  // Add more dashboards here
};

export default function SupersetDashboard() {
  const [dashboards, setDashboards] = useState([]);
  const [error, setError] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    try {
      const storedRoles = JSON.parse(localStorage.getItem("roles") || "[]");
      if (!Array.isArray(storedRoles)) throw new Error("Invalid role format");

      const cleanedRoles = storedRoles.map((role) =>
        role?.toString().trim().toLowerCase()
      );

      const dashboardList = cleanedRoles
        .map((key) => {
          if (key === "admin") {
            return [allDashboards.admin, allDashboards.finance_team];
          }
          return allDashboards[key];
        })
        .flat()
        .filter(Boolean);

      const uniqueDashboards = Array.from(
        new Map(dashboardList.map((d) => [d.url, d])).values()
      );

      if (uniqueDashboards.length === 0) {
        setError(true);
      } else {
        setDashboards(uniqueDashboards);
      }
    } catch (err) {
      console.error("❌ Failed to parse roles:", err);
      setError(true);
    }
  }, []);

  const handleTabChange = (_, newValue) => setTabIndex(newValue);

  const currentDashboard = dashboards[tabIndex];

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error" variant="h6">
          ❌ Access Denied: No dashboards available for your role(s).
        </Typography>
      </Box>
    );
  }

  if (dashboards.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Loading dashboards...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", borderRadius: 2, overflow: "hidden" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ minHeight: 56 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Reports Dashboard
          </Typography>

          {currentDashboard && (
            <IconButton
              color="inherit"
              onClick={() =>
                window.open(currentDashboard.url, "_blank", "noopener,noreferrer")
              }
              title="Open in new tab"
            >
              <OpenInNewIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {dashboards.length > 1 ? (
        <>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              minHeight: 48,
              "& .MuiTab-root": { minHeight: 48 },
            }}
          >
            {dashboards.map((dash, index) => (
              <Tab key={dash.url} label={dash.label} id={`dashboard-tab-${index}`} />
            ))}
          </Tabs>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            {dashboards.map((dash, index) => (
              <Box
                key={dash.url}
                role="tabpanel"
                hidden={tabIndex !== index}
                id={`dashboard-tabpanel-${index}`}
                aria-labelledby={`dashboard-tab-${index}`}
                sx={{
                  height: "100%",
                  display: tabIndex === index ? "block" : "none",
                }}
              >
                <iframe
                  src={dash.url}
                  width="100%"
                  height="100%"
                  style={{ border: "none", display: "block" }}
                  title={`${dash.label} Dashboard`}
                  allowFullScreen
                  scrolling="auto"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </Box>
            ))}
          </Box>
        </>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <iframe
            src={currentDashboard.url}
            width="100%"
            height="100%"
            style={{ border: "none", display: "block" }}
            title={`${currentDashboard.label} Dashboard`}
            allowFullScreen
            scrolling="auto"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Box>
      )}
    </Box>
  );
}
