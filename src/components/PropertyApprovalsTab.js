import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import AddIcon from "@mui/icons-material/Add";

import AddEditApprovalDialog from "./AddEditApprovalDialog";
import ApprovalDetailDialog from "./ApprovalDetailDialog";
import ApprovalRecordCard from "./ApprovalRecordCard";
import {
  addComment,
  appendAttachments,
  cancelApproval,
  createApproval,
  listApprovals,
  updateApproval,
} from "../services/propertyApprovalsService";

const SECTION_DOT_COLORS = ["#166534", "#0d9488", "#2563EB", "#7c3aed", "#c2410c"];

function approvalTypeKey(row) {
  const t = String(row?.approvalType ?? row?.approval_type ?? "").trim();
  return t || "Uncategorized";
}

function groupApprovals(rows) {
  const map = new Map();
  (rows || []).forEach((a) => {
    const k = approvalTypeKey(a);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(a);
  });
  const keys = [...map.keys()].sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });
  return keys.map((approvalType) => ({
    approvalType,
    rows: map.get(approvalType),
  }));
}

function sectionProgress(sectionRows) {
  const total = sectionRows.length;
  const done = sectionRows.filter((a) => String(a?.status || "").toLowerCase() === "received").length;
  return { done, total };
}

export default function PropertyApprovalsTab({ propertyId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approvals, setApprovals] = useState([]);

  const [query, setQuery] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [editing, setEditing] = useState(null);

  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const rows = await listApprovals(propertyId);
      setApprovals(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e?.message || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredApprovals = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return approvals;
    return approvals.filter((a) => {
      const hay = [
        a.id,
        a.title,
        a.type,
        a.approvalType,
        a.approval_type,
        a.issuedBy,
        a.applicationNumber,
        a.status,
        a.internalNotes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [approvals, query]);

  const grouped = useMemo(() => groupApprovals(filteredApprovals), [filteredApprovals]);

  const openCard = (record) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const openCreate = (prefill) => {
    setDialogMode("create");
    setEditing(prefill || null);
    setDialogOpen(true);
  };

  const openEdit = () => {
    if (!detailRecord?.id) return;
    setDialogMode("edit");
    setEditing(detailRecord);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload) => {
    try {
      if (dialogMode === "edit" && editing?.id) {
        const updated = await updateApproval(editing.id, payload);
        setApprovals((prev) => prev.map((a) => (String(a.id) === String(updated.id) ? updated : a)));
        if (detailRecord?.id === updated.id) setDetailRecord(updated);
      } else {
        const created = await createApproval(propertyId, payload);
        setApprovals((prev) => [created, ...prev]);
        if (detailOpen && detailRecord?.id === created.id) setDetailRecord(created);
      }
      setDialogOpen(false);
    } catch (e) {
      setError(e?.message || "Failed to save approval");
    }
  };

  const act = async (fn) => {
    if (!detailRecord?.id) return;
    setError("");
    try {
      const updated = await fn(detailRecord.id);
      setApprovals((prev) => prev.map((a) => (String(a.id) === String(updated.id) ? updated : a)));
      setDetailRecord(updated);
    } catch (e) {
      setError(e?.message || "Action failed");
    }
  };

  const handleAppendFiles = async (files) => {
    if (!detailRecord?.id || !files?.length) return;
    setError("");
    try {
      const metas = Array.from(files).map((f, idx) => ({
        id: `F-${Date.now()}-${idx}`,
        name: f.name,
        size: f.size,
        type: f.type,
      }));
      const updated = await appendAttachments(detailRecord.id, metas);
      setApprovals((prev) => prev.map((a) => (String(a.id) === String(updated.id) ? updated : a)));
      setDetailRecord(updated);
    } catch (e) {
      setError(e?.message || "Failed to add documents");
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>Building approvals</Typography>
          <Typography sx={{ mt: 0.35, fontSize: 13, fontWeight: 600, color: "#64748B" }}>
            Loaded from the server, grouped by approval type. Click a card for documents and details.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="stretch">
          <TextField
            size="small"
            placeholder="Search approvals…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: { xs: "100%", sm: 280 }, bgcolor: "#fff", "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openCreate(null)}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: 2,
              bgcolor: "#0d9488",
              "&:hover": { bgcolor: "#0f766e" },
              whiteSpace: "nowrap",
            }}
          >
            New approval
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: "1px solid #FECACA", bgcolor: "#FEF2F2", mb: 2 }}>
          <Typography sx={{ fontWeight: 800, color: "#B91C1C" }}>{error}</Typography>
        </Paper>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 8 }}>
          <CircularProgress size={32} sx={{ color: "#0d9488" }} />
          <Typography sx={{ ml: 2, fontWeight: 700, color: "#64748B" }}>Loading approvals…</Typography>
        </Box>
      ) : grouped.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: "1px solid #E2E8F0", textAlign: "center" }}>
          <Typography sx={{ fontWeight: 800, color: "#334155", mb: 1 }}>No approvals yet</Typography>
          <Typography sx={{ color: "#64748B", fontSize: 14, mb: 2 }}>
            When the API returns rows, they appear here grouped by <strong>approval_type</strong>.
          </Typography>
          <Button variant="contained" onClick={() => openCreate(null)} sx={{ textTransform: "none", fontWeight: 800, bgcolor: "#0d9488" }}>
            Add your first approval
          </Button>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {grouped.map((section, idx) => {
            const { done, total } = sectionProgress(section.rows);
            const dotColor = SECTION_DOT_COLORS[idx % SECTION_DOT_COLORS.length];
            return (
              <Box key={section.approvalType}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: dotColor, flexShrink: 0 }} />
                  <Typography sx={{ fontWeight: 800, color: "#334155", fontSize: 15 }}>{section.approvalType}</Typography>
                  <Box sx={{ flex: 1, height: 1, bgcolor: "#E2E8F0", minWidth: 24 }} />
                  <Typography sx={{ fontWeight: 800, color: "#64748B", fontSize: 13 }}>
                    {done}/{total}
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    gap: 1.5,
                  }}
                >
                  {section.rows.map((row) => (
                    <ApprovalRecordCard key={row.id} approval={row} onClick={() => openCard(row)} />
                  ))}
                </Box>
              </Box>
            );
          })}

          <Paper
            elevation={0}
            onClick={() => openCreate(null)}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: "1px solid #E2E8F0",
              borderTop: "4px solid #0d9488",
              bgcolor: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: 2,
              transition: "box-shadow 0.2s",
              "&:hover": { boxShadow: "0 8px 24px rgba(13,148,136,0.12)" },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: "#0d9488",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AssignmentOutlinedIcon sx={{ color: "#fff", fontSize: 26 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 900, color: "#0f172a", fontSize: 17 }}>Log an approval entry</Typography>
              <Typography sx={{ color: "#64748B", fontSize: 14, mt: 0.5, fontWeight: 600 }}>
                Set approval type (section), dates, fees and documents — saved with your property.
              </Typography>
            </Box>
          </Paper>
        </Stack>
      )}

      <ApprovalDetailDialog
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailRecord(null);
        }}
        record={detailRecord}
        onEdit={openEdit}
        onArchive={() => act((id) => cancelApproval(id, "Archived"))}
        onSetStatus={(nextStatus) => act((id) => updateApproval(id, { status: nextStatus, by: "Admin" }))}
        onAddComment={(text) => act((id) => addComment(id, text, "Admin"))}
        onAppendFiles={handleAppendFiles}
      />

      <AddEditApprovalDialog
        open={dialogOpen}
        mode={dialogMode}
        initialValue={editing}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
