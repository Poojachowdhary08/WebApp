import React, { useState, useEffect } from "react";
import { API_BASE } from "../config";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Dialog,
  TextField,
  InputAdornment,
  Card,
  Stack,
  CardContent,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ProjectDetails from "./ProjectDetails";
import ProjectOnBoardingForm from "./ProjectOnboardingForm";
import Tickets from "./Tickets";
import DailyUpdates from "./DailyUpdates";
import CalendarView from "./Calendar";
import Approvals from "./Approvals";

const ProjectOnboarding = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const toPascalCase = (text) => {
    return text
      ?.replace(/[^a-zA-Z0-9 ]/g, "")
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${API_BASE}/projects_m`);
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
const fetchTickets = async () => {
  try {
    const res = await fetch(`${API_BASE}/tickets/all`);
    const data = await res.json();

    // If response is like { tickets: [...] }
    setTickets(Array.isArray(data) ? data : data.tickets || []);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    setTickets([]); // ensure it's always an array
  }
};

    fetchProjects();
    fetchTickets();
  }, []);

  const handleSortChange = (field) => {
    const isAsc = sortField === field && sortOrder === "asc";
    setSortField(field);
    setSortOrder(isAsc ? "desc" : "asc");
  };

  const handleProjectClick = (projectId) => {
    setSelectedProjectId(projectId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed": return "#c1f5c1";
      case "In Progress": return "#f5c69d";
      case "Pending": return "#f44336";
      case "Planning": return "#ccccff";
      default: return "#9a9c9a";
    }
  };

  const getTextColor = (status) => {
    switch (status) {
      case "Completed": return "#4caf50";
      case "In Progress": return "#f0882e";
      case "Pending": return "#f44336";
      case "Planning": return "#0000cc";
      default: return "#646664";
    }
  };

  const filteredProjects = projects
    .filter((project) =>
      [
        project.project_name,
        project.project_manager,
        project.project_type,
        project.project_id,
        project.start_date,
        project.project_location_city,
        project.project_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";
      if (sortField === "created_at") {
        valA = new Date(valA);
        valB = new Date(valB);
      } else {
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
      }
      return valA < valB ? (sortOrder === "asc" ? -1 : 1) : valA > valB ? (sortOrder === "asc" ? 1 : -1) : 0;
    });

  const paginatedProjects = filteredProjects.slice(
    currentPage * itemsPerPage,
    currentPage * itemsPerPage + itemsPerPage
  );

  const groupedTickets = tickets.reduce((acc, ticket) => {
    const status = ticket.status || "Unknown";
    if (!acc[status]) acc[status] = [];
    acc[status].push(ticket);
    return acc;
  }, {});

  const renderTicketTab = () => (
    <Box sx={{ mt: 2 }}>
      {Object.keys(groupedTickets).map((status) => (
        <Box key={status} sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2a3663", mb: 1 }}>
            {status}
          </Typography>
          <Divider />
          <Stack spacing={2} mt={1}>
            {groupedTickets[status].map((ticket) => (
              <Card key={ticket.issue_id} sx={{ p: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1"><strong>ID:</strong> {ticket.issue_id}</Typography>
                  <Typography variant="subtitle2"><strong>Property:</strong> {ticket.property_id}</Typography>
                  <Typography><strong>Subject:</strong> {ticket.subject || "No subject"}</Typography>
                  <Typography><strong>Created At:</strong> {new Date(ticket.created_at).toLocaleString()}</Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  );

  const renderTable = () => (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead sx={{ backgroundColor: "#2A3663" }}>
          <TableRow>
            {[
              { label: "ID", field: "project_id" },
              { label: "NAME", field: "project_name" },
              { label: "CITY", field: "project_location_city" },
              { label: "TYPE", field: "project_type" },
              { label: "MANAGER", field: "project_manager" },
              { label: "START DATE", field: "start_date" },
              { label: "CREATED DATE", field: "created_at" },
              { label: "STATUS", field: "project_status" },
            ].map(({ label, field }) => (
              <TableCell
                key={field}
                onClick={() => handleSortChange(field)}
                sx={{ color: "white", fontWeight: "bold", cursor: "pointer" }}
              >
                {label} {sortField === field ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedProjects.map((project) => (
            <TableRow key={project.project_id}>
              <TableCell
                sx={{ color: "#1565C0", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => handleProjectClick(project.project_id)}
              >
                {project.project_id}
              </TableCell>
              <TableCell sx={{ textTransform: "uppercase" }}>{project.project_name}</TableCell>
              <TableCell sx={{ textTransform: "uppercase" }}>{project.project_location_city}</TableCell>
              <TableCell>{project.project_type}</TableCell>
              <TableCell>{toPascalCase(project.project_manager)}</TableCell>
              <TableCell>
                {project.start_date ? new Date(project.start_date).toLocaleDateString("en-GB") : "N/A"}
              </TableCell>
              <TableCell>{new Date(project.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <Box
                  sx={{
                    backgroundColor: getStatusColor(project.project_status),
                    color: getTextColor(project.project_status),
                    p: "4px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    textAlign: "center",
                    border: `1px solid ${getTextColor(project.project_status)}`,
                    width: "120px",
                  }}
                >
                  {project.project_status.toUpperCase()}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={filteredProjects.length}
        page={currentPage}
        onPageChange={(e, newPage) => setCurrentPage(newPage)}
        rowsPerPage={itemsPerPage}
        onRowsPerPageChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))}
      />
    </TableContainer>
  );

  if (selectedProjectId) {
    return <ProjectDetails projectId={selectedProjectId} onClose={() => setSelectedProjectId(null)} />;
  }

  const renderCards = () => (
  <Box display="flex" flexDirection="column" gap={2} mt={2}>
    {filteredProjects.map((project) => (
      <Card
        key={project.project_id}
        onClick={() => handleProjectClick(project.project_id)}
        sx={{ p: 2, cursor: "pointer" }}
      >
        <CardContent>
          <Typography variant="h6" color="#2a3663" fontWeight="bold">
            {project.project_name}
          </Typography>
          <Typography>ID: {project.project_id}</Typography>
          <Typography>City: {project.project_location_city}</Typography>
          <Typography>Type: {project.project_type}</Typography>
          <Typography>Manager: {toPascalCase(project.project_manager)}</Typography>
          <Typography>Start: {project.start_date}</Typography>
          <Typography>
            Status:{" "}
            <Box
              component="span"
              sx={{
                backgroundColor: getStatusColor(project.project_status),
                color: getTextColor(project.project_status),
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontWeight: "bold",
              }}
            >
              {project.project_status}
            </Box>
          </Typography>
        </CardContent>
      </Card>
    ))}
  </Box>
);


  return (
    <Box sx={{ p: 0, backgroundColor: "#F9F9F9" }}>
      <Tabs value={activeTab} onChange={(e, newVal) => setActiveTab(newVal)} textColor="primary" indicatorColor="primary">
        <Tab label="Projects" />
        <Tab label="Tickets" />
        <Tab label="Approvals" />
        <Tab label="Calendar" />
        <Tab label="Daily Updates" />
      </Tabs>

      {activeTab === 0 && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" my={6} mb={0} mt={-4}>
            <Typography variant="h4" fontWeight="bold"></Typography>
            <Stack direction="row" spacing={2} mb={2}>
              <TextField
                size="small"
                placeholder="Search Projects"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ backgroundColor: "#fff", borderRadius: "15px", width: 250 }}
              />
              <Button
                variant="contained"
                onClick={() => setIsFormOpen(true)}
                sx={{ backgroundColor: "#2a3663", borderRadius: "5px" }}
              >
                <AddIcon sx={{ mr: 1 }} /> Add Project
              </Button>
            </Stack>
          </Box>
          {isMobile ? renderCards() : renderTable()}
        </>
      )}

      {activeTab === 1 && <Tickets />}
      {activeTab === 2 && <Approvals />}
      {activeTab === 3 && <CalendarView />}
      {activeTab === 4 && <DailyUpdates />}

      <Dialog open={isFormOpen} onClose={() => setIsFormOpen(false)} fullWidth maxWidth="md">
        <ProjectOnBoardingForm onClose={() => setIsFormOpen(false)} />
      </Dialog>
    </Box>
  );
};

export default ProjectOnboarding;
