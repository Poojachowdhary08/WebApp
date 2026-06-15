import React from "react";
import { Box } from "@mui/material";
import { uiTokens } from "./tokens";

export default function SectionCard({ children, sx }) {
  return (
    <Box
      sx={{
        borderRadius: uiTokens.radius.card,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: uiTokens.shadow.card,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

