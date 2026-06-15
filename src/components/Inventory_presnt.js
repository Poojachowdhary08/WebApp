import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import { useMediaQuery, useTheme } from "@mui/material";
import OpenItemDialog from "./OpenItemDialog";

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "item_name", direction: "desc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemDialogName, setItemDialogName] = useState(null);

  const handleOpenItemDialog = (name) => {
    if (!name) return;
    setItemDialogName(name.trim().toUpperCase());
    setItemDialogOpen(true);
  };

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:8080/all-inventory");
        if (!response.ok) {
          throw new Error(`Failed to fetch inventory. Status: ${response.status}`);
        }
        const data = await response.json();
        setInventory(Array.isArray(data.inventory) ? data.inventory : []);
      } catch (err) {
        console.error("Error fetching inventory:", err);
        setError(err.message || "Unable to fetch inventory. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const filteredInventory = inventory.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      String(item.item_name || "").toLowerCase().includes(query) ||
      String(item.location || "").toLowerCase().includes(query) ||
      String(item.warehouse || "").toLowerCase().includes(query) ||
      String(item.quantity || "").toLowerCase().includes(query) ||
      String(item.project_name || "").toLowerCase().includes(query) ||
      String(item.property_name || "").toLowerCase().includes(query)
    );
  });

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    const key = sortConfig.key;
    if (key === "updated_date_ist") {
      const dateA = new Date(a[key]);
      const dateB = new Date(b[key]);
      if (isNaN(dateA) || isNaN(dateB)) return 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (a[key] < b[key]) return sortConfig.direction === "asc" ? -1 : 1;
    if (a[key] > b[key]) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleQrCodeClick = (itemName, qrCodePath) => {
    setQrCodeData({ itemName, qrCodePath });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setQrCodeData(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedInventory = sortedInventory.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ pt: 0.1, px: 1, pb: 1, maxWidth: "100%", backgroundColor: "white", borderRadius: "8px" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: { xs: "flex-start", sm: "flex-end" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: 1,
          mb: 1,
          px: 2,
          mt: isMobile ? "2%" : "-2.2%",
        }}
      >
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search Inventory"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          sx={{
            maxWidth: { xs: "100%", sm: "350px" },
            "& .MuiOutlinedInput-root": { borderRadius: "25px" },
            "& input": { padding: "8px 12px" },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="">
                <SearchIcon sx={{ color: "#2C3E50" }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", marginTop: -3 }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Box sx={{ textAlign: "center", my: 2 }}>
          <Typography variant="h6" color="error">
            {error.includes("500") ? "No Inventory Found" : error}
          </Typography>
        </Box>
      )}

      {!loading && !error && (
        <>
          {!isMobile ? (
            <>
              <TableContainer component={Paper} sx={{ borderRadius: "2px", overflowX: "auto" }}>
                <Table sx={{ tableLayout: "fixed", width: "100%" }}>
                  <TableHead sx={{ backgroundColor: "#2A3663" }}>
                    <TableRow>
                      <TableCell
                        sx={{ color: "white", cursor: "pointer", width: "250px", fontWeight: "bold", textTransform: "uppercase" }}
                        onClick={() => handleSort("item_name")}
                      >
                        Item Name {sortConfig.key === "item_name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", cursor: "pointer", fontWeight: "bold" }} onClick={() => handleSort("location")}>
                        Location {sortConfig.key === "location" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold" }} onClick={() => handleSort("warehouse")}>
                        Warehouse {sortConfig.key === "warehouse" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", textAlign: "center", fontWeight: "bold" }} onClick={() => handleSort("quantity")}>
                        Quantity {sortConfig.key === "quantity" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold" }} onClick={() => handleSort("updated_date_ist")}>
                        Updated On {sortConfig.key === "updated_date_ist" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                      </TableCell>
                      <TableCell sx={{ color: "white", textAlign: "center", fontWeight: "bold" }}>QR Code</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedInventory.length > 0 ? (
                      paginatedInventory.map((item) => (
                        <TableRow key={item.inv_id}>
                          <Tooltip title={item.item_name} placement="top">
                            <TableCell sx={{ textTransform: "uppercase", cursor: "pointer", color: "primary.main" }} onClick={() => handleOpenItemDialog(item.item_name)}>
                              {item.item_name || "Unknown"}
                            </TableCell>
                          </Tooltip>
                          <TableCell>{item.location || "Unknown"}</TableCell>
                          <TableCell>{item.warehouse || "Unknown"}</TableCell>
                          <TableCell align="center">{item.quantity || 0}</TableCell>
                          <TableCell>{item.updated_date_ist ? new Date(item.updated_date_ist).toLocaleDateString("en-GB") : "N/A"}</TableCell>
                          <TableCell align="center">
                            {item.qr_code_path ? (
                              <Button variant="outlined" color="primary" onClick={() => handleQrCodeClick(item.item_name, item.qr_code_path)}>
                                View QR Code
                              </Button>
                            ) : (
                              "No QR Code"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No items found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 40, 60, 80, 100]}
                component="div"
                count={sortedInventory.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          ) : (
            <Typography align="center">Mobile View Coming Soon</Typography>
          )}
        </>
      )}

      <OpenItemDialog open={itemDialogOpen} onClose={() => setItemDialogOpen(false)} itemName={itemDialogName} />

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: "center" }}>
          {qrCodeData ? (
            <>
              <Typography variant="h6" sx={{ marginBottom: 2 }}>
                {qrCodeData.itemName}
              </Typography>
              <img src={qrCodeData.qrCodePath} alt="QR Code" style={{ maxWidth: "100%", maxHeight: "400px", marginBottom: "16px" }} />
            </>
          ) : (
            <Typography>No QR Code Available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          {qrCodeData && (
            <Button href={qrCodeData.qrCodePath} download={`${qrCodeData.itemName}-QRCode.png`} variant="contained" color="primary" startIcon={<DownloadIcon />}>
              Download
            </Button>
          )}
          <Button onClick={handleDialogClose} variant="outlined" color="secondary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;