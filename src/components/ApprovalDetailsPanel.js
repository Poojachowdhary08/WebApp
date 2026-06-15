import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

function statusChipSx(status) {
  const s = String(status || "").toLowerCase();
  if (s === "received") return { bgcolor: "#DCFCE7", color: "#166534" };
  if (s === "expired") return { bgcolor: "#FEF3C7", color: "#92400E" };
  if (s === "archived") return { bgcolor: "#E5E7EB", color: "#374151" };
  if (s === "applied") return { bgcolor: "#E0E7FF", color: "#3730A3" };
  if (s === "approved") return { bgcolor: "#D1FAE5", color: "#065F46" };
  if (s === "rejected") return { bgcolor: "#FEE2E2", color: "#991B1B" };
  return { bgcolor: "#F3F4F6", color: "#374151" }; // not_added / unknown
}

function fmtDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

export default function ApprovalDetailsPanel({
  approval,
  onEdit,
  onArchive,
  onSetStatus,
  onAddComment,
  hideDocumentsSection = false,
}) {
  const [comment, setComment] = useState("");

  const isArchived = useMemo(() => String(approval?.status || "").toLowerCase() === "archived", [approval?.status]);

  if (!approval) {
    return (
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E5E7EB", p: 2, minHeight: 420 }}>
        <Typography sx={{ fontWeight: 900, color: "#111827" }}>Select an approval</Typography>
        <Typography sx={{ mt: 0.5, color: "#6B7280", fontWeight: 700 }}>
          Choose a row from the list to view details, history, and actions.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E5E7EB", p: 2 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Box>
          <Typography sx={{ fontWeight: 1000, color: "#111827", fontSize: 18 }}>
            {approval.id} · {approval.type}
          </Typography>
          <Typography sx={{ mt: 0.25, color: "#374151", fontWeight: 800 }}>{approval.title || "—"}</Typography>
          {approval.description ? (
            <Typography sx={{ mt: 0.5, color: "#6B7280", fontWeight: 700, whiteSpace: "pre-wrap" }}>
              {approval.description}
            </Typography>
          ) : null}
        </Box>
        <Chip
          size="small"
          label={(approval.status || "not_added").toString().replaceAll("_", " ").toUpperCase()}
          sx={{ ...statusChipSx(approval.status), fontWeight: 900 }}
        />
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.2 }}>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Requested by
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.requestedBy || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Approver
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.approver || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Approval type
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.approvalSubtype || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Priority
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.priority || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Category
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.category || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Issued by
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.issuedBy || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Amount
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>
            {approval.amount == null || approval.amount === "" ? "—" : Number(approval.amount).toLocaleString()}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Target date
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.dueDate || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Application date
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.appliedDate || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Approval date
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.receivedDate || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Expiry / valid until
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.expiryDate || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Reference #
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.referenceNumber || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Application #
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.applicationNumber || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Vendor
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>
            {approval.vendorName || "—"}
          </Typography>
          {approval.vendorContact ? (
            <Typography sx={{ color: "#6B7280", fontWeight: 700, fontSize: 12 }}>{approval.vendorContact}</Typography>
          ) : null}
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Cost center
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.costCenter || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Department
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.requestedDepartment || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Related
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>
            {approval.relatedEntityType || "—"}{approval.relatedEntityId ? ` · ${approval.relatedEntityId}` : ""}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Phase
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{approval.requiredByPhase || "—"}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Created
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{fmtDate(approval.createdAt)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 900 }}>
            Updated
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{fmtDate(approval.updatedAt)}</Typography>
        </Box>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1.8, flexWrap: "wrap" }}>
        <Button
          size="small"
          variant="outlined"
          onClick={onEdit}
          disabled={isArchived}
          sx={{ textTransform: "none", fontWeight: 900 }}
        >
          Edit
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={onArchive}
          disabled={isArchived}
          sx={{ textTransform: "none", fontWeight: 900 }}
        >
          Archive
        </Button>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          {[
            { k: "applied", label: "Applied" },
            { k: "received", label: "Received" },
            { k: "expired", label: "Expired" },
            { k: "not_added", label: "Not added" },
          ].map((s) => (
            <Button
              key={s.k}
              size="small"
              variant={String(approval.status || "").toLowerCase() === s.k ? "contained" : "outlined"}
              onClick={() => onSetStatus?.(s.k)}
              disabled={isArchived}
              sx={{ textTransform: "none", fontWeight: 900 }}
            >
              {s.label}
            </Button>
          ))}
        </Stack>
      </Stack>

      <Divider sx={{ my: 1.8 }} />

      {(approval.feeOnlineAmount != null && approval.feeOnlineAmount !== "") ||
      (approval.feeOfflineAmount != null && approval.feeOfflineAmount !== "") ||
      approval.feeOnlineDate ||
      approval.feeOfflineDate ? (
        <>
          <Typography sx={{ fontWeight: 1000, color: "#111827", mb: 1 }}>Fees paid</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.2, mb: 2 }}>
            <Box sx={{ p: 1.2, borderRadius: 2, border: "1px solid #E5E7EB", bgcolor: "#FAFAFA" }}>
              <Typography variant="caption" sx={{ color: "#15803D", fontWeight: 900 }}>
                Online
              </Typography>
              <Typography sx={{ fontWeight: 800, color: "#111827" }}>
                {approval.currency || "INR"}{" "}
                {approval.feeOnlineAmount != null && approval.feeOnlineAmount !== ""
                  ? Number(approval.feeOnlineAmount).toLocaleString()
                  : "—"}
              </Typography>
              <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700 }}>
                Paid on: {approval.feeOnlineDate || "—"}
              </Typography>
            </Box>
            <Box sx={{ p: 1.2, borderRadius: 2, border: "1px solid #E5E7EB", bgcolor: "#FAFAFA" }}>
              <Typography variant="caption" sx={{ color: "#15803D", fontWeight: 900 }}>
                Offline
              </Typography>
              <Typography sx={{ fontWeight: 800, color: "#111827" }}>
                {approval.currency || "INR"}{" "}
                {approval.feeOfflineAmount != null && approval.feeOfflineAmount !== ""
                  ? Number(approval.feeOfflineAmount).toLocaleString()
                  : "—"}
              </Typography>
              <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700 }}>
                Paid on: {approval.feeOfflineDate || "—"}
              </Typography>
            </Box>
          </Box>
        </>
      ) : null}

      {!hideDocumentsSection ? (
        <>
          <Typography sx={{ fontWeight: 1000, color: "#111827", mb: 1 }}>Documents</Typography>
          <Stack direction="row" spacing={0.8} sx={{ mb: 2, flexWrap: "wrap" }}>
            {(approval.attachments || []).map((a) => (
              <Chip
                key={a.id || a.name}
                size="small"
                label={a.name || "Document"}
                sx={{ fontWeight: 900 }}
              />
            ))}
            {(approval.attachments || []).length === 0 ? (
              <Typography sx={{ color: "#6B7280", fontWeight: 700 }}>No documents attached.</Typography>
            ) : null}
          </Stack>
        </>
      ) : null}

      {approval.internalNotes ? (
        <>
          <Typography sx={{ fontWeight: 1000, color: "#111827", mb: 1 }}>Notes</Typography>
          <Box sx={{ mb: 2, p: 1.2, borderRadius: 2, bgcolor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
            <Typography sx={{ color: "#374151", fontWeight: 700, whiteSpace: "pre-wrap" }}>
              {approval.internalNotes}
            </Typography>
          </Box>
        </>
      ) : null}

      <Typography sx={{ fontWeight: 1000, color: "#111827", mb: 1 }}>History</Typography>
      <Stack spacing={1} sx={{ mb: 2 }}>
        {(approval.history || []).slice().reverse().slice(0, 8).map((h) => (
          <Box key={h.id} sx={{ p: 1, borderRadius: 2, bgcolor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
            <Typography sx={{ fontWeight: 900, color: "#111827", fontSize: 13 }}>
              {h.action} · {h.by || "—"}
            </Typography>
            <Typography sx={{ color: "#6B7280", fontWeight: 700, fontSize: 12 }}>{fmtDate(h.at)}</Typography>
            {h.note ? (
              <Typography sx={{ mt: 0.5, color: "#374151", fontWeight: 700, fontSize: 12, whiteSpace: "pre-wrap" }}>
                {h.note}
              </Typography>
            ) : null}
          </Box>
        ))}
        {(approval.history || []).length === 0 ? (
          <Typography sx={{ color: "#6B7280", fontWeight: 700 }}>No history yet.</Typography>
        ) : null}
      </Stack>

      <Typography sx={{ fontWeight: 1000, color: "#111827", mb: 1 }}>Comments</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <TextField
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          size="small"
          placeholder="Add a comment…"
          fullWidth
        />
        <Button
          variant="contained"
          onClick={() => {
            const t = String(comment || "").trim();
            if (!t) return;
            onAddComment?.(t);
            setComment("");
          }}
          sx={{ textTransform: "none", fontWeight: 900, bgcolor: "#2563EB", "&:hover": { bgcolor: "#1D4ED8" } }}
        >
          Add
        </Button>
      </Stack>

      <Stack spacing={1}>
        {(approval.comments || []).slice().reverse().slice(0, 6).map((c) => (
          <Box key={c.id} sx={{ p: 1, borderRadius: 2, bgcolor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
            <Typography sx={{ fontWeight: 900, color: "#111827", fontSize: 13 }}>{c.by || "—"}</Typography>
            <Typography sx={{ color: "#6B7280", fontWeight: 700, fontSize: 12 }}>{fmtDate(c.at)}</Typography>
            <Typography sx={{ mt: 0.5, color: "#374151", fontWeight: 700, fontSize: 13, whiteSpace: "pre-wrap" }}>
              {c.text}
            </Typography>
          </Box>
        ))}
        {(approval.comments || []).length === 0 ? (
          <Typography sx={{ color: "#6B7280", fontWeight: 700 }}>No comments yet.</Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}

