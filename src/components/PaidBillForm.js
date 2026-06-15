import React, { useState } from "react";
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
  Divider,
  Checkbox,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  DialogTitle,
} from "@mui/material";
import { Worker } from "@react-pdf-viewer/core";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddInventoryModal from "./AddInventoryModal";
import CreateInventoryModal from "./CreateInventoryModal";
import CloseIcon from '@mui/icons-material/Close';

const PaidBillForm = ({ invoiceData = [],onClose }) => {
  // Extract the first item from the array
  const data = invoiceData[0] || {};

  const {
    supplier_name = "NA",
    supplier_address = "NA",
    supplier_gstin = "NA",
    invoice_date = "NA",
    invoice_number = "NA",
    json_invoice_number = "NA",
    products = [],
    total = 0,
    taxes_igst = 0,
    file_url,
  } = data;

  const subtotal = total - taxes_igst;
  const handlePdfDialogOpen = () => {
    setOpenPdfDialog(true);
  };

  const handlePdfDialogClose = () => {
    setOpenPdfDialog(false);
  };
  // State to track selected checkboxes
  const [selectedRows, setSelectedRows] = useState([]);
  const [open, setOpen] = useState(false); // PDF dialog state
  const [openPdfDialog, setOpenPdfDialog] = useState(false);
  const handleClickOpen = () => {
    setOpen(!open);
  };

  const handleClose = () => {
    setOpen(false);
  };
  const handleClosePage = () => {
    if (onClose) {
      onClose(); // Close the form via the parent function
    } 
  };
  const handleClick = (e, index) => {
    const isChecked = e.target.checked;
    const product = products[index];

    if (isChecked) {
      setSelectedRows((prevSelectedRows) => [...prevSelectedRows, product]);
    } else {
      setSelectedRows((prevSelectedRows) =>
        prevSelectedRows.filter((item) => item !== product)
      );
    }
  };

  // State to manage modal visibility
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
  const [isCreateInventoryOpen, setIsCreateInventoryOpen] = useState(false);

  const handleAddInventory = () => setIsAddInventoryOpen(true);
  const handleCloseAddInventory = () => setIsAddInventoryOpen(false);

  const handleCreateInventory = () => setIsCreateInventoryOpen(true);
  const handleCloseCreateInventory = () => setIsCreateInventoryOpen(false);

  return (
    <Box sx={{ padding: 4, backgroundColor: "#F9F9F9", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663" }}>
          Invoice Overview #{json_invoice_number}
        </Typography>
        {/* <Box sx={{ display: "flex", gap: 2 }}>
          <IconButton onClick={handleClickOpen} color="primary">
            <VisibilityIcon />
          </IconButton>
          <Button variant="contained" sx={{ backgroundColor: "#1976d2" }} onClick={handleAddInventory}>
            Add Inventory
          </Button>
          <Button variant="contained" sx={{ backgroundColor: "#ff9800" }} onClick={handleCreateInventory}>
            Create Inventory
          </Button>
        </Box> */}
        <IconButton onClick={handlePdfDialogOpen} color="primary">
                  <VisibilityIcon />
                </IconButton>
         <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              width: "32px",
              height: "32px",
              color: "#555",
              backgroundColor: "#f0f0f0",
              border: "1px solid #ccc",
              borderRadius: "20%",
              transition: "all 0.3s ease",
              "&:hover": {
                color: "#fff",
                backgroundColor: "#d32f2f",
                borderColor: "#d32f2f",
                transform: "scale(1.1)",
              },
              "&:active": {
                transform: "scale(0.95)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          <Dialog open={openPdfDialog} onClose={handlePdfDialogClose} fullWidth maxWidth="lg">
                  <DialogTitle>Invoice PDF</DialogTitle>
                  <DialogContent>

                    <iframe
                    
                      src={file_url}
                      width="100%"
                      height="700px"
                      style={{ border: "none" }}
                      title="Invoice PDF"
                    />

                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handlePdfDialogClose} color="primary">
                      Close
                    </Button>
                  </DialogActions>
                </Dialog>
      </Box>

      {/* Invoice Overview */}
      <Box
        sx={{
          backgroundColor: "#FFFFFF", borderRadius: "8px", padding: "20px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", marginBottom: "20px", display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
         }}
      >
        <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#555" }}>
              Vendor Name: {supplier_name || "Vendor Name"}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#555" }}>
              Vendor Address: {supplier_address}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#555" }}>
              GSTIN: {supplier_gstin || "NA"}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="subtitle1" sx={{ color: "#555" }}>
              Date: {invoice_date || "NA"}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#555" }}>
              Invoice Number: {invoice_number || "NA"}
            </Typography>
          </Box>
      </Box>

      {/* Item Table */}
      <TableContainer component={Paper} sx={{ marginBottom: "20px", borderRadius: "8px" }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#2A3663" }}>
            <TableRow>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Item Description</TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Code</TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Quantity</TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Unit Price</TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Taxable Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(product)}
                    onChange={(e) => handleClick(e, index)}
                  />
                  {product.description || "NA"}
                </TableCell>
                <TableCell>{product.code || "NA"}</TableCell>
                <TableCell>{product.quantity || 0}</TableCell>
                <TableCell>₹{parseFloat(product.unit_price || 0).toFixed(2)}</TableCell>
                <TableCell>₹{parseFloat(product.taxable_value || 0).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Totals */}
      <Box
        sx={{
          padding: 3,
          backgroundColor: "#FFFFFF",
          borderRadius: 4,
          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
          width: "300px",
          marginLeft: "auto",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography sx={{ color: "#555" }}>Sub-Total</Typography>
          <Typography sx={{ fontWeight: "bold", color: "#2A3663" }}>₹{data.total_bill_amount}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography sx={{ color: "#555" }}>Taxes (IGST)</Typography>
          <Typography sx={{ fontWeight: "bold", color: "#2A3663" }}>{data.taxes_GST_percentage}%</Typography>
        </Box>
        <Divider />
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663" }}>
            Total Price
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663" }}>
            ₹{data.total_bill_amount}
          </Typography>
        </Box>
      </Box>

      {/* PDF Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
        <DialogTitle>Invoice PDF</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "500px" }}>
            <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
              {file_url ? (
                <object data={file_url} type="application/pdf" width="100%" height="100%">
                  No PDF Available
                </object>
              ) : (
                <Typography>No PDF Available</Typography>
              )}
            </Worker>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

    
      
    </Box>
  );
};

export default PaidBillForm;