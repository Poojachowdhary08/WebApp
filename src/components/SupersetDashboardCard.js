import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Fade,
  useTheme,
} from "@mui/material";

const SupersetDashboardMerged = () => {
  const theme = useTheme();
  const [dashboards, setDashboards] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(false);

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

  useEffect(() => {
    try {
      const storedRoles = JSON.parse(localStorage.getItem("roles") || "[]");
      if (!Array.isArray(storedRoles)) throw new Error("Invalid role format");

      setRoles(storedRoles);

      const cleanedRoles = storedRoles.map((role) =>
        role?.toString().trim().toLowerCase()
      );

      const dashboardList = cleanedRoles
        .map((key) => {
          if (key === "admin") {
            // Admin users get access to both admin and finance dashboards
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

  if (error) {
    return (
      <Typography color="error" variant="h6" sx={{ mt: 4, px: 2 }}>
        ❌ Access Denied: No dashboards available for your role(s).
      </Typography>
    );
  }

  if (dashboards.length === 0) {
    return (
      <Typography variant="h6" sx={{ mt: 4, px: 2 }}>
        Loading dashboards...
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 4, px: 2 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        📊 Superset Dashboards (Combined View)
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {dashboards.map((dash) => (
          <Fade in key={dash.url} timeout={400}>
            <Paper
              elevation={2}
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}
              >
                {dash.label} Dashboard
              </Typography>
              <iframe
                src={dash.url}
                width="100%"
                height="720"
                style={{ border: "none" }}
                title={dash.label}
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </Paper>
          </Fade>
        ))}
      </Box>
    </Box>
  );
};

export default SupersetDashboardMerged;
