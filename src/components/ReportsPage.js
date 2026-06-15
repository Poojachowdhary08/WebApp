import React from "react";
import {
  Box,
  Typography,
  Grid,
  CardActionArea,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function ReportsPage({ onClose, onTileClick }) {
  // Original morning dashboard URL
  const originalDashboardUrl = "https://superset.datso.io/superset/dashboard/4778f062-8abe-47a3-91d0-12a732e08e06/?permalink_key=2ZGRJK8OX36&standalone=true";
  
  const tiles = [
    {
      key: "admin",
      title: "Admin",
      image:
        "https://static.vecteezy.com/system/resources/previews/007/783/979/non_2x/the-construction-team-working-on-a-new-project-vector.jpg",
      url: "https://superset.datso.io/superset/dashboard/p/JLazblyXKOx/",
    },
    {
      key: "finance",
      title: "Finance",
      image:
        "https://media.istockphoto.com/id/1253077368/vector/vector-flat-illustration-bank-building-on-a-white-background-bank-financing-money-exchange.jpg?s=612x612&w=0&k=20&c=FhfSoBEfUkI6xzeYvqbN2naUztqjABmq4b_A9PiRCX0=",
      url: originalDashboardUrl,
    },
    {
      key: "projects",
      title: "Projects",
      image:
        "https://static.vecteezy.com/system/resources/previews/007/783/979/non_2x/the-construction-team-working-on-a-new-project-vector.jpg",
      url: originalDashboardUrl,
    },
    {
      key: "inventory",
      title: "Inventory",
      image:
        "https://media.istockphoto.com/id/1307725067/vector/vector-of-an-architect-reviewing-plan-of-a-new-building-at-a-construction-site.jpg?s=612x612&w=0&k=20&c=1pGNyB5zcehXBneTZ7c1zeyEVxpziUZjmI0knjM3gFA=",
      url: originalDashboardUrl,
    },
  ];

  const handleTileClick = (tile) => {
    if (onTileClick) {
      onTileClick(tile.url);
    }
  };

  return (
    <Box
      sx={{
        height: "100%",
        bgcolor: "#F5F7FB",
        px: { xs: 2, md: 4 },
        py: { xs: 2.5, md: 3 },
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      {/* Centered header */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box />
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              letterSpacing: "0.5px",
              color: "#0F172A",
              textTransform: "uppercase",
            }}
          >
            Reports
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <IconButton
            onClick={onClose}
            sx={{
              bgcolor: "#ffffff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              "&:hover": { bgcolor: "#F3F4F6" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Dynamic tile grid */}
      <Grid container spacing={3}>
        {tiles.map((tile) => (
          <Grid item key={tile.key} xs={12} sm={6} md={3}>
            <CardActionArea onClick={() => handleTileClick(tile)}>
              <Box
                sx={{
                  borderRadius: 4,
                  px: 2,
                  py: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.5, // space between image and text
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #E5ECFF 50%, #F5F7FB 100%)",
                  boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px) scale(1.01)",
                    boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
                  },
                }}
              >
                {/* Image area */}
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    component="img"
                    src={tile.image}
                    alt={tile.title}
                    sx={{
                      width: "100%",
                      maxWidth: 260,
                      maxHeight: 160,
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </Box>

                {/* Title under image */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: "#111827",
                    textAlign: "center",
                  }}
                >
                  {tile.title}
                </Typography>
              </Box>
            </CardActionArea>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

