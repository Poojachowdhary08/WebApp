import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Dialog,
  CircularProgress,
  Grid,
  Button,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { API_BASE } from "../config";

const ProjectProperties = ({ projectId }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null); // For the PIP screen
  const [loadingDetails, setLoadingDetails] = useState(false); // For the PIP screen
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch(`${API_BASE}/projects_m/${projectId}/properties`);
        const data = await response.json();
        setProperties(data.properties || []);
      } catch (error) {
        console.error("Error fetching properties:", error);
      }
    };

    fetchProperties();
  }, [projectId]);

  const handlePropertyClick = async (propertyId) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`${API_BASE}/properties/${propertyId}`);
      const data = await response.json();
      setSelectedProperty(data.property || null);
    } catch (error) {
      console.error("Error fetching property details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleClosePip = () => {
    setSelectedProperty(null);
  };

  return (
    <Box display="flex" height="100%">
      {/* Sidebar for Property List */}
      <Box width="30%" paddingRight={2}>
        <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "10px" }}>
          Properties
        </Typography>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search Properties..."
          style={{ width: "100%", marginBottom: "15px" }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            endAdornment: (
              <IconButton>
                <SearchIcon />
              </IconButton>
            ),
          }}
        />
        {properties
          .filter((property) =>
            property.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((property) => (
            <Paper
              key={property.id}
              elevation={2}
              style={{
                padding: "15px",
                marginBottom: "15px",
                borderLeft: `5px solid ${
                  property.status === "Available" ? "#4caf50" : "#f44336"
                }`,
                cursor: "pointer",
              }}
              onClick={() => handlePropertyClick(property.id)}
            >
              <Typography variant="subtitle1" style={{ fontWeight: "bold" }}>
                {property.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Type: {property.type}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Status: {property.status}
              </Typography>
            </Paper>
          ))}
      </Box>

      {/* PIP Screen for Property Details */}
      <Dialog open={!!selectedProperty} onClose={handleClosePip} fullWidth maxWidth="sm">
        {loadingDetails ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <CircularProgress />
          </Box>
        ) : selectedProperty ? (
          <Box padding={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" style={{ fontWeight: "bold" }}>
                {selectedProperty.name} Details
              </Typography>
              <IconButton onClick={handleClosePip}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider style={{ margin: "20px 0" }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body1">
                  <strong>Type:</strong> {selectedProperty.type}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body1">
                  <strong>Status:</strong> {selectedProperty.status}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body1">
                  <strong>Size:</strong> {selectedProperty.size} sqft
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body1">
                  <strong>Manager:</strong> {selectedProperty.manager}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Description:</strong> {selectedProperty.description || "N/A"}
                </Typography>
              </Grid>
            </Grid>
            <Box textAlign="right" marginTop={3}>
              <Button
                variant="contained"
                onClick={handleClosePip}
                style={{ backgroundColor: "#2a3663", color: "white" }}
              >
                Close
              </Button>
            </Box>
          </Box>
        ) : (
          <Typography variant="body1" style={{ padding: "20px" }}>
            Property not found.
          </Typography>
        )}
      </Dialog>
    </Box>
  );
};

export default ProjectProperties;
