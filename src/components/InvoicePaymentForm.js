import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  TextField,
  Typography,
  Button,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#F3F4F6",
    borderRadius: 1.5,
    "& fieldset": {
      borderColor: "#E5E7EB",
    },
    "&:hover fieldset": {
      borderColor: "#CBD5F5",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#2563EB",
    },
  },
  "& .MuiInputBase-input": {
    fontSize: 14,
  },
  "& .MuiInputLabel-root": {
    fontSize: 13,
  },
};

const labelSx = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6B7280",
  mb: 0.5,
};

const InvoicePaymentForm = ({
  open,
  onClose,
  invoice,
  paymentMode,
  setPaymentMode,
  partialPaymentAmount,
  setPartialPaymentAmount,
  onConfirm,
  overdueAmount,
}) => {
  const {
    supplier_name,
    supplier_gstin,
    supplier_address,
    bank_name,
    bank_account_no,
    bank_ifsc,
    json_invoice_number,
    total_bill_amount,
    paid_amount,
    recipient_name,
    recipient_gstin,
    avenue_created_invoice_id,
  } = invoice || {};

  const handlePartialAmountChange = (e) => {
    const input = e.target.value;
    setPartialPaymentAmount(input);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          maxWidth: "1200px",
          width: "1200px",
          borderRadius: 3,
          boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 4,
          py: 2.5,
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: "#111827", fontSize: 18 }}
        >
          Invoice Payment
        </Typography>

        <Box display="flex" gap={1.5}>
        <Button
            variant="contained"
            onClick={onConfirm}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              borderRadius: 1.5,
              fontSize: 13,
              bgcolor: "#2563EB",
              "&:hover": { bgcolor: "#1D4ED8" },
            }}
          >
            Confirm
          </Button>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
                backgroundColor: "#FEE2E2",      // soft red
                color: "#DC2626",                // red text
                borderRadius: "9px",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                py: 1,
                fontSize: "0.9rem",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#FECACA",
                  boxShadow: "none",
                  borderColor: "error.dark",

                },
              }}
          >
            ✕ Close
          </Button>

      
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          px: 4,
          py: 3,
          backgroundColor: "#FFFFFF",
        }}
      >
        {/* Top: System + Supplier info */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>System Invoice ID</Typography>
            <TextField
              size="small"
              fullWidth
              value={avenue_created_invoice_id || ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>JSON Invoice No.</Typography>
            <TextField
              size="small"
              fullWidth
              value={json_invoice_number || ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Supplier Name</Typography>
            <TextField
              size="small"
              fullWidth
              value={supplier_name || ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Supplier GSTIN</Typography>
            <TextField
              size="small"
              fullWidth
              value={supplier_gstin || ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} md={8}>
            <Typography sx={labelSx}>Supplier Address</Typography>
            <TextField
              size="small"
              fullWidth
              value={supplier_address || ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>
        </Grid>

        {/* Recipient Details title */}
        <Box mt={4} mb={2}>
          <Typography
            sx={{
              fontWeight: 700,
              color: "#111827",
              fontSize: 15,
            }}
          >
            Recipient Details
          </Typography>
        </Box>

        {/* Recipient + bank details */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Recipient Name</Typography>
            <TextField
              size="small"
              fullWidth
              value={recipient_name || ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Recipient GSTIN</Typography>
            <TextField
              size="small"
              fullWidth
              value={recipient_gstin || ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Bank Name</Typography>
            <TextField
              size="small"
              fullWidth
              value={bank_name || ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Account No.</Typography>
            <TextField
              size="small"
              fullWidth
              value={bank_account_no || ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>IFSC Code</Typography>
            <TextField
              size="small"
              fullWidth
              value={bank_ifsc || ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Total Amount</Typography>
            <TextField
              size="small"
              fullWidth
              value={total_bill_amount ?? ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Paid Amount</Typography>
            <TextField
              size="small"
              fullWidth
              value={paid_amount ?? ""}
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Overdue Amount</Typography>
            <TextField
              size="small"
              fullWidth
              value={
                overdueAmount !== undefined && overdueAmount !== null
                  ? `₹ ${Number(overdueAmount).toFixed(2)}`
                  : ""
              }
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          </Grid>
        </Grid>

        {/* Payment type */}
        <Box mt={4}>
          <Typography
            sx={{
              fontWeight: 600,
              color: "#111827",
              mb: 1,
              fontSize: 14,
            }}
          >
            Select Payment Type
          </Typography>

          <RadioGroup
            row
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            <FormControlLabel
              value="FULL"
              control={<Radio sx={{ color: "#2563EB" }} />}
              label={
                <Typography sx={{ fontSize: 14, color: "#111827" }}>
                  Pay Full
                </Typography>
              }
            />
            <FormControlLabel
              value="PARTIAL"
              control={<Radio sx={{ color: "#4B5563" }} />}
              label={
                <Typography sx={{ fontSize: 14, color: "#4B5563" }}>
                  Pay Partially
                </Typography>
              }
            />
          </RadioGroup>

          {paymentMode === "PARTIAL" && (
            <Box mt={2} maxWidth={320}>
              <Typography sx={labelSx}>Amount to Pay (Partial)</Typography>
              <TextField
                size="small"
                fullWidth
                type="number"
                value={partialPaymentAmount}
                onChange={handlePartialAmountChange}
                sx={fieldSx}
              />
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePaymentForm;
