// src/components/ManpowerDetails.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Typography,
  IconButton,
  Box,
  Divider,
  Paper,
  Chip,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Button,
  Tooltip,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import GridOnRoundedIcon from "@mui/icons-material/GridOnRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";

import LaborOnboardingForm from "./LaborOnboardingForm";
import ContractorOnboardingForm from "./ContractorOnboardingForm";

const BRAND = {
  navy: "#2A3663",
  bg: "#F5F7FB",
  border: "#E5E7EB",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  activeChipBg: "#111827",
  activeChipFg: "#FFFFFF",
};

const chipStyleByStatus = (statusRaw) => {
  const s = String(statusRaw || "ACTIVE").toUpperCase();
  if (s === "ACTIVE") return { bg: "#DCEBFF", fg: "#2563EB" };
  if (s === "INACTIVE") return { bg: "#E5E7EB", fg: "#374151" };
  return { bg: "#E5E7EB", fg: "#374151" };
};

const safeOpen = (url) => {
  if (!url || url === "#") return;
  window.open(url, "_blank", "noopener,noreferrer");
};

const getFileNameFromUrl = (url) => {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return decodeURIComponent(last || "Document");
  } catch {
    const last = String(url || "")
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .filter(Boolean)
      .pop();
    return decodeURIComponent(last || "Document");
  }
};

const extOf = (nameOrUrl) => {
  const s = String(nameOrUrl || "").toLowerCase();
  const clean = s.split("?")[0].split("#")[0];
  const idx = clean.lastIndexOf(".");
  return idx >= 0 ? clean.slice(idx + 1) : "";
};

const classifyDocKind = (url) => {
  const ext = extOf(url);
  if (["pdf"].includes(ext)) return "PDF";
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "heic"].includes(ext)) return "IMAGES";
  if (["xls", "xlsx", "csv"].includes(ext)) return "EXCEL";
  return "OTHER";
};

const kindMeta = (kind) => {
  if (kind === "PDF")
    return {
      label: "PDF",
      icon: <PictureAsPdfRoundedIcon />,
      chipIcon: <PictureAsPdfRoundedIcon />,
    };
  if (kind === "IMAGES")
    return {
      label: "Images",
      icon: <ImageRoundedIcon />,
      chipIcon: <ImageRoundedIcon />,
    };
  if (kind === "EXCEL")
    return {
      label: "Excel",
      icon: <GridOnRoundedIcon />,
      chipIcon: <GridOnRoundedIcon />,
    };
  return {
    label: "Other",
    icon: <InsertDriveFileRoundedIcon />,
    chipIcon: <InsertDriveFileRoundedIcon />,
  };
};

const ManpowerDetails = ({ id, type, onBack }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [tab, setTab] = useState("DOCS"); // DOCS | ASSIGNED
  const [docFilter, setDocFilter] = useState("ALL"); // ALL | PDF | IMAGES | EXCEL | OTHER

  useEffect(() => {
    if (!id || !type) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError("");

      const apiUrl =
        type === "CONTRACTOR"
          ? `http://localhost:8080/contractors_l/${id}`
          : `http://localhost:8080/labors/${id}`;

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to fetch details");
        let data = await response.json();

        if (type === "CONTRACTOR" && typeof data === "object" && !Array.isArray(data)) {
          data = { ...data, contractors: Array.isArray(data.contractors) ? data.contractors : [] };
        }

        if (type === "LABOR" && Array.isArray(data) && data.length > 0) data = data[0];

        setDetails(data);
      } catch (err) {
        setError(err?.message || "Error fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, type, refreshKey]);

  const {
    name = "",
    contractor_name = "",
    labor_name = "",
    work_type = "",
    contract_type = "",
    number = "",
    contractor_phone = "",
    labor_phone = "",
    status = "ACTIVE",
    contract_payment_type = "",
    payment_type = "",
    remarks = "",
    aadhaar_file_url = "",
    aadhar_file_url = "",
    pancard_file_url = "",
    contractor_bond_file_url = "",
  } = details || {};

  const displayName = (name || contractor_name || labor_name || "").trim() || "N/A";
  const displayPhone = (number || contractor_phone || labor_phone || "").trim() || "N/A";
  const displayWorkType = (work_type || contract_type || "").trim() || "N/A";
  const displayPaymentType = (contract_payment_type || payment_type || "").trim() || "N/A";

  const { bg: statusBg, fg: statusFg } = chipStyleByStatus(status);

  const allDocs = useMemo(() => {
    const aadhaarUrl = aadhaar_file_url || aadhar_file_url || "";
    const raw = [
      aadhaarUrl ? { url: aadhaarUrl, titleHint: "Aadhaar" } : null,
      pancard_file_url ? { url: pancard_file_url, titleHint: "PAN" } : null,
      contractor_bond_file_url ? { url: contractor_bond_file_url, titleHint: "Bond" } : null,
    ].filter(Boolean);

    return raw.map((d) => {
      const filename = getFileNameFromUrl(d.url);
      const kind = classifyDocKind(d.url);
      return {
        id: `${kind}:${d.url}`,
        url: d.url,
        name: filename && filename !== "Document" ? filename : d.titleHint,
        kind,
      };
    });
  }, [aadhaar_file_url, aadhar_file_url, pancard_file_url, contractor_bond_file_url]);

  const counts = useMemo(() => {
    const c = { ALL: allDocs.length, PDF: 0, IMAGES: 0, EXCEL: 0, OTHER: 0 };
    allDocs.forEach((d) => {
      c[d.kind] = (c[d.kind] || 0) + 1;
    });
    return c;
  }, [allDocs]);

  const availableFilters = useMemo(() => {
    const filters = [{ key: "ALL", label: `All (${counts.ALL})` }];
    if (counts.PDF > 0) filters.push({ key: "PDF", label: `PDF (${counts.PDF})` });
    if (counts.IMAGES > 0) filters.push({ key: "IMAGES", label: `Images (${counts.IMAGES})` });
    if (counts.EXCEL > 0) filters.push({ key: "EXCEL", label: `Excel (${counts.EXCEL})` });
    if (counts.OTHER > 0) filters.push({ key: "OTHER", label: `Other (${counts.OTHER})` });
    return filters;
  }, [counts]);

  useEffect(() => {
    const exists = availableFilters.some((f) => f.key === docFilter);
    if (!exists) setDocFilter("ALL");
  }, [availableFilters, docFilter]);

  const filteredDocs = useMemo(() => {
    if (docFilter === "ALL") return allDocs;
    return allDocs.filter((d) => d.kind === docFilter);
  }, [allDocs, docFilter]);

  const handleEdit = () => setEditMode(true);
  const handleCloseEdit = () => {
    setEditMode(false);
    setRefreshKey((k) => k + 1);
  };

  const handleUpload = () => {
    alert("Upload API not wired");
  };

  const headerTitle =
    type === "CONTRACTOR" ? "Contractor Details" : type === "LABOR" ? "Labour Details" : "Manpower Details";

  return (
    <Paper
      sx={{
        width: "100%",
        backgroundColor: "red",
        minHeight: "100vh",
      }}
    >

    <Box sx={{
      backgroundColor: "#F5F7FA",
      height: "100vh",
     
    }}>
      {/* HEADER BAR (TITLE + CLOSE + EDIT) */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          px: 2,
          py: 1.2,
          border: `1px solid ${BRAND.border}`,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.2} alignItems="center">
      

          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 950, color: BRAND.textPrimary, lineHeight: 1.1 }}>
              {headerTitle}
            </Typography>
            <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
              {loading ? "Loading..." : `${displayName}`}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ ml: "auto" }}>
        <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
              sx={{
                borderRadius: 2,
                fontWeight: 900,
                px: 2.2,
                
              }}
            >
              EDIT
            </Button>


  <Button
    variant="outlined"
    onClick={onBack}
    sx={{
      height: 36,
      borderRadius: 2,
      border: "1px solid #FCA5A5",
      color: "#DC2626",
      backgroundColor: "rgba(220,38,38,0.06)",
      fontWeight: 900,
      px: 1.6,
      textTransform: "none",
      minWidth: 0,
      "&:hover": {
        backgroundColor: "rgba(220,38,38,0.10)",
        borderColor: "#EF4444",
      },
    }}
  >
    X&nbsp;Close
  </Button>
</Stack>

      </Paper>

      <Box sx={{ mt: 2 }}>{error ? <Alert severity="error">{error}</Alert> : null}</Box>

      {/* DETAILS CARD (ALIGNED PROPERLY) */}
      <Paper
        elevation={0}
        sx={{
          mt: 2,
          borderRadius: 3,
          border: `1px solid ${BRAND.border}`,
          background: "#fff",
          p: 2,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
              lg: "repeat(6, minmax(0, 1fr))",
            },
            gap: 2,
            alignItems: "start",
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>Name</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: BRAND.textPrimary }}>
              {loading ? "—" : displayName}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>Work Type</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: BRAND.textPrimary }}>
              {loading ? "—" : displayWorkType}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>Phone No.</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: BRAND.textPrimary }}>
              {loading ? "—" : displayPhone}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>Payment Type</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: BRAND.textPrimary }}>
              {loading ? "—" : displayPaymentType}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>Status</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                size="small"
                label={String(status || "ACTIVE").toUpperCase()}
                sx={{
                  height: 22,
                  borderRadius: "6px",
                  fontSize: 11,
                  fontWeight: 900,
                  background: statusBg,
                  color: statusFg,
                }}
              />
            </Box>
          </Box>

          <Box sx={{ gridColumn: { xs: "1 / -1", lg: "span 1" } }}>
            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>Remarks</Typography>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 900,
                color: BRAND.textPrimary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={remarks || ""}
            >
              {loading ? "—" : remarks || "—"}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Documents / Assigned Project tabs */}
      <Box sx={{ mt: 2 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{
            minHeight: 36,
            "& .MuiTab-root": {
              minHeight: 36,
              textTransform: "none",
              fontWeight: 900,
              fontSize: 13,
              color: BRAND.textSecondary,
              px: 2,
            },
            "& .Mui-selected": { color: BRAND.navy },
            "& .MuiTabs-indicator": { backgroundColor: BRAND.navy, height: 3, borderRadius: 3 },
          }}
        >
          <Tab value="DOCS" label="Documents" />
          <Tab value="ASSIGNED" label="Assigned Project" />
        </Tabs>
        <Divider sx={{ mt: 0.6 }} />
      </Box>

      {tab === "DOCS" ? (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            borderRadius: 3,
            border: `1px solid ${BRAND.border}`,
            background: "#fff",
            overflow: "hidden",
          }}
        >
          {/* TOP FILTER CHIPS like screenshot */}
          <Box
            sx={{
              px: 2,
              py: 1.4,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              {availableFilters.map((f) => {
                const active = docFilter === f.key;
                const icon = f.key === "ALL" ? null : kindMeta(f.key).chipIcon;

                return (
                  <Chip
                    key={f.key}
                    onClick={() => setDocFilter(f.key)}
                    icon={icon ? React.cloneElement(icon, { sx: { fontSize: 18 } }) : null}
                    label={f.label}
                    sx={{
                      height: 40,
                      px: 0.8,
                      borderRadius: 3,
                      fontWeight: 900,
                      border: `1px solid ${BRAND.border}`,
                      background: active ? BRAND.activeChipBg : "#fff",
                      color: active ? BRAND.activeChipFg : BRAND.textPrimary,
                      "& .MuiChip-icon": {
                        color: active ? BRAND.activeChipFg : "#6B7280",
                      },
                      cursor: "pointer",
                    }}
                  />
                );
              })}
            </Stack>

            <Button
              onClick={handleUpload}
              variant="contained"
              startIcon={<UploadFileOutlinedIcon />}
              sx={{
                height: 36,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 900,
                background: BRAND.navy,
                boxShadow: "none",
                "&:hover": { background: BRAND.navy, boxShadow: "none" },
              }}
            >
              Upload
            </Button>
          </Box>

          <Divider />

          {/* GRID CARDS */}
          <Box sx={{ p: 2 }}>
            {loading ? (
              <Typography sx={{ color: BRAND.textSecondary, py: 3 }}>Loading...</Typography>
            ) : allDocs.length === 0 ? (
              <Typography sx={{ color: BRAND.textSecondary, py: 3 }}>No documents uploaded.</Typography>
            ) : filteredDocs.length === 0 ? (
              <Typography sx={{ color: BRAND.textSecondary, py: 3 }}>No files in this category.</Typography>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(1, minmax(0, 1fr))",
                    sm: "repeat(2, minmax(0, 1fr))",
                    md: "repeat(3, minmax(0, 1fr))",
                    lg: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 2,
                }}
              >
                {filteredDocs.map((d) => {
                  const meta = kindMeta(d.kind);
                  const isImg = d.kind === "IMAGES";

                  return (
                    <Paper
                      key={d.id}
                      elevation={0}
                      sx={{
                        border: `1px solid ${BRAND.border}`,
                        borderRadius: 3,
                        overflow: "hidden",
                        background: "#fff",
                      }}
                    >
                      <Box
                        sx={{
                          height: 140,
                          background: "#F3F4F6",
                          position: "relative",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {isImg ? (
                          <img
                            src={d.url}
                            alt={d.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <Box sx={{ display: "grid", placeItems: "center", gap: 0.6 }}>
                            {React.cloneElement(meta.icon, { sx: { fontSize: 46, color: "#6B7280" } })}
                            <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}>
                              {meta.label}
                            </Typography>
                          </Box>
                        )}

                        <Tooltip title="Download / Open">
                          <IconButton
                            onClick={() => safeOpen(d.url)}
                            sx={{
                              position: "absolute",
                              right: 10,
                              bottom: 10,
                              width: 40,
                              height: 40,
                              background: "#fff",
                              border: `1px solid ${BRAND.border}`,
                              "&:hover": { background: "#fff" },
                            }}
                          >
                            <DownloadRoundedIcon sx={{ color: BRAND.navy }} />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Box sx={{ p: 1.4 }}>
                        <Typography
                          sx={{
                            fontWeight: 900,
                            fontSize: 13,
                            color: BRAND.textPrimary,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={d.name}
                        >
                          {d.name}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>—</Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}

            {allDocs.length > 0 ? (
              <Box sx={{ pt: 2 }}>
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                  Showing {filteredDocs.length} results
                </Typography>
              </Box>
            ) : null}
          </Box>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            borderRadius: 3,
            border: `1px solid ${BRAND.border}`,
            background: "#fff",
            p: 2,
          }}
        >
          <Typography sx={{ color: BRAND.textSecondary, fontWeight: 700 }}>
            Assigned Project UI goes here (no API wired in current code).
          </Typography>
        </Paper>
      )}

      {/* Edit dialog (KEEP your existing forms) */}
      <Dialog
        open={editMode}
        onClose={handleCloseEdit}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Typography variant="h6" fontWeight={900}>
            {type === "LABOR" ? "Edit Labor" : "Edit Contractor"}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {type === "LABOR" ? (
            <LaborOnboardingForm onClose={handleCloseEdit} existingData={details} />
          ) : (
            <ContractorOnboardingForm onClose={handleCloseEdit} existingData={details} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
    </Paper>
  );
};

export default ManpowerDetails;
