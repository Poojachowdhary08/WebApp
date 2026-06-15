import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

function isCompleteStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "received";
}

function previewText(approval) {
  const t =
    approval?.internalNotes ||
    approval?.notes ||
    approval?.description ||
    "";
  const s = String(t).trim();
  if (!s) return "—";
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
}

/**
 * One approval row from API — same card chrome as the old catalog cards.
 */
export default function ApprovalRecordCard({ approval, onClick }) {
  const title = approval?.title || approval?.type || "Approval";
  const authority = approval?.issuedBy || "—";
  const done = isCompleteStatus(approval?.status);
  const inProgress =
    approval &&
    !done &&
    String(approval.status || "").toLowerCase() !== "not_added" &&
    String(approval.status || "").toLowerCase() !== "archived";

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid #E8ECF0",
        bgcolor: "#fff",
        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
        cursor: "pointer",
        transition: "box-shadow 0.2s, border-color 0.2s",
        "&:hover": {
          boxShadow: "0 8px 24px rgba(15,23,42,0.1)",
          borderColor: "#0d9488",
        },
        position: "relative",
        minHeight: 132,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 14,
          right: 14,
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "2px solid",
          borderColor: done ? "#16a34a" : inProgress ? "#2563eb" : "#D1D5DB",
          bgcolor: done ? "#16a34a" : inProgress ? "rgba(37,99,235,0.15)" : "transparent",
        }}
      />
      <Box sx={{ display: "flex", gap: 1.5, pr: 3 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            bgcolor: "rgba(13, 148, 136, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <DescriptionOutlinedIcon sx={{ fontSize: 22, color: "#0f766e" }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, color: "#111827", fontSize: 14, lineHeight: 1.35, mb: 0.25 }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#6B7280", mb: 0.75 }}>{authority}</Typography>
          <Typography
            sx={{
              fontSize: 12,
              color: "#64748B",
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {previewText(approval)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
