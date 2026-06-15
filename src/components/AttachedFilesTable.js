import React from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";

export function formatFileSize(bytes) {
  if (bytes == null || bytes === "") return "—";
  const n = Number(bytes);
  if (Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ name }) {
  const ext = (name || "").split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return <PictureAsPdfIcon sx={{ fontSize: 28, color: "#DC2626" }} />;
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
    return <ImageOutlinedIcon sx={{ fontSize: 28, color: "#2563EB" }} />;
  }
  if (["xls", "xlsx", "csv"].includes(ext)) return <TableChartOutlinedIcon sx={{ fontSize: 28, color: "#16A34A" }} />;
  return <DescriptionOutlinedIcon sx={{ fontSize: 28, color: "#64748B" }} />;
}

/**
 * @param {Array<{ id: string, name: string, size?: number }>} rows
 * @param {(id: string) => void} [onRemove] — omit or null for read-only (no Actions column)
 */
export default function AttachedFilesTable({ rows, onRemove, title = "Attached files", subtitle }) {
  if (!rows?.length) return null;

  const readOnly = typeof onRemove !== "function";

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: 15 }}>{title}</Typography>
        <Paper
          component="span"
          elevation={0}
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: "#EEF2FF",
            color: "#4338CA",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {rows.length} total
        </Paper>
      </Box>
      {subtitle ? (
        <Typography sx={{ fontSize: 13, color: "#64748B", mb: 1.5, fontWeight: 500 }}>{subtitle}</Typography>
      ) : null}

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2,
          border: "1px solid #E8ECF0",
          overflow: "hidden",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#F8FAFC" }}>
              <TableCell sx={{ fontWeight: 800, color: "#64748B", fontSize: 12, py: 1.25 }}>File name</TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748B", fontSize: 12, width: 100 }}>Size</TableCell>
              {!readOnly && (
                <TableCell align="right" sx={{ fontWeight: 800, color: "#64748B", fontSize: 12, width: 100 }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                <TableCell sx={{ py: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <FileTypeIcon name={row.name} />
                    <Typography sx={{ fontWeight: 600, color: "#0f172a", fontSize: 14, wordBreak: "break-word" }}>
                      {row.name || "Document"}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>{formatFileSize(row.size)}</TableCell>
                {!readOnly && (
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={() => onRemove(row.id)}
                      sx={{ textTransform: "none", fontWeight: 700, color: "#DC2626", minWidth: 0, p: 0.5 }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
