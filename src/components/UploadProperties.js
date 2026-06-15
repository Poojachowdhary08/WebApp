import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

const UploadProperties = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage("Please select a file to upload.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/upload-properties/", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setSuccessMessage(result.message);
        setDialogOpen(true);
      } else {
        const error = await response.json();
        setErrorMessage(error.detail);
      }
    } catch (error) {
      setErrorMessage("An error occurred while uploading the file.");
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={4}
      border="1px solid #ccc"
      borderRadius="8px"
    >
      <Typography variant="h5" gutterBottom>
        Upload Property Data
      </Typography>

      <input
        type="file"
        accept=".xlsx"
        onChange={handleFileChange}
        style={{ marginBottom: "20px" }}
      />

      <Button
        variant="contained"
        color="primary"
        onClick={handleUpload}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : "Upload"}
      </Button>

      {successMessage && (
        <Alert severity="success" style={{ marginTop: "20px" }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" style={{ marginTop: "20px" }}>
          {errorMessage}
        </Alert>
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Upload Successful"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            The property data has been successfully uploaded.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary" autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UploadProperties;