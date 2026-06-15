import React from "react";
import { Box } from "@mui/material";
import { uiTokens } from "./tokens";

export default function PageContainer({ children, sx }) {
  return (
    <Box
      sx={{
        maxWidth: uiTokens.layout.pageMaxWidth,
        mx: "auto",
        px: uiTokens.layout.pagePadX,
        pb: 2,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

