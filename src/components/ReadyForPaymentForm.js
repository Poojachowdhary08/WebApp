// src/components/ReadyForPaymentForm.jsx
import React, { useState, useEffect } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Grid,
  TablePagination,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import InvoicePaymentForm from "./InvoicePaymentForm"; // Adjust path if needed

const ReadyForPaymentForm = ({ invoiceData = {}, onClose }) => {
  const {
    avenue_created_invoice_id = "NA",
    supplier_name = "NA",
    supplier_address = "NA",
    supplier_gstin = "NA",
    invoice_date = "NA",
    invoice_number = "NA",
    file_url = "NA",
    items = [],
    amount_to_pay = 0,
    paid_amount = 0,
    payment_status = "NOT_PAID",
    taxes_cgst = 0,
    taxes_sgst = 0,
    taxes_igst = 0,
    start_date,
    completed_date,
  } = invoiceData;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [paidAmount, setPaidAmount] = useState(paid_amount);
  const [overdueAmount, setOverdueAmount] = useState(
    amount_to_pay - paid_amount
  );
  const [remainingAmountToPay, setRemainingAmountToPay] =
    useState(amount_to_pay);

  const [partialPaymentDialogOpen, setPartialPaymentDialogOpen] =
    useState(false);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
  const [openPdfDialog, setOpenPdfDialog] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogSeverity, setDialogSeverity] = useState("success");

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const userEmail = localStorage.getItem("email");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMode, setPaymentMode] = useState(""); // "PARTIAL" or "FULL"

  // PAGINATION STATE
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5); // Default to 5 rows per page

  useEffect(() => {
    setRemainingAmountToPay(amount_to_pay - paid_amount);
    setOverdueAmount(amount_to_pay - paid_amount);
  }, [amount_to_pay, paid_amount]);

  // PAGINATION HANDLERS
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset page to 0 when rows per page changes
  };

  // DATA SLICING LOGIC
  const paginatedItems = items.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const showDialog = (message, severity) => {
    setDialogMessage(message);
    setDialogSeverity(severity);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  const handlePartialPaymentDialogClose = () => {
    setPartialPaymentDialogOpen(false);
    setPartialPaymentAmount("");
  };

  const fetchTransactionHistory = async (entityType, entityId) => {
    try {
      const response = await fetch(
        `http://localhost:8080/get-transactions/${entityType}/${entityId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transaction history.");
      }

      const data = await response.json();
      setTransactionHistory(data.transactions || []);
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error(error);
      showDialog(" No transaction to Show history.","error");
    }
  };

  const handlePartialPaymentSubmit = async () => {
    const parsedAmount = parseFloat(partialPaymentAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showDialog("Invalid amount entered.", "error");
      return;
    }

    if (parsedAmount > overdueAmount) {
      showDialog(
        `Partial payment cannot exceed the overdue amount of ₹${overdueAmount.toFixed(
          2
        )}.`,
        "error"
      );
      return;
    }

    try {
      const payload = {
        avenue_created_invoice_id,
        payment_status: "PARTIAL",
        paid_amount: parsedAmount,
        email: userEmail,
      };

      const response = await fetch(
        "http://localhost:8080/update-payment-status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Failed to update payment status.");

      const data = await response.json();

      setPaidAmount(data.paid_amount);
      setOverdueAmount(data.overdue_amount);
      setRemainingAmountToPay(data.overdue_amount);

      showDialog(
        `Partial payment of ₹${parsedAmount} recorded successfully.`,
        "success"
      );
      handlePartialPaymentDialogClose();
    } catch (error) {
      console.error(error);
      showDialog("Error updating payment status. Please try again.", "error");
    }
  };

  const handleFullPayment = async () => {
    try {
      const payload = {
        avenue_created_invoice_id,
        payment_status: "PAID",
        paid_amount: amount_to_pay,
        overdue_amount: 0,
        email: userEmail,
      };

      const response = await fetch(
        "http://localhost:8080/update-payment-status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Failed to update payment status.");

      setPaidAmount(amount_to_pay);
      setOverdueAmount(0);
      setRemainingAmountToPay(0);

      showDialog("Full payment recorded successfully.", "success");
    } catch (error) {
      console.error(error);
      showDialog("Error updating payment status. Please try again.", "error");
    }
  };

  const handlePdfDialogOpen = () => {
    setOpenPdfDialog(true);
  };

  const handlePdfDialogClose = () => {
    setOpenPdfDialog(false);
  };

  const statusConfig = (() => {
    const status = (payment_status || "").toUpperCase();
    if (status === "PAID") {
      return {
        label: "Paid",
        bg: "rgba(34,197,94,0.12)",
        color: "#15803D",
      };
    }
    if (status === "PARTIAL") {
      return {
        label: "Partially Paid",
        bg: "rgba(59,130,246,0.12)",
        color: "#1D4ED8",
      };
    }
    return {
      label: "Not Paid",
      bg: "rgba(251,191,36,0.16)",
      color: "#92400E",
    };
  })();

  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    })}`;
  };

  return (
    <Box
      sx={{
        width: "100%",
        backgroundColor: "#F5F7FA",
        minHeight: "100vh",
        marginTop:"-30px"
      }}
    >
      <Card
        sx={{
          width: "100%",
          borderRadius: 4,
          boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
          backgroundColor: "#FFFFFF",
          p: 3,
        }}
      >
      {/* ───────────── Header ───────────── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: "#111827", letterSpacing: 0.2 }}
          >
            Invoice Overview:{" "}
            <Box component="span" sx={{ color: "#111827" }}>
              #{avenue_created_invoice_id}
            </Box>
          </Typography>

          <Box
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: statusConfig.bg,
              color: statusConfig.color,
            }}
          >
            ● {statusConfig.label}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton
            onClick={handlePdfDialogOpen}
            sx={{
              bgcolor: "#E5EDFF",
              "&:hover": { bgcolor: "#D3E3FF" },
            }}
          >
            <VisibilityIcon sx={{ color: "#2563EB" }} />
          </IconButton>

          <IconButton
            onClick={() =>
              fetchTransactionHistory("INVOICE", avenue_created_invoice_id)
            }
            sx={{
              bgcolor: "#E5EDFF",
              "&:hover": { bgcolor: "#D3E3FF" },
            }}
          >
            <HistoryIcon sx={{ color: "#2563EB" }} />
          </IconButton>

          <Button
            variant="contained"
            onClick={() => {
              setPaymentMode("FULL");
              setShowPaymentForm(true);
            }}
            disabled={remainingAmountToPay <= 0 && overdueAmount <= 0}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "9px",
              px: 3,
              py: 1,
              boxShadow: "0 10px 20px rgba(37,99,235,0.25)",
            }}
          >
            Make Payment
          </Button>

          <Button
    variant="text"
    onClick={onClose}
    sx={{
      borderRadius: 2,
      border: "1px solid #FCA5A5",
      color: "#DC2626",
      backgroundColor: "rgba(220,38,38,0.06)",
      fontWeight: 900,
      px: 2,
      "&:hover": {
        backgroundColor: "rgba(220,38,38,0.10)",
        borderColor: "#EF4444",
      },
    }}
  >
    X&nbsp;Close
  </Button>
        </Box>
      </Box>

      {/* Payment dialog (same functionality) */}
      <InvoicePaymentForm
        open={showPaymentForm}
        onClose={() => {
          setShowPaymentForm(false);
          setPartialPaymentAmount("");
        }}
        invoice={invoiceData}
        paymentMode={paymentMode}
        setPaymentMode={setPaymentMode}
        partialPaymentAmount={partialPaymentAmount}
        setPartialPaymentAmount={setPartialPaymentAmount}
        onConfirm={
          paymentMode === "FULL" ? handleFullPayment : handlePartialPaymentSubmit
        }
        overdueAmount={overdueAmount}
        setOverdueAmount={setOverdueAmount}
      />

      {/* ───────────── Vendor & Price Details (Side-by-Side) ───────────── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* 1️⃣ Vendor Details (MODIFIED) */}
        <Grid item xs={12} lg={6}>
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
              height: "100%",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              {/* --- VENDOR INFO --- */}
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: "#111827", mb: 2 }}
              >
                Vendor & Invoice Details
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "#9CA3AF", textTransform: "uppercase" }}
                    >
                      Vendor Name
                    </Typography>
                    <Typography sx={{ fontWeight: 600, color: "#111827" }}>
                      {supplier_name}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "#9CA3AF", textTransform: "uppercase" }}
                    >
                      GSTIN
                    </Typography>
                    <Typography sx={{ fontWeight: 500, color: "#111827" }}>
                      {supplier_gstin}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#9CA3AF", textTransform: "uppercase" }}
                    >
                      Invoice Number
                    </Typography>
                    <Typography sx={{ color: "#111827", fontWeight: 500 }}>
                      {invoice_number}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "#9CA3AF", textTransform: "uppercase" }}
                    >
                      Invoice Date
                    </Typography>
                    <Typography sx={{ color: "#111827", fontWeight: 500 }}>
                      {invoice_date}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "#9CA3AF", textTransform: "uppercase" }}
                    >
                      System Invoice ID
                    </Typography>
                    <Typography sx={{ color: "#111827", fontWeight: 500 }}>
                      {avenue_created_invoice_id}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#9CA3AF", textTransform: "uppercase" }}
                    >
                      Completed Date
                    </Typography>
                    <Typography sx={{ color: "#111827", fontWeight: 500 }}>
                      {completed_date || "NA"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, mb: 3, borderTop: "1px dashed #E5E7EB", pt: 2 }}>
                <Typography
                  variant="caption"
                  sx={{ color: "#9CA3AF", textTransform: "uppercase" }}
                >
                  Vendor Address
                </Typography>
                <Typography sx={{ color: "#4B5563", lineHeight: 1.6 }}>
                  {supplier_address}
                </Typography>
              </Box>

              {/* --- FINANCIAL SUMMARY (MOVED FROM PRICE DETAILS) --- */}

            </CardContent>
          </Card>
        </Grid>

        {/* 2️⃣ Price Details (Taxes Only - MODIFIED) */}
        <Grid item xs={12} lg={6}>
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
              height: "100%",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: "#111827", mb: 2 }}
              >
                Tax Breakdown
              </Typography>

              {/* Removed Total Payable, Paid, Outstanding lines */}

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                  color: "#6B7280",
                }}
              >
                <Typography>CGST</Typography>
                <Typography>
                  ₹{parseFloat(taxes_cgst || 0).toFixed(2)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                  color: "#6B7280",
                }}
              >
                <Typography>SGST</Typography>
                <Typography>
                  ₹{parseFloat(taxes_sgst || 0).toFixed(2)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                  color: "#6B7280",
                }}
              >
                <Typography>IGST</Typography>
                <Typography>
                  ₹{parseFloat(taxes_igst || 0).toFixed(2)}
                </Typography>
              </Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: "#111827", mt: 3, mb: 1.5 }}
              >
                Payment Summary
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                  color: "#4B5563",
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                <Typography>Total Payable</Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {formatCurrency(amount_to_pay)}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                  color: "#6B7280",
                }}
              >
                <Typography>Amount Paid</Typography>
                <Typography>
                  {formatCurrency(paidAmount)}
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 1.5,
                  px: 2,
                  py: 1.2,
                  borderRadius: 2.5,
                  backgroundColor: "#F3F4F6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                <Typography>Outstanding Amount</Typography>
                <Typography>
                  {formatCurrency(overdueAmount)}
                </Typography>
              </Box>
              {/* Removed all other lines related to total amount/paid amount */}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3️⃣ Item Details (Table with Pagination - UNCHANGED from last iteration) */}
      <Card
        sx={{
          borderRadius: 4,
          boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.5,
            borderBottom: "1px solid #E5E7EB",
            bgcolor: "#F9FAFB",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: "#111827" }}
          >
            Item Details
          </Typography>
        </Box>

        <CardContent sx={{ p: 0 }}>
          {items.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography sx={{ color: "#6B7280" }}>
                No items available for this invoice.
              </Typography>
            </Box>
          ) : isMobile ? (
            <Box sx={{ p: 2 }}>
              {items.map((item, index) => (
                <Card
                  key={index}
                  sx={{
                    mb: 2,
                    borderRadius: 3,
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Typography>
                      <b>Name/Description:</b> {item.description || "N/A"}
                    </Typography>
                    <Typography>
                      <b>HSN Code:</b> {item.code || "N/A"}
                    </Typography>
                    <Typography>
                      <b>Qty:</b> {item.quantity || 0}
                    </Typography>
                    <Typography>
                      <b>Rate:</b> {formatCurrency(item.unit_price)}
                    </Typography>
                    <Typography>
                      <b>Amount:</b> {formatCurrency(item.taxable_value)}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <>
            <TableContainer
    sx={{ maxHeight: 300, border: "1px solid #E5E7EB", borderRadius: 1 }}
  >
    <Table stickyHeader size="small" sx={{ tableLayout: "fixed" }}>
      <TableHead>
      <TableRow sx={{ backgroundColor: "#F9FAFB" }}>

                      <TableCell
                        sx={{ color: "#111827", fontWeight: 700, fontSize: 13 }}
                      >
                        Name/Description
                      </TableCell>
                      <TableCell
                        sx={{ color: "#111827", fontWeight: 700, fontSize: 13 }}
                      >
                        HSN Code
                      </TableCell>
                      <TableCell
                        sx={{ color: "#111827", fontWeight: 700, fontSize: 13 }}
                      >
                        Qty
                      </TableCell>
                      <TableCell
                        sx={{ color: "#111827", fontWeight: 700, fontSize: 13 }}
                      >
                        Rate
                      </TableCell>
                      <TableCell
                        sx={{ color: "#111827", fontWeight: 700, fontSize: 13 }}
                      >
                        IGST
                      </TableCell>
                      <TableCell
                        sx={{ color: "#111827", fontWeight: 700, fontSize: 13 }}
                      >
                        CGST
                      </TableCell>
                      <TableCell
                        sx={{ color: "#111827", fontWeight: 700, fontSize: 13 }}
                      >
                        SGST
                      </TableCell>
                      <TableCell
                        sx={{ color: "#111827", fontWeight: 700, fontSize: 13 }}
                      >
                        Amount
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedItems.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{item.description || "N/A"}</TableCell>
                        <TableCell>{item.code || "N/A"}</TableCell>
                        <TableCell>{item.quantity || 0}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell>0.00</TableCell>
                        <TableCell>0.00</TableCell>
                        <TableCell>0.00</TableCell>
                        <TableCell>
                          {formatCurrency(item.taxable_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Optionally add empty rows to maintain a consistent height */}
                    {rowsPerPage > items.length &&
                      Array(rowsPerPage - paginatedItems.length)
                        .fill(null)
                        .map((_, index) => (
                          <TableRow key={`empty-${index}`} style={{ height: 53 }}>
                            <TableCell colSpan={8} />
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={items.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ───────────── Dialogs (Unchanged) ───────────── */}
      {/* PDF Dialog */}
      <Dialog
        open={openPdfDialog}
        onClose={handlePdfDialogClose}
        fullWidth
        maxWidth="lg"
      >
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

      {/* Success / Error Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        PaperProps={{
          sx: {
            backgroundColor:
              dialogSeverity === "success" ? "#e1fcd4" : "#FDECEA",
          },
        }}
      >
        <DialogTitle>
          {dialogSeverity === "success" ? "Success" : "Error"}
        </DialogTitle>
        <DialogContent>{dialogMessage}</DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        PaperProps={{
          sx: {
            width: "80%",
            maxWidth: "80%",
            padding: "20px",
          },
        }}
      >
        <DialogTitle>Transaction History</DialogTitle>
        <DialogContent>
          {transactionHistory.length === 0 ? (
            <Typography>No transaction history available.</Typography>
          ) : (
            <TableContainer
            component={Box}
            sx={{
              borderRadius: 2,
              border: "1px solid #E5E7EB",
              overflow: "hidden", // keeps header background flush with border
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: "#F3F4F6",
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Transaction Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Total Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Paid Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Avenue Invoice ID
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                </TableRow>
              </TableHead>
        
              <TableBody>
                {transactionHistory.map((transaction, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      "&:nth-of-type(odd)": {
                        backgroundColor: "#FFFFFF",
                      },
                      "&:nth-of-type(even)": {
                        backgroundColor: "#F9FAFB",
                      },
                    }}
                  >
                    <TableCell>{transaction.transaction_type}</TableCell>
        
                    <TableCell align="right">
                      {formatCurrency(transaction.transaction_amount)}
                    </TableCell>
        
                    <TableCell align="right">
                      {formatCurrency(transaction.total_amount)}
                    </TableCell>
        
                    <TableCell align="right">
                      {formatCurrency(transaction.paid_amount)}
                    </TableCell>
        
                    <TableCell>
                      {transaction.avenue_created_invoice_id || "NA"}
                    </TableCell>
        
                    <TableCell>
                      {transaction.details && typeof transaction.details === "object"
                        ? Object.entries(transaction.details).map(([key, value]) => (
                            <Typography
                              key={key}
                              variant="body2"
                              sx={{ lineHeight: 1.4 }}
                            >
                              {key}: {String(value)}
                            </Typography>
                          ))
                        : "-"}
                    </TableCell>
        
                    <TableCell>
                      {transaction.timestamp
                        ? new Date(transaction.timestamp).toLocaleString("en-IN")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      </Card>
    </Box>
  );
};

export default ReadyForPaymentForm;