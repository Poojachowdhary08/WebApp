import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography, CircularProgress,
  Box, TextField, InputAdornment, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TablePagination, TableSortLabel
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";

const getComparator = (order, orderBy) => {
  return (a, b) => {
    const valA = a[orderBy];
    const valB = b[orderBy];
    if (valA == null) return 1;
    if (valB == null) return -1;
    if (typeof valA === "string") {
      return order === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    return order === "asc" ? valA - valB : valB - valA;
  };
};

const OpenItemDialog = ({ open, onClose, itemName }) => {
  const [summary, setSummary] = useState(null);
  const [receivedDates, setReceivedDates] = useState([]);
  const [issuedLogs, setIssuedLogs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filteredIssued, setFilteredIssued] = useState([]);
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("created_at");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (!open || !itemName) return;

    setLoading(true);
    Promise.all([
      fetch(`http://localhost:8080/get-stock-summary/${itemName}`).then(res => res.json()),
      fetch(`http://localhost:8080/inventory/${itemName}`).then(res => res.json()),
    ])
      .then(([summaryData, issuedData]) => {
        setSummary({
          item_name: summaryData.item_name,
          total_available_quantity: summaryData.total_available_quantity,
          total_value: summaryData.total_value,
        });
        setReceivedDates(summaryData.received_dates || []);
        setIssuedLogs(issuedData || []);
        setFilteredIssued(issuedData || []);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
      })
      .finally(() => setLoading(false));
  }, [open, itemName]);

  useEffect(() => {
    const q = search.toLowerCase();
    const filtered = issuedLogs.filter((log) =>
      log.engineer_name?.toLowerCase().includes(q) ||
      log.project_name?.toLowerCase().includes(q) ||
      log.property_name?.toLowerCase().includes(q)
    );
    setFilteredIssued(filtered);
    setPage(0);
  }, [search, issuedLogs]);

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="100%" sx={{ mt: 6 }}>
      <DialogTitle sx={{ fontWeight: "bold", color: "#0B3C5D", pr: 5 }}>
        📦 Item Details – {itemName}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* 📊 Summary Block */}
            {summary && (
              <Paper elevation={2} sx={{ backgroundColor: "#f5faff", p: 2, borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom color="#0B3C5D">
                  Summary for <strong>{summary.item_name}</strong>
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Total Quantity:</strong> {summary.total_available_quantity}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Total Value:</strong> ₹{summary.total_value.toLocaleString()}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* 📅 Received Dates Table */}
            <Typography variant="h6" gutterBottom>Stock</Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table>
                <TableHead sx={{ backgroundColor: "#2A3663" }}>
                  <TableRow>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Quantity</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Value (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receivedDates.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.received_date}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>₹{row.value.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* 🔄 Issued Logs Table */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
  <Typography variant="h6" gutterBottom>
    Issued
  </Typography>

  <TextField
    label="Search"
    variant="outlined"
    size="small"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    InputProps={{
      endAdornment: (
        <InputAdornment position="end">
          <IconButton edge="end">
            <SearchIcon />
          </IconButton>
        </InputAdornment>
      ),
    }}
    sx={{ width: { xs: "100%", sm: "300px" } }}
  />
</Box>


            <TableContainer component={Paper}>
              <Table>
                <TableHead sx={{ backgroundColor: "#2A3663" }}>
                  <TableRow>
                    {[
                      { id: "engineer_name", label: "Req Engineer" },
                      { id: "project_name", label: "Project" },
                      { id: "property_name", label: "Property" },
                      { id: "issued_quantity", label: "Issued Qty" },
                      { id: "warehouse", label: "Warehouse" },
                      { id: "created_at", label: "Issued At" },
                    ].map((headCell) => (
                      <TableCell
                        key={headCell.id}
                        sx={{ color: "#fff", fontWeight: "bold", textTransform: "uppercase" }}
                      >
                        <TableSortLabel
                          active={orderBy === headCell.id}
                          direction={orderBy === headCell.id ? order : "asc"}
                          onClick={() => handleSort(headCell.id)}
                        >
                          {headCell.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredIssued
                    .slice()
                    .sort(getComparator(order, orderBy))
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((log, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{log.engineer_name || log.engineer_id}</TableCell>
                        <TableCell>{log.project_name}</TableCell>
                        <TableCell>{log.property_name}</TableCell>
                        <TableCell>{log.issued_quantity}</TableCell>
                        <TableCell>{log.warehouse}</TableCell>
                        <TableCell>
                          {new Date(log.created_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredIssued.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OpenItemDialog;