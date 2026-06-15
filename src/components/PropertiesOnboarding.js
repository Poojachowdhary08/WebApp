import React, { useState, useEffect } from "react";
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
  DialogContent,
  DialogTitle,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

const PropertiesOnboarding = () => {
  const [properties, setProperties] = useState([]); // Properties list
  const [currentPage, setCurrentPage] = useState(0); // Current page for pagination
  const [rowsPerPage, setRowsPerPage] = useState(10); // Rows per page
  const [openDialog, setOpenDialog] = useState(false); // Dialog state
  const [selectedProperty, setSelectedProperty] = useState(null); // Selected property for viewing/editing
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const handleViewProperties = (projectId) => {
    setSelectedProjectId(projectId); // Set the selected project ID
  };

  const handleClosePropertiesDialog = () => {
    setSelectedProjectId(null); // Clear the selected project ID
  };

  // Fetch properties from the backend
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch("http://localhost:8080/properties_m"); // Replace with your API URL
        const data = await response.json();
        if (Array.isArray(data)) {
          setProperties(data);
        } else {
          console.error("Unexpected response format:", data);
        }
      } catch (error) {
        console.error("Error fetching properties:", error);
      }
    };
    fetchProperties();
  }, []);

  // Pagination handlers
  const handleChangePage = (event, newPage) => setCurrentPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  // Dialog open and close handlers
  const handleOpenDialog = (property) => {
    setSelectedProperty(property);
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setSelectedProperty(null);
    setOpenDialog(false);
  };

  // Paginated data
  const paginatedProperties = properties.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" mb={0} marginTop={-40}>
        <Typography variant="h4"></Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog(null)}
          sx={{
            backgroundColor: "#2A3663",
            "&:hover": { backgroundColor: "#1E2A48" }
          }}
        
        >
          Add New Property
        </Button>
      </Box>

      {/* Properties Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#2A3663" }}>
              <TableCell sx={{ color: "white" }}>ID</TableCell>
              <TableCell sx={{ color: "white" }}>Project Code</TableCell>
              <TableCell sx={{ color: "white" }}>Name</TableCell>
              <TableCell sx={{ color: "white" }}>Type</TableCell>
              <TableCell sx={{ color: "white" }}>Building Type</TableCell>
              <TableCell sx={{ color: "white" }}>Budget</TableCell>
              <TableCell sx={{ color: "white" }}>Spent</TableCell>
              <TableCell sx={{ color: "white" }}>Status</TableCell>
              <TableCell sx={{ color: "white" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedProperties.map((property) => (
              <TableRow key={property.propertyid}>
                <TableCell>{property.propertyid}</TableCell>
                <TableCell>{property.projectid}</TableCell>
                <TableCell>{property.name}</TableCell>
                <TableCell>{property.type}</TableCell>
                <TableCell>{property.building_type}</TableCell>
                <TableCell>{property.budget}</TableCell>
                <TableCell>{property.spent}</TableCell>
                <TableCell>{property.status}</TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    onClick={() => handleOpenDialog(property)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={properties.length}
          page={currentPage}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Dialog for Viewing/Editing */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedProperty ? `Property Details - ${selectedProperty.name}` : "Add New Property"}
        </DialogTitle>
        <DialogContent>
          {selectedProperty ? (
            <Box>
              <Typography variant="body1">ID: {selectedProperty.property_id}</Typography>
              <Typography variant="body1">Project Code: {selectedProperty.project_code}</Typography>
              <Typography variant="body1">Name: {selectedProperty.name}</Typography>
              <Typography variant="body1">Type: {selectedProperty.type}</Typography>
              <Typography variant="body1">Building Type: {selectedProperty.building_type}</Typography>
              <Typography variant="body1">Budget: {selectedProperty.budget}</Typography>
              <Typography variant="body1">Spent: {selectedProperty.spent}</Typography>
              <Typography variant="body1">Status: {selectedProperty.status}</Typography>
              <Typography variant="body1">Remarks: {selectedProperty.remarks}</Typography>
            </Box>
          ) : (
            <Typography>Form for adding a new property goes here.</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PropertiesOnboarding;