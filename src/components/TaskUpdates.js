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
} from "@mui/material";
import axios from "axios";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import SendIcon from "@mui/icons-material/Send";

const TaskUpdates = ({ taskId, propertyId }) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateText, setUpdateText] = useState("");
  const [updateImage, setUpdateImage] = useState(null);
  const emp_name = localStorage.getItem("first_name") || "Unknown Engineer"; // Get engineer name

  // Fetch task updates
  const fetchUpdates = async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8080/task-updates/${taskId}`);
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

  // Handle submitting task update
  const handleSubmit = async () => {
    if (!updateText) {
      alert("Please enter an update message.");
      return;
    }

    const payload = {
      task_id: taskId,
      property_id: propertyId,
      engineer_name: emp_name,
      update_text: updateText,
      update_image: updateImage,
    };

    try {
      await axios.post("http://localhost:8080/task-updates", payload, {
        headers: { "Content-Type": "application/json" },
      });

      setUpdateText("");
      setUpdateImage(null);
      fetchUpdates();
    } catch (err) {
      alert("Failed to add update.");
      console.error("Error:", err);
    }
  };

  return (
    <Paper
      elevation={3}
      style={{
        padding: "20px",
        borderRadius: "10px",
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Typography
        variant="h6"
        style={{
          fontWeight: "bold",
          color: "#2a3f54",
          marginBottom: "15px",
        }}
      >
        Task Updates
      </Typography>

      {/* Add Task Update Form */}
      <Box style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
        <TextField
          label="Enter your update..."
          fullWidth
          multiline
          rows={3}
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          style={{
            backgroundColor: "#f9f9f9",
            borderRadius: "5px",
          }}
        />

        <Box style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <input
            accept="image/*"
            type="file"
            id="file-upload"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <label htmlFor="file-upload">
            <Button
              component="span"
              variant="outlined"
              startIcon={<AddAPhotoIcon />}
              style={{
                textTransform: "none",
                fontWeight: "bold",
              }}
            >
              Upload Image
            </Button>
          </label>

          {updateImage && (
            <img
              src={updateImage}
              alt="Preview"
              style={{
                maxWidth: "100px",
                maxHeight: "100px",
                borderRadius: "8px",
                objectFit: "cover",
              }}
            />
          )}
        </Box>

        <Button
          variant="contained"
          color="primary"
          endIcon={<SendIcon />}
          onClick={handleSubmit}
          style={{
            alignSelf: "flex-end",
            textTransform: "none",
            fontWeight: "bold",
          }}
        >
          Submit Update
        </Button>
      </Box>

      <Divider style={{ margin: "20px 0" }} />

      {/* Display Task Updates */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : updates.length === 0 ? (
        <Typography style={{ color: "#9e9e9e", textAlign: "center" }}>
          No updates available for this task.
        </Typography>
      ) : (
        <List style={{ maxHeight: "400px", overflowY: "auto" }}>
          {updates.map((update) => (
            <ListItem
              key={update.update_id}
              alignItems="flex-start"
              style={{
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "8px",
                transition: "background 0.3s",
                ":hover": { backgroundColor: "#eceff1" },
              }}
            >
              <Avatar
                alt={update.engineer_name}
                src="/static/avatar.png"
                style={{ width: "50px", height: "50px", marginRight: "10px" }}
              />
              <ListItemText
                primary={
                  <Typography
                    variant="subtitle1"
                    style={{
                      fontWeight: "bold",
                      color: "#374151",
                    }}
                  >
                    {update.engineer_name} - {new Date(update.created_at).toLocaleString()}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography variant="body2" style={{ color: "#5a5a5a" }}>
                      {update.update_text}
                    </Typography>
                    {update.update_image && (
                      <Box mt={1}>
                        <img
                          src={update.update_image}
                          alt="Update"
                          style={{
                            maxWidth: "100%",
                            borderRadius: "8px",
                            maxHeight: "200px",
                          }}
                        />
                      </Box>
                    )}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default TaskUpdates;