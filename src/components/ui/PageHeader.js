import React from "react";
import { Box, Typography } from "@mui/material";
import SectionCard from "./SectionCard";

export default function PageHeader({ title, subtitle, right, sticky = true }) {
  return (
    <SectionCard
      sx={{
        position: sticky ? "sticky" : "relative",
        top: sticky ? 0 : undefined,
        zIndex: sticky ? 3 : undefined,
        p: { xs: 1.25, sm: 1.5 },
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        columnGap: 2,
        rowGap: 1.5,
        flexWrap: "wrap",
        backdropFilter: "blur(8px)",
      }}
    >
      <Box sx={{ minWidth: 0, flex: { xs: "1 1 100%", sm: "1 1 200px" }, maxWidth: { sm: "min(100%, 52%)" } }}>
        <Typography
          component="h1"
          sx={{ fontSize: 20, fontWeight: 950, color: "text.primary", lineHeight: 1.15, wordBreak: "break-word" }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{ fontSize: 12, color: "text.secondary", fontWeight: 800, mt: 0.25, lineHeight: 1.35, wordBreak: "break-word" }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          flexWrap: "wrap",
          justifyContent: { xs: "flex-start", sm: "flex-end" },
          minWidth: 0,
          width: { xs: "100%", sm: "auto" },
          flex: { xs: "0 0 auto", sm: "0 1 auto" },
        }}
      >
        {right}
      </Box>
    </SectionCard>
  );
}

