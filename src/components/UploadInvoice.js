import React, { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import Slide from "@mui/material/Slide";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ImageIcon from "@mui/icons-material/Image";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import debounce from "lodash.debounce";

import VendorDropdown from "./VendorDropdown";
import CreateNewVendor from "./CreateVendorForm";

const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
const RECENT_INVOICE_NUMBERS_KEY = "recent_invoice_numbers_v1";
const MAX_RECENT_INVOICE_NUMBERS = 25;

const UploadInvoice = ({ onClose }) => {
  const navigate = useNavigate();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [documentType, setDocumentType] = useState("Tax Invoice");

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isDisabled, setIsDisabled] = useState(false);
  const [showCreateVendor, setShowCreateVendor] = useState(false);

  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogSeverity, setDialogSeverity] = useState("success");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const inputRef = useRef(null);

  const isPdf = useMemo(() => (file ? file.type === "application/pdf" : false), [file]);
  const isImage = useMemo(() => (file ? file.type.startsWith("image/") : false), [file]);
  const normalizedInvoiceNumber = useMemo(() => invoiceNumber.trim(), [invoiceNumber]);
  const [recentInvoiceNumbers, setRecentInvoiceNumbers] = useState([]);

  const humanFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(1)} ${units[i]}`;
  };

  const loadRecentInvoiceNumbers = () => {
    try {
      const raw = localStorage.getItem(RECENT_INVOICE_NUMBERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((v) => typeof v === "string" && v.trim()).slice(0, MAX_RECENT_INVOICE_NUMBERS);
    } catch {
      return [];
    }
  };

  useEffect(() => {
    setRecentInvoiceNumbers(loadRecentInvoiceNumbers());
  }, []);

  const persistRecentInvoiceNumber = (invNo) => {
    const v = String(invNo || "").trim();
    if (!v) return;
    try {
      const current = loadRecentInvoiceNumbers();
      const next = [v, ...current.filter((x) => x !== v)].slice(0, MAX_RECENT_INVOICE_NUMBERS);
      localStorage.setItem(RECENT_INVOICE_NUMBERS_KEY, JSON.stringify(next));
      setRecentInvoiceNumbers(next);
    } catch {
      // ignore
    }
  };

  const slugify = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24);
  };

  const buildInvoiceSuggestion = useMemo(() => {
    const vendorName =
      selectedVendor?.name ||
      selectedVendor?.vendor_name ||
      selectedVendor?.label ||
      selectedVendor?.value ||
      "";

    const vend = slugify(vendorName);
    if (!vend) return "";

    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    // Example: inv__jk_group__20260408
    return `inv__${vend}__${yyyy}${mm}${dd}`;
  }, [selectedVendor]);

  const showDialog = (message, severity = "info") => {
    setDialogMessage(message);
    setDialogSeverity(severity);
    setOpenDialog(true);
  };

  const handleDialogClose = (_event, reason) => {
    // Prevent accidental close while submitting (ESC/backdrop)
    if (isDisabled && (reason === "backdropClick" || reason === "escapeKeyDown")) return;
    setOpenDialog(false);
    if (dialogSeverity === "success") {
      if (onClose) onClose();
      else {
        setIsRedirecting(true);
        navigate("/bills?tab=Review%20Invoice&refresh=1");
      }
    }
  };

  const resetFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const setFileWithPreview = (f) => {
    if (!f) {
      resetFile();
      return;
    }
    if (!ACCEPTED_MIME.includes(f.type)) {
      showDialog("Unsupported file type. Please upload a PDF or a JPEG/PNG image.", "error");
      resetFile();
      return;
    }
    if (typeof f.size === "number" && f.size > MAX_FILE_BYTES) {
      showDialog(
        `File is too large (${humanFileSize(f.size)}). Please upload a file up to ${humanFileSize(
          MAX_FILE_BYTES
        )}.`,
        "error"
      );
      resetFile();
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);

    setFile(f);
    setPreviewUrl(url);
  };

  const handleFileUpload = (event) => {
    const f = event.target.files?.[0];
    setFileWithPreview(f);
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Drag & Drop
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files?.length > 0) setFileWithPreview(files[0]);
  };

  // Duplicate check (debounced)
  const checkDuplicateInvoice = useRef(
    debounce(async (value) => {
      if (!value) {
        setIsDuplicate(false);
        setDuplicateInfo(null);
        setCheckingDuplicate(false);
        return;
      }
      setCheckingDuplicate(true);
      try {
        const response = await fetch(
          `http://localhost:8080/check-invoice/${encodeURIComponent(value)}`
        );
        if (response.ok) {
          const data = await response.json();
          const dup = Boolean(data?.is_duplicate);
          setIsDuplicate(dup);
          setDuplicateInfo(dup ? data : null);
        } else {
          console.error("Error checking invoice number:", await response.text());
          setIsDuplicate(false);
          setDuplicateInfo(null);
        }
      } catch (err) {
        console.error("Duplicate check failed:", err);
        setIsDuplicate(false);
        setDuplicateInfo(null);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 500)
  ).current;

  useEffect(() => {
    return () => checkDuplicateInvoice.cancel();
  }, [checkDuplicateInvoice]);

  const handleInvoiceNumberChange = (e) => {
    const value = e.target.value ?? "";
    setInvoiceNumber(value);
    const trimmed = String(value).trim();
    checkDuplicateInvoice(trimmed);
  };

  // Lock scroll behind CreateVendor modal
  useEffect(() => {
    document.body.style.overflow = showCreateVendor ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showCreateVendor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userEmail = localStorage.getItem("email");
    const invNo = normalizedInvoiceNumber;

    if (!invNo || !selectedVendor || !file) {
      showDialog("Please fill in all required fields.", "error");
      return;
    }
    if (isDuplicate) {
      showDialog("Invoice number is already in use. Please choose a different one.", "error");
      return;
    }

    const metadata = JSON.stringify({
      invoice_number: invNo,
      vendor: selectedVendor,
      remarks,
      document_type: documentType,
      user_email: userEmail || null,
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("metadata", metadata);

    try {
      setIsDisabled(true);
      const response = await fetch("http://localhost:8080/upload-invoice", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        showDialog("Invoice uploaded successfully and sent to REVIEW.", "success");
        persistRecentInvoiceNumber(invNo);
        setInvoiceNumber("");
        setSelectedVendor(null);
        setRemarks("");
        setDocumentType("Tax Invoice");
        resetFile();
      } else {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch (_) {}

        console.error("API Error Response:", errorData || response.statusText);

        if (
          errorData?.detail?.error === "Duplicate Invoice Detected" &&
          errorData?.detail?.old_avenue_id
        ) {
          const msg = `Duplicate Invoice Found: Invoice Number '${invoiceNumber}' is already linked to Avenue ID '${errorData.detail.old_avenue_id}'. Please change the Invoice Number.`;
          showDialog(msg, "error");
        } else {
          const genericMessage =
            errorData?.detail?.message || "An unexpected error occurred. Please try again.";
          showDialog(genericMessage, "error");
        }
      }
    } catch (error) {
      console.error("Submission Error:", error);
      showDialog("Failed to upload invoice. Please try again later.", "error");
    } finally {
      setIsDisabled(false);
    }
  };

  const openFilePicker = () => inputRef.current?.click();
  const canSubmit =
    !!normalizedInvoiceNumber && !!selectedVendor && !!file && !isDisabled && !checkingDuplicate && !isDuplicate;
  const duplicateAvenueId =
    duplicateInfo?.old_avenue_id ||
    duplicateInfo?.oldAvenueId ||
    duplicateInfo?.avenue_created_invoice_id ||
    duplicateInfo?.avenueCreatedId ||
    null;
  const duplicateMatches = Array.isArray(duplicateInfo?.matches) ? duplicateInfo.matches : null;
  const invoiceAlternatives = useMemo(() => {
    const base = String(normalizedInvoiceNumber || "").trim();
    if (!base) return [];

    const hasNumericSuffix = /(.*?)([_-])(\d{1,3})$/.exec(base);
    if (hasNumericSuffix) {
      const prefix = hasNumericSuffix[1];
      const sep = hasNumericSuffix[2];
      const n = Number(hasNumericSuffix[3]);
      const start = Number.isFinite(n) ? n + 1 : 1;
      return Array.from({ length: 3 }, (_, i) => `${prefix}${sep}${String(start + i).padStart(2, "0")}`);
    }

    // Default: append a small increment suffix
    return Array.from({ length: 3 }, (_, i) => `${base}_${String(i + 1).padStart(2, "0")}`);
  }, [normalizedInvoiceNumber]);

  return (
    <>
      <Backdrop
        open={isDisabled || isRedirecting}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.modal + 10,
          backdropFilter: "blur(2px)",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
          <CircularProgress color="inherit" />
          <Typography sx={{ fontWeight: 900 }}>
            {isRedirecting ? "Redirecting to Review Queue…" : "Uploading invoice…"}
          </Typography>
          <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
            Please don’t close this window.
          </Typography>
        </Box>
      </Backdrop>

      <Paper
        elevation={10}
        sx={{
          width: "min(980px, 94vw)", // ✅ smaller overall
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "#fff",
          position: "relative",
        }}
      >
        {/* Top bar (fixed layout so it doesn't shift when file preview exists) */}
        <Box
          sx={{
            px: 3,
            py: 2,
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box />
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#1f2937", textAlign: "center" }}>
            Upload Invoice
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.25 }}>
            <Button
              type="submit"
              form="upload-invoice-form"
              variant="contained"
              disabled={!canSubmit}
              sx={{
                bgcolor: "#4f7cf5",
                textTransform: "none",
                fontWeight: 900,
                px: 3,
                py: 1,
                borderRadius: 2,
                boxShadow: "none",
                whiteSpace: "nowrap",
                "&:hover": { bgcolor: "#3f6ff0", boxShadow: "none" },
              }}
            >
              {isDisabled ? "Submitting..." : checkingDuplicate ? "Checking..." : "Submit"}
            </Button>
            <Button
              onClick={() => onClose?.()}
              variant="text"
              startIcon={<CloseIcon />}
              disabled={isDisabled}
              sx={{
                color: "#ef4444",
                fontWeight: 800,
                textTransform: "none",
                px: 1.5,
                borderRadius: 2,
                backgroundColor:"rgba(239,68,68,0.08)",
                border:" 2px solid #ef4444"
              }}
            >
              Close
            </Button>
          </Box>
        </Box>

        <Divider />

        {/* Body */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Box component="form" id="upload-invoice-form" onSubmit={handleSubmit}>
            <Grid container spacing={2.25}>
              {/* LEFT: Preview (back, smaller like a real form) */}
              <Grid item xs={12} md={5}>
                <Box
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    bgcolor: "#fff",
                    p: 1.5,
                    minHeight: 320,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 900, color: "#111827" }}>Preview</Typography>

                    {file && (
                      <IconButton
                        onClick={resetFile}
                        size="small"
                        sx={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 2,
                        }}
                        aria-label="remove file"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>

                  {!file && (
                    <Box
                      sx={{
                        height: 260,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6b7280",
                        fontStyle: "italic",
                        bgcolor: "#f9fafb",
                        borderRadius: 2,
                        border: "1px dashed #e5e7eb",
                        px: 2,
                        textAlign: "center",
                      }}
                    >
                      No file selected. Upload a PDF or image to preview here.
                    </Box>
                  )}

                  {file && isPdf && previewUrl && (
                    <iframe
                      title="Invoice PDF Preview"
                      src={previewUrl}
                      width="100%"
                      height="260"
                      style={{ border: "1px solid #e5e7eb", borderRadius: 8 }}
                    />
                  )}

                  {file && isImage && previewUrl && (
                    <Box
                      sx={{
                        height: 260,
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                        bgcolor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt="Selected invoice"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </Box>
                  )}

                  {file && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: "wrap" }}>
                      <Chip
                        icon={isPdf ? <InsertDriveFileIcon /> : <ImageIcon />}
                        label={`${file.name} • ${humanFileSize(file.size)}`}
                        variant="outlined"
                      />
                    </Stack>
                  )}
                </Box>
              </Grid>

              {/* RIGHT: Form */}
              <Grid item xs={12} md={7}>
                <Grid container spacing={2.25}>
                  <Grid item xs={12} md={6}>
                    <Typography sx={{ mb: 0.75, color: "#6b7280", fontWeight: 800 }}>
                      Invoice Number
                    </Typography>
                    <TextField
                      value={invoiceNumber}
                      onChange={handleInvoiceNumberChange}
                      fullWidth
                      variant="outlined"
                      placeholder="ISS__lake__001"
                      error={isDuplicate}
                      inputProps={{
                        list: "recent-invoice-numbers",
                      }}
                      helperText={
                        checkingDuplicate
                          ? "Checking..."
                          : isDuplicate
                          ? duplicateAvenueId
                            ? `Already exists (Avenue ID: ${duplicateAvenueId})`
                            : "Already exists."
                          : normalizedInvoiceNumber
                          ? "Looks unique."
                          : " "
                      }
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          bgcolor: "#f3f4f6",
                          borderRadius: 2,
                        },
                      }}
                    />
                    <datalist id="recent-invoice-numbers">
                      {(recentInvoiceNumbers || []).map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>

                    {isDuplicate && (
                      <Box sx={{ mt: 0.75, width: "100%" }}>
                        {!!invoiceAlternatives.length && (
                          <Box sx={{ mb: 1 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#92400e", mb: 0.5 }}>
                              Try available alternatives
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {invoiceAlternatives.map((alt) => (
                                <Chip
                                  key={alt}
                                  clickable
                                  color="warning"
                                  variant="outlined"
                                  onClick={() => {
                                    setInvoiceNumber(alt);
                                    checkDuplicateInvoice(alt);
                                  }}
                                  label={alt}
                                  sx={{
                                    fontWeight: 800,
                                    "& .MuiChip-label": {
                                      overflowWrap: "anywhere",
                                    },
                                  }}
                                />
                              ))}
                            </Stack>
                          </Box>
                        )}

                        {/* Show whatever identifiers backend gives us */}
                        {!!duplicateAvenueId && (
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Chip
                              label={`Existing Avenue ID: ${duplicateAvenueId}`}
                              variant="outlined"
                              color="warning"
                              sx={{
                                width: "100%",
                                justifyContent: "flex-start",
                                "& .MuiChip-label": {
                                  width: "100%",
                                  whiteSpace: "normal",
                                  overflowWrap: "anywhere",
                                },
                              }}
                            />
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<ContentCopyIcon fontSize="small" />}
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(String(duplicateAvenueId));
                                  showDialog("Copied Avenue ID to clipboard.", "success");
                                } catch {
                                  showDialog("Failed to copy. Please copy manually.", "error");
                                }
                              }}
                              sx={{ textTransform: "none", fontWeight: 800 }}
                            >
                              Copy ID
                            </Button>
                          </Stack>
                        )}

                        {!!duplicateMatches?.length && (
                          <Box sx={{ mt: 1 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#92400e", mb: 0.5 }}>
                              Matches from server
                            </Typography>
                            <Stack spacing={0.75}>
                              {duplicateMatches.slice(0, 5).map((m, idx) => {
                                const id =
                                  m?.old_avenue_id ||
                                  m?.avenue_created_invoice_id ||
                                  m?.avenueId ||
                                  m?.id ||
                                  null;
                                const label = id ? `Avenue ID: ${id}` : JSON.stringify(m);
                                return (
                                  <Chip
                                    key={`${idx}-${String(id)}`}
                                    label={label}
                                    variant="outlined"
                                    color="warning"
                                    sx={{
                                      width: "100%",
                                      justifyContent: "flex-start",
                                      "& .MuiChip-label": {
                                        width: "100%",
                                        whiteSpace: "normal",
                                        overflowWrap: "anywhere",
                                      },
                                    }}
                                  />
                                );
                              })}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                    )}

                    {!!buildInvoiceSuggestion && !normalizedInvoiceNumber && (
                      <Box
                        sx={{
                          mt: 0.75,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                          width: "100%",
                        }}
                      >
                        <Chip
                          icon={<LightbulbOutlinedIcon />}
                          label={`Suggestion: ${buildInvoiceSuggestion}`}
                          variant="outlined"
                          sx={{
                            fontWeight: 700,
                            width: "100%",
                            justifyContent: "flex-start",
                            "& .MuiChip-label": {
                              width: "100%",
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            },
                          }}
                        />
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            setInvoiceNumber(buildInvoiceSuggestion);
                            checkDuplicateInvoice(buildInvoiceSuggestion);
                          }}
                          sx={{ textTransform: "none", fontWeight: 800 }}
                        >
                          Use suggestion
                        </Button>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography sx={{ mb: 0.75, color: "#6b7280", fontWeight: 800 }}>
                      Vendors
                    </Typography>
                    <VendorDropdown
                      onCreateVendor={() => setShowCreateVendor(true)}
                      onSelect={(vendor) => setSelectedVendor(vendor)}
                      value={selectedVendor}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography sx={{ mb: 0.75, color: "#6b7280", fontWeight: 800 }}>
                      Document Type
                    </Typography>
                    <FormControl fullWidth>
                      <InputLabel id="doc-type-label">Document Type</InputLabel>
                      <Select
                        labelId="doc-type-label"
                        value={documentType}
                        label="Document Type"
                        onChange={(e) => setDocumentType(e.target.value)}
                        sx={{
                          bgcolor: "#f3f4f6",
                          borderRadius: 2,
                        }}
                      >
                        <MenuItem value="Tax Invoice">Tax Invoice</MenuItem>
                        <MenuItem value="Proforma Invoice">Proforma Invoice</MenuItem>
                        <MenuItem value="N/A">N/A</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography sx={{ mb: 0.75, color: "#6b7280", fontWeight: 800 }}>
                      Remark
                    </Typography>
                    <TextField
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder=" "
                      fullWidth
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          bgcolor: "#f3f4f6",
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>

                  {/* Upload Area (like screenshot) */}
                  <Grid item xs={12}>
                    <Typography sx={{ mb: 1, color: "#6b7280", fontWeight: 900 }}>
                      Upload New Invoice
                    </Typography>

                    <Box
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={openFilePicker}
                      role="button"
                      tabIndex={0}
                      sx={{
                        height: 190, // ✅ smaller
                        borderRadius: 3,
                        border: "2px dashed",
                        borderColor: isDragging ? "#60a5fa" : "#93c5fd",
                        bgcolor: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        userSelect: "none",
                        outline: "none",
                        "&:hover": { bgcolor: "#f3f4f6" },
                      }}
                    >
                      <Typography sx={{ fontSize: 24, fontWeight: 650, color: "#3b82f6" }}>
                        Drag &amp; Drop File{" "}
                        <Typography component="span" sx={{ color: "#9ca3af", fontWeight: 650 }}>
                          Or{" "}
                        </Typography>
                        <Typography
                          component="span"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFilePicker();
                          }}
                          sx={{
                            color: "#3b82f6",
                            textDecoration: "underline",
                            fontWeight: 800,
                          }}
                        >
                          Upload
                        </Typography>
                      </Typography>

                      <input
                        ref={inputRef}
                        type="file"
                        hidden
                        accept="application/pdf,image/jpeg,image/jpg,image/png"
                        onChange={handleFileUpload}
                      />
                    </Box>

                    {/* Small remove row (so user can remove even without preview) */}
                    {file && (
                      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 1.5 }}>
                        <Chip
                          icon={isPdf ? <InsertDriveFileIcon /> : <ImageIcon />}
                          label={`${file.name} • ${humanFileSize(file.size)}`}
                          variant="outlined"
                        />
                        <IconButton
                          onClick={resetFile}
                          size="small"
                          sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}
                          aria-label="remove file"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}
                  </Grid>

                  {/* Optional bottom submit button (some people like it) */}
                  <Grid item xs={12} sx={{ display: { xs: "block", md: "none" } }}>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={isDisabled}
                      sx={{
                        bgcolor: "#4f7cf5",
                        textTransform: "none",
                        fontWeight: 900,
                        py: 1.1,
                        borderRadius: 2,
                        boxShadow: "none",
                        "&:hover": { bgcolor: "#3f6ff0", boxShadow: "none" },
                      }}
                    >
                      {isDisabled ? "Submitting..." : "Submit"}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>

      {/* Create vendor modal overlay */}
      {showCreateVendor && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            bgcolor: "rgba(0,0,0,0.15)",
          }}
        >
          <CreateNewVendor onClose={() => setShowCreateVendor(false)} />
        </Box>
      )}

      {/* Success / Error dialog */}
      {/*
        Smooth UX: dialog transitions in/out.
        Also blocks close during submit (button disabled + ESC/backdrop ignored).
      */}
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        TransitionComponent={forwardRef(function Transition(props, ref) {
          return <Slide direction="up" ref={ref} {...props} />;
        })}
        transitionDuration={220}
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: 8,
            bgcolor: dialogSeverity === "success" ? "#E8F5E9" : "#FFEBEE",
            color: dialogSeverity === "success" ? "#1B5E20" : "#B71C1C",
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 900 }}>
          {dialogSeverity === "success" ? (
            <CheckCircleIcon sx={{ color: "#2E7D32" }} />
          ) : (
            <ErrorIcon sx={{ color: "#D32F2F" }} />
          )}
          {dialogSeverity === "success" ? "Success" : "Error"}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 600 }}>{dialogMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleDialogClose}
            variant="contained"
            disabled={isDisabled}
            sx={{
              textTransform: "none",
              fontWeight: 900,
              bgcolor: dialogSeverity === "success" ? "#2E7D32" : "#D32F2F",
              "&:hover": {
                bgcolor: dialogSeverity === "success" ? "#256628" : "#b71c1c",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UploadInvoice;
