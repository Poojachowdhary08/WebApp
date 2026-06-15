import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Stack,
  Divider,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  LinearProgress,
} from "@mui/material";
import { GlobalStyles } from "@mui/system";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Assignment as AssignmentIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";

import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

import DailyUpdates from "./DailyUpdates";

const localizer = momentLocalizer(moment);

const CalendarView = () => {
  const [holidays, setHolidays] = useState([]);
  const [events, setEvents] = useState([]);

  // dialogs
  const [openHolidayDialog, setOpenHolidayDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);

  // edit
  const [editingHoliday, setEditingHoliday] = useState(null);

  // ✅ form uses ISO date (YYYY-MM-DD) so native picker works
  const [formData, setFormData] = useState({
    holiday_name: "",
    holiday_date_iso: "",
    holiday_type: "National",
    description: "",
  });

  // upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // snack
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // calendar header month
  const [calendarDate, setCalendarDate] = useState(new Date());

  // left panel search
  const [searchQuery, setSearchQuery] = useState("");
  const [fetching, setFetching] = useState(false);

  // calendar view
  const [calendarView, setCalendarView] = useState("month"); // "month" | "week" | "day"

  // ✅ Daily Updates "child page"
  const [showDailyUpdates, setShowDailyUpdates] = useState(false);
  const [dailyUpdatesDate, setDailyUpdatesDate] = useState(moment().format("YYYY-MM-DD"));

  const monthLabel = moment(calendarDate).format("MMM, YYYY");
  const goPrevMonth = () => setCalendarDate(moment(calendarDate).subtract(1, "month").toDate());
  const goNextMonth = () => setCalendarDate(moment(calendarDate).add(1, "month").toDate());

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const toDDMMYYYY = (iso) => {
    if (!iso) return "";
    const m = moment(iso);
    return m.isValid() ? m.format("DD-MM-YYYY") : "";
  };

  /** ---------- Fetch holidays ---------- */
  const fetchHolidays = async () => {
    setFetching(true);
    try {
      const response = await fetch("http://localhost:8080/holidays");
      const data = await response.json();

      if (data.success) {
        const holidaysData = data.holidays || [];
        setHolidays(holidaysData);

        const calendarEvents = holidaysData.map((holiday) => ({
          id: holiday.holiday_id,
          title: holiday.holiday_name,
          start: new Date(holiday.holiday_date),
          end: new Date(holiday.holiday_date),
          allDay: true,
          resource: holiday,
        }));
        setEvents(calendarEvents);
      } else {
        showSnackbar(data.error || data.message || "Failed to fetch holidays", "error");
        setHolidays([]);
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching holidays:", error);
      showSnackbar("Failed to fetch holidays", "error");
      setHolidays([]);
      setEvents([]);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ---------- Left list filter ---------- */
  const filteredHolidays = useMemo(() => {
    let filtered = [...holidays];

    // filter by current calendar year
    const currentYear = moment(calendarDate).year();
    filtered = filtered.filter((h) => moment(h.holiday_date).year() === currentYear);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((h) => {
        const dd = toDDMMYYYY(h.holiday_date).toLowerCase();
        return (
          (h.holiday_name || "").toLowerCase().includes(q) ||
          (h.holiday_type || "").toLowerCase().includes(q) ||
          (h.description || "").toLowerCase().includes(q) ||
          dd.includes(q)
        );
      });
    }

    return filtered;
  }, [holidays, searchQuery, calendarDate]);

  /** ---------- Add/Edit Holiday Dialog ---------- */
  const handleOpenHolidayDialog = (holiday = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        holiday_name: holiday.holiday_name || "",
        holiday_date_iso: (holiday.holiday_date || "").split("T")[0] || "",
        holiday_type: holiday.holiday_type || "National",
        description: holiday.description || "",
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        holiday_name: "",
        holiday_date_iso: "",
        holiday_type: "National",
        description: "",
      });
    }
    setOpenHolidayDialog(true);
  };

  const handleCloseHolidayDialog = () => {
    setOpenHolidayDialog(false);
    setEditingHoliday(null);
    setFormData({
      holiday_name: "",
      holiday_date_iso: "",
      holiday_type: "National",
      description: "",
    });
  };

  const handleSubmitHoliday = async () => {
    if (!formData.holiday_name?.trim()) {
      showSnackbar("Holiday Name is required", "error");
      return;
    }
    if (!formData.holiday_date_iso) {
      showSnackbar("Select Date is required", "error");
      return;
    }

    try {
      const url = editingHoliday
        ? `http://localhost:8080/holidays/${editingHoliday.holiday_id}`
        : "http://localhost:8080/holidays";
      const method = editingHoliday ? "PUT" : "POST";

      const payload = {
        holiday_name: formData.holiday_name.trim(),
        holiday_date: formData.holiday_date_iso,
        holiday_type: formData.holiday_type || "",
        description: formData.description || "",
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showSnackbar(editingHoliday ? "Holiday updated successfully" : "Holiday added successfully", "success");
        handleCloseHolidayDialog();
        fetchHolidays();
      } else {
        showSnackbar(data.message || "Failed to save holiday", "error");
      }
    } catch (e) {
      console.error(e);
      showSnackbar("Failed to save holiday", "error");
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;

    try {
      const response = await fetch(`http://localhost:8080/holidays/${holidayId}`, { method: "DELETE" });
      const data = await response.json();
      if (response.ok && data.success) {
        showSnackbar("Holiday deleted successfully", "success");
        fetchHolidays();
      } else {
        showSnackbar(data.message || "Failed to delete holiday", "error");
      }
    } catch (e) {
      console.error(e);
      showSnackbar("Failed to delete holiday", "error");
    }
  };

  /** ---------- Upload Dialog ---------- */
  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showSnackbar("Please select a file", "error");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);

      const response = await fetch("http://localhost:8080/holidays/upload", {
        method: "POST",
        body: fd,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showSnackbar(`Uploaded ${data.uploaded_count || 0} holiday(s)`, "success");
        setOpenUploadDialog(false);
        setSelectedFile(null);
        fetchHolidays();
      } else {
        showSnackbar(data.message || data.detail || "Upload failed", "error");
      }
    } catch (e) {
      console.error(e);
      showSnackbar("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  /** ---------- Calendar event style ---------- */
  const eventStyleGetter = (event) => {
    const colors = ["#2563EB", "#0EA5E9", "#7C3AED", "#10B981", "#F59E0B", "#EF4444"];
    const colorIndex = Number(event.id || 0) % colors.length;
    return {
      style: {
        backgroundColor: colors[colorIndex],
        color: "white",
        borderRadius: "8px",
        border: "none",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 700,
        cursor: "pointer",
        lineHeight: 1.4,
      },
    };
  };

  /** ---------- RBC clean styles ---------- */
  const cleanRbcStyles = (
    <GlobalStyles
      styles={{
        ".rbc-toolbar": { display: "none" },
        ".rbc-calendar": { fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" },
        ".rbc-month-view": { border: "none" },
        ".rbc-header": {
          padding: "10px 0",
          background: "#F8FAFC",
          color: "#6B7280",
          fontWeight: 800,
          fontSize: 12,
          borderBottom: "1px solid #E5E7EB",
        },
        ".rbc-month-row": { borderTop: "1px solid #EEF2F7" },
        ".rbc-off-range-bg": { background: "#F9FAFB" },
        ".rbc-date-cell": { padding: 10, color: "#9CA3AF", fontWeight: 800, fontSize: 12 },
        ".rbc-today": { background: "transparent" },
        ".rbc-event": { border: "none" },
        ".rbc-day-bg": { background: "transparent" },
        ".rbc-month-row .rbc-row-bg": { padding: "8px 10px", gap: 10 },
        ".rbc-month-row .rbc-day-bg": {
          borderRadius: 14,
          border: "1px solid #EEF2F7",
          background: "#FFFFFF",
        },
        ".rbc-day-bg.rbc-today": {
          border: "1px solid rgba(37,99,235,0.35)",
          boxShadow: "inset 0 3px 0 #2563EB",
        },
      }}
    />
  );

  return (
    <>
      {showDailyUpdates ? (
        <DailyUpdates
          isoDate={dailyUpdatesDate}
          onBack={() => setShowDailyUpdates(false)}
          onChangeDate={(nextIso) => setDailyUpdatesDate(nextIso)}
        />
      ) : (
        <Box sx={{ p: { xs: 1, sm: 2 }, backgroundColor: "#F3F4F6", minHeight: "100vh" }}>
          {cleanRbcStyles}

          {/* Top bar */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 2,
              borderRadius: 3,
              border: "1px solid #E5E7EB",
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {/* Month nav */}
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                onClick={goPrevMonth}
                size="small"
                sx={{ border: "1px solid #E5E7EB", borderRadius: 2, width: 38, height: 38 }}
              >
                <ChevronLeftIcon />
              </IconButton>

              <Typography sx={{ fontWeight: 900, color: "#111827", minWidth: 120, textAlign: "center" }}>
                {monthLabel}
              </Typography>

              <IconButton
                onClick={goNextMonth}
                size="small"
                sx={{ border: "1px solid #E5E7EB", borderRadius: 2, width: 38, height: 38 }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Stack>

            {/* View switch */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
              {["month", "week", "day"].map((v) => (
                <Button
                  key={v}
                  variant={calendarView === v ? "contained" : "outlined"}
                  onClick={() => setCalendarView(v)}
                  size="small"
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 900, height: 38 }}
                >
                  {v[0].toUpperCase() + v.slice(1)}
                </Button>
              ))}
            </Stack>

            {/* Actions */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                startIcon={<AssignmentIcon />}
                onClick={() => {
                  setDailyUpdatesDate(moment().format("YYYY-MM-DD"));
                  setShowDailyUpdates(true);
                }}
                size="small"
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800, height: 38 }}
              >
                Task Updates
              </Button>

              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setOpenUploadDialog(true)}
                size="small"
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800, height: 38 }}
              >
                Upload Excel
              </Button>
            </Stack>
          </Paper>

          <Grid container spacing={2}>
            {/* LEFT */}
            <Grid item xs={12} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                  height: { xs: "auto", md: "calc(100vh - 150px)" },
                  overflow: "auto",
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
                  <Typography sx={{ fontWeight: 900, color: "#111827" }}>Holidays</Typography>

                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenHolidayDialog()}
                    sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2, height: 34 }}
                  >
                    Add
                  </Button>
                </Stack>

                <TextField
                  size="small"
                  placeholder="Search holidays..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ display: "flex", alignItems: "center", mr: 1, color: "#6B7280" }}>
                        <SearchIcon fontSize="small" />
                      </Box>
                    ),
                  }}
                  sx={{
                    mb: 1.25,
                    "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#F9FAFB" },
                  }}
                  fullWidth
                />

                <Divider sx={{ mb: 1.25 }} />

                {fetching ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                  </Box>
                ) : filteredHolidays.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 6, color: "#6B7280" }}>
                    <Typography sx={{ fontWeight: 700 }}>{searchQuery ? "No matches" : "No holidays"}</Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.2}>
                    {filteredHolidays.map((holiday) => (
                      <Paper
                        key={holiday.holiday_id}
                        variant="outlined"
                        sx={{
                          p: 1.25,
                          borderRadius: 2,
                          borderColor: "#E5E7EB",
                          backgroundColor: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 900, fontSize: 13, color: "#111827" }} noWrap>
                            {holiday.holiday_name}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: "#6B7280" }} noWrap>
                            {toDDMMYYYY(holiday.holiday_date)}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenHolidayDialog(holiday)}
                              sx={{ border: "1px solid #E5E7EB", borderRadius: 2, width: 34, height: 34 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteHoliday(holiday.holiday_id)}
                              sx={{
                                border: "1px solid #E5E7EB",
                                borderRadius: 2,
                                width: 34,
                                height: 34,
                                color: "#DC2626",
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* RIGHT */}
            <Grid item xs={12} md={9}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                  height: { xs: 520, md: "calc(100vh - 150px)" },
                }}
              >
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: "100%" }}
                  eventPropGetter={eventStyleGetter}
                  onSelectEvent={(ev) => handleOpenHolidayDialog(ev.resource)}
                  selectable
                  popup
                  view={calendarView}
                  onView={(v) => setCalendarView(v)}
                  views={["month", "week", "day"]}
                  date={calendarDate}
                  onNavigate={(date) => setCalendarDate(date)}
                  onSelectSlot={(slotInfo) => {
                    const iso = moment(slotInfo.start).format("YYYY-MM-DD");
                    setDailyUpdatesDate(iso);
                    setShowDailyUpdates(true);
                  }}
                />
              </Paper>
            </Grid>
          </Grid>

          {/* Add/Edit Holiday Dialog (smaller + aligned + primary button) */}
          <Dialog
            open={openHolidayDialog}
            onClose={handleCloseHolidayDialog}
            maxWidth="xs"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
              },
            }}
          >
            <Box
              sx={{
                px: 2.25,
                py: 1.75,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #EEF2F7",
              }}
            >
              <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>
                {editingHoliday ? "Edit Holiday" : "Add Holiday"}
              </Typography>
              <IconButton onClick={handleCloseHolidayDialog} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <DialogContent sx={{ pt: 2, pb: 2.25 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography sx={{ fontWeight: 800, color: "#6B7280", mb: 0.75, fontSize: 12 }}>
                    Select Date*
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={formData.holiday_date_iso || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, holiday_date_iso: e.target.value }))}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        background: "#F9FAFB",
                        "& fieldset": {
                          borderColor: formData.holiday_date_iso ? "#22C55E" : "#EF4444",
                          borderWidth: 2,
                        },
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography sx={{ fontWeight: 800, color: "#6B7280", mb: 0.75, fontSize: 12 }}>
                    Holiday Name*
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={formData.holiday_name}
                    onChange={(e) => setFormData((p) => ({ ...p, holiday_name: e.target.value }))}
                    placeholder="Holiday Name"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        background: "#F9FAFB",
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography sx={{ fontWeight: 800, color: "#6B7280", mb: 0.75, fontSize: 12 }}>
                    Select Type*
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={formData.holiday_type}
                    onChange={(e) => setFormData((p) => ({ ...p, holiday_type: e.target.value }))}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        background: "#F9FAFB",
                        "& fieldset": { borderColor: "#E5E7EB" },
                      },
                    }}
                  >
                    {["National", "Regional", "Company", "Religious", "State", "Other"].map((x) => (
                      <MenuItem key={x} value={x}>
                        {x}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <Typography sx={{ fontWeight: 800, color: "#6B7280", mb: 0.75, fontSize: 12 }}>
                    Description
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        background: "#F9FAFB",
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Stack direction="row" spacing={1.25} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      onClick={handleCloseHolidayDialog}
                      sx={{ borderRadius: 2, px: 2.25, fontWeight: 900, textTransform: "none", height: 38 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSubmitHoliday}
                      sx={{ borderRadius: 2, px: 2.5, fontWeight: 900, textTransform: "none", height: 38 }}
                    >
                      Confirm
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </DialogContent>
          </Dialog>

          {/* Upload Dialog (unchanged) */}
          <Dialog
            open={openUploadDialog}
            onClose={() => {
              if (uploading) return;
              setOpenUploadDialog(false);
              setSelectedFile(null);
            }}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
          >
            <Box sx={{ p: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontWeight: 900, color: "#111827" }}>Upload Holiday from Excel/CSV</Typography>
              <IconButton
                onClick={() => {
                  if (uploading) return;
                  setOpenUploadDialog(false);
                  setSelectedFile(null);
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            <DialogContent sx={{ pt: 1, pb: 2.5 }}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  borderStyle: "dashed",
                  p: 4,
                  textAlign: "center",
                  background: "#FFFFFF",
                }}
              >
                <Typography sx={{ fontWeight: 700, color: "#6B7280", mb: 2 }}>
                  {uploading ? "Your file is uploading..." : "Choose your Excel/CSV file"}
                </Typography>

                {!uploading && (
                  <Button
                    variant="outlined"
                    component="label"
                    sx={{ borderRadius: 999, fontWeight: 900, textTransform: "none" }}
                  >
                    Select File
                    <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handlePickFile} />
                  </Button>
                )}

                {selectedFile && !uploading && (
                  <Typography sx={{ mt: 2, fontWeight: 800, color: "#111827" }}>{selectedFile.name}</Typography>
                )}

                <Box sx={{ mt: 3 }}>
                  {uploading ? (
                    <LinearProgress sx={{ borderRadius: 999, height: 8 }} />
                  ) : (
                    <LinearProgress sx={{ borderRadius: 999, height: 8 }} value={0} variant="determinate" />
                  )}
                </Box>
              </Paper>

              <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2.5 }}>
                <Button
                  variant="outlined"
                  disabled={uploading}
                  onClick={() => {
                    setOpenUploadDialog(false);
                    setSelectedFile(null);
                  }}
                  sx={{ borderRadius: 999, px: 3, fontWeight: 900, textTransform: "none" }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disabled={!selectedFile || uploading}
                  onClick={handleUpload}
                  color="primary"
                  sx={{ borderRadius: 999, px: 3.5, fontWeight: 900, textTransform: "none" }}
                >
                  Confirm
                </Button>
              </Stack>
            </DialogContent>
          </Dialog>

          {/* Snackbar */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={4500}
            onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <Alert
              onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
              severity={snackbar.severity}
              variant="filled"
              sx={{ borderRadius: 2, fontWeight: 800 }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      )}
    </>
  );
};

export default CalendarView;
