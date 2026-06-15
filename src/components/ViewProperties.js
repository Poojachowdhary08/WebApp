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
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AddIcon from "@mui/icons-material/Add";

const ViewProperties = ({ project, onBack }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");

  // Fetch property details from API
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://localhost:8080/projects_m/${project.project_id}/properties`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch properties");
        }

        const data = await response.json();
        setProperties(data.properties || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [project.project_id]);

  const handleUploadExcel = () => {
    setUploadOpen(true);
  };

  const handleUploadClose = () => {
    setUploadOpen(false);
    setFile(null);
    setUploadMessage("");
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setUploadMessage("");
  };

  const handleUploadSubmit = async () => {
    if (!file) {
      setUploadMessage("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8080/upload-properties/", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadMessage(`Upload Successful: ${result.message}`);
      } else {
        const error = await response.json();
        setUploadMessage(`Error: ${error.detail}`);
      }
    } catch (err) {
      setUploadMessage("An error occurred while uploading the file.");
    }
  };

  return (
    <Box>
      {/* Title and Buttons */}
      <Box
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <Typography
          variant="h5"
          style={{
            fontWeight: "bold",
            color: "#2a3663",
          }}
        >
          Properties for {project.project_name}
        </Typography>
        <Box style={{ display: "flex", gap: "10px" }}>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={handleUploadExcel}
          >
            Upload Excel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => console.log("Add Property via form")}
          >
            Add Property via Form
          </Button>
          <Button
            variant="contained"
            onClick={onBack}
            style={{
              backgroundColor: "#ff4d4f",
              color: "white",
            }}
          >
            Back
          </Button>
        </Box>
      </Box>

      {/* Property Table or Error Handling */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" align="center">
          {error}
        </Typography>
      ) : properties.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            {/* Table Head */}
            <TableHead style={{ backgroundColor: "#2a3663" }}>
              <TableRow>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Property ID</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Name</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Type</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Subtype</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Budget</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Used Budget</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Dimensions</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Start Date</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Deadline</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Construction Phases</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Assigned Employee</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Status</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Remarks</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Documents</TableCell>
                <TableCell style={{ color: "white", fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            {/* Table Body */}
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.propertyid}>
                  <TableCell>{property.propertyid}</TableCell>
                  <TableCell>{property.name}</TableCell>
                  <TableCell>{property.type}</TableCell>
                  <TableCell>{property.subtype}</TableCell>
                  <TableCell>{property.budget}</TableCell>
                  <TableCell>{property.usedbudget}</TableCell>
                  <TableCell>{property.dimensions}</TableCell>
                  <TableCell>{property.startdate}</TableCell>
                  <TableCell>{property.deadline}</TableCell>
                  <TableCell>{property.constructionphases}</TableCell>
                  <TableCell>{property.assignedemployee}</TableCell>
                  <TableCell>{property.status}</TableCell>
                  <TableCell>{property.remarks}</TableCell>
                  <TableCell>{property.documents?.join(", ")}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      onClick={() => console.log(`View Details for ${property.propertyid}`)}
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
        <Typography align="center" style={{ marginTop: "20px" }}>
          No Properties Found
        </Typography>
      )}

      {/* Dialog for Upload */}
      <Dialog
        open={uploadOpen}
        onClose={handleUploadClose}
        aria-labelledby="upload-dialog-title"
      >
        <DialogTitle id="upload-dialog-title">{"Upload Excel File"}</DialogTitle>
        <DialogContent>
          <Typography>Choose a file to upload:</Typography>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            style={{ marginTop: "10px" }}
          />
          {uploadMessage && (
            <Typography color="error" style={{ marginTop: "10px" }}>
              {uploadMessage}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUploadClose} color="secondary">
            Cancel
          </Button>
          <Button color="primary" variant="contained" onClick={handleUploadSubmit}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewProperties;