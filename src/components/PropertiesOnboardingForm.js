import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  Card,
  Divider,
  MenuItem,
  CircularProgress,
  Stack,
  Container,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";

const statuses = ["Planning", "In Progress", "Completed"];
const projectTypes = ["Residential", "Commercial", "Industrial", "Mixed Use"];
const currencies = ["Rupee", "Dollar"];

const ProjectForm = ({ onCancel }) => {
  const initialFormData = {
    project_name: "",
    project_type: "",
    project_location_city: "",
    project_location_state: "",
    project_location_gps: "",
    start_date: null,
    // expected_completion_date: null,
    // actual_completion_date: null,
    project_status: "Planning",
    total_budget: "",
    current_currency: "Rupee",
    project_manager: "",
    dimensions: "",
    documents: "N/A", // Set to null initially
  };

  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    if (field === "documents") {
      setFormData((prev) => ({ ...prev, [field]: value.length ? Array.from(value) : null }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    if (onCancel) onCancel();
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);

      const requiredFields = [
        "project_name",
        "project_type",
        "project_location_city",
        "project_location_state",
        "project_location_gps",
        "project_status",
        "total_budget",
        "project_manager",
      ];
      const missingFields = requiredFields.filter((field) => !formData[field]);
      if (missingFields.length > 0) {
        alert(`Please fill in all required fields: ${missingFields.join(", ")}`);
        return;
      }

      const formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "documents" && formData[key]) {
          formData[key].forEach((file) => formDataToSend.append(key, file));
        } else {
          formDataToSend.append(key, formData[key] || ""); // Append an empty string if null
        }
      });
      

      const response = await fetch("http://localhost:8080/projects_m", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error(`Failed to save project: ${response.statusText}`);
      }

      alert("Project details saved successfully!");
      handleCancel();
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project details. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Card elevation={6} sx={{ padding: 4, borderRadius: 4 }}>
        <Typography variant="h4" sx={{ textAlign: "center", marginBottom: 4, fontWeight: "bold" }}>
          
        </Typography>

        <Box>
          <Typography variant="h6" sx={{ marginBottom: 2, fontWeight: "bold" }}>
            
          </Typography>
          <Divider sx={{ marginBottom: 4 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Project Name "
                value={formData.project_name}
                onChange={(e) => handleChange("project_name", e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Project Type "
                select
                value={formData.project_type}
                onChange={(e) => handleChange("project_type", e.target.value)}
                fullWidth
                required
              >
                {projectTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="City "
                value={formData.project_location_city}
                onChange={(e) => handleChange("project_location_city", e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="State *"
                value={formData.project_location_state}
                onChange={(e) => handleChange("project_location_state", e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="GPS Location *"
                value={formData.project_location_gps}
                onChange={(e) => handleChange("project_location_gps", e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.start_date || ""}
                onChange={(e) => handleChange("start_date", e.target.value ? e.target.value : null)}
                fullWidth
              />
            </Grid>
            {/* <Grid item xs={12} sm={4}>
              <TextField
                label="Expected Completion Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.expected_completion_date || ""}
                onChange={(e) => handleChange("expected_completion_date", e.target.value ? e.target.value : null)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Actual Completion Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.actual_completion_date || ""}
                onChange={(e) => handleChange("actual_completion_date", e.target.value ? e.target.value : null)}
                fullWidth
              />
            </Grid> */}
            <Grid item xs={12} sm={4}>
              <TextField
                label="Project Status *"
                select
                value={formData.project_status}
                onChange={(e) => handleChange("project_status", e.target.value)}
                fullWidth
                required
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                                label="Total Budget *"
                                type="number"
                                value={formData.total_budget}
                                onChange={(e) => handleChange("total_budget", e.target.value)}
                                fullWidth
                                required
                              />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <TextField
                                label="Currency *"
                                select
                                value={formData.current_currency}
                                onChange={(e) => handleChange("current_currency", e.target.value)}
                                fullWidth
                                required
                              >
                                {currencies.map((currency) => (
                                  <MenuItem key={currency} value={currency}>
                                    {currency}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <TextField
                                label="Project Manager/Owner *"
                                value={formData.project_manager}
                                onChange={(e) => handleChange("project_manager", e.target.value)}
                                fullWidth
                                required
                              />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <TextField
                                label="Dimensions of Project"
                                value={formData.dimensions}
                                onChange={(e) => handleChange("dimensions", e.target.value)}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <Button
                                variant="contained"
                                component="label"
                                startIcon={<UploadFileIcon />}
                                fullWidth
                              >
                                Upload Documents
                                <input
                                  type="file"
                                  hidden
                                  multiple
                                  onChange={(e) => handleChange("documents", e.target.files)}
                                />
                              </Button>
                            </Grid>
                          </Grid>
                        </Box>
                
                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{ marginTop: 4, justifyContent: "center" }}
                        >
                          <Button
                            variant="outlined"
                            color="secondary"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSave}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? <CircularProgress size={24} /> : "Save Details"}
                          </Button>
                        </Stack>
                      </Card>
                    </Container>
                  );
                };
                
				export default ProjectForm;