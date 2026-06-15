import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Typography,
  IconButton,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";

const ReviewedHistory = ({ invoiceData, onClose }) => {
  const data = invoiceData;
  const [openPdfDialog, setOpenPdfDialog] = useState(false);
  const handlePdfDialogOpen = () => setOpenPdfDialog(true);
  const handlePdfDialogClose = () => setOpenPdfDialog(false);

  return (
    <Card
      sx={{
        boxShadow: 3,
        borderRadius: "16px",
        overflow: "hidden",
        backgroundColor: "#F9FAFC",
        maxWidth: "1000px",
        margin: "auto",
        position: "relative",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: "bold",
          color: "#2A3663",
          textAlign: "center",
          marginBottom: 3,
          marginTop: "30px"
        }}
      >
        Reviewed History 
      </Typography>

      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          color: "#555",
          backgroundColor: "#FEE2E2",      // soft red
          color: "#DC2626",                // red text
          borderRadius: "9px",
          "&:hover": { color: "#D32F2F" },
        }}>
        <CloseIcon />
        Close
      </IconButton>

      <CardContent>
        <Box sx={{ margin: "auto", 
            marginLeft: "30px",
             marginRight: "30px",
              border:"2px solid grey",
              borderRadius:"10px" }}>
          <Typography
            sx={{
              height: 40,
              textAlign: "center",
              fontSize: "18px",
              fontWeight: "bold",
              color: "black",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              marginLeft:"260px"
            }}
          >
            Invoice Details #{data.avenue_created_invoice_id || "N/A"}
            <IconButton onClick={handlePdfDialogOpen} sx={{ color: "black" }}>
              <VisibilityIcon />
            </IconButton>
          </Typography>
          <Grid container spacing={2}>
            {/* Avenue Created ID Field */}
            <Grid item xs={6}>
              <TextField
                label="Avenue Created ID"
                variant="outlined"
                fullWidth
                value={data.avenue_created_invoice_id}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>

            {/* Vendor Name Field */}
            <Grid item xs={6}>
              <TextField
                label="Payment Status"
                variant="outlined"
                fullWidth
                value={data.payment_status}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>

            {/* Supplier Name Field */}
            <Grid item xs={6}>
              <TextField
                label="Supplier Name"
                variant="outlined"
                fullWidth
                value={data.supplier_name}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>

            {/* Invoice Number Field */}
            <Grid item xs={6}>
              <TextField
                label="Invoice Number"
                variant="outlined"
                fullWidth
                value={data.invoice_number}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>

            {/* Created Date Field */}
            <Grid item xs={6}>
              <TextField
                label="Created Date"
                variant="outlined"
                fullWidth
                value={data.created_date}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>

            {/* Supplier GSTIN Field */}
            <Grid item xs={6}>
              <TextField
                label="Supplier GSTIN"
                variant="outlined"
                fullWidth
                value={data.supplier_gstin}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>

            {/* Bill Status Field */}
            <Grid item xs={6}>
              <TextField
                label="Bill Status"
                variant="outlined"
                fullWidth
                value={data.bill_status}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>

            {/* Overdue Amount Field */}
            <Grid item xs={6}>
              <TextField
                label="Overdue Amount"
                variant="outlined"
                fullWidth
                value={data.overdue_amount}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>
          </Grid>
        </Box>

        <Dialog open={openPdfDialog} onClose={handlePdfDialogClose} fullWidth maxWidth="lg">
          <DialogTitle>Invoice PDF</DialogTitle>
          <DialogContent>
            <iframe
              src={data.file_url}
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
      </CardContent>
    </Card>
  );
};

export default ReviewedHistory;