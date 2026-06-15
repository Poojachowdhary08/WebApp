// src/components/TicketDetails.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Typography,
  Grid,
  Box,
  CircularProgress,
  TextField,
  IconButton,
  Stack,
  InputAdornment,
  Paper,
  Button,
  FormControl,
  Autocomplete,
  Chip,
  useMediaQuery,
  Dialog,
  Divider,
  Avatar,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SendIcon from "@mui/icons-material/Send";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

const NAME_COLORS = [
  "#D32F2F",
  "#1976D2",
  "#388E3C",
  "#F57C00",
  "#7B1FA2",
  "#0097A7",
  "#FBC02D",
  "#5D4037",
  "#0288D1",
  "#C2185B",
  "#009688",
  "#E91E63",
  "#8BC34A",
  "#CDDC39",
  "#FF9800",
  "#795548",
  "#3F51B5",
  "#4CAF50",
  "#2196F3",
  "#FF5722",
];

const CURRENT_USER_COLOR = "#96501a";

const getColorForUser = (email, currentUserEmail) => {
  if (!email) return "#777";
  if (email === currentUserEmail) return CURRENT_USER_COLOR;
  const hash = [...email].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return NAME_COLORS[hash % NAME_COLORS.length];
};

const initialsFromName = (nameOrEmail) => {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (s.includes("@")) return s[0].toUpperCase();
  return s.slice(0, 2).toUpperCase();
};

const pillSx = {
  borderRadius: 2,
  fontWeight: 800,
  border: "1px solid #e6eaf2",
  bgcolor: "#f8fafc",
  color: "#111827",
  height: 28,
};

const statusChipSx = (status) => {
  const s = (status || "").toLowerCase();
  if (s.includes("closed") || s.includes("resolved")) {
    return { ...pillSx, bgcolor: "#e7f6ee", borderColor: "#c7ead4", color: "#1b5e20" };
  }
  if (s.includes("hold")) {
    return { ...pillSx, bgcolor: "#f3f4f6", borderColor: "#e5e7eb", color: "#374151" };
  }
  if (s.includes("progress")) {
    return { ...pillSx, bgcolor: "#e8f1ff", borderColor: "#d7e1ff", color: "#0D47A1" };
  }
  if (s.includes("open") || s.includes("pending")) {
    return { ...pillSx, bgcolor: "#fff7e6", borderColor: "#ffe0b2", color: "#7a4b00" };
  }
  return pillSx;
};

const BASE_URL = "http://localhost:8080";

const toAbsoluteUrl = (maybeUrl) => {
  if (!maybeUrl) return "";
  const s = String(maybeUrl);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `${BASE_URL}${s}`;
  return s;
};

const normalizeFiles = (raw) => {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((f) => {
      if (!f) return null;
      if (typeof f === "string") {
        const url = toAbsoluteUrl(f);
        const name = url.split("?")[0].split("/").pop() || "Attachment";
        const isImage = /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name);
        return { url, name, type: isImage ? "image" : "file" };
      }

      const url = toAbsoluteUrl(f.file_url || f.url || f.file || f.path || f.location);
      const name = f.file_name || f.name || (url ? url.split("?")[0].split("/").pop() : "Attachment") || "Attachment";
      const mime = f.file_type || f.type || "";
      const isImage =
        String(mime).toLowerCase().startsWith("image/") ||
        /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(String(name || ""));

      if (!url) return null;
      return { url, name, type: isImage ? "image" : "file" };
    })
    .filter(Boolean);
};

const TicketDetails = ({ issueId, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const chatEndRef = useRef(null);

  const [assignments, setAssignments] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [ticketFiles, setTicketFiles] = useState([]); // attachments uploaded while creating ticket

  const isMobile = useMediaQuery("(max-width:900px)");

  const currentUserEmail = localStorage.getItem("email");
  const currentUserCode = localStorage.getItem("employee_code");
  const currentUserName = `${localStorage.getItem("first_name")} ${localStorage.getItem("last_name")}`.trim();

  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  // ----------------------------
  // Fetch ticket + chat
  // ----------------------------
  useEffect(() => {
    if (!issueId) return;
    setLoading(true);

    const fetchAll = async () => {
      try {
        const ticketRes = await fetch(`http://localhost:8080/tickets/${issueId}`);
        const ticketData = await ticketRes.json();
        setTicket(ticketData.ticket);
        setAssignments(ticketData.assignments || []);
        setTicketFiles(
          normalizeFiles(
            ticketData?.ticket?.files ||
              ticketData?.ticket?.attachments ||
              ticketData?.ticket?.images ||
              ticketData?.ticket?.documents ||
              ticketData?.files ||
              ticketData?.attachments
          )
        );

        const chatRes = await fetch(`http://localhost:8080/ticket-chat/list/${issueId}`);
        const chatData = await chatRes.json();
        setChats(chatData.chats || []);
      } catch (err) {
        console.error("❌ Error fetching ticket/chat", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [issueId]);

  // ----------------------------
  // Scroll bottom (dialog + when chats update)
  // ----------------------------
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "auto" });
      }
    };
    const timeout = setTimeout(scrollToBottom, 150);
    return () => clearTimeout(timeout);
  }, [showHistory, chats]);

  // ----------------------------
  // Fetch employees
  // ----------------------------
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("http://localhost:8080/employees");
        const data = await res.json();
        setAllEmployees(data || []);
      } catch (err) {
        console.error("❌ Error fetching employees", err);
      }
    };
    fetchEmployees();
  }, []);

  // ----------------------------
  // Preselect assigned
  // ----------------------------
  useEffect(() => {
    if (allEmployees.length && assignments.length) {
      const preselected = allEmployees.filter((emp) =>
        assignments.some((assign) => assign.employee_code === emp.employee_code)
      );
      setSelectedEmployees(preselected);
    }
  }, [allEmployees, assignments]);

  // ----------------------------
  // Send message (works for right-panel + dialog)
  // ----------------------------
  const handleSend = async () => {
    if (!message.trim() && files.length === 0) return;
    if (!ticket?.property_id) {
      console.warn("⚠️ ticket not loaded yet, cannot send");
      return;
    }

    const formData = new FormData();
    formData.append("issue_id", issueId);
    formData.append("sender_email", currentUserEmail);
    formData.append("property_id", ticket.property_id);
    formData.append("message", message.trim());
    formData.append("employee_code", currentUserCode);

    files.forEach((file) => formData.append("files", file));

    if (replyTo?.chat_id) {
      formData.append("reply_to_chat_id", replyTo.chat_id);
      formData.append("reply_to_text", replyTo.message || "");
    }

    try {
      const res = await fetch("http://localhost:8080/ticket-chat/send", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to send message");

      const updated = await fetch(`http://localhost:8080/ticket-chat/list/${issueId}`);
      const updatedData = await updated.json();

      setMessage("");
      setFiles([]);
      setReplyTo(null);
      setChats(updatedData.chats || []);
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  };

  // ----------------------------
  // Assign employees
  // ----------------------------
  const handleAssignEmployees = async () => {
    const employeeCodes = selectedEmployees.map((emp) => emp.employee_code);

    try {
      const res = await fetch(`http://localhost:8080/tickets/${issueId}/assignees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to_employee_codes: employeeCodes }),
      });

      if (!res.ok) throw new Error("Failed to assign employees");

      const updatedTicketRes = await fetch(`http://localhost:8080/tickets/${issueId}`);
      const updatedTicketData = await updatedTicketRes.json();
      setAssignments(updatedTicketData.assignments || []);
    } catch (err) {
      console.error("❌ Failed to assign employees", err);
    }
  };

  const handleFileSelect = (e) => setFiles([...e.target.files]);

  // ✅ ONE close button (top-right). If dialog is open -> close dialog; else close panel.
  const handleTopRightClose = () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    onClose?.();
  };

  const topLine = useMemo(() => {
    return {
      id: issueId,
      propertyId: ticket?.property_id || "-",
      issueType: ticket?.issue_type || "-",
      status: ticket?.status || "-",
      severity: ticket?.severity || "-",
      priority: ticket?.priority || "-",
      description: ticket?.description || "-",
    };
  }, [ticket, issueId]);

  const creationAttachments = useMemo(() => normalizeFiles(ticketFiles), [ticketFiles]);

  if (!issueId) return null;

  const CreationAttachmentsBubble = () => {
    if (!creationAttachments.length) return null;

    const reporterLabel =
      ticket?.reported_by_name ||
      ticket?.reported_by_employee_name ||
      ticket?.reported_by_email ||
      ticket?.reported_by ||
      "Reporter";

    const rawCreated = ticket?.created_at || ticket?.created_date || ticket?.created_on || null;
    const createdLabel = rawCreated ? new Date(rawCreated).toLocaleString("en-GB") : "";

    return (
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1.5 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: "#ffffff",
            border: "1px solid #eef2f7",
            maxWidth: "78%",
          }}
        >
          <Typography fontSize="0.85rem" sx={{ mb: 0.8 }}>
            <Box component="span" sx={{ fontWeight: 900, color: "#111827" }}>
              {reporterLabel}
            </Box>
            <Box component="span" sx={{ color: "#6b7280", ml: "10px", fontWeight: 700 }}>
              uploaded attachments
              {createdLabel ? ` • ${createdLabel}` : ""}
            </Box>
          </Typography>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {creationAttachments.map((f, idx) => {
              if (f.type === "image") {
                return (
                  <Box
                    key={`${f.url}-${idx}`}
                    onClick={() => window.open(f.url, "_blank")}
                    sx={{
                      cursor: "pointer",
                      width: 140,
                      height: 100,
                      borderRadius: 2,
                      overflow: "hidden",
                      border: "1px solid #e5e7eb",
                      bgcolor: "#f9fafb",
                    }}
                    title={f.name}
                  >
                    <img
                      src={f.url}
                      alt={f.name}
                      style={{
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
                <Box
                  key={`${f.url}-${idx}`}
                  onClick={() => window.open(f.url, "_blank")}
                  sx={{
                    cursor: "pointer",
                    px: 1,
                    py: 0.8,
                    borderRadius: 2,
                    border: "1px solid #e5e7eb",
                    bgcolor: "#f9fafb",
                    maxWidth: 360,
                  }}
                  title={f.name}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#2563EB" }} noWrap>
                    {f.name}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <>
      <Box sx={{ mt: 2, position: "relative" }}>
  
        {/* ======= TOP SUMMARY BAR ======= */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 3,
            border: "1px solid #e9edf5",
            background: "linear-gradient(180deg, #ffffff 0%, #fbfcff 100%)",
          }}
        >
          <Stack spacing={1.25}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
              sx={{ pr: 6 }}
            >
              <Box>
                <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.1 }}>
                  Ticket Details
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2, fontWeight: 600 }}>
                  {topLine.propertyId} • {topLine.id}
                </Typography>
              </Box>
              <Box
              sx={{
                p: 1.25,
                borderRadius: 2.5,
                border: "1px solid #eef2f7",
                bgcolor: "#ffffff",
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                Description
              </Typography>
              <Typography sx={{ mt: 0.4, fontWeight: 700, color: "#111827" }}>
                {topLine.description}
              </Typography>
            </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Issue: ${topLine.issueType}`} sx={pillSx} />
                <Chip label={`Status: ${topLine.status}`} sx={statusChipSx(topLine.status)} />
                <Chip label={`Severity: ${topLine.severity}`} sx={pillSx} />
                <Chip label={`Priority: ${topLine.priority}`} sx={pillSx} />
              </Stack>
              <Button
            onClick={handleTopRightClose}
            variant="outlined"
              startIcon={<CloseIcon />}

              sx={{
                backgroundColor: "#FEE2E2",      // soft red
                color: "#DC2626",                // red text
                borderRadius: "9px",
                textTransform: "none",
                fontWeight: 600,
                // px: 3,
                // py: 1,
                fontSize: "0.9rem",
                boxShadow: "none",
                "&:hover": {
                  borderColor: "error.dark",

                  backgroundColor: "#FECACA",
                  boxShadow: "none",
                },
              }}
            >
              Close
            </Button>
            </Stack>
            
          </Stack>
        </Paper>

        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {/* LEFT: Assign Employees */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid #e9edf5",
                  height: isMobile ? "auto" : "calc(80vh - 160px)",
                  minHeight: 420,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography
  variant="subtitle1"
  fontWeight={900}
  sx={{ width: "100%", textAlign: "center" }}
>
  Assign Employees
</Typography>


              
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <FormControl fullWidth>
                  <Autocomplete
                    multiple
                    disableCloseOnSelect
                    filterSelectedOptions
                    options={allEmployees}
                    getOptionLabel={(option) =>
                      option.first_name && option.last_name
                        ? `${option.first_name} ${option.last_name}`
                        : option.first_name || option.last_name || "Unnamed"
                    }
                    value={selectedEmployees}
                    onChange={(e, newValue) => setSelectedEmployees(newValue)}
                    onInputChange={(e, val) => setEmployeeSearch(val)}
                    isOptionEqualToValue={(option, value) => option.employee_code === value.employee_code}
                    renderOption={(props, option) => {
                      const label =
                        option.first_name && option.last_name
                          ? `${option.first_name} ${option.last_name}`
                          : option.first_name || option.last_name || "Unnamed";

                      const isAlreadySelected = selectedEmployees.some(
                        (emp) => emp.employee_code === option.employee_code
                      );

                      const handleToggle = () => {
                        if (isAlreadySelected) {
                          setSelectedEmployees((prev) =>
                            prev.filter((emp) => emp.employee_code !== option.employee_code)
                          );
                        } else {
                          setSelectedEmployees((prev) => [...prev, option]);
                        }
                      };

                      return (
                        <li
                          {...props}
                          onClick={handleToggle}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            margin: "6px 0",
                            borderRadius: "12px",
                            padding: "10px 10px",
                            cursor: "pointer",
                            transition: "background 0.2s",
                            backgroundColor: isAlreadySelected ? "#f2f6ff" : "transparent",
                            border: isAlreadySelected ? "1px solid #d7e1ff" : "1px solid transparent",
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 34,
                              height: 34,
                              mr: 1,
                              bgcolor: "#e9edf5",
                              color: "#2A3663",
                              fontWeight: 800,
                              fontSize: 13,
                            }}
                          >
                            {initialsFromName(label)}
                          </Avatar>

                          <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={800} sx={{ lineHeight: 1.2 }}>
                              {label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                              {option.employee_code}
                            </Typography>
                          </Box>

                          <Chip
                            size="small"
                            label={isAlreadySelected ? "Added" : "Add"}
                            sx={{
                              borderRadius: 2,
                              fontWeight: 800,
                              bgcolor: isAlreadySelected ? "#e7f6ee" : "#f3f4f6",
                              color: isAlreadySelected ? "#1b5e20" : "#374151",
                            }}
                          />
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        placeholder="Search employees"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2.5,
                            bgcolor: "#fff",
                          },
                        }}
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const label =
                          option.first_name && option.last_name
                            ? `${option.first_name} ${option.last_name}`
                            : option.first_name || option.last_name || "Unnamed";

                        const isMatch =
                          employeeSearch.trim().length > 0 &&
                          label.toLowerCase().includes(employeeSearch.toLowerCase());

                        return (
                          <Chip
                            key={option.employee_code}
                            label={label}
                            {...getTagProps({ index })}
                            sx={{
                              borderRadius: 2,
                              bgcolor: isMatch ? "#D0E7FF" : "#eef2f7",
                              color: isMatch ? "#0D47A1" : "#111827",
                              fontWeight: isMatch ? 900 : 700,
                              border: isMatch ? "1px solid #2196F3" : "1px solid #e6eaf2",
                              ".MuiChip-deleteIcon": {
                                color: isMatch ? "#1976D2" : "inherit",
                                "&:hover": { color: isMatch ? "#0D47A1" : "inherit" },
                              },
                            }}
                          />
                        );
                      })
                    }
                    PaperComponent={(props) => (
                      <Paper {...props} sx={{ mt: 1, borderRadius: 3, border: "1px solid #e9edf5" }} />
                    )}
                  />
                </FormControl>

                <Button
                  variant="contained"
                  sx={{
                    mt: 2,
                    borderRadius: 2.5,
                    textTransform: "none",
                    fontWeight: 900,
                    boxShadow: "none",
                    
                  }}
                  onClick={handleAssignEmployees}
                >
                  Save Assigned Employees
                </Button>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
                  {(selectedEmployees || []).length === 0 ? (
                    <Typography color="text.secondary" fontSize="0.95rem">
                      No employees assigned yet.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {selectedEmployees.map((emp) => {
                        const name =
                          emp.first_name && emp.last_name
                            ? `${emp.first_name} ${emp.last_name}`
                            : emp.first_name || emp.last_name || "Unnamed";
                        return (
                          <Paper
                            key={emp.employee_code}
                            variant="outlined"
                            sx={{
                              p: 1.2,
                              borderRadius: 3,
                              borderColor: "#e9edf5",
                              display: "flex",
                              alignItems: "center",
                              gap: 1.2,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: "#f3f4f6",
                                color: "#111827",
                                fontWeight: 900,
                              }}
                            >
                              {initialsFromName(name)}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography fontWeight={900} sx={{ lineHeight: 1.2 }}>
                                {name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                {emp.employee_code}
                              </Typography>
                            </Box>

                            <IconButton
                              size="small"
                              sx={{ border: "1px solid #f0d7d7", bgcolor: "#fff5f5" }}
                              onClick={() =>
                                setSelectedEmployees((prev) =>
                                  prev.filter((x) => x.employee_code !== emp.employee_code)
                                )
                              }
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* RIGHT: Ticket Updates */}
            <Grid item xs={12} md={8}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid #e9edf5",
                  height: isMobile ? "auto" : "calc(80vh - 160px)",
                  minHeight: 420,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={900}>
                    Ticket Updates
                  </Typography>
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
                  {(chats || []).length === 0 ? (
                    <>
                      <CreationAttachmentsBubble />
                      <Typography color="text.secondary">No updates yet.</Typography>
                    </>
                  ) : (
                    <Stack spacing={1.2}>
                      {/* show ticket creation attachments in the chat stream */}
                      <CreationAttachmentsBubble />
                      {chats.slice(-3).map((msg) => {
                        const isSelf = msg.sender_email === currentUserEmail;
                        const senderLabel = msg.sender_name || msg.sender_email;
                        const bubbleBg = isSelf ? "#E8F1FF" : "#ffffff";
                        const border = isSelf ? "1px solid #d7e1ff" : "1px solid #eef2f7";

                        return (
                          <Box
                            key={`preview-${msg.chat_id}`}
                            sx={{ display: "flex", justifyContent: isSelf ? "flex-end" : "flex-start" }}
                          >
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                borderRadius: 3,
                                bgcolor: bubbleBg,
                                border,
                                maxWidth: "78%",
                              }}
                            >
                              <Typography fontSize="0.85rem" sx={{ mb: 0.5 }}>
                                <Box
                                  component="span"
                                  sx={{
                                    fontWeight: 900,
                                    color: getColorForUser(msg.sender_email, currentUserEmail),
                                  }}
                                >
                                  {senderLabel}
                                </Box>
                              </Typography>

                              {msg.reply_to_text && (
                                <Box
                                  sx={{
                                    bgcolor: "#f4f4f4",
                                    borderLeft: `4px solid ${getColorForUser(
                                      msg.sender_email,
                                      currentUserEmail
                                    )}`,
                                    borderRadius: 2,
                                    px: 1.2,
                                    py: 0.8,
                                    mb: 1,
                                  }}
                                >
                                  <Typography fontWeight={900} fontSize="0.78rem" sx={{ color: "#374151" }}>
                                    Replying to
                                  </Typography>
                                  <Typography fontSize="0.8rem" sx={{ color: "#555", mt: 0.3 }}>
                                    {msg.reply_to_text}
                                  </Typography>
                                </Box>
                              )}

                              <Typography
                                fontSize="0.92rem"
                                sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                              >
                                {msg.message || (msg.files?.length ? "📎 Attachment" : "")}
                              </Typography>
                            </Paper>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Box>

                {/* ✅ REAL INPUT AREA (no dialog opening) */}
                <Box sx={{ mt: 0.5 }}>
                  <TextField
                    fullWidth
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    multiline
                    minRows={1}
                    maxRows={2}
                    onKeyDown={(e) => {
                      // Enter to send, Shift+Enter = newline
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "#fbfcff" },
                      "& .MuiInputBase-root": { paddingY: 0.5 },
                      "& .MuiInputBase-inputMultiline": { padding: "10px 10px !important" },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconButton component="label" size="small">
                            <AttachFileIcon fontSize="small" />
                            <input type="file" hidden onChange={handleFileSelect} />
                          </IconButton>
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleSend}
                            size="small"
                            sx={{
                              bgcolor: "#2A3663",
                              color: "#fff",
                              "&:hover": { bgcolor: "#1f2a52" },
                              borderRadius: 2,
                            }}
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  {files?.length > 0 && (
                    <Box sx={{ mt: 1.1 }}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {files.map((f, idx) => (
                          <Chip
                            key={`${f.name}-${idx}`}
                            label={f.name}
                            onDelete={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                            sx={{
                              borderRadius: 2,
                              bgcolor: "#eef2ff",
                              border: "1px solid #d7e1ff",
                              fontWeight: 800,
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* ===================== History / Chat Dialog ===================== */}
      <Dialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            bgcolor: "#ffffff",
            width: isMobile ? "100%" : "68vw",
            height: isMobile ? "100%" : "90vh",
            maxHeight: "95vh",
            margin: "auto",
            borderRadius: 4,
            marginTop: isMobile ? "0px" : "70px",
            overflow: "hidden",
            border: "1px solid #e9edf5",
          },
        }}
      >
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "#f6f8fc",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
              background: "#2A3663",
              color: "#fff",
              pr: 6,
            }}
          >
            <Stack spacing={0.3}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Ticket Updates
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600 }}>
                {ticket?.property_id || "Villa"} • {issueId}
              </Typography>
            </Stack>
          </Box>

          {/* Chat List */}
          <Box
            sx={{
              flex: 1,
              p: 2,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              background: "linear-gradient(180deg, #f6f8fc 0%, #eef3ff 100%)",
            }}
          >
            {/* show ticket creation attachments inside chat */}
            <CreationAttachmentsBubble />
            {chats.map((msg) => {
              const isSelf = msg.sender_email === currentUserEmail;
              const timestamp = new Date(msg.created_at).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              const senderLabel = msg.sender_name || msg.sender_email;
              const senderColor = getColorForUser(msg.sender_email, currentUserEmail);

              return (
                <Box
                  key={msg.chat_id}
                  sx={{
                    display: "flex",
                    justifyContent: isSelf ? "flex-end" : "flex-start",
                    alignItems: "flex-end",
                    gap: 1.2,
                  }}
                >
                  {!isSelf && (
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: "#ffffff",
                        border: "1px solid #e9edf5",
                        color: senderColor,
                        fontWeight: 900,
                      }}
                    >
                      {initialsFromName(senderLabel)}
                    </Avatar>
                  )}

                  <Box
                    sx={{
                      backgroundColor: isSelf ? "#dbeafe" : "#ffffff",
                      p: 2,
                      borderRadius: 4,
                      maxWidth: "75%",
                      boxShadow: "0 8px 22px rgba(16, 24, 40, 0.08)",
                      position: "relative",
                      border: "1px solid #e9edf5",
                    }}
                  >
                    <Typography fontSize="0.8rem" sx={{ mb: 1 }}>
                      <Box component="span" fontWeight={900} sx={{ color: senderColor }}>
                        {senderLabel}
                      </Box>
                      <Box component="span" sx={{ color: "#6b7280", ml: "12px", fontWeight: 700 }}>
                        {timestamp}
                      </Box>
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 8, right: 8 }}>
                      <Tooltip title="Reply">
                        <IconButton size="small" onClick={() => setReplyTo(msg)}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>

                    {msg.reply_to_text && (
                      <Box
                        sx={{
                          backgroundColor: "#f3f4f6",
                          borderLeft: `4px solid ${senderColor}`,
                          borderRadius: 2,
                          px: 1.5,
                          py: 1,
                          mb: 1,
                        }}
                      >
                        <Typography fontWeight={900} fontSize="0.8rem" sx={{ color: "#111827" }}>
                          Replying to
                        </Typography>
                        <Typography fontSize="0.85rem" sx={{ color: "#4b5563", mt: 0.5 }}>
                          {msg.reply_to_text}
                        </Typography>
                      </Box>
                    )}

                    {msg.files?.length > 0 &&
                      msg.files.map((file, index) => {
                        const fileUrl = toAbsoluteUrl(file.file_url || file.url || file.file);
                        const fileName = file.file_name || "Unnamed File";
                        const fileSizeKB = file.file_size ? `(${(file.file_size / 1024).toFixed(2)} KB)` : "";
                        const isImage = /\.(png|jpe?g|webp|gif)$/i.test(fileName);

                        return (
                          <Box
                            key={`${msg.chat_id}-file-${index}`}
                            sx={{
                              mt: 1,
                              borderRadius: 3,
                              overflow: "hidden",
                              border: "1px solid #e5e7eb",
                              bgcolor: "#f9fafb",
                            }}
                          >
                            {isImage ? (
                              <img
                                src={fileUrl}
                                alt={fileName}
                                style={{
                                  width: "100%",
                                  display: "block",
                                  objectFit: "cover",
                                  maxHeight: 320,
                                }}
                              />
                            ) : (
                              <Box sx={{ px: 1.5, py: 1 }}>
                                <Typography
                                  component="a"
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{
                                    fontSize: "0.85rem",
                                    color: "#1976d2",
                                    textDecoration: "underline",
                                    wordBreak: "break-word",
                                    fontWeight: 800,
                                  }}
                                >
                                  {fileName} {fileSizeKB}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        );
                      })}

                    {msg.message && (
                      <Typography
                        fontSize="0.95rem"
                        sx={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          mt: 1,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {msg.message}
                      </Typography>
                    )}
                  </Box>

                  {isSelf && (
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: "#2A3663",
                        color: "#fff",
                        fontWeight: 900,
                      }}
                    >
                      {initialsFromName(currentUserName || currentUserEmail)}
                    </Avatar>
                  )}
                </Box>
              );
            })}
            <div ref={chatEndRef} />
          </Box>

          {/* Reply Preview */}
          {replyTo && (
            <Box
              sx={{
                backgroundColor: "#ffffff",
                p: 1.2,
                borderTop: "1px solid #e9edf5",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ px: 1 }}>
                <Typography
                  fontWeight={900}
                  fontSize="0.88rem"
                  sx={{ color: getColorForUser(replyTo.sender_email, currentUserEmail) }}
                >
                  Replying to {replyTo.sender_name || replyTo.sender_email}
                </Typography>
                <Typography fontSize="0.82rem" color="text.secondary" noWrap sx={{ maxWidth: "70vw" }}>
                  {replyTo.message || "File sent"}
                </Typography>
              </Box>
              <IconButton onClick={() => setReplyTo(null)} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {/* Input Area (Dialog) */}
          <Box sx={{ p: 2, pt: 1.5, borderTop: "1px solid #e9edf5", bgcolor: "#ffffff" }}>
            <TextField
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              multiline
              minRows={1}
              maxRows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  bgcolor: "#fbfcff",
                },
                "& .MuiInputBase-root": { paddingY: 0.5 },
                "& .MuiInputBase-inputMultiline": { padding: "10px 10px !important" },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton component="label" size="small">
                      <AttachFileIcon fontSize="small" />
                      <input type="file" hidden onChange={handleFileSelect} />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleSend}
                      size="small"
                      sx={{
                        bgcolor: "#2A3663",
                        color: "#fff",
                        "&:hover": { bgcolor: "#1f2a52" },
                        borderRadius: 2,
                      }}
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {files?.length > 0 && (
              <Box sx={{ mt: 1.2 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {files.map((f, idx) => (
                    <Chip
                      key={`${f.name}-${idx}`}
                      label={f.name}
                      onDelete={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                      sx={{
                        borderRadius: 2,
                        bgcolor: "#eef2ff",
                        border: "1px solid #d7e1ff",
                        fontWeight: 800,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

export default TicketDetails;
