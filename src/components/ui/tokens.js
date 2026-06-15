export const uiTokens = {
  radius: {
    card: 3,
    control: 2.5,
  },
  shadow: {
    card: "0 10px 30px rgba(15,23,42,0.06)",
    popover: "0 18px 50px rgba(15,23,42,0.18)",
    cardHover: "0 16px 40px rgba(15,23,42,0.12)",
  },
  layout: {
    pageMaxWidth: 1320,
    pagePadX: { xs: 0.75, sm: 1.25 },
  },
  /** Working CRM: one size for all chrome icons (40×40, 20px glyph). */
  crm: {
    toolbarGap: { xs: 1, sm: 1.5 },
    actionIconClusterGap: 0.5,
  },
};

/**
 * CRM stage palette (7-stage pipeline).
 * Keep surfaces very light; use border/accent for identity.
 */
export const crmStagePalette = Object.freeze({
  // Accent set (7-step): Magenta, Violet, Indigo, Azure, Teal, Mint, Green
  // Backgrounds are intentionally very light tints for long-session readability.
  fresh: { bg: "rgba(217,70,239,0.08)", border: "#D946EF", text: "#86198F" },
  requirements: { bg: "rgba(168,85,247,0.08)", border: "#A855F7", text: "#6D28D9" },
  shortlist: { bg: "rgba(99,102,241,0.08)", border: "#6366F1", text: "#3730A3" },
  site_visit: { bg: "rgba(59,130,246,0.08)", border: "#3B82F6", text: "#1D4ED8" },
  negotiate: { bg: "rgba(20,184,166,0.08)", border: "#14B8A6", text: "#0F766E" },
  legal: { bg: "rgba(52,211,153,0.08)", border: "#34D399", text: "#047857" },
  handover: { bg: "rgba(34,197,94,0.08)", border: "#22C55E", text: "#166534" },
});

const CRM_LEGACY_STAGE_MAP = Object.freeze({
  capture: "fresh",
  qualify: "requirements",
  deal_close: "handover",
});

export function normalizeCrmStageKey(stageKey) {
  const raw = String(stageKey || "").trim();
  if (!raw) return "fresh";
  return CRM_LEGACY_STAGE_MAP[raw] || raw;
}

export function getCrmStageStyle(stageKey) {
  const key = normalizeCrmStageKey(stageKey);
  return crmStagePalette[key] || crmStagePalette.fresh;
}

/**
 * Merged into CRM `IconButton` `sx` for filters, tools, import, chevrons, etc.
 * Icons use text.secondary by default; hover and focus go full-strength.
 */
export const crmActionIconButtonSx = {
  width: 40,
  height: 40,
  minWidth: 40,
  minHeight: 40,
  p: 0.75,
  boxSizing: "border-box",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2.5,
  bgcolor: "background.paper",
  color: "text.secondary",
  transition: "background-color 120ms ease, color 120ms ease, box-shadow 120ms ease",
  "&:hover": { bgcolor: "action.hover", color: "text.primary" },
  "&.Mui-disabled": { opacity: 0.5 },
  "& .MuiSvgIcon-root": { fontSize: 20, width: 20, height: 20, flexShrink: 0, opacity: 0.88 },
  "&:hover .MuiSvgIcon-root, &.Mui-focusVisible .MuiSvgIcon-root": { opacity: 1 },
  "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
};

/** Sticky header strip uses default surface (slightly off paper). */
export const crmActionIconButtonOnHeaderStripSx = {
  ...crmActionIconButtonSx,
  bgcolor: "background.default",
};

