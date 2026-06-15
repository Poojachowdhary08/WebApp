import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import BoltIcon from "@mui/icons-material/Bolt";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import { API_BASE } from "../config";

/**
 * SalesChatWindow (Material UI version, refreshed UI)
 * --------------------------------------------------
 * • No top quick tags (only bottom)
 * • Cleaner header, nicer bubbles, date chips, animated typing dots
 * • Compact results card with table view for rows/raw_data (first 10 rows)
 * • Plug-and-play with your /ask endpoint
 * • Points directly to API_BASE (http://localhost:8080) by default
 */

export default function SalesChatWindow({
  title = "Sales Data Assistant",
  lead = { name: "Guest", email: "", company: "" },
  welcome =
    "Hi! I'm your AI-powered sales data assistant. I can help you analyze employees, leads, properties, clients, and sales performance. Ask me anything about your sales data!",
  onClose,
  apiBase = API_BASE,
  apiPath = "/ask",
}) {
  const [messages, setMessages] = useState(() => [
    { role: "assistant", text: welcome, ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const listRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const quickTags = [
    "How many employees are there?",
    "Show me leads by status",
    "How many properties do we have?",
    "Show monthly sales performance",
    "List all clients by location",
    "Show recent property visits",
    "What are the total sales this month, quarter, and year compared to targets?",
    "Which projects/properties are generating the highest revenue?",
    "How many active leads are in the funnel, and what is the conversion rate at each stage (enquiry → site visit → booking → registration)?",
    "Which lead sources are performing best?",
    "Who are the top-performing sales executives by revenue?",
    "Which team members have the most stalled leads?",
    "Customer profile breakdown by budget and property type",
    "Top reasons for deal losses or cancellations",
    "Outstanding receivable amount",
    "How much unsold inventory is left and its value?",
  ];

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  async function onSend(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed) return;

    const userMsg = { role: "user", text: trimmed, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    setFatalError("");

    const url = `${apiBase.replace(/\/$/, "")}${apiPath}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok && !data.error) {
        const assistantMsg = {
          role: "assistant",
          text: data.answer || "Here’s what I found.",
          ts: Date.now(),
          data,
        };
        setMessages((m) => [...m, assistantMsg]);
      } else {
        const errorText = data.error || data.detail || "Unknown error";
        const errorMsg = {
          role: "assistant",
          text: `Sorry, I hit an error: ${errorText}`,
          ts: Date.now(),
          isError: true,
          data,
        };
        setMessages((m) => [...m, errorMsg]);
      }
    } catch (error) {
      const errorMsg = {
        role: "assistant",
        text:
          "I couldn’t reach the backend. Please confirm the server is running and CORS is OK.",
        ts: Date.now(),
        isError: true,
      };
      setMessages((m) => [...m, errorMsg]);
      setFatalError(error?.message || String(error));
    } finally {
      setThinking(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  const groups = useMemo(() => groupByDate(messages), [messages]);

  return (
    <Paper
      elevation={6}
      sx={{
        width: "min(100%, 1800px)",
        height: isMobile ? "82vh" : "98vh",
        mx: "auto",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <Header title={title} onClose={onClose} />

      {/* Messages */}
      <Box
        ref={listRef}
        sx={{
          position: "relative",
          overflowY: "auto",
          p: 2,
          bgcolor:
            theme.palette.mode === "light"
              ? "background.default"
              : "background.paper",
        }}
      >
        {fatalError && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {fatalError}
          </Alert>
        )}

        <Stack spacing={2} mt={messages.length <= 1 ? 2 : 0}>
          {groups.map(({ date, items }) => (
            <Box key={date}>
              <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
                <Chip label={date} size="small" variant="outlined" />
              </Box>
              <Stack spacing={1.25}>
                {items.map((m, idx) => (
                  <MessageRow key={idx} msg={m} />
                ))}
              </Stack>
            </Box>
          ))}

          {thinking && <TypingIndicator />}
        </Stack>
      </Box>

      {/* Composer */}
      <Box sx={{ borderTop: 1, borderColor: "divider", p: 1.25 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
          {quickTags.slice(0, 6).map((q) => (
            <Chip
              key={q}
              label={q}
              variant="outlined"
              onClick={() => onSend(q)}
              clickable
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={1.25} alignItems="flex-end">
          <TextField
            fullWidth
            multiline
            minRows={1}
            maxRows={6}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about employees, leads, properties, sales data, or any business insights..."
          />
          <IconButton
            color="primary"
            disabled={!input.trim() || thinking}
            onClick={() => onSend()}
            size="large"
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </Box>
    </Paper>
  );
}

/* =========================
   Subcomponents
   ========================= */

function Header({ title, onClose }) {
  return (
    <AppBar
      position="static"
      sx={{ background: "#2A3663", boxShadow: "none", px: 2 }}
    >
      <Toolbar sx={{ gap: 2, minHeight: 56 }}>
        {/* Logo */}
        {/* <Box
          component="img"
          src="https://maahomes.in/static/images/logo1.png"
          alt="Maa Homes"
          sx={{
            height: 34,
            width: "auto",
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
            bgcolor: "transparent",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        /> */}

        {/* Title + subtitle */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap fontWeight={600}>
            {title}
          </Typography>
      
        </Box>

        {/* Close pill */}
        <ClosePill onClose={onClose} />
      </Toolbar>
    </AppBar>
  );
}

function ClosePill({ onClose }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        bgcolor: "primary.dark",
        px: 1.25,
        py: 0.75,
        borderRadius: 999,
        opacity: 0.9,
      }}
    >
      <Chip
        size="small"
        color="default"
        variant="filled"
        label="Close"
        onClick={onClose}
        onDelete={onClose}
        sx={{
          bgcolor: "common.white",
          color: "text.primary",
          "& .MuiChip-deleteIcon": { color: "text.secondary" },
        }}
      />
    </Stack>
  );
}

function TypingIndicator() {
  return (
    <Stack sx={{ maxWidth: 220 }} spacing={0.5}>
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1,
          bgcolor: "grey.100",
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          width: "fit-content",
        }}
      >
        <Avatar sx={{ width: 24, height: 24, bgcolor: "info.main" }}>
          <BoltIcon fontSize="10px" />
        </Avatar>
        <Box
          sx={{
            display: "inline-flex",
            gap: 0.5,
            "& > span": {
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: "text.secondary",
              animation: "bounce 1.4s infinite ease-in-out both",
            },
            "& > span:nth-of-type(2)": { animationDelay: "0.2s" },
            "& > span:nth-of-type(3)": { animationDelay: "0.4s" },
            "@keyframes bounce": {
              "0%, 80%, 100%": { transform: "scale(0)" },
              "40%": { transform: "scale(1.0)" },
            },
          }}
        >
          <span /> <span /> <span />
        </Box>
      </Box>
      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        Assistant is typing…
      </Typography>
    </Stack>
  );
}

function MessageRow({ msg }) {
  const isUser = msg.role === "user";
  const theme = useTheme();

  const userBubble = {
    background:
      theme.palette.mode === "dark"
        ? "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)"
        : "linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)",
    color: "common.white",
    border: "none",
  };

  const botBubble = {
    background:
      theme.palette.mode === "dark"
        ? "linear-gradient(135deg, #0F172A 0%, #111827 100%)"
        : "linear-gradient(135deg, #ffffff 0%, #F8FAFC 100%)",
    color: "text.primary",
    border: 1,
    borderColor: "divider",
  };

  return (
    <Stack
      direction="row"
      spacing={1.25}
      justifyContent={isUser ? "flex-end" : "flex-start"}
      alignItems="flex-end"
    >
      {!isUser && (
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: msg.isError ? "error.main" : "info.main",
          }}
        >
          <BoltIcon fontSize="10px" />
        </Avatar>
      )}

      <Paper
        variant="outlined"
        sx={{
          maxWidth: { xs: "86%", sm: isUser ? "70%" : "85%" },
          px: 1.5,
          py: 1.25,
          borderRadius: 2,
          ...(isUser ? userBubble : botBubble),
        }}
      >
        {/* Text */}
        <Typography
          variant="body2"
          sx={{ whiteSpace: "pre-wrap", mb: msg.data ? 1 : 0 }}
        >
          {msg.text}
        </Typography>

        {/* If error, just badge it */}
        {msg.isError && (
          <Chip size="small" color="error" sx={{ mt: 1 }} label="Backend Error" />
        )}

        {/* Results card */}
        {!msg.isError && msg.data && <ResultCard data={msg.data} />}

        <Typography
          variant="caption"
          sx={{ opacity: 0.6, display: "block", mt: 0.75 }}
        >
          {formatTime(msg.ts)}
        </Typography>
      </Paper>

      {isUser && (
        <Avatar sx={{ width: 28, height: 28, bgcolor: "grey.900" }}>U</Avatar>
      )}
    </Stack>
  );
}

function ResultCard({ data }) {
  const rows = Array.isArray(data?.rows)
    ? data.rows
    : Array.isArray(data?.raw_data)
    ? data.raw_data
    : [];
  const limited = rows.slice(0, 10);
  const columns = limited.length > 0 ? Object.keys(limited[0]) : [];
  const hasAny = (rows?.length ?? 0) > 0;

  return (
    <Card
      variant="outlined"
      sx={{ mt: 1, bgcolor: "background.paper", borderRadius: 1.5 }}
    >
      <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mb: hasAny ? 1 : 0 }}
        >
          <QueryStatsIcon fontSize="small" />
          <Typography variant="subtitle2">Results</Typography>
          {typeof data?.count === "number" && (
            <Chip size="small" label={`rows: ${data.count}`} variant="outlined" />
          )}
          {/* {data?.ok === false && (
            <Chip size="small" color="error" label="ok: false" />
          )}
          {data?.ok === true && (
            <Chip size="small" color="success" label="ok: true" />
          )} */}
        </Stack>

        {!hasAny && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            No tabular rows returned.
          </Typography>
        )}

        {hasAny && (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" stickyHeader={false}>
              <TableHead>
                <TableRow>
                  {columns.map((c) => (
                    <TableCell key={c} sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="caption" fontWeight={700}>
                        {c}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {limited.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((c) => (
                      <TableCell key={c} sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="caption">
                          {formatCell(row[c])}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {rows.length > 10 && (
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 0.75, color: "text.secondary" }}
          >
            Showing first 10 rows…
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/* =========================
   Helpers
   ========================= */

function formatCell(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function groupByDate(items) {
  const fmt = (ts) =>
    new Date(ts).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const buckets = {};
  for (const it of items) {
    const k = fmt(it.ts);
    (buckets[k] ||= []).push(it);
  }
  return Object.entries(buckets).map(([date, items]) => ({ date, items }));
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
