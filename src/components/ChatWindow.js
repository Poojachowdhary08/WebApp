import React, { useState } from "react";
import {
  Box,
  IconButton,
  Typography,
  TextField,
  Tooltip,
  Avatar,
  Fade,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SendIcon from "@mui/icons-material/Send";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

const ChatWindow = ({ onClose, property }) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleSendMessage = () => {
    if (message || attachments.length > 0) {
      console.log("Send:", message, attachments);
      setMessage("");
      setAttachments([]);
    }
  };

  const handleAttachment = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAttachments((prev) => [...prev, file]);
    }
  };

  const getFileIcon = (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png"].includes(ext)) return <InsertPhotoIcon color="primary" />;
    if (["pdf"].includes(ext)) return <PictureAsPdfIcon color="error" />;
    return <InsertDriveFileIcon color="action" />;
  };

  // 🔻 MINIMIZED VIEW
  if (isMinimized) {
    return (
      <Box
        sx={{
          position: "fixed",
          bottom: 20,
          left: 20,
          width: 180,
          height: 48,
          bgcolor: "#2a3663",
          borderRadius: "24px",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          boxShadow: "0px 8px 24px rgba(0,0,0,0.2)",
          cursor: "pointer",
          zIndex: 1600,
        }}
        onClick={() => setIsMinimized(false)}
      >
        <Typography variant="body2" fontWeight="bold" noWrap>
          Chat 
        </Typography>

      </Box>
    );
  }

  // 🔳 FULL CHAT UI
  return (
    <Fade in={true}>
      <Box
        sx={{
          position: "fixed",
          bottom: 20,
          left: 20,
          width: 280,
          height: 520,
          bgcolor: "#ffffff",
          borderRadius: "18px",
          boxShadow: "0px 8px 24px rgba(0,0,0,0.2)",
          overflow: "hidden",
          zIndex: 1600,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* 🔹 Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            backgroundColor: "#2a3663",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
      
            <Typography variant="subtitle2" fontWeight="bold" noWrap>
              Chat 
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Minimize">
              <IconButton
                onClick={() => setIsMinimized(true)}
                size="small"
                sx={{ color: "#fff" }}
              >
                <span style={{ fontSize: "18px", lineHeight: 1 }}>−</span>
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton onClick={onClose} size="small" sx={{ color: "#fff" }}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 🔹 Messages area */}
        <Box
          sx={{
            flex: 1,
            p: 2,
            overflowY: "auto",
            backgroundColor: "#f4f5f7",
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: "#aaa", fontStyle: "italic", textAlign: "center" }}
          >
            Start chatting...
          </Typography>
        </Box>

        {/* 🔹 Attachment Preview */}
        {attachments.length > 0 && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              overflowX: "auto",
              px: 2,
              py: 1,
              background: "#f9f9f9",
              borderTop: "1px solid #ddd",
            }}
          >
            {attachments.map((file, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 1,
                  minWidth: 120,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "#fff",
                  borderRadius: "10px",
                  border: "1px solid #e0e0e0",
                  whiteSpace: "nowrap",
                }}
              >
                {getFileIcon(file)}
                <Typography variant="caption" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {file.name}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* 🔹 Message Input */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2,
            py: 1.5,
            borderTop: "1px solid #ddd",
            background: "#fff",
          }}
        >
          <Tooltip title="Attach File">
            <IconButton component="label">
              <AttachFileIcon />
              <input
                type="file"
                hidden
                onChange={handleAttachment}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
            </IconButton>
          </Tooltip>

          <TextField
  placeholder="Type a message"
  variant="outlined"
  fullWidth
  value={message}
  multiline
  maxRows={4}
  size="small"
  onChange={(e) => setMessage(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }}
  sx={{
    mx: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    "& .MuiInputBase-root": {
      padding: "8px 12px",
      alignItems: "flex-start",
    },
    "& textarea": {
      resize: "none",
      overflow: "auto",
      lineHeight: 1.4,
    },
  }}
/>


          <Tooltip title="Send">
            <IconButton
              onClick={handleSendMessage}
              disabled={!message && attachments.length === 0}
              sx={{ color: "#2a3663" }}
            >
              <SendIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Fade>
  );
};

export default ChatWindow;
