// src/components/ReviewedForm.jsx
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
  TableFooter,
  TableRow,
  Paper,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  IconButton,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import { TablePagination } from "@mui/material";

import CreateInventoryModal from "./CreateInventoryModal";

// 🔹 Mock AddInventoryModal to avoid crashes if not wired yet
const AddInventoryModal = ({ onClose }) => (
  <Box p={2}>
    <Typography>Add Inventory Modal Content</Typography>
    <Button onClick={onClose}>Close</Button>
  </Box>
);

const ReviewedForm = ({ invoiceData = {}, onClose, refreshData }) => {
  const invoice = invoiceData || {};
  // Use mock data for visual consistency if real data is absent
  const mockItems = [
      { description: "NA", shorthand: "NA", quantity: 31, remaining_quantity: 31, delivered_quantity: 0, code: "NA", unit_price: 24, received_status: "PENDING" },
      { description: "NA", shorthand: "NA", quantity: 31, remaining_quantity: 31, delivered_quantity: 0, code: "NA", unit_price: 24, received_status: "PENDING" },
      { description: "NA", shorthand: "NA", quantity: 31, remaining_quantity: 31, delivered_quantity: 0, code: "NA", unit_price: 24, received_status: "PENDING" },
  ];
  const items = invoice.items && invoice.items.length > 0 ? invoice.items : mockItems;


  const [selectedRows, setSelectedRows] = useState([]);
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
  const [isCreateInventoryOpen, setIsCreateInventoryOpen] = useState(false);
  const [openPdfDialog, setOpenPdfDialog] = useState(false);

  const {
    avenue_created_invoice_id = "SO001-AA020", 
    supplier_name = "Gowra Filling Station", 
    supplier_address = "Sy.NO. 25 / 2AB, Abutting HF - 65, Gosala Village, Penamaluru, Krishna District, Andhra Pradesh 521151", 
    supplier_gstin = "#ABCDEFGHIJ123456", 
    invoice_date = "08/03/2025", 
    invoice_number = "NA",
    file_url = "NA", 
  } = invoice;

  // Use the first mock item for initial selection to match screenshot
  useState(() => {
    if (mockItems.length > 0 && !invoice.items) {
      setSelectedRows([mockItems[0]]);
    }
  }, []);
  
  const startDate = invoice_date || "08/03/2025";
  const completedDate = startDate; // placeholder for consistency

  const handleClick = (e, item) => {
    const isChecked = e.target.checked;

    if (isChecked) {
      setSelectedRows((prev) => [...prev, item]);
    } else {
      setSelectedRows((prev) => prev.filter((row) => row !== item));
    }
  };

  const isItemSelected = (item) => selectedRows.includes(item);

  const selectedUnitPrices = selectedRows.map(
    (item) => item.unit_price_with_gst || item.unit_price || item.price || "NA"
  );

  const handleAddInventory = () => setIsAddInventoryOpen(true);
  const handleCloseAddInventory = () => setIsAddInventoryOpen(false);

  const handleCreateInventory = () => setIsCreateInventoryOpen(true);
  const handleCloseCreateInventory = () => setIsCreateInventoryOpen(false);

  const handlePdfDialogOpen = () => setOpenPdfDialog(true);
  const handlePdfDialogClose = () => setOpenPdfDialog(false);

  const InvoiceHeader = () => (
    <Paper
    sx={{
      borderRadius: "8px",
      height:"60px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      mb: 1
    }}
  >
    <Box
      sx={{
        padding: "15px 20px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography
        variant="h6"
        sx={{ fontWeight: 500, color: "#000" }}
      >
        Invoice Overview:
        <span style={{ fontWeight: 500 }}> #{avenue_created_invoice_id}</span>
      </Typography>
  
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
  
  
        <Button
          onClick={handlePdfDialogOpen}
          sx={{
            minWidth: 44,
            height: 44,
            borderRadius: "12px",
            color: "#2563EB",
            boxShadow: "none",
            p: 0,
            "&:hover": {
              backgroundColor: "#D0E2FF",
              boxShadow: "none",
            },
          }}
        >
          <VisibilityIcon sx={{ fontSize: 22 }} />
        </Button>
  
        <Button
          variant="contained"
          onClick={handleCreateInventory}
          disabled={selectedRows.length === 0}
          sx={{
            backgroundColor: "#2563EB",
            color: "#FFFFFF",
            borderRadius: "9px",
            fontWeight: 600,
            px: 3.5,
            py: 1,
            textTransform: "none",
            fontSize: "0.9rem",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "#1D4ED8",
              boxShadow: "none",
            },
            "&.Mui-disabled": {
              backgroundColor: "#BFDBFE",
              color: "#E5E7EB",
            },
          }}
        >
          Create Inventory
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
    </Paper>
  );
  

  // 2. Item Details Section 
  const ItemDetails = () => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
  
    const handleChangePage = (event, newPage) => {
      setPage(newPage);
    };
  
    const handleChangeRowsPerPage = (event) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    };
  
    const visibleItems =
      rowsPerPage > 0
        ? items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        : items;
  
    const emptyRows =
      rowsPerPage > 0
        ? Math.max(0, (1 + page) * rowsPerPage - items.length)
        : 0;
  
    return (
      <Paper
        sx={{
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          mb: 3,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            padding: "15px 20px",
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: "#000", fontSize: "1.25rem" }}
          >
            Item Details
          </Typography>
        </Box>
  
        {items.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography>No items available for this invoice.</Typography>
          </Box>
        ) : (
          <>
          <TableContainer>
  <Table
    size="small"
    sx={{
      minWidth: 900,
      height:400,
      "& th, & td": { whiteSpace: "nowrap" },
    }}
  >
    <TableHead sx={{ backgroundColor: "#F5F5F5" }}>
      <TableRow>
        <TableCell padding="checkbox" />
        <TableCell sx={{ fontWeight: "bold", color: "#555" }}>
          Name / Description
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", color: "#555" }} align="center">
          Shorthand
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", color: "#555" }} align="center">
          Qty
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", color: "#555" }} align="center">
          Remaining Qty
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", color: "#555" }} align="center">
          Delivered Qty
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", color: "#555" }} align="center">
          Code
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", color: "#555" }} align="right">
          Unit Price
        </TableCell>
      </TableRow>
    </TableHead>

    <TableBody>
      {visibleItems.map((item, index) => {
        const isDisabled =
          item.remaining_quantity === 0 ||
          item.received_status === "RECEIVED";

        return (
          <TableRow
            key={index}
            hover
            sx={{
              "&:last-child td, &:last-child th": { borderBottom: 0 },
            }}
          >
            <TableCell padding="checkbox">
              <Checkbox
                checked={isItemSelected(item)}
                onChange={(e) => handleClick(e, item)}
                disabled={isDisabled}
                size="small"
              />
            </TableCell>

            <TableCell>{item.description || "NA"}</TableCell>

            <TableCell align="center">
              {item.shorthand || "NA"}
            </TableCell>

            <TableCell align="center">
              {item.quantity || "NA"}
            </TableCell>

            <TableCell align="center">
              {item.remaining_quantity || 0}
            </TableCell>

            <TableCell align="center">
              {item.delivered_quantity || 0}
            </TableCell>

            <TableCell align="center">
              {item.code || "NA"}
            </TableCell>

            <TableCell align="right">
              {item.unit_price_with_gst || item.unit_price || "24"}
            </TableCell>
          </TableRow>
        );
      })}

      {emptyRows > 0 && (
        <TableRow style={{ height: 33 * emptyRows }}>
          <TableCell colSpan={8} />
        </TableRow>
      )}
    </TableBody>

    {/* ✅ Pagination inside Table, right-aligned */}
    <TableFooter>
      <TableRow>
        <TableCell colSpan={8}>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={items.length}
              rowsPerPage={rowsPerPage}
              page={page}
              SelectProps={{
                inputProps: { "aria-label": "rows per page" },
                native: true,
              }}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Box>
        </TableCell>
      </TableRow>
    </TableFooter>
  </Table>
</TableContainer>

          </>
        )}
      </Paper>
    );
  };
  

  const VendorDetails = () => (
    <Paper
      sx={{
        borderRadius: "10px",
        padding: 3,
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        mb: 3,
      }}
    >
      <Typography
        variant="h6"
        sx={{ fontWeight: 600, mb: 2.5, color: "#000", fontSize: "1.25rem" }}
      >
        Vendor Details
      </Typography>
  
      <Grid container spacing={4}>
        {/* Vendor Name */}
        <Grid item xs={12} md={3}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "#555", fontSize: "0.85rem" }}
          >
            Vendor Name
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 400, mt: 0.5 }}>
            {supplier_name}
          </Typography>
        </Grid>
  
        {/* GSTIN */}
        <Grid item xs={12} md={3}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "#555", fontSize: "0.85rem" }}
          >
            GSTIN
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 400, mt: 0.5 }}>
            {supplier_gstin || "NA"}
          </Typography>
        </Grid>
          {/* Start Date */}
          <Grid item xs={12} md={3}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "#555", fontSize: "0.85rem" }}
          >
            Start Date
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 400, mt: 0.5 }}>
            {startDate}
          </Typography>
        </Grid>
  
        {/* Completed Date */}
        <Grid item xs={12} md={3}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "#555", fontSize: "0.85rem" }}
          >
            Completed Date
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 400, mt: 0.5 }}>
            {completedDate}
          </Typography>
        </Grid>
        {/* Vendor Address (Full width) */}
        <Grid item xs={12}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "#555", fontSize: "0.85rem" }}
          >
            Vendor Address
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 400, mt: 0.5 }}>
            {supplier_address}
          </Typography>
        </Grid>
  

      </Grid>
    </Paper>
  );
  

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
      >    {/* 🔹 Invoice Header (Top) */}
      <InvoiceHeader />
      <VendorDetails />
      <ItemDetails />
      <Dialog
        open={isAddInventoryOpen}
        onClose={handleCloseAddInventory}
        maxWidth="md"
      >
        <AddInventoryModal
          materialDetails={selectedRows}
          invoiceData={invoiceData}
          unitPrices={selectedUnitPrices}
          onClose={handleCloseAddInventory}
        />
      </Dialog>

      {/* 🔹 Create Inventory Modal */}
      <Dialog
  open={isCreateInventoryOpen}
  onClose={handleCloseCreateInventory}
  fullWidth
  maxWidth="lg"          // give it a big enough width
  scroll="body"
  PaperProps={{
    sx: {
      borderRadius: 3,
      overflow: "visible", // so the shadow from the inner Box isn't clipped
    },
  }}
>
  <CreateInventoryModal
    materialDetails={selectedRows}
    invoiceData={invoiceData}
    unitPrices={selectedUnitPrices}
    onClose={handleCloseCreateInventory}
    refreshData={refreshData}
  />
</Dialog>


      {/* 🔹 PDF Viewer Dialog */}
      <Dialog
        open={openPdfDialog}
        onClose={handlePdfDialogClose}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          Invoice PDF
          <IconButton
            aria-label="close"
            onClick={handlePdfDialogClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <iframe
            src={file_url}
            width="100%"
            height="700px"
            style={{ border: "none" }}
            title="Invoice PDF"
          />
        </DialogContent>
      </Dialog>
      </Card>
    </Box>
  );
};

export default ReviewedForm;