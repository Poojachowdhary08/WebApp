import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  Divider,
  MenuItem,
  IconButton,
  CircularProgress,
  Stack,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  useTheme,
  Chip,
  useMediaQuery,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";

const statuses = ["Planning", "In Progress", "Completed"];
const projectTypes = ["Residential", "Commercial", "Industrial", "Mixed Use"];
const currencies = ["Rupee", "Dollar"];

const ProjectForm = ({ onCancel, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const initialFormData = {
    project_name: "",
    project_type: "",
    project_location_city: "",
    project_location_state: "",
    project_location_gps: "",
    start_date: "",
    project_status: "Planning",
    total_budget: "",
    current_currency: "Rupee",
    project_manager: "",
    dimensions: "",
    documents: [],
  };

  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    setFormData({ ...initialFormData });
    setSelectedFiles([]);
    onCancel ? onCancel() : onClose();
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "documents") {
          value.forEach((file) => formDataToSend.append("documents", file));
        } else {
          formDataToSend.append(key, value);
        }
      });

      const response = await fetch("http://localhost:8080/projects_m", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error(`Failed to save project: ${response.statusText}`);
      }

      setDialogMessage("Project details saved successfully!");
      setDialogOpen(true);
    } catch (error) {
      console.error("Error saving project:", error);
      setDialogMessage("Failed to save project details. Please try again.");
      setDialogOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    handleCancel();
  };

  return (
    <Container maxWidth="md" sx={{ py: isMobile ? 2 : 4, position: "relative" }}>
    {/* Header row with title and red outlined "X Close" button */}
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      mb={2}
      sx={{ position: "sticky", top: 0, background: "#fff", zIndex: 1, py: 1 }}
    >
      <Typography variant="h4" sx={{ fontWeight: 400 ,marginLeft:"300px"}}>
        Add Project
      </Typography>

      <Button
        variant="outlined"
        onClick={onClose}
        sx={{
          borderWidth: 2,
          borderColor: "error.main",
          color: "error.main",
          textTransform: "none",
          fontWeight: 600,
          px: 2.2,
          "&:hover": {
            borderColor: "error.dark",
            bgcolor: "rgba(211,47,47,0.06)",
          },
        }}
      >
        X Close
      </Button>
    </Box>

    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={isMobile ? 2 : 3}>
      {/* Text Inputs */}
      {[
        { label: "Project Name", field: "project_name", type: "text" },
        { label: "City", field: "project_location_city", type: "text" },
        { label: "State", field: "project_location_state", type: "text" },
        { label: "GPS Location (lat,lng)", field: "project_location_gps", type: "text" },
        { label: "Total Budget", field: "total_budget", type: "number" },
        { label: "Project Manager / Owner", field: "project_manager", type: "text" },
        { label: "Dimensions of Project", field: "dimensions", type: "text" },
      ].map(({ label, field, type }) => (
        <Grid item xs={12} sm={4} key={field}>
          <TextField
            label={label}
            type={type }
            value={(formData )[field]}
            onChange={(e) => handleChange(field, e.target.value)}
            fullWidth
            required
            helperText={[field] ?? " "}
          />
        </Grid>
      ))}

      {/* Dropdowns */}
      <Grid item xs={12} sm={4}>
        <TextField
          label="Project Type"
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
          label="Project Status"
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
          label="Currency"
          select
          value={formData.current_currency}
          onChange={(e) => handleChange("current_currency", e.target.value)}
          fullWidth
          required
          helperText="Used with Total Budget"
        >
          {currencies.map((currency) => (
            <MenuItem key={currency} value={currency}>
              {currency}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      {/* Start Date */}
      <Grid item xs={12} sm={4}>
        <TextField
          label="Start Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={formData.start_date}
          onChange={(e) => handleChange("start_date", e.target.value)}
          fullWidth
        />
      </Grid>

      {/* File Upload - Dotted "Browse" zone */}
      <Grid item xs={12}>
        <Box
          component="label"
          htmlFor="project-docs"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            border: "2px dashed",
            borderColor: "grey.500",
            borderRadius: 2,
            py: 4,
            px: 1,
            textAlign: "center",
            cursor: "pointer",
            bgcolor: "#fafafa",
            "&:hover": { bgcolor: "#f5f5f5" },
          }}
        >
          <UploadFileIcon sx={{ fontSize: 36, mb: 1 }} />
          <Typography variant="body1" sx={{ mb: 0.5 }}>
           <strong>Browse</strong>
          </Typography>
     

          <input
            id="project-docs"
            type="file"
            hidden
            multiple
            onChange={(e) => {
              if (e.target.files);
            }}
          />
        </Box>

        {/* Selected files as chips */}
        {selectedFiles.length > 0 && (
          <Box mt={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {selectedFiles.map((file, index) => (
                <Chip
                  key={`${file.name}-${index}`}
                  label={`${file.name} • ${(file.size)}`}
                  onDelete={() => (index)}
                  sx={{ mb: 1, maxWidth: "100%" }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Grid>

      {/* Action Buttons */}
      <Grid item xs={12}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ justifyContent: "center", mt: 2, mb: 5 }}
        >


          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={isSubmitting}
            sx={{ minWidth: 160, textTransform: "none", fontWeight: 600 }}
          >
            {isSubmitting ? <CircularProgress size={22} /> : "Save Details"}
          </Button>
        </Stack>
      </Grid>
    </Grid>

    {/* Dialog for submission result */}
    <Dialog open={dialogOpen} onClose={handleDialogClose}>
      <DialogTitle>Project Status</DialogTitle>
      <DialogContent>
        <DialogContentText>{dialogMessage}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} color="primary" autoFocus>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  </Container>
  );
};

export default ProjectForm;