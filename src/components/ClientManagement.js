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
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Tooltip,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";

import AddClientDialog from "./AddClientDialog";
import ClientDetailsDialog from "./ClientDetailsDialog";

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // pagination (shared by both views)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // view mode: "list" | "cards"
  const [viewMode, setViewMode] = useState("list");

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8080/clients");
      const data = await res.json();
      setClients(data || []);
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

  // derived slice for current page
  const pagedClients = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return clients.slice(start, end);
  }, [clients, page, rowsPerPage]);

  // handlers
  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleViewMode = (_e, next) => {
    if (!next) return;
    setViewMode(next);
    // keep page stable; or reset:
    setPage(0);
  };

  return (
    <Box
      sx={{
        p: 0,
        backgroundColor: "#F4F6F9",
        minHeight: "96%",
        ml: "14px",
        mt: "-1%",
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" fontWeight="bold" color="black" mt={3} ml={3}>
          Client Management
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 3, mr: 3 }}>
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={handleViewMode}
            aria-label="view mode"
          >
            <ToggleButton value="list" aria-label="list view">
              <ViewListIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="cards" aria-label="card view">
              <ViewModuleIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddDialog(true)}
            sx={{
              backgroundColor: "#2A3663",
              "&:hover": { backgroundColor: "#1E2A4B" },
            }}
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
      ) : clients.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 8 }}>
          <Typography variant="body1" color="text.secondary">
            No clients found.
          </Typography>
        </Box>
      ) : viewMode === "list" ? (
        // ===== LIST VIEW (compact table) =====
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: "8px",
            overflowX: "auto",
            mr: -2,
            ml: 2,
          }}
        >
          <Table
            size="small" // <-- built-in compact density
            sx={{
              tableLayout: "fixed",
              width: "100%",
              "& th, & td": {
                // extra-compact cells
                py: 0.75,
                px: 1.25,
                fontSize: 13.5,
                lineHeight: 1.2,
              },
            }}
          >
            <TableHead sx={{ backgroundColor: "#2A3663" }}>
              <TableRow>
                <TableCell sx={headCellSx}>Client ID</TableCell>
                <TableCell sx={headCellSx}>Name</TableCell>
                <TableCell sx={headCellSx}>Email</TableCell>
                <TableCell sx={headCellSx}>Phone</TableCell>
                <TableCell sx={{ ...headCellSx, width: 64, textAlign: "center" }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {pagedClients.map((client) => (
                <TableRow
                  key={client.client_id}
                  hover
                  sx={{
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedClient(client)}
                >
                  <TableCell
                    sx={{
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#1565C0",
                      textDecoration: "underline",
                    }}
                  >
                    {client.client_id}
                  </TableCell>

                  <TableCell
                    sx={{
                      maxWidth: 220,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {client.name || "—"}
                  </TableCell>

                  <TableCell
                    sx={{
                      maxWidth: 260,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {client.email || "—"}
                  </TableCell>

                  <TableCell
                    sx={{
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {client.phone || "—"}
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    <Tooltip title="Open details">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(client);
                        }}
                      >
                        <OpenInNewIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={clients.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      ) : (
        // ===== CARD VIEW (responsive grid) =====
        <Box sx={{ px: 2, pr: 0 }}>
          <Grid container spacing={2}>
            {pagedClients.map((client) => (
              <Grid key={client.client_id} item xs={12} sm={6} md={4} lg={3} xl={3}>
                <Card
                  sx={{
                    height: "100%",
                    borderRadius: 2,
                    transition: "transform .15s ease, box-shadow .15s ease",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedClient(client)}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                          maxWidth: "72%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={client.client_id}
                      >
                        {client.client_id}
                      </Typography>
                      <Chip
                        label="Client"
                        size="small"
                        sx={{ bgcolor: "#EEF2FF", color: "#1E3A8A", fontWeight: 700 }}
                      />
                    </Stack>

                    <Divider sx={{ my: 1.25 }} />

                    <Stack spacing={0.75}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={client.name}
                      >
                        {client.name || "—"}
                      </Typography>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <MailOutlineIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={client.email}
                        >
                          {client.email || "—"}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <LocalPhoneIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                        <Typography variant="body2" color="text.secondary">
                          {client.phone || "—"}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <TablePagination
              component="div"
              rowsPerPageOptions={[6, 12, 24, 48]}
              count={clients.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Box>
        </Box>
      )}

      {/* Dialogs */}
      <AddClientDialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        onClientAdded={fetchClients}
      />

      <ClientDetailsDialog
        open={Boolean(selectedClient)}
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onUpdated={(updatedClient) => {
          setClients((prev) =>
            prev.map((c) => (c.client_id === updatedClient.client_id ? updatedClient : c))
          );
          setSelectedClient(updatedClient);
        }}
      />
    </Box>
  );
};

const headCellSx = {
  color: "white",
  fontWeight: "bold",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export default ClientManagement;