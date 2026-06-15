import React, { useCallback, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ApprovalDetailsPanel from "./ApprovalDetailsPanel";
import AttachedFilesTable from "./AttachedFilesTable";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export default function ApprovalDetailDialog({
  open,
  onClose,
  record,
  onEdit,
  onArchive,
  onSetStatus,
  onAddComment,
  /** Called with chosen files; parent uploads metadata via `appendAttachments` (or PATCH). */
  onAppendFiles,
}) {
  const hasRecord = Boolean(record?.id);
  const attachments = record?.attachments || [];
  const title = record?.title || record?.type || "Approval";
  const authority = record?.issuedBy || "";
  const [uploadBusy, setUploadBusy] = useState(false);

  const handleFileInput = useCallback(
    async (e) => {
      const list = e.target?.files;
      e.target.value = "";
      if (!list?.length || !onAppendFiles) return;
      const files = Array.from(list).filter((f) => {
        if (f.size > MAX_FILE_BYTES) {
          window.alert(`Skipped "${f.name}" — larger than 10MB.`);
          return false;
        }
        return true;
      });
      if (!files.length) return;
      setUploadBusy(true);
      try {
        await onAppendFiles(files);
      } finally {
        setUploadBusy(false);
      }
    },
    [onAppendFiles]
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>
        {title}
        {authority ? (
          <Typography variant="body2" sx={{ color: "#6B7280", fontWeight: 600, mt: 0.5 }}>
            {authority}
          </Typography>
        ) : null}
        {record?.approvalType || record?.approval_type ? (
          <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, display: "block", mt: 0.5 }}>
            {String(record.approvalType || record.approval_type)}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "#FAFBFC" }}>
        {!hasRecord ? (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px dashed #CBD5E1", bgcolor: "#fff" }}>
            <Typography sx={{ color: "#64748B", fontSize: 14 }}>No approval selected.</Typography>
          </Paper>
        ) : (
          <>
            {onAppendFiles ? (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  border: "1px solid #E0E7FF",
                  bgcolor: "#F8FAFF",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 1.5,
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 800, color: "#334155", fontSize: 14 }}>Documents</Typography>
                  <Typography sx={{ color: "#64748B", fontSize: 13, mt: 0.25 }}>
                    Add files anytime after this approval is saved — you can select multiple files (10MB each).
                  </Typography>
                </Box>
                <Button
                  component="label"
                  variant="contained"
                  size="small"
                  disabled={uploadBusy}
                  startIcon={uploadBusy ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 800,
                    borderRadius: 2,
                    bgcolor: "#2563EB",
                    flexShrink: 0,
                  }}
                >
                  {uploadBusy ? "Adding…" : "Add documents"}
                  <input
                    type="file"
                    hidden
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.svg"
                    onChange={handleFileInput}
                  />
                </Button>
              </Paper>
            ) : null}

            {attachments.length === 0 ? (
              <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2, border: "1px solid #E2E8F0", bgcolor: "#fff" }}>
                <Typography sx={{ color: "#64748B", fontSize: 14 }}>No files uploaded for this approval yet.</Typography>
              </Paper>
            ) : (
              <Box sx={{ mb: 2 }}>
                <AttachedFilesTable
                  rows={attachments.map((a, i) => ({
                    id: String(a.id || `att-${i}`),
                    name: a.name,
                    size: a.size,
                  }))}
                  title="Attached files"
                  subtitle="Review uploaded files. Use “Add documents” above to attach more at any time."
                />
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <ApprovalDetailsPanel
              approval={record}
              onEdit={onEdit}
              onArchive={onArchive}
              onSetStatus={onSetStatus}
              onAddComment={onAddComment}
              hideDocumentsSection
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
