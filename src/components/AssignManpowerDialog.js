import React, { useMemo } from "react";
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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

const AssignManpowerDialog = ({
  open,
  onClose,

  // data
  contractors,
  unassignedLabors,
  projects,
  projectProperties,

  // selections
  selectedProject,
  selectedProperty,
  selectedContractors,
  selectedLabors,

  // searches
  contractorSearch,
  laborSearch,
  projectSearch,
  propertySearch,

  // expand map
  expandedContractors,

  // setters
  setSelectedContractors,
  setSelectedLabors,
  setContractorSearch,
  setLaborSearch,
  setProjectSearch,
  setPropertySearch,
  setSelectedProperty,
  toggleContractorExpand,

  // handlers
  onProjectChange,
  onSubmit,
}) => {
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

  const filteredProjects = useMemo(() => {
    const t = (projectSearch || "").trim().toLowerCase();
    if (!t) return projects;
    return projects.filter(
      (p) =>
        p?.project_name?.toLowerCase().includes(t) || String(p?.project_id).includes(t)
    );
  }, [projects, projectSearch]);

  const filteredProperties = useMemo(() => {
    const t = (propertySearch || "").trim().toLowerCase();
    if (!t) return projectProperties;
    return projectProperties.filter(
      (p) =>
        p?.name?.toLowerCase().includes(t) ||
        String(p?.propertyid).includes(t) ||
        (p?.type || "").toLowerCase().includes(t)
    );
  }, [projectProperties, propertySearch]);

  const handleContractorCheckboxChange = (contractor) => {
    const isSelected = selectedContractors.some((c) => c.id === contractor.id);
    if (isSelected) {
      setSelectedContractors(selectedContractors.filter((c) => c.id !== contractor.id));
    } else {
      setSelectedContractors([...selectedContractors, contractor]);
    }
  };

  const handleLaborCheckboxChange = (labor, contractor) => {
    const isSelected = selectedLabors.some((l) => l.id === labor.id);
    if (isSelected) {
      setSelectedLabors(selectedLabors.filter((l) => l.id !== labor.id));
    } else {
      setSelectedLabors([...selectedLabors, labor]);
      if (contractor && !selectedContractors.some((c) => c.id === contractor.id)) {
        setSelectedContractors([...selectedContractors, contractor]);
      }
    }
  };

  const handleContractorDeleteTag = (id) => {
    setSelectedContractors(selectedContractors.filter((c) => c.id !== id));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ position: "relative", px: 3, py: 2 }}>
        <Typography variant="h6" fontWeight={800} sx={{ color: "#2a3663", textAlign: "center" }}>
          Assign Manpower To Property
        </Typography>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            borderColor: "red",
            color: "red",
            fontWeight: 700,
            textTransform: "none",
            "&:hover": { backgroundColor: "red", color: "#fff", borderColor: "red" },
          }}
        >
          X Close
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Contractors (with nested labors) */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <Autocomplete
                multiple
                options={filteredContractors}
                getOptionLabel={(o) => o?.name || "Unknown"}
                value={selectedContractors}
                onChange={(_, newValue) => setSelectedContractors(newValue)}
                onInputChange={(_, val) => setContractorSearch(val)}
                renderInput={(params) => (
                  <TextField {...params} label="Contractors" placeholder="Search contractors..." />
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
                          p: 1,
                          pl: 2,
                          "&:hover": { backgroundColor: "#f5f5f5" },
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
                            backgroundColor: "#9aa0a6",
                            borderRadius: "50%",
                            width: 36,
                            height: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            color: "#fff",
                            mr: 2,
                            fontSize: 14,
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
                                  p: 1,
                                  pl: 2,
                                  borderTop: "1px solid #f5f5f5",
                                  "&:hover": { backgroundColor: "#f5f5f5" },
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
                                    backgroundColor: "#9aa0a6",
                                    borderRadius: "50%",
                                    width: 36,
                                    height: 36,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 800,
                                    color: "#fff",
                                    mr: 2,
                                    fontSize: 14,
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
                      <Paper
                        key={option.id}
                        variant="outlined"
                        sx={{
                          px: 1,
                          py: 0.25,
                          mr: 0.5,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          borderRadius: 1.5,
                        }}
                        {...tagProps}
                      >
                        <Typography fontWeight={700} fontSize={12}>
                          {option.name || "Unknown"}
                        </Typography>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContractorDeleteTag(option.id);
                          }}
                        >
                          ×
                        </Button>
                      </Paper>
                    );
                  })
                }
                PaperComponent={(p) => <Paper {...p} sx={{ mt: 1, borderRadius: 2 }} />}
              />
            </FormControl>
          </Grid>

          {/* Unassigned labors */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <Autocomplete
                multiple
                options={filteredUnassignedLabors}
                getOptionLabel={(o) => o?.name || "Unknown"}
                value={selectedLabors}
                onChange={(_, value) => setSelectedLabors(value)}
                onInputChange={(_, val) => setLaborSearch(val)}
                renderInput={(params) => (
                  <TextField {...params} label="Search Labors" placeholder="Search labors..." />
                )}
                renderOption={(props, option) => (
                  <li
                    {...props}
                    style={{ display: "flex", alignItems: "center", padding: 12 }}
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
                        backgroundColor: "#9aa0a6",
                        borderRadius: "50%",
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        color: "#fff",
                        marginRight: 16,
                        fontSize: 14,
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
                PaperComponent={(p) => <Paper {...p} sx={{ mt: 1, borderRadius: 2 }} />}
              />
            </FormControl>
          </Grid>

          {/* Project */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <Autocomplete
                options={filteredProjects}
                getOptionLabel={(o) => o?.project_name || ""}
                value={projects.find((p) => p.project_id === selectedProject) || null}
                onChange={(_, val) => onProjectChange(val)}
                onInputChange={(_, val) => setProjectSearch(val)}
                renderInput={(params) => (
                  <TextField {...params} label="Project" placeholder="Search projects..." />
                )}
                renderOption={(props, option) => (
                  <li
                    {...props}
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      borderBottom: "1px solid #f5f5f5",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#111" }}>
                      {option.project_name}
                    </span>
                    <span style={{ fontSize: 13, color: "#666" }}>{option.project_id}</span>
                  </li>
                )}
                PaperComponent={(p) => <Paper {...p} sx={{ mt: 1, borderRadius: 2 }} />}
              />
            </FormControl>
          </Grid>

          {/* Property */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <Autocomplete
                options={filteredProperties}
                getOptionLabel={(o) => o?.name || ""}
                value={projectProperties.find((p) => p.propertyid === selectedProperty) || null}
                onChange={(_, val) => setSelectedProperty(val ? val.propertyid : "")}
                onInputChange={(_, val) => setPropertySearch(val)}
                disabled={!selectedProject || projectProperties.length === 0}
                renderInput={(params) => (
                  <TextField {...params} label="Property" placeholder="Search properties..." />
                )}
                renderOption={(props, option) => (
                  <li
                    {...props}
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      borderBottom: "1px solid #f5f5f5",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#111" }}>
                      {option.name}
                    </span>
                    <span style={{ fontSize: 13, color: "#666" }}>{option.propertyid}</span>
                  </li>
                )}
                PaperComponent={(p) => <Paper {...p} sx={{ mt: 1, borderRadius: 2 }} />}
              />
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, py: 2 }}>
        <Button
          onClick={onSubmit}
          variant="contained"
          color="primary"
          disabled={
            !selectedProject ||
            !selectedProperty ||
            (selectedContractors.length === 0 && selectedLabors.length === 0)
          }
        >
          Assign ({selectedContractors.length + selectedLabors.length} selected)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignManpowerDialog;