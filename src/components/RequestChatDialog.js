// RequestChatDialog.js
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  Paper,
  IconButton,
  MenuItem,
  Select,
  InputAdornment,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import SearchIcon from "@mui/icons-material/Search";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import PersonIcon from "@mui/icons-material/Person";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import InventoryIcon from "@mui/icons-material/Inventory";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

const statusColors = {
  requested: "#FFFF8F",
  issued: "#C8E6C9",
  rejected: "#FFCDD2",
  raised: "#CFD8DC",
  closed: "#E5E7EB",
  partially_issued: "#D1FAE5",
};

const formatDateTime = (ts) => {
  if (!ts) return "—";
  const date = new Date(ts);
  return isNaN(date.getTime())
    ? String(ts)
    : date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
};

const safeLower = (v) => String(v || "").toLowerCase();

const RequestChatDialog = ({ open, onClose, selectedRequest, allRequests }) => {
  const [employeeCode, setEmployeeCode] = useState("");
  const [employeeNameMap, setEmployeeNameMap] = useState({});
  const [newRemark, setNewRemark] = useState("");
  const [chatRemarks, setChatRemarks] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRequest, setActiveRequest] = useState(selectedRequest);

  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tileRefs = useRef({});
  const chatBottomRef = useRef(null);

  const filteredRequests = useMemo(() => {
    const q = safeLower(searchQuery).trim();
    return (allRequests || []).filter((r) => {
      const statusOk = filterStatus === "all" || String(r.status) === String(filterStatus);
      if (!statusOk) return false;

      if (!q) return true;

      const rid = safeLower(r.request_id);
      const engName = safeLower(employeeNameMap[r.engineer_id || ""]);
      const engId = safeLower(r.engineer_id);

      return rid.includes(q) || engName.includes(q) || engId.includes(q);
    });
  }, [allRequests, employeeNameMap, filterStatus, searchQuery]);

  // Scroll selected tile into view
  useLayoutEffect(() => {
    const timeout = setTimeout(() => {
      const rid = activeRequest?.request_id;
      if (rid && tileRefs.current[rid]) {
        tileRefs.current[rid].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
    return () => clearTimeout(timeout);
  }, [filteredRequests, activeRequest]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 30);
    return () => clearTimeout(t);
  }, [open, chatRemarks, activeRequest?.request_id]);

  // When selectedRequest changes
  useEffect(() => {
    if (!selectedRequest) return;
    setActiveRequest(selectedRequest);

    const selected = (allRequests || []).find((r) => r.request_id === selectedRequest.request_id);
    setChatRemarks(selected?.remarks_history || []);
  }, [selectedRequest, allRequests]);

  // Load employee map + my code
  useEffect(() => {
    const email = localStorage.getItem("email");
    const fetchEmp = async () => {
      try {
        const res = await axios.get("http://localhost:8080/employees");
        const emp = (res.data || []).find((e) => e.email === email);

        const map = {};
        (res.data || []).forEach((e) => {
          map[e.employee_code] = `${e.first_name} ${e.last_name || ""}`.trim();
        });

        setEmployeeCode(emp?.employee_code || "");
        setEmployeeNameMap(map);
      } catch (e) {
        console.error("Emp fetch failed", e);
      }
    };
    fetchEmp();
  }, []);

  const refreshRemarks = useCallback(async (req) => {
    if (!req?.request_id) return;

    setRefreshing(true);
    try {
      // Best endpoint (if available)
      const remarksRes = await axios.get(`http://localhost:8080/inventory-requests/${req.request_id}/remarks`);
      setChatRemarks(Array.isArray(remarksRes.data) ? remarksRes.data : []);
    } catch (e) {
      // fallback: your older endpoint
      try {
        const itemName = encodeURIComponent(req.item_name);
        const res = await axios.get(`http://localhost:8080/request-item/${itemName}`);
        const updated = (res.data?.requests || []).find((r) => r.request_id === req.request_id);
        setChatRemarks(updated?.remarks_history || []);
      } catch (err) {
        console.error("Refresh remarks failed", err?.response?.data || err);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  const myName = useMemo(() => {
    return employeeNameMap[employeeCode] || "You";
  }, [employeeCode, employeeNameMap]);

  const handlePostRemark = useCallback(async () => {
    const text = String(newRemark || "").trim();
    if (!text) return;
    if (!employeeCode) {
      console.error("No employeeCode in local state. User not mapped.");
      return;
    }
    if (!activeRequest?.request_id) return;
    if (sending) return;

    setSending(true);

    // ✅ optimistic append
    const optimistic = {
      employee_code: employeeCode,
      employee_name: myName,
      remark: text,
      formatted_time: formatDateTime(new Date().toISOString()),
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setChatRemarks((prev) => [...(prev || []), optimistic]);
    setNewRemark("");

    try {
      const fd = new FormData();
      fd.append("employee_code", employeeCode);
      fd.append("remark", text);

      // ✅ IMPORTANT: send as multipart
      await axios.post(
        `http://localhost:8080/inventory-requests/${activeRequest.request_id}/add-remark`,
        fd,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
        }
      );

      // ✅ refresh from server (authoritative)
      await refreshRemarks(activeRequest);
    } catch (err) {
      console.error("Posting failed", err?.response?.status, err?.response?.data || err);

      // rollback optimistic message (only remove the last optimistic that matches)
      setChatRemarks((prev) => {
        const arr = [...(prev || [])];
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i]?._optimistic && arr[i]?.remark === text && arr[i]?.employee_code === employeeCode) {
            arr.splice(i, 1);
            break;
          }
        }
        return arr;
      });

      // restore input so user doesn't lose it
      setNewRemark(text);
    } finally {
      setSending(false);
    }
  }, [activeRequest, employeeCode, myName, newRemark, refreshRemarks, sending]);

  const canSend = useMemo(() => {
    return !!activeRequest?.request_id && !!employeeCode && !!String(newRemark || "").trim() && !sending;
  }, [activeRequest?.request_id, employeeCode, newRemark, sending]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Request Remarks Chat
        <IconButton onClick={onClose} sx={{ float: "right" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" height="80vh" gap={2}>
          {/* Left Panel */}
          <Box
            width="30%"
            overflow="auto"
            display="flex"
            flexDirection="column"
            bgcolor="#f9f9f9"
            p={2}
            borderRadius={2}
          >
            <Select fullWidth size="small" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              {["all", "requested", "issued", "raised", "rejected", "closed", "partially_issued"].map((s) => (
                <MenuItem key={s} value={s}>
                  {s.toUpperCase()}
                </MenuItem>
              ))}
            </Select>

            <TextField
              placeholder="Search requests"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ my: 1 }}
            />

            <Box display="flex" flexDirection="column" gap={1}>
              {filteredRequests.map((r) => (
                <Paper
                  ref={(el) => (tileRefs.current[r.request_id] = el)}
                  key={r.request_id}
                  onClick={() => {
                    const selected = (allRequests || []).find((x) => x.request_id === r.request_id);
                    setActiveRequest(selected);
                    setChatRemarks(selected?.remarks_history || []);
                    refreshRemarks(selected);
                  }}
                  sx={{
                    p: 1.5,
                    cursor: "pointer",
                    backgroundColor: statusColors[r.status] || "#eee",
                    color: "#000",
                    borderRadius: 2,
                    border:
                      r.request_id === activeRequest?.request_id
                        ? "2px solid #1976D2"
                        : "1px solid rgba(0,0,0,0.12)",
                    transition: "all 120ms ease",
                    "&:hover": { filter: "brightness(0.98)" },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold" noWrap>
                    {r.request_id}
                  </Typography>
                  <Typography variant="body2" noWrap>
                    {employeeNameMap[r.engineer_id] || r.engineer_id}
                  </Typography>
                  <Typography variant="body2" noWrap>
                    {formatDateTime(r.deli_date)}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {String(r.status || "").toUpperCase()}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>

          {/* Right Panel */}
          <Box width="70%" display="flex" flexDirection="column">
            <Paper sx={{ p: 2, mb: 2, backgroundColor: "#F4F6F9", borderRadius: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 0 }}>
                  <InventoryIcon sx={{ mr: 1 }} />
                  {activeRequest?.item_name || "—"}
                </Typography>

                {refreshing && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={16} />
                    <Typography fontSize={12} color="text.secondary">
                      Refreshing…
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box display="flex" flexWrap="wrap" gap={2} mt={1}>
                <Typography>
                  <PersonIcon fontSize="small" /> <strong>Engineer:</strong>{" "}
                  {employeeNameMap[activeRequest?.engineer_id] || activeRequest?.engineer_id || "—"}
                </Typography>

                <Typography>
                  <DoneAllIcon fontSize="small" /> <strong>Status:</strong>{" "}
                  {String(activeRequest?.status || "—").toUpperCase()}
                </Typography>

                <Typography>
                  <CalendarMonthIcon fontSize="small" /> <strong>Date:</strong> {formatDateTime(activeRequest?.deli_date)}
                </Typography>

                <Typography>
                  <WarehouseIcon fontSize="small" /> <strong>Warehouse:</strong> {activeRequest?.warehouse || "—"}
                </Typography>

                <Typography>
                  <InventoryIcon fontSize="small" /> <strong>Qty:</strong>{" "}
                  {String(activeRequest?.requested_quantity ?? activeRequest?.quantity ?? "—")}
                </Typography>
              </Box>
            </Paper>

            <Paper
              sx={{
                flex: 1,
                p: 2,
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                backgroundColor: "#FAFAFA",
                borderRadius: 2,
              }}
            >
              {(chatRemarks || []).map((msg, idx) => {
                const isMe = String(msg.employee_code || "") === String(employeeCode || "");
                const name =
                  msg.employee_name ||
                  employeeNameMap[msg.employee_code] ||
                  msg.employee_code ||
                  (isMe ? "You" : "User");

                return (
                  <Box
                    key={idx}
                    alignSelf={isMe ? "flex-end" : "flex-start"}
                    bgcolor={isMe ? "#DCF8C6" : "#fff"}
                    px={2}
                    py={1}
                    borderRadius={2}
                    maxWidth="75%"
                    boxShadow={1}
                    opacity={msg?._optimistic ? 0.75 : 1}
                  >
                    <Typography fontWeight="bold" fontSize="0.85rem">
                      {name}
                    </Typography>

                    <Typography fontSize="0.9rem" sx={{ whiteSpace: "pre-line" }}>
                      {msg.remark}
                    </Typography>

                    <Typography fontSize="0.7rem" color="gray">
                      {msg.formatted_time || formatDateTime(msg.created_at)}
                    </Typography>
                  </Box>
                );
              })}

              <div ref={chatBottomRef} />

              <Box display="flex" gap={1} mt={2} alignItems="center">
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a remark..."
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  disabled={!activeRequest?.request_id || !employeeCode || sending}
                  onKeyDown={(e) => {
                    // ✅ Enter to send, Shift+Enter = newline
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handlePostRemark();
                    }
                  }}
                />

                <Tooltip title={!employeeCode ? "Employee not detected" : !activeRequest?.request_id ? "No request selected" : "Send"}>
                  <span>
                    <IconButton
                      onClick={handlePostRemark}
                      disabled={!canSend}
                      sx={{
                        backgroundColor: "transparent",
                        color: canSend ? "#1976D2" : "gray",
                        "&:hover": { backgroundColor: "transparent" },
                      }}
                    >
                      {sending ? <CircularProgress size={18} /> : <SendRoundedIcon />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              {!employeeCode && (
                <Typography sx={{ mt: 1, color: "#B91C1C", fontWeight: 700, fontSize: 12 }}>
                  ⚠️ Your employee code wasn’t detected (employees API mismatch with your email). Fix that and send will work.
                </Typography>
              )}
            </Paper>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default RequestChatDialog;
