import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  IconButton,
  TextField,
  Typography,
  Link,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import debounce from "lodash.debounce";

const UploadTaxInvoice = ({ invoiceData, onClose }) => {
  const userEmail = localStorage.getItem("email");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [avenueCreatedId, setAvenueCreatedId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [documentType, setDocumentType] = useState("N/A");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState(null);

  const [isDisabled, setIsDisabled] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogSeverity, setDialogSeverity] = useState("success");

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (invoiceData) {
      setInvoiceNumber(invoiceData.invoice_number || "");
      setAvenueCreatedId(invoiceData.avenue_created_invoice_id || "");
      setVendorName(invoiceData.supplier_name || "");
      setDocumentType(invoiceData.document_type || "N/A");
      setRemarks(invoiceData.remarks || "");
    }
  }, [invoiceData]);

  const showDialog = (message, severity = "info") => {
    setDialogMessage(message);
    setDialogSeverity(severity);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    if (dialogSeverity === "success") onClose?.();
  };

  const checkDuplicateInvoice = useMemo(
    () =>
      debounce(async (invNo) => {
        if (!invNo) return;
        setCheckingDuplicate(true);
        try {
          const response = await fetch(
            `http://localhost:8080/check-invoice/${encodeURIComponent(invNo)}`
          );
          if (response.ok) {
            const data = await response.json();
            setIsDuplicate(Boolean(data?.is_duplicate));
          } else {
            // If this endpoint ever fails, don't block the UI.
            setIsDuplicate(false);
          }
        } catch (err) {
          setIsDuplicate(false);
        } finally {
          setCheckingDuplicate(false);
        }
      }, 500),
    []
  );

  useEffect(() => {
    return () => {
      checkDuplicateInvoice.cancel?.();
    };
  }, [checkDuplicateInvoice]);

  const handleInvoiceNumberChange = (e) => {
    const value = e.target.value;
    setInvoiceNumber(value);
    checkDuplicateInvoice(value);
  };

  const handleVendorNameChange = (e) => setVendorName(e.target.value);

  const handleFilePick = (f) => {
    if (!f) return;
    setFile(f);
  };

  const handleFileUpload = (event) => {
    handleFilePick(event.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    handleFilePick(dropped);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!invoiceNumber || !avenueCreatedId || !file || !vendorName) {
      showDialog("Please fill in all required fields.", "error");
      return;
    }

    if (isDuplicate) {
      showDialog(
        "Invoice number is already in use. Please choose a different one.",
        "error"
      );
      return;
    }

    const metadata = JSON.stringify({
      avenueId: avenueCreatedId,
      avenueCreatedId: avenueCreatedId,
      invoiceNumber: invoiceNumber,
      remarks: remarks,
      document_type: documentType,
      vendor_name: vendorName,
      email: userEmail,
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("metadata", metadata);

    try {
      setIsDisabled(true);
      const response = await fetch("http://localhost:8080/upload-tax-invoice", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        showDialog("Invoice uploaded successfully and sent to REVIEW.", "success");

        // reset
        setInvoiceNumber("");
        setAvenueCreatedId("");
        setVendorName("");
        setFile(null);
        setRemarks("");
        setDocumentType("N/A");
        setIsDuplicate(false);
      } else {
        const errorData = await response.json().catch(() => ({}));

        if (
          errorData?.detail?.error === "Duplicate Invoice Detected" &&
          errorData?.detail?.old_avenue_id
        ) {
          showDialog(
            `Duplicate Invoice Found: Invoice Number '${invoiceNumber}' is already linked to Avenue ID '${errorData.detail.old_avenue_id}'. Please change the Invoice Number.`,
            "error"
          );
        } else {
          showDialog(
            errorData?.detail?.message ||
              "An unexpected error occurred. Please try again.",
            "error"
          );
        }
      }
    } catch (error) {
      showDialog("Failed to upload invoice. Please try again later.", "error");
    } finally {
      setIsDisabled(false);
    }
  };

  return (
    <Paper
    elevation={10}
    sx={{
      width: "min(800px, 84vw)", // ✅ smaller overall
      borderRadius: 3,
      height:600,
      overflow: "hidden",
      bgcolor: "#fff",
      position: "relative",
    }}
  >
      {/* Header */}
      <Box
          sx={{
            px: 3,
            py: 2,
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            alignItems: "center",
            gap: 2,
          }}
        >
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.5px",
            textAlign:"center",
            color: "#111827",
            marginLeft:"100px"
          }}
        >
          Upload Tax Invoice
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            onClick={onClose}
            variant="text"
            startIcon={<CloseIcon />}
            sx={{
              color: "#EF4444",
              border:"2px soild #EF4444 ",
              fontWeight: 700,
              backgroundColor: "rgba(239,68,68,0.08)" ,
            }}
          >
            Close
          </Button>
        </Box>
      </Box>

      <Box
  sx={{
    border: "1px solid #e5e7eb",
    borderRadius: 2,
    bgcolor: "#fff",
    p: 1.25,            // ⬅️ reduced
    minHeight: 280,     // ⬅️ reduced
  }}
>

  <form onSubmit={handleSubmit}>
    <Grid container spacing={2}>
      {/* Row 1 */}
      <Grid item xs={12} md={6}>
        <Typography sx={{ mb: 0.5, color: "#6B7280", fontWeight: 600, fontSize: 13 }}>
          Invoice Number
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={invoiceNumber}
          onChange={handleInvoiceNumberChange}
          placeholder="Enter invoice number"
          variant="outlined"
          error={isDuplicate}
          helperText={
            checkingDuplicate
              ? "Checking for duplicates..."
              : isDuplicate
              ? "Invoice number already exists."
              : " "
          }
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              backgroundColor: "#F3F4F6",
              "& input": {
                padding: "9px 12px",
                fontSize: 13,
              },
            },
            "& .MuiFormHelperText-root": {
              fontSize: 11,
              marginLeft: 0,
            },
          }}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography sx={{ mb: 0.5, color: "#6B7280", fontWeight: 600, fontSize: 13 }}>
          Vendors
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={vendorName}
          onChange={handleVendorNameChange}
          placeholder="Vendor name"
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              backgroundColor: "#F3F4F6",
              "& input": {
                padding: "9px 12px",
                fontSize: 13,
              },
            },
          }}
        />
      </Grid>

      {/* Row 2 */}
      <Grid item xs={12} md={6}>
        <Typography sx={{ mb: 0.5, color: "#6B7280", fontWeight: 600, fontSize: 13 }}>
          Document Type
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={documentType}
          disabled
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              backgroundColor: "#F3F4F6",
              "& input": {
                padding: "9px 12px",
                fontSize: 13,
              },
            },
          }}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography sx={{ mb: 0.5, color: "#6B7280", fontWeight: 600, fontSize: 13 }}>
          Remark
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add a remark (optional)"
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              backgroundColor: "#F3F4F6",
              "& input": {
                padding: "9px 12px",
                fontSize: 13,
              },
            },
          }}
        />
      </Grid>

      {/* Avenue ID */}
      <Grid item xs={12}>
        <TextField
          label="Avenue Created ID"
          size="small"
          disabled
          fullWidth
          variant="outlined"
          value={avenueCreatedId}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              backgroundColor: "#F3F4F6",
              "& input": {
                padding: "9px 12px",
                fontSize: 13,
              },
            },
          }}
        />
      </Grid>

      {/* Upload */}
      <Grid item xs={12}>
        <Typography sx={{ mb: 1, color: "#6B7280", fontWeight: 700, fontSize: 13 }}>
          Upload New Invoice
        </Typography>

        <Box
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          sx={{
            height: 90,                    // ⬅️ reduced
            borderRadius: "12px",
            border: "2px dashed",
            borderColor: isDragging ? "#4F7DF3" : "#9CB6FF",
            backgroundColor: "#F9FAFB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#4F7DF3" }}>
              <Link
                component="button"
                underline="always"
                onClick={() =>
                  document.getElementById("tax-invoice-file")?.click()
                }
                sx={{ fontSize: "inherit", fontWeight: "inherit" }}
              >
                Drag & Drop File
              </Link>{" "}
              <Typography component="span" sx={{ color: "#6B7280", fontSize: 13 }}>
                or
              </Typography>{" "}
              <Link
                component="button"
                underline="always"
                onClick={() =>
                  document.getElementById("tax-invoice-file")?.click()
                }
                sx={{ fontSize: "inherit", fontWeight: "inherit" }}
              >
                Upload
              </Link>
            </Typography>

            <Typography sx={{ mt: 0.5, color: "#9CA3AF", fontWeight: 600, fontSize: 11 }}>
              PDF / JPG / JPEG
            </Typography>

            {file && (
              <Typography sx={{ mt: 0.5, color: "#111827", fontWeight: 700, fontSize: 12 }}>
                Selected: {file.name}
              </Typography>
            )}
          </Box>

          <input
            id="tax-invoice-file"
            type="file"
            accept="application/pdf,image/jpeg,image/jpg"
            hidden
            onChange={handleFileUpload}
          />
        </Box>
      </Grid>

    </Grid>
  </form>

  <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
  <Button
    onClick={handleSubmit}
    variant="contained"
    disabled={isDisabled}
    sx={{
      px: 4,
      py: 1.2,
      borderRadius: "12px",
      textTransform: "none",
      fontWeight: 800,
      backgroundColor: "#4F7DF3",
      boxShadow: "0 10px 18px rgba(79,125,243,0.25)",
      "&:hover": { backgroundColor: "#3F6DE6" },
    }}
  >
    {isDisabled ? "Submitting..." : "Submit"}
  </Button>
</Box>

</Box>


      {/* Result Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: 6,
            backgroundColor: dialogSeverity === "success" ? "#E8F5E9" : "#FFCDD2",
            color: dialogSeverity === "success" ? "#2E7D32" : "#D32F2F",
            minWidth: { xs: "90vw", sm: 520 },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontWeight: 900,
            color: dialogSeverity === "success" ? "#2E7D32" : "#D32F2F",
          }}
        >
          {dialogSeverity === "success" ? (
            <CheckCircleIcon fontSize="large" sx={{ color: "#2E7D32" }} />
          ) : (
            <ErrorIcon fontSize="large" sx={{ color: "#D32F2F" }} />
          )}
          {dialogSeverity === "success" ? "Success" : "Error"}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 700 }}>{dialogMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleDialogClose}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 900,
              backgroundColor: dialogSeverity === "success" ? "#2E7D32" : "#D32F2F",
              "&:hover": {
                backgroundColor: dialogSeverity === "success" ? "#256528" : "#B71C1C",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UploadTaxInvoice;
