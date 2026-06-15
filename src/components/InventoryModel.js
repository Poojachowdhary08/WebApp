import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Select,
  MenuItem,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Card,
  CardContent,
  Grid,
  ListItemButton,
} from "@mui/material";
import {
  Send as SendIcon,
  Search as SearchIcon,
  AttachFile,
  Close,
  Event,
  Flag,
  Save as SaveIcon,
  Inventory,
} from "@mui/icons-material";
import axios from "axios";
import MaterialsSection from "./MaterialsSection";

const statusColors = {
  "In Progress": "#007bff",
  "Completed": "#8BC34A",
  "Pending": "#ffc107",
  "Hold": "#6c757d",
};

// New light colors for full background (adjust as needed)
const lightStatusColors = {
  "In Progress": "#cce5ff",
  "Completed": "#d4edda",
  "Pending": "#fff3cd",
  "Hold": "#e2e3e5",
};

const InventoryModel = ({ propertyId }) => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("edit");
  const [status, setStatus] = useState("");
  const [updates, setUpdates] = useState([]);
  const [newUpdateText, setNewUpdateText] = useState("");
  const [newUpdateFiles, setNewUpdateFiles] = useState([]);
  const emp_name = localStorage.getItem("first_name") || "Unknown Engineer";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [startdate, setStartdate] = useState("");
  const [enddate, setEnddate] = useState("");
  const [completionTime, setCompletionTime] = useState(null);
  const [applyToAll, setApplyToAll] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [materials, setMaterials] = useState([]);
  const [initialValues, setInitialValues] = useState({ startdate: "", enddate: "", status: "" });

  useEffect(() => {
    if (selectedTask && selectedTask.scheduleid) {
      const formattedStart = formatDate(selectedTask.startdate || "");
      const formattedEnd = formatDate(selectedTask.enddate || "");
      setStartdate(formattedStart);
      setEnddate(formattedEnd);
      setStatus(selectedTask.status || "Pending");
      setInitialValues({
        startdate: formattedStart,
        enddate: formattedEnd,
        status: selectedTask.status || "Pending",
      });
      if (!selectedTask.task_id) {
        axios
          .get(`http://localhost:8080/get-task-id/${selectedTask.scheduleid}`)
          .then(response => {
            setTaskId(response.data.task_id);
          })
          .catch(error => console.error("❌ Error fetching task_id:", error));
      } else {
        setTaskId(selectedTask.task_id);
      }
      fetchTaskUpdates(selectedTask.scheduleid);
    }
  }, [selectedTask]);

  const hasChanges = () => {
    return (
      startdate !== initialValues.startdate ||
      enddate !== initialValues.enddate ||
      status !== initialValues.status
    );
  };

  useEffect(() => {
    if (propertyId) {
      fetchTasks();
    }
  }, [propertyId]);

  useEffect(() => {
    let filtered = tasks;
    if (filterStatus) {
      filtered = filtered.filter((task) => task.status === filterStatus);
    }
    if (searchQuery) {
      filtered = filtered.filter((task) =>
        task.phasename.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredTasks(filtered);
  }, [filterStatus, searchQuery, tasks]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8080/properties/${propertyId}/schedule`);
      const data = response.data.schedule;
      setTasks(Array.isArray(data) ? data : []);
      const todayTask = data.find((task) => task.status === "In Progress");
      if (todayTask) {
        setSelectedTask(todayTask);
        setStatus(todayTask.status);
      }
    } catch (err) {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskUpdates = async (scheduleid) => {
    try {
      const response = await axios.get(`http://localhost:8080/schedule_update/${scheduleid}`);
      setUpdates(response.data.updates || []);
    } catch (error) {
      console.error("Error fetching updates:", error);
    }
  };

  useEffect(() => {
    if (selectedTask) {
      fetchTaskUpdates(selectedTask.scheduleid);
      setStatus(selectedTask.status);
    }
  }, [selectedTask]);

  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    setStatus(newStatus);
  };

  const handleSaveStatus = async () => {
    setConfirmOpen(false);
    if (!selectedTask) return;
    try {
      const response = await axios.put(
        `http://localhost:8080/update-schedule/${selectedTask.scheduleid}`,
        {
          startdate: startdate,
          enddate: enddate,
          status: status,
          completionTime: status === "Completed" ? new Date().toISOString() : null,
          applyToAll: applyToAll,
        }
      );
      console.log("✅ Status Updated Successfully:", response.data);
      fetchTasks();
    } catch (error) {
      console.error("❌ Error updating status:", error);
    }
  };

  useEffect(() => {
    console.log("useEffect triggered for taskId:", taskId);
    if (taskId) {
      axios
        .get(`http://localhost:8080/materials/${taskId}`)
        .then(response => {
          console.log("Response from /materials endpoint:", response.data);
          setMaterials(response.data.materials || []);
        })
        .catch(error => {
          console.error("❌ Error fetching materials:", error);
        });
    } else {
      console.warn("No taskId provided, skipping materials fetch.");
    }
  }, [taskId]);

  const handleSave = async (applyToAllChoice) => {
    setConfirmOpen(false);
    if (!selectedTask || !selectedTask.scheduleid) {
      console.error("❌ Error: Missing schedule ID in selected task:", selectedTask);
      setSnackbar({ open: true, message: "Error: Missing schedule ID!", severity: "error" });
      return;
    }

    let completionTime = null;
    if (status === "Completed") {
      const kolkataTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      completionTime = new Date(kolkataTime).toISOString();
    }

    console.log("📤 Sending Update Request:", {
      scheduleid: selectedTask.scheduleid,
      startdate,
      enddate,
      applyToAll: applyToAllChoice,
    });

    try {
      const response = await axios.put(
        `http://localhost:8080/update-schedule/${selectedTask.scheduleid}`,
        {
          startdate,
          enddate,
          status,
          completionTime,
          task_id: taskId,
          applyToAll: applyToAllChoice,
        }
      );

      setSnackbar({ open: true, message: response.data.message, severity: "success" });
      fetchTasks();
      setTimeout(() => setConfirmOpen(false), 1000);
    } catch (error) {
      console.error("❌ Error updating schedule:", error);
      setSnackbar({ open: true, message: "Error updating schedule", severity: "error" });
    }
  };

  const handleFileChange = (event) => {
    setNewUpdateFiles([...newUpdateFiles, ...event.target.files]);
  };

  const removeFile = (index) => {
    setNewUpdateFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleSendUpdate = async () => {
    if (!newUpdateText && newUpdateFiles.length === 0) return;

    const formData = new FormData();
    formData.append("task_id", taskId);
    formData.append("property_id", selectedTask.property_id || "Unknown");
    formData.append("schedule_id", selectedTask.scheduleid);
    formData.append("engineer_name", emp_name);
    formData.append("update_text", newUpdateText);

    for (let file of newUpdateFiles) {
      formData.append("update_files", file);
    }

    try {
      await axios.post("http://localhost:8080/task-updates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      fetchTaskUpdates(selectedTask.scheduleid);
      setNewUpdateText("");
      setNewUpdateFiles([]);
    } catch (error) {
      console.error("Error sending update:", error);
    }
  };

  return (
    <Box display="flex" height="150vh" padding={4}>
      {/* Task List Panel */}
      <Paper
        elevation={3}
        sx={{
          width: 350,
          padding: 3,
          overflowY: "auto",
          borderRadius: "16px",
          background: "linear-gradient(to bottom, #ffffff, #f7f9fc)",
          boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ marginBottom: 2, color: "#37474f" }}
        >
          Task List
        </Typography>

        {/* Search Field */}
        <TextField
          variant="outlined"
          fullWidth
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            endAdornment: (
              <IconButton sx={{ color: "#1976D2" }}>
                <SearchIcon />
              </IconButton>
            ),
          }}
          sx={{
            marginBottom: 2,
            borderRadius: "8px",
            backgroundColor: "#fff",
          }}
        />

        {/* Status Filter */}
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          displayEmpty
          fullWidth
          variant="outlined"
          sx={{
            marginBottom: 2,
            borderRadius: "8px",
            backgroundColor: "#fff",
          }}
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="In Progress">In Progress</MenuItem>
          <MenuItem value="Completed">Completed</MenuItem>
          <MenuItem value="Pending">Pending</MenuItem>
          <MenuItem value="Hold">Hold</MenuItem>
        </Select>

        {/* Task List */}
        {loading ? (
          <CircularProgress />
        ) : (
          <List sx={{ width: "100%", bgcolor: "background.paper" }}>
            {filteredTasks.map((task) => (
              <ListItemButton
                key={task.scheduleid}
                selected={selectedTask?.scheduleid === task.scheduleid}
                onClick={() => setSelectedTask(task)}
                sx={{
                  // The right border code is commented out:
                  // borderRight: `8px solid ${statusColors[task.status] || "#eceff1"}`,
                  backgroundColor: lightStatusColors[task.status] || "#fff",
                  color: "#37474f",
                  borderRadius: 2,
                  mb: 1,
                  p: 2,
                  transition: "transform 0.3s, background-color 0.3s",
                  "&:hover": {
                    backgroundColor: "#f5f5f5",
                    transform: "scale(1.02)",
                  },
                }}
              >
                <ListItemText
                  primary={task.phasename}
                  primaryTypographyProps={{
                    color: "text.primary",
                    variant: "subtitle1",
                    fontWeight: "bold", // Phase name in bold
                  }}
                  secondaryTypographyProps={{
                    color: "text.secondary",
                    variant: "body2",
                  }}
                  secondary={
                    <>
                      Start date: {task.startdate}
                      <br />
                      End Date: {task.enddate}
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Paper>

      {/* Task Details Panel */}
      <Box flex={1} padding={1}>
        {selectedTask ? (
          <Paper
            elevation={0}
            sx={{
              padding: 4,
              borderRadius: "12px",
              backgroundColor: "#ffffff",
            }}
          >
            <Typography variant="h4" fontWeight="bold">
              {selectedTask.phasename}
            </Typography>
            <Tabs
              value={activeTab}
              onChange={(event, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
            >
              <Tab label="" value="edit" />
            </Tabs>

            {activeTab === "edit" ? (
              <>
                <Box sx={{ marginBottom: 2 }}></Box>

                {/* <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={selectedTask.startdate}
                  sx={{ marginBottom: 2 }}
                /> */}

                {/* <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={selectedTask.enddate}
                  sx={{ marginBottom: 2 }}
                /> */}

                {/* Status Dropdown with Save Feature */}
                {/* <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    marginTop: 2,
                  }}
                > */}
                  {/* <Flag sx={{ color: "#F39C12" }} />
                  <Typography>Status:</Typography>
                  <Select
                    value={status}
                    onChange={handleStatusChange}
                    fullWidth
                    variant="outlined"
                  >
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Hold">Hold</MenuItem>
                  </Select>
                </Box> */}

                {/* <Box sx={{ marginTop: 2, textAlign: "right" }}>
                  {hasChanges() && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => setConfirmOpen(true)}
                    >
                      Save
                    </Button>
                  )}
                </Box> */}
                <MaterialsSection selectedTask={selectedTask} materials={materials} />
                {/* Confirmation Dialog for Saving Phase Changes */}
                {/* <Dialog
                  open={confirmOpen}
                  onClose={() => setConfirmOpen(false)}
                  maxWidth="xs"
                  fullWidth
                >
                  <DialogTitle>Apply Changes to All Phases?</DialogTitle>
                  <DialogContent>
                    <Typography>
                      Do you want to update only this phase or all future phases?
                    </Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button
                      onClick={() => handleSave(false)}
                      color="primary"
                      variant="outlined"
                    >
                      Only This Phase
                    </Button>
                    <Button
                      onClick={() => handleSave(true)}
                      color="secondary"
                      variant="contained"
                    >
                      Apply to All
                    </Button>
                  </DialogActions>
                </Dialog> */}

                {/* Chat-Style Task Updates */}
                <Typography
                  variant="h6"
                  sx={{ marginTop: 3, fontWeight: "bold" }}
                >
                  Task Updates
                </Typography>
                <Box
                  sx={{
                    height: {
                      xs: "250px",
                      sm: "300px",
                      md: "320px",
                      lg: "320px",
                    },
                    overflowY: "auto",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                  }}
                >
                  {updates.length > 0 ? (
                    updates.map((update) => (
                      <Box
                        key={update.update_id}
                        sx={{
                          display: "flex",
                          justifyContent:
                            update.engineer_name === emp_name
                              ? "flex-end"
                              : "flex-start",
                        }}
                      >
                        <Paper
                          sx={{
                            padding: "10px 15px",
                            borderRadius: "15px",
                            backgroundColor:
                              update.engineer_name === emp_name ? "#DCF8C6" : "#FFF",
                            maxWidth: "75%",
                          }}
                        >
                          <Typography variant="caption" color="textSecondary">
                            {update.engineer_name} •{" "}
                            {new Date(update.created_at).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" sx={{ marginTop: "5px" }}>
                            {update.update_text}
                          </Typography>
                          {update.files && update.files.length > 0 && (
                            <Box sx={{ marginTop: 1 }}>
                              <Typography
                                variant="caption"
                                fontWeight="bold"
                              >
                                Attachments:
                              </Typography>
                              {update.files.map((file) => (
                                <Box
                                  key={file.file_id}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <AttachFile fontSize="small" />
                                  <Typography
                                    variant="body2"
                                    component="a"
                                    href={file.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                      textDecoration: "none",
                                      color: "blue",
                                    }}
                                  >
                                    {file.file_name} (
                                    {(file.file_size / 1024).toFixed(2)} KB)
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
                      No updates yet.
                    </Typography>
                  )}
                </Box>

                {/* File Preview Section */}
                {newUpdateFiles.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      paddingBottom: "10px",
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
                        <IconButton
                          size="small"
                          onClick={() => removeFile(index)}
                          sx={{ color: "red" }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Paper>
                    ))}
                  </Box>
                )}

                {/* Message Input & File Upload */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "#F7F9FC",
                    borderRadius: "25px",
                    padding: "5px 10px",
                    marginTop: 2,
                  }}
                >
                  <TextField
                    placeholder="Type an update..."
                    fullWidth
                    multiline
                    minRows={1}
                    maxRows={4}
                    variant="outlined"
                    value={newUpdateText}
                    onChange={(e) => setNewUpdateText(e.target.value)}
                    sx={{ flex: 1, padding: "8px" }}
                  />
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <IconButton component="span">
                      <AttachFile />
                    </IconButton>
                  </label>
                  <IconButton
                    color="primary"
                    onClick={handleSendUpdate}
                    disabled={!newUpdateText.trim() && newUpdateFiles.length === 0}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </>
            ) : null}
          </Paper>
        ) : (
          <Typography>Select a task to view details</Typography>
        )}
      </Box>
    </Box>
  );
};

export default InventoryModel;