// InventoryForecastSummaryCards.js – KPI summary cards for inventory forecast planning
import React from "react";
import { Box, Typography, Paper, Skeleton } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DescriptionIcon from "@mui/icons-material/Description";
import PreviewIcon from "@mui/icons-material/Preview";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const StatCard = ({ icon: Icon, label, value, subtext, color = "#0f766e", loading }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid #e5e7eb",
        bgcolor: "#fff",
        height: "100%",
        minHeight: { xs: 80, sm: 90 },
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "box-shadow 0.2s, border-color 0.2s",
        "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.06)", borderColor: "#cbd5e1" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: `${color}14`, color, flexShrink: 0 }}>
          <Icon sx={{ fontSize: { xs: 18, sm: 20 } }} />
        </Box>
        <Typography sx={{ fontSize: { xs: 11, sm: 12 }, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Box>
      {loading ? (
        <Skeleton variant="text" width="60%" height={32} />
      ) : (
        <>
          <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
            {value}
          </Typography>
          {subtext && (
            <Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.5 }}>{subtext}</Typography>
          )}
        </>
      )}
    </Paper>
  );
};

const InventoryForecastSummaryCards = ({
  schedulePhasesCount,
  selectedTemplateName,
  draftTotalCost,
  plannedItemsCount,
  missingPhasesCount,
  loadingSchedule,
  loadingTemplates,
}) => {
  const hasSchedule = schedulePhasesCount > 0;
  const hasTemplate = !!selectedTemplateName;
  const hasMissingPhases = missingPhasesCount > 0;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
        gap: { xs: 1.5, sm: 2 },
        mb: { xs: 2, sm: 3 },
      }}
    >
      <StatCard
        icon={CalendarMonthIcon}
        label="Schedule phases"
        value={loadingSchedule ? "—" : schedulePhasesCount ?? 0}
        subtext={hasSchedule ? "Phases in schedule" : "Upload schedule first"}
        color={hasSchedule ? "#0f766e" : "#94a3b8"}
        loading={loadingSchedule}
      />
      <StatCard
        icon={DescriptionIcon}
        label="Template"
        value={loadingTemplates ? "—" : (hasTemplate ? "Selected" : "None")}
        subtext={selectedTemplateName || "Select a template"}
        color={hasTemplate ? "#0f766e" : "#94a3b8"}
        loading={loadingTemplates}
      />
      <StatCard
        icon={PreviewIcon}
        label="Draft total"
        value={draftTotalCost != null ? `₹${Number(draftTotalCost).toLocaleString()}` : "—"}
        subtext={hasMissingPhases ? `${missingPhasesCount} phase(s) need materials` : "Ready to plan"}
        color={hasMissingPhases ? "#d97706" : "#0f766e"}
      />
      <StatCard
        icon={CheckCircleIcon}
        label="Planned"
        value={plannedItemsCount ?? 0}
        subtext="Items saved as planned"
        color={plannedItemsCount > 0 ? "#16a34a" : "#94a3b8"}
      />
    </Box>
  );
};

/** Summary strip for Fixed (quantity-per-phase) mode — clients use this path most often */
const FixedPhaseInventorySummaryCards = ({
  schedulePhasesCount,
  materialLinesCount,
  phasesFilledCount,
  plannedLinesSaved,
  loadingSchedule,
}) => {
  const hasSchedule = schedulePhasesCount > 0;
  const allPhasesHaveLines = hasSchedule && phasesFilledCount >= schedulePhasesCount;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
        gap: { xs: 1.5, sm: 2 },
        mb: { xs: 2, sm: 2.5 },
      }}
    >
      <StatCard
        icon={CalendarMonthIcon}
        label="Schedule phases"
        value={loadingSchedule ? "—" : schedulePhasesCount ?? 0}
        subtext={hasSchedule ? "From property schedule" : "Upload schedule in Workflow"}
        color={hasSchedule ? "#0f766e" : "#94a3b8"}
        loading={loadingSchedule}
      />
      <StatCard
        icon={DescriptionIcon}
        label="Materials entered"
        value={materialLinesCount ?? 0}
        subtext="Line items with quantity"
        color={materialLinesCount > 0 ? "#0369a1" : "#94a3b8"}
      />
      <StatCard
        icon={PreviewIcon}
        label="Phases covered"
        value={loadingSchedule ? "—" : `${phasesFilledCount ?? 0} / ${schedulePhasesCount || "—"}`}
        subtext={allPhasesHaveLines ? "Ready to save plan" : "Add items per phase"}
        color={allPhasesHaveLines ? "#16a34a" : "#d97706"}
      />
      <StatCard
        icon={CheckCircleIcon}
        label="Saved plan (server)"
        value={plannedLinesSaved ?? 0}
        subtext="Planned lines on record"
        color={plannedLinesSaved > 0 ? "#16a34a" : "#94a3b8"}
      />
    </Box>
  );
};

export { FixedPhaseInventorySummaryCards };
export default InventoryForecastSummaryCards;
