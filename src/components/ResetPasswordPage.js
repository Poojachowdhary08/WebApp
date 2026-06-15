import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import axios from "axios";
import { API_BASE } from "../config";

const ResetPasswordPage = () => {
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/forgot-password-users`);
      setUsers(response.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const handleResetClick = (phone) => {
    setSelectedPhone(phone);
    setNewPassword("");
    setMessage("");
    setOpenDialog(true);
  };

  const handlePasswordReset = async () => {
    if (!newPassword) {
      setMessage("❌ Please enter a new password.");
      return;
    }
    try {
      await axios.post(`${API_BASE}/reset-password`, {
        phone_number: selectedPhone,
        new_password: newPassword,
      });
      setMessage("✅ Password reset successful!");
      
      setTimeout(() => {
        setOpenDialog(false);
        fetchUsers(); // 🔁 Refresh the table
      }, 1500);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to reset password.");
    }
  };
  
  return (
    <Box sx={{ padding: 3, backgroundColor: "#F4F6F9", minHeight: "96%", marginLeft: "14px", marginTop: "-1%" }}>
      <Typography variant="h4" gutterBottom color="black">
        Forgot Password Requests
      </Typography>

      <TableContainer component={Paper}>
        <Table>
        <TableHead sx={{ backgroundColor: "#2A3663" }}>
        <TableRow>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Phone Number</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Full Name</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Requested At</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user, index) => (
              <TableRow key={index}>
                <TableCell>{user.phone_number}</TableCell>
                <TableCell>{user.full_name || "-"}</TableCell>
                <TableCell>{new Date(user.requested_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleResetClick(user.phone_number)}
                  >
                    Reset
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
  <TextField
    label="Phone Number"
    fullWidth
    margin="dense"
    value={selectedPhone}
    disabled
  />
<TextField
  autoFocus
  margin="dense"
  label="New Password"
  type="text"  // 👈 shows the characters instead of hiding them
  fullWidth
  value={newPassword}
  onChange={(e) => setNewPassword(e.target.value)}
/>

  {message && (
    <Typography mt={1} color={message.startsWith("✅") ? "green" : "red"}>
      {message}
    </Typography>
  )}
</DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handlePasswordReset} variant="contained">
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResetPasswordPage;