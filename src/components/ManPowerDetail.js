import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Box,
  Avatar,
  Divider,
  CircularProgress,
  Button,
  Grid,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import LaborOnboardingForm from "./LaborOnboardingForm";
import ContractorOnboardingForm from "./ContractorOnboardingForm";

const ManpowerDetails = ({ open, onClose, id, type }) => {
  console.log("Received Props:", { id, type });

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!id || !type) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError("");

      const apiUrl =
        type === "CONTRACTOR"
          ? `http://localhost:8080/contractors_l/${id}`
          : `http://localhost:8080/labors/${id}`;

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to fetch details");

        let data = await response.json();

        if (
          type === "CONTRACTOR" &&
          typeof data === "object" &&
          !Array.isArray(data)
        ) {
          data = {
            ...data,
            contractors: Array.isArray(data.contractors)
              ? data.contractors
              : [],
          };
        }

        if (type === "LABOR" && Array.isArray(data) && data.length > 0) {
          data = data[0];
        }

        setDetails(data);
      } catch (err) {
        setError(err.message || "Error fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, type]);

  const {
    profilePicture = "",
    name = "",
    contractor_name = "",
    labor_name = "",
    work_type = "",
    contract_type = "",
    number = "",
    contractor_phone = "",
    labor_phone = "",
    status = "Unknown",
    contract_payment_type = "",
    payment_type = "",
  } = details || {};

  const displayName = name || contractor_name || labor_name || "N/A";
  const displayPhone = number || contractor_phone || labor_phone || "N/A";
  const displayWorkType = work_type || contract_type || "N/A";
  const displayPaymentType = contract_payment_type || payment_type || "Unknown";

  const handleEdit = () => setEditMode(true);
  const handleCloseEdit = () => setEditMode(false);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth={false} // Keeps full width
        PaperProps={{
          sx: {
            height: "90vh",
            marginTop: "100px", // Adds top margin
            marginX: "10px", // Light margin on sides
            width: "calc(100% - 30px)", // Adjust width to maintain margins
            borderRadius: 3, // Slight rounded corners for smooth UI
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 3,
            pt: 2,
          }}
        >
          <Typography variant="h6" fontWeight="bold" color="#2A3663">
            {type === "LABOR" ? "Labor Details" : "Contractor Details"}
          </Typography>
          <Box>
            <IconButton onClick={handleEdit} sx={{ color: "#2A3663", mr: 1 }}>
              <EditIcon />
            </IconButton>
            <IconButton onClick={onClose} sx={{ color: "gray" }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ px: 4, py: 3 }}>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 200,
              }}
            >
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : details ? (
            <>
              {/* Details Section */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 4 }}>
                {/* Header */}
                <Box textAlign="center" mb={2}>
                  <Typography variant="h5" fontWeight="bold">
                    {displayName}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {displayWorkType}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Info Grid */}
                <Grid container spacing={4}>
                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center">
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        sx={{ mr: 1 }}
                      >
                        Phone:
                      </Typography>
                      <Typography variant="body1">{displayPhone}</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center">
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        sx={{ mr: 1 }}
                      >
                        Status:
                      </Typography>
                      <Typography variant="body1">{status}</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center">
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        sx={{ mr: 1 }}
                      >
                        Payment Type:
                      </Typography>
                      <Typography variant="body1">
                        {displayPaymentType}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Assigned Project History */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color="#2A3663"
                  gutterBottom
                >
                  Assigned Project History
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  No project history found.
                </Typography>
              </Paper>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog open={editMode} onClose={handleCloseEdit} fullWidth maxWidth="md">
        <DialogTitle />
        <DialogContent>
          {type === "LABOR" ? (
            <LaborOnboardingForm
              onClose={handleCloseEdit}
              existingData={details}
            />
          ) : (
            <ContractorOnboardingForm
              onClose={handleCloseEdit}
              existingData={details}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManpowerDetails;