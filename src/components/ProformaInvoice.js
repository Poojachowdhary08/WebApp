import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

const ProformaInvoice = ({ invoiceData, onClose }) => {
  const {
    avenue_created_invoice_id,
    supplier_name,
    supplier_address,
    supplier_gstin,
    invoice_date,
    invoice_number,
    file_url,
    items = [],
  } = invoiceData || {}; // Safely destructure with fallback to empty object

  const [remarks, setRemarks] = useState("");
  const [documentType, setDocumentType] = useState("Invoice");
  const [file, setFile] = useState(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogSeverity, setDialogSeverity] = useState("success");

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        if (invoiceData && invoiceData.avenue_created_invoice_id) {
          const apiUrl = `http://localhost:8080/get-invoice/${encodeURIComponent(invoiceData.avenue_created_invoice_id)}`;
          const response = await fetch(apiUrl);

          if (!response.ok) {
            throw new Error("Failed to fetch invoice data.");
          }

          const result = await response.json();

          // Populate fields with fetched data
          setRemarks(result.remarks || "");
          setDocumentType(result.document_type || "Invoice");
        }
      } catch (error) {
        console.error("Error fetching invoice data:", error);
        showDialog("Failed to load invoice data. Please try again.", "error");
      }
    };

    fetchInvoiceData();
  }, [invoiceData]);

  const handleFileUpload = (event) => {
    setFile(event.target.files[0]);
    console.log("File selected:", event.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Submission logic...
  };

  const showDialog = (message, severity) => {
    setDialogMessage(message);
    setDialogSeverity(severity || "info");
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    if (dialogSeverity === "success") {
      onClose();
    }
  };

  return (
    <Card
      sx={{
        boxShadow: 3,
        borderRadius: "16px",
        overflow: "hidden",
        backgroundColor: "#F9FAFC",
        maxWidth: "800px",
        margin: "auto",
        position: "relative",
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          color: "#555",
          "&:hover": { color: "#D32F2F" },
        }}
      >
        <CloseIcon />
      </IconButton>
      <CardContent>
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            color: "#2A3663",
            textAlign: "center",
            marginBottom: 3,
          }}
        >
          Proforma Invoice
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Avenue Created ID"
                disabled
                fullWidth
                variant="outlined"
                value={avenue_created_invoice_id || "AN001-AA0195"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Invoice Number"
                fullWidth
                variant="outlined"
                value={invoice_number || "INVO-810	"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Vendor Name"
                fullWidth
                variant="outlined"
                value={supplier_name || "ANASUYA TRADERS	"}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="document-type-label">Invoice Type</InputLabel>
                <Select
                  labelId="document-type-label"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  label="Document Type"
                >
                  <MenuItem value="Proforma">Proforma</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography>Upload New Invoice</Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  border: "2px dashed",
                  borderColor: "#3f51b5",
                  backgroundColor: "transparent",
                  borderRadius: "8px",
                  padding: 2,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "background-color 0.3s, border-color 0.3s",
                }}
              >
                <Button
                  variant="text"
                  component="label"
                  sx={{ color: "#3f51b5" }}
                >
                  Drag & Drop File or Click to Upload
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/jpg"
                    hidden
                    onChange={handleFileUpload}
                  />
                </Button>
              </Box>
              {file && <Typography>Uploaded File: {file.name}</Typography>}
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                multiline
                rows={3}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isDisabled}
                sx={{
                  backgroundColor: isDisabled ? "#ccc" : "#3f51b5",
                }}
              >
                {isDisabled ? "Processing..." : "Submit"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>

      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: 6,
            backgroundColor:
              dialogSeverity === "success" ? "#E8F5E9" : "#FFCDD2",
            color: dialogSeverity === "success" ? "#2E7D32" : "#D32F2F",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontWeight: "bold",
            color: dialogSeverity === "success" ? "#388E3C" : "#D32F2F",
          }}
        >
          {dialogSeverity === "success" ? (
            <CheckCircleIcon fontSize="large" sx={{ color: "#388E3C" }} />
          ) : (
            <ErrorIcon fontSize="large" sx={{ color: "#D32F2F" }} />
          )}
          {dialogSeverity === "success" ? "Success" : "Error"}
        </DialogTitle>
        <DialogContent>
          <Typography>{dialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDialogClose}
            sx={{
              backgroundColor:
                dialogSeverity === "success" ? "#388E3C" : "#D32F2F",
              color: "#FFFFFF",
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ProformaInvoice;