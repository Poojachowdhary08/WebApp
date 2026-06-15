import {
    Box,
    Typography,
    Paper,
    CircularProgress,
    TextField,
    Card,
    CardContent,
    Grid,
    IconButton,
    Button,
    Select,
    MenuItem,
    InputAdornment,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
  } from "@mui/material";
  
  import React, { useState, useEffect } from "react";
  import { useRef } from "react";
  
  import {
    Send as SendIcon,
    AttachFile,
    Close,
    Search as SearchIcon,
  } from "@mui/icons-material";
  
  import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
  import axios from "axios";
  
  const statusColors = {
    requested: "#BBDEFB",
    blocked: "#FFECB3",
    rejected: "#FFCDD2",
    issued: "#C8E6C9",
  };
  
  const InventoryManagement = ({ taskId, projectId, propertyId }) => {
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [inventoryUpdates, setInventoryUpdates] = useState([]);
    const [newUpdateText, setNewUpdateText] = useState("");
    const [newUpdateFiles, setNewUpdateFiles] = useState([]);
    const [status, setStatus] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [materials, setMaterials] = useState([]);
    const emp_name = localStorage.getItem("first_name") || "Unknown Engineer"; // ✅ Fixed inconsistency
    const [updates, setUpdates] = useState([]);
    const [requests, setRequests] = useState([]);
    const [sendDisabled, setSendDisabled] = useState(false); // ⏳ Cooldown Timer
    const [empName, setEmpName] = useState("Unknown Engineer");
    const scrollRef = useRef(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [editStatusDialog, setEditStatusDialog] = useState(false);
    const [newStatus, setNewStatus] = useState("");
  
    useEffect(() => {
      const storedName = localStorage.getItem("first_name");
      console.log("🔍 Stored Engineer Name:", storedName); // Debugging log
      if (storedName) setEmpName(storedName);
    }, []);
  
    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [inventoryUpdates]);
  
    const fetchRequests = async () => {
      console.log(
        `🔍 Fetching data for Project ID: ${projectId}, Property ID: ${propertyId}`
      );
  
      if (!projectId || !propertyId) {
        console.warn(
          "⚠️ Missing projectId or propertyId. Cannot fetch requests."
        );
        return;
      }
  
      try {
        const response = await axios.get(
          `http://localhost:8080/inventory-requests?project_id=${encodeURIComponent(
            projectId
          )}&property_id=${encodeURIComponent(propertyId)}`
        );
        setRequests(response.data.requests || []);
      } catch (error) {
        console.error("❌ Error fetching specific requests:", error);
      } finally {
        setLoading(false);
      }
    };
  
    useEffect(() => {
      fetchRequests();
    }, [taskId]);
  
    useEffect(() => {
      let filtered = requests;
      if (filterStatus) {
        filtered = filtered.filter((req) => req.status === filterStatus);
      }
      if (searchQuery) {
        filtered = filtered.filter((req) =>
          req.item_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      setFilteredRequests(filtered);
    }, [filterStatus, searchQuery, requests]);
  
    const handleRequestClick = (request) => {
      setSelectedRequest(request);
      setStatus(request.status);
      console.log("🆕 Fetching updates for:", request.request_id);
      fetchInventoryUpdates(request.request_id);
    };
  
    const handleFileChange = (event) => {
      const files = Array.from(event.target.files);
      console.log("📂 Selected Files:", files); // Debugging
      setNewUpdateFiles(files);
    };
  
    const removeFile = (index) => {
      setNewUpdateFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    };
  
    const fetchInventoryUpdates = async (requestId) => {
      try {
        const response = await axios.get(
          `http://localhost:8080/inventory-updates/${requestId}`
        );
  
        console.log("✅ API Response for Inventory Updates:", response.data);
  
        // ✅ Sort messages by created_at in ascending order
        const sortedUpdates = response.data.updates.sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
  
        setInventoryUpdates(sortedUpdates);
      } catch (error) {
        console.error("❌ Error fetching inventory updates:", error);
      }
    };
  
    const handleUpdateStatus = async () => {
      if (!selectedRequest) {
        console.error("❌ No selected request found!");
        return;
      }
  
      console.log("📌 Updating Status for Request:", selectedRequest.request_id);
      console.log("🆕 New Status:", newStatus);
  
      try {
        const response = await axios.patch(
          `http://localhost:8080/update-request/${selectedRequest.request_id}`,
          { status: newStatus }
        );
  
        console.log("✅ Status Update Response:", response.data);
  
        fetchRequests(); // Refresh the request list
        setEditStatusDialog(false);
      } catch (error) {
        console.error("❌ Error updating status:", error);
      }
    };
  
  
    const handleDeleteRequest = async () => {
      try {
        await axios.delete(
          `http://localhost:8080/delete-request/${selectedRequest.request_id}`
        );
        setRequests(
          requests.filter((req) => req.request_id !== selectedRequest.request_id)
        );
        setConfirmDelete(false);
      } catch (error) {
        console.error("❌ Error deleting request:", error);
      }
    };
  
    const fetchMaterials = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8080/materials/${taskId}`
        );
        setMaterials(response.data.materials || []);
      } catch (error) {
        console.error("Error fetching materials:", error);
      }
    };
  
    const formatISTTime = (utcTime) => {
      const date = new Date(utcTime);
      return date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }); // ✅ Convert to IST
    };
  
    const handleSendUpdate = async () => {
      if (!newUpdateText.trim() && newUpdateFiles.length === 0) return; // Prevent empty updates
  
      setSendDisabled(true); // Disable button for cooldown
      setTimeout(() => setSendDisabled(false), 3000); // Enable after 3 seconds
  
      try {
        const formData = new FormData();
        formData.append("request_id", selectedRequest.request_id);
        formData.append("update_text", newUpdateText);
        formData.append("status", status);
        formData.append("engineer_name", empName); // ✅ Ensure this is sent
  
        for (let file of newUpdateFiles) {
          formData.append("update_files", file);
        }
  
        console.log("📤 Sending Update with Engineer Name:", empName); // Debugging log
  
        // 🔥 Debugging FormData Before Sending
        for (let pair of formData.entries()) {
          console.log(`📦 ${pair[0]}:`, pair[1]);
        }
  
        const response = await axios.post(
          "http://localhost:8080/inventory-updates",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
  
        console.log("✅ Upload Response:", response.data);
  
        fetchInventoryUpdates(selectedRequest.request_id);
        setNewUpdateText("");
        setNewUpdateFiles([]);
      } catch (error) {
        console.error("❌ Error sending update:", error);
      }
    };
  
    const isButtonDisabled =
      sendDisabled || (!newUpdateText.trim() && newUpdateFiles.length === 0);
  
    return (
      <Box display="flex" height="100vh" padding={4}>
        {/* Left Panel - Requests List with Search & Filter */}
        <Paper
          sx={{ width: 400, padding: 3, overflowY: "auto", borderRadius: 3 }}
        >
          <Typography variant="h5" fontWeight="bold">
            Inventory Requests
          </Typography>
          <br></br>
          <TextField
            variant="outlined"
            fullWidth
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ marginBottom: 2 }}
          />
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            displayEmpty
            fullWidth
            sx={{ marginBottom: 2 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="requested">Requested</MenuItem>
            <MenuItem value="blocked">Blocked</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="issued">Issued</MenuItem>
          </Select>
          {loading ? (
            <CircularProgress />
          ) : (
            <Grid container spacing={2}>
              {filteredRequests.map((req) => (
                <Grid item xs={12} key={req.request_id}>
                  <Card
                    sx={{
                      backgroundColor: statusColors[req.status],
                      padding: 1,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderRadius: 2,
                    }}
                    onClick={() => handleRequestClick(req)}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h7" fontWeight="bold">{req.item_name}</Typography>
                      <br></br>
                      <Typography variant="h7">Status: {req.status}</Typography>
                      <Typography>Quantity: {req.requested_quantity}</Typography>
                      <Typography>Warehouse: {req.warehouse}</Typography>
                    </CardContent>
  
                    {/* Actions */}
                    <Box>
                      <IconButton
                        onClick={() => {
                          console.log("✏️ Edit Clicked for:", req.request_id);
                          setSelectedRequest(req);
                          setNewStatus(req.status); // Ensure existing status is set
                          setEditStatusDialog(true);
                        }}
                      >
                        <EditIcon color="primary" />
                      </IconButton>
  
                      <IconButton
                        onClick={() => {
                          setSelectedRequest(req);
                          setConfirmDelete(true);
                        }}
                      >
                        <DeleteIcon color="error" />
                      </IconButton>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
  
        {/* Right Panel - Selected Request Details & Inventory Updates */}
        <Box flex={1} padding={2}>
          {selectedRequest ? (
            <Paper sx={{ padding: 3, borderRadius: 3 }}>
              <Typography variant="h5" fontWeight="bold">
                Request Details
              </Typography>
              <br></br>
  
              <Typography fontWeight="bold">
                Item: {selectedRequest.item_name}
              </Typography>
              <Typography fontWeight="bold">
                Quantity: {selectedRequest.requested_quantity}
              </Typography>
              <Typography fontWeight="bold">
                Warehouse: {selectedRequest.warehouse}
              </Typography>
  
              {/* Status Update
              <Box sx={{ marginTop: 2 }}>
                <Typography>Status:</Typography>
                <Select
                  fullWidth
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="requested">Requested</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="issued">Issued</MenuItem>
                </Select>
              </Box> */}
  
              {/* Inventory Updates Chat */}
              <Typography variant="h6" sx={{ marginTop: 3, fontWeight: "bold" }}>
                Inventory Updates
              </Typography>
              <Box
                ref={scrollRef} // ✅ Attach the scroll ref
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
                {inventoryUpdates.length > 0 ? ( // ✅ Use correct state variable
                  inventoryUpdates.map((update) => (
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
                          padding: "10px",
                          borderRadius: "10px",
                          backgroundColor:
                            update.engineer_name === emp_name
                              ? "#DCF8C6"
                              : "#F0F0F0", // ✅ Green for your messages, grey for others
                          maxWidth: "75%",
                        }}
                      >
                        <Typography variant="caption" color="textSecondary">
                          {update.engineer_name} •{" "}
                          {formatISTTime(update.created_at)} {/* ✅ Now in IST */}
                        </Typography>
                        <Typography variant="body2" sx={{ marginTop: "5px" }}>
                          {update.update_text}
                        </Typography>
                        {update.files && update.files.length > 0 && (
                          <Box sx={{ marginTop: 1 }}>
                            <Typography variant="caption" fontWeight="bold">
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
                                  sx={{ textDecoration: "none", color: "blue" }}
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
                  disabled={isButtonDisabled}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Paper>
          ) : (
            <Typography>Select a request to view details</Typography>
          )}
        </Box>
  
  
  
        <Dialog open={editStatusDialog} onClose={() => setEditStatusDialog(false)}>
          <DialogTitle>Edit Inventory Status</DialogTitle>
          <DialogContent>
            <Typography>Editing Request: {selectedRequest?.request_id || "N/A"}</Typography>
            <Select
              fullWidth
              value={newStatus}
              onChange={(e) => {
                console.log("🔄 Changing status to:", e.target.value);
                setNewStatus(e.target.value);
              }}
            >
              <MenuItem value="requested">Requested</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="issued">Issued</MenuItem>
            </Select>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} color="primary">
              Update
            </Button>
          </DialogActions>
        </Dialog>
  
        <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
          <DialogTitle>Delete Inventory Request?</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this request?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button onClick={handleDeleteRequest} color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };
  
  export default InventoryManagement;