import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Button,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  TableFooter,
  TablePagination,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SummarizeIcon from "@mui/icons-material/Summarize";
import ReviewedHistory from "./ReviewedHistory";

const ReviewedHistoryTable = ({ invoiceData, onClose }) => {
  // 🔹 Normalize data: allow both single object and array
  const rows = Array.isArray(invoiceData)
    ? invoiceData
    : invoiceData
    ? [invoiceData]
    : [];

  const [openPdfDialog, setOpenPdfDialog] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [showReviewedHistoryForm, setShowReviewedHistoryForm] = useState(false);
  const [selectedHistoryInvoice, setSelectedHistoryInvoice] = useState(null);

  // 🔹 Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handlePdfDialogOpen = () => setOpenPdfDialog(true);
  const handlePdfDialogClose = () => setOpenPdfDialog(false);

  // 🔒 lock background scroll while this overlay is visible
  useEffect(() => {
    if (typeof document !== "undefined") {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, []);

  const getPaymentStatusColor = (status) => {
    if (status === "Reviewed") return "success";
    if (status === "Pending") return "warning";
    if (status === "NOT PAID") return "error";
    return "default";
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Slice the rows for current page
  const paginatedRows =
    rowsPerPage > 0
      ? rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      : rows;

  return (
    <>
      {/* Full-screen overlay + backdrop */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 1300,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          overflowY: "auto",
          pt: 6,
          mt: 10,
          pb: 6,
        }}
      >
        <Card
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            backgroundColor: "#F9FAFC",
            maxWidth: "1200px",
            width: "92%",
            height: "600px",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header bar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 4,
              pt: 3,
              pb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "#111827" }}
            >
              Reviewed History
            </Typography>

            <IconButton
              onClick={onClose}
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
                },
              }}
            >
              <CloseIcon />
              Close
            </IconButton>
          </Box>

          <CardContent
            sx={{
              pt: 0,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {/* Table wrapper */}
            <Box
              sx={{
                mx: 3,
                mb: 3,
                borderRadius: 2,
                border: "1px solid #E5E7EB",
                backgroundColor: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
              }}
            >
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ flex: 1, overflowY: "auto" }}
              >
                <Table
                  sx={{
                    minWidth: 900,
                    "& th, & td": {
                      borderBottom: "1px solid #E5E7EB",
                    },
                  }}
                  size="small"
                >
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#F3F4F6" }}>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          color: "#4B5563",
                          whiteSpace: "nowrap",
                          px: 3,
                          py: 1.5,
                        }}
                      >
                        Avenue ID
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          color: "#4B5563",
                          whiteSpace: "nowrap",
                          px: 3,
                          py: 1.5,
                        }}
                      >
                        Payment Status
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          color: "#4B5563",
                          whiteSpace: "nowrap",
                          px: 3,
                          py: 1.5,
                        }}
                      >
                        Supplier Name
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          color: "#4B5563",
                          whiteSpace: "nowrap",
                          px: 3,
                          py: 1.5,
                        }}
                      >
                        Invoice No.
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          color: "#4B5563",
                          whiteSpace: "nowrap",
                          px: 3,
                          py: 1.5,
                        }}
                      >
                        Created Date
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          color: "#4B5563",
                          whiteSpace: "nowrap",
                          px: 3,
                          py: 1.5,
                          textAlign: "center",
                        }}
                      >
                        Invoice
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          color: "#4B5563",
                          whiteSpace: "nowrap",
                          px: 3,
                          py: 1.5,
                          textAlign: "center",
                        }}
                      >
                        History
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {paginatedRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          sx={{
                            textAlign: "center",
                            py: 4,
                            color: "#9CA3AF",
                            fontSize: "0.9rem",
                          }}
                        >
                          No reviewed history found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((row, index) => (
                        <TableRow
                          key={row.id || row.avenue_created_invoice_id || index}
                          hover
                          sx={{
                            "&:hover": { backgroundColor: "#F9FAFB" },
                          }}
                        >
                          <TableCell
                            sx={{
                              fontSize: "0.8rem",
                              color: "#111827",
                              fontWeight: 500,
                              px: 3,
                              py: 1.5,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.avenue_created_invoice_id || "-"}
                          </TableCell>

                          <TableCell sx={{ px: 3, py: 1.5 }}>
                            <Chip
                              label={row.payment_status || "NA"}
                              size="small"
                              color={getPaymentStatusColor(row.payment_status)}
                              sx={{
                                fontSize: "0.7rem",
                                fontWeight: 500,
                                textTransform: "uppercase",
                              }}
                            />
                          </TableCell>

                          <TableCell
                            sx={{
                              fontSize: "0.8rem",
                              color: "#374151",
                              px: 3,
                              py: 1.5,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.supplier_name || "-"}
                          </TableCell>

                          <TableCell
                            sx={{
                              fontSize: "0.8rem",
                              color: "#374151",
                              px: 3,
                              py: 1.5,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.invoice_number || "-"}
                          </TableCell>

                          <TableCell
                            sx={{
                              fontSize: "0.8rem",
                              color: "#374151",
                              px: 3,
                              py: 1.5,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.created_date || "-"}
                          </TableCell>

                          <TableCell
                            sx={{ textAlign: "center", px: 3, py: 1.5 }}
                          >
                            <IconButton
                              onClick={() => {
                                const fileUrl = row.file_url;
                                if (fileUrl) {
                                  setSelectedPdfUrl(fileUrl);
                                  handlePdfDialogOpen();
                                } else {
                                  console.error(
                                    "No PDF URL found for this bill."
                                  );
                                  alert("No file available for this invoice.");
                                }
                              }}
                              color="primary"
                              size="small"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </TableCell>

                          <TableCell
                            sx={{ textAlign: "center", px: 3, py: 1.5 }}
                          >
                            <IconButton
                              onClick={() => {
                                setSelectedHistoryInvoice(row);
                                setShowReviewedHistoryForm(true);
                              }}
                              color="primary"
                              size="small"
                            >
                              <SummarizeIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>

                  <TableFooter>
                    <TableRow>
                      <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        colSpan={7}
                        count={rows.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        SelectProps={{
                          inputProps: {
                            "aria-label": "rows per page",
                          },
                          native: true,
                        }}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                      />
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableContainer>
            </Box>

            {/* Inner ReviewedHistory overlay if you click History */}
            {showReviewedHistoryForm && selectedHistoryInvoice && (
              <Box
                sx={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 1400,
                  bgcolor: "rgba(15,23,42,0.45)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  overflowY: "auto",
                  pt: 4,
                  pb: 4,
                }}
              >
                <ReviewedHistory
                  onClose={() => {
                    setShowReviewedHistoryForm(false);
                    setSelectedHistoryInvoice(null);
                  }}
                  invoiceData={selectedHistoryInvoice}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

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
            src={selectedPdfUrl}
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
    </>
  );
};

export default ReviewedHistoryTable;
