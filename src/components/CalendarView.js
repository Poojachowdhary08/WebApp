// CalendarView.jsx
import React, { useMemo, useState, useCallback } from "react";
import { Calendar, Views, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  Box,
  Typography,
  Tooltip,
  Button,
  Stack,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { GlobalStyles } from "@mui/system";

import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import TodayIcon from "@mui/icons-material/Today";
import ViewDayIcon from "@mui/icons-material/ViewDay";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

const localizer = momentLocalizer(moment);

/** ---------------- Light pastel palette ---------------- */
const statusColors = {
  Completed: { bg: "#DFF6E4", text: "#1E5B2F", border: "#BFE9C8" },
  Hold: { bg: "#F1F2F4", text: "#3B3F45", border: "#E2E4E8" },
  Pending: { bg: "#FFF4CC", text: "#6B4E00", border: "#FFE7A3" },
  "In Progress": { bg: "#E6F0FF", text: "#1E4E8C", border: "#CFE0FF" },
  Delayed: { bg: "#FFE1E1", text: "#7A1F1F", border: "#FFC7C7" },
};

const getStatusKey = (raw) => {
  if (!raw) return "";
  const cleaned = String(raw).replace(/_/g, " ").trim().toLowerCase();
  const titleCase = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());

  if (["In Progress"].includes(titleCase)) return "In Progress";
  if (["Pending"].includes(titleCase)) return "Pending";
  if (["Completed"].includes(titleCase)) return "Completed";
  if (["Hold", "On Hold"].includes(titleCase)) return "Hold";
  if (["Delayed", "Delay"].includes(titleCase)) return "Delayed";
  return titleCase;
};

/** ---------------- Event pill ---------------- */
const EventPill = ({ event }) => {
  const pal = statusColors[event.status] || {
    bg: "#EDF3FF",
    text: "#23406B",
    border: "#D5E3FF",
  };

  return (
    <Tooltip title={`${event.title} • ${event.status}`} arrow placement="top">
      <Box
        sx={{
          width: "100%",
          display: "block",
          borderRadius: 999,
          px: 1.2,
          py: 0.35,
          backgroundColor: pal.bg,
          color: pal.text,
          border: `1px solid ${pal.border}`,
          fontWeight: 700,
          fontSize: 12,
          lineHeight: 1.1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          cursor: "pointer",
        }}
      >
        {event.title}
      </Box>
    </Tooltip>
  );
};

/** ---------------- Date header (big number + Today tag) ---------------- */
const MonthDateHeader = ({ label, date }) => {
  const isToday = moment(date).isSame(moment(), "day");

  return (
    <Box sx={{ px: 1, pt: 1, display: "flex", justifyContent: "space-between" }}>
      <Box
        sx={{
          fontWeight: 800,
          fontSize: 13,
          color: "#2B2F36",
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          backgroundColor: isToday ? "rgba(25,118,210,0.12)" : "transparent",
          border: isToday ? "1px solid rgba(25,118,210,0.25)" : "1px solid transparent",
        }}
      >
        {label}
      </Box>

      {isToday ? (
        <Box
          sx={{
            fontSize: 10,
            fontWeight: 800,
            px: 0.9,
            py: 0.25,
            borderRadius: 999,
            backgroundColor: "rgba(25,118,210,0.12)",
            border: "1px solid rgba(25,118,210,0.25)",
            color: "#1E4E8C",
            height: "fit-content",
          }}
        >
          Today
        </Box>
      ) : (
        <span />
      )}
    </Box>
  );
};

/** ---------------- “+X more” pill ---------------- */
const ShowMore = ({ total }) => {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        fontSize: 11,
        fontWeight: 800,
        color: "#2F5FB8",
        backgroundColor: "rgba(47,95,184,0.08)",
        border: "1px solid rgba(47,95,184,0.18)",
        borderRadius: 999,
        px: 0.9,
        py: 0.2,
        cursor: "pointer",
        ml: 1,
      }}
    >
      +{total}
    </Box>
  );
};

const CalendarView = ({
  tasks = [],
  propertyId, // kept if you need it later
  refreshTasks, // kept if you need it later
  onOpenTaskInTaskView,
}) => {
  const [viewMode, setViewMode] = useState(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());

  const eventList = useMemo(() => {
    return tasks
      .filter((t) => t?.startdate && t?.enddate)
      .map((task) => {
        const statusKey = getStatusKey(task.status);
        return {
          id: task.scheduleid,
          title: task.phasename,
          start: new Date(task.startdate),
          end: new Date(task.enddate),
          status: statusKey,
          raw: task,
        };
      });
  }, [tasks]);

  const buildFormattedTask = useCallback((eventOrTask) => {
    const raw = eventOrTask?.raw
      ? eventOrTask.raw
      : {
          ...eventOrTask,
          startdate: new Date(eventOrTask.start).toISOString().split("T")[0],
          enddate: new Date(eventOrTask.end).toISOString().split("T")[0],
        };

    return {
      scheduleid: raw.scheduleid ?? eventOrTask.id,
      phasename: raw.phasename ?? eventOrTask.title,
      startdate: (raw.startdate ? new Date(raw.startdate) : new Date(eventOrTask.start))
        .toISOString()
        .split("T")[0],
      enddate: (raw.enddate ? new Date(raw.enddate) : new Date(eventOrTask.end))
        .toISOString()
        .split("T")[0],
      status: getStatusKey(raw.status ?? eventOrTask.status),
      remarks: raw.remarks ?? null,
    };
  }, []);

  /** ---------- Toolbar actions ---------- */
  const handlePrev = () => {
    const m = moment(currentDate);
    setCurrentDate(
      viewMode === Views.MONTH
        ? m.subtract(1, "month").toDate()
        : viewMode === Views.WEEK
        ? m.subtract(1, "week").toDate()
        : m.subtract(1, "day").toDate()
    );
  };

  const handleNext = () => {
    const m = moment(currentDate);
    setCurrentDate(
      viewMode === Views.MONTH
        ? m.add(1, "month").toDate()
        : viewMode === Views.WEEK
        ? m.add(1, "week").toDate()
        : m.add(1, "day").toDate()
    );
  };

  const handleToday = () => setCurrentDate(new Date());

  const headerTitle =
    viewMode === Views.MONTH
      ? moment(currentDate).format("MMM, YYYY")
      : viewMode === Views.WEEK
      ? `${moment(currentDate).startOf("week").format("MMM D")} – ${moment(currentDate)
          .endOf("week")
          .format("MMM D, YYYY")}`
      : moment(currentDate).format("MMM D, YYYY");

  /** ---------- Styling overrides (comfy only) ---------- */
  const globalRbc = (
    <GlobalStyles
      styles={{
        ".rbc-toolbar": { display: "none" },

        ".rbc-month-view, .rbc-time-view": {
          border: "1px solid #E9ECF1",
          borderRadius: 12,
          overflow: "hidden",
          background: "#FFFFFF",
        },

        ".rbc-header": {
          padding: "10px 0",
          background: "#F7F8FA",
          color: "#5B616B",
          borderBottom: "1px solid #E9ECF1",
          fontWeight: 800,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.7,
        },

        ".rbc-month-row": { borderTop: "1px solid #F0F2F6", minHeight: 112 },

        ".rbc-day-bg": {
          borderLeft: "1px solid #F0F2F6",
        },
        ".rbc-month-row .rbc-day-bg:first-of-type": {
          borderLeft: "none",
        },

        ".rbc-off-range-bg": { background: "#FBFCFE" },

        ".rbc-date-cell": { padding: 0 },

        ".rbc-row-segment": { padding: "2px 8px" },

        ".rbc-event": { background: "transparent", border: "none", padding: 0 },
        ".rbc-event-content": { overflow: "visible" },

        ".rbc-show-more": { background: "transparent", color: "transparent" },

        ".rbc-today": { backgroundColor: "rgba(25,118,210,0.05)" },

        ".rbc-selected-cell": { background: "rgba(25,118,210,0.08)" },
      }}
    />
  );

  const dayPropGetter = (date) => {
    const isWeekend = [0, 6].includes(moment(date).day());
    const isToday = moment(date).isSame(moment(), "day");

    return {
      style: {
        background: isWeekend ? "rgba(0,0,0,0.015)" : undefined,
        boxShadow: isToday ? "inset 0 0 0 2px rgba(25,118,210,0.35)" : undefined,
        borderRadius: isToday ? 10 : undefined,
      },
    };
  };

  const eventPropGetter = () => ({
    style: { padding: 0, background: "transparent", boxShadow: "none" },
  });

  const handleOpenTask = (event) => {
    const formattedTask = buildFormattedTask(event);
    onOpenTaskInTaskView?.(formattedTask);
  };

  const handleSelectSlot = () => onOpenTaskInTaskView?.(null);

  return (
    <Box
      sx={{
        p: 2.5,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        border: "1px solid #E9ECF1",
      }}
    >
      {/* Top toolbar */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            onClick={handlePrev}
            startIcon={<ArrowBackIosNewIcon fontSize="small" />}
            sx={{ borderColor: "#E3E7EE", color: "#2B2F36", fontWeight: 800 }}
          >
            Prev
          </Button>

          <Button
            size="small"
            variant="outlined"
            onClick={handleToday}
            startIcon={<TodayIcon fontSize="small" />}
            sx={{ borderColor: "#E3E7EE", color: "#2B2F36", fontWeight: 800 }}
          >
            Today
          </Button>

          <Button
            size="small"
            variant="outlined"
            onClick={handleNext}
            endIcon={<ArrowForwardIosIcon fontSize="small" />}
            sx={{ borderColor: "#E3E7EE", color: "#2B2F36", fontWeight: 800 }}
          >
            Next
          </Button>
        </Stack>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 900,
            letterSpacing: 0.2,
            color: "#2B2F36",
            textAlign: "center",
            minWidth: 140,
          }}
        >
          {headerTitle}
        </Typography>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={viewMode}
          onChange={(_, v) => v && setViewMode(v)}
          sx={{
            "& .MuiToggleButton-root": {
              borderColor: "#E3E7EE",
              color: "#2B2F36",
            },
            "& .Mui-selected": {
              backgroundColor: "rgba(25,118,210,0.08) !important",
              borderColor: "rgba(25,118,210,0.25) !important",
            },
          }}
        >
          <ToggleButton value={Views.DAY}>
            <ViewDayIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value={Views.WEEK}>
            <ViewWeekIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value={Views.MONTH}>
            <CalendarMonthIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Legend */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
        {Object.keys(statusColors).map((s) => (
          <Chip
            key={s}
            label={s}
            size="small"
            sx={{
              backgroundColor: statusColors[s].bg,
              color: statusColors[s].text,
              border: `1px solid ${statusColors[s].border}`,
              fontWeight: 900,
            }}
          />
        ))}
      </Stack>

      {/* Calendar */}
      <Box sx={{ width: "100%", height: 640 }}>
        {globalRbc}
        <Calendar
          localizer={localizer}
          events={eventList}
          startAccessor="start"
          endAccessor="end"
          view={viewMode}
          views={{ month: true, week: true, day: true }}
          date={currentDate}
          onNavigate={(date) => setCurrentDate(date)}
          style={{ height: "100%" }}
          components={{
            event: EventPill,
            month: { dateHeader: MonthDateHeader },
            showMore: ShowMore,
          }}
          onDoubleClickEvent={handleOpenTask}
          onSelectEvent={handleOpenTask}
          selectable
          onSelectSlot={handleSelectSlot}
          popup
          toolbar={false}
          dayPropGetter={dayPropGetter}
          eventPropGetter={eventPropGetter}
        />
      </Box>
    </Box>
  );
};

export default CalendarView;
