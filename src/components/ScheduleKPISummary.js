// ScheduleKPISummary.js
import React, { useEffect, useState } from "react";
import { Paper, Grid, Typography } from "@mui/material";

const parseFlexibleDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  const s = String(value).trim();
  if (!s) return null;

  const direct = new Date(s);
  if (!isNaN(direct)) return direct;

  if (s.includes("/")) {
    const [dd, mm, yyyy] = s.split("/");
    if (!dd || !mm || !yyyy) return null;
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return isNaN(d) ? null : d;
  }

  return null;
};

const ScheduleKPISummary = ({ schedule }) => {
  const [plannedStartDate, setPlannedStartDate] = useState(null);
  const [plannedEndDate, setPlannedEndDate] = useState(null);
  const [actualEndDate, setActualEndDate] = useState(null);
  const [projectOnTrack, setProjectOnTrack] = useState(null);
  const [delayDays, setDelayDays] = useState(null);

  useEffect(() => {
    if (!Array.isArray(schedule) || schedule.length === 0) return;

    const startDates = schedule
      .map((s) => parseFlexibleDate(s.exp_startdate))
      .filter(Boolean);
    const expEndDates = schedule
      .map((s) => parseFlexibleDate(s.exp_enddate))
      .filter(Boolean);
    const actualEndDates = schedule
      .map((s) => parseFlexibleDate(s.enddate))
      .filter(Boolean);

    const plannedStart = startDates.length ? new Date(Math.min(...startDates)) : null;
    const plannedEnd = expEndDates.length ? new Date(Math.max(...expEndDates)) : null;
    const actualEnd = actualEndDates.length ? new Date(Math.max(...actualEndDates)) : null;

    setPlannedStartDate(plannedStart);
    setPlannedEndDate(plannedEnd);
    setActualEndDate(actualEnd);

    if (actualEnd && plannedEnd) {
      const onTrack = actualEnd <= plannedEnd;
      setProjectOnTrack(onTrack);

      if (!onTrack) {
        const diffMs = actualEnd.getTime() - plannedEnd.getTime();
        const daysDelayed = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        setDelayDays(daysDelayed > 0 ? daysDelayed : 0);
      } else {
        setDelayDays(0);
      }
    } else {
      setProjectOnTrack(null);
      setDelayDays(null);
    }
  }, [schedule]);

  return (
    <Paper sx={{ p: 2, mb: 3, background: "linear-gradient(to right, #e3f2fd, #ffffff)" }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={3}>
          <Typography variant="body2">📅 Planned Start Date</Typography>
          <Typography variant="h6">
            {plannedStartDate ? plannedStartDate.toLocaleDateString("en-GB") : "—"}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Typography variant="body2">📅 Planned End Date</Typography>
          <Typography variant="h6">
            {plannedEndDate ? plannedEndDate.toLocaleDateString("en-GB") : "—"}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Typography variant="body2">📅 Actual End Date</Typography>
          <Typography variant="h6">
            {actualEndDate ? actualEndDate.toLocaleDateString("en-GB") : "—"}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Typography variant="body2"> Status</Typography>
          <Typography variant="h6" color={projectOnTrack == null ? "text.secondary" : projectOnTrack ? "success.main" : "error.main"}>
            {projectOnTrack == null
              ? "—"
              : projectOnTrack
              ? "✅ On Track"
              : `❌ Delayed${delayDays ? ` by ${delayDays} day${delayDays > 1 ? "s" : ""}` : ""}`}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ScheduleKPISummary;