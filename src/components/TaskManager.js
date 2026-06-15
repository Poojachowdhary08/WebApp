// TaskManagerCombined.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  MenuItem,
  TextField,
  IconButton,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Chip,
  Divider,
  Avatar,
  Snackbar,
  Alert,
  Tooltip,
  Checkbox,
} from "@mui/material";
import { InputAdornment } from "@mui/material";
import {
  Search as SearchIcon,
  AttachFile,
  Close,
  Send as SendIcon,
} from "@mui/icons-material";
import axios from "axios";

const statusColors = {
  "In Progress": { bg: "#EFF6FF", fg: "#1D4ED8", bd: "#BFDBFE" },
  Completed: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
  Pending: { bg: "#FFF7ED", fg: "#B45309", bd: "#FED7AA" },
  Hold: { bg: "#F3F4F6", fg: "#374151", bd: "#E5E7EB" },
  "On Hold": { bg: "#F3F4F6", fg: "#374151", bd: "#E5E7EB" },
  "on hold": { bg: "#F3F4F6", fg: "#374151", bd: "#E5E7EB" },
  Delayed: { bg: "#FEF2F2", fg: "#B91C1C", bd: "#FECACA" },
};

const getStatusChipStyles = (rawStatus) => {
  const s = String(rawStatus || "Pending");
  const m = statusColors[s] || statusColors.Pending;
  return {
    bgcolor: m.bg,
    color: m.fg,
    border: `1px solid ${m.bd}`,
    fontWeight: 900,
    height: 22,
    borderRadius: 999,
    textTransform: "capitalize",
  };
};

const getProgressPercent = (task) => {
  const p =
    task?.completion_percentage ??
    task?.completionPercent ??
    task?.progress ??
    task?.completion ??
    null;
  const n = Number(p);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

// --- attachment helpers ---
const getExt = (nameOrUrl = "") => {
  const clean = String(nameOrUrl).split("?")[0].split("#")[0];
  const parts = clean.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
};
const isImageLike = (fileOrUrl, fileNameFallback = "") => {
  // 1) real File
  if (fileOrUrl && typeof fileOrUrl === "object" && fileOrUrl.type) {
    return String(fileOrUrl.type).startsWith("image/");
  }
  // 2) url / name extension
  const ext = getExt(fileOrUrl || fileNameFallback);
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext);
};

const TaskManagerCombined = ({ propertyId, initialTask = null, refreshTasks }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedTask, setSelectedTask] = useState(initialTask || null);

  // inline edit state
  const [status, setStatus] = useState("");
  const [startdate, setStartdate] = useState("");
  const [enddate, setEnddate] = useState("");
  const [initialValues, setInitialValues] = useState({
    startdate: "",
    enddate: "",
    status: "",
  });

  const [taskId, setTaskId] = useState(null);
  const [materials, setMaterials] = useState([]);

  const [updates, setUpdates] = useState([]);
  const [newUpdateText, setNewUpdateText] = useState("");
  const [newUpdateFiles, setNewUpdateFiles] = useState([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogSeverity, setDialogSeverity] = useState("success");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [manualEndDate, setManualEndDate] = useState(false);

  const emp_name = localStorage.getItem("first_name") || "Unknown Engineer";
  const empFullName =
    `${localStorage.getItem("first_name") || ""} ${localStorage.getItem("last_name") || ""}`.trim() ||
    emp_name;

  const fileInputRef = useRef(null);
  const updatesEndRef = useRef(null);

  // keep track of local blob URLs so we can clean up
  const blobUrlsRef = useRef([]);

  const scrollToBottom = () => {
    setTimeout(() => updatesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
  };

  // cleanup blob urls on unmount
  useEffect(() => {
    return () => {
      try {
        blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      } catch {}
      blobUrlsRef.current = [];
    };
  }, []);

  // -----------------------------
  // Fetch tasks
  // -----------------------------
  const fetchTasks = async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:8080/properties/${propertyId}/schedule`
      );
      const data = response.data.schedule;
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  useEffect(() => {
    if (initialTask?.scheduleid) {
      setSelectedTask(initialTask);
      return;
    }
    if (!selectedTask && Array.isArray(tasks) && tasks.length > 0) {
      setSelectedTask(tasks[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, initialTask?.scheduleid]);

  useEffect(() => {
    if (snackbar.open && snackbar.severity === "success") fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snackbar.open]);

  // -----------------------------
  // Filtering
  // -----------------------------
  const filteredTasks = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    const q = searchQuery.trim().toLowerCase();

    return list.filter((t) => {
      const matchesText =
        !q ||
        String(t?.phasename || "").toLowerCase().includes(q) ||
        String(t?.remarks || "").toLowerCase().includes(q);

      const st = String(t?.status || "Pending");
      const matchesStatus =
        filterStatus === "All" ? true : String(filterStatus) === st;

      return matchesText && matchesStatus;
    });
  }, [tasks, searchQuery, filterStatus]);

  // -----------------------------
  // Task id
  // -----------------------------
  useEffect(() => {
    if (selectedTask?.scheduleid) {
      axios
        .get(`http://localhost:8080/get-task-id/${selectedTask.scheduleid}`)
        .then((response) => setTaskId(response.data.task_id))
        .catch((error) => console.error("Error fetching task_id:", error));
    } else {
      setTaskId(null);
    }
  }, [selectedTask]);

  // -----------------------------
  // Date helpers
  // -----------------------------
  const parseAnyDate = (rawDate) => {
    if (!rawDate) return "";
    if (rawDate.includes("/") && rawDate.split("/")[2]?.length === 4) {
      const [dd, mm, yyyy] = rawDate.split("/");
      return `${yyyy}-${mm}-${dd}`;
    }
    return rawDate;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date)) return "";
    return date.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (selectedTask?.scheduleid) {
      const formattedStart = formatDate(parseAnyDate(selectedTask.startdate));
      const formattedEnd = formatDate(parseAnyDate(selectedTask.enddate));

      setStartdate(formattedStart);
      setEnddate(formattedEnd);
      setStatus(selectedTask.status || "Pending");
      setManualEndDate(false);
      setApplyToAll(false);

      setInitialValues({
        startdate: formattedStart,
        enddate: formattedEnd,
        status: selectedTask.status || "Pending",
      });

      fetchTaskUpdates(selectedTask.scheduleid);
    } else {
      setUpdates([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask?.scheduleid]);

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;

    const prevStart = new Date(initialValues.startdate);
    const prevEnd = new Date(initialValues.enddate);
    const diff = prevEnd - prevStart;

    const computed =
      Number.isFinite(diff) && diff > 0
        ? new Date(new Date(newStartDate).getTime() + diff)
            .toISOString()
            .split("T")[0]
        : enddate;

    setStartdate(newStartDate);
    if (!manualEndDate && computed) setEnddate(computed);
  };

  const handleEndDateChange = (e) => {
    setEnddate(e.target.value);
    setManualEndDate(true);
  };

  const hasChanges = () =>
    startdate !== initialValues.startdate ||
    enddate !== initialValues.enddate ||
    status !== initialValues.status;

  // -----------------------------
  // Updates
  // -----------------------------
  const fetchTaskUpdates = async (scheduleid) => {
    try {
      const response = await axios.get(
        `http://localhost:8080/schedule_update/${scheduleid}`
      );
      setUpdates(response.data.updates || []);
      scrollToBottom();
    } catch (error) {
      console.error("Error fetching updates:", error);
      setUpdates([]);
    }
  };

  // oldest -> newest so latest is bottom
  const sortedUpdates = useMemo(() => {
    const list = Array.isArray(updates) ? updates : [];
    return [...list].sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return ta - tb;
    });
  }, [updates]);

  useEffect(() => {
    if (taskId) {
      axios
        .get(`http://localhost:8080/materials/${taskId}`)
        .then((response) => setMaterials(response.data.materials || []))
        .catch((error) => console.error("Error fetching materials:", error));
    } else {
      setMaterials([]);
    }
  }, [taskId]);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setNewUpdateFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const removeFile = (index) => {
    setNewUpdateFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // -----------------------------
  // Save schedule
  // -----------------------------
  const handleSave = async (applyToAllOverride) => {
    const finalApplyToAll =
      typeof applyToAllOverride === "boolean" ? applyToAllOverride : applyToAll;

    if (!selectedTask?.scheduleid) {
      setDialogMessage("Error: Missing schedule ID!");
      setDialogSeverity("error");
      setDialogOpen(true);
      setTimeout(() => setDialogOpen(false), 2500);
      return;
    }

    let completionTime = null;
    if (status === "Completed") {
      const kolkataTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      completionTime = new Date(kolkataTime).toISOString();
    }

    try {
      const payload = {
        phasename: selectedTask.phasename || "",
        startdate,
        enddate,
        status,
        completionTime,
        task_id: taskId,
        applyToAll: finalApplyToAll,
      };

      const response = await axios.put(
        `http://localhost:8080/update-schedule/${selectedTask.scheduleid}`,
        payload
      );

      if (response.data.success || response.status === 200) {
        try {
          const empCode = localStorage.getItem("employee_code") || "EMP_UNKNOWN";
          const chatForm = new FormData();
          chatForm.append("property_id", propertyId);
          chatForm.append("engineer_name", empFullName);
          chatForm.append("employee_code", empCode);
          chatForm.append(
            "message_text",
            `🔄 Phase *${selectedTask.phasename}* status changed to *${status}*.\n📅 ${startdate} → ${enddate}`
          );
          await axios.post("http://localhost:8080/property-chat/send", chatForm);
        } catch (err) {
          console.error("❌ Failed to send property chat update:", err.response?.data || err.message);
        }

        await fetchTasks();
        if (typeof refreshTasks === "function") refreshTasks();

        setSelectedTask((prev) => ({
          ...prev,
          status,
          startdate,
          enddate,
        }));

        setInitialValues({ startdate, enddate, status });

        setSnackbar({
          open: true,
          message: finalApplyToAll ? "Saved (applied to all) ✅" : "Saved ✅",
          severity: "success",
        });
      } else {
        throw new Error("Failed to update task");
      }
    } catch (error) {
      console.error("Error updating schedule:", error);
      setSnackbar({
        open: true,
        message: "Update failed ❌",
        severity: "error",
      });
    }
  };

  // -----------------------------
  // Send update (message/files)
  // -----------------------------
  const handleSendUpdate = async () => {
    if (!selectedTask?.scheduleid) return;
    if (!newUpdateText.trim() && newUpdateFiles.length === 0) return;

    // ✅ OPTIMISTIC UI: add message immediately
    const optimisticId = `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const nowIso = new Date().toISOString();

    // create preview blob urls for images/files
    const optimisticFiles = (newUpdateFiles || []).map((file, idx) => {
      const blobUrl = URL.createObjectURL(file);
      blobUrlsRef.current.push(blobUrl);
      return {
        file_id: `${optimisticId}_f_${idx}`,
        file_name: file.name,
        file_url: blobUrl, // local preview
        file_size: file.size,
        __optimistic: true,
        __isImage: isImageLike(file),
      };
    });

    const optimisticUpdate = {
      update_id: optimisticId,
      engineer_name: emp_name,
      update_text: newUpdateText,
      created_at: nowIso,
      files: optimisticFiles,
      __optimistic: true,
    };

    setUpdates((prev) => [...(Array.isArray(prev) ? prev : []), optimisticUpdate]);
    scrollToBottom();

    // clear composer immediately (feels instant)
    const textToSend = newUpdateText;
    const filesToSend = [...newUpdateFiles];
    setNewUpdateText("");
    setNewUpdateFiles([]);

    const formData = new FormData();
    formData.append("task_id", taskId);
    formData.append("property_id", propertyId);
    formData.append("schedule_id", selectedTask.scheduleid);
    formData.append("engineer_name", emp_name);
    formData.append("update_text", textToSend);

    for (let file of filesToSend) formData.append("update_files", file);

    const empCode = localStorage.getItem("employee_code") || "EMP_UNKNOWN";

    try {
      await axios.post("http://localhost:8080/task-updates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Also send to property chat
      try {
        const chatForm = new FormData();
        chatForm.append("property_id", propertyId);
        chatForm.append("engineer_name", emp_name);
        chatForm.append("employee_code", empCode);
        chatForm.append("message_text", textToSend || "[📎 Attachment]");
        for (const file of filesToSend) chatForm.append("files", file);
        await axios.post("http://localhost:8080/property-chat/send", chatForm);
      } catch (error) {
        console.error("❌ Error sending chat message:", error.response?.data || error.message);
      }

      // ✅ reconcile with server (replaces optimistic if server is eventually consistent)
      await fetchTaskUpdates(selectedTask.scheduleid);

      setSnackbar({ open: true, message: "Update sent 🚀", severity: "success" });
    } catch (error) {
      console.error("Error sending update:", error);

      // rollback optimistic (remove it) + restore composer text/files (so user can retry)
      setUpdates((prev) => (Array.isArray(prev) ? prev.filter((u) => u?.update_id !== optimisticId) : []));
      setNewUpdateText(textToSend);
      setNewUpdateFiles(filesToSend);

      setSnackbar({ open: true, message: "Send failed ❌", severity: "error" });
    }
  };

  const handleUpdateClick = async () => {
    const scheduleDirty = hasChanges();
    const messageDirty = newUpdateText.trim() || newUpdateFiles.length > 0;

    if (!scheduleDirty && !messageDirty) {
      setSnackbar({ open: true, message: "Nothing to update 🙂", severity: "info" });
      return;
    }

    if (scheduleDirty && applyToAll) {
      setConfirmOpen(true);
      return;
    }

    if (scheduleDirty) await handleSave(false);
    if (messageDirty) await handleSendUpdate();
  };

  const handleConfirmOnlyThis = async () => {
    setConfirmOpen(false);
    const scheduleDirty = hasChanges();
    const messageDirty = newUpdateText.trim() || newUpdateFiles.length > 0;

    if (scheduleDirty) await handleSave(false);
    if (messageDirty) await handleSendUpdate();
  };

  const handleConfirmApplyAll = async () => {
    setConfirmOpen(false);
    const scheduleDirty = hasChanges();
    const messageDirty = newUpdateText.trim() || newUpdateFiles.length > 0;

    if (scheduleDirty) await handleSave(true);
    if (messageDirty) await handleSendUpdate();
  };

  // -----------------------------
  // UI
  // -----------------------------
  if (!propertyId) {
    return (
      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 2, bgcolor: "#fff" }}>
        <Typography sx={{ color: "#6b7280", fontStyle: "italic" }}>
          No property selected.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: "flex", gap: 2, height: "100%", minHeight: 560, overflow: "hidden" }}>
      {/* LEFT PANE */}
      <Paper
        elevation={0}
        sx={{
          width: 360,
          borderRadius: 3,
          border: "1px solid #e5e7eb",
          bgcolor: "#fff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 1.5 }}>
          <TextField
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              sx: { borderRadius: 999, bgcolor: "#f9fafb" },
            }}
          />

          <Box sx={{ display: "flex", gap: 1, mt: 1.2 }}>
            <TextField
              size="small"
              select
              fullWidth
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              SelectProps={{ displayEmpty: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 999,
                  bgcolor: "#f9fafb",
                },
              }}
            >
              {["All", "On Hold", "In Progress", "Completed"].map((x) => (
                <MenuItem key={x} value={x}>
                  {x}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>

        <Divider />

        <Box sx={{ p: 1.2, overflowY: "auto", flex: 1 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={22} />
            </Box>
          ) : filteredTasks.length === 0 ? (
            <Typography sx={{ color: "#6b7280", fontStyle: "italic", fontSize: 13, p: 1 }}>
              No tasks found.
            </Typography>
          ) : (
            filteredTasks.map((t) => {
              const selected = t?.scheduleid === selectedTask?.scheduleid;
              const pct = getProgressPercent(t);

              return (
                <Box
                  key={t?.scheduleid}
                  onClick={() => setSelectedTask(t)}
                  sx={{
                    p: 1.5,
                    mb: 1.2,
                    borderRadius: 3,
                    border: selected ? "1px solid #dbeafe" : "1px solid #f1f5f9",
                    bgcolor: selected ? "#fff7ed" : "#ffffff",
                    cursor: "pointer",
                    boxShadow: selected ? "0 10px 20px rgba(15,23,42,0.08)" : "none",
                    transition: "all 120ms ease",
                    "&:hover": { transform: "translateY(-1px)" },
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontWeight: 900, color: "#111827", fontSize: 13 }}>
                      {t?.phasename || "Task"}
                    </Typography>

                    <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
          
                      <Chip size="small" label={String(t?.status || "Pending")} sx={getStatusChipStyles(t?.status)} />
                    </Box>
                  </Box>

                  <Typography sx={{ mt: 0.6, color: "#6b7280", fontSize: 12 }}>
                    {t?.startdate ? new Date(t.startdate).toDateString() : "—"}
                  </Typography>
                </Box>
              );
            })
          )}
        </Box>
      </Paper>

      {/* RIGHT PANE */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          borderRadius: 3,
          border: "1px solid #e5e7eb",
          bgcolor: "#fff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          width: "1200px",
        }}
      >
        {/* INLINE EDIT HEADER */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #e5e7eb" }}>
          {/* Row 1: inputs */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ minWidth: 260 }}>
              <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 900 }}>
                Task Name
              </Typography>
              <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 900 }}>
                {selectedTask?.phasename || "—"}
              </Typography>
            </Box>

            <TextField
              label="Start Date"
              type="date"
              size="small"
              value={startdate}
              onChange={handleStartDateChange}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 190 }}
            />

            <TextField
              label="End Date"
              type="date"
              size="small"
              value={enddate}
              onChange={handleEndDateChange}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 190 }}
            />

            <TextField
              label="Status"
              select
              size="small"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {["Pending", "In Progress", "On Hold", "Completed", "Delayed"].map((x) => (
                <MenuItem key={x} value={x}>
                  {x}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Row 2: checkbox + saved chip */}
          <Box
            sx={{
              mt: 1.1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "nowrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Checkbox checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} />
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
                Adjust all subsequent tasks
              </Typography>
            </Box>

            <Chip
              size="small"
              label={hasChanges() ? "Unsaved changes" : "Saved"}
              sx={{
                height: 22,
                borderRadius: 999,
                fontWeight: 900,
                bgcolor: hasChanges() ? "#FFF7ED" : "#ECFDF5",
                color: hasChanges() ? "#B45309" : "#047857",
                border: hasChanges() ? "1px solid #FED7AA" : "1px solid #A7F3D0",
              }}
            />
          </Box>
        </Box>

        {/* Updates area */}
        <Box sx={{ p: 2, overflow: "auto", flex: 1, bgcolor: "#ffffff" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#111827", mb: 1.5 }}>
            Task Updates
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
            {sortedUpdates.length > 0 ? (
              sortedUpdates.map((u) => {
                const mine = String(u?.engineer_name || "") === String(emp_name || "");
                const ts = u?.created_at ? new Date(u.created_at).toLocaleString() : "";
                const avatarLabel = String(u?.engineer_name || "U").slice(0, 1).toUpperCase();

                return (
                  <Box key={u?.update_id} sx={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <Box sx={{ display: "flex", gap: 1, maxWidth: "78%" }}>
                      {!mine && (
                        <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                          {avatarLabel}
                        </Avatar>
                      )}

                      <Box>
                        {!mine && (
                          <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                            {u?.engineer_name || "Unknown"} • {ts}
                          </Typography>
                        )}

                        <Paper
                          elevation={0}
                          sx={{
                            mt: 0.5,
                            px: 1.6,
                            py: 1.2,
                            borderRadius: 2,
                            bgcolor: mine ? "#E8F0FF" : "#F9FAFB",
                            border: mine ? "1px solid #C7D2FE" : "1px solid #E5E7EB",
                            position: "relative",
                          }}
                        >
                          {/* small "sending..." for optimistic */}
                          {u?.__optimistic && (
                            <Chip
                              size="small"
                              label="Sending…"
                              sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                height: 20,
                                fontWeight: 900,
                                borderRadius: 999,
                                bgcolor: "#FFF7ED",
                                color: "#B45309",
                                border: "1px solid #FED7AA",
                              }}
                            />
                          )}

                          {u?.update_text ? (
                            <Typography sx={{ fontSize: 13, color: "#111827", pr: u?.__optimistic ? 10 : 0 }}>
                              {u.update_text}
                            </Typography>
                          ) : null}

                          {/* ✅ attachments: show images as thumbnails, others as chips */}
                          {Array.isArray(u?.files) && u.files.length > 0 && (
                            <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                              {u.files.map((f) => {
                                const img = isImageLike(f?.file_url, f?.file_name) || f?.__isImage;
                                if (img) {
                                  return (
                                    <Box
                                      key={f.file_id}
                                      component="a"
                                      href={f.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      sx={{
                                        textDecoration: "none",
                                        border: "1px solid #E5E7EB",
                                        borderRadius: 2,
                                        overflow: "hidden",
                                        width: 120,
                                        height: 90,
                                        bgcolor: "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        "&:hover": { boxShadow: "0 10px 20px rgba(15,23,42,0.10)" },
                                      }}
                                    >
                                      <Box
                                        component="img"
                                        src={f.file_url}
                                        alt={f.file_name || "image"}
                                        sx={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          display: "block",
                                        }}
                                      />
                                    </Box>
                                  );
                                }

                                return (
                                  <Chip
                                    key={f.file_id}
                                    icon={<AttachFile />}
                                    label={`${f.file_name} • ${((f.file_size || 0) / 1024 / 1024).toFixed(2)} MB`}
                                    component="a"
                                    clickable
                                    href={f.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                      bgcolor: "#F3F4F6",
                                      border: "1px solid #E5E7EB",
                                      fontWeight: 800,
                                      textDecoration: "none",
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          )}
                        </Paper>

                        {mine && (
                          <Typography sx={{ mt: 0.5, fontSize: 12, color: "#6b7280", fontWeight: 800, textAlign: "right" }}>
                            {ts} • You
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })
            ) : (
              <Typography sx={{ color: "#6b7280", fontStyle: "italic", fontSize: 13 }}>
                No updates yet.
              </Typography>
            )}

            <div ref={updatesEndRef} />
          </Box>
        </Box>

        {/* Composer */}
        <Box sx={{ p: 2, borderTop: "1px solid #e5e7eb", bgcolor: "#ffffff" }}>
          {newUpdateFiles.length > 0 && (
            <Box sx={{ mb: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
              {newUpdateFiles.map((file, idx) => (
                <Chip
                  key={`${file.name}-${idx}`}
                  icon={<AttachFile />}
                  label={`${file.name} • ${(file.size / 1024).toFixed(1)} KB`}
                  onDelete={() => removeFile(idx)}
                  deleteIcon={<Close />}
                  sx={{ bgcolor: "#EFF6FF", border: "1px solid #BFDBFE", fontWeight: 900 }}
                />
              ))}
            </Box>
          )}

          <Paper
            elevation={0}
            sx={{
              border: "1px solid #e5e7eb",
              borderRadius: 3,
              px: 2,
              py: 1.2,
              display: "flex",
              alignItems: "center",
              gap: 1.2,
            }}
          >
            <TextField
              placeholder="Type a message..."
              fullWidth
              value={newUpdateText}
              onChange={(e) => setNewUpdateText(e.target.value)}
              size="small"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 999 } }}
            />

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <Tooltip title="Attach files">
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}
              >
                <AttachFile fontSize="small" />
              </IconButton>
            </Tooltip>

            <Button
              onClick={async () => {
                const scheduleDirty = hasChanges();
                const messageDirty = newUpdateText.trim() || newUpdateFiles.length > 0;

                if (!scheduleDirty && !messageDirty) {
                  setSnackbar({ open: true, message: "Nothing to update 🙂", severity: "info" });
                  return;
                }

                if (scheduleDirty && applyToAll) {
                  setConfirmOpen(true);
                  return;
                }

                if (scheduleDirty) await handleSave(false);
                if (messageDirty) await handleSendUpdate();
              }}
              variant="contained"
              endIcon={<SendIcon />}
              sx={{
                bgcolor: "#2a3663",
                borderRadius: 2,
                fontWeight: 900,
                textTransform: "none",
                "&:hover": { bgcolor: "#1E2A48" },
              }}
            >
              Update
            </Button>
          </Paper>
        </Box>
      </Paper>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Apply Changes to All Phases?</DialogTitle>
        <DialogContent>
          <Typography>Do you want to update only this phase or all future phases?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmOnlyThis} variant="outlined" sx={{ fontWeight: 900, textTransform: "none" }}>
            Only This Phase
          </Button>
          <Button onClick={handleConfirmApplyAll} variant="contained" sx={{ fontWeight: 900, textTransform: "none" }}>
            Apply to All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Small dialog (kept) */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{dialogSeverity === "success" ? "Success" : "Error"}</DialogTitle>
        <DialogContent>
          <Typography>{dialogMessage}</Typography>
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2800}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskManagerCombined;
