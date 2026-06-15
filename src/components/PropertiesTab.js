import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  CircularProgress,
  Chip,
  Divider,
  Button,
  Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const PropertiesTab = ({ projectId }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null); // Selected property for PIP
  const [loadingDetails, setLoadingDetails] = useState(false); // Loading state for PIP

  useEffect(() => {
    // Fetch all properties for the project
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
      if (!response.ok) {
        throw new Error("Failed to fetch property details.");
      }
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
    <Paper
      elevation={3}
      style={{
        padding: "20px",
        borderRadius: "10px",
        backgroundColor: "#f9fafb",
        marginBottom: "20px",
      }}
    >
      <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "15px" }}>
        Project Properties
      </Typography>
      <Divider style={{ marginBottom: "15px" }} />
      {properties.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Size</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Manager</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.id} style={{ cursor: "pointer" }}>
                  <TableCell>{property.name}</TableCell>
                  <TableCell>{property.type}</TableCell>
                  <TableCell>{property.size} sqft</TableCell>
                  <TableCell>
                    <Chip
                      label={property.status}
                      style={{
                        backgroundColor:
                          property.status === "Available"
                            ? "#4caf50"
                            : property.status === "Unavailable"
                            ? "#f44336"
                            : "#ff9800", // Default: Orange
                        color: "white",
                      }}
                    />
                  </TableCell>
                  <TableCell>{property.manager}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handlePropertyClick(property.id)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography>No properties available</Typography>
      )}

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
              <Button onClick={handleClosePip}>
                <CloseIcon />
              </Button>
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
          </Box>
        ) : (
          <Typography variant="body1" style={{ padding: "20px" }}>
            Property not found.
          </Typography>
        )}
      </Dialog>
    </Paper>
  );
};

export default PropertiesTab;