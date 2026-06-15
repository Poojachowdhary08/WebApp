import React, { useMemo } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InventoryPage from "./InventoryPage";

export default function InventoryPropertyPage() {
  const navigate = useNavigate();
  const { propertyId } = useParams();

  const safePropertyId = useMemo(() => String(propertyId || "").trim(), [propertyId]);

  if (!safePropertyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          Missing property id
        </Typography>
        <Button variant="contained" onClick={() => navigate("/home")}>
          Go Home
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F9FAFB" }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: "1px solid #E5E7EB",
          bgcolor: "#FFFFFF",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ textTransform: "none" }}
        >
          Back
        </Button>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#111827" }}>
          Property Inventory
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        <InventoryPage
          propertyId={safePropertyId}
          onClose={() => navigate(-1)}
          onTotalsChange={() => {}}
        />
      </Box>
    </Box>
  );
}

