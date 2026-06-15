import React from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  AppBar,
  Toolbar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function DashboardViewer({ open, onClose, url }) {
  if (!url) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          height: "95vh",
          maxHeight: "95vh",
          width: "95vw",
          maxWidth: "95vw",
          borderRadius: 2,
          overflow: "hidden",
        },
      }}
    >
      <AppBar position="static" sx={{ bgcolor: "#2A3663" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: "#fff" }}>
            Dashboard
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <DialogContent sx={{ p: 0, height: "calc(95vh - 64px)", overflow: "hidden" }}>
        {open && (
          <iframe
            key={url}
            src={url}
            width="100%"
            height="100%"
            style={{ border: "none", display: "block" }}
            title="Dashboard"
            allowFullScreen
            frameBorder="0"
            scrolling="auto"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}











