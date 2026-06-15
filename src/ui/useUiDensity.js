import { useMemo } from "react";
import { useMediaQuery, useTheme } from "@mui/material";

/**
 * Central "space-aware" sizing for screens.
 * Start by using this in BillsList, then reuse everywhere.
 */
export function useUiDensity() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only("xs"));
  const isSm = useMediaQuery(theme.breakpoints.only("sm"));
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

  return useMemo(() => {
    // Keep it simple: 3 density bands.
    if (isXs) {
      return {
        isCompact: true,
        isMdDown,
        pagePadding: 1.25,
        toolbarGap: 1,
        tabsGap: 1.5,
        tabFontSize: 11,
        buttonFontSize: 12,
        tableFontSize: 11.5,
        chipFontSize: 11,
        controlPy: 0.55,
      };
    }
    if (isSm) {
      return {
        isCompact: true,
        isMdDown,
        pagePadding: 2,
        toolbarGap: 1.25,
        tabsGap: 2,
        tabFontSize: 12,
        buttonFontSize: 13,
        tableFontSize: 12.5,
        chipFontSize: 12,
        controlPy: 0.65,
      };
    }
    return {
      isCompact: false,
      isMdDown,
      pagePadding: 3,
      toolbarGap: 2,
      tabsGap: 3,
      tabFontSize: 12,
      buttonFontSize: 13,
      tableFontSize: 13,
      chipFontSize: 12,
      controlPy: 0.7,
    };
  }, [isMdDown, isSm, isXs]);
}

