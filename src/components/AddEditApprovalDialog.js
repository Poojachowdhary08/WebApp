import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import AttachedFilesTable from "./AttachedFilesTable";

/** Groups cards in the property approvals tab (same as API `approval_type`). */
const APPROVAL_SECTION_TYPES = [
  "Pre-Construction",
  "During Construction",
  "Post-Construction",
  "General",
];

const ALL_APPROVAL_LABELS = [
  "Building plan sanction",
  "Commencement certificate",
  "Fire NOC",
  "Environmental clearance",
  "Electricity connection",
  "Water / sewage connection",
  "Lift inspection",
  "Occupancy certificate (OC)",
  "Completion certificate (CC)",
  "Sale Deed / Title Deed",
  "Encumbrance Certificate (EC)",
  "Other",
];

/** Suggested approval names per section (dropdown + search prioritizes these). */
const APPROVAL_OPTIONS_BY_SECTION = {
  "Pre-Construction": [
    "Building plan sanction",
    "Commencement certificate",
    "Fire NOC",
    "Environmental clearance",
    "Soil / structural approval",
    "Other",
  ],
  "During Construction": [
    "Electricity connection",
    "Water / sewage connection",
    "Lift inspection",
    "Fire NOC (renewal)",
    "Other",
  ],
  "Post-Construction": [
    "Occupancy certificate (OC)",
    "Completion certificate (CC)",
    "Sale Deed / Title Deed",
    "Encumbrance Certificate (EC)",
    "Other",
  ],
  General: ALL_APPROVAL_LABELS,
};

function catalogKeyFromTitle(title) {
  const s = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return s || "approval";
}

const CATEGORY_OPTIONS = ["Statutory", "NOC", "Certificate", "Connection", "Amendment", "Renewal", "Other"];

const STATUS_OPTIONS = [
  { value: "not_added", label: "Not added" },
  { value: "applied", label: "Applied" },
  { value: "received", label: "Received" },
  { value: "expired", label: "Expired" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

const CURRENCY_OPTIONS = ["INR", "USD", "EUR"];

function SectionLabel({ children }) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 1.2,
        color: "#6B7280",
        textTransform: "uppercase",
        mb: 1.5,
      }}
    >
      {children}
    </Typography>
  );
}

function SubSectionLabel({ children, color = "#15803D" }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color, mb: 1 }}>
      {children}
    </Typography>
  );
}

export default function AddEditApprovalDialog({ open, mode, initialValue, onClose, onSubmit }) {
  const dialogTitle = mode === "edit" ? "Edit approval" : "+ New Approval";

  const init = useMemo(
    () => ({
      catalogKey: initialValue?.catalogKey ?? "",
      approvalType:
        initialValue?.approvalType ??
        initialValue?.approval_type ??
        "General",
      approval: initialValue?.title ?? initialValue?.approval ?? initialValue?.type ?? "",
      approvalSubtype: initialValue?.approvalSubtype ?? "Statutory",
      issuedBy: initialValue?.issuedBy ?? "",
      applicationNumber: initialValue?.applicationNumber ?? "",
      status: initialValue?.status ?? "not_added",
      appliedDate: initialValue?.appliedDate ?? initialValue?.submissionDate ?? "",
      receivedDate: initialValue?.receivedDate ?? initialValue?.approvalDate ?? "",
      expiryDate: initialValue?.expiryDate ?? "",
      currency: initialValue?.currency ?? "INR",
      feeOnlineAmount: initialValue?.feeOnlineAmount ?? "",
      feeOnlineDate: initialValue?.feeOnlineDate ?? "",
      feeOfflineAmount: initialValue?.feeOfflineAmount ?? "",
      feeOfflineDate: initialValue?.feeOfflineDate ?? "",
      notes: initialValue?.notes ?? initialValue?.internalNotes ?? "",
      attachments: Array.isArray(initialValue?.attachments) ? initialValue.attachments : [],
    }),
    [initialValue]
  );

  const [form, setForm] = useState(init);
  const [touched, setTouched] = useState(false);
  const [pickedFiles, setPickedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(init);
      setTouched(false);
      setPickedFiles([]);
      setDragOver(false);
    }
  }, [open, init]);

  const MAX_FILE_BYTES = 10 * 1024 * 1024;

  const addFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []).filter((f) => {
      if (f.size > MAX_FILE_BYTES) {
        window.alert(`Skipped "${f.name}" — larger than 10MB.`);
        return false;
      }
      return true;
    });
    if (!files.length) return;
    setPickedFiles((prev) => [...prev, ...files]);
  }, []);

  const attachmentTableRows = useMemo(() => {
    const saved = (form.attachments || []).map((a, i) => ({
      id: `saved-${i}`,
      name: a.name,
      size: a.size,
    }));
    const picked = pickedFiles.map((f, i) => ({
      id: `pick-${i}`,
      name: f.name,
      size: f.size,
    }));
    return [...saved, ...picked];
  }, [form.attachments, pickedFiles]);

  const removeAttachmentRow = useCallback((id) => {
    if (String(id).startsWith("pick-")) {
      const i = Number(String(id).replace("pick-", ""));
      setPickedFiles((prev) => prev.filter((_, j) => j !== i));
      return;
    }
    if (String(id).startsWith("saved-")) {
      const i = Number(String(id).replace("saved-", ""));
      setForm((p) => ({
        ...p,
        attachments: (p.attachments || []).filter((_, j) => j !== i),
      }));
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      addFiles(e.dataTransfer?.files);
    },
    [addFiles]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const approvalError = touched && !String(form.approval || "").trim();

  const handleReset = () => {
    const empty = {
      catalogKey: "",
      approvalType: "General",
      approval: "",
      approvalSubtype: "Statutory",
      issuedBy: "",
      applicationNumber: "",
      status: "not_added",
      appliedDate: "",
      receivedDate: "",
      expiryDate: "",
      currency: "INR",
      feeOnlineAmount: "",
      feeOnlineDate: "",
      feeOfflineAmount: "",
      feeOfflineDate: "",
      notes: "",
      attachments: [],
    };
    setForm(empty);
    setPickedFiles([]);
    setTouched(false);
  };

  const handleSubmit = () => {
    setTouched(true);
    if (!String(form.approval || "").trim()) return;

    const pickedMeta = pickedFiles.map((f, idx) => ({
      id: `F-${Date.now()}-${idx}`,
      name: f.name,
      size: f.size,
      type: f.type,
    }));

    const title = String(form.approval).trim();
    const type = String(form.approval).trim();
    const catalogKey = String(form.catalogKey || "").trim() || catalogKeyFromTitle(title);

    onSubmit?.({
      catalogKey,
      approvalType: form.approvalType || "General",
      approval_type: form.approvalType || "General",
      type,
      title,
      approvalSubtype: form.approvalSubtype,
      issuedBy: form.issuedBy,
      applicationNumber: form.applicationNumber,
      status: form.status,
      appliedDate: form.appliedDate || null,
      receivedDate: form.receivedDate || null,
      expiryDate: form.expiryDate || null,
      currency: form.currency,
      feeOnlineAmount: form.feeOnlineAmount === "" ? null : Number(form.feeOnlineAmount),
      feeOnlineDate: form.feeOnlineDate || null,
      feeOfflineAmount: form.feeOfflineAmount === "" ? null : Number(form.feeOfflineAmount),
      feeOfflineDate: form.feeOfflineDate || null,
      internalNotes: form.notes,
      notes: form.notes,
      attachments: [...(form.attachments || []), ...pickedMeta],
    });
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      bgcolor: "#FAFAFA",
    },
  };

  const sectionTypeOptions = useMemo(() => {
    const set = new Set(APPROVAL_SECTION_TYPES);
    const cur = String(form.approvalType || "").trim();
    if (cur) set.add(cur);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [form.approvalType]);

  /** Section-aware suggestions; current value + full catalog always searchable. */
  const smartApprovalOptions = useMemo(() => {
    const sec = String(form.approvalType || "General").trim();
    const primary = APPROVAL_OPTIONS_BY_SECTION[sec] || APPROVAL_OPTIONS_BY_SECTION.General;
    const ordered = [];
    const seen = new Set();
    const push = (x) => {
      const t = String(x || "").trim();
      if (!t || seen.has(t)) return;
      seen.add(t);
      ordered.push(t);
    };
    const cur = String(form.approval || "").trim();
    if (cur) push(cur);
    (primary || []).forEach(push);
    ALL_APPROVAL_LABELS.forEach(push);
    return ordered;
  }, [form.approvalType, form.approval]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      <DialogTitle sx={{ fontWeight: 800, color: "#111827", fontSize: 20, px: 3, pt: 2.5, pb: 1 }}>
        {dialogTitle}
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 1 }}>
        <Stack spacing={3}>
          {/* Approval details */}
          <Box>
            <SectionLabel>Approval details</SectionLabel>
            <Stack spacing={2}>
              <TextField
                select
                label="Approval type (section)"
                value={form.approvalType}
                onChange={(e) => setForm((p) => ({ ...p, approvalType: e.target.value }))}
                fullWidth
                helperText="Groups this row under a divider in the approvals list (matches API approval_type)."
                sx={fieldSx}
              >
                {sectionTypeOptions.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>

              <Autocomplete
                freeSolo
                options={smartApprovalOptions}
                value={form.approval}
                onChange={(e, newValue) => {
                  setForm((p) => ({ ...p, approval: typeof newValue === "string" ? newValue : "" }));
                }}
                onInputChange={(e, value, reason) => {
                  if (reason === "input" || reason === "clear") {
                    setForm((p) => ({ ...p, approval: value }));
                  }
                }}
                filterOptions={(opts, state) => {
                  const q = String(state.inputValue || "").trim().toLowerCase();
                  if (!q) return opts;
                  return opts.filter((o) => String(o).toLowerCase().includes(q));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Approval name"
                    placeholder="Search or type a custom approval"
                    error={Boolean(approvalError)}
                    helperText={
                      approvalError
                        ? "Enter or select an approval"
                        : `Suggestions for “${form.approvalType || "General"}”. Type to filter or enter any name.`
                    }
                    sx={fieldSx}
                  />
                )}
              />

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField
                  select
                  label="Category"
                  value={form.approvalSubtype}
                  onChange={(e) => setForm((p) => ({ ...p, approvalSubtype: e.target.value }))}
                  fullWidth
                  sx={fieldSx}
                >
                  {CATEGORY_OPTIONS.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  fullWidth
                  sx={fieldSx}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <TextField
                label="Issuing authority"
                value={form.issuedBy}
                onChange={(e) => setForm((p) => ({ ...p, issuedBy: e.target.value }))}
                fullWidth
                placeholder="e.g. BBMP, Sub-Registrar Office"
                sx={fieldSx}
              />

              <TextField
                label="Application number"
                value={form.applicationNumber}
                onChange={(e) => setForm((p) => ({ ...p, applicationNumber: e.target.value }))}
                fullWidth
                placeholder="e.g. APP/2025/12345"
                sx={fieldSx}
              />
            </Stack>
          </Box>

          {/* Important dates */}
          <Box>
            <SectionLabel>Important dates</SectionLabel>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
              <TextField
                label="Application date"
                type="date"
                value={form.appliedDate || ""}
                onChange={(e) => setForm((p) => ({ ...p, appliedDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
              <TextField
                label="Approval date"
                type="date"
                value={form.receivedDate || ""}
                onChange={(e) => setForm((p) => ({ ...p, receivedDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
              <TextField
                label="Expiry / Valid until"
                type="date"
                value={form.expiryDate || ""}
                onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Box>
          </Box>

          {/* Fees paid */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1.2,
                  color: "#6B7280",
                  textTransform: "uppercase",
                }}
              >
                Fees paid
              </Typography>
              <TextField
                select
                size="small"
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                sx={{ minWidth: 88, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "#E5E7EB" }}>
                <SubSectionLabel>Online payment</SubSectionLabel>
                <Stack spacing={2}>
                  <TextField
                    label="Amount paid online"
                    type="number"
                    value={form.feeOnlineAmount}
                    onChange={(e) => setForm((p) => ({ ...p, feeOnlineAmount: e.target.value }))}
                    fullWidth
                    inputProps={{ min: 0, step: "0.01" }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ fontWeight: 700, color: "#6B7280" }}>₹</Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={fieldSx}
                  />
                  <TextField
                    label="Online paid on"
                    type="date"
                    value={form.feeOnlineDate || ""}
                    onChange={(e) => setForm((p) => ({ ...p, feeOnlineDate: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={fieldSx}
                  />
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "#E5E7EB" }}>
                <SubSectionLabel>Offline / cash payment</SubSectionLabel>
                <Stack spacing={2}>
                  <TextField
                    label="Amount paid offline"
                    type="number"
                    value={form.feeOfflineAmount}
                    onChange={(e) => setForm((p) => ({ ...p, feeOfflineAmount: e.target.value }))}
                    fullWidth
                    inputProps={{ min: 0, step: "0.01" }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ fontWeight: 700, color: "#6B7280" }}>₹</Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={fieldSx}
                  />
                  <TextField
                    label="Offline paid on"
                    type="date"
                    value={form.feeOfflineDate || ""}
                    onChange={(e) => setForm((p) => ({ ...p, feeOfflineDate: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={fieldSx}
                  />
                </Stack>
              </Paper>
            </Box>
          </Box>

          {/* Documents — file-management style upload + table */}
          <Box>
            <SectionLabel>Documents</SectionLabel>
            <Paper
              component="div"
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 4 },
                borderRadius: 3,
                border: "2px dashed",
                borderColor: dragOver ? "#6366F1" : "#C7D2FE",
                bgcolor: dragOver ? "rgba(99, 102, 241, 0.06)" : "#FAFBFF",
                transition: "border-color 0.2s, background 0.2s",
                textAlign: "center",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "center", mb: 2, position: "relative", width: "fit-content", mx: "auto" }}>
                <InsertDriveFileOutlinedIcon sx={{ fontSize: 56, color: "#94A3B8" }} />
                <AddIcon
                  sx={{
                    position: "absolute",
                    bottom: 2,
                    right: -4,
                    fontSize: 22,
                    color: "#6366F1",
                    bgcolor: "#fff",
                    borderRadius: "50%",
                    border: "2px solid #EEF2FF",
                  }}
                />
              </Box>
              <Typography sx={{ fontWeight: 700, color: "#334155", fontSize: 16, mb: 0.5 }}>
                Click or drag to upload — multiple files allowed.
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748B", mb: 2.5, fontWeight: 500 }}>
                PDF, JPG, PNG, DOC, SVG (10MB per file). You can add more documents later from the approval detail view.
              </Typography>
              <Button
                component="label"
                variant="contained"
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  bgcolor: "#2563EB",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                  "&:hover": { bgcolor: "#1D4ED8" },
                }}
              >
                Browse files
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.svg"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </Button>
            </Paper>

            <AttachedFilesTable
              rows={attachmentTableRows}
              onRemove={removeAttachmentRow}
              subtitle="Review files before saving. Remove any file you do not want to attach."
            />
          </Box>

          {/* Notes */}
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#111827", mb: 1 }}>Notes</Typography>
            <TextField
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              fullWidth
              multiline
              minRows={4}
              placeholder="Officer name, receipt number, follow-up details, etc."
              sx={{
                ...fieldSx,
                "& .MuiOutlinedInput-root": { alignItems: "flex-start" },
              }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1, justifyContent: "flex-end" }}>
        <Button
          onClick={handleReset}
          variant="outlined"
          sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2, borderColor: "#D1D5DB", color: "#374151" }}
        >
          Reset
        </Button>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{
            textTransform: "none",
            fontWeight: 800,
            borderRadius: 2,
            px: 2.5,
            bgcolor: "#166534",
            "&:hover": { bgcolor: "#14532D" },
          }}
        >
          {mode === "edit" ? "Save changes" : "Save approval entry"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
