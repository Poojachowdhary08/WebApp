// src/components/Manpower.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Menu,
  MenuItem,
  Typography,
  Grid,
  Divider,
  Button,
  Tooltip,
} from "@mui/material";
import debounce from "lodash.debounce";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import LaborOnboardingForm from "./LaborOnboardingForm";
import ContractorOnboardingForm from "./ContractorOnboardingForm";
import DynamicEmployeeForm from "./EmployeeForm";
import CreateVendorForm from "./CreateVendorForm";

import Employee_Table from "./Employee_Table";
import VendorDetails from "./VendorDetails";
import VendorDetailsComponent from "./VendorDetailsComponent";
import ManpowerDetails from "./ManpowerDetails";
import Employee_Details from "./Employee_Details";

import ManpowerHeaderBar from "./ManpowerHeaderBar";

const BRAND = {
  navy: "#2A3663",
  bg: "#F5F7FB",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  headerBg: "#F9FAFB",
};

const CARDS_PER_PAGE = 12;

const chipStyleByStatus = (statusRaw) => {
  const s = String(statusRaw || "INACTIVE").toUpperCase();
  if (s === "ACTIVE") { return { bg: "#DCFCE7", fg: "#166534" }; }
  if (s === "INACTIVE") { return { bg: "#FEE2E2", fg: "#991B1B" }; }
  if (s === "PENDING") {return { bg: "#FEF9C3", fg: "#854D0E" };}
  if (s === "COMPLETED") { return { bg: "#FFEDD5", fg: "#9A3412" };}
  return { bg: "#F3F4F6", fg: "#374151" };
};

const normalize = (v) => String(v ?? "").trim().toLowerCase();
const displayId = (row) => (row?.id ?? "—");

/** ---------------- EXCEL EXPORT HELPERS ---------------- */
const safeStr = (v) => (v === null || v === undefined ? "" : String(v));

const tabNiceName = (tab) => {
  if (tab === "LABOR") return "Labour";
  if (tab === "CONTRACTOR") return "Contractor";
  if (tab === "EMPLOYEE") return "Employees";
  if (tab === "VENDOR") return "Vendors";
  return "Man Power";
};

const buildExportSheets = (activeTab, manpower, sortedRows) => {
  if (activeTab === "LABOR") {
    const rows = (sortedRows || []).map((r) => ({
      Type: "LABOR",
      ID: safeStr(r?.id),
      Name: safeStr(r?.name),
      Phone: safeStr(r?.number),
      ServiceCategory: safeStr(r?.work_type || r?.contract_type),
      Status: safeStr(r?.status).toUpperCase(),
      ParentContractorId: safeStr(r?.parentId || ""),
    }));
    return [{ name: "Labours", rows }];
  }

  if (activeTab === "CONTRACTOR") {
    const contractors = (sortedRows || []).map((c) => ({
      Type: "CONTRACTOR",
      ID: safeStr(c?.id),
      Name: safeStr(c?.name),
      Phone: safeStr(c?.number),
      ServiceCategory: safeStr(c?.work_type || c?.contract_type),
      Status: safeStr(c?.status).toUpperCase(),
      LaboursCount: Array.isArray(c?.labors) ? c.labors.length : 0,
    }));

    const labours = (manpower || [])
      .filter((p) => p?.type === "CONTRACTOR")
      .flatMap((c) =>
        (c?.labors || []).map((l) => ({
          Type: "LABOR",
          ID: safeStr(l?.id),
          Name: safeStr(l?.name),
          Phone: safeStr(l?.number),
          ServiceCategory: safeStr(l?.work_type),
          Status: safeStr(l?.status).toUpperCase(),
          ParentContractorId: safeStr(c?.id),
          ParentContractorName: safeStr(c?.name),
        }))
      );

    return [
      { name: "Contractors", rows: contractors },
      { name: "Labours_Under_Contractors", rows: labours },
    ];
  }

  return [{ name: "Export", rows: [] }];
};

const downloadExcel = ({ fileName, sheets }) => {
  const wb = XLSX.utils.book_new();

  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows || []);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  });

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);
};
/** ------------------------------------------------------ */

const BreadcrumbBar = ({ parent = "Dashboard", current = "Man Power" }) => {
  return (
    <Box sx={{ px: 2, pt: 2, pb: 1 }}>
      <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
        {parent} <Box component="span" sx={{ mx: 0.7 }}>/</Box>{" "}
        <Box component="span" sx={{ color: BRAND.textPrimary, fontWeight: 800 }}>
          {current}
        </Box>
      </Typography>
    </Box>
  );
};

const ManpowerCard = ({ row, onClick }) => {
  const { bg, fg } = chipStyleByStatus(row?.status);

  return (
    <Paper
      onClick={onClick}
      elevation={0}
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
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
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
              title={row?.name || ""}
            >
              {row?.name || "—"}
            </Typography>

            <Typography sx={{ fontSize: 13, color: BRAND.textSecondary, mt: 0.2 }}>
              {row?.type === "LABOR" ? "Labour" : "Contractor"} • ID: {displayId(row)}
            </Typography>

            <Box sx={{ mt: 1 }}>
              <Chip
                label={String(row?.status || "INACTIVE").toUpperCase()}
                size="small"
                sx={{
                  fontSize: 11,
                  fontWeight: 900,
                  height: 24,
                  borderRadius: "999px",
                  px: 1,
                  backgroundColor: bg,
                  color: fg,
                }}
              />
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Grid container spacing={1.2}>
          <Grid item xs={6}>
            <Box
              sx={{
                border: `1px solid ${BRAND.border}`,
                borderRadius: 2,
                p: 1.2,
                bgcolor: "#fff",
              }}
            >
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                Service Category
              </Typography>
              <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: BRAND.textPrimary }}>
                {row?.work_type || row?.contract_type || "—"}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box
              sx={{
                border: `1px solid ${BRAND.border}`,
                borderRadius: 2,
                p: 1.2,
                bgcolor: "#fff",
              }}
            >
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>Phone</Typography>
              <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: BRAND.textPrimary }}>
                {row?.number || "—"}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

const Manpower = ({ initialTab, onInitialTabApplied }) => {
  const [manpower, setManpower] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [currentPage, setCurrentPage] = useState(0);

  // ✅ table-only rows per page
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("LABOR");

  useEffect(() => {
    if (!initialTab) return;
    setActiveTab(initialTab);
    onInitialTabApplied?.();
    // apply only once (parent clears payload after this)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  // inline details view
  const [view, setView] = useState("list"); // "list" | "details"
  const [detailsTarget, setDetailsTarget] = useState(null); // { id, type }

  // ✅ list vs card view for LABOR/CONTRACTOR
  const [viewMode, setViewMode] = useState("list"); // "list" | "card"

  // ✅ view modes for EMPLOYEE/VENDOR (table|card)
  const [employeeViewMode, setEmployeeViewMode] = useState("table");
  const [vendorViewMode, setVendorViewMode] = useState("table");

  // ✅ refresh ticks so header refresh can trigger fetch
  const [employeeRefreshTick, setEmployeeRefreshTick] = useState(0);
  const [vendorRefreshTick, setVendorRefreshTick] = useState(0);

  // search
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // sorting
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "desc" });

  // dialogs
  const [openDialog, setOpenDialog] = useState(false);
  const [formType, setFormType] = useState(null);

  // context menu
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const [lastEmployeeId, setLastEmployeeId] = useState({ labor: 0, contractor: 0 });

  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        setSearchQuery(value.trim().toLowerCase());
        setCurrentPage(0);
      }, 250),
    []
  );

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  const fetchManpower = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("http://localhost:8080/labors-contractors");
      if (!res.ok) throw new Error("Failed to fetch labor/contractor data");
      const data = await res.json();

      const processed = (Array.isArray(data) ? data : [])
        .map((person) => {
          if (!person) return null;

          if (person.type === "CONTRACTOR") {
            const laborsWithIds = (person.labors || []).map((labor) => ({
              ...labor,
              parentId: person.id,
            }));
            return { ...person, labors: laborsWithIds };
          }

          return { ...person };
        })
        .filter(Boolean);

      setManpower(processed);

      const laborIds = processed
        .filter((p) => p?.type === "LABOR" && typeof p?.id === "number")
        .map((p) => parseInt(p.id, 10))
        .filter(Number.isInteger);

      const contractorIds = processed
        .filter((p) => p?.type === "CONTRACTOR" && typeof p?.id === "number")
        .map((p) => parseInt(p.id, 10))
        .filter(Number.isInteger);

      setLastEmployeeId({
        labor: laborIds.length ? Math.max(...laborIds) : 0,
        contractor: contractorIds.length ? Math.max(...contractorIds) : 0,
      });
    } catch (err) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManpower();
  }, []);

  const flattenedManpower = useMemo(() => {
    if (!Array.isArray(manpower)) return [];
    return manpower
      .flatMap((person) => {
        if (!person) return [];
        if (person.type === "CONTRACTOR" && Array.isArray(person.labors)) {
          return [{ ...person, isParent: true }, ...person.labors];
        }
        return person;
      })
      .filter(Boolean);
  }, [manpower]);

  const tabRows = useMemo(() => {
    if (activeTab === "CONTRACTOR") return manpower.filter((p) => p?.type === "CONTRACTOR");
    if (activeTab === "LABOR") return flattenedManpower.filter((p) => p?.type === "LABOR");
    return [];
  }, [activeTab, manpower, flattenedManpower]);

  const searchedRows = useMemo(() => {
    if (!searchQuery) return tabRows;
    return tabRows.filter((r) => {
      const fields = [r?.name, r?.id, r?.number, r?.work_type, r?.status, r?.type]
        .filter(Boolean)
        .map((x) => normalize(x));
      return fields.some((f) => f.includes(searchQuery));
    });
  }, [tabRows, searchQuery]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return searchedRows;

    return [...searchedRows].sort((a, b) => {
      const aValue = a?.[sortConfig.key] ?? "";
      const bValue = b?.[sortConfig.key] ?? "";

      if (sortConfig.key === "id") {
        const aStr = String(aValue);
        const bStr = String(bValue);
        return sortConfig.direction === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }

      const aNum = Number(aValue);
      const bNum = Number(bValue);
      const bothNumeric =
        !Number.isNaN(aNum) && !Number.isNaN(bNum) && aValue !== "" && bValue !== "";

      if (bothNumeric) return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;

      return sortConfig.direction === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [searchedRows, sortConfig]);

  // ✅ Card pagination (fixed 12)
  const cardPaginatedRows = useMemo(() => {
    const start = currentPage * CARDS_PER_PAGE;
    return sortedRows.slice(start, start + CARDS_PER_PAGE);
  }, [sortedRows, currentPage]);

  // ✅ Table pagination (uses itemsPerPage)
  const tablePaginatedRows = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return sortedRows.slice(start, start + itemsPerPage);
  }, [sortedRows, currentPage, itemsPerPage]);

  const handleToggleExpand = (id) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleChangePage = (_, newPage) => setCurrentPage(Math.max(0, newPage));

  const handleChangeRowsPerPage = (event) => {
    setItemsPerPage(Math.max(1, parseInt(event.target.value, 10)));
    setCurrentPage(0);
  };

  const handleOpenDialog = (type) => {
    setFormType(type);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormType(null);
  };

  const openDetailsInline = (row) => {
    if (!row?.id || !row?.type) return;
    setDetailsTarget({ id: row.id, type: row.type });
    setView("details");
  };

  const handleRowClick = (row) => openDetailsInline(row);

  const handleIdClick = (event, row) => {
    event.stopPropagation();
    setSelectedId(row.id);
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      type: row.type,
    });
  };

  const handleContextMenuClose = () => setContextMenu(null);

  const handleEditClick = () => {
    handleContextMenuClose();
    const row = flattenedManpower.find((p) => String(p.id) === String(selectedId));
    if (!row) return;
    openDetailsInline(row);
  };

  // ✅ Tab change handler
  const handleTabChange = (v) => {
    setActiveTab(v);

    // reset view state
    setView("list");
    setDetailsTarget(null);
    setExpandedRows({});
    setSortConfig({ key: "id", direction: "desc" });
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(0);
    setContextMenu(null);
    setSelectedId(null);

    setViewMode("list");
  };

  const niceTabName = tabNiceName(activeTab);

  // ✅ EXPORT CLICK
  const handleExportExcel = () => {
    try {
      const sheets = buildExportSheets(activeTab, manpower, sortedRows);

      const ts = new Date();
      const yyyy = ts.getFullYear();
      const mm = String(ts.getMonth() + 1).padStart(2, "0");
      const dd = String(ts.getDate()).padStart(2, "0");
      const hh = String(ts.getHours()).padStart(2, "0");
      const mi = String(ts.getMinutes()).padStart(2, "0");

      const tabName = tabNiceName(activeTab).replace(/\s+/g, "_");
      const fileName = `Manpower_${tabName}_${yyyy}-${mm}-${dd}_${hh}${mi}.xlsx`;

      downloadExcel({ fileName, sheets });
    } catch (e) {
      console.error("Excel export failed:", e);
      alert("Excel export failed. Check console for details.");
    }
  };

  // ✅ DETAILS VIEW (kept same structure)
  if (view === "details" && detailsTarget) {
    return (
      <Box sx={{ width: "100%", p: 0, background: BRAND.bg, minHeight: "100vh" }}>
        <BreadcrumbBar parent="Dashboard" current={`Man Power / ${niceTabName} Detail`} />
        <Box sx={{ px: 2, pb: 2 }}>
          {detailsTarget.type === "EMPLOYEE" ? (
            <Employee_Details
              employeeCode={detailsTarget.id}
              variant="page"
              onClose={() => {
                setView("list");
                setDetailsTarget(null);
              }}
            />
          ) : detailsTarget.type === "VENDOR" ? (
            <VendorDetailsComponent
              vendorId={detailsTarget.id}
              showClose
              title="Vendor Details"
              onClose={() => {
                setView("list");
                setDetailsTarget(null);
              }}
            />
          ) : (
            <ManpowerDetails
              id={detailsTarget.id}
              type={detailsTarget.type}
              onBack={() => {
                setView("list");
                setDetailsTarget(null);
              }}
            />
          )}
        </Box>
      </Box>
    );
  }

  const cellBorderSx = { border: `1px solid ${BRAND.border}` };
  const showSearch = true;

  const searchPlaceholder =
    activeTab === "LABOR" || activeTab === "CONTRACTOR"
      ? "Search (ID / Name / Phone / Service / Status)"
      : activeTab === "EMPLOYEE"
      ? "Search (EMPLOYEE)"
      : "Search vendor";

  const showExport = activeTab === "LABOR" || activeTab === "CONTRACTOR";

  // (moved to top with other hooks)

  // optional add button (kept ready)
  const showAdd = true;
  const addLabel =
    "+";

  const addTooltip =
    activeTab === "LABOR"
      ? "Add Labour"
      : activeTab === "CONTRACTOR"
      ? "Add Contractor"
      : activeTab === "EMPLOYEE"
      ? "Add Employee"
      : "Add Vendor";

  const onAddClick = () => {
    if (activeTab === "LABOR") handleOpenDialog("labor");
    else if (activeTab === "CONTRACTOR") handleOpenDialog("contractor");
    else if (activeTab === "EMPLOYEE") handleOpenDialog("employee");
    else handleOpenDialog("vendor");
  };

  return (
    <Box sx={{ width: "100%", p: 0, background: BRAND.bg, minHeight: "100vh" }}>
      <BreadcrumbBar parent="Dashboard" current={`Man Power / ${niceTabName}`} />

      <Paper
        elevation={0}
        sx={{
          mx: 2,
          borderRadius: 2,
          border: `1px solid ${BRAND.border}`,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <ManpowerHeaderBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          showSearch={showSearch}
          searchValue={searchInput}
          onSearchChange={(v) => {
            setSearchInput(v);
            if (activeTab === "LABOR" || activeTab === "CONTRACTOR") {
              debouncedSearch(v);
            }
          }}
          searchPlaceholder={searchPlaceholder}
          showAdd={showAdd}
          addLabel={addLabel}
          addTooltip={addTooltip}
          onAddClick={onAddClick}
          showViewToggle
          view={
            activeTab === "EMPLOYEE"
              ? employeeViewMode === "table"
                ? "list"
                : "card"
              : activeTab === "VENDOR"
              ? vendorViewMode === "table"
                ? "list"
                : "card"
              : viewMode
          }
          onSetView={(mode) => {
            if (activeTab === "EMPLOYEE") setEmployeeViewMode(mode === "list" ? "table" : "card");
            else if (activeTab === "VENDOR") setVendorViewMode(mode === "list" ? "table" : "card");
            else {
              setViewMode(mode);
              setCurrentPage(0); // ✅ reset pagination when switching views
            }
          }}
          onRefresh={() => {
            if (activeTab === "EMPLOYEE") setEmployeeRefreshTick((t) => t + 1);
            else if (activeTab === "VENDOR") setVendorRefreshTick((t) => t + 1);
            else fetchManpower();
          }}
          onClear={() => {
            setSearchInput("");
            if (activeTab === "LABOR" || activeTab === "CONTRACTOR") {
              setSearchQuery("");
              setCurrentPage(0);
            }
          }}
          // ✅ NEW: show export in same row (without deleting your old row)
          showExport={showExport}
          exportLabel="Export Excel"
          onExport={handleExportExcel}
          exportDisabled={loading || sortedRows.length === 0}
        />

        {/* Dialogs */}
        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
          <DialogTitle
            sx={{
              pb: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontWeight: 900,
              color: BRAND.textPrimary,
            }}
          >
            <Box>
              {formType === "labor"
                ? "Add Labour"
                : formType === "contractor"
                ? "Add Contractor"
                : formType === "employee"
                ? "Add Employee"
                : "Add Vendor"}
            </Box>
            <IconButton onClick={handleCloseDialog} sx={{ color: BRAND.textSecondary }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {formType === "labor" && (
              <LaborOnboardingForm onClose={handleCloseDialog} lastId={lastEmployeeId.labor} />
            )}
            {formType === "contractor" && (
              <ContractorOnboardingForm
                onClose={handleCloseDialog}
                lastId={lastEmployeeId.contractor}
              />
            )}
            {formType === "employee" && <DynamicEmployeeForm onClose={handleCloseDialog} embedded />}
            {formType === "vendor" && <CreateVendorForm onClose={handleCloseDialog} embedded />}
          </DialogContent>
        </Dialog>

        {/* EMPLOYEE */}
        {activeTab === "EMPLOYEE" && (
          <Box sx={{ p: 2, background: BRAND.bg }}>
            <Employee_Table
              embedded
              externalSearchValue={searchInput}
              refreshSignal={employeeRefreshTick}
              externalViewMode={employeeViewMode}
              onExternalViewModeChange={setEmployeeViewMode}
              onOpenDetails={(employeeCode) => {
                setDetailsTarget({ id: employeeCode, type: "EMPLOYEE" });
                setView("details");
              }}
            />
          </Box>
        )}

        {/* VENDOR */}
        {activeTab === "VENDOR" && (
          <Box sx={{ p: 2, background: BRAND.bg }}>
            <VendorDetails
              showAddButton={false}
              embedded
              externalSearchValue={searchInput}
              refreshSignal={vendorRefreshTick}
              externalViewMode={vendorViewMode}
              onExternalViewModeChange={setVendorViewMode}
              onOpenDetails={(vendorId) => {
                setDetailsTarget({ id: vendorId, type: "VENDOR" });
                setView("details");
              }}
            />
          </Box>
        )}

        {/* LABOR/CONTRACTOR */}
        {(activeTab === "LABOR" || activeTab === "CONTRACTOR") && (
          <Box sx={{ p: 2, background: BRAND.bg }}>
            {/* ✅ Card view (12 per page, 4 in a row) */}
            {viewMode === "card" && (
              <>
                {loading ? (
                  <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                    <Typography sx={{ color: BRAND.textSecondary }}>Loading...</Typography>
                  </Paper>
                ) : error ? (
                  <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                    <Typography sx={{ color: BRAND.textSecondary }}>Error: {error}</Typography>
                  </Paper>
                ) : cardPaginatedRows.length === 0 ? (
                  <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                    <Typography sx={{ color: BRAND.textSecondary }}>No results found</Typography>
                  </Paper>
                ) : (
                  <>
                    <Grid container spacing={2}>
                      {cardPaginatedRows.map((row) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={`${row.type}-${row.id}`}>
                          <ManpowerCard row={row} onClick={() => handleRowClick(row)} />
                        </Grid>
                      ))}
                    </Grid>

                    <Paper
                      elevation={0}
                      sx={{
                        mt: 2,
                        borderRadius: 2,
                        border: `1px solid ${BRAND.border}`,
                        background: "#fff",
                        overflow: "hidden",
                      }}
                    >
                      <TablePagination
                        component="div"
                        count={sortedRows.length}
                        page={currentPage}
                        onPageChange={handleChangePage}
                        rowsPerPage={CARDS_PER_PAGE}
                        rowsPerPageOptions={[]}
                        sx={{
                          "& .MuiTablePagination-toolbar": { px: 2 },
                          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-select": {
                            display: "none",
                          },
                          background: "#fff",
                        }}
                      />
                    </Paper>
                  </>
                )}
              </>
            )}

            {/* ✅ List/Table view (keeps your rows-per-page dropdown) */}
            {viewMode === "list" && (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  border: `1px solid ${BRAND.border}`,
                  background: "#fff",
                }}
              >
                <Table sx={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
                  <TableHead sx={{ backgroundColor: BRAND.headerBg }}>
                    <TableRow>
                      {[
                        { key: "id", label: "ID" },
                        { key: "work_type", label: "Service Category" },
                        { key: "name", label: "Name" },
                        { key: "date", label: "Created" },
                        { key: "number", label: "Phone No." },
                        { key: "status", label: "Status" },
                      ].map((col) => (
                        <TableCell
                          key={col.key}
                          onClick={() =>
                            col.key !== "action" && col.key !== "date" ? handleSort(col.key) : null
                          }
                          sx={{
                            border: `1px solid ${BRAND.border}`,
                            fontWeight: 900,
                            fontSize: 12,
                            color: "#6B7280",
                            cursor:
                              col.key !== "action" && col.key !== "date" ? "pointer" : "default",
                            userSelect: "none",
                            py: 1.4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {col.label}
                          {sortConfig.key === col.key ? (
                            <Box component="span" sx={{ ml: 0.6, color: "#9CA3AF" }}>
                              {sortConfig.direction === "asc" ? "↑" : "↓"}
                            </Box>
                          ) : null}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ ...cellBorderSx, py: 6, color: BRAND.textSecondary }}>
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ ...cellBorderSx, py: 6, color: BRAND.textSecondary }}>
                          Error: {error}
                        </TableCell>
                      </TableRow>
                    ) : tablePaginatedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ ...cellBorderSx, py: 6, color: BRAND.textSecondary }}>
                          No results found
                        </TableCell>
                      </TableRow>
                    ) : (
                      tablePaginatedRows.map((row) => {
                        if (activeTab === "CONTRACTOR" && row?.type === "CONTRACTOR") {
                          return (
                            <React.Fragment key={String(row?.id)}>
                              <TableRow hover onClick={() => handleRowClick(row)} sx={{ cursor: "pointer" }}>
                                <TableCell sx={{ ...cellBorderSx, py: 1.2, fontSize: 13, fontWeight: 800, color: BRAND.textPrimary }}>
                                  {row.labors?.length > 0 && (
                                    <IconButton
                                      size="small"
                                      sx={{ p: 0, mr: 1 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleExpand(row.id);
                                      }}
                                    >
                                      {expandedRows[row.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>
                                  )}
                                  {displayId(row)}
                                </TableCell>

                                <TableCell sx={{ ...cellBorderSx, py: 1.2, fontSize: 13 }}>
                                  {row.work_type || row.contract_type || "—"}
                                </TableCell>

                                <TableCell onClick={(e) => handleIdClick(e, row)} sx={{ ...cellBorderSx, py: 1.2, fontSize: 13 }}>
                                  {row.name || "—"}
                                </TableCell>

                                <TableCell sx={{ ...cellBorderSx, py: 1.2, fontSize: 13, color: BRAND.textSecondary }}>
                                  —
                                </TableCell>

                                <TableCell sx={{ ...cellBorderSx, py: 1.2, fontSize: 13 }}>
                                  {row.number || "—"}
                                </TableCell>

                                <TableCell sx={{ ...cellBorderSx, py: 1.2 }}>
                                  {(() => {
                                    const { bg, fg } = chipStyleByStatus(row.status);
                                    return (
                                      <Chip
                                        label={String(row.status || "INACTIVE").toUpperCase()}
                                        size="small"
                                        sx={{
                                          fontSize: 11,
                                          fontWeight: 900,
                                          height: 22,
                                          borderRadius: "6px",
                                          px: 1,
                                          backgroundColor: bg,
                                          color: fg,
                                        }}
                                      />
                                    );
                                  })()}
                                </TableCell>
                              </TableRow>

                              {expandedRows[row.id] &&
                                (row.labors || []).map((labor) => (
                                  <TableRow
                                    key={String(labor?.id)}
                                    hover
                                    onClick={() => handleRowClick({ ...labor, type: "LABOR" })}
                                    sx={{ backgroundColor: "#FCFCFD", cursor: "pointer" }}
                                  >
                                    <TableCell sx={{ ...cellBorderSx, py: 1.1, fontSize: 13, fontWeight: 800, color: BRAND.textPrimary }}>
                                      <SubdirectoryArrowRightIcon sx={{ color: "#9CA3AF", mr: 1 }} />
                                      {displayId(labor)}
                                    </TableCell>

                                    <TableCell sx={{ ...cellBorderSx, py: 1.1, fontSize: 13 }}>
                                      {labor?.work_type || "—"}
                                    </TableCell>

                                    <TableCell sx={{ ...cellBorderSx, py: 1.1, fontSize: 13 }}>
                                      {labor?.name || "—"}
                                    </TableCell>

                                    <TableCell sx={{ ...cellBorderSx, py: 1.1, fontSize: 13, color: BRAND.textSecondary }}>
                                      —
                                    </TableCell>

                                    <TableCell sx={{ ...cellBorderSx, py: 1.1, fontSize: 13 }}>
                                      {labor?.number || "—"}
                                    </TableCell>

                                    <TableCell sx={{ ...cellBorderSx, py: 1.1 }}>
                                      {(() => {
                                        const { bg, fg } = chipStyleByStatus(labor?.status);
                                        return (
                                          <Chip
                                            label={String(labor?.status || "INACTIVE").toUpperCase()}
                                            size="small"
                                            sx={{
                                              fontSize: 11,
                                              fontWeight: 900,
                                              height: 22,
                                              borderRadius: "6px",
                                              px: 1,
                                              backgroundColor: bg,
                                              color: fg,
                                            }}
                                          />
                                        );
                                      })()}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </React.Fragment>
                          );
                        }

                        return (
                          <TableRow key={String(row?.id)} hover onClick={() => handleRowClick(row)} sx={{ cursor: "pointer" }}>
                            <TableCell sx={{ ...cellBorderSx, py: 1.2, fontSize: 13, fontWeight: 800, color: BRAND.textPrimary }}>
                              {displayId(row)}
                            </TableCell>

                            <TableCell sx={{ ...cellBorderSx, py: 1.2, fontSize: 13 }}>
                              {row.work_type || "—"}
                            </TableCell>

                            <TableCell sx={{ ...cellBorderSx, py: 1.2, fontSize: 13 }}>
                              {row.name || "—"}
                            </TableCell>

                            <TableCell sx={{ ...cellBorderSx, py: 1.2, fontSize: 13, color: BRAND.textSecondary }}>
                              —
                            </TableCell>

                            <TableCell sx={{ ...cellBorderSx, py: 1.2, fontSize: 13 }}>
                              {row.number || "—"}
                            </TableCell>

                            <TableCell sx={{ ...cellBorderSx, py: 1.2 }}>
                              {(() => {
                                const { bg, fg } = chipStyleByStatus(row.status);
                                return (
                                  <Chip
                                    label={String(row.status || "INACTIVE").toUpperCase()}
                                    size="small"
                                    sx={{
                                      fontSize: 11,
                                      fontWeight: 900,
                                      height: 22,
                                      borderRadius: "6px",
                                      px: 1,
                                      backgroundColor: bg,
                                      color: fg,
                                    }}
                                  />
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                <TablePagination
                  component="div"
                  count={sortedRows.length}
                  page={currentPage}
                  onPageChange={handleChangePage}
                  rowsPerPage={itemsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  sx={{
                    borderTop: `1px solid ${BRAND.border}`,
                    "& .MuiTablePagination-toolbar": { px: 2 },
                    background: "#fff",
                  }}
                />
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        <MenuItem onClick={handleEditClick}>Edit {contextMenu?.type?.toLowerCase()}</MenuItem>
      </Menu>
    </Box>
  );
};

export default Manpower;