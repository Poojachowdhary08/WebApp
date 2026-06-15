import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  Dialog,
  Divider,
  Paper,
  Chip,
  Fade,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";

export default function ReportsTilesPage({ open, onClose }) {
  const [selectedDashboardUrl, setSelectedDashboardUrl] = useState(null);
  const [selectedTileTitle, setSelectedTileTitle] = useState(null);
  const [userRoles, setUserRoles] = useState([]);

  // Fetch user roles
  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const email = localStorage.getItem("email");
        if (!email) return;
        const response = await fetch(`${API_BASE}/roles?email=${email}`);
        if (!response.ok) throw new Error("Failed to fetch roles");
        const data = await response.json();
        const roles = Array.isArray(data.role) ? data.role : [];
        setUserRoles(roles);
        localStorage.setItem("roles", JSON.stringify(roles));
      } catch (error) {
        console.error("Error fetching roles:", error);
        // Fallback to localStorage
        try {
          const cachedRoles = JSON.parse(localStorage.getItem("roles") || "[]");
          setUserRoles(Array.isArray(cachedRoles) ? cachedRoles : []);
        } catch (e) {
          setUserRoles([]);
        }
      }
    };
    if (open) {
      fetchRoles();
    }
  }, [open]);

  // Check if user has access to a tile based on role
  const hasAccess = (tileKey) => {
    const roles = userRoles.map(r => (r?.toLowerCase() || r).trim());
    const isAdmin = roles.includes("admin");
    
    if (isAdmin) return true; // Admin has access to all tiles
    
    switch (tileKey) {
      case "admin":
        return false; // Admin tile only visible to admins (already handled above)
      case "finance":
        return roles.includes("finance_team") || roles.includes("finance");
      case "inventory":
        return roles.includes("stock_management_team") || roles.includes("stock_manager") || roles.includes("inventory");
      case "projects":
        return true; // Everyone has access to projects
      default:
        return false;
    }
  };

  const allTiles = [
    {
      key: "admin",
      title: "Admin",
      image:
        "https://static.vecteezy.com/system/resources/previews/007/783/979/non_2x/the-construction-team-working-on-a-new-project-vector.jpg",
      url: null,
      comingSoon: true,
    },
    {
      key: "finance",
      title: "Finance",
      image:
        "https://media.istockphoto.com/id/1253077368/vector/vector-flat-illustration-bank-building-on-a-white-background-bank-financing-money-exchange.jpg?s=612x612&w=0&k=20&c=FhfSoBEfUkI6xzeYvqbN2naUztqjABmq4b_A9PiRCX0=",
      url: null,
      comingSoon: true,
    },
    {
      key: "projects",
      title: "Projects",
      image:
        "https://static.vecteezy.com/system/resources/previews/007/783/979/non_2x/the-construction-team-working-on-a-new-project-vector.jpg",
      url: "https://superset.datso.io/superset/dashboard/4778f062-8abe-47a3-91d0-12a732e08e06/?permalink_key=2ZGRJK8OX36&standalone=true",
      comingSoon: false,
    },
    {
      key: "inventory",
      title: "Inventory",
      image:
        "https://media.istockphoto.com/id/1307725067/vector/vector-of-an-architect-reviewing-plan-of-a-new-building-at-a-construction-site.jpg?s=612x612&w=0&k=20&c=1pGNyB5zcehXBneTZ7c1zeyEVxpziUZjmI0knjM3gFA=",
      url: null,
      comingSoon: true,
    },
  ];

  // Filter tiles based on user role
  const tiles = allTiles.filter(tile => hasAccess(tile.key));

  const handleTileClick = (tile) => {
    if (tile.comingSoon || !tile.url) {
      return; // Don't do anything for coming soon tiles
    }
    setSelectedDashboardUrl(tile.url);
    setSelectedTileTitle(tile.title);
  };

  const handleCloseDashboard = () => {
    setSelectedDashboardUrl(null);
    setSelectedTileTitle(null);
  };

  const handleClose = () => {
    setSelectedDashboardUrl(null);
    setSelectedTileTitle(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          height: "95vh",
          maxHeight: "95vh",
          width: "95vw",
          maxWidth: "95vw",
          borderRadius: 3,
        },
      }}
    >
      <Box
        sx={{
          height: "100%",
          background: "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header - Enhanced with gradient */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 4,
            py: 3,
            background: "linear-gradient(135deg, #2A3663 0%, #3B4A7A 100%)",
            boxShadow: "0 4px 12px rgba(42, 54, 99, 0.15)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 4,
                height: 32,
                bgcolor: "#ffffff",
                borderRadius: 2,
                boxShadow: "0 2px 8px rgba(255, 255, 255, 0.3)",
              }}
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.5px",
                textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              Reports Dashboard
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              backdropFilter: "blur(10px)",
              "&:hover": { 
                bgcolor: "rgba(255, 255, 255, 0.25)",
                transform: "rotate(90deg)",
              },
              transition: "all 0.3s ease",
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content Area - Tiles and Dashboard */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Tiles Grid - Compact when dashboard is shown */}
          <Box
            sx={{
              px: selectedDashboardUrl ? 3 : 4,
              py: selectedDashboardUrl ? 1.5 : 4,
              overflowY: "auto",
              maxHeight: selectedDashboardUrl ? "15%" : "none",
              flexShrink: 0,
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              bgcolor: selectedDashboardUrl 
                ? "rgba(255, 255, 255, 0.8)" 
                : "transparent",
              backdropFilter: selectedDashboardUrl ? "blur(20px)" : "none",
              borderRadius: selectedDashboardUrl ? "0 0 16px 16px" : "0",
              boxShadow: selectedDashboardUrl 
                ? "0 4px 20px rgba(42, 54, 99, 0.08)" 
                : "none",
            }}
          >
            <Grid 
              container 
              spacing={selectedDashboardUrl ? 1.5 : 3}
              sx={{
                justifyContent: selectedDashboardUrl ? "center" : "flex-start",
              }}
            >
              {tiles.map((tile) => (
                <Grid 
                  item 
                  key={tile.key} 
                  xs={selectedDashboardUrl ? "auto" : 12} 
                  sm={selectedDashboardUrl ? "auto" : 6} 
                  md={selectedDashboardUrl ? "auto" : 3}
                >
                  <Fade in timeout={300}>
                    <Card
                      sx={{
                        height: "100%",
                        borderRadius: selectedDashboardUrl ? 2 : 3,
                        boxShadow: selectedDashboardUrl 
                          ? "0 2px 8px rgba(42, 54, 99, 0.1)" 
                          : "0 4px 16px rgba(42, 54, 99, 0.12)",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        border: selectedDashboardUrl === tile.url 
                          ? "2px solid #2A3663" 
                          : selectedDashboardUrl 
                            ? "1px solid rgba(42, 54, 99, 0.1)" 
                            : "1px solid rgba(42, 54, 99, 0.08)",
                        background: selectedDashboardUrl === tile.url 
                          ? "linear-gradient(135deg, rgba(42, 54, 99, 0.08) 0%, rgba(42, 54, 99, 0.02) 100%)"
                          : tile.comingSoon
                            ? "linear-gradient(135deg, rgba(156, 163, 175, 0.05) 0%, rgba(156, 163, 175, 0.02) 100%)"
                            : "linear-gradient(135deg, #ffffff 0%, #F8FAFC 100%)",
                        cursor: tile.comingSoon ? "not-allowed" : "pointer",
                        opacity: tile.comingSoon ? 0.65 : 1,
                        position: "relative",
                        overflow: "hidden",
                        "&::before": selectedDashboardUrl === tile.url ? {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: "linear-gradient(90deg, #2A3663 0%, #3B4A7A 100%)",
                        } : {},
                        "&:hover": {
                          transform: tile.comingSoon 
                            ? "none" 
                            : selectedDashboardUrl 
                              ? "scale(1.05)" 
                              : "translateY(-8px)",
                          boxShadow: tile.comingSoon
                            ? "0 4px 12px rgba(0, 0, 0, 0.1)"
                            : selectedDashboardUrl
                              ? "0 6px 16px rgba(42, 54, 99, 0.2)"
                              : "0 12px 32px rgba(42, 54, 99, 0.18)",
                          borderColor: selectedDashboardUrl === tile.url 
                            ? "#2A3663" 
                            : tile.comingSoon
                              ? "rgba(156, 163, 175, 0.3)"
                              : "rgba(42, 54, 99, 0.4)",
                        },
                      }}
                      onClick={() => handleTileClick(tile)}
                    >
                      <CardContent
                        sx={{
                          p: selectedDashboardUrl ? 1.5 : 3,
                          display: "flex",
                          flexDirection: selectedDashboardUrl ? "row" : "column",
                          alignItems: "center",
                          gap: selectedDashboardUrl ? 1 : 2,
                          height: "100%",
                          "&:last-child": { pb: selectedDashboardUrl ? 1.5 : 3 },
                        }}
                      >
                        <Box
                          component="img"
                          src={tile.image}
                          alt={tile.title}
                          sx={{
                            width: selectedDashboardUrl ? 40 : "100%",
                            height: selectedDashboardUrl ? 40 : "auto",
                            maxWidth: selectedDashboardUrl ? 40 : 200,
                            maxHeight: selectedDashboardUrl ? 40 : 140,
                            objectFit: "contain",
                            borderRadius: selectedDashboardUrl ? 1 : 2,
                            transition: "all 0.3s ease",
                          }}
                        />
                        <Typography
                          variant={selectedDashboardUrl ? "caption" : "h6"}
                          sx={{
                            fontWeight: selectedDashboardUrl === tile.url ? 700 : 600,
                            color: selectedDashboardUrl === tile.url ? "#2A3663" : "#111827",
                            textAlign: "center",
                            fontSize: selectedDashboardUrl ? "0.75rem" : "1.25rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tile.title}
                        </Typography>
                        {selectedDashboardUrl === tile.url && (
                          <Chip
                            label="Active"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              bgcolor: "#2A3663",
                              color: "#fff",
                              fontWeight: 600,
                            }}
                          />
                        )}
                        {tile.comingSoon && (
                          <Chip
                            label="Coming Soon"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              bgcolor: "#9CA3AF",
                              color: "#fff",
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </Fade>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Dashboard Section - Dynamically loaded below tiles */}
          {selectedDashboardUrl && (
            <Fade in timeout={400}>
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  position: "relative",
                  mt: 1,
                }}
              >
                {/* Dashboard Header with Close Button - Enhanced */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    px: 3,
                    py: 2,
                    background: "linear-gradient(135deg, #2A3663 0%, #3B4A7A 100%)",
                    borderRadius: "12px 12px 0 0",
                    boxShadow: "0 2px 8px rgba(42, 54, 99, 0.15)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 3,
                        height: 20,
                        bgcolor: "#ffffff",
                        borderRadius: 2,
                      }}
                    />
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        color: "#ffffff",
                        fontSize: "0.875rem",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {selectedTileTitle} Dashboard
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={handleCloseDashboard}
                    size="small"
                    sx={{
                      bgcolor: "rgba(255, 255, 255, 0.15)",
                      color: "#ffffff",
                      backdropFilter: "blur(10px)",
                      "&:hover": { 
                        bgcolor: "rgba(255, 255, 255, 0.25)",
                        transform: "scale(1.1) rotate(90deg)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    <CloseFullscreenIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                </Box>

                {/* Dashboard Iframe */}
                <Paper
                  elevation={0}
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRadius: "0 0 12px 12px",
                    border: "1px solid rgba(42, 54, 99, 0.1)",
                    borderTop: "none",
                    boxShadow: "0 4px 20px rgba(42, 54, 99, 0.08)",
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      overflow: "hidden",
                      position: "relative",
                      bgcolor: "#ffffff",
                    }}
                  >
                    <iframe
                      key={selectedDashboardUrl}
                      src={selectedDashboardUrl}
                      width="100%"
                      height="100%"
                      style={{
                        border: "none",
                        display: "block",
                      }}
                      title={`${selectedTileTitle} Dashboard`}
                      allowFullScreen
                      frameBorder="0"
                      scrolling="auto"
                    />
                  </Box>
                </Paper>
              </Box>
            </Fade>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}

