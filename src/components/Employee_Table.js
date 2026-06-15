// Employee_Table.jsx
import React, { useState, useEffect, useMemo } from "react";
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
  TablePagination,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Tooltip,
  Dialog,
  Grid,
  IconButton,
  Divider,
  Chip,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";

import axios from "axios";
import Employee_Details from "./Employee_Details";
import DynamicEmployeeForm from "./EmployeeForm";

const BRAND = {
  navy: "#2A3663",
  bg: "#F5F7FB",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  surface: "#FFFFFF",
  headerBg: "#F8FAFC",
  headerActive: "#EEF2FF",
};

const COLUMNS = [
  { key: "employee_code", label: "EMPLOYEE CODE", width: 160 },
  { key: "first_name", label: "FIRST NAME", width: 150 },
  { key: "last_name", label: "LAST NAME", width: 150 },
  { key: "phone_number", label: "PHONE", width: 170 },
  { key: "email", label: "EMAIL", width: 260 },
  { key: "department", label: "DEPARTMENT", width: 190 },
  { key: "job_title", label: "JOB TITLE", width: 220 },
];

const CARDS_PER_PAGE = 12;

const Employee_Table = ({
  onOpenDetails,
  embedded = false,
  externalSearchValue,
  refreshSignal,
  externalViewMode,
  onExternalViewModeChange,
}) => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "employee_code",
    direction: "asc",
  });

  // ✅ Shared page state (used by both modes)
  const [currentPage, setCurrentPage] = useState(0);

  // ✅ table-only pagination size
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ✅ view mode: "table" | "card"
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [viewMode, setViewMode] = useState(isMobile ? "card" : "table");

  // inline fallback details mode
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState(null);

  // Add Employee Dialog (kept)
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:8080/employees");
      const data = res.data || [];
      setEmployees(data);
      setFilteredEmployees(data);
      setError("");
    } catch {
      setError("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When embedded in ManPower, drive search from the header.
  useEffect(() => {
    if (!embedded) return;
    if (typeof externalSearchValue !== "string") return;
    setSearchQuery(externalSearchValue);
    setCurrentPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, externalSearchValue]);

  // When embedded in ManPower, allow header refresh button.
  useEffect(() => {
    if (!embedded) return;
    if (refreshSignal === undefined) return;
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, refreshSignal]);

  // 🔍 Search
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setFilteredEmployees(employees);
      setCurrentPage(0);
      return;
    }

    setFilteredEmployees(
      employees.filter((e) =>
        [
          e.employee_code,
          e.first_name,
          e.last_name,
          e.email,
          e.phone_number,
          e.department,
          e.job_title,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    );
    setCurrentPage(0);
  }, [searchQuery, employees]);

  // 🔃 Sorting
  const handleSort = (key) => {
    setSortConfig((prev) => {
      const sameKey = prev.key === key;
      const dir = sameKey && prev.direction === "asc" ? "desc" : "asc";

      setFilteredEmployees((rows) =>
        [...rows].sort((a, b) => {
          const av = a?.[key];
          const bv = b?.[key];

          const aNum =
            typeof av === "number"
              ? av
              : Number.isFinite(Number(av))
              ? Number(av)
              : null;
          const bNum =
            typeof bv === "number"
              ? bv
              : Number.isFinite(Number(bv))
              ? Number(bv)
              : null;

          if (aNum !== null && bNum !== null) return dir === "asc" ? aNum - bNum : bNum - aNum;

          const aStr = String(av ?? "");
          const bStr = String(bv ?? "");
          return dir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        })
      );

      return { key, direction: dir };
    });
  };

  // ✅ Separate slices: table vs cards
  const tablePaginatedEmployees = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  const cardPaginatedEmployees = useMemo(() => {
    const start = currentPage * CARDS_PER_PAGE;
    return filteredEmployees.slice(start, start + CARDS_PER_PAGE);
  }, [filteredEmployees, currentPage]);

  const handleOpenEmployee = (employeeCode) => {
    if (!employeeCode) return;

    if (typeof onOpenDetails === "function") {
      onOpenDetails(employeeCode);
      return;
    }

    setSelectedEmployeeCode(employeeCode);
  };

  const canClear = Boolean(searchQuery.trim());

  const iconBtnSx = (active = false) => ({
    width: 40,
    height: 40,
    borderRadius: 2,
    bgcolor: active ? "#EFF6FF" : "#fff",
    border: `1px solid ${BRAND.border}`,
    "&:hover": { bgcolor: active ? "#DBEAFE" : "#F9FAFB" },
  });

  const effectiveViewMode = embedded && externalViewMode ? externalViewMode : viewMode;
  const setMode = (mode) => {
    if (embedded && typeof onExternalViewModeChange === "function") {
      onExternalViewModeChange(mode);
    } else {
      setViewMode(mode);
    }
    setCurrentPage(0); // ✅ prevent empty pages after switching
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" minHeight={220} alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const cellSx = {
    border: `1px solid ${BRAND.border}`,
    py: 1.2,
    px: 1.5,
    fontSize: 13,
    color: BRAND.textPrimary,
    verticalAlign: "middle",
  };

  const headerCellSx = (isActive) => ({
    ...cellSx,
    fontWeight: 900,
    backgroundColor: isActive ? BRAND.headerActive : BRAND.headerBg,
    color: BRAND.navy,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  });

  const EmployeeCard = ({ emp }) => {
    const fullName = `${emp?.first_name || ""} ${emp?.last_name || ""}`.trim() || "—";
    const dept = emp?.department || "—";
    const title = emp?.job_title || "—";

    return (
      <Paper
        elevation={0}
        onClick={() => handleOpenEmployee(emp.employee_code)}
        sx={{
          cursor: "pointer",
          borderRadius: 3,
          border: `1px solid ${BRAND.border}`,
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
                border: `1px solid ${BRAND.border}`,
                flex: "0 0 auto",
              }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: BRAND.textPrimary,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={fullName}
              >
                {fullName}
              </Typography>

              <Typography sx={{ fontSize: 13, color: BRAND.textSecondary, mt: 0.2 }}>
                EMP: <b>{emp.employee_code || "—"}</b>
              </Typography>

              <Box sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label={(dept || "—").toUpperCase()}
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
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>Phone</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: BRAND.textPrimary }}>
                  {emp.phone_number || "—"}
                </Typography>
            </Grid>

            <Grid item xs={6}>
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>Role</Typography>
                <Typography
                  sx={{
                    fontSize: 13.5,
                    fontWeight: 900,
                    color: BRAND.textPrimary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={title}
                >
                  {title}
                </Typography>
            </Grid>

            <Grid item xs={12}>
           
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>Email</Typography>
                <Typography
                  sx={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: BRAND.textPrimary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={emp.email || ""}
                >
                  {emp.email || "—"}
                </Typography>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ width: "100%", marginTop: embedded ? 0 : "-60px" }}>
      {/* Top bar: search + icons */}
      {!embedded && !selectedEmployeeCode && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1,
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          <TextField
            placeholder="Search (EMPLOYEE)"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              width: isMobile ? "100%" : 360,
              "& .MuiOutlinedInput-root": {
                borderRadius: 999,
                background: "#fff",
                height: 40,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#9CA3AF" }} />
                </InputAdornment>
              ),
            }}
          />

          <Tooltip title="Refresh">
            <IconButton onClick={fetchEmployees} sx={iconBtnSx(false)}>
              <RefreshIcon sx={{ fontSize: 20, color: "#2563EB" }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Clear search">
            <span>
              <IconButton
                disabled={!canClear}
                onClick={() => setSearchQuery("")}
                sx={iconBtnSx(false)}
              >
                <CloseIcon sx={{ fontSize: 20, color: canClear ? "#111827" : "#9CA3AF" }} />
              </IconButton>
            </span>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: BRAND.border }} />

          <Tooltip title="List View">
            <IconButton onClick={() => setMode("table")} sx={iconBtnSx(viewMode === "table")}>
              <ViewListIcon sx={{ fontSize: 20, color: viewMode === "table" ? "#2563EB" : "#6B7280" }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Card View">
            <IconButton onClick={() => setMode("card")} sx={iconBtnSx(viewMode === "card")}>
              <ViewModuleIcon sx={{ fontSize: 20, color: viewMode === "card" ? "#2563EB" : "#6B7280" }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Inline Details (fallback only) */}
      {selectedEmployeeCode ? (
        <Employee_Details
          employeeCode={selectedEmployeeCode}
          variant="overlay"
          onClose={() => setSelectedEmployeeCode(null)}
        />
      ) : (
        <>
          {/* ✅ CARD VIEW (12 per page, 4 in a row on desktop) */}
          {effectiveViewMode === "card" && (
            <>
              {cardPaginatedEmployees.length === 0 ? (
                <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                  <Typography sx={{ color: BRAND.textSecondary, fontWeight: 800 }}>
                    No employees found.
                  </Typography>
                </Paper>
              ) : (
                <>
                  <Grid container spacing={2}>
                    {cardPaginatedEmployees.map((emp) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}
                        lg={3}   // ✅ 12 columns / 3 = 4 cards per row
                        key={emp.employee_code}
                      >
                        <EmployeeCard emp={emp} />
                      </Grid>
                    ))}
                  </Grid>

                  {/* ✅ Card pagination fixed to 12 */}
                  <Paper
                    elevation={0}
                    sx={{
                      mt: 2,
                      border: `1px solid ${BRAND.border}`,
                      borderRadius: 2.5,
                      overflow: "hidden",
                      background: BRAND.surface,
                    }}
                  >
                    <TablePagination
                      component="div"
                      count={filteredEmployees.length}
                      page={currentPage}
                      rowsPerPage={CARDS_PER_PAGE}
                      onPageChange={(_, p) => setCurrentPage(p)}
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

          {/* ✅ TABLE VIEW (normal pagination) */}
          {effectiveViewMode === "table" && (
            <Paper
              elevation={0}
              sx={{
                border: `1px solid ${BRAND.border}`,
                borderRadius: 2.5,
                overflow: "hidden",
                background: BRAND.surface,
              }}
            >
              <TableContainer sx={{ maxHeight: "72vh" }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      {COLUMNS.map((col) => {
                        const isActive = sortConfig.key === col.key;
                        return (
                          <TableCell
                            key={col.key}
                            onClick={() => handleSort(col.key)}
                            sx={{ ...headerCellSx(isActive), width: col.width }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography sx={{ fontWeight: 900, fontSize: 12 }}>
                                {col.label}
                              </Typography>

                              {isActive ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                                ) : (
                                  <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                                )
                              ) : (
                                <Box sx={{ width: 16, height: 16 }} />
                              )}
                            </Box>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {tablePaginatedEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={COLUMNS.length}
                          sx={{ ...cellSx, textAlign: "center", py: 4 }}
                        >
                          <Typography sx={{ color: BRAND.textSecondary, fontWeight: 800 }}>
                            No employees found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tablePaginatedEmployees.map((emp) => (
                        <TableRow
                          key={emp.employee_code}
                          hover
                          onClick={() => handleOpenEmployee(emp.employee_code)}
                          sx={{
                            cursor: "pointer",
                            "&:hover td": { backgroundColor: "#FAFAFF" },
                          }}
                        >
                          <TableCell sx={{ ...cellSx }}>{emp.employee_code}</TableCell>
                          <TableCell sx={cellSx}>{emp.first_name || "-"}</TableCell>
                          <TableCell sx={cellSx}>{emp.last_name || "-"}</TableCell>
                          <TableCell sx={cellSx}>{emp.phone_number || "-"}</TableCell>

                          <TableCell sx={cellSx}>
                            <Tooltip title={emp.email || ""}>
                              <Typography noWrap sx={{ maxWidth: 240 }}>
                                {emp.email || "-"}
                              </Typography>
                            </Tooltip>
                          </TableCell>

                          <TableCell sx={cellSx}>{emp.department || "-"}</TableCell>
                          <TableCell sx={cellSx}>{emp.job_title || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ borderTop: `1px solid ${BRAND.border}` }}>
                <TablePagination
                  component="div"
                  count={filteredEmployees.length}
                  page={currentPage}
                  rowsPerPage={itemsPerPage}
                  onPageChange={(_, p) => setCurrentPage(p)}
                  onRowsPerPageChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value, 10));
                    setCurrentPage(0);
                  }}
                  rowsPerPageOptions={[10, 50, 100]}
                />
              </Box>
            </Paper>
          )}
        </>
      )}

      {/* Add Employee (kept) */}
      <Dialog
        open={addEmployeeOpen}
        onClose={() => setAddEmployeeOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DynamicEmployeeForm
          onClose={() => {
            setAddEmployeeOpen(false);
            fetchEmployees();
          }}
        />
      </Dialog>
    </Box>
  );
};

export default Employee_Table;
