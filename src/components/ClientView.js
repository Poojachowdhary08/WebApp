import React, { useEffect, useMemo, useState } from "react";
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
  CircularProgress,
  TablePagination,
  Chip,
  Stack,
  TableSortLabel,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import AddClientDialog from "./AddClientDialog";
import ClientDetailsDialog from "./ClientDetailsDialog";

const PAGE_BG = "#F4F6F9";
const GRID_BORDER = "1px solid rgba(15, 23, 42, 0.10)";
const CARDS_PER_PAGE = 12;

const ClientView = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // pagination (used for list; for cards we fix to 12)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // sorting
  const [orderBy, setOrderBy] = useState("client_id");
  const [order, setOrder] = useState("asc");

  // search
  const [query, setQuery] = useState("");

  // top tabs
  const [activeTab, setActiveTab] = useState(0);

  // ✅ view mode
  const [viewMode, setViewMode] = useState("list"); // "list" | "cards"

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8080/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleChangePage = (_e, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (e) => {
    const next = parseInt(e.target.value, 10);
    setRowsPerPage(Number.isFinite(next) ? next : 10);
    setPage(0);
  };

  const handleRequestSort = (key) => {
    if (orderBy === key) setOrder((p) => (p === "asc" ? "desc" : "asc"));
    else {
      setOrderBy(key);
      setOrder("asc");
    }
    setPage(0);
  };

  const filteredClients = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return clients;

    return (clients || []).filter((c) => {
      const hay = [c?.client_id, c?.name, c?.email, c?.phone, c?.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [clients, query]);

  const sortedClients = useMemo(() => {
    const arr = [...(filteredClients || [])];

    const getVal = (c) => {
      const v = c?.[orderBy];
      return (typeof v === "string" ? v.toLowerCase() : v) ?? "";
    };

    arr.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av < bv) return order === "asc" ? -1 : 1;
      if (av > bv) return order === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [filteredClients, orderBy, order]);

  // ✅ effective page size depending on view
  const pageSize = viewMode === "cards" ? CARDS_PER_PAGE : rowsPerPage;

  // ✅ keep page in range
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedClients.length / pageSize) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [sortedClients.length, pageSize, page]);

  const pagedClients = useMemo(() => {
    const start = page * pageSize;
    const end = start + pageSize;
    return sortedClients.slice(start, end);
  }, [sortedClients, page, pageSize]);

  const statusChip = (client) => {
    const status = client.status || "Active";
    const isActive =
      String(status).toLowerCase() === "active" ||
      String(status).toLowerCase() === "enabled";

    return (
      <Chip
        label={status}
        size="small"
        sx={{
          fontWeight: 900,
          borderRadius: 999,
          height: 24,
          bgcolor: isActive ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.16)",
          color: isActive ? "#16A34A" : "#D97706",
        }}
      />
    );
  };

  // ✅ DETAILS VIEW
  if (selectedClient) {
    return (
      <Box sx={pageShellSx}>
        <Typography sx={breadcrumbSx}>
          Client Management <span style={{ opacity: 0.45 }}>/</span> Client
          Details
        </Typography>

        <Box sx={{ mt: 1 }}>
          <ClientDetailsDialog
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
            onUpdated={(updatedClient) => {
              setClients((prev) =>
                prev.map((c) =>
                  c.client_id === updatedClient.client_id ? updatedClient : c
                )
              );
              setSelectedClient(updatedClient);
            }}
          />
        </Box>
      </Box>
    );
  }

  const renderCards = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        {pagedClients.map((client) => (
          <Grid
            key={client.client_id}
            item
            xs={12}
            sm={6}
            md={4}
            lg={3} // ✅ 4 cards in a row on large screens
          >
            <Paper
              elevation={0}
              onClick={() => setSelectedClient(client)}
              sx={{
                borderRadius: 3,
                bgcolor: "#fff",
                border: "1px solid #E5E7EB",
                boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 120ms ease, box-shadow 120ms ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0px 14px 36px rgba(15,23,42,0.10)",
                },
              }}
            >
              <Box sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}
                      noWrap
                      title={client.client_id}
                    >
                      {client.client_id || "—"}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 900,
                        color: "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={client.name || ""}
                    >
                      {client.name || "—"}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 12.5,
                        color: "#6B7280",
                        mt: 0.25,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={client.email || ""}
                    >
                      {client.email || "—"}
                    </Typography>
                  </Box>

                  <Tooltip title="View">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(client);
                      }}
                      sx={{
                        border: "1px solid #E5E7EB",
                        bgcolor: "#fff",
                        borderRadius: 2,
                        "&:hover": { bgcolor: "#F9FAFB" },
                      }}
                    >
                      <VisibilityOutlinedIcon sx={{ fontSize: 18, color: "#2563EB" }} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <Grid container spacing={1.2}>
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
                      Phone
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        fontWeight: 900,
                        color: "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={client.phone || ""}
                    >
                      {client.phone || "—"}
                    </Typography>
                  </Grid>
                </Grid>

                <Stack direction="row" alignItems="center" sx={{ mt: 1.5 }}>
                  {statusChip(client)}
                  <Box sx={{ flex: 1 }} />
                  <Chip
                    size="small"
                    label="CLIENT"
                    sx={{
                      height: 24,
                      fontSize: 11.5,
                      borderRadius: "999px",
                      bgcolor: "#EEF2FF",
                      color: "#1E40AF",
                      fontWeight: 900,
                      border: "1px solid #C7D2FE",
                    }}
                  />
                </Stack>
              </Box>
            </Paper>
          </Grid>
        ))}

        {pagedClients.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
              <Typography color="text.secondary">No clients found.</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <TablePagination
        component="div"
        count={sortedClients.length}
        page={page}
        rowsPerPage={CARDS_PER_PAGE}
        onPageChange={handleChangePage}
        onRowsPerPageChange={() => {}}
        rowsPerPageOptions={[CARDS_PER_PAGE]}
        labelRowsPerPage="Items per page:"
        sx={{ mt: 1 }}
      />
    </Box>
  );

  // ✅ LIST VIEW
  return (
    <Box sx={pageShellSx}>
      {/* Breadcrumb */}
      <Typography sx={breadcrumbSx}>
        Client Management <span style={{ opacity: 0.45 }}>/</span> All Clients
      </Typography>

      {/* Tabs (left) + Search/Add (right) */}
      <Box
        sx={{
          mt: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              textTransform: "uppercase",
              fontWeight: 900,
              fontSize: 13,
              minHeight: 44,
              px: 2,
            },
          }}
        >
          <Tab label="Clients" />
        </Tabs>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
          {/* Search + View toggle */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search (ID / Name / Email / Phone)"
              size="small"
              sx={{
                width: { xs: "100%", sm: 340 },
                bgcolor: "white",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": { borderRadius: 2 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title={viewMode === "list" ? "List view" : "Card view"}>
              <ToggleButtonGroup
                exclusive
                value={viewMode}
                onChange={(_e, next) => {
                  if (!next) return;
                  setViewMode(next);
                  setPage(0);
                }}
                size="small"
                sx={{
                  bgcolor: "#fff",
                  borderRadius: 2,
                  border: "1px solid #E5E7EB",
                  "& .MuiToggleButton-root": {
                    border: "none",
                    px: 1.2,
                    py: 0.7,
                    borderRadius: 2,
                  },
                }}
              >
                <ToggleButton value="list">
                  <ViewListOutlinedIcon sx={{ fontSize: 18 }} />
                </ToggleButton>
                <ToggleButton value="cards">
                  <GridViewRoundedIcon sx={{ fontSize: 18 }} />
                </ToggleButton>
              </ToggleButtonGroup>
            </Tooltip>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddDialog(true)}
            sx={primaryBtnSx}
          >
            Add Client
          </Button>
        </Box>
      </Box>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : sortedClients.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 8 }}>
          <Typography variant="body1" color="text.secondary">
            No clients found.
          </Typography>
        </Box>
      ) : viewMode === "cards" ? (
        renderCards()
      ) : (
        <Box sx={{ mt: 2 }}>
          <TableContainer component={Paper} sx={tableWrapSx}>
            <Table size="small" sx={tableSx}>
              <TableHead sx={tableHeadSx}>
                <TableRow>
                  <TableCell sx={{ width: 160 }}>
                    <TableSortLabel
                      active={orderBy === "client_id"}
                      direction={orderBy === "client_id" ? order : "asc"}
                      onClick={() => handleRequestSort("client_id")}
                    >
                      Client ID
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sx={{ width: 220 }}>
                    <TableSortLabel
                      active={orderBy === "name"}
                      direction={orderBy === "name" ? order : "asc"}
                      onClick={() => handleRequestSort("name")}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sx={{ width: 260 }}>
                    <TableSortLabel
                      active={orderBy === "email"}
                      direction={orderBy === "email" ? order : "asc"}
                      onClick={() => handleRequestSort("email")}
                    >
                      Email
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sx={{ width: 170 }}>
                    <TableSortLabel
                      active={orderBy === "phone"}
                      direction={orderBy === "phone" ? order : "asc"}
                      onClick={() => handleRequestSort("phone")}
                    >
                      Phone
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sx={{ width: 140, textAlign: "center" }}>
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {pagedClients.map((client) => {
                  const status = client.status || "Active";
                  const isActive =
                    String(status).toLowerCase() === "active" ||
                    String(status).toLowerCase() === "enabled";

                  return (
                    <TableRow
                      key={client.client_id}
                      hover
                      onClick={() => setSelectedClient(client)}
                      sx={rowSx}
                    >
                      <TableCell sx={ellipsisCellSx}>
                        {client.client_id}
                      </TableCell>

                      <TableCell>{client.name || "—"}</TableCell>

                      <TableCell sx={ellipsisCellSx}>
                        {client.email || "—"}
                      </TableCell>

                      <TableCell sx={ellipsisCellSx}>
                        {client.phone || "—"}
                      </TableCell>

                      <TableCell sx={{ textAlign: "center" }}>
                        <Chip
                          label={status}
                          size="small"
                          sx={{
                            fontWeight: 900,
                            borderRadius: 999,
                            height: 24,
                            bgcolor: isActive
                              ? "rgba(34,197,94,0.12)"
                              : "rgba(251,191,36,0.16)",
                            color: isActive ? "#16A34A" : "#D97706",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={sortedClients.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        </Box>
      )}

      <AddClientDialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        onClientAdded={fetchClients}
      />
    </Box>
  );
};

// -------- styles --------

const pageShellSx = {
  p: 2.5,
  backgroundColor: PAGE_BG,
  minHeight: "100vh",
};

const breadcrumbSx = {
  fontSize: 14,
  fontWeight: 700,
  color: "rgba(15, 23, 42, 0.55)",
};

const primaryBtnSx = {
  borderRadius: 2,
  textTransform: "none",
  fontWeight: 900,
  px: 2.2,
  py: 1.0,
};

const tableWrapSx = {
  borderRadius: 2,
  overflow: "hidden",
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
  border: GRID_BORDER,
  backgroundColor: "#fff",
};

const tableSx = {
  tableLayout: "fixed",
  width: "100%",
  "& th, & td": {
    py: 1.25,
    px: 1.6,
    fontSize: 13,
    lineHeight: 1.2,
    borderBottom: GRID_BORDER,
    borderRight: GRID_BORDER,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle",
  },
  "& th:last-child, & td:last-child": { borderRight: "none" },
};

const tableHeadSx = {
  backgroundColor: "#F9FAFB",
  "& th": {
    fontWeight: 900,
    color: "#0F172A",
    fontSize: 12,
    letterSpacing: 0.3,
  },
};

const rowSx = {
  cursor: "pointer",
  "&:hover": { backgroundColor: "rgba(15, 23, 42, 0.02)" },
};

const ellipsisCellSx = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export default ClientView;
