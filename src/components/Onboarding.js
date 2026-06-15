import React, { useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Dialog,
  Button,
  LinearProgress,
  IconButton,
  CircularProgress,
  MenuItem,
  Grid,
  Select,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteIcon from "@mui/icons-material/Delete";
import ProjectOnboarding from "./ProjectOnboarding";
import Manpower from "./ManPower";
import VendorDetails from "./VendorDetails";
import BasicUOM from "./BasicUOM";
import CloseIcon from "@mui/icons-material/Close";
const Onboarding = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState("Project");
  const [openUpload, setOpenUpload] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [openAlert, setOpenAlert] = useState(false);
  const [open, setOpen] = useState(false);
  const showAlert = (message) => {
    setAlertMessage(message);
    setOpenAlert(true);
  };
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  const handleOpenUpload = () => setOpenUpload(true);
  const handleCloseUpload = () => {
    if (!loading) {
      setFiles([]);
      setUploadProgress({});
      setUploadErrors({});
      setOpenUpload(false);
    }
  };
  const handleClose = () => {
    console.log("Close button clicked!");
    setFiles([]);
    setUploadProgress({});
    setUploadErrors({});
    setSelectedType("");
    setFile(null);
    setOpenUpload(false);
  };
  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };
  const handleDragOver = (event) => {
    event.preventDefault();
  };
  const handleDrop = (event) => {
    event.preventDefault();
    const newFiles = Array.from(event.dataTransfer.files).map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
    }));
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };
  const handleRemoveFile = (fileId) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
    setUploadProgress((prevProgress) => {
      const updatedProgress = { ...prevProgress };
      delete updatedProgress[fileId];
      return updatedProgress;
    });
    setUploadErrors((prevErrors) => {
      const updatedErrors = { ...prevErrors };
      delete updatedErrors[fileId];
      return updatedErrors;
    });
  };
  const handleUpload = async () => {
    if (!selectedType) {
      showAlert("Please select a data type.");
      return;
    }
    if (!file) {
      showAlert("Please select a file to upload.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `http://localhost:8080/${selectedType.toLowerCase()}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const responseData = await response.json();
      console.log("Backend Response:", responseData); // Log for debugging

      if (!response.ok) {
        // Show only the extracted parameters from the backend response
        const errorMessage = responseData.details || "An error occurred. Please try again.";
        showAlert(`Error: ${errorMessage}`);
        return;
      }

      showAlert("File uploaded successfully!");
      setFile(null);
      setSelectedType("");
      setOpenUpload(false);

    } catch (error) {
      console.error("Upload error:", error);
      showAlert("Network error! Unable to connect to server.");
    } finally {
      setUploading(false);
    }
  };



  const renderTabContent = () => {
    switch (activeTab) {
      case "Project":
        return <ProjectOnboarding />;
      case "Manpower":
        return <Manpower />;
      case "Vendor":
        return <VendorDetails />;
      case "BasicUOM":
        return <BasicUOM />;
      default:
        return null;
    }
  };
  return (
    <Box sx={{ padding: 4, backgroundColor: "#F4F6F9", minHeight: "100vh" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: "#2C3E50",
            letterSpacing: "0.5px",
          }}
        >
          Onboarding
        </Typography>

        <Button
          variant="contained"
          sx={{
            backgroundColor: "#2a3663",
            color: "white",
            textTransform: "none",
            display: "flex",
            alignItems: "center",
            gap: 1,
            padding: "6px 12px",
          }}
          onClick={() => setOpenUpload(true)}
        >
          <CloudUploadIcon sx={{ fontSize: 24 }} />
          Upload Onboarding Excel
        </Button>
      </Box>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        textColor="primary"
        indicatorColor="primary"
        sx={{
          marginBottom: 3,
          marginLeft:-2,
          textTransform: "uppercase", 
          "& .MuiTab-root": {
            fontWeight: "500",
            textTransform: "none",
            fontSize: "16px",
          },
          "& .MuiTab-root:hover": {
            color: "#3498DB",
          },
          "& .Mui-selected": {
            color: "#2C3E50",
            fontWeight: "bold",
          },
        }}
      >
        <Tab label="PROJECT" value="Project" />
        <Tab label="MANPOWER" value="Manpower" />
        <Tab label="VENDOR" value="Vendor" />
        <Tab label="BASIC UOM" value="BasicUOM" />
      </Tabs>
      {/* Tab Content */}
      <Box>{renderTabContent()}</Box>
      <Dialog open={openUpload} onClose={() => setOpenUpload(false)}>
        <Box
          sx={{
            padding: 4,
            width: 500,
            backgroundColor: "#fff",
            borderRadius: 4,
            boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <Typography variant="h5" sx={{ marginBottom: 2, fontWeight: "bold" }}>
            Upload Files
          </Typography>
          <Button
  onClick={handleClose}
  variant="outlined"
  sx={{
    borderColor: "error.main",
    color: "error.main",
    borderWidth: 2,
    textTransform: "none",
    fontWeight: 600,
    position: "absolute",
    top: 16,
    right: 16,
    px: 2.25,
    py: 0.5,
    lineHeight: 1.4,
    borderRadius: "5px",
    "&:hover": { borderColor: "error.dark", bgcolor: "rgba(211,47,47,0.06)" },
  }}
>
  X Close
</Button>
          <Box
            sx={{
              border: "2px dashed #3498DB",
              borderRadius: 2,
              padding: 3,
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 3,
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Typography variant="body1">Drag and drop files here</Typography>
            <Typography variant="body2" sx={{ color: "#888" }}>
              or
            </Typography>
            <input
              type="file"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              id="fileInput"
            />
            <label htmlFor="fileInput">
              <Button variant="contained" component="span">
                Browse Files
              </Button>
            </label>
            {file && <Typography sx={{ marginTop: 1 }}>{file.name}</Typography>}
          </Box>
          <Select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            displayEmpty
            sx={{ width: "100%", marginBottom: 3 }}
          >
            <MenuItem value="" disabled>
              Select Data Type
            </MenuItem>
            <MenuItem value="Labor">Labor</MenuItem>
            <MenuItem value="Contractors">Contractors</MenuItem>
            <MenuItem value="Schedule">Schedule</MenuItem>
          </Select>
          <Box sx={{ maxHeight: 200, overflowY: "auto", marginBottom: 3 }}>
            {files.map((fileObj) => (
              <Box
                key={fileObj.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <InsertDriveFileIcon sx={{ color: "#3498DB" }} />
                  <Typography>{fileObj.name}</Typography>
                </Box>
                <Box sx={{ flex: 1, marginLeft: 2 }}>
                  {uploadErrors[fileObj.id] ? (
                    <Typography
                      variant="body2"
                      sx={{ color: "red", fontSize: "0.9rem" }}
                    >
                      {uploadErrors[fileObj.id]}
                    </Typography>
                  ) : (
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress[fileObj.id] || 0}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  )}
                </Box>
                <IconButton onClick={() => handleRemoveFile(fileObj.id)}>
                  <DeleteIcon color="error" />
                </IconButton>
              </Box>
            ))}
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={uploading || !file || !selectedType}
            fullWidth
          >
            {uploading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Upload"
            )}
          </Button>
        </Box>
      </Dialog>
      <Dialog open={openAlert} onClose={() => setOpenAlert(false)}>
        <Box sx={{ padding: 3, textAlign: "center" }}>
          <Typography>{alertMessage}</Typography>
          <DialogActions>
            <Button onClick={() => setOpenAlert(false)}>OK</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};
export default Onboarding;