import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,Collapse,IconButton,
  Divider, Paper, TextField, Snackbar,ListItem,ListItemText,List,Select , MenuItem
} from "@mui/material";
import { AccessTime, Event, Flag, Close, Edit } from "@mui/icons-material";
import { ExpandMore, ExpandLess, AttachFile } from "@mui/icons-material";
import { Tabs, Tab } from "@mui/material";

import { Send as SendIcon } from "@mui/icons-material"; // ✅ Import Send Icon
const TIMEZONE = "Asia/Kolkata";
const API_URL = "http://localhost:8080"; // Replace with actual API URL


const getStatus = (phase) => {
  const endDate = new Date(phase?.end_date);
  const today = new Date();
  if (phase?.status === "In Progress" && endDate < today) return "Delayed";
  return phase?.status || "Pending";
};

const PhaseDetailsModal = ({ open, onClose, phase, refreshSchedules }) => {
  // ✅ Hooks must always be at the top level
  const [isEditing, setIsEditing] = useState(false);
  const [startdate, setStartdate] = useState("");
  const [enddate, setEnddate] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [confirmOpen, setConfirmOpen] = useState(false);
    const [applyToAll, setApplyToAll] = useState(false);
    const [taskId, setTaskId] = useState("");
    const [activeTab, setActiveTab] = useState("Edit Phase"); // "details" or "updates"
    const [updates, setUpdates] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [newUpdateText, setNewUpdateText] = useState("");
const [newUpdateFiles, setNewUpdateFiles] = useState([]);
const emp_name = localStorage.getItem("first_name") || "Unknown Engineer"; // Engineer Name
const [status, setStatus] = useState("pending");



  // 🔥 Prefill startdate & enddate when phase changes
  useEffect(() => {
    if (phase && phase.id) {
      setStartdate(formatDate(phase.start_date));
      setEnddate(formatDate(phase.end_date));
      setStatus(phase.status || "pending");
  
      // Fetch task_id
      if (!phase.task_id) {
        axios.get(`http://localhost:8080/get-task-id/${phase.id}`)
          .then(response => {
            setTaskId(response.data.task_id);
          })
          .catch(error => console.error("❌ Error fetching task_id:", error));
      } else {
        setTaskId(phase.task_id);
      }
  
      // Fetch updates for the task
      fetchTaskUpdates(phase.id);
    }
  }, [phase]);


  const fetchTaskUpdates = async (scheduleid) => {
    try {
      const response = await axios.get(`http://localhost:8080/schedule_update/${scheduleid}`);
      setUpdates(response.data.updates || []);
    } catch (error) {
      console.error("Error fetching updates:", error);
      setSnackbar({ open: true, message: "Failed to fetch updates", severity: "error" });
    }
  };
  const handleSendUpdate = async () => {
    if (!newUpdateText) {
      setSnackbar({ open: true, message: "Please enter an update message", severity: "error" });
      return;
    }
  
    const formData = new FormData();
    formData.append("task_id", taskId);
    formData.append("property_id", phase.property_id || "Unknown");
    formData.append("schedule_id", phase.id);
    formData.append("engineer_name", emp_name);
    formData.append("update_text", newUpdateText);
    
    for (let file of newUpdateFiles) {
      formData.append("update_files", file);
    }
  
    try {
      const response = await axios.post("http://localhost:8080/task-updates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      setSnackbar({ open: true, message: response.data.message, severity: "success" });
  
      // Refresh updates after submission
      fetchTaskUpdates(phase.id);
      setNewUpdateText("");
      setNewUpdateFiles([]);
    } catch (error) {
      console.error("Error sending update:", error);
      setSnackbar({ open: true, message: "Failed to send update", severity: "error" });
    }
  };
  
  
  // useEffect(() => {
  //   if (phase && phase.id) {
  //     setStartdate(formatDate(phase.start_date));
  //     setEnddate(formatDate(phase.end_date));
  
  //     // Fetch task_id if it's not already in phase
  //     if (!phase.task_id) {
  //       axios.get(`http://localhost:8080/get-task-id/${phase.id}`)
  //         .then(response => {
  //           setTaskId(response.data.task_id); // Assuming API returns { task_id: "12345" }
  //         })
  //         .catch(error => {
  //           console.error("❌ Error fetching task_id:", error);
  //         });
  //     } else {
  //       setTaskId(phase.task_id);
  //     }
  //   }
  // }, [phase]);
  

  // 🔥 Format date to YYYY-MM-DD for input fields
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0]; // Extract YYYY-MM-DD
  };

  const handleSaveClick = () => {
    setConfirmOpen(true); // Open prompt before saving
  };
  
  // 🔥 Handle Save Update
  const handleSave = async (applyToAllChoice) => {
    setConfirmOpen(false); // Close confirmation prompt
  
    if (!phase || !phase.id) { 
      console.error("❌ Error: Missing schedule ID in phase:", phase);
      setSnackbar({ open: true, message: "Error: Missing schedule ID!", severity: "error" });
      return;
    }
    let completionTime = null;
    if (status === "Completed") {
      const kolkataTime = new Date().toLocaleString("en-US", { timeZone: TIMEZONE });
      completionTime = new Date(kolkataTime).toISOString();
    }

  
    console.log("📤 Sending Update Request:", {
      scheduleid: phase.id,
      startdate,
      enddate,
      applyToAll: applyToAllChoice
    });
  
    try {
      const response = await axios.put(`http://localhost:8080/update-schedule/${phase.id}`, {
        startdate,
        enddate,
        status,
        completionTime,
        task_id: taskId,
        applyToAll
      });
      setSnackbar({ open: true, message: response.data.message, severity: "success" });
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      setSnackbar({ open: true, message: "Error updating schedule", severity: "error" });
    }
  };
  const handleFileChange = (event) => {
    setNewUpdateFiles([...newUpdateFiles, ...event.target.files]);
  };
  
  useEffect(() => {
    setIsEditing(false);  // ✅ Reset edit mode when modal is closed or tab is changed
  }, [open, activeTab]);
  
  const removeFile = (index) => {
    setNewUpdateFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };
  
  
  


  return (
    
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* 🔹 Title & Buttons */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px" }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", textAlign: "center", flex: 1 }}>
          {phase ? phase.text : "Loading..."}
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="outlined"
            sx={{
              color: "blue",
              borderColor: "blue",
              fontWeight: "bold",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "14px",
              borderRadius: "8px",
              transition: "0.2s",
              "&:hover": { backgroundColor: "rgba(0, 0, 255, 0.1)", borderColor: "blue" }
            }}
          >
            <Edit sx={{ fontSize: "16px" }} /> {isEditing ? "Cancel" : "Edit"}
          </Button>

          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              color: "red",
              borderColor: "red",
              textTransform: "uppercase",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "14px",
              borderRadius: "8px",
              transition: "0.2s",
              "&:hover": { backgroundColor: "rgba(255, 0, 0, 0.1)", borderColor: "red" }
            }}
          >
            <Close sx={{ fontSize: "16px" }} /> Close
          </Button>
        </Box>
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
  <DialogTitle>Apply Changes to All Phases?</DialogTitle>

  <DialogContent>
    <Typography>Do you want to update only this phase or all future phases?</Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => handleSave(false)} color="primary" variant="outlined">
      Only This Phase
    </Button>
    <Button onClick={() => handleSave(true)} color="secondary" variant="contained">
      Apply to All
    </Button>
  </DialogActions>
</Dialog>


  
      </Box>
      <Tabs
  value={activeTab}
  onChange={(event, newValue) => setActiveTab(newValue)}
  variant="fullWidth"
  indicatorColor="primary"
  textColor="primary"
>
  <Tab label="Edit Phase" value="edit" />
  <Tab label="Task Updates" value="updates" />
</Tabs>

      <DialogContent>
  {activeTab === "edit" ? (
    <>
      {/* ✅ Edit Phase Content */}
      <Paper sx={{ padding: "20px", borderRadius: "12px", boxShadow: "none" }}>
        {/* 🔹 Start Date */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, padding: "8px 0" }}>
          <Event sx={{ color: "#4CA1AF" }} />
          <Typography variant="body1" sx={{ fontWeight: "500", color: "#666" }}>Start Date:</Typography>
          {isEditing ? (
            <TextField type="date" fullWidth value={startdate} onChange={(e) => setStartdate(e.target.value)} />
          ) : (
            <Typography variant="body1" sx={{ fontWeight: "bold", color: "#333" }}>
              {formatDate(phase.start_date)}
            </Typography>
          )}
        </Box>

        {/* 🔹 End Date */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, padding: "8px 0" }}>
          <Event sx={{ color: "#E74C3C" }} />
          <Typography variant="body1" sx={{ fontWeight: "500", color: "#666" }}>End Date:</Typography>
          {isEditing ? (
            <TextField type="date" fullWidth value={enddate} onChange={(e) => setEnddate(e.target.value)} />
          ) : (
            <Typography variant="body1" sx={{ fontWeight: "bold", color: "#333" }}>
              {formatDate(phase.end_date)}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Flag sx={{ color: "#F39C12" }} />
              <Typography>Status:</Typography>
              {!isEditing ? (
  <Typography variant="body1" sx={{ fontWeight: "bold" }}>{status}</Typography>
) : (
  <Select 
    value={status} 
    onChange={(e) => setStatus(e.target.value)} 
    fullWidth
  >
    <MenuItem value="Pending">Pending</MenuItem>
    <MenuItem value="In Progress">In Progress</MenuItem>
    <MenuItem value="Completed">Completed</MenuItem>
    <MenuItem value="Hold by Avenue">Hold by Avenue</MenuItem>
    <MenuItem value="Hold by Customer">Hold by Customer</MenuItem>
  </Select>
)}

              
            </Box>


        {/* 🔹 Status */}
        {/* <Box sx={{ display: "flex", alignItems: "center", gap: 1, padding: "8px 0" }}>
          <Flag sx={{ color: "#F39C12" }} />
          <Typography variant="body1">Status:</Typography>
          <Typography variant="body1" sx={{ fontWeight: "bold", color: "#333" }}>
            {getStatus(phase)}
          </Typography>
        </Box> */}

        {status.includes("Hold") && (
              <Button variant="contained" color="primary" onClick={() => setStatus("In Progress")}>Resume Work</Button>
            )}
      </Paper>
    </>
  ) : (
    <>
      {/* ✅ Task Updates Content */}
      <Box
  sx={{
    display: "flex",
    flexDirection: "column",
    padding: "10px",
    borderTop: "1px solid #ddd",
    backgroundColor: "#FFF",
    position: "sticky",
    bottom: 0,
    left: 0,
    width: "100%",
  }}
>
  {/* 🔹 File Preview Section */}
  {newUpdateFiles.length > 0 && (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        paddingBottom: "5px",
        maxWidth: "100%",
      }}
    >
      {Array.from(newUpdateFiles).map((file, index) => (
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
          <IconButton size="small" onClick={() => removeFile(index)} sx={{ color: "red" }}>
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
      value={newUpdateText}
      onChange={(e) => setNewUpdateText(e.target.value)}
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
      onChange={handleFileChange}
      style={{ display: "none" }}
      id="file-upload"
    />
    <label htmlFor="file-upload">
      <IconButton component="span" sx={{ color: "" }}>
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
      onClick={handleSendUpdate}
      disabled={!newUpdateText.trim() && newUpdateFiles.length === 0}
    >
      <SendIcon />
    </IconButton>
  </Box>
</Box>





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

    </>
  )}
</DialogContent>



      {/* 🔥 Save Button (Only in Edit Mode) */}
      {isEditing && (
       <DialogActions>
       {isEditing && (
         <Button variant="contained" color="primary" onClick={() => setConfirmOpen(true)}>
           Save
         </Button>
       )}
       {/* <Button onClick={onClose} color="primary" variant="contained">Close</Button> */}
     </DialogActions>
     
      )}

      {/* 🔥 Snackbar for Success/Error Messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Dialog>



    
  );
};

export default PhaseDetailsModal;