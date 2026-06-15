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
  CircularProgress,
  Alert,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import LaborOnboardingForm from "./LaborOnboardingForm";

const LaborOnboarding = () => {
  const [labors, setLabors] = useState([]); // List of labors
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openFormDialog, setOpenFormDialog] = useState(false); // Form dialog state for Add/Edit
  const [editingLabor, setEditingLabor] = useState(null); // Labor being edited
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(""); // Error state
  const [selectedLabor, setSelectedLabor] = useState(null); // Stores labor details
  const [detailsLoading, setDetailsLoading] = useState(false); // Loading state for labor details
  const [detailsError, setDetailsError] = useState(""); // Error state for labor details


  // Fetch all labors from the backend
  const fetchLabors = async () => {
    try {
      const response = await fetch("http://localhost:8080/labors"); // Replace with your API endpoint
      if (!response.ok) {
        throw new Error("Failed to fetch labor data");
      }
      const data = await response.json();
      setLabors(data);
      setLoading(false);
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabors();
  }, []);
  const fetchLaborDetails = async (laborId) => {
    try {
      setDetailsLoading(true);
      const response = await fetch(`http://localhost:8080/labors/${laborId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch labor details");
      }
      const data = await response.json();
      setSelectedLabor(data);
      setDetailsLoading(false);
    } catch (err) {
      console.error(err);
      setDetailsError(err.message || "Failed to load labor details");
      setDetailsLoading(false);
    }
  };
  
  const handleLaborClick = (laborId) => {
    fetchLaborDetails(laborId);
  };
  
  const handleCloseDetailsDialog = () => {
    setSelectedLabor(null);
  };
  
  
  // Open Add/Edit Form Dialog
  const handleOpenFormDialog = (labor = null) => {
    setEditingLabor(labor); // Set the labor to edit or null for adding
    setOpenFormDialog(true);
  };

  // Close the Form Dialog
  const handleCloseFormDialog = () => {
    setEditingLabor(null); // Clear the editing state
    setOpenFormDialog(false);
  };

  // Handle Add or Edit submission
  const handleSubmit = async (laborData) => {
    try {
      if (editingLabor) {
        // Update labor
        const response = await fetch(
          `http://localhost:8080/labors/${editingLabor.labor_id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(laborData),
          }
        );
        if (!response.ok) {
          throw new Error("Failed to update labor");
        }
        setLabors((prevLabors) =>
          prevLabors.map((labor) =>
            labor.labor_id === editingLabor.labor_id ? { ...labor, ...laborData } : labor
          )
        );
      } else {
        // Add new labor
        const response = await fetch("http://localhost:8080/labors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(laborData),
        });
        if (!response.ok) {
          throw new Error("Failed to add new labor");
        }
        const newLabor = await response.json();
        setLabors((prevLabors) => [...prevLabors, newLabor]);
      }
      handleCloseFormDialog(); // Close dialog after successful submission
      fetchLabors(); // Refresh data
    } catch (err) {
      console.error(err);
    }
  };

  
  // Pagination handlers
  const handleChangePage = (event, newPage) => setCurrentPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  // Paginated list of labors
  const paginatedLabors = labors.slice(
    currentPage * itemsPerPage,
    currentPage * itemsPerPage + itemsPerPage
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
        
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenFormDialog()}
          sx={{
            backgroundColor: "#2A3663",
            "&:hover": { backgroundColor: "#1E2A48" },
          }}
        >
          Add Labor
        </Button>
      </Box>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#2A3663" }}>
              <TableRow>
                <TableCell sx={{ color: "white" }}>ID</TableCell>
                <TableCell sx={{ color: "white" }}>Name</TableCell>
                <TableCell sx={{ color: "white" }}>Phone</TableCell>
                <TableCell sx={{ color: "white" }}>Work Type</TableCell>
                <TableCell sx={{ color: "white" }}>Payment Type</TableCell>
                <TableCell sx={{ color: "white" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLabors.map((labor) => (
                <TableRow key={labor.labor_id}>
                  <TableCell>
        <Button
          variant="text"
          color="primary"
          onClick={() => handleLaborClick(labor.labor_id)}
          sx={{
            textTransform: "none",
            fontWeight: "bold",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {labor.labor_id}
        </Button>
      </TableCell>
                  <TableCell>{labor.labor_name}</TableCell>
                  <TableCell>{labor.labor_phone}</TableCell>
                  <TableCell>{labor.work_type}</TableCell>
                  <TableCell>{labor.payment_type}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenFormDialog(labor)}
                      sx={{ mr: 1, backgroundColor: "primary", color: "white" }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={labors.length}
            page={currentPage}
            onPageChange={handleChangePage}
            rowsPerPage={itemsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}
      {selectedLabor && (
  <Dialog
  open={!!selectedLabor}
  onClose={handleCloseDetailsDialog}
  maxWidth="md"
  fullWidth
>
  <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663" }}>
      Labor Details
    </Typography>
    <Button
      onClick={handleCloseDetailsDialog}
      variant="text"
      sx={{
        color: "#2A3663",
        fontWeight: "bold",
        "&:hover": { color: "#1E2A48" },
      }}
    >
      Close
    </Button>
  </DialogTitle>
  <DialogContent>
    {detailsLoading ? (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <CircularProgress />
      </Box>
    ) : detailsError ? (
      <Alert severity="error">{detailsError}</Alert>
    ) : (
      <Box sx={{ padding: 3, backgroundColor: "#F9FAFB", borderRadius: 2 }}>
        {/* Profile Section */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            padding: 2,
            backgroundColor: "#E8EAF6",
            borderRadius: 2,
            mb: 3,
          }}
        >
          <Box
            sx={{
              backgroundColor: "#2A3663",
              color: "white",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 24,
              fontWeight: "bold",
            }}
          >
            {selectedLabor.labor_name.charAt(0)}
          </Box>
          <Box sx={{ ml: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: "bold", color: "#2A3663" }}>
              {selectedLabor.labor_name}
            </Typography>
            <Typography variant="body2" sx={{ color: "gray" }}>
              ID: {selectedLabor.labor_id}
            </Typography>
          </Box>
        </Box>

        {/* Grid Layout */}
        <Grid container spacing={3}>
          {/* Contact Information */}
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", mb: 1 }}>
              Contact Information
            </Typography>
            <Typography><strong>Phone:</strong> {selectedLabor.labor_phone}</Typography>
            <Typography><strong>Type of Contract:</strong> {selectedLabor.labor_contract_type}</Typography>
          </Grid>

          {/* Project Details */}
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", mb: 1 }}>
              Project Details
            </Typography>
            <Typography>
              <strong>Assigned Project:</strong>{" "}
              {selectedLabor.assigned_project || "Not Assigned"}
            </Typography>
            <Typography><strong>Payment Type:</strong> {selectedLabor.payment_type}</Typography>
          </Grid>

          {/* Documents */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", mb: 1 }}>
              Documents
            </Typography>
            <Typography>
              <strong>Aadhaar File:</strong>{" "}
              <a
                href={selectedLabor.aadhaar_file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1976D2" }}
              >
                View Aadhaar File
              </a>
            </Typography>
            <Typography>
              <strong>PAN Card File:</strong>{" "}
              <a
                href={selectedLabor.pancard_file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1976D2" }}
              >
                View PAN Card File
              </a>
            </Typography>
            <Typography>
              <strong>Bond File:</strong>{" "}
              <a
                href={selectedLabor.bond_file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1976D2" }}
              >
                View Bond File
              </a>
            </Typography>
          </Grid>

          {/* Performance Metrics */}
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", mb: 1 }}>
              Performance Metrics
            </Typography>
            
            <Typography><strong>Total Labor Hours:</strong> {selectedLabor.total_labor_hours}</Typography>
            <Typography>
              <strong>Total Labor SqFt Completed:</strong>{" "}
              {selectedLabor.total_labor_sqft_completed}
            </Typography>
          </Grid>

          {/* Metadata */}
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", mb: 1 }}>
              Metadata
            </Typography>
            <Typography><strong>Created By:</strong> {selectedLabor.created_by}</Typography>
            <Typography><strong>Modified By:</strong> {selectedLabor.modified_by}</Typography>
            <Typography>
              <strong>Created At:</strong> {new Date(selectedLabor.created_at).toLocaleString()}
            </Typography>
            <Typography>
              <strong>Modified At:</strong> {new Date(selectedLabor.modified_at).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    )}
  </DialogContent>
</Dialog>

)}



      {/* Add/Edit Labor Dialog */}
      {openFormDialog && (
        <Dialog open={openFormDialog} onClose={handleCloseFormDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingLabor ? "Edit Labor" : "Add Labor"}
          </DialogTitle>
          <DialogContent>
            <LaborOnboardingForm
              initialData={editingLabor} // Pass the selected labor for editing
              onSubmit={handleSubmit} // Handles both Add and Edit
              onCancel={handleCloseFormDialog}
            />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default LaborOnboarding;