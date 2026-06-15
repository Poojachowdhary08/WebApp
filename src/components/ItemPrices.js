import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  useMediaQuery,
  useTheme,
  TextField,
  InputAdornment,
  TablePagination,
  TableSortLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";

const ItemPrices = () => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("item_name");
  const [sortOrder, setSortOrder] = useState("asc");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    axios
      .get("http://localhost:8080/latest-prices")
      .then((res) => setPrices(res.data.latest_prices || []))
      .catch((err) => console.error("Failed to load item prices", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (column) => {
    const isAsc = sortBy === column && sortOrder === "asc";
    setSortBy(column);
    setSortOrder(isAsc ? "desc" : "asc");
  };

  const handleChangePage = (event, newPage) => setCurrentPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const filteredData = prices
    .filter((item) =>
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (sortBy === "latest_created_date") {
        return sortOrder === "asc"
          ? new Date(aValue) - new Date(bValue)
          : new Date(bValue) - new Date(aValue);
      }
      return sortOrder === "asc"
        ? aValue > bValue
          ? 1
          : -1
        : bValue > aValue
        ? 1
        : -1;
    });

  const paginatedData = filteredData.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ padding: 2, backgroundColor: "white", borderRadius: "8px", marginTop: "-4%" }}>
      {/* Header + Search */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" fontWeight="bold" sx={{ mb: isMobile ? 1 : 0 }}>
        </Typography>

        <TextField
          variant="outlined"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{
            width: isMobile ? "100%" : "300px",
            backgroundColor: "#fff",
            borderRadius: "25px",
            "& .MuiOutlinedInput-root": {
              borderRadius: "25px",
              height: "36px",
              padding: "0",
              "& input": {
                padding: "8px 12px",
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#2C3E50" }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Table */}
      {loading ? (
        <CircularProgress />
      ) : (
        <Paper>
          <TableContainer sx={{ maxHeight: "65vh" }}>
            <Table >
              <TableHead sx={{ backgroundColor: "#2A3663" }}>
                <TableRow>
                  {[
                    { id: "item_name", label: "Item Name" },
                    { id: "latest_price", label: "Latest Price (₹)" },
                    { id: "latest_created_date", label: "Created Date" },
                    { id: "batch_id", label: "Batch ID" },
                  ].map((column) => (
                    <TableCell
                      key={column.id}
                      sortDirection={sortBy === column.id ? sortOrder : false}
                      sx={{ color: "#fff", fontWeight: "bold" }}
                    >
                      <TableSortLabel
                        active={sortBy === column.id}
                        direction={sortBy === column.id ? sortOrder : "asc"}
                        onClick={() => handleSort(column.id)}
                        sx={{ color: "#fff", "& svg": { color: "#fff" } }}
                      >
                        {column.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ textTransform: "uppercase" }}>
                        {item.item_name}
                      </TableCell>
                      <TableCell>₹{item.latest_price}</TableCell>
                      <TableCell>
                        {new Date(item.latest_created_date).toLocaleString(undefined, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour12: false
})}
                      </TableCell>
                      <TableCell>{item.batch_id}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No matching items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={currentPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}
    </Box>
  );
};

export default ItemPrices;