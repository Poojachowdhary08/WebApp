import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, TextField, InputAdornment, TablePagination,
  Button,
  useMediaQuery, useTheme, Stack, LinearProgress,
  Grid,
  IconButton,
  Tooltip,
  Divider,
  Chip,
} from "@mui/material";
import axios from "axios";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";

import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";

import EditVendorForm from "./EditVendorForm";
import CreateVendorForm from "./CreateVendorForm";

const CARDS_PER_PAGE = 12;

const VendorDetails = ({
  onOpenDetails,
  showAddButton = true,
  embedded = false,
  externalSearchValue,
  refreshSignal,
  externalViewMode,
  onExternalViewModeChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // data
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  // ui state
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  // ✅ table-only
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [sortConfig, setSortConfig] = useState({ key: "vendor_id", direction: "desc" });
  const [viewMode, setViewMode] = useState(isMobile ? "card" : "table");

  // dialogs
  const [selectedVendor, setSelectedVendor] = useState(null);          // for Edit
  const [isCreateVendorOpen, setIsCreateVendorOpen] = useState(false); // for Create

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress({ current: 0, total: 0 });

      const firstResponse = await axios.get("http://localhost:8080/get-all-vendors", {
        params: { limit: 100, offset: 0 }
      });

      const firstData = firstResponse.data;
      let allVendors = firstData.vendors || [];
      const total = firstData.total || 0;
      const limit = 100;
      const totalPages = Math.ceil(total / limit);

      setVendors(allVendors);
      setLoading(false);
      setLoadingProgress({ current: 1, total: totalPages });

      if (firstData.has_more && totalPages > 1) {
        const batchSize = 10;
        const remainingPages = totalPages - 1;
        const pageResults = new Map();

        const allBatchPromises = [];
        for (let batchStart = 1; batchStart <= remainingPages; batchStart += batchSize) {
          const batchEnd = Math.min(batchStart + batchSize - 1, remainingPages);
          const batchPromises = [];

          for (let p = batchStart; p <= batchEnd; p++) {
            const offset = p * limit;
            batchPromises.push(
              axios
                .get("http://localhost:8080/get-all-vendors", { params: { limit, offset } })
                .then((response) => ({ page: p, vendors: response.data.vendors || [] }))
            );
          }

          allBatchPromises.push(
            Promise.all(batchPromises).then((batchResults) => {
              batchResults.forEach(({ page, vendors }) => pageResults.set(page, vendors));

              const sortedPages = Array.from(pageResults.keys()).sort((a, b) => a - b);
              const mergedVendors = [];
              sortedPages.forEach((pageNum) => {
                const pageVendors = pageResults.get(pageNum);
                if (Array.isArray(pageVendors)) mergedVendors.push(...pageVendors);
              });

              const allMerged = [...firstData.vendors, ...mergedVendors];
              const completedCount = pageResults.size + 1;

              setVendors(allMerged);
              setLoadingProgress({ current: completedCount, total: totalPages });

              return batchResults;
            })
          );
        }

        await Promise.all(allBatchPromises);

        const sortedPages = Array.from(pageResults.keys()).sort((a, b) => a - b);
        sortedPages.forEach((pageNum) => {
          const pageVendors = pageResults.get(pageNum);
          if (Array.isArray(pageVendors)) allVendors = [...allVendors, ...pageVendors];
        });
      }

      setVendors(allVendors);
      setLoadingProgress({ current: 0, total: 0 });
    } catch (err) {
      setError(err.message || "Error fetching vendors");
      setLoading(false);
      setLoadingProgress({ current: 0, total: 0 });
    }
  };

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When embedded in ManPower, drive search from the header.
  useEffect(() => {
    if (!embedded) return;
    if (typeof externalSearchValue !== "string") return;
    setSearchQuery(externalSearchValue);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, externalSearchValue]);

  // When embedded in ManPower, allow header refresh button.
  useEffect(() => {
    if (!embedded) return;
    if (refreshSignal === undefined) return;
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, refreshSignal]);

  /* ------------ search / sort ------------ */
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) =>
      [
        v.vendor_id,
        v.vendor_name,
        v.vendor_display_name,
        v.vendor_gst_number,
        v.vendor_bank_account_number,
        v.vendor_bank_name,
        v.vendor_bank_ifsc_code
      ]
        .map((x) => (x || "").toString().toLowerCase())
        .some((s) => s.includes(q))
    );
  }, [vendors, searchQuery]);

  const sorted = useMemo(() => {
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    const key = sortConfig.key;
    return [...filtered].sort((a, b) => {
      const A = (a[key] ?? "").toString().toLowerCase();
      const B = (b[key] ?? "").toString().toLowerCase();
      if (!isNaN(+A) && !isNaN(+B)) return dir * (+A - +B);
      return A < B ? -1 * dir : A > B ? 1 * dir : 0;
    });
  }, [filtered, sortConfig]);

  // ✅ IMPORTANT: separate pagination slices
  const tablePaginated = useMemo(() => {
    const start = page * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, page, rowsPerPage]);

  const cardPaginated = useMemo(() => {
    const start = page * CARDS_PER_PAGE;
    return sorted.slice(start, start + CARDS_PER_PAGE);
  }, [sorted, page]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleChangePage = (_, newPage) => setPage(newPage);

  // ✅ table only
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const onVendorUpdated = () => {
    setSelectedVendor(null);
    setIsCreateVendorOpen(false);
    fetchVendors();
  };

  const canClear = Boolean(searchQuery.trim());
  const iconBtnSx = (active = false) => ({
    width: 40,
    height: 40,
    borderRadius: 2,
    bgcolor: active ? "#EFF6FF" : "#fff",
    border: "1px solid #E5E7EB",
    "&:hover": { bgcolor: active ? "#DBEAFE" : "#F9FAFB" },
  });

  const effectiveViewMode = embedded && externalViewMode ? externalViewMode : viewMode;
  const setMode = (mode) => {
    if (embedded && typeof onExternalViewModeChange === "function") {
      onExternalViewModeChange(mode);
    } else {
      setViewMode(mode);
    }
    setPage(0); // ✅ prevent blank pages when switching modes
  };

  /* ------------ table view ------------ */
  const TableView = (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: "#fff",
        border: "1px solid #E6EAF2",
        boxShadow: "0 6px 18px rgba(16,24,40,0.06)",
      }}
    >
      <Table
        size="small"
        sx={{
          tableLayout: "fixed",
          width: "100%",
          "& td, & th": {
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            borderRight: "1px solid #EEF2F7",
          },
          "& td:last-child, & th:last-child": { borderRight: "none" },
        }}
      >
        <TableHead>
          <TableRow
            sx={{
              backgroundColor: "#F7F9FC",
              "& th": {
                borderBottom: "1px solid #E6EAF2",
                color: "#344054",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.02em",
                py: 1.25,
                px: 2,
              },
            }}
          >
            {[
              { label: "VENDOR ID", key: "vendor_id" },
              { label: "DISPLAY NAME", key: "vendor_display_name" },
              { label: "GST NUMBER", key: "vendor_gst_number" },
              { label: "BANK NAME", key: "vendor_bank_name" },
              { label: "ACCOUNT NO", key: "vendor_bank_account_number" },
              { label: "IFSC CODE", key: "vendor_bank_ifsc_code" },
            ].map(({ label, key }) => (
              <TableCell
                key={key}
                sx={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort(key)}
              >
                {label}{" "}
                {sortConfig.key === key ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody
          sx={{
            "& tr": { backgroundColor: "#fff" },
            "& td": {
              borderBottom: "1px solid #EEF2F7",
              color: "#101828",
              fontSize: 13,
              py: 1.1,
              px: 2,
            },
            "& tr:nth-of-type(odd)": { backgroundColor: "#FCFCFD" },
            "& tr:hover td": { backgroundColor: "#F9FAFB" },
          }}
        >
          {tablePaginated.map((v) => (
            <TableRow
              key={v.vendor_id}
              hover
              onClick={() => onOpenDetails?.(v.vendor_id)}
              sx={{ cursor: "pointer" }}
            >
              <TableCell sx={{ fontWeight: 700, color: "#101828" }}>{v.vendor_id}</TableCell>
              <TableCell sx={{ textTransform: "uppercase" }}>{v.vendor_display_name}</TableCell>
              <TableCell>{v.vendor_gst_number}</TableCell>
              <TableCell>{v.vendor_bank_name}</TableCell>
              <TableCell>{v.vendor_bank_account_number}</TableCell>
              <TableCell sx={{ textTransform: "uppercase" }}>{v.vendor_bank_ifsc_code}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={sorted.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[15, 50, 100, 150]}
        sx={{
          borderTop: "1px solid #E6EAF2",
          "& .MuiTablePagination-toolbar": { px: 2 },
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
            color: "#475467",
            fontSize: 12.5,
            fontWeight: 500,
          },
        }}
      />
    </TableContainer>
  );

  /* ------------ card view ------------ */
  const VendorCard = ({ v }) => {
    const name = v.vendor_display_name || v.vendor_name || "—";
    return (
      <Paper
        elevation={0}
        onClick={() => onOpenDetails?.(v.vendor_id)}
        sx={{
          cursor: "pointer",
          borderRadius: 3,
          border: "1px solid #E5E7EB",
          bgcolor: "#fff",
          boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
          overflow: "hidden",
          "&:hover": { transform: "translateY(-1px)" },
          transition: "transform 120ms ease",
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <Box
              sx={{
                width: 54,
                height: 54,
                borderRadius: 2,
                bgcolor: "#E8EEFF",
                border: "1px solid #E5E7EB",
                flex: "0 0 auto",
              }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#111827",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={name}
              >
                {name}
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#6B7280", mt: 0.2 }}>
                Vendor ID: <b>{v.vendor_id || "—"}</b>
              </Typography>

              <Box sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label={(v.vendor_gst_number || "NO GST").toUpperCase()}
                  sx={{
                    height: 24,
                    fontSize: 11,
                    fontWeight: 900,
                    borderRadius: "999px",
                    bgcolor: "#F3F4F6",
                    color: "#374151",
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Grid container spacing={1.2}>
            <Grid item xs={6}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Bank</Typography>
              <Typography
                sx={{
                  fontSize: 13.5,
                  fontWeight: 900,
                  color: "#111827",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={v.vendor_bank_name || ""}
              >
                {v.vendor_bank_name || "—"}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>IFSC</Typography>
              <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: "#111827" }}>
                {v.vendor_bank_ifsc_code || "—"}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Account No</Typography>
              <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: "#111827" }}>
                {v.vendor_bank_account_number || "—"}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    );
  };

  /* ------------ render ------------ */
  return (
    <Box sx={{ p: 2, backgroundColor: "#F9F9F9", borderRadius: 2 }}>
      {/* Toolbar (hidden when embedded in ManPower; header controls drive search/view/refresh) */}
      {!embedded && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "stretch", md: "center" }}
          marginTop={-10}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 1 }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827" }}>
            {/* Vendors */}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            justifyContent={{ xs: "space-between", md: "flex-end" }}
          >
            <TextField
              placeholder="Search vendor"
              size="small"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              sx={{
                width: { xs: 1, sm: 300 },
                backgroundColor: "#fff",
                borderRadius: 999,
                "& .MuiOutlinedInput-root": { borderRadius: 999, height: 40 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title="Refresh">
              <IconButton onClick={fetchVendors} sx={iconBtnSx(false)}>
                <RefreshIcon sx={{ fontSize: 20, color: "#2563EB" }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Clear search">
              <span>
                <IconButton
                  disabled={!canClear}
                  onClick={() => {
                    setSearchQuery("");
                    setPage(0);
                  }}
                  sx={iconBtnSx(false)}
                >
                  <CloseIcon sx={{ fontSize: 20, color: canClear ? "#111827" : "#9CA3AF" }} />
                </IconButton>
              </span>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: "#E5E7EB" }} />

            <Tooltip title="List View">
              <IconButton onClick={() => setMode("table")} sx={iconBtnSx(viewMode === "table")}>
                <ViewListIcon
                  sx={{ fontSize: 20, color: viewMode === "table" ? "#2563EB" : "#6B7280" }}
                />
              </IconButton>
            </Tooltip>

            <Tooltip title="Card View">
              <IconButton onClick={() => setMode("card")} sx={iconBtnSx(viewMode === "card")}>
                <ViewModuleIcon
                  sx={{ fontSize: 20, color: viewMode === "card" ? "#2563EB" : "#6B7280" }}
                />
              </IconButton>
            </Tooltip>

            {showAddButton && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsCreateVendorOpen(true)}
                sx={{ borderRadius: 2, height: 40, fontWeight: 900 }}
              >
                Add Vendor
              </Button>
            )}
          </Stack>
        </Stack>
      )}

      {loading && vendors.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 4, gap: 2 }}>
          <CircularProgress />
          {loadingProgress.total > 0 && (
            <Box sx={{ width: "100%", maxWidth: 400 }}>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
                Loading vendors... {loadingProgress.current} / {loadingProgress.total} pages
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(loadingProgress.current / loadingProgress.total) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </Box>
      ) : (
        <>
          {loadingProgress.total > 0 && loadingProgress.current < loadingProgress.total && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={(loadingProgress.current / loadingProgress.total) * 100}
                sx={{ height: 4, borderRadius: 2 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block", textAlign: "center" }}>
                Loading more... {loadingProgress.current} / {loadingProgress.total} pages
              </Typography>
            </Box>
          )}

          {error ? (
            <Typography color="error">{error}</Typography>
          ) : (
            <>
              {effectiveViewMode === "table" ? (
                TableView
              ) : (
                <>
                  {cardPaginated.length === 0 ? (
                    <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                      <Typography sx={{ color: "#6B7280", fontWeight: 800 }}>
                        No vendors found.
                      </Typography>
                    </Paper>
                  ) : (
                    <>
                      <Grid container spacing={2}>
                        {cardPaginated.map((v) => (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={v.vendor_id}>
                            <VendorCard v={v} />
                          </Grid>
                        ))}
                      </Grid>

                      {/* ✅ Card pagination (fixed 12 / page) */}
                      <Paper
                        elevation={0}
                        sx={{
                          mt: 2,
                          borderRadius: 2,
                          border: "1px solid #E6EAF2",
                          overflow: "hidden",
                          background: "#fff",
                        }}
                      >
                        <TablePagination
                          component="div"
                          count={sorted.length}
                          page={page}
                          rowsPerPage={CARDS_PER_PAGE}
                          onPageChange={handleChangePage}
                          rowsPerPageOptions={[]}
                          sx={{
                            "& .MuiTablePagination-toolbar": { px: 2 },
                            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-select": {
                              display: "none",
                            },
                          }}
                        />
                      </Paper>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Edit */}
      {selectedVendor && (
        <EditVendorForm
          vendorData={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onVendorCreated={onVendorUpdated}
        />
      )}

      {/* Create */}
      {isCreateVendorOpen && (
        <CreateVendorForm
          onClose={() => setIsCreateVendorOpen(false)}
          onVendorCreated={onVendorUpdated}
        />
      )}
    </Box>
  );
};

export default VendorDetails;
