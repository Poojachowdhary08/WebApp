// PropertyLiveChatUpdatesEmbedded.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Grid,
  Paper,
  CircularProgress,
  useMediaQuery,
  Popover,
  Tooltip,
  Collapse,
  Fade,
  Avatar,
  Divider,
  Menu,
  MenuItem,
} from "@mui/material";

import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";
import CloseIcon from "@mui/icons-material/Close";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import MoreVertIcon from "@mui/icons-material/MoreVert";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import axios from "axios";

const DEFAULT_REACTIONS = ["👍", "👎", "✅", "❌", "😮", "🙏"];
const imageTypes = ["image/jpeg", "image/png", "image/jpg", "image/heic"];

const fileIcons = {
  pdf: "📄",
  csv: "🧾",
  xlsx: "📈",
  xls: "📈",
  docx: "📄",
  doc: "📄",
  mp4: "🎥",
  mp3: "🎵",
  zip: "🗌️",
  default: "📁",
};
const getFileIcon = (name) =>
  fileIcons[name.split(".").pop().toLowerCase()] || fileIcons.default;

const PropertyLiveChatUpdates = ({
  property,
  ticket,
  onClose, // optional
  height = "72vh",
}) => {
  const BASE_URL = "http://localhost:8080";

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [reactionAnchor, setReactionAnchor] = useState(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [expandedMsgId, setExpandedMsgId] = useState(null);
  const [selectedMsgId, setSelectedMsgId] = useState(null);

  // ✅ screenshot-style filter pills
  const [filterTab, setFilterTab] = useState("all");

  const scrollRef = useRef(null);
  const socketRef = useRef(null);
  const seenIds = useRef(new Set());
  const lastFetchedBeforeId = useRef(null);

  const isMobile = useMediaQuery("(max-width:900px)");

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const [anchorEl, setAnchorEl] = useState(null);
  const [menuMsgId, setMenuMsgId] = useState(null);
  const isMenuOpen = Boolean(anchorEl);

  const [allEmployees, setAllEmployees] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionAnchorEl, setMentionAnchorEl] = useState(null);

  const [allFetchedMessages, setAllFetchedMessages] = useState([]);
  const [visibleMessages, setVisibleMessages] = useState([]);

  // ✅ screenshot-style always visible search input
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [replyToMessage, setReplyToMessage] = useState(null);

  // ✅ Toggle: send to customer / team
  const [sendToCustomer, setSendToCustomer] = useState(false);

  const employeeCode = localStorage.getItem("employee_code");
  const engineerName = `${localStorage.getItem("first_name") || ""} ${
    localStorage.getItem("last_name") || ""
  }`.trim();

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

  const getColorForUser = (key) => {
    if (typeof key !== "string" || key.length === 0) return "#999";
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) + hash + key.charCodeAt(i);
    }
    return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
  };

  const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const fmtTime = (raw) => {
    try {
      if (!raw) return "—";
      const match = raw.match(
        /^(\d{2})-(\d{2})-(\d{4}), (\d{2}):(\d{2}):(\d{2}) (AM|PM)$/i
      );
      if (!match) return raw;

      let [, dd, mm, yyyy, hh, min, sec, meridian] = match;
      hh = parseInt(hh, 10);
      if (meridian.toUpperCase() === "PM" && hh < 12) hh += 12;
      if (meridian.toUpperCase() === "AM" && hh === 12) hh = 0;

      const isoString = `${yyyy}-${mm}-${dd}T${String(hh).padStart(2, "0")}:${min}:${sec}`;
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return raw;

      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return raw || "—";
    }
  };

  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  /** ---------------- Fetch employees (mentions) ---------------- */
  useEffect(() => {
    axios
      .get(`${BASE_URL}/employees`)
      .then((res) => {
        const formatted = (res.data || []).map((emp) => ({
          code: emp.employee_code,
          name: `${emp.first_name} ${emp.last_name}`.trim(),
          job_title: emp.job_title || "Employee",
          photo_url: emp.photo_url || null,
        }));
        setAllEmployees(formatted);
      })
      .catch((err) => console.error("❌ Failed to fetch employees", err));
  }, []);

  /** ---------------- Lifecycle: property change ---------------- */
  useEffect(() => {
    if (!property?.propertyid) return;

    seenIds.current = new Set();
    lastFetchedBeforeId.current = null;

    setMessages([]);
    setAllFetchedMessages([]);
    setVisibleMessages([]);
    setHasMore(true);
    setLoading(false);
    setSearchInput("");
    setIsSearching(false);

    fetchMessages({ initialLoad: true });
    setupSocket();

    setTimeout(() => scrollToBottom(false), 100);

    return () => {
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.propertyid]);

  /** ---------------- Menu handlers ---------------- */
  const handleMenuClick = (event, msgId) => {
    setAnchorEl(event.currentTarget);
    setMenuMsgId(msgId);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuMsgId(null);
  };

  /** ---------------- WebSocket ---------------- */
  const setupSocket = () => {
    if (!property?.propertyid) return;

    const socketUrl = `wss://prod.datso.io/ws/chat/${property.propertyid}?employee_code=${employeeCode}&engineer_name=${encodeURIComponent(
      engineerName
    )}`;
    socketRef.current = new WebSocket(socketUrl);

    socketRef.current.onopen = () => {
      socketRef.current.send(
        JSON.stringify({
          type: "join",
          employee_code: employeeCode,
          engineer_name: engineerName,
          property_id: property.propertyid,
        })
      );
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "online_users") {
        setOnlineUsers(data.users || []);
        return;
      }

      if (data.type === "typing") {
        if (data.employee_code !== employeeCode) {
          setTypingUsers((prev) => {
            if (!prev.includes(data.engineer_name)) return [...prev, data.engineer_name];
            return prev;
          });
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((n) => n !== data.engineer_name));
          }, 2500);
        }
        return;
      }

      if (data.type === "reaction_update") {
        seenIds.current.add(data.message_id);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === data.message_id ? { ...msg, reactions: data.reactions || {} } : msg
          )
        );
        setVisibleMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === data.message_id ? { ...msg, reactions: data.reactions || {} } : msg
          )
        );
        return;
      }

      if (data.type === "star_update") {
        seenIds.current.add(data.message_id);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === data.message_id
              ? { ...msg, is_starred: data.is_starred, starred_by: data.starred_by || [] }
              : msg
          )
        );
        setVisibleMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === data.message_id
              ? { ...msg, is_starred: data.is_starred, starred_by: data.starred_by || [] }
              : msg
          )
        );
        return;
      }

      if (data.type === "new_message") {
        if (!seenIds.current.has(data.message_id)) {
          seenIds.current.add(data.message_id);

          setMessages((prev) => {
            const all = [...prev, data];
            return Array.from(new Map(all.map((m) => [m.message_id, m])).values());
          });

          // if searching, don't auto-inject into visible list (keeps search stable)
          if (!isSearching) {
            setVisibleMessages((prev) => {
              const all = [...prev, data];
              return Array.from(new Map(all.map((m) => [m.message_id, m])).values());
            });
          }

          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 80);
        }
      }
    };
  };

  /** ---------------- Input + mentions + typing ---------------- */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputText(value);

    const match = value.match(/@(\w*)$/);
    if (match) {
      const search = match[1].toLowerCase();
      const filtered = allEmployees.filter((emp) =>
        (emp?.name || "").toLowerCase().includes(search)
      );
      setMentionSuggestions(filtered);
      setMentionAnchorEl(e.currentTarget);
    } else {
      setMentionSuggestions([]);
      setMentionAnchorEl(null);
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "typing",
          employee_code: employeeCode,
          engineer_name: engineerName,
          property_id: property.propertyid,
        })
      );
    }
  };

  const insertMention = (name) => {
    const before = inputText.replace(/@(\w*)$/, `@${name} `);
    setInputText(before);
    setMentionSuggestions([]);
    setMentionAnchorEl(null);
  };

  /** ---------------- Reactions ---------------- */
  const postReaction = async (emoji, messageId) => {
    const emojiStr = typeof emoji === "string" ? emoji : emoji.native;
    try {
      const formData = new FormData();
      formData.append("emoji", emojiStr);
      formData.append("employee_code", employeeCode);

      await axios.post(`${BASE_URL}/property-chat/${messageId}/react`, formData);

      setExpandedMsgId(null);
      setReactionAnchor(null);
    } catch (err) {
      toast.error("❌ Failed to react");
      console.error("⚠️ Reaction post failed:", err);
    }
  };

  /** ---------------- Fetch messages (pagination) ---------------- */
  const fetchMessages = async ({ beforeId = null, initialLoad = false } = {}) => {
    if (!property?.propertyid || loading || (!hasMore && beforeId)) return;
    if (beforeId && beforeId === lastFetchedBeforeId.current) return;

    setLoading(true);
    let prevHeight = 0;
    if (!initialLoad) prevHeight = scrollRef.current?.scrollHeight || 0;

    try {
      const res = await axios.get(`${BASE_URL}/property-chat/${property.propertyid}`, {
        params: { limit: 50, before_message_id: beforeId },
      });

      const newMessages = (res.data || []).filter((m) => !seenIds.current.has(m.message_id));
      if (newMessages.length === 0) {
        setHasMore(false);
        return;
      }

      newMessages.forEach((m) => seenIds.current.add(m.message_id));
      const sorted = newMessages.slice().reverse();

      setAllFetchedMessages((prev) => [...sorted, ...prev]);

      if (initialLoad) {
        setMessages(sorted);
        setVisibleMessages(sorted);
        setAllFetchedMessages(sorted);
        setTimeout(() => scrollToBottom(false), 80);
      } else {
        setMessages((prev) => {
          const all = [...sorted, ...prev];
          return Array.from(new Map(all.map((m) => [m.message_id, m])).values());
        });

        // only extend visible when not searching
        if (!isSearching) {
          setVisibleMessages((prev) => {
            const all = [...sorted, ...prev];
            return Array.from(new Map(all.map((m) => [m.message_id, m])).values());
          });
        }

        setTimeout(() => {
          const newHeight = scrollRef.current?.scrollHeight || 0;
          if (scrollRef.current) scrollRef.current.scrollTop = newHeight - prevHeight;
        }, 80);
      }

      if (newMessages.length < 20) setHasMore(false);
      if (beforeId) lastFetchedBeforeId.current = beforeId;
    } catch (err) {
      console.error("❌ Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  /** ---------------- Infinite scroll ---------------- */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loading || !hasMore || !messages.length) return;

    if (el.scrollTop <= 1) {
      const firstMsg = messages[0];
      if (firstMsg?.message_id && firstMsg.message_id !== lastFetchedBeforeId.current) {
        fetchMessages({ beforeId: firstMsg.message_id });
      }
    }
  }, [loading, hasMore, messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  /** ---------------- Flag (star) ---------------- */
  const toggleStar = async (msg) => {
    const formData = new FormData();
    formData.append("employee_code", employeeCode);

    try {
      await axios.post(`${BASE_URL}/property-chat/${msg.message_id}/star`, formData);
      toast.success(msg.is_starred ? "🚩 Message unflagged" : "🚩 Message flagged");
    } catch (err) {
      toast.error("❌ Failed to toggle flag");
      console.error("⚠️ Star toggle failed:", err);
    }
  };

  /** ---------------- Search (header input) ---------------- */
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = (searchInput || "").trim();
      if (!q) {
        setIsSearching(false);
        setVisibleMessages(allFetchedMessages);
        return;
      }

      try {
        const res = await axios.get(`${BASE_URL}/property-chat/search`, {
          params: { property_id: property.propertyid, query: q },
        });
        setIsSearching(true);
        setVisibleMessages(res.data || []);
      } catch (err) {
        console.error("Search error:", err);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [searchInput, property?.propertyid, allFetchedMessages]);

  /** ---------------- Reply scroll helper ---------------- */
  const scrollToMessageById = async (targetId) => {
    const el = document.getElementById(`message-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const oldest = messages[0];
    if (!oldest?.message_id) return;

    const prevCount = messages.length;
    await fetchMessages({ beforeId: oldest.message_id });

    const newEl = document.getElementById(`message-${targetId}`);
    if (newEl) {
      newEl.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (messages.length > prevCount) setTimeout(() => scrollToMessageById(targetId), 250);
  };

  /** ---------------- Send message ---------------- */
  const handleSend = async () => {
    if (!inputText.trim() && selectedFiles.length === 0) return;
    if (sending) return;

    setSending(true);

    const formData = new FormData();
    formData.append("property_id", property.propertyid);
    formData.append("engineer_name", engineerName);
    formData.append("employee_code", employeeCode);
    formData.append("message_text", inputText.trim());
    formData.append("visible_to_clients", sendToCustomer ? "true" : "false");

    selectedFiles.forEach((file) => formData.append("files", file));

    if (replyToMessage) {
      formData.append("reply_to_message_id", replyToMessage.message_id.toString());
      formData.append("reply_to_text", replyToMessage.message_text);
    }

    try {
      const res = await axios.post(`${BASE_URL}/property-chat/send`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newMessage = res.data;

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "new_message", ...newMessage }));
      }

      setInputText("");
      setSelectedFiles([]);
      setReplyToMessage(null);

      // keep UX like screenshot: jump to bottom
      setTimeout(() => scrollToBottom(true), 80);
    } catch (err) {
      toast.error("❌ Failed to send");
      console.error("❌ Send error:", err);
    } finally {
      setSending(false);
    }
  };

  const filteredVisible = useMemo(() => {
    const list = Array.isArray(visibleMessages) ? visibleMessages : [];
    if (filterTab === "flagged") return list.filter((m) => m.is_starred);
    return list;
  }, [visibleMessages, filterTab]);

  if (!property?.propertyid) {
    return (
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e5e7eb", p: 2 }}>
        <Typography fontWeight={800}>No property selected.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ height, display: "flex", flexDirection: "column", p: 0, borderRadius: 3 }}>
      <ToastContainer position="bottom-right" autoClose={3000} />

      {/* Optional ticket summary */}
      {ticket && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            p: 2,
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <Typography variant="caption" color="text.secondary">
                Ticket ID
              </Typography>
              <Typography fontWeight={700}>{ticket.ticket_id || "—"}</Typography>
            </Grid>

            <Grid item xs={12} md={2}>
              <Typography variant="caption" color="text.secondary">
                Property ID
              </Typography>
              <Typography fontWeight={700}>{ticket.property_id || property?.propertyid || "—"}</Typography>
            </Grid>

            <Grid item xs={12} md={2}>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Typography fontWeight={700}>{ticket.status || "—"}</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">
                Description
              </Typography>
              <Typography fontWeight={700} noWrap title={ticket.description || ""}>
                {ticket.description || "—"}
              </Typography>
            </Grid>
          </Grid>

          {onClose && (
            <IconButton onClick={onClose} sx={{ ml: 2 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Paper>
      )}

      {/* Main chat card */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          borderRadius: 3,
          border: "1px solid #e5e7eb",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* ✅ Screenshot style header */}
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid #eef0f4" }}>
          <Box sx={{ minWidth: 160 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>
              Ticket Updates
            </Typography>
            <Typography variant="caption" sx={{ color: "#6b7280" }}>
              {onlineUsers.length} online{onlineUsers.length ? ` • ${onlineUsers.join(", ")}` : ""}
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <TextField
              size="small"
              placeholder="Search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              fullWidth
              InputProps={{ sx: { borderRadius: 999, backgroundColor: "#f7f8fa" } }}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Box
              onClick={() => setFilterTab("all")}
              sx={{
                px: 2.2,
                py: 0.7,
                borderRadius: 999,
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid #e5e7eb",
                bgcolor: filterTab === "all" ? "#111827" : "#fff",
                color: filterTab === "all" ? "#fff" : "#111827",
                userSelect: "none",
              }}
            >
              All
            </Box>
            <Box
              onClick={() => setFilterTab("flagged")}
              sx={{
                px: 2.2,
                py: 0.7,
                borderRadius: 999,
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid #e5e7eb",
                bgcolor: filterTab === "flagged" ? "#111827" : "#fff",
                color: filterTab === "flagged" ? "#fff" : "#111827",
                userSelect: "none",
              }}
            >
              Flagged
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Mention suggestions */}
        {mentionSuggestions.length > 0 && (
          <Box
            sx={{
              position: "absolute",
              bottom: isMobile ? 98 : 90,
              right: isMobile ? 20 : 60,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 2,
              zIndex: 9999,
              width: 320,
              maxHeight: 240,
              boxShadow: "0 12px 28px rgba(0,0,0,0.10)",
              overflowY: "auto",
            }}
          >
            {mentionSuggestions.map((emp, i) => (
              <Box
                key={`${emp.code}-${i}`}
                onClick={() => insertMention(emp.name)}
                sx={{
                  p: 1.2,
                  cursor: "pointer",
                  borderBottom: i !== mentionSuggestions.length - 1 ? "1px solid #f1f3f6" : "none",
                  "&:hover": { bgcolor: "#f7f8fa" },
                }}
              >
                <Typography fontSize={14} fontWeight={800}>
                  @{emp.name}
                </Typography>
                <Typography fontSize={11} color="text.secondary">
                  {emp.code} • <i>{emp.job_title}</i>
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Messages */}
        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            p: 2,
            background: "#fbfcfe",
          }}
        >
          {loading && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress />
            </Box>
          )}

          {filteredVisible.map((msg) => {
const isSelf =
String(msg.employee_code ?? msg.sender_employee_code ?? msg.created_by) ===
String(employeeCode);
const msgReactions = msg.reactions || {};

            return (
              <Box
                key={msg.message_id}
                id={`message-${msg.message_id}`}
                sx={{ display: "flex", justifyContent: isSelf ? "flex-end" : "flex-start", mb: 2 }}
              >

                <Box sx={{ maxWidth: "75%" }}>
                  {/* name + time line like screenshot */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: isSelf ? "flex-end" : "flex-start",
                      mb: 0.6,
                      gap: 1,
                      alignItems: "center",
                    }}
                  >
                    {!isSelf && (
                      <Typography
                        fontSize={13}
                        fontWeight={900}
                        sx={{ color: getColorForUser(msg.employee_code || msg.engineer_name || "default") }}
                      >
                        {msg.engineer_name || msg.employee_name || "Unknown"}
                      </Typography>
                    )}

                    <Typography fontSize={12} sx={{ color: "#9ca3af", fontWeight: 700 }}>
                      {fmtTime(msg.created_at)}
                    </Typography>

                    {isSelf && (
                      <Typography fontSize={13} fontWeight={900} sx={{ color: "#6b7280" }}>
                        You
                      </Typography>
                    )}
                  </Box>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.4,
                      borderRadius: 3,
                      border: "1px solid #edf0f5",
                      backgroundColor: isSelf ? "#e8f0ff" : "#ffffff",
                      position: "relative",
                    }}
                  >
                    <Box sx={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 0.4 }}>
                      <IconButton size="small" onClick={(e) => handleMenuClick(e, msg.message_id)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setExpandedMsgId(expandedMsgId === msg.message_id ? null : msg.message_id)
                        }
                      >
                        <InsertEmoticonIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {msg.reply_to_text && (
                      <Box
                        mt={0.5}
                        mb={1}
                        px={1.4}
                        py={1}
                        bgcolor="#f5f7fb"
                        borderLeft="4px solid #2A3663"
                        borderRadius={2}
                        sx={{ cursor: "pointer" }}
                        onClick={() => scrollToMessageById(msg.reply_to_message_id)}
                      >
                        <Typography fontWeight={900} fontSize={12} color="#2A3663">
                          Reply to {msg.reply_to_engineer_name || "Unknown"}
                        </Typography>
                        <Typography fontSize={13} color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                          {msg.reply_to_text}
                        </Typography>
                      </Box>
                    )}

                    <Typography
                      sx={{
                        fontSize: 14,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "#111827",
                        pr: 7, // make space for menu icons
                      }}
                      dangerouslySetInnerHTML={{
                        __html: (msg.message_text || "").replace(
                          /@(\w+(?: \w+)?)/g,
                          '<span style="color:#2A3663; font-weight:800">@$1</span>'
                        ),
                      }}
                    />

                    {/* reactions quick bar (like screenshot under bubble) */}
                    <Collapse in={expandedMsgId === msg.message_id}>
                      <Fade in={expandedMsgId === msg.message_id}>
                        <Box mt={1} display="flex" gap={1}>
                          {DEFAULT_REACTIONS.map((emoji) => (
                            <Typography
                              key={emoji}
                              onClick={() => postReaction(emoji, msg.message_id)}
                              sx={{ fontSize: 18, cursor: "pointer" }}
                            >
                              {emoji}
                            </Typography>
                          ))}
                          <Typography
                            sx={{ fontSize: 20, cursor: "pointer" }}
                            onClick={(e) => {
                              setSelectedMsgId(msg.message_id);
                              setReactionAnchor(e.currentTarget);
                            }}
                          >
                            ➕
                          </Typography>
                        </Box>
                      </Fade>
                    </Collapse>

                    {msg.files?.length > 0 && (
                      <Grid container spacing={1} mt={1}>
                        {msg.files.map((file) => (
                          <Grid item xs={12} key={file.file_id}>
                            <Box
                              onClick={() => window.open(file.file_url, "_blank")}
                              sx={{
                                background: "#f5f7fb",
                                p: 1,
                                borderRadius: 2,
                                cursor: "pointer",
                                border: "1px solid #eef0f4",
                              }}
                            >
                              {file.file_type?.includes("image") ? (
                                <img
                                  src={file.file_url}
                                  alt={file.file_name}
                                  style={{ maxWidth: 260, borderRadius: 10 }}
                                />
                              ) : (
                                <Typography fontSize={28}>{getFileIcon(file.file_name)}</Typography>
                              )}
                              <Typography fontSize={13} fontWeight={800}>
                                {file.file_name}{" "}
                                <span style={{ fontWeight: 600, color: "#6b7280" }}>
                                  ({file.file_size_kb} KB)
                                </span>
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    )}

                    <Box mt={1} display="flex" flexWrap="wrap" gap={0.6}>
                      {Object.entries(msgReactions).map(([emoji, users]) => {
                        const isReactedByYou = (users || []).some((u) => u.code === employeeCode);
                        const formattedNames = (users || []).map((u) =>
                          u.code === employeeCode ? "You" : u.name || u.code
                        );

                        return (
                          <Tooltip key={emoji} title={formattedNames.join(", ")}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                px: 1,
                                py: 0.35,
                                border: "1px solid #e5e7eb",
                                borderRadius: "999px",
                                bgcolor: isReactedByYou ? "#d2f8d2" : "#f1f3f6",
                                fontSize: 13,
                                fontWeight: isReactedByYou ? 900 : 700,
                              }}
                            >
                              <span style={{ marginRight: 6 }}>{emoji}</span>
                              <span>{(users || []).length}</span>
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Box>

                    {msg.is_starred && (
                      <Box mt={0.7} display="flex" justifyContent="flex-end">
                        <Typography fontSize={16} sx={{ color: "#d32f2f" }}>
                          🚩
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Typing */}
        {typingUsers.length > 0 && (
          <Box px={2} py={1} fontSize={13} color="#6b7280" sx={{ fontStyle: "italic" }}>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </Box>
        )}

        {/* Reply bar */}
        {replyToMessage && (
          <Box
            sx={{
              p: 1.2,
              mx: 2,
              mb: 1,
              backgroundColor: "#f5f7fb",
              borderLeft: "4px solid #2A3663",
              borderRadius: 2,
              border: "1px solid #eef0f4",
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography fontWeight={900} fontSize={13}>
                Replying to {replyToMessage.engineer_name}
              </Typography>
              <IconButton size="small" onClick={() => setReplyToMessage(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography fontSize={12} color="text.secondary">
              {replyToMessage.message_text}
            </Typography>
          </Box>
        )}

        {/* Selected file previews */}
        {selectedFiles.length > 0 && (
          <Box px={2} pb={1} display="flex" gap={1} flexWrap="wrap">
            {selectedFiles.map((file, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 1,
                  borderRadius: 2,
                  border: "1px solid #eef0f4",
                  background: "#fff",
                }}
              >
                {imageTypes.includes(file.type) ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", marginRight: 10 }}
                  />
                ) : (
                  <Typography sx={{ fontSize: 22, mr: 1.2 }}>{getFileIcon(file.name)}</Typography>
                )}
                <Typography sx={{ fontSize: 13, mr: 1.2, fontWeight: 800 }}>{file.name}</Typography>
                <IconButton size="small" onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
          </Box>
        )}

        {/* Input row (screenshot style) */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            gap: 1.2,
            p: 2,
            background: "#ffffff",
            borderTop: "1px solid #eef0f4",
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <TextField
              placeholder="Type a message..."
              fullWidth
              multiline
              maxRows={6}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              variant="outlined"
              size="small"
              InputProps={{ sx: { borderRadius: "16px", backgroundColor: "#f7f8fa" } }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              onClick={() => setSendToCustomer((prev) => !prev)}
              sx={{
                px: 2,
                py: 0.7,
                borderRadius: 999,
                bgcolor: sendToCustomer ? "#e3f2fd" : "#f1f3f6",
                color: sendToCustomer ? "#1976d2" : "#374151",
                fontWeight: 900,
                fontSize: 13,
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                whiteSpace: "nowrap",
                "&:hover": { bgcolor: sendToCustomer ? "#bbdefb" : "#e9ecf2" },
              }}
            >
              {sendToCustomer ? "To Customer" : "To Team"}
            </Box>

            <IconButton onClick={(e) => setEmojiAnchorEl(e.currentTarget)}>
              <InsertEmoticonIcon />
            </IconButton>

            <label htmlFor="chat-files">
              <IconButton component="span">
                <AttachFileIcon />
              </IconButton>
            </label>
            <input
              type="file"
              id="chat-files"
              hidden
              multiple
              onChange={(e) => setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
            />

            <IconButton
              onClick={handleSend}
              disabled={sending || (!inputText.trim() && selectedFiles.length === 0)}
              sx={{
                bgcolor: "#2563eb",
                color: "#fff",
                "&:hover": { bgcolor: "#1d4ed8" },
                opacity: sending ? 0.5 : 1,
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Menu */}
        <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose}>
          <MenuItem
            onClick={() => {
              const msg = messages.find((m) => m.message_id === menuMsgId);
              if (msg) toggleStar(msg);
              handleMenuClose();
            }}
          >
            {messages.find((m) => m.message_id === menuMsgId)?.is_starred ? "Unflag" : "🚩 Flag"}
          </MenuItem>

          <MenuItem
            onClick={() => {
              const msg = messages.find((m) => m.message_id === menuMsgId);
              if (msg) setReplyToMessage(msg);
              handleMenuClose();
            }}
          >
            ↩️ Reply
          </MenuItem>
        </Menu>

        {/* Emoji picker (typing) */}
        <Popover
          open={Boolean(emojiAnchorEl)}
          anchorEl={emojiAnchorEl}
          onClose={() => setEmojiAnchorEl(null)}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
        >
          <Picker data={data} onEmojiSelect={(emoji) => setInputText((prev) => prev + emoji.native)} theme="light" />
        </Popover>

        {/* Emoji picker (reaction) */}
        <Popover
          open={Boolean(reactionAnchor)}
          anchorEl={reactionAnchor}
          onClose={() => setReactionAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Picker data={data} onEmojiSelect={(emoji) => postReaction(emoji, selectedMsgId)} theme="light" />
        </Popover>
      </Paper>
    </Box>
  );
};

export default PropertyLiveChatUpdates;
