import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const STYLES = {
  success: { border: "#BBF7D0", bg: "#F0FDF4", icon: "#16A34A", title: "#065F46", body: "#064E3B" },
  error: { border: "#FECACA", bg: "#FEF2F2", icon: "#DC2626", title: "#7F1D1D", body: "#7F1D1D" },
  warning: { border: "#FED7AA", bg: "#FFFBEB", icon: "#B45309", title: "#92400E", body: "#92400E" },
  info: { border: "#BFDBFE", bg: "#EFF6FF", icon: "#2563EB", title: "#1E3A8A", body: "#1E3A8A" },
};

const ICONS = {
  success: CheckCircleIcon,
  error: ErrorIcon,
  warning: WarningAmberIcon,
  info: InfoIcon,
};

export function StatusBox({ variant = "info", title, children, actions }) {
  const v = STYLES[variant] ? variant : "info";
  const Icon = ICONS[v] || InfoIcon;
  const s = STYLES[v];

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${s.border}`,
        bgcolor: s.bg,
        borderRadius: 2,
        p: 1.5,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Box sx={{ pt: 0.25, color: s.icon, flex: "0 0 auto" }} aria-hidden="true">
          <Icon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {title ? (
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: s.title, lineHeight: 1.2 }}>
              {title}
            </Typography>
          ) : null}
          {children ? (
            <Typography sx={{ fontSize: 13, color: s.body, mt: title ? 0.35 : 0, wordBreak: "break-word" }}>
              {children}
            </Typography>
          ) : null}
        </Box>
        {actions ? <Box sx={{ flex: "0 0 auto" }}>{actions}</Box> : null}
      </Stack>
    </Paper>
  );
}

