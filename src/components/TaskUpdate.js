import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Avatar,
  TextField,
  Button,
  Divider,
  Chip,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from "@mui/material";
import axios from "axios";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";

import PersonIcon from "@mui/icons-material/Person";
import { motion } from "framer-motion"; // For animations
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import EngineeringIcon from "@mui/icons-material/Engineering"; // For DWG files
import { ExpandMore, ExpandLess, AttachFile } from "@mui/icons-material";
import { AccessTime, Event, Flag, Close, Edit } from "@mui/icons-material";
// import { Send as SendIcon } from "@mui/icons-material"; // ✅ Import Send Icon
import SendIcon from "@mui/icons-material/Send";
dayjs.extend(relativeTime);

const TaskUpdates = ({ taskId, propertyId, scheduleId }) => {  // ✅ Accept scheduleId

  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateText, setUpdateText] = useState("");
  const [updateImage, setUpdateImage] = useState(null);
  const emp_name = localStorage.getItem("first_name") || "Unknown Engineer"; // Engineer name
  const [dialogOpen, setDialogOpen] = useState(false); // Custom Dialog State
  const [dialogMessage, setDialogMessage] = useState(""); // Dialog Message
  const [selectedFiles, setSelectedFiles] = useState([]);


  // Fetch task updates
  const fetchUpdates = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8080/task_updates/${taskId}`);
      setUpdates(response.data.updates || []);
      setError(null);
    } catch (err) {
      setError("Failed to fetch task updates.");
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, [taskId]);

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => setUpdateImage(reader.result);
    }
  };
  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };
  const handleRemoveFile = (index) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };
   // ✅ Define getFileIcon inside the component before using it
   const getFileIcon = (fileName) => {
    if (fileName.endsWith(".pdf")) return <PictureAsPdfIcon color="error" />;
    if (fileName.endsWith(".dwg")) return <EngineeringIcon color="primary" />;
    return <InsertDriveFileIcon color="disabled" />;
  };
  

  // Handle submitting task update
  const handleSubmit = async () => {
    if (!updateText) {
      setDialogMessage("Please enter an update message.");
      setDialogOpen(true);
      return;
    }
  
    const formData = new FormData();
    formData.append("task_id", taskId);
    formData.append("property_id", propertyId);
    formData.append("schedule_id", scheduleId);
    formData.append("engineer_name", emp_name);
    formData.append("update_text", updateText);
  
    selectedFiles.forEach((file) => {
      formData.append("update_files", file); // Append each file
    });
  
    try {
      await axios.post("http://localhost:8080/task-updates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      setUpdateText("");
      setSelectedFiles([]); // Reset selected files
      fetchUpdates();
    } catch (err) {
      setDialogMessage("Failed to add update. Please try again.");
      setDialogOpen(true);
      console.error("Error sending payload:", err.response ? err.response.data : err);
    }
  };
  
  

  return (
    <Paper
      elevation={0}
      style={{
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        overflow: "hidden",
      }}>
  
      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          marginBottom: "15px",
          padding: "15px",
         
          borderRadius: "8px",
        }}>
        {/* <TextField
          label="Enter your update..."
          fullWidth
          multiline
          rows={3}
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          style={{
            backgroundColor: "#f8fafc",
            borderRadius: "5px",
          }}
        /> */}

<Box

>
  {/* 🔹 File Preview Section */}
  {selectedFiles.length > 0 && (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        paddingBottom: "5px",
        maxWidth: "100%",
      }}
    >
      {selectedFiles.map((file, index) => (
        <Paper
          key={index}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 10px",
            borderRadius: "15px",
            backgroundColor: "#E3F2FD",
            boxShadow: "none",
          }}
        >
          <AttachFile fontSize="small" sx={{ color: "#1976D2" }} />
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "150px",
            }}
          >
            {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </Typography>
          <IconButton size="small" onClick={() => handleRemoveFile(index)} sx={{ color: "red" }}>
            <Close fontSize="small" />
          </IconButton>
        </Paper>
      ))}
    </Box>
  )}

  {/* 🔹 Modern Input + Send Button in One Row */}
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      backgroundColor: "#F7F9FC",
      borderRadius: "25px",
      padding: "5px 10px",
      boxShadow: "0px 2px 5px rgba(0,0,0,0.2)",
    }}
  >
    <TextField
      placeholder="Type a message..."
      fullWidth
      multiline
      minRows={1}
      maxRows={4}
      variant="standard"
      value={updateText}
      onChange={(e) => setUpdateText(e.target.value)}
      InputProps={{ disableUnderline: true }}
      sx={{
        flex: 1,
        padding: "8px",
      }}
    />

    {/* 🔹 File Upload Button */}
    <input
      type="file"
      multiple
      onChange={handleFileSelection}
      style={{ display: "none" }}
      id="file-upload"
    />
    <label htmlFor="file-upload">
      <IconButton component="span" sx={{ color: "#607D8B" }}>
        <AttachFile />
      </IconButton>
    </label>

    {/* 🔹 Send Button with SendIcon */}
    <IconButton
      color="primary"
      sx={{
        marginLeft: "5px",
        backgroundColor: "#1976D2",
        color: "#FFF",
        borderRadius: "50%",
        padding: "8px",
        "&:hover": {
          backgroundColor: "#1565C0",
        },
      }}
      onClick={handleSubmit}
      disabled={!updateText.trim() && selectedFiles.length === 0}
    >
      <SendIcon />
    </IconButton>
  </Box>
</Box>


{/* Show Selected Files (Expands Dynamically) */}

        {/* <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mt: 2 }}>
  <Button
    variant="contained"
    color="primary"
    endIcon={<SendIcon />}
    onClick={handleSubmit}
    sx={{
      textTransform: "none",
      fontWeight: "bold",
    }} > Submit Update </Button>
</Box> */}
</Box>
      <Divider style={{ margin: "20px 0"}} />
      <Box
  sx={{
    maxHeight: "400px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 1,
    padding: "10px",
    backgroundColor: "#f5f5f5",
    borderRadius: "10px",
  }}
>
  {updates.length > 0 ? (
    updates.map((update) => (
      <Box
        key={update.update_id}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: update.engineer_name === emp_name ? "flex-end" : "flex-start",
          gap: 1,
          padding: "8px",
        }}
      >
        <Paper
          sx={{
            padding: "10px 15px",
            borderRadius: "15px",
            backgroundColor: update.engineer_name === emp_name ? "#DCF8C6" : "#FFF",
            maxWidth: "75%",
          }}
        >
          <Typography variant="caption" color="textSecondary">
            {update.engineer_name} • {new Date(update.created_at).toLocaleString()}
          </Typography>
          <Typography variant="body2" sx={{ marginTop: "5px" }}>
            {update.update_text}
          </Typography>

          {/* Display Attached Files */}
          {update.files && update.files.length > 0 && (
            <Box sx={{ marginTop: 1 }}>
              <Typography variant="caption" fontWeight="bold">Attachments:</Typography>
              {update.files.map((file) => (
                <Box key={file.file_id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AttachFile fontSize="small" />
                  <Typography
                    variant="body2"
                    component="a"
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ textDecoration: "none", color: "blue" }}
                  >
                    {file.file_name} ({(file.file_size / 1024).toFixed(2)} KB)
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    ))
  ) : (
    <Typography color="textSecondary" align="center">
      No updates yet. Start the conversation!
    </Typography>
  )}
</Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Typography>{dialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TaskUpdates;