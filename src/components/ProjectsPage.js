// src/pages/Projects.jsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogContent,
  useTheme,
  useMediaQuery,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";

import ProjectsTab from "../components/ProjectsTab";
import TicketsTab from "../components/TicketsTab";
import ProjectForm from "../components/ProjectForm";
import ProjectDetails from "../components/ProjectDetails";
import TicketDetailsDialog from "../components/TicketDetailsDialog";

// ✅ IMPORT your existing property details component
import PropertyDetailsDialog from "../components/PropertyDetailsDialog";

const COLORS = {
  textPrimary: "#111827",
  textSecondary: "#6B7280",
};

const isAdmin = (role) => role && String(role).toLowerCase().includes("admin");

export default function Projects({ role, onOpenPropertyDataEntry }) {
  // "projects" | "tickets" | "calendar" | "updates"
  const [activeTab, setActiveTab] = useState("projects");
  const [search, setSearch] = useState("");
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);

  // when set => we are in Project Details view
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // ✅ when set => we are in Property Details view (replace screen)
  const [selectedProperty, setSelectedProperty] = useState(null);

  // when set => we are in Ticket Details view
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // ✅ NEW: view toggles (icons appear next to search)
  const [projectsViewMode, setProjectsViewMode] = useState("list"); // "list" | "cards"
  const [ticketsViewMode, setTicketsViewMode] = useState("list"); // "list" | "cards"
  const [projectsFiltersOpen, setProjectsFiltersOpen] = useState(false);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    setSearch("");
    setSelectedProjectId(null);
    setSelectedTicketId(null);
    setSelectedProperty(null);
  };

  const breadcrumbItems = (() => {
    if (activeTab === "projects") {
      const items = [
        {
          label: "Projects",
          onClick: () => {
            setSelectedProperty(null);
            setSelectedProjectId(null);
          },
        },
      ];

      if (!selectedProjectId && !selectedProperty) {
        items.push({ label: "All Projects" });
        return items;
      }

      // Project Details view (and as parent for property details)
      items.push({
        label: "Project Details",
        onClick: selectedProperty
          ? () => {
              setSelectedProperty(null);
            }
          : undefined,
      });

      if (selectedProperty) items.push({ label: "Property Details" });
      return items;
    }

    if (activeTab === "tickets") {
      const items = [
        {
          label: "Tickets",
          onClick: () => {
            setSelectedTicketId(null);
          },
        },
      ];
      items.push({ label: selectedTicketId ? "Ticket Details" : "All Tickets" });
      return items;
    }

    if (activeTab === "calendar") return [{ label: "Calendar" }];
    return [{ label: "Daily Updates" }];
  })();

  const showProjectListSearch =
    activeTab === "projects" && !selectedProjectId && !selectedProperty;

  const showTicketsSearch = activeTab === "tickets" && !selectedTicketId;

  const handleOpenAddProject = () => setIsAddProjectOpen(true);
  const handleCloseAddProject = () => setIsAddProjectOpen(false);

  const handleProjectSaved = () => {
    setIsAddProjectOpen(false);
    setSelectedProjectId(null);
    setSelectedProperty(null);
    setProjectsRefreshKey((k) => k + 1);
  };

  // ✅ hide tabs in ProjectDetails and PropertyDetails
  const hideTabs =
    (activeTab === "projects" && (selectedProjectId || selectedProperty)) ||
    (activeTab === "tickets" && selectedTicketId);

  // ✅ Tabs row now also contains Right side Search/Add controls + view icons
  const renderTabs = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        borderBottom: "1px solid #E5E7EB",
        mb: 2,
        gap: 2,
      }}
    >
      {/* LEFT: Tabs */}
      <Box sx={{ display: "flex", alignItems: "flex-end" }}>
        {/* Left blue vertical bar */}
        <Box sx={{ width: 4, bgcolor: "#2563EB", height: 32, mr: 2 }} />

        <Stack direction="row" spacing={4}>
          {[
            { key: "projects", label: "PROJECTS" },
            { key: "tickets", label: "TICKETS" },
            // { key: "calendar", label: "CALENDAR" },
            // { key: "updates", label: "DAILY UPDATES" },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Box
                key={tab.key}
                sx={{ cursor: "pointer", pb: 0.5 }}
                onClick={() => handleTabClick(tab.key)}
              >
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    letterSpacing: 0.8,
                    color: active ? "#2563EB" : "#6B7280",
                  }}
                >
                  {tab.label}
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    height: 2,
                    bgcolor: active ? "#2563EB" : "transparent",
                    borderRadius: 999,
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* RIGHT: Search + View toggle + Add button */}
      <Box sx={{ pb: 0.5 }}>
        {/* Tickets tab search + view icons */}
        {showTicketsSearch && (
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              placeholder="Search (Issue / Project / Property / Type / Status)"
              size="small"
              variant="outlined"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                minWidth: 320,
                bgcolor: "#FFFFFF",
                "& .MuiOutlinedInput-root": { borderRadius: "999px" },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: COLORS.textSecondary }} />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title={ticketsViewMode === "list" ? "List view" : "Card view"}>
              <ToggleButtonGroup
                exclusive
                value={ticketsViewMode}
                onChange={(e, next) => {
                  if (!next) return;
                  setTicketsViewMode(next);
                }}
                size="small"
                sx={{
                  bgcolor: "#fff",
                  borderRadius: 2,
                  border: "1px solid #E5E7EB",
                  "& .MuiToggleButton-root": {
                    border: "none",
                    px: 1.2,
                    py: 0.7,
                    borderRadius: 2,
                  },
                }}
              >
                <ToggleButton value="list">
                  <ViewListOutlinedIcon sx={{ fontSize: 18 }} />
                </ToggleButton>
                <ToggleButton value="cards">
                  <GridViewRoundedIcon sx={{ fontSize: 18 }} />
                </ToggleButton>
              </ToggleButtonGroup>
            </Tooltip>
          </Stack>
        )}

        {/* Projects LIST search + view icons + Add button */}
        {showProjectListSearch && (
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              placeholder="Search (ID / Name / City / Manager / Status)"
              size="small"
              variant="outlined"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                minWidth: 320,
                bgcolor: "#FFFFFF",
                "& .MuiOutlinedInput-root": { borderRadius: "999px" },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: COLORS.textSecondary }} />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant={projectsFiltersOpen ? "contained" : "outlined"}
              startIcon={<FilterAltOutlinedIcon />}
              onClick={() => setProjectsFiltersOpen((v) => !v)}
              sx={{
                textTransform: "none",
                borderRadius: "999px",
                fontWeight: 800,
                whiteSpace: "nowrap",
                ...(projectsFiltersOpen
                  ? { bgcolor: "#111827", "&:hover": { bgcolor: "#0B1220" } }
                  : { borderColor: "#E5E7EB", color: "#111827", bgcolor: "#fff" }),
              }}
            >
              Filters
            </Button>

            <Tooltip title={projectsViewMode === "list" ? "List view" : "Card view"}>
              <ToggleButtonGroup
                exclusive
                value={projectsViewMode}
                onChange={(e, next) => {
                  if (!next) return;
                  setProjectsViewMode(next);
                }}
                size="small"
                sx={{
                  bgcolor: "#fff",
                  borderRadius: 2,
                  border: "1px solid #E5E7EB",
                  "& .MuiToggleButton-root": {
                    border: "none",
                    px: 1.2,
                    py: 0.7,
                    borderRadius: 2,
                  },
                }}
              >
                <ToggleButton value="list">
                  <ViewListOutlinedIcon sx={{ fontSize: 18 }} />
                </ToggleButton>
                <ToggleButton value="cards">
                  <GridViewRoundedIcon sx={{ fontSize: 18 }} />
                </ToggleButton>
              </ToggleButtonGroup>
            </Tooltip>

            <Stack direction="row" spacing={2} alignItems="center">
              {isAdmin(role) && onOpenPropertyDataEntry && (
                <Tooltip title="Fill property details by project (Admin)">
                  <Button
                    variant="outlined"
                    startIcon={<EditNoteOutlinedIcon />}
                    onClick={onOpenPropertyDataEntry}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                      px: 2.5,
                      borderColor: "#2A3663",
                      color: "#2A3663",
                      "&:hover": {
                        borderColor: "#1E2A48",
                        bgcolor: "rgba(42, 54, 99, 0.04)",
                      },
                      whiteSpace: "nowrap",
                    }}
                  >
                    Property Data Entry
                  </Button>
                </Tooltip>
              )}
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  px: 3,
                  bgcolor: "#3B82F6",
                  "&:hover": { bgcolor: "#2563EB" },
                  whiteSpace: "nowrap",
                }}
                onClick={handleOpenAddProject}
              >
                Add Project
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Box>
  );

  return (
    <Box>
      {/* ✅ Breadcrumb + title ONLY (no search/actions here now) */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          mb: 2,
          position: "sticky",
          top: 0,
          zIndex: 5,
          bgcolor: "#fff",
          borderBottom: "1px solid #F3F4F6",
          py: 1.5,
        }}
        spacing={2}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Breadcrumbs
              aria-label="breadcrumb"
              sx={{
                ".MuiBreadcrumbs-separator": { color: "#9CA3AF" },
              }}
            >
              {breadcrumbItems.map((item, idx) => {
                const isLast = idx === breadcrumbItems.length - 1;
                const clickable = typeof item.onClick === "function" && !isLast;

                if (clickable) {
                  return (
                    <Link
                      key={`${item.label}-${idx}`}
                      component="button"
                      onClick={item.onClick}
                      underline="hover"
                      sx={{
                        fontSize: 14,
                        color: "#2563EB",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <Typography
                    key={`${item.label}-${idx}`}
                    variant="subtitle2"
                    sx={{
                      color: isLast ? COLORS.textPrimary : COLORS.textSecondary,
                      fontSize: 14,
                      fontWeight: isLast ? 700 : 600,
                    }}
                  >
                    {item.label}
                  </Typography>
                );
              })}
            </Breadcrumbs>
          </Stack>
        </Box>

        {/* keep right side empty to preserve spacing */}
        <Box />
      </Stack>

      {/* Tabs row – hide on Project Details / Property Details / Ticket Details */}
      {!hideTabs && renderTabs()}

      {/* ---------------- Projects flow ---------------- */}

      {/* 1) Projects list */}
      {activeTab === "projects" && !selectedProjectId && !selectedProperty && (
        <ProjectsTab
          search={search}
          refreshKey={projectsRefreshKey}
          onOpenProjectDetails={(projectId) => setSelectedProjectId(projectId)}
          viewMode={projectsViewMode} // ✅ pass view mode to ProjectsTab
          filtersOpen={projectsFiltersOpen}
        />
      )}

      {/* 2) Project Details */}
      {activeTab === "projects" && selectedProjectId && !selectedProperty && (
        <ProjectDetails
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          // ✅ navigation hook from ProjectDetails
          onOpenPropertyDetails={(propertyObj) => setSelectedProperty(propertyObj)}
        />
      )}

      {/* 3) Property Details (REPLACE SCREEN ✅ not dialog) */}
      {activeTab === "projects" && selectedProperty && (
        <Box sx={{ p: 2, bgcolor: "#ECEEF4", minHeight: "calc(100vh - 120px)" }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 2,
              bgcolor: "#fff",
              boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
            }}
          >
            <PropertyDetailsDialog
              open={true}
              embedded={true} // ✅ KEY LINE
              property={selectedProperty}
              role={role}
              onClose={() => setSelectedProperty(null)}
            />
          </Paper>
        </Box>
      )}

      {/* ---------------- Tickets flow ---------------- */}
      {activeTab === "tickets" && !selectedTicketId && (
        <TicketsTab
          search={search}
          onOpenTicketDetails={(issueId) => setSelectedTicketId(issueId)}
          viewMode={ticketsViewMode} // ✅ pass view mode to TicketsTab
        />
      )}

      {activeTab === "tickets" && selectedTicketId && (
        <TicketDetailsDialog
          issueId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}

      {/* Add Project Dialog */}
      <Dialog
        open={isAddProjectOpen}
        onClose={handleCloseAddProject}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="md"
      >
        <DialogContent sx={{ p: 0 }}>
          <ProjectForm
            onCancel={handleCloseAddProject}
            onClose={handleCloseAddProject}
            onSuccess={handleProjectSaved}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
