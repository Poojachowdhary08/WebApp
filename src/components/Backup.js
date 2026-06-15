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
  DialogTitle,
  DialogContent,
  CircularProgress,
  Alert,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ContractorOnboardingForm from "./ContractorOnboardingForm";
const ContractorOnboarding = () => {
  const [contractors, setContractors] = useState([]); // List of contractors
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openFormDialog, setOpenFormDialog] = useState(false); // Controls the form dialog
  const [selectedContractor, setSelectedContractor] = useState(null); // Contractor details
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false); // Loading for contractor details
  const [detailsError, setDetailsError] = useState(""); // Error for contractor details

  // Fetch contractors on component mount
  useEffect(() => {
    const fetchContractors = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:8080/contractors"); // Adjust API URL
        if (!response.ok) {
          throw new Error("Failed to fetch contractors");
        }
        const data = await response.json();
        setContractors(data.contractors || []);
        setLoading(false);
      } catch (err) {
        setError(err.message || "An unexpected error occurred");
        setLoading(false);
      }
    };

    fetchContractors();
  }, []);

  const handleAddContractor = () => {
    setOpenFormDialog(true); // Open the form dialog
  };

  const handleFormCancel = () => {
    setOpenFormDialog(false); // Close the form dialog
  };

  const handleFormSave = async (newContractor) => {
    try {
      const response = await fetch("http://localhost:8080/contractors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newContractor),
      });

      if (!response.ok) {
        throw new Error("Failed to add contractor");
      }

      const savedContractor = await response.json();
      setContractors((prev) => [...prev, savedContractor.contractor]); // Update the list
      setOpenFormDialog(false); // Close the dialog
    } catch (err) {
      alert(err.message || "Failed to save contractor");
    }
  };

  const fetchContractorDetails = async (contractorId) => {
    try {
      setDetailsLoading(true);
      setDetailsError("");
      const response = await fetch(
        `http://localhost:8080/contractors/${contractorId}` // Replace with your API endpoint
      );
      if (!response.ok) {
        throw new Error("Failed to fetch contractor details");
      }
      const data = await response.json();
      setSelectedContractor(data.contractor);
      setDetailsLoading(false);
    } catch (err) {
      setDetailsError(err.message || "Failed to load contractor details");
      setDetailsLoading(false);
    }
  };

  const handleContractorClick = (contractorId) => {
    fetchContractorDetails(contractorId);
  };

  const handleCloseDetailsDialog = () => {
    setSelectedContractor(null);
  };

  const paginatedContractors = contractors.slice(
    currentPage * itemsPerPage,
    currentPage * itemsPerPage + itemsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          Contractor Onboarding
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddContractor}
          sx={{
            backgroundColor: "#2A3663",
            "&:hover": { backgroundColor: "#1E2A48" },
          }}
        >
          Add Contractor
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
                <TableCell sx={{ color: "white" }}>Type of Contract</TableCell>
                <TableCell sx={{ color: "white" }}>Assigned Project</TableCell>
                <TableCell sx={{ color: "white" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedContractors.map((contractor) => (
                <TableRow key={contractor.contractor_id}>
                  <TableCell>
                    <Button
                      variant="text"
                      color="primary"
                      onClick={() => handleContractorClick(contractor.contractor_id)}
                    >
                      {contractor.contractor_id}
                    </Button>
                  </TableCell>
                  <TableCell>{contractor.contractor_name}</TableCell>
                  <TableCell>{contractor.contractor_phone}</TableCell>
                  <TableCell>{contractor.contract_type}</TableCell>
                  <TableCell>
                    {contractor.contract_assigned_project || "Not Assigned"}
                  </TableCell>
                  <TableCell>
                    <Button variant="outlined" size="small" color="primary">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            count={contractors.length}
            page={currentPage}
            onPageChange={handleChangePage}
            rowsPerPage={itemsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}
      {selectedContractor && (
  <Dialog
    open={!!selectedContractor}
    onClose={handleCloseDetailsDialog}
    maxWidth="md"
    fullWidth
  >
    <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663" }}>
        Contractor Details
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
          {/* Grid System */}
          <Grid container spacing={3}>
            {/* Profile Section */}
            <Grid item xs={12} sm={12} md={12}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  padding: 2,
                  backgroundColor: "#E8EAF6",
                  borderRadius: 2,
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
                  {selectedContractor.contractor_name.charAt(0)}
                </Box>
                <Box sx={{ ml: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: "bold", color: "#2A3663" }}>
                    {selectedContractor.contractor_name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "gray" }}>
                    ID: {selectedContractor.contractor_id}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Contact Information */}
            <Grid item xs={12} sm={6}>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", mb: 1 }}>
                Contact Information
              </Typography>
              <Typography><strong>Phone:</strong> {selectedContractor.contractor_phone}</Typography>
              <Typography><strong>Type of Contract:</strong> {selectedContractor.contract_type}</Typography>
            </Grid>

            {/* Project Details */}
            <Grid item xs={12} sm={6}>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", mb: 1 }}>
                Project Details
              </Typography>
              <Typography>
                <strong>Assigned Project:</strong>{" "}
                {selectedContractor.contract_assigned_project || "Not Assigned"}
              </Typography>
              <Typography><strong>Payment Type:</strong> {selectedContractor.contract_payment_type}</Typography>
            </Grid>

            {/* Documents */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", mb: 1 }}>
                Documents
              </Typography>
              <Typography>
                <strong>Aadhaar File:</strong>{" "}
                <a
                  href={selectedContractor.aadhaar_file_url}
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
                  href={selectedContractor.pancard_file_url}
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
                  href={selectedContractor.contractor_bond_file_url}
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
              <Typography><strong>Total Labour Count:</strong> {selectedContractor.total_labour_count}</Typography>
              <Typography><strong>Total Labour Hours:</strong> {selectedContractor.total_labour_hours}</Typography>
              <Typography>
                <strong>Total Labour SqFt Completed:</strong>{" "}
                {selectedContractor.total_labour_sqft_completed}
              </Typography>
            </Grid>

            {/* Meta Details */}
            <Grid item xs={12} sm={6}>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", mb: 1 }}>
                Metadata
              </Typography>
              <Typography><strong>Created By:</strong> {selectedContractor.created_by}</Typography>
              <Typography><strong>Modified By:</strong> {selectedContractor.modified_by}</Typography>
              <Typography>
                <strong>Created At:</strong> {new Date(selectedContractor.created_at).toLocaleString()}
              </Typography>
              <Typography>
                <strong>Modified At:</strong> {new Date(selectedContractor.modified_at).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}
    </DialogContent>
  </Dialog>
)}


      {/* Add Contractor Form Dialog */}
      <Dialog open={openFormDialog} onClose={handleFormCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Contractor</DialogTitle>
        <DialogContent>
          <ContractorOnboardingForm onSave={handleFormSave} onCancel={handleFormCancel} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ContractorOnboarding;