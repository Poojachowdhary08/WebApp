// src/components/ManpowerHeaderBar.jsx
import React from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";

const COLORS = {
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  brandBlue: "#2563EB",
};

export default function ManpowerHeaderBar({
  activeTab,
  onTabChange,

  // search
  showSearch = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",

  // view toggle (list/card)
  showViewToggle = false,
  view = "list", // "list" | "card"
  onSetView, // (mode) => void

  // right side icon actions next to search
  showSearchIcons = true,
  onRefresh,
  onClear,

  // ✅ export (NEW)
  showExport = false,
  exportLabel = "Download",
  onExport,
  exportDisabled = false,

  // optional add
  showAdd = false,
  addLabel = "+ Add",
  addTooltip,
  onAddClick,
}) {
  const tabs = [
    { key: "LABOR", label: "LABOUR" },
    { key: "CONTRACTOR", label: "CONTRACTOR" },
    { key: "EMPLOYEE", label: "EMPLOYEES" },
    { key: "VENDOR", label: "VENDORS" },
  ];

  const canClear = Boolean((searchValue || "").trim());

  const iconBtnSx = (active) => ({
    width: 40,
    height: 40,
    borderRadius: 2,
    bgcolor: active ? "#EFF6FF" : "#fff",
    border: `1px solid ${COLORS.border}`,
    "&:hover": { bgcolor: active ? "#DBEAFE" : "#F9FAFB" },
  });

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        borderBottom: `1px solid ${COLORS.border}`,
        gap: 2,
        px: 2,
        pt: 1.5,
        pb: 1.25,
        background: "#fff",
      }}
    >
      {/* LEFT: Blue bar + Tabs */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          flex: "1 1 520px",
        }}
      >
        <Box sx={{ width: 4, bgcolor: COLORS.brandBlue, height: 32, mr: 2 }} />

        <Stack direction="row" spacing={4} sx={{ minWidth: 0, flexWrap: "wrap", rowGap: 1 }}>
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <Box
                key={t.key}
                sx={{ cursor: "pointer", pb: 0.5 }}
                onClick={() => onTabChange?.(t.key)}
              >
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: isActive ? 800 : 650,
                    letterSpacing: 0.8,
                    color: isActive ? COLORS.brandBlue : COLORS.textSecondary,
                  }}
                >
                  {t.label}
                </Typography>

                <Box
                  sx={{
                    mt: 0.5,
                    height: 2,
                    bgcolor: isActive ? COLORS.brandBlue : "transparent",
                    borderRadius: 999,
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* RIGHT: Search + icons + view toggle + export + add */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flex: "0 0 auto",
          ml: "auto",
          width: { xs: "100%", md: "auto" },
          justifyContent: { xs: "flex-end", md: "flex-end" },
        }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{
            flexWrap: "nowrap",
            justifyContent: "flex-end",
            minWidth: 0,
            overflowX: "auto",
            py: 0.25,
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": { backgroundColor: "#E5E7EB", borderRadius: 999 },
          }}
        >
          {showSearch && (
            <TextField
              placeholder={searchPlaceholder}
              size="small"
              variant="outlined"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              sx={{
                width: { xs: 180, sm: 240, md: 340 },
                flexShrink: 1,
                bgcolor: "#FFFFFF",
                "& .MuiOutlinedInput-root": { borderRadius: "999px", height: 40 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: COLORS.textSecondary }} />
                  </InputAdornment>
                ),
              }}
            />
          )}

          {/* icons / view toggles (not tied to search visibility) */}
          {showSearchIcons && (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
              {onRefresh && (
                <Tooltip title="Refresh">
                  <span>
                    <IconButton onClick={onRefresh} sx={iconBtnSx(false)}>
                      <RefreshIcon sx={{ fontSize: 20, color: COLORS.brandBlue }} />
                    </IconButton>
                  </span>
                </Tooltip>
              )}

              {onClear && (
                <Tooltip title="Clear search">
                  <span>
                    <IconButton disabled={!canClear} onClick={onClear} sx={iconBtnSx(false)}>
                      <CloseIcon sx={{ fontSize: 20, color: canClear ? "#111827" : "#9CA3AF" }} />
                    </IconButton>
                  </span>
                </Tooltip>
              )}

              {showViewToggle && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: COLORS.border }} />

                  <Tooltip title="List View">
                    <IconButton onClick={() => onSetView?.("list")} sx={iconBtnSx(view === "list")}>
                      <ViewListIcon
                        sx={{
                          fontSize: 20,
                          color: view === "list" ? COLORS.brandBlue : COLORS.textSecondary,
                        }}
                      />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Card View">
                    <IconButton onClick={() => onSetView?.("card")} sx={iconBtnSx(view === "card")}>
                      <ViewModuleIcon
                        sx={{
                          fontSize: 20,
                          color: view === "card" ? COLORS.brandBlue : COLORS.textSecondary,
                        }}
                      />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
          )}

          {/* Export */}
          {showExport && (
            <Tooltip title={exportLabel || "Download"}>
              <span>
                <IconButton
                  onClick={onExport}
                  disabled={exportDisabled}
                  sx={iconBtnSx(false)}
                  aria-label={exportLabel || "Download"}
                >
                  <DownloadIcon sx={{ fontSize: 20, color: exportDisabled ? "#9CA3AF" : COLORS.brandBlue }} />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {showAdd && (
            <Tooltip title={addTooltip || ""} disableHoverListener={!addTooltip}>
              <Button
                variant="contained"
                sx={{
                  textTransform: "none",
                  fontWeight: 900,
                  borderRadius: 2,
                  height: 40,
                  minWidth: 40,
                  flexShrink: 0,
                  px: addLabel === "+" ? 0 : 2.2,
                  bgcolor: COLORS.brandBlue,
                  boxShadow: "0 8px 18px rgba(15,23,42,0.18)",
                  "&:hover": { bgcolor: "#1D4ED8" },
                  whiteSpace: "nowrap",
                  fontSize: addLabel === "+" ? 22 : 14,
                  lineHeight: 1,
                }}
                onClick={onAddClick}
              >
                {addLabel}
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Box>
    </Box>
  );
}