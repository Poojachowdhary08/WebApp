import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import CalendarView from "./CalendarView"; // Import Calendar Component
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import gantt from "dhtmlx-gantt";

const GanttChart = ({ propertyId, schedule, refreshTasks }) => {
    const ganttContainer = useRef(null);
  const [viewMode, setViewMode] = useState("calendar"); // Default: Gantt View
  const [filteredSchedule, setFilteredSchedule] = useState([]);

  // Filter tasks based on selection (year, month, etc.)
  useEffect(() => {
    setFilteredSchedule(schedule);
  }, [schedule]);

  // useEffect(() => {
  //   if (!ganttContainer.current || viewMode !== "gantt") return;

  //   gantt.config.date_format = "%Y-%m-%d";
  //   gantt.config.drag_move = true;
  //   gantt.config.drag_resize = true;

  //   gantt.init(ganttContainer.current);
  //   gantt.clearAll();
  //   gantt.parse({
  //     data: filteredSchedule.map((item) => ({
  //       id: item.scheduleid,
  //       text: item.phasename,
  //       start_date: item.startdate,
  //       end_date: item.enddate,
  //       progress: item.progress || 0,
  //       status: item.status,
  //     })),
  //   });

  //   return () => gantt.clearAll();
  // }, [filteredSchedule, viewMode]);
  useEffect(() => {
    if (!ganttContainer.current) return;

    gantt.config.date_format = "%Y-%m-%d";
    gantt.init(ganttContainer.current);
    gantt.clearAll();
    gantt.parse({
        data: schedule.map((item) => ({
            id: item.scheduleid,
            text: item.phasename,
            start_date: item.startdate,
            end_date: item.enddate,
            progress: item.progress || 0,
            status: item.status,
        })),
    });

    return () => gantt.clearAll();
}, [schedule]);

  return (
    <Paper sx={{ padding: 3, borderRadius: 2, backgroundColor: "white" }}>
      {/* Title and View Mode Selector */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">
          {viewMode === "gantt" ? "Schedule - Gantt Chart" : "Schedule - Calendar"}
        </Typography>
      </Box>

      {/* Render Gantt or Calendar based on selection */}
      {viewMode === "gantt" ? (
        <Box ref={ganttContainer} sx={{ height: "500px" }} />
      ) : (
        <CalendarView propertyId={propertyId} tasks={filteredSchedule} refreshTasks={refreshTasks} />
      )}
    </Paper>
  );
};

export default GanttChart;
