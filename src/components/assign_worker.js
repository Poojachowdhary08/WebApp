import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  FormControl,
  TextField,
  Paper,
  Box,
  Checkbox,
  Typography,
  IconButton,
  Autocomplete,
  Collapse,
  CircularProgress,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CloseIcon from "@mui/icons-material/Close";
import BusinessIcon from "@mui/icons-material/Business";
import HomeIcon from "@mui/icons-material/Home";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import InfoIcon from "@mui/icons-material/Info";

/**
 * AssignWorker Component
 * A reusable component for assigning workers (contractors and labors) to properties
 * 
 * @param {boolean} open - Controls dialog visibility
 * @param {function} onClose - Callback when dialog is closed
 * @param {string} prefilledProjectId - Optional: Pre-fill project ID
 * @param {string} prefilledPropertyId - Optional: Pre-fill property ID
 * @param {function} onSuccess - Optional: Callback when assignment is successful
 */
const AssignWorker = ({
  open,
  onClose,
  prefilledProjectId = null,
  prefilledPropertyId = null,
  onSuccess = null,
}) => {
  // Debug: Log received props
  useEffect(() => {
    if (open) {
      console.log("AssignWorker opened with props:", {
        prefilledProjectId,
        prefilledPropertyId,
        projectIdType: typeof prefilledProjectId,
        propertyIdType: typeof prefilledPropertyId,
      });
    }
  }, [open, prefilledProjectId, prefilledPropertyId]);

  // Data states
  const [projects, setProjects] = useState([]);
  const [projectProperties, setProjectProperties] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [unassignedLabors, setUnassignedLabors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Selection states
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedContractors, setSelectedContractors] = useState([]);
  const [selectedLabors, setSelectedLabors] = useState([]);
  // Per-person amounts: { [personId]: amount }
  const [assignAmounts, setAssignAmounts] = useState({});

  // Search states
  const [contractorSearch, setContractorSearch] = useState("");
  const [laborSearch, setLaborSearch] = useState("");

  // UI states
  const [expandedContractors, setExpandedContractors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch all required data
  useEffect(() => {
    if (open) {
      fetchAllData();
    }
  }, [open]);

  // Set prefilled project when projects list is loaded (backup in case fetchAllData didn't set it)
  useEffect(() => {
    if (open && prefilledProjectId && projects.length > 0) {
      const prefilledIdStr = String(prefilledProjectId).trim();
      const currentSelected = String(selectedProject || "").trim();
      
      // Only set if not already set or if current selection doesn't match
      if (!currentSelected || currentSelected !== prefilledIdStr) {
        const matchingProject = projects.find((p) => {
          const pId = String(p.project_id || "").trim();
          const pIdAlt = String(p.id || "").trim();
          return (
            pId === prefilledIdStr ||
            pIdAlt === prefilledIdStr
          );
        });
        
        if (matchingProject) {
          const projectId = String(matchingProject.project_id || matchingProject.id);
          const projectIdStr = projectId.trim();
          
          // Only update if it's different from current selection
          if (currentSelected !== projectIdStr) {
            console.log("✅ Setting prefilled project from useEffect:", matchingProject.project_name, "ID:", projectId);
            setSelectedProject(projectId);
            fetchProjectProperties(projectId);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefilledProjectId, projects.length]);

  // Note: Project/property will be set in fetchAllData after projects are loaded

  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      const [projectsRes, contractorsRes] = await Promise.all([
        fetch("http://localhost:8080/projects_m"),
        fetch("http://localhost:8080/labors-contractors"),
      ]);

      let projectsList = [];
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        projectsList = Array.isArray(projectsData) ? projectsData : [];
        setProjects(projectsList);
      }

      if (contractorsRes.ok) {
        const data = await contractorsRes.json();
        // API returns an array, not an object
        const allData = Array.isArray(data) ? data : [];
        console.log("Fetched labors-contractors data:", allData.length, "items");
        
        // Process data: separate contractors and labors
        const processedData = allData.map((person) => {
          if (!person) return null;
          if (person.type === "CONTRACTOR") {
            const contractorId = String(person.id || "").padStart(4, "0");
            const laborsWithIds = (person.labors || []).map((labor) => ({
              ...labor,
              employee_id: String(labor.id || "").padStart(4, "0"),
            }));
            return {
              ...person,
              employee_id: contractorId,
              labors: laborsWithIds,
            };
          } else {
            return {
              ...person,
              employee_id: String(person.id || "").padStart(4, "0"),
            };
          }
        }).filter(Boolean);

        // Separate contractors and unassigned labors
        const contractorsList = processedData.filter((p) => p?.type === "CONTRACTOR");
        const allLabors = processedData.filter((p) => p?.type === "LABOR");
        // Unassigned labors are those without a parentId
        const unassignedLaborsList = allLabors.filter((l) => !l.parentId);

        console.log("Processed contractors:", contractorsList.length);
        console.log("Processed unassigned labors:", unassignedLaborsList.length);

        setContractors(contractorsList);
        setUnassignedLabors(unassignedLaborsList);
      } else {
        console.error("Failed to fetch contractors/labors:", contractorsRes.status);
      }

      // If pre-filled, find and set the project (after projects are loaded)
      if (prefilledProjectId && projectsList.length > 0) {
        const prefilledIdStr = String(prefilledProjectId).trim();
        console.log("Looking for project with ID:", prefilledIdStr, "in projects list:", projectsList.length);
        
        // Try multiple matching strategies
        const matchingProject = projectsList.find((p) => {
          const pId = String(p.project_id || "").trim();
          const pIdAlt = String(p.id || "").trim();
          return (
            pId === prefilledIdStr ||
            pIdAlt === prefilledIdStr ||
            pId === String(prefilledProjectId).trim() ||
            pIdAlt === String(prefilledProjectId).trim()
          );
        });
        
        if (matchingProject) {
          const projectId = String(matchingProject.project_id || matchingProject.id);
          console.log("✅ Found matching project:", matchingProject.project_name, "with ID:", projectId);
          setSelectedProject(projectId);
          await fetchProjectProperties(projectId);
          
          // Also set property if prefilled
          if (prefilledPropertyId) {
            // Properties will be loaded by fetchProjectProperties, then we'll set it
            setTimeout(() => {
              setSelectedProperty(String(prefilledPropertyId));
            }, 500);
          }
        } else {
          console.log("❌ Project not found in list. Prefilled ID:", prefilledIdStr);
          console.log("Available project IDs:", projectsList.map(p => p.project_id || p.id));
          // Still set the ID so it can be used
          setSelectedProject(prefilledIdStr);
          await fetchProjectProperties(prefilledIdStr);
        }
      } else if (prefilledProjectId && projectsList.length === 0) {
        // Projects list is empty but we have a prefilled ID - still try to fetch properties
        console.log("Projects list empty, using prefilled ID:", prefilledProjectId);
        setSelectedProject(String(prefilledProjectId));
        await fetchProjectProperties(prefilledProjectId);
      }
    } catch (e) {
      console.error("Error fetching data:", e);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectProperties = async (projectId) => {
    if (!projectId) return;
    try {
      const res = await fetch(`http://localhost:8080/projects_m/${projectId}/properties`);
      if (!res.ok) throw new Error("Failed to fetch properties");
      const data = await res.json();
      const propertiesList = Array.isArray(data?.properties) ? data.properties : [];
      setProjectProperties(propertiesList);
      
      // If we have a pre-filled property ID, make sure it's set after properties load
      if (prefilledPropertyId && propertiesList.length > 0) {
        const prefilledPropIdStr = String(prefilledPropertyId).trim();
        const matchingProperty = propertiesList.find(
          (p) => {
            const propId = String(p.propertyid || "").trim();
            const propIdAlt = String(p.id || "").trim();
            return (
              propId === prefilledPropIdStr ||
              propIdAlt === prefilledPropIdStr ||
              propId === String(prefilledPropertyId).trim() ||
              propIdAlt === String(prefilledPropertyId).trim()
            );
          }
        );
        if (matchingProperty) {
          const propertyId = String(matchingProperty.propertyid || matchingProperty.id);
          console.log("✅ Found matching property:", matchingProperty.name, "with ID:", propertyId);
          setSelectedProperty(propertyId);
        } else {
          console.log("❌ Property not found in list. Prefilled ID:", prefilledPropIdStr);
          // Still set it even if not found in list
          setSelectedProperty(prefilledPropIdStr);
        }
      }
    } catch (e) {
      console.error("Error fetching properties:", e);
      setError("Failed to load properties for this project.");
    }
  };

  const handleProjectChange = async (project) => {
    if (!project) {
      setSelectedProject("");
      setSelectedProperty("");
      setProjectProperties([]);
      return;
    }
    setSelectedProject(project.project_id);
    setSelectedProperty("");
    await fetchProjectProperties(project.project_id);
  };

  const handleSubmit = async () => {
    if (!selectedProject || !selectedProperty) {
      setError("Please select both project and property");
      return;
    }

    if (selectedContractors.length === 0 && selectedLabors.length === 0) {
      setError("Please select at least one contractor or labor");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Create assignments for each person with their individual amount
      const allAssignments = [];
      
      // Process contractors
      for (const contractor of selectedContractors) {
        const personId = contractor.employee_id || contractor.id;
        const amount = assignAmounts[personId] || 0;
        allAssignments.push({
          projectId: selectedProject,
          propertyId: selectedProperty,
          contractorIds: [personId],
          laborIds: [],
          assignAmount: amount,
        });
      }
      
      // Process labors
      for (const labor of selectedLabors) {
        const personId = labor.employee_id || labor.id;
        const amount = assignAmounts[personId] || 0;
        allAssignments.push({
          projectId: selectedProject,
          propertyId: selectedProperty,
          contractorIds: [],
          laborIds: [personId],
          assignAmount: amount,
        });
      }

      // Make API calls for each assignment
      const results = await Promise.all(
        allAssignments.map(async (payload) => {
          const res = await fetch("http://localhost:8080/manpower/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Failed to create assignment");
          }
          return res.json();
        })
      );

      // Success
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (e) {
      setError(e.message || "Failed to assign workers");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset all states
    setSelectedProject("");
    setSelectedProperty("");
    setSelectedContractors([]);
    setSelectedLabors([]);
    setAssignAmounts({});
    setProjectProperties([]);
    setContractorSearch("");
    setLaborSearch("");
    setExpandedContractors({});
    setError("");
    onClose();
  };

  const handleAmountChange = (personId, amount) => {
    setAssignAmounts((prev) => ({
      ...prev,
      [personId]: parseFloat(amount) || 0,
    }));
  };

  const toggleContractorExpand = (id) => {
    setExpandedContractors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleContractorCheckboxChange = (contractor) => {
    const isSelected = selectedContractors.some((c) => c.id === contractor.id);
    const personId = contractor.employee_id || contractor.id;
    if (isSelected) {
      setSelectedContractors(selectedContractors.filter((c) => c.id !== contractor.id));
      // Remove amount when deselected
      setAssignAmounts((prev) => {
        const newAmounts = { ...prev };
        delete newAmounts[personId];
        return newAmounts;
      });
    } else {
      setSelectedContractors([...selectedContractors, contractor]);
    }
  };

  const handleLaborCheckboxChange = (labor, contractor) => {
    const isSelected = selectedLabors.some((l) => l.id === labor.id);
    const personId = labor.employee_id || labor.id;
    if (isSelected) {
      setSelectedLabors(selectedLabors.filter((l) => l.id !== labor.id));
      // Remove amount when deselected
      setAssignAmounts((prev) => {
        const newAmounts = { ...prev };
        delete newAmounts[personId];
        return newAmounts;
      });
    } else {
      setSelectedLabors([...selectedLabors, labor]);
      if (contractor && !selectedContractors.some((c) => c.id === contractor.id)) {
        setSelectedContractors([...selectedContractors, contractor]);
      }
    }
  };

  const handleContractorDeleteTag = (id) => {
    setSelectedContractors(selectedContractors.filter((c) => c.id !== id));
    // Find and remove amount
    const contractor = selectedContractors.find((c) => c.id === id);
    if (contractor) {
      const personId = contractor.employee_id || contractor.id;
      setAssignAmounts((prev) => {
        const newAmounts = { ...prev };
        delete newAmounts[personId];
        return newAmounts;
      });
    }
  };

  // Filtered data
  const filteredContractors = useMemo(() => {
    const t = (contractorSearch || "").trim().toLowerCase();
    if (!t) return contractors;
    return contractors.filter(
      (c) => c?.name?.toLowerCase().includes(t) || String(c?.id).includes(t)
    );
  }, [contractors, contractorSearch]);

  const filteredUnassignedLabors = useMemo(() => {
    const t = (laborSearch || "").trim().toLowerCase();
    if (!t) return unassignedLabors;
    return unassignedLabors.filter(
      (l) => l?.name?.toLowerCase().includes(t) || String(l?.id).includes(t)
    );
  }, [unassignedLabors, laborSearch]);


  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          position: "relative",
          px: 3,
          py: 2.5,
          background: "linear-gradient(135deg, #2a3663 0%, #3d4b88 100%)",
          color: "#fff",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
          <GroupsIcon sx={{ fontSize: 28 }} />
          <Typography variant="h6" fontWeight={800} sx={{ color: "#fff" }}>
          Assign Workers To Property
        </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "#fff",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "#fafbfc", px: 3, py: 3, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {loading ? (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            minHeight={300}
            gap={2}
          >
            <CircularProgress size={48} sx={{ color: "#2a3663" }} />
            <Typography variant="body1" sx={{ color: "#6c757d", fontWeight: 500 }}>
              Loading workers and projects...
            </Typography>
          </Box>
        ) : (
          <>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  "& .MuiAlert-icon": {
                    fontSize: 28,
                  },
                }}
                onClose={() => setError("")}
                icon={<InfoIcon />}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {error}
                </Typography>
              </Alert>
            )}

            <Grid container spacing={3} sx={{ height: "100%", overflow: "hidden" }}>
              {/* Left Column - Selection Fields */}
              <Grid item xs={12} md={7} sx={{ overflowY: "auto", maxHeight: "calc(100vh - 300px)", pr: 1 }}>
                <Grid container spacing={3}>
                  {/* Project & Property Info Section */}
                  <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: "#f8f9fa",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: "#495057",
                      mb: 2,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      fontSize: "0.75rem",
                    }}
                  >
                    Assignment Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: "#fff",
                          border: "1px solid #dee2e6",
                        }}
                      >
                        <BusinessIcon sx={{ color: "#2a3663", fontSize: 28 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#6c757d",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              fontSize: "0.7rem",
                              letterSpacing: 0.5,
                            }}
                          >
                            Project
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 700,
                              color: "#212529",
                              mt: 0.25,
                            }}
                          >
                            {(() => {
                              if (!selectedProject) return "Not selected";
                              const project = projects.find((p) => 
                                String(p.project_id) === String(selectedProject) || 
                                String(p.id) === String(selectedProject)
                              );
                              return project ? project.project_name : selectedProject;
                            })()}
                          </Typography>
                          {(() => {
                            if (!selectedProject) return null;
                            const project = projects.find((p) => 
                              String(p.project_id) === String(selectedProject) || 
                              String(p.id) === String(selectedProject)
                            );
                            return project ? (
                              <Typography variant="caption" sx={{ color: "#6c757d", fontSize: "0.75rem" }}>
                                ID: {project.project_id || project.id}
                              </Typography>
                            ) : null;
                          })()}
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: "#fff",
                          border: "1px solid #dee2e6",
                        }}
                      >
                        <HomeIcon sx={{ color: "#2a3663", fontSize: 28 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#6c757d",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              fontSize: "0.7rem",
                              letterSpacing: 0.5,
                            }}
                          >
                            Property
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 700,
                              color: "#212529",
                              mt: 0.25,
                            }}
                          >
                            {(() => {
                              if (!selectedProperty) return "Not selected";
                              const property = projectProperties.find((p) => 
                                String(p.propertyid) === String(selectedProperty) || 
                                String(p.id) === String(selectedProperty)
                              );
                              return property ? property.name : selectedProperty;
                            })()}
                          </Typography>
                          {(() => {
                            if (!selectedProperty) return null;
                            const property = projectProperties.find((p) => 
                              String(p.propertyid) === String(selectedProperty) || 
                              String(p.id) === String(selectedProperty)
                            );
                            return property ? (
                              <Typography variant="caption" sx={{ color: "#6c757d", fontSize: "0.75rem" }}>
                                {/* ID: {property.propertyid || property.id} */}
                              </Typography>
                            ) : null;
                          })()}
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              {/* Contractors (with nested labors) */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "#fff",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <GroupsIcon sx={{ color: "#2a3663", fontSize: 24 }} />
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        color: "#212529",
                      }}
                    >
                      Select Contractors
                    </Typography>
                  </Box>
                  {selectedContractors.length > 0 && (
                    <Chip
                      label={`${selectedContractors.length} selected`}
                      size="small"
                      sx={{
                        bgcolor: "#2a3663",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        height: 28,
                      }}
                    />
                  )}
                </Box>
                <FormControl fullWidth>
                  <Autocomplete
                    multiple
                    options={filteredContractors}
                    getOptionLabel={(o) => o?.name || "Unknown"}
                    value={selectedContractors}
                    onChange={(_, newValue) => setSelectedContractors(newValue)}
                    onInputChange={(_, val) => setContractorSearch(val)}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Search and select contractors" 
                        placeholder="Type to search contractors..."
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                          },
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box
                        component="li"
                        {...props}
                        sx={{ p: 0, display: "block" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Box sx={{ width: "100%" }}>
                          {/* Contractor Row */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              p: 1.5,
                              pl: 2,
                              borderRadius: 1,
                              transition: "all 0.2s",
                              "&:hover": {
                                backgroundColor: "#f0f4ff",
                                transform: "translateX(4px)",
                              },
                            }}
                          >
                            <Checkbox
                              checked={selectedContractors.some((c) => c.id === option.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleContractorCheckboxChange(option);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Box
                              sx={{
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                borderRadius: "50%",
                                width: 40,
                                height: 40,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                color: "#fff",
                                mr: 2,
                                fontSize: 16,
                                boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                                transition: "transform 0.2s",
                                "&:hover": {
                                  transform: "scale(1.1)",
                                },
                              }}
                            >
                              {option.name?.[0]?.toUpperCase() || "C"}
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography fontWeight={700}>{option.name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {option.id || "N/A"}
                              </Typography>
                            </Box>
                            {option.labors?.length > 0 && (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleContractorExpand(option.id);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                {expandedContractors[option.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            )}
                          </Box>

                          {/* Labors under contractor */}
                          {option.labors?.length > 0 && (
                            <Collapse
                              in={selectedContractors.some((c) => c.id === option.id) || expandedContractors[option.id]}
                            >
                              <Box sx={{ pl: 6 }}>
                                {option.labors.map((labor) => (
                                  <Box
                                    key={labor.id}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      p: 1.5,
                                      pl: 2,
                                      borderTop: "1px solid #e9ecef",
                                      borderRadius: 1,
                                      transition: "all 0.2s",
                                      "&:hover": {
                                        backgroundColor: "#fff5f7",
                                        transform: "translateX(4px)",
                                      },
                                    }}
                                  >
                                    <Checkbox
                                      checked={selectedLabors.some((l) => l.id === labor.id)}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleLaborCheckboxChange(labor, option);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <Box
                                      sx={{
                                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                                        borderRadius: "50%",
                                        width: 40,
                                        height: 40,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 800,
                                        color: "#fff",
                                        mr: 2,
                                        fontSize: 16,
                                        boxShadow: "0 2px 8px rgba(245, 87, 108, 0.3)",
                                        transition: "transform 0.2s",
                                        "&:hover": {
                                          transform: "scale(1.1)",
                                        },
                                      }}
                                    >
                                      {labor.name?.[0]?.toUpperCase() || "L"}
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                      <Typography fontWeight={700}>{labor.name}</Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {labor.id || "N/A"}
                                      </Typography>
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                            </Collapse>
                          )}
                        </Box>
                      </Box>
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const tagProps = getTagProps({ index });
                        return (
                          <Chip
                            key={option.id}
                            label={option.name || "Unknown"}
                            onDelete={() => handleContractorDeleteTag(option.id)}
                            sx={{
                              bgcolor: "#e3f2fd",
                              color: "#1976d2",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              height: 32,
                              mr: 0.5,
                              mb: 0.5,
                              "& .MuiChip-deleteIcon": {
                                color: "#1976d2",
                                fontSize: 18,
                                "&:hover": {
                                  color: "#d32f2f",
                                },
                              },
                              "&:hover": {
                                bgcolor: "#bbdefb",
                              },
                            }}
                            {...tagProps}
                          />
                        );
                      })
                    }
                    PaperComponent={(p) => <Paper {...p} sx={{ mt: 1, borderRadius: 2 }} />}
                  />
                </FormControl>
              </Grid>

              {/* Unassigned labors */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "#fff",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <PersonIcon sx={{ color: "#2a3663", fontSize: 24 }} />
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        color: "#212529",
                      }}
                    >
                      Select Labors
                    </Typography>
                  </Box>
                  {selectedLabors.length > 0 && (
                    <Chip
                      label={`${selectedLabors.length} selected`}
                      size="small"
                      sx={{
                        bgcolor: "#2a3663",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        height: 28,
                      }}
                    />
                  )}
                </Box>
                <FormControl fullWidth>
                  <Autocomplete
                    multiple
                    options={filteredUnassignedLabors}
                    getOptionLabel={(o) => o?.name || "Unknown"}
                    value={selectedLabors}
                    onChange={(_, value) => setSelectedLabors(value)}
                    onInputChange={(_, val) => setLaborSearch(val)}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Search and select labors" 
                        placeholder="Type to search labors..."
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                          },
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li
                        {...props}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: 12,
                          borderRadius: 8,
                          transition: "all 0.2s",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedLabors.some((l) => l.id === option.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleLaborCheckboxChange(option, null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div
                          style={{
                            background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                            borderRadius: "50%",
                            width: 40,
                            height: 40,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            color: "#fff",
                            marginRight: 16,
                            fontSize: 16,
                            boxShadow: "0 2px 8px rgba(79, 172, 254, 0.3)",
                            transition: "transform 0.2s",
                          }}
                        >
                          {option.name?.[0]?.toUpperCase() || "L"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{option.name}</div>
                          <div style={{ fontSize: 12, color: "#555" }}>{option.id || "N/A"}</div>
                        </div>
                      </li>
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const tagProps = getTagProps({ index });
                        return (
                          <Chip
                            key={option.id}
                            label={option.name || "Unknown"}
                            onDelete={() => {
                              const personId = option.employee_id || option.id;
                              const isSelected = selectedLabors.some((l) => l.id === option.id);
                              if (isSelected) {
                                setSelectedLabors(selectedLabors.filter((l) => l.id !== option.id));
                                setAssignAmounts((prev) => {
                                  const newAmounts = { ...prev };
                                  delete newAmounts[personId];
                                  return newAmounts;
                                });
                              }
                            }}
                            sx={{
                              bgcolor: "#e8f5e9",
                              color: "#2e7d32",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              height: 32,
                              mr: 0.5,
                              mb: 0.5,
                              "& .MuiChip-deleteIcon": {
                                color: "#2e7d32",
                                fontSize: 18,
                                "&:hover": {
                                  color: "#d32f2f",
                                },
                              },
                              "&:hover": {
                                bgcolor: "#c8e6c9",
                              },
                            }}
                            {...tagProps}
                          />
                        );
                      })
                    }
                    PaperComponent={(p) => <Paper {...p} sx={{ mt: 1, borderRadius: 2 }} />}
                  />
                </FormControl>
              </Grid>
                </Grid>
              </Grid>

              {/* Right Column - Selected People with Amounts */}
              <Grid item xs={12} md={5} sx={{ display: "flex", flexDirection: "column" }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: "#fff",
                    border: "1px solid #e9ecef",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    maxHeight: "calc(100vh - 300px)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
                    <AttachMoneyIcon sx={{ color: "#2a3663", fontSize: 24 }} />
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        color: "#212529",
                      }}
                    >
                      Assign Amounts
                    </Typography>
                    {(selectedContractors.length > 0 || selectedLabors.length > 0) && (
                      <Chip
                        label={`${selectedContractors.length + selectedLabors.length} selected`}
                        size="small"
                        sx={{
                          bgcolor: "#2a3663",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          height: 24,
                        }}
                      />
                    )}
                  </Box>

                  {(selectedContractors.length === 0 && selectedLabors.length === 0) ? (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 4,
                        color: "#6c757d",
                      }}
                    >
                      <AttachMoneyIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                      <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                        No workers selected yet
                  </Typography>
                      <Typography variant="caption" sx={{ color: "#adb5bd" }}>
                        Select contractors or labors to assign amounts
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", flex: 1, pr: 1 }}>
                      {/* Contractors */}
                  {selectedContractors.map((contractor) => {
                    const personId = contractor.employee_id || contractor.id;
                    return (
                          <Box
                            key={personId}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              bgcolor: "#f8f9fa",
                              border: "1px solid #e9ecef",
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                              <Box
                                sx={{
                                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                  borderRadius: "50%",
                                  width: 36,
                                  height: 36,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  color: "#fff",
                                  fontSize: 14,
                                }}
                              >
                                {contractor.name?.[0]?.toUpperCase() || "C"}
                              </Box>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: "#212529" }}>
                                  {contractor.name || "Contractor"}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#6c757d", fontSize: "0.7rem" }}>
                                  Contractor
                                </Typography>
                              </Box>
                            </Box>
                        <TextField
                          fullWidth
                          type="number"
                              size="small"
                              label="Amount"
                              placeholder="Enter amount"
                          value={assignAmounts[personId] || ""}
                          onChange={(e) => handleAmountChange(personId, e.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 1.5,
                                },
                              }}
                        />
                      </Box>
                    );
                  })}
                  
                      {/* Labors */}
                  {selectedLabors.map((labor) => {
                    const personId = labor.employee_id || labor.id;
                    return (
                          <Box
                            key={personId}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              bgcolor: "#f8f9fa",
                              border: "1px solid #e9ecef",
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                              <Box
                                sx={{
                                  background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                                  borderRadius: "50%",
                                  width: 36,
                                  height: 36,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  color: "#fff",
                                  fontSize: 14,
                                }}
                              >
                                {labor.name?.[0]?.toUpperCase() || "L"}
                              </Box>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: "#212529" }}>
                                  {labor.name || "Labor"}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#6c757d", fontSize: "0.7rem" }}>
                                  Labor
                                </Typography>
                              </Box>
                            </Box>
                        <TextField
                          fullWidth
                          type="number"
                              size="small"
                              label="Amount"
                              placeholder="Enter amount"
                          value={assignAmounts[personId] || ""}
                          onChange={(e) => handleAmountChange(personId, e.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 1.5,
                                },
                              }}
                        />
                      </Box>
                    );
                  })}
                    </Box>
              )}
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: "space-between",
          px: 3,
          py: 2.5,
          borderTop: "1px solid #e9ecef",
          bgcolor: "#f8f9fa",
        }}
      >
        <Box>
          {(selectedContractors.length > 0 || selectedLabors.length > 0) && (
            <Typography variant="body2" sx={{ color: "#6c757d", fontWeight: 500 }}>
              {selectedContractors.length + selectedLabors.length} person{selectedContractors.length + selectedLabors.length !== 1 ? "s" : ""} selected
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            disabled={submitting}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              borderRadius: 2,
              borderColor: "#dee2e6",
              color: "#495057",
              "&:hover": {
                borderColor: "#adb5bd",
                bgcolor: "#f8f9fa",
              },
            }}
          >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            submitting ||
            !selectedProject ||
            !selectedProperty ||
            (selectedContractors.length === 0 && selectedLabors.length === 0)
          }
            sx={{
              textTransform: "none",
              fontWeight: 700,
              px: 4,
              borderRadius: 2,
              bgcolor: "#2a3663",
              "&:hover": {
                bgcolor: "#1e2a48",
              },
              "&:disabled": {
                bgcolor: "#adb5bd",
                color: "#fff",
              },
            }}
        >
          {submitting ? (
            <>
                <CircularProgress size={16} sx={{ mr: 1, color: "#fff" }} />
              Assigning...
            </>
          ) : (
              `Assign ${selectedContractors.length + selectedLabors.length > 0 ? `(${selectedContractors.length + selectedLabors.length})` : ""}`
          )}
        </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default AssignWorker;
