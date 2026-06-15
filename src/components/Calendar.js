import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
  CircularProgress,
  Fade,
  Zoom,
  Divider,
  Stack,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Modal,
  Backdrop,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Event as EventIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Assignment as AssignmentIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as FileIcon,
  ZoomIn as ZoomInIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const CalendarView = () => {
  const [holidays, setHolidays] = useState([]);
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [formData, setFormData] = useState({
    holiday_name: "",
    holiday_date: "",
    holiday_type: "",
    description: "",
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [dateMenuAnchor, setDateMenuAnchor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [holidaysOnDate, setHolidaysOnDate] = useState([]);
  const [taskUpdatesOnDate, setTaskUpdatesOnDate] = useState(null);
  const [loadingTaskUpdates, setLoadingTaskUpdates] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filteredHolidays, setFilteredHolidays] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Helper function to check if file is an image
  const isImageFile = (file) => {
    const mime = file?.fileType || file?.file_type || file?.mimeType || file?.mime_type || "";
    if (mime) {
      return ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"].includes(mime.toLowerCase());
    }
    const name = (file?.fileName || file?.file_name || "").toLowerCase();
    return [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) => name.endsWith(ext));
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  // Filter holidays based on year and search query
  useEffect(() => {
    const currentYear = selectedYear || new Date().getFullYear();
    
    // First filter by year
    let filtered = holidays.filter((holiday) => {
      const holidayYear = new Date(holiday.holiday_date).getFullYear();
      return holidayYear === currentYear;
    });

    // Then filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (holiday) =>
          holiday.holiday_name?.toLowerCase().includes(query) ||
          holiday.holiday_type?.toLowerCase().includes(query) ||
          holiday.description?.toLowerCase().includes(query) ||
          new Date(holiday.holiday_date).toLocaleDateString("en-GB").toLowerCase().includes(query)
      );
    }
    
    setFilteredHolidays(filtered);
  }, [searchQuery, holidays, selectedYear]);

  const fetchHolidays = async () => {
    setFetching(true);
    try {
      const response = await fetch("http://localhost:8080/holidays");
      const data = await response.json();
      if (data.success) {
        const holidaysData = data.holidays || [];
        setHolidays(holidaysData);
        
        // Extract unique years from holidays
        const years = new Set();
        holidaysData.forEach((holiday) => {
          const year = new Date(holiday.holiday_date).getFullYear();
          years.add(year);
        });
        
        // Create sorted array of years (most recent first)
        const sortedYears = Array.from(years).sort((a, b) => b - a);
        setAvailableYears(sortedYears);
        
        // If current year is not in available years, add it and a few more years
        const currentYear = new Date().getFullYear();
        if (!sortedYears.includes(currentYear)) {
          // Add current year and a range around it
          for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            if (!sortedYears.includes(i)) {
              sortedYears.push(i);
            }
          }
          sortedYears.sort((a, b) => b - a);
          setAvailableYears(sortedYears);
        }
        
        // Convert holidays to calendar events
        const calendarEvents = holidaysData.map((holiday) => ({
          id: holiday.holiday_id,
          title: holiday.holiday_name,
          start: new Date(holiday.holiday_date),
          end: new Date(holiday.holiday_date),
          allDay: true,
          resource: holiday,
        }));
        setEvents(calendarEvents);
      } else if (data.error) {
        // Table doesn't exist or other error
        showSnackbar(data.error || data.message || "Table not found. Please create the holidays table.", "error");
        setHolidays([]);
        setFilteredHolidays([]);
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching holidays:", error);
      let errorMessage = "Failed to fetch holidays";
      try {
        const errorData = await error.response?.json();
        if (errorData?.detail) {
          errorMessage = errorData.detail;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If response is not JSON, use default message
      }
      showSnackbar(errorMessage, "error");
      setHolidays([]);
      setFilteredHolidays([]);
      setEvents([]);
    } finally {
      setFetching(false);
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (holiday = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        holiday_name: holiday.holiday_name || "",
        holiday_date: holiday.holiday_date || "",
        holiday_type: holiday.holiday_type || "",
        description: holiday.description || "",
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        holiday_name: "",
        holiday_date: "",
        holiday_type: "",
        description: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingHoliday(null);
    setFormData({
      holiday_name: "",
      holiday_date: "",
      holiday_type: "",
      description: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.holiday_name || !formData.holiday_date) {
      showSnackbar("Please fill in all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      const url = editingHoliday
        ? `http://localhost:8080/holidays/${editingHoliday.holiday_id}`
        : "http://localhost:8080/holidays";
      const method = editingHoliday ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        showSnackbar(
          editingHoliday ? "Holiday updated successfully" : "Holiday added successfully",
          "success"
        );
        handleCloseDialog();
        fetchHolidays();
      } else {
        showSnackbar(data.message || "Failed to save holiday", "error");
      }
    } catch (error) {
      console.error("Error saving holiday:", error);
      showSnackbar("Failed to save holiday", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (holidayId) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/holidays/${holidayId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (response.ok && data.success) {
        showSnackbar("Holiday deleted successfully", "success");
        fetchHolidays();
      } else {
        showSnackbar(data.message || "Failed to delete holiday", "error");
      }
    } catch (error) {
      console.error("Error deleting holiday:", error);
      showSnackbar("Failed to delete holiday", "error");
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setFilePreview([]);
    setPreviewLoading(true);

    try {
      // Read file and preview contents
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target.result;
          let previewData = [];

          if (fileExtension === 'csv') {
            // Parse CSV - handle quoted values properly
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
              setFilePreview([{ error: "File is empty" }]);
              setPreviewLoading(false);
              return;
            }
            
            // Parse CSV header
            const parseCSVLine = (line) => {
              const result = [];
              let current = '';
              let inQuotes = false;
              
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  result.push(current.trim());
                  current = '';
                } else {
                  current += char;
                }
              }
              result.push(current.trim());
              return result;
            };
            
            const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
            
            for (let i = 1; i < Math.min(lines.length, 11); i++) { // Preview first 10 rows
              const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
              const row = {};
              headers.forEach((header, idx) => {
                row[header] = values[idx] || '';
              });
              previewData.push(row);
            }
          } else {
            // For Excel files, we'll show a message that preview will be shown after upload
            previewData = [{ message: "Excel file preview will be shown after upload" }];
          }

          setFilePreview(previewData);
        } catch (error) {
          console.error("Error parsing file:", error);
          setFilePreview([{ error: "Could not parse file. Please check the format." }]);
        } finally {
          setPreviewLoading(false);
        }
      };

      if (fileExtension === 'csv') {
        reader.readAsText(file);
      } else {
        // For Excel, we can't easily preview without a library, so just set loading to false
        setPreviewLoading(false);
        setFilePreview([{ message: "Excel file selected. Preview will be shown after upload." }]);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      setPreviewLoading(false);
      setFilePreview([{ error: "Error reading file" }]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showSnackbar("Please select a file", "error");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("http://localhost:8080/holidays/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Show detailed success message
        let successMessage = `✅ Successfully uploaded ${data.uploaded_count || 0} holiday${data.uploaded_count !== 1 ? 's' : ''}`;
        if (data.skipped_count > 0) {
          successMessage += `. ⚠️ ${data.skipped_count} skipped`;
        }
        if (data.errors && data.errors.length > 0) {
          successMessage += `. ❌ ${data.errors.length} error(s)`;
        }
        
        showSnackbar(successMessage, "success");
        
        // Show detailed results if there are errors or skipped items
        if ((data.errors && data.errors.length > 0) || data.skipped_count > 0) {
          setTimeout(() => {
            let detailsMessage = `Upload Results:\n`;
            detailsMessage += `✅ Uploaded: ${data.uploaded_count}\n`;
            detailsMessage += `⚠️ Skipped: ${data.skipped_count}\n`;
            if (data.errors && data.errors.length > 0) {
              detailsMessage += `❌ Errors: ${data.errors.length}\n\n`;
              detailsMessage += `First few errors:\n${data.errors.slice(0, 5).join('\n')}`;
            }
            alert(detailsMessage);
          }, 1000);
        }
        
        setOpenUploadDialog(false);
        setSelectedFile(null);
        setFilePreview([]);
        fetchHolidays();
      } else {
        // Show detailed error message from backend
        let errorMessage = data.message || data.detail || "Failed to upload holidays";
        
        // Add error details if available
        if (data.errors && data.errors.length > 0) {
          const errorPreview = data.errors.slice(0, 3).join('; ');
          errorMessage += `\n\nErrors: ${errorPreview}`;
          if (data.errors.length > 3) {
            errorMessage += `\n...and ${data.errors.length - 3} more errors`;
          }
        }
        
        // Show in snackbar and also in alert for detailed view
        showSnackbar(errorMessage.split('\n')[0], "error");
        
        // Show detailed error in alert
        setTimeout(() => {
          alert(`Upload Failed\n\n${errorMessage}`);
        }, 500);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      let errorMessage = "Failed to upload holidays";
      
      try {
        // Try to get error response
        if (error.response) {
          const errorData = await error.response.json().catch(() => ({}));
          if (errorData?.detail) {
            errorMessage = errorData.detail;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (error.response.status === 400) {
            errorMessage = "Bad request. Please check your file format.";
          } else if (error.response.status === 500) {
            errorMessage = "Server error. Please try again later.";
          }
        } else {
          errorMessage = error.message || "Network error. Please check your connection and try again.";
        }
      } catch (e) {
        // If response is not JSON, use default message
        errorMessage = error.message || "Network error. Please check your connection and try again.";
      }
      
      showSnackbar(errorMessage, "error");
      
      // Show detailed error in alert
      setTimeout(() => {
        alert(`Upload Error\n\n${errorMessage}\n\nPlease check:\n- File format (CSV or Excel)\n- Required columns (Holiday Name, Holiday Date)\n- Date format (YYYY-MM-DD)`);
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event) => {
    // Use application's color scheme
    const colors = [
      "#2A3663",      // Primary dark blue (main app color)
      "#667eea",      // Primary purple-blue
      "#5E60CE",      // Purple (from DailyUpdates)
      "#27AE60",      // Green (from DailyUpdates)
      "#1976d2",      // Secondary blue
      "#F2994A",      // Orange (from DailyUpdates)
      "#7400B8",      // Dark purple (from DailyUpdates)
      "#2ECC71",      // Light green (from DailyUpdates)
    ];
    const colorIndex = event.id % colors.length;
    return {
      style: {
        backgroundColor: colors[colorIndex],
        color: "white",
        borderRadius: "8px",
        border: "none",
        padding: "8px 12px",
        fontSize: "0.875rem",
        fontWeight: 500,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        cursor: "pointer",
        transition: "all 0.2s ease",
      },
    };
  };

  const handleEventClick = (event) => {
    handleOpenDialog(event.resource);
  };

  const fetchTaskUpdatesForDate = async (dateStr) => {
    setLoadingTaskUpdates(true);
    try {
      const response = await fetch(`http://localhost:8080/d_summary/task-updates/${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        setTaskUpdatesOnDate(data);
      } else {
        setTaskUpdatesOnDate(null);
      }
    } catch (error) {
      console.error("Error fetching task updates:", error);
      setTaskUpdatesOnDate(null);
    } finally {
      setLoadingTaskUpdates(false);
    }
  };

  const handleSelectSlot = (slotInfo) => {
    const clickedDate = slotInfo.start;
    const dateStr = clickedDate.toISOString().split('T')[0];
    
    // Find holidays on this date
    const holidaysOnThisDate = holidays.filter(
      (h) => h.holiday_date.split('T')[0] === dateStr
    );
    
    setSelectedDate(clickedDate);
    setHolidaysOnDate(holidaysOnThisDate);
    setTaskUpdatesOnDate(null);
    
    // Fetch task updates for this date
    fetchTaskUpdatesForDate(dateStr);
    
    // Show dialog
    setDateMenuAnchor(true);
  };

  const handleDateMenuClose = () => {
    setDateMenuAnchor(null);
    setSelectedDate(null);
    setHolidaysOnDate([]);
    setTaskUpdatesOnDate(null);
  };

  const handleAddHolidayForDate = () => {
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData({
        holiday_name: "",
        holiday_date: dateStr,
        holiday_type: "",
        description: "",
      });
      setEditingHoliday(null);
      setOpenDialog(true);
      handleDateMenuClose();
    }
  };

  const handleEditHolidayFromDate = (holiday) => {
    handleOpenDialog(holiday);
    handleDateMenuClose();
  };

  const handleDeleteHolidayFromDate = (holiday) => {
    handleDelete(holiday.holiday_id);
    handleDateMenuClose();
  };

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        backgroundColor: "#F5F7FA",
        minHeight: "100vh",
        background: "linear-gradient(270deg, #2A3663 0%, #B4D6FF 100%)",
      }}
    >
      {/* Header with Actions */}
      <Fade in={true} timeout={500}>
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: "#FFFFFF",
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EventIcon sx={{ fontSize: 32, color: "#2A3663" }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "#1A237E" }}>
                  Calendar & Holidays
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your holiday calendar
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Tooltip title="Refresh holidays list">
                <IconButton
                  onClick={fetchHolidays}
                  disabled={fetching}
                  sx={{
                    backgroundColor: "rgba(42, 54, 99, 0.1)",
                    color: "#2A3663",
                    "&:hover": { backgroundColor: "rgba(42, 54, 99, 0.2)" },
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setOpenUploadDialog(true)}
                sx={{
                  backgroundColor: "#2A3663",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1a2447",
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Upload Excel
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={{
                  backgroundColor: "#2A3663",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1a2447",
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Add Holiday
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Fade>

      {/* Calendar and Holidays List - Side by Side */}
      <Grid container spacing={3}>
        {/* Calendar View - 3/4 width */}
        <Grid item xs={12} md={9}>
          <Zoom in={true} timeout={600}>
            <Paper
              elevation={4}
              sx={{
                p: { xs: 1, sm: 2, md: 3 },
                borderRadius: 3,
                overflow: "hidden",
                backgroundColor: "white",
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                height: "100%",
              }}
            >
              {fetching ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 600,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <Box
                  sx={{
                    "& .rbc-calendar": {
                      fontFamily: "inherit",
                    },
                    "& .rbc-header": {
                      padding: "12px",
                      fontWeight: 600,
                      color: "#2A3663",
                      borderBottom: "2px solid #e0e0e0",
                      transition: "all 0.2s ease",
                    },
                    "& .rbc-today": {
                      backgroundColor: "#f0f4ff",
                      fontWeight: "bold",
                    },
                    "& .rbc-off-range-bg": {
                      backgroundColor: "#fafafa",
                    },
                    "& .rbc-day-bg": {
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "#e8f0fe",
                        transform: "scale(1.02)",
                      },
                    },
                    "& .rbc-date-cell": {
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#e8f0fe",
                        borderRadius: "4px",
                      },
                    },
                    "& .rbc-day-slot": {
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },
                    },
                    "& .rbc-event": {
                      borderRadius: "8px",
                      padding: "4px 8px",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: "-100%",
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(270deg, #2A3663 0%, #B4D6FF 100%)",
                        transition: "left 0.5s ease",
                      },
                    },
                    "& .rbc-event:hover": {
                      transform: "scale(1.08) translateY(-2px)",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                      zIndex: 10,
                      "&::before": {
                        left: "100%",
                      },
                    },
                    "& .rbc-toolbar": {
                      marginBottom: "20px",
                    },
                    "& .rbc-toolbar button": {
                      color: "#2A3663",
                      borderColor: "#2A3663",
                      transition: "all 0.3s ease",
                      borderRadius: "4px",
                      "&:hover": {
                        backgroundColor: "#2A3663",
                        color: "white",
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 8px rgba(42, 54, 99, 0.3)",
                      },
                    },
                    "& .rbc-toolbar button.rbc-active": {
                      backgroundColor: "#2A3663",
                      color: "white",
                      boxShadow: "0 2px 4px rgba(42, 54, 99, 0.2)",
                    },
                    "& .rbc-month-view": {
                      "& .rbc-day-bg": {
                        "&:hover": {
                          backgroundColor: "#e8f0fe",
                        },
                      },
                    },
                    "& .rbc-agenda-view": {
                      "& .rbc-agenda-event-cell": {
                        transition: "all 0.2s ease",
                        "&:hover": {
                          backgroundColor: "#f5f5f5",
                        },
                      },
                    },
                  }}
                >
                  <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: isMobile ? 400 : 600 }}
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={handleEventClick}
                    onSelectSlot={handleSelectSlot}
                    selectable
                    popup
                    views={["month", "week", "day", "agenda"]}
                    defaultView="month"
                  />
                </Box>
              )}
            </Paper>
          </Zoom>
        </Grid>

        {/* Holidays List - 1/4 width */}
        <Grid item xs={12} md={3}>
          <Fade in={true} timeout={800}>
            <Paper
              elevation={4}
              sx={{
                p: { xs: 2, sm: 2 },
                borderRadius: 3,
                backgroundColor: "white",
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", color: "#2A3663", display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <EventIcon fontSize="small" />
                    Holidays
                  </Typography>
                  <TextField
                    select
                    size="small"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    SelectProps={{
                      native: true,
                    }}
                    sx={{
                      minWidth: 90,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        fontSize: "0.75rem",
                      },
                    }}
                  >
                    {availableYears.length > 0 ? (
                      availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))
                    ) : (
                      // Fallback: show current year ± 10 years if no holidays loaded yet
                      Array.from({ length: 21 }, (_, i) => {
                        const year = new Date().getFullYear() - 10 + i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })
                    )}
                  </TextField>
                </Box>
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    backgroundColor: "#fff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
                <Chip
                  label={`${filteredHolidays.length} ${filteredHolidays.length === 1 ? "Holiday" : "Holidays"} ${selectedYear}`}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 600, alignSelf: "flex-start" }}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <TableContainer
                sx={{
                  borderRadius: 2,
                  overflow: "auto",
                  flex: 1,
                  maxHeight: isMobile ? 400 : 600,
                  "& .MuiTableRow:hover": {
                    backgroundColor: "#f5f5f5",
                    transition: "background-color 0.2s ease",
                  },
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#2A3663" }}>
                      <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.75rem", py: 1 }}>
                        Name
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.75rem", py: 1 }}>
                        Date
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: "white", fontWeight: "bold", fontSize: "0.75rem", py: 1 }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredHolidays.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                            <EventIcon sx={{ fontSize: 32, color: "#ccc" }} />
                            <Typography variant="body2" color="textSecondary" align="center">
                              {searchQuery ? "No matches" : "No holidays"}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHolidays.map((holiday, index) => (
                        <Fade in={true} timeout={300} key={holiday.holiday_id} style={{ transitionDelay: `${index * 50}ms` }}>
                          <TableRow>
                            <TableCell sx={{ py: 1 }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.75rem" }}>
                                  {holiday.holiday_name}
                                </Typography>
                                {holiday.holiday_type && (
                                  <Chip
                                    label={holiday.holiday_type}
                                    size="small"
                                    sx={{
                                      backgroundColor: "#e3f2fd",
                                      color: "#1976d2",
                                      fontWeight: 500,
                                      height: 18,
                                      fontSize: "0.65rem",
                                      mt: 0.5,
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                                {new Date(holiday.holiday_date).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDialog(holiday)}
                                    sx={{
                                      color: "#2A3663",
                                      padding: 0.5,
                                      "&:hover": {
                                        backgroundColor: "#e3f2fd",
                                        transform: "scale(1.1)",
                                      },
                                      transition: "all 0.2s ease",
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(holiday.holiday_id)}
                                    sx={{
                                      color: "#d32f2f",
                                      padding: 0.5,
                                      "&:hover": {
                                        backgroundColor: "#ffebee",
                                        transform: "scale(1.1)",
                                      },
                                      transition: "all 0.2s ease",
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        </Fade>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Fade>
        </Grid>
      </Grid>

      {/* Add/Edit Holiday Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(270deg, #2A3663 0%, #B4D6FF 100%)",
            color: "white",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <EventIcon />
          {editingHoliday ? "Edit Holiday" : "Add New Holiday"}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Holiday Name"
              value={formData.holiday_name}
              onChange={(e) =>
                setFormData({ ...formData, holiday_name: e.target.value })
              }
              required
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
              helperText="Enter the name of the holiday"
            />
            <TextField
              label="Holiday Date"
              type="date"
              value={formData.holiday_date}
              onChange={(e) =>
                setFormData({ ...formData, holiday_date: e.target.value })
              }
              required
              fullWidth
              variant="outlined"
              InputLabelProps={{
                shrink: true,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />
            <TextField
              label="Holiday Type"
              value={formData.holiday_type}
              onChange={(e) =>
                setFormData({ ...formData, holiday_type: e.target.value })
              }
              fullWidth
              variant="outlined"
              select
              SelectProps={{
                native: true,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
              helperText="Select the type of holiday (e.g., National, Regional, Company, Religious)"
            >
              <option value="">Select Type (Optional)</option>
              <option value="National">National</option>
              <option value="Regional">Regional</option>
              <option value="Company">Company</option>
              <option value="Religious">Religious</option>
              <option value="State">State</option>
              <option value="Other">Other</option>
            </TextField>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
              helperText="Optional: Add a description for this holiday"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            sx={{
              backgroundColor: "#2A3663",
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              "&:hover": {
                backgroundColor: "#1e2a4a",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(42, 54, 99, 0.3)",
              },
              transition: "all 0.3s ease",
            }}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? "Saving..." : editingHoliday ? "Update Holiday" : "Add Holiday"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Excel Dialog */}
      <Dialog
        open={openUploadDialog}
        onClose={() => {
          setOpenUploadDialog(false);
          setSelectedFile(null);
          setFilePreview([]);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(270deg, #2A3663 0%, #B4D6FF 100%)",
            color: "white",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <UploadIcon />
          Upload Holidays from Excel/CSV
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Alert severity="info" icon={<InfoIcon />} sx={{ borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Excel File Format:
              </Typography>
              <Typography variant="body2" component="div">
                • Column A: <strong>Holiday Name</strong> (required)
                <br />
                • Column B: <strong>Holiday Date</strong> (YYYY-MM-DD format, required)
                <br />
                • Column C: <strong>Holiday Type</strong> (optional: National, Regional, Company, Religious, State, Other)
                <br />
                • Column D: <strong>Description</strong> (optional)
              </Typography>
            </Alert>
            <Box
              sx={{
                border: "2px dashed #2A3663",
                borderRadius: 3,
                p: 4,
                textAlign: "center",
                backgroundColor: "#f5f5f5",
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "#e8e8e8",
                  borderColor: "#1976d2",
                },
              }}
            >
              <UploadIcon sx={{ fontSize: 48, color: "#2A3663", mb: 2 }} />
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadIcon />}
                sx={{
                  backgroundColor: "#2A3663",
                  borderRadius: 2,
                  textTransform: "none",
                  px: 3,
                  mb: 2,
                }}
              >
                {selectedFile ? "Change File" : "Choose Excel/CSV File"}
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                />
              </Button>
              {selectedFile && (
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={selectedFile.name}
                    onDelete={() => {
                      setSelectedFile(null);
                      setFilePreview([]);
                    }}
                    color="primary"
                    sx={{ fontWeight: 500 }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1, color: "textSecondary" }}>
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </Typography>
                </Box>
              )}
            </Box>
            
            {/* File Preview */}
            {selectedFile && filePreview.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1, color: "#2A3663" }}>
                  File Preview (First {filePreview.length} rows):
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300, overflow: "auto" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                        {filePreview[0] && !filePreview[0].error && !filePreview[0].message && Object.keys(filePreview[0]).map((key) => (
                          <TableCell key={key} sx={{ fontWeight: "bold", fontSize: "0.75rem" }}>
                            {key}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <CircularProgress size={20} />
                          </TableCell>
                        </TableRow>
                      ) : filePreview[0]?.error ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ color: "error.main" }}>
                            {filePreview[0].error}
                          </TableCell>
                        </TableRow>
                      ) : filePreview[0]?.message ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ color: "text.secondary" }}>
                            {filePreview[0].message}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filePreview.map((row, idx) => (
                          <TableRow key={idx} hover>
                            {Object.values(row).map((value, cellIdx) => (
                              <TableCell key={cellIdx} sx={{ fontSize: "0.75rem" }}>
                                {String(value || "").substring(0, 50)}
                                {String(value || "").length > 50 ? "..." : ""}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                {filePreview.length >= 10 && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
                    Showing first 10 rows. Full file will be processed on upload.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => {
              setOpenUploadDialog(false);
              setSelectedFile(null);
              setFilePreview([]);
            }}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={loading || !selectedFile}
            sx={{
              backgroundColor: "#2A3663",
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              "&:hover": {
                backgroundColor: "#1e2a4a",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(42, 54, 99, 0.3)",
              },
              transition: "all 0.3s ease",
            }}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
          >
            {loading ? "Uploading..." : "Upload Holidays"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Modal */}
      <Modal
        open={imageModalOpen}
        onClose={() => {
          setImageModalOpen(false);
          setSelectedImage(null);
        }}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Fade in={imageModalOpen}>
          <Box
            sx={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              outline: "none",
            }}
          >
            {selectedImage && (
              <>
                <IconButton
                  onClick={() => {
                    setImageModalOpen(false);
                    setSelectedImage(null);
                  }}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    color: "white",
                    zIndex: 1,
                    "&:hover": {
                      backgroundColor: "rgba(0,0,0,0.7)",
                    },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
                <img
                  src={selectedImage}
                  alt="Preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "90vh",
                    borderRadius: 8,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  }}
                />
              </>
            )}
          </Box>
        </Fade>
      </Modal>

      {/* Date Details Dialog - Combined Holidays and Task Updates */}
      <Dialog
        open={Boolean(dateMenuAnchor)}
        onClose={handleDateMenuClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(270deg, #2A3663 0%, #B4D6FF 100%)",
            color: "white",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 2.5,
            position: "relative",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <EventIcon sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString("en-GB", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Select Date"}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleDateMenuClose}
            sx={{
              color: "white",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                transform: "rotate(90deg)",
              },
              transition: "all 0.3s ease",
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ maxHeight: "65vh", overflow: "auto" }}>
            {/* Holidays Section */}
            <Box sx={{ p: 3, backgroundColor: "#fafafa" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", display: "flex", alignItems: "center", gap: 1.5 }}>
                  <EventIcon sx={{ fontSize: 28 }} />
                  Holidays
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddHolidayForDate}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: "#667eea",
                    "&:hover": {
                      backgroundColor: "#5568d3",
                    },
                  }}
                >
                  Add Holiday
                </Button>
              </Box>
              {holidaysOnDate.length > 0 ? (
                <Grid container spacing={2}>
                  {holidaysOnDate.map((holiday) => (
                    <Grid item xs={12} key={holiday.holiday_id}>
                      <Paper
                        elevation={3}
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          borderLeft: "5px solid #667eea",
                          background: "linear-gradient(270deg, #2A3663 0%, #B4D6FF 100%)",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: "0 8px 24px rgba(102, 126, 234, 0.2)",
                          },
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", mb: 1 }}>
                              {holiday.holiday_name}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                              {holiday.holiday_type && (
                                <Chip
                                  label={holiday.holiday_type}
                                  size="small"
                                  sx={{
                                    backgroundColor: "#e3f2fd",
                                    color: "#1976d2",
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                            </Stack>
                            {holiday.description && (
                              <Typography variant="body2" color="textSecondary" sx={{ mt: 1, lineHeight: 1.6 }}>
                                {holiday.description}
                              </Typography>
                            )}
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Edit Holiday">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  handleEditHolidayFromDate(holiday);
                                }}
                                sx={{
                                  color: "#2A3663",
                                  backgroundColor: "#e3f2fd",
                                  "&:hover": {
                                    backgroundColor: "#bbdefb",
                                    transform: "scale(1.1)",
                                  },
                                  transition: "all 0.2s ease",
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Holiday">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteHolidayFromDate(holiday)}
                                sx={{
                                  color: "#d32f2f",
                                  backgroundColor: "#ffebee",
                                  "&:hover": {
                                    backgroundColor: "#ffcdd2",
                                    transform: "scale(1.1)",
                                  },
                                  transition: "all 0.2s ease",
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    textAlign: "center",
                    backgroundColor: "#f5f5f5",
                    borderRadius: 2,
                  }}
                >
                  <EventIcon sx={{ fontSize: 56, color: "#ccc", mb: 1.5 }} />
                  <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 500 }}>
                    No holidays on this date
                  </Typography>
                </Paper>
              )}
            </Box>

            <Divider />

            {/* Task Updates Section */}
            <Box sx={{ p: 3, backgroundColor: "#ffffff" }}>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2A3663", display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                <AssignmentIcon sx={{ fontSize: 28 }} />
                Task Updates
              </Typography>
              {loadingTaskUpdates ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress size={40} />
                </Box>
              ) : taskUpdatesOnDate && (taskUpdatesOnDate.updates_by_project || taskUpdatesOnDate.updatesByProject) ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {(taskUpdatesOnDate.updates_by_project || taskUpdatesOnDate.updatesByProject || []).map((project, projectIdx) => (
                    <Box key={projectIdx}>
                      <Paper
                        elevation={2}
                        sx={{
                          p: 2,
                          mb: 2,
                          borderRadius: 2,
                          background: "linear-gradient(270deg, #2A3663 0%, #B4D6FF 100%)",
                          borderLeft: `4px solid ${["#2A3663", "#667eea", "#5E60CE"][projectIdx % 3]}`,
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: ["#2A3663", "#667eea", "#5E60CE"][projectIdx % 3], mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                          <CalendarIcon fontSize="small" />
                          {project.project_name || project.projectName || project.project_id || project.projectId || "Unassigned Project"}
                        </Typography>
                        {(project.properties || []).map((property, propIdx) => (
                          <Box key={propIdx} sx={{ mb: 3 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: "#424242", mb: 1.5, ml: 1 }}>
                              {property.property_name || property.propertyName || property.property_id || property.propertyId || "Unnamed Property"}
                            </Typography>
                            {(property.updates || []).length > 0 ? (
                              <Grid container spacing={2}>
                                {property.updates.map((update, updateIdx) => {
                                  const files = update.files || update.attachments || [];
                                  const imageFiles = files.filter((f) => isImageFile(f));
                                  const otherFiles = files.filter((f) => !isImageFile(f));
                                  
                                  return (
                                    <Grid item xs={12} sm={6} md={4} key={updateIdx}>
                                      <Paper
                                        elevation={2}
                                        sx={{
                                          p: 2.5,
                                          borderRadius: 2,
                                          backgroundColor: "#ffffff",
                                          borderLeft: `4px solid ${["#2A3663", "#667eea", "#5E60CE", "#27AE60", "#1976d2", "#F2994A"][updateIdx % 6]}`,
                                          transition: "all 0.2s ease",
                                          height: "100%",
                                          display: "flex",
                                          flexDirection: "column",
                                          "&:hover": {
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                            transform: "translateY(-2px)",
                                          },
                                        }}
                                      >
                                      <Typography variant="body1" sx={{ mb: 1.5, lineHeight: 1.6, color: "#212121" }}>
                                        {update.update_message || update.updateMessage || update.message || update.update_text || update.updateText || "No message"}
                                      </Typography>
                                      
                                      {/* Images Gallery - 3 columns grid */}
                                      {imageFiles.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                          <ImageList cols={3} gap={8} rowHeight={150} sx={{ mb: 1 }}>
                                            {imageFiles.map((file, fileIdx) => {
                                              const imageUrl = file.fileUrl || file.file_url || file.url;
                                              return (
                                                <ImageListItem
                                                  key={fileIdx}
                                                  sx={{
                                                    cursor: "pointer",
                                                    borderRadius: 2,
                                                    overflow: "hidden",
                                                    "&:hover": {
                                                      transform: "scale(1.05)",
                                                      transition: "transform 0.2s ease",
                                                    },
                                                  }}
                                                  onClick={() => {
                                                    setSelectedImage(imageUrl);
                                                    setImageModalOpen(true);
                                                  }}
                                                >
                                                  <img
                                                    src={imageUrl}
                                                    alt={file.fileName || file.file_name || "Image"}
                                                    loading="lazy"
                                                    style={{
                                                      width: "100%",
                                                      height: 150,
                                                      objectFit: "cover",
                                                    }}
                                                  />
                                                  <ImageListItemBar
                                                    title={file.fileName || file.file_name || "Image"}
                                                    actionIcon={
                                                      <IconButton
                                                        sx={{ color: "white" }}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          window.open(imageUrl, "_blank");
                                                        }}
                                                      >
                                                        <ZoomInIcon />
                                                      </IconButton>
                                                    }
                                                  />
                                                </ImageListItem>
                                              );
                                            })}
                                          </ImageList>
                                        </Box>
                                      )}
                                      
                                      {/* Other Files */}
                                      {otherFiles.length > 0 && (
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
                                          {otherFiles.map((file, fileIdx) => {
                                            const fileUrl = file.fileUrl || file.file_url || file.url;
                                            const fileName = file.fileName || file.file_name || "File";
                                            const isPdf = (file.fileType || file.file_type || "").includes("pdf");
                                            
                                            return (
                                              <Chip
                                                key={fileIdx}
                                                icon={isPdf ? <PdfIcon /> : <FileIcon />}
                                                label={fileName}
                                                onClick={() => window.open(fileUrl, "_blank")}
                                                sx={{
                                                  cursor: "pointer",
                                                  "&:hover": {
                                                    backgroundColor: "#e3f2fd",
                                                  },
                                                }}
                                              />
                                            );
                                          })}
                                        </Box>
                                      )}
                                      
                                      <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                                        {(update.created_at || update.createdAt) && (
                                          <Typography variant="caption" color="textSecondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                            {new Date(update.created_at || update.createdAt).toLocaleString("en-GB", {
                                              day: "2-digit",
                                              month: "short",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </Typography>
                                        )}
                                        {(update.status || update.task_status || update.taskStatus) && (
                                          <Chip
                                            label={update.status || update.task_status || update.taskStatus}
                                            size="small"
                                            sx={{
                                              height: 24,
                                              fontSize: "0.7rem",
                                              fontWeight: 600,
                                            }}
                                            color={
                                              (update.status || update.task_status || update.taskStatus || "").toLowerCase().includes("complete") ||
                                              (update.status || update.task_status || update.taskStatus || "").toLowerCase().includes("done")
                                                ? "success"
                                                : "default"
                                            }
                                          />
                                        )}
                                        {(update.engineer_name || update.engineerName) && (
                                          <Chip
                                            label={`Engineer: ${update.engineer_name || update.engineerName}`}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                              height: 24,
                                              fontSize: "0.7rem",
                                            }}
                                          />
                                        )}
                                      </Box>
                                      </Paper>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            ) : (
                              <Typography variant="caption" color="textSecondary" sx={{ ml: 1, fontStyle: "italic" }}>
                                No updates for this property
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Paper>
                    </Box>
                  ))}
                  {(taskUpdatesOnDate.properties_without_updates || taskUpdatesOnDate.propertiesWithoutUpdates || []).length > 0 && (
                    <Paper
                      elevation={2}
                      sx={{
                        mt: 2,
                        p: 2.5,
                        backgroundColor: "#fff3cd",
                        borderRadius: 2,
                        borderLeft: "4px solid #ff9800",
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1.5, color: "#e65100" }}>
                        Properties without updates:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {(taskUpdatesOnDate.properties_without_updates || taskUpdatesOnDate.propertiesWithoutUpdates || []).map((prop, idx) => (
                          <Chip
                            key={idx}
                            label={prop.property_name || prop.propertyName || prop.property_id || prop.propertyId || "Unnamed Property"}
                            size="small"
                            sx={{
                              backgroundColor: "#fff",
                              color: "#e65100",
                            }}
                          />
                        ))}
                      </Stack>
                    </Paper>
                  )}
                </Box>
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    textAlign: "center",
                    backgroundColor: "#f5f5f5",
                    borderRadius: 2,
                  }}
                >
                  <AssignmentIcon sx={{ fontSize: 56, color: "#ccc", mb: 1.5 }} />
                  <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 500 }}>
                    No task updates for this date
                  </Typography>
                </Paper>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          {/* <Button
            onClick={handleDateMenuClose}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: "none",
            }}
          >
            Close
          </Button> */}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={Zoom}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            width: "100%",
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            "& .MuiAlert-icon": {
              fontSize: 28,
            },
          }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CalendarView;
