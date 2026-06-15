import React from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MasterItemDetailsDialog from "./MasterItemDetailsDialog";

export default function MasterItemEditPage({ item, onBack, onUpdated, onDeleted }) {
  return (
    <Box sx={{ p: 2, bgcolor: "#ECEEF4", minHeight: "calc(100vh - 140px)" }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          p: 0,
          bgcolor: "#fff",
          boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 220px)",
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #EEF2F7", bgcolor: "#fff" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Button variant="outlined" size="small" startIcon={<ArrowBackIcon />} onClick={onBack}>
                Back
              </Button>
              <Typography sx={{ fontWeight: 900, color: "#111827" }}>Edit Master Item</Typography>
            </Stack>
            <Box />
          </Stack>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <MasterItemDetailsDialog
            open={true}
            pageMode={true}
            initialMode="edit"
            item={item}
            isMobile={false}
            onClose={onBack}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        </Box>
      </Paper>
    </Box>
  );
}

