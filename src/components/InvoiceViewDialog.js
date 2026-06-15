// InvoiceViewPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Typography,
  Button,
  Grid,
  Box,
  Paper,
  TextField,
  MenuItem,
  Snackbar,
  Divider,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import axios from "axios";

const paymentModes = ["Cash", "Bank Transfer", "Cheque", "UPI"];

const STATUS_STYLE = {
  Pending: { bg: "#FFF4E5", fg: "#8A4B00", border: "#FFD7A3" },
  Approved: { bg: "#E8F0FE", fg: "#185ABC", border: "#C6DAFF" },
  Paid: { bg: "#E6F4EA", fg: "#137333", border: "#C9E7D0" },
  Recheck: { bg: "#FCE8E6", fg: "#B3261E", border: "#F6C5C1" },
};

const fmtINR = (v) => {
  const n = Number(v);
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `₹ ${safe.toFixed(2)}`;
  }
};

const Field = ({ label, value }) => (
  <Box sx={{ mb: 2.2 }}>
    <Typography sx={{ fontSize: 12, color: "#6b7280", mb: 0.4 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
      {value || "-"}
    </Typography>
  </Box>
);

const AmountRow = ({ label, value, highlight = false }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      px: 2,
      py: 1.2,
      borderBottom: "1px solid #eef2f7",
      background: highlight ? "#dbe7ff" : "transparent",
      borderRadius: highlight ? 1 : 0,
      fontSize: 13,
    }}
  >
    <Typography sx={{ fontSize: 13, color: highlight ? "#1f2a44" : "#374151", fontWeight: highlight ? 800 : 500 }}>
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: 13,
        color: "#111827",
        fontWeight: highlight ? 900 : 600,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      }}
    >
      {fmtINR(value)}
    </Typography>
  </Box>
);

const InvoiceViewDialog = ({ data, onClose, onSuccess }) => {
  const [mode, setMode] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState("");
  const [paidAmount, setPaidAmount] = useState(""); // keep as string to avoid rounding
  const [netPayable, setNetPayable] = useState(0);
  const [alreadyPaid, setAlreadyPaid] = useState(0);

  const printRef = useRef(null);

  useEffect(() => {
    if (data) {
      setMode(data.payment_mode || "");
      setRemarks(data.remarks || "");
      const ap = Number(data.paid_amount || 0);
      const na = Number(data.net_amount || 0);
      setAlreadyPaid(ap);
      setNetPayable(Math.max(na - ap, 0));
      setPaidAmount("");
    }
  }, [data]);

  const numericPaidInput = useMemo(() => {
    const n = Number(paidAmount);
    return Number.isFinite(n) ? n : 0;
  }, [paidAmount]);

  const remainingAfterThisPayment = useMemo(() => {
    return Math.max(Number(netPayable) - numericPaidInput, 0);
  }, [netPayable, numericPaidInput]);

  const isPaid = data?.status === "Paid";
  const statusSty = STATUS_STYLE[data?.status] || {
    bg: "#F5F5F5",
    fg: "#444",
    border: "#e5e7eb",
  };

  const handleClampChange = (raw) => {
    if (raw === "") return setPaidAmount("");
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    if (n < 0) return setPaidAmount("0");
    if (n > netPayable) return setPaidAmount(String(netPayable));
    setPaidAmount(raw);
  };

  const handlePercent = (pct) => {
    const val = (Number(netPayable) * pct) / 100;
    setPaidAmount(String(val)); // exact string, no rounding
  };

  const handlePayFull = () => setPaidAmount(String(netPayable));

  const handleStatusChange = async (next_status) => {
    if (!data) return;
    setLoading(true);
    try {
      await axios.post(
        "http://localhost:8080/payments/update-status",
        {
          payment_id: data.payment_id,
          updated_mode: mode,
          updated_remarks: remarks,
          paid_amount: paidAmount === "" ? 0 : Number(paidAmount),
          next_status,
        },
        {
          headers: {
            "x-user-email":
              localStorage.getItem("email") || "unknown@avenuerealty.in",
          },
        }
      );
      setSnackbar(`Marked as ${next_status}`);
      onSuccess && onSuccess();
      onClose && onClose(); // return to list
    } catch (err) {
      console.error("Failed to update payment", err);
      setSnackbar("Failed to update payment");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // prints the page. If you want “only voucher”, I can add @media print CSS next.
    window.print();
  };

  if (!data) return null;

  const {
    payment_id,
    worker_name,
    worker_id,
    worker_type,
    gross_amount,
    tds_amount,
    tds_percent,
    net_amount,
    status,
    payment_mode,
  } = data;

  // display-friendly values (UI only)
  const preparedOn = data?.updated_at || data?.created_at || new Date().toISOString();
  const preparedOnText = (() => {
    try {
      return new Date(preparedOn).toLocaleString("en-IN");
    } catch {
      return new Date().toLocaleString("en-IN");
    }
  })();

  return (
    <>
      <Box
        sx={{
          p: 2,
          backgroundColor: "#f3f4f6",
          minHeight: "96%",
          ml: "14px",
          mt: "-1%",
          borderRadius: 3,
        }}
      >
        {/* Top Toolbar */}
        <Paper
          elevation={0}
          className="no-print"
          sx={{
            px: 2,
            py: 1.25,
            bgcolor: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            border: "1px solid #e5e7eb",
            borderRadius: 3,
            mb: 2,
          }}
        >
          <Typography sx={{ fontWeight: 900, color: "#111827" }}>
            Payment Voucher
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              onClick={onClose}
              startIcon={<CloseIcon />}
              variant="outlined"
              size="small"
              sx={{
                color: "error.main",
                borderColor: "error.main",
                textTransform: "none",
                borderRadius: 2,
                borderWidth: 2,
                "&:hover": { borderColor: "error.dark", color: "error.dark" },
              }}
            >
              Close
            </Button>
          </Box>
        </Paper>

        {/* Voucher Area */}
        <Box >
          <Grid container spacing={2}>
            {/* LEFT: Worker Detail */}
            <Grid item xs={12} md={8}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  overflow: "hidden",
                  height:"360px"
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 14, color: "#111827" }}>
                    Worker Details
                  </Typography>
                </Box>
                <Divider />

                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Field label="Name" value={worker_name} />
                      <Field label="Type" value={worker_type} />
                      <Field label="Payment Mode" value={mode || payment_mode || "-"} />
                      <Box sx={{ mt: 1 }}>
                        <Typography sx={{ fontSize: 12, color: "#6b7280", mb: 0.8 }}>
                          Status
                        </Typography>
                        <Chip
                          label={(status || "-").toUpperCase()}
                          size="small"
                          sx={{
                            fontWeight: 900,
                            fontSize: 11,
                            borderRadius: 1,
                            px: 1.2,
                            bgcolor: statusSty.bg,
                            color: statusSty.fg,
                            border: `1px solid ${statusSty.border}`,
                          }}
                        />
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Field label="Worker ID" value={worker_id} />
                      <Field label="Payment ID" value={payment_id} />
                      <Field label="Prepared On" value={preparedOnText} />
                    </Grid>
                  </Grid>
                </Box>

                {/* Subtle paid watermark like your old version (kept) */}
                {isPaid && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      userSelect: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.08,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 120,
                        fontWeight: 1000,
                        color: "#16a34a",
                        transform: "rotate(-20deg)",
                        letterSpacing: 10,
                      }}
                    >
                      PAID
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* RIGHT: Payment Details */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  overflow: "hidden",
                  height:"360px"

                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 14, color: "#111827" }}>
                    Payment Details
                  </Typography>
                </Box>

                <Box sx={{ px: 2, pb: 2 }}>
                  <Box
                    sx={{
                      mt: 0.5,
                      border: "1px solid #eef2f7",
                      borderRadius: 2,
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        px: 2,
                        py: 1.1,
                        background: "#f9fafb",
                        borderBottom: "1px solid #eef2f7",
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>
                        Details
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>
                        Amount
                      </Typography>
                    </Box>

                    <AmountRow label="Gross Amount" value={gross_amount} />
                    <AmountRow label={`TDS (${Number(tds_percent || 0)}%)`} value={tds_amount} />
                    {/* keep your original net_amount display */}
                    <AmountRow label="Net Amount" value={net_amount} />
                    {/* “Advance Payment” matches your alreadyPaid */}
                    <AmountRow label="Advance Payment" value={alreadyPaid} />
                    {/* paying now uses current input */}
                    <AmountRow label="Paying Amount" value={numericPaidInput} />
                    {/* highlight blue row like screenshot */}
                    <AmountRow
                      label="Balance after this payment"
                      value={remainingAfterThisPayment}
                      highlight
                    />
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Controls (kept fully — just styled cleaner and below cards like a real voucher screen) */}
          {!isPaid && (
            <Paper
              elevation={0}
              className="no-print"
              sx={{
                mt: 2,
                borderRadius: 3,
                border: "1px solid #e5e7eb",
                background: "#fff",
                overflow: "hidden",
              }}
            >
              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography sx={{ fontSize: 12, color: "#6b7280", mb: 0.6, fontWeight: 800 }}>
                      PAYMENT MODE
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      sx={{
                        "& .MuiOutlinedInput-root": { background: "#f9fafb" },
                      }}
                    >
                      {paymentModes.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>

                    <Box sx={{ mt: 2 }}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", mb: 0.6, fontWeight: 800 }}>
                        AMOUNT TO PAY NOW
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={paidAmount}
                        onChange={(e) => handleClampChange(e.target.value)}
                        placeholder="Enter exact amount (₹)"
                        inputProps={{ min: 0, max: netPayable, step: "any" }}
                        sx={{
                          "& .MuiOutlinedInput-root": { background: "#f9fafb" },
                        }}
                      />

                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={handlePayFull}
                          sx={{ textTransform: "none", borderRadius: 2 }}
                        >
                          Pay Full
                        </Button>
                        {[25, 50, 75].map((p) => (
                          <Button
                            key={p}
                            variant="outlined"
                            size="small"
                            onClick={() => handlePercent(p)}
                            sx={{ textTransform: "none", borderRadius: 10 }}
                          >
                            {p}%
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography sx={{ fontSize: 12, color: "#6b7280", mb: 0.6, fontWeight: 800 }}>
                      REMARKS / NOTES
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      minRows={6}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Payment note for records…"
                      sx={{
                        "& .MuiOutlinedInput-root": { background: "#f9fafb" },
                      }}
                    />

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1.5,
                        mt: 2,
                      }}
                    >
                      <Button
                        variant="outlined"
                        color="warning"
                        disabled={loading}
                        onClick={() => handleStatusChange("Recheck")}
                        sx={{ textTransform: "none", borderRadius: 2, px: 3, fontWeight: 800 }}
                      >
                        Send for Recheck
                      </Button>

                      <Button
                        variant="contained"
                        color="primary"
                        disabled={
                          loading ||
                          Number(netPayable) <= 0 ||
                          (paidAmount !== "" && Number(paidAmount) <= 0)
                        }
                        onClick={() => handleStatusChange("Paid")}
                        sx={{
                          textTransform: "none",
                          borderRadius: 2,
                          px: 3,
                          fontWeight: 900,
                          backgroundColor: "#4f7cf3",
                          "&:hover": { backgroundColor: "#3b67e8" },
                        }}
                      >
                        Mark as Paid
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar("")}
        message={snackbar}
      />
    </>
  );
};

export default InvoiceViewDialog;
