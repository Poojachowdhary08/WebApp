import React, { useState } from "react";
import { API_BASE } from "../config";
import {
  Dialog,
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import * as XLSX from "xlsx";
import axios from "axios";

// Column headers that must be numeric; empty values are normalized to 0 to avoid backend "nan" errors
const NUMERIC_SCHEDULE_COLUMNS = ["phase_order", "duration", "depends_on", "percentage"];

function isNumericColumn(header) {
  const h = (header || "").toString().trim().toLowerCase().replace(/\s+/g, "_");
  return NUMERIC_SCHEDULE_COLUMNS.some((col) => h === col || h.replace(/_/g, "") === col.replace(/_/g, ""));
}

function safeNumeric(val) {
  if (val === null || val === undefined || val === "") return 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function headerMatches(header, names) {
  const h = (header || "").toString().trim().toLowerCase().replace(/\s+/g, "_");
  return names.some((n) => h === n.toLowerCase().replace(/\s+/g, "_"));
}

function getHeaderIndex(headers, names) {
  const idx = headers.findIndex((h) => headerMatches(h, names));
  return idx >= 0 ? idx : -1;
}

/** Parse date from DD/MM/YYYY, YYYY-MM-DD, or Excel serial; return Date or null */
function parseScheduleDate(val) {
  if (val === null || val === undefined || val === "") return null;
  const s = String(val).trim();
  if (!s) return null;
  // Excel serial number
  const n = Number(val);
  if (Number.isFinite(n) && n > 0 && XLSX.SSF && typeof XLSX.SSF.parse_date_code === "function") {
    try {
      const date = XLSX.SSF.parse_date_code(n);
      if (date && date.y && date.m && date.d) return new Date(date.y, date.m - 1, date.d);
    } catch (_) {}
  }
  // DD/MM/YYYY or D/M/YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return isNaN(dt.getTime()) ? null : dt;
  }
  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const any = new Date(s);
  return isNaN(any.getTime()) ? null : any;
}

/** Add duration column from start_date and end_date if missing. Returns headers (updated if column was added). */
function ensureDurationColumn(rows, headers) {
  const durationIdx = getHeaderIndex(headers, ["duration"]);
  if (durationIdx >= 0) return headers;

  const startIdx = getHeaderIndex(headers, ["start_date", "startdate"]);
  const endIdx = getHeaderIndex(headers, ["end_date", "enddate"]);
  if (startIdx < 0 || endIdx < 0) return headers;

  // Insert "duration" after end_date
  const insertAt = endIdx + 1;
  const newHeaders = [...headers.slice(0, insertAt), "duration", ...headers.slice(insertAt)];
  rows[0] = newHeaders;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const startVal = row[startIdx];
    const endVal = row[endIdx];
    const startDate = parseScheduleDate(startVal);
    const endDate = parseScheduleDate(endVal);
    let days = 0;
    if (startDate && endDate) {
      days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (days < 0) days = 0;
    }
    const newRow = [...row.slice(0, insertAt), days, ...row.slice(insertAt)];
    rows[r] = newRow;
  }
  return newHeaders;
}

/** Add optional columns if missing. columns: [{ name, defaultValue }]. Returns updated headers. */
function ensureOptionalColumns(rows, headers, columns) {
  let outHeaders = headers;
  for (const { name, defaultValue } of columns) {
    if (getHeaderIndex(outHeaders, [name]) >= 0) continue;
    outHeaders = [...outHeaders, name];
    rows[0] = outHeaders;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      rows[r] = [...row, defaultValue];
    }
  }
  return outHeaders;
}

/** Ensure building_type column exists and set all data rows to propertyId. Returns updated headers. */
function setBuildingTypeColumn(rows, headers, propertyId) {
  if (propertyId == null || propertyId === "") return headers;
  const idx = getHeaderIndex(headers, ["building_type", "building type"]);
  const value = String(propertyId);
  if (idx >= 0) {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      if (row.length > idx) row[idx] = value;
      else rows[r] = [...row, value];
    }
    return headers;
  }
  const newHeaders = [...headers, "building_type"];
  rows[0] = newHeaders;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    rows[r] = [...row, value];
  }
  return newHeaders;
}

/**
 * Parse file to 2D array [headers, ...rows], normalize numeric columns, return new File and parsed data for display.
 * @param {File} file
 * @param {{ propertyId?: string|number }} [options] - if provided, building_type is set to propertyId
 * @returns {Promise<{ file: File, headers: string[], rows: Record<string, unknown>[] } | { file: File }>}
 */
function normalizeScheduleFile(file, options = {}) {
  return new Promise((resolve, reject) => {
    const ext = file.name.toLowerCase().split(".").pop();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (e) => {
      try {
        let rows = [];
        if (ext === "xlsx" || ext === "xls") {
          const workbook = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
          const ws = workbook.Sheets[workbook.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
        } else if (ext === "csv") {
          const text = e.target.result;
          const lines = text.split("\n").filter((line) => line.trim());
          const parseCSVLine = (line) => {
            const result = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const c = line[i];
              if (c === '"') inQuotes = !inQuotes;
              else if (c === "," && !inQuotes) {
                result.push(current.trim());
                current = "";
              } else current += c;
            }
            result.push(current.trim());
            return result;
          };
          rows = lines.map((line) => parseCSVLine(line).map((v) => v.replace(/^"|"$/g, "")));
        } else {
          resolve({ file });
          return;
        }
        if (!rows.length) {
          resolve({ file });
          return;
        }
        let headers = rows[0].map((h) => String(h).trim() || "");
        headers = ensureDurationColumn(rows, headers);
        headers = ensureOptionalColumns(rows, headers, [
          { name: "remarks", defaultValue: "" },
          { name: "depends_on", defaultValue: 0 },
        ]);
        headers = setBuildingTypeColumn(rows, headers, options.propertyId);
        const numericIndices = headers.map((h, i) => (isNumericColumn(h) ? i : -1)).filter((i) => i >= 0);
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r] || [];
          for (const idx of numericIndices) {
            const raw = row[idx];
            const normalized = safeNumeric(raw);
            if (row.length <= idx) {
              while (row.length <= idx) row.push("");
              row[idx] = normalized;
            } else {
              row[idx] = normalized;
            }
          }
          rows[r] = row;
        }
        // Build row objects for display (all data rows)
        const dataRows = [];
        for (let r = 1; r < rows.length; r++) {
          const rowArr = rows[r] || [];
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = rowArr[i] !== undefined && rowArr[i] !== null ? rowArr[i] : "";
          });
          dataRows.push(obj);
        }
        if (ext === "xlsx" || ext === "xls") {
          const workbook = XLSX.utils.book_new();
          const worksheet = XLSX.utils.aoa_to_sheet(rows);
          XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");
          const buf = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
          const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          resolve({ file: new File([blob], file.name, { type: blob.type }), headers, rows: dataRows });
        } else if (ext === "csv") {
          const csvContent = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
          const blob = new Blob([csvContent], { type: "text/csv" });
          resolve({ file: new File([blob], file.name, { type: "text/csv" }), headers, rows: dataRows });
        } else {
          resolve({ file });
        }
      } catch (err) {
        reject(err);
      }
    };
    if (ext === "xlsx" || ext === "xls") reader.readAsArrayBuffer(file);
    else if (ext === "csv") reader.readAsText(file);
    else resolve({ file });
  });
}

const ScheduleCreationDialog = ({ open, onClose, property, onSuccess }) => {
  const [scheduleCreationMode, setScheduleCreationMode] = useState("upload"); // "upload" or "manual"
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [uploadedScheduleView, setUploadedScheduleView] = useState(null); // { headers, rows } after successful upload
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [manualScheduleRows, setManualScheduleRows] = useState([
    { phasename: "", startdate: "", enddate: "", status: "pending", percentage: 0 }
  ]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setFilePreview([]);
    setPreviewHeaders([]);
    setPreviewLoading(true);

    try {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          let previewData = [];
          let headers = [];

          if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            // Parse Excel file
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON with header row
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              header: 1,
              defval: '',
              raw: false
            });

            if (jsonData.length === 0) {
              setFilePreview([{ error: "File is empty" }]);
              setPreviewLoading(false);
              return;
            }

            // First row is headers
            headers = jsonData[0].map(h => String(h).trim() || `Column ${jsonData[0].indexOf(h) + 1}`);
            
            // Preview first 10 rows
            for (let i = 1; i < Math.min(jsonData.length, 11); i++) {
              const row = {};
              headers.forEach((header, idx) => {
                row[header] = jsonData[i][idx] || '';
              });
              previewData.push(row);
            }
          } else if (fileExtension === 'csv') {
            // Parse CSV
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
              setFilePreview([{ error: "File is empty" }]);
              setPreviewLoading(false);
              return;
            }

            // Parse CSV line (handle quoted values)
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

            headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim() || `Column ${parseCSVLine(lines[0]).indexOf(h) + 1}`);
            
            // Preview first 10 rows
            for (let i = 1; i < Math.min(lines.length, 11); i++) {
              const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
              const row = {};
              headers.forEach((header, idx) => {
                row[header] = values[idx] || '';
              });
              previewData.push(row);
            }
          } else if (fileExtension === 'json') {
            // Parse JSON
            const jsonData = JSON.parse(e.target.result);
            
            if (Array.isArray(jsonData) && jsonData.length > 0) {
              headers = Object.keys(jsonData[0]);
              previewData = jsonData.slice(0, 10);
            } else if (typeof jsonData === 'object') {
              headers = Object.keys(jsonData);
              previewData = [jsonData];
            } else {
              setFilePreview([{ error: "Invalid JSON format" }]);
              setPreviewLoading(false);
              return;
            }
          }

          setPreviewHeaders(headers);
          setFilePreview(previewData);
          setPreviewLoading(false);
        } catch (parseError) {
          console.error("Error parsing file:", parseError);
          setFilePreview([{ error: `Error parsing file: ${parseError.message}` }]);
          setPreviewLoading(false);
        }
      };

      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      setFilePreview([{ error: "Error reading file" }]);
      setPreviewLoading(false);
    }
  };

  const uploadSchedule = async () => {
    if (!selectedFile) {
      return;
    }
    setUploadLoading(true);
    let fileToUpload = selectedFile;
    let parsedData = null;
    try {
      const result = await normalizeScheduleFile(selectedFile, { propertyId: property?.propertyid });
      fileToUpload = result.file;
      if (result.headers && result.rows) parsedData = { headers: result.headers, rows: result.rows };
    } catch (normErr) {
      console.warn("Could not normalize schedule file, uploading as-is:", normErr);
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("property_id", property.propertyid);

    try {
      const response = await axios.post(
        `${API_BASE}/create-schedule-up`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        if (parsedData && parsedData.rows.length > 0) {
          setUploadedScheduleView(parsedData);
        } else {
          handleClose();
          if (onSuccess) onSuccess();
        }
      }
    } catch (error) {
      console.error("Error uploading schedule:", error);
      if (error.response) {
        setSnackbar({ open: true, message: `Upload failed: ${error.response.data.detail || "Unknown error"}`, severity: "error" });
      } else {
        setSnackbar({ open: true, message: "Failed to upload schedule", severity: "error" });
      }
    } finally {
      setUploadLoading(false);
    }
  };

  const createScheduleFromManual = async () => {
    // Validate all rows have required fields
    const invalidRows = manualScheduleRows.filter(r => !r.phasename || !r.startdate || !r.enddate);
    if (invalidRows.length > 0) {
      setSnackbar({ open: true, message: "Please fill in all required fields (Phase Name, Start Date, End Date) for all phases.", severity: "warning" });
      return;
    }
    setUploadLoading(true);
    try {
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data with headers (backend expects building_type, start_date, end_date, duration, remarks, depends_on)
      const buildingType = property?.propertyid != null ? String(property.propertyid) : "";
      const headers = ["building_type", "phase_name", "start_date", "end_date", "duration", "status", "percentage", "remarks", "depends_on"];
      const data = [
        headers, // Header row
        ...manualScheduleRows.map(row => {
          const start = parseScheduleDate(row.startdate);
          const end = parseScheduleDate(row.enddate);
          let duration = 0;
          if (start && end) {
            duration = Math.round((end - start) / (1000 * 60 * 60 * 24));
            if (duration < 0) duration = 0;
          }
          return [
            buildingType,
            row.phasename,
            row.startdate,
            row.enddate,
            duration,
            row.status,
            row.percentage,
            "",   // remarks
            0,    // depends_on (no dependency)
          ];
        })
      ];

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");

      // Generate Excel file as blob
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create file from blob
      const fileName = `schedule_${property.propertyid}_${new Date().getTime()}.xlsx`;
      const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Upload the generated Excel file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("property_id", property.propertyid);

      const response = await axios.post(
        `${API_BASE}/create-schedule-up`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        handleClose();
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error("Error creating schedule:", error);
      if (error.response) {
        setSnackbar({ open: true, message: `Failed to create schedule: ${error.response.data.detail || "Unknown error"}`, severity: "error" });
      } else {
        setSnackbar({ open: true, message: "Failed to create schedule", severity: "error" });
      }
    } finally {
      setUploadLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setFilePreview([]);
    setPreviewHeaders([]);
    setUploadedScheduleView(null);
    setManualScheduleRows([{ phasename: "", startdate: "", enddate: "", status: "pending", percentage: 0 }]);
    setScheduleCreationMode("upload");
    onClose();
  };

  const handleDoneAfterUpload = () => {
    setUploadedScheduleView(null);
    if (onSuccess) onSuccess();
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
    >
      <Box
        sx={{
          padding: 3,
          minHeight: 300,
          textAlign: "center",
          position: "relative",
          backgroundColor: "white",
          borderRadius: "14px",
        }}
      >
        {/* Dialog Title */}
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", marginBottom: 2, color: "#374151" }}
        >
          Create Schedule
        </Typography>

        <Button
          onClick={handleClose}
          variant="outlined"
          color="error"
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            borderRadius: "5px",
            textTransform: "none",
            fontWeight: 700,
            px: 1.5,
            py: 0.25,
            borderColor: "#ef4444",
            color: "#ef4444",
            "&:hover": {
              backgroundColor: "#fee2e2",
              borderColor: "#dc2626",
              color: "#dc2626",
            },
          }}
        >
          X Close
        </Button>

        {/* Success view: show uploaded schedule after successful upload */}
        {uploadedScheduleView && (
          <Box sx={{ textAlign: "left" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#16a34a", mb: 2 }}>
              ✓ Schedule uploaded successfully
            </Typography>
            <Typography variant="body2" sx={{ color: "#555", mb: 2 }}>
              Here is the schedule that was uploaded:
            </Typography>
            <Box
              sx={{
                maxHeight: 360,
                overflow: "auto",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                mb: 2,
              }}
            >
              <Table size="small" sx={{ minWidth: 600 }}>
                <TableHead>
                  <TableRow>
                    {uploadedScheduleView.headers.map((header, idx) => (
                      <TableCell key={idx} sx={{ fontWeight: 600, backgroundColor: "#f5f5f5" }}>
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {uploadedScheduleView.rows.map((row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {uploadedScheduleView.headers.map((header, colIdx) => (
                        <TableCell key={colIdx}>
                          {row[header] !== undefined && row[header] !== null
                            ? String(row[header])
                            : ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="contained" color="primary" onClick={handleDoneAfterUpload} sx={{ textTransform: "none" }}>
                Done
              </Button>
            </Box>
          </Box>
        )}

        {/* Mode Tabs - hidden when showing uploaded schedule */}
        {!uploadedScheduleView && (
        <>
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs
            value={scheduleCreationMode}
            onChange={(e, newValue) => {
              setScheduleCreationMode(newValue);
              setSelectedFile(null);
              setFilePreview([]);
              setPreviewHeaders([]);
            }}
            sx={{ mb: 2 }}
          >
            <Tab label="Upload Excel" value="upload" sx={{ textTransform: "none" }} />
            <Tab label="Create Manually" value="manual" sx={{ textTransform: "none" }} />
          </Tabs>
        </Box>

        {/* Upload Mode */}
        {scheduleCreationMode === "upload" && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: "2px dashed",
                borderColor: "#3f51b5",
                borderRadius: "8px",
                padding: 2,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".csv, .xlsx, .json"
                style={{ display: "none" }}
                id="upload-input"
              />
              <label htmlFor="upload-input">
                <Button
                  variant="contained"
                  component="span"
                  sx={{ textTransform: "none", padding: "10px 20px" }}
                >
                  Choose File
                </Button>
              </label>

              {/* Show Selected File Name with Remove Option */}
              {selectedFile && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    border: "1px solid #ccc",
                    padding: "5px 10px",
                    borderRadius: "5px",
                    backgroundColor: "#f9f9f9",
                    ml: 2,
                  }}
                >
                  <Typography
                    sx={{ fontSize: "14px", fontWeight: 500, color: "#374151" }}
                  >
                    {selectedFile.name}
                  </Typography>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview([]);
                      setPreviewHeaders([]);
                    }}
                    sx={{
                      minWidth: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "#ffebee",
                      "&:hover": { backgroundColor: "#ffcdd2" },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </Button>
                </Box>
              )}
            </Box>

            {/* Fields Being Sent Info */}
            {selectedFile && (
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "#f0f7ff",
                  borderRadius: "8px",
                  border: "1px solid #b3d9ff",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "#1976d2" }}>
                  📤 Fields Being Sent to Backend:
                </Typography>
                <Typography variant="body2" sx={{ color: "#555" }}>
                  • <strong>file</strong>: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </Typography>
                <Typography variant="body2" sx={{ color: "#555" }}>
                  • <strong>property_id</strong>: {property?.propertyid || 'N/A'}
                </Typography>
              </Box>
            )}

            {/* File Preview */}
            {previewLoading && (
              <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading preview...
                </Typography>
              </Box>
            )}

            {!previewLoading && filePreview.length > 0 && previewHeaders.length > 0 && (
              <Box
                sx={{
                  mt: 2,
                  maxHeight: "300px",
                  overflow: "auto",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                }}
              >
                <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 600, backgroundColor: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
                  📋 File Preview (First 10 rows):
                </Typography>
                <Table size="small" sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      {previewHeaders.map((header, idx) => (
                        <TableCell key={idx} sx={{ fontWeight: 600, backgroundColor: "#fafafa" }}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filePreview.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {previewHeaders.map((header, colIdx) => (
                          <TableCell key={colIdx}>
                            {row[header] !== undefined && row[header] !== null
                              ? String(row[header]).substring(0, 50)
                              : ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {!previewLoading && filePreview.length > 0 && filePreview[0]?.error && (
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "#ffebee",
                  borderRadius: "8px",
                  border: "1px solid #ffcdd2",
                }}
              >
                <Typography variant="body2" color="error">
                  ⚠️ {filePreview[0].error}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Manual Creation Mode */}
        {scheduleCreationMode === "manual" && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              maxHeight: "500px",
              overflow: "auto",
            }}
          >
            <Typography variant="body2" sx={{ color: "#666", mb: 1 }}>
              Add schedule phases manually. An Excel file will be generated and sent to the backend.
            </Typography>

            {manualScheduleRows.map((row, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  backgroundColor: "#fafafa",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Phase {index + 1}
                  </Typography>
                  {manualScheduleRows.length > 1 && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        setManualScheduleRows(manualScheduleRows.filter((_, i) => i !== index));
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phase Name"
                      value={row.phasename}
                      onChange={(e) => {
                        const updated = [...manualScheduleRows];
                        updated[index].phasename = e.target.value;
                        setManualScheduleRows(updated);
                      }}
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={row.startdate}
                      onChange={(e) => {
                        const updated = [...manualScheduleRows];
                        updated[index].startdate = e.target.value;
                        setManualScheduleRows(updated);
                      }}
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={row.enddate}
                      onChange={(e) => {
                        const updated = [...manualScheduleRows];
                        updated[index].enddate = e.target.value;
                        setManualScheduleRows(updated);
                      }}
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={row.status}
                        label="Status"
                        onChange={(e) => {
                          const updated = [...manualScheduleRows];
                          updated[index].status = e.target.value;
                          setManualScheduleRows(updated);
                        }}
                      >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="on hold">On Hold</MenuItem>
                        <MenuItem value="blocked">Blocked</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Percentage"
                      type="number"
                      value={row.percentage}
                      onChange={(e) => {
                        const updated = [...manualScheduleRows];
                        updated[index].percentage = parseFloat(e.target.value) || 0;
                        setManualScheduleRows(updated);
                      }}
                      size="small"
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                    />
                  </Grid>
                </Grid>
              </Box>
            ))}

            <Button
              variant="outlined"
              onClick={() => {
                setManualScheduleRows([
                  ...manualScheduleRows,
                  { phasename: "", startdate: "", enddate: "", status: "pending", percentage: 0 }
                ]);
              }}
              sx={{ mt: 1 }}
            >
              + Add Another Phase
            </Button>
          </Box>
        )}

        {/* Upload/Create Button */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
          <Button
            variant="outlined"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            sx={{ padding: "10px 20px", textTransform: "none" }}
            onClick={scheduleCreationMode === "upload" ? uploadSchedule : createScheduleFromManual}
            disabled={uploadLoading || (scheduleCreationMode === "upload" ? !selectedFile : manualScheduleRows.some(r => !r.phasename || !r.startdate || !r.enddate))}
          >
            {uploadLoading ? <CircularProgress size={22} color="inherit" /> : (scheduleCreationMode === "upload" ? "Upload" : "Create Schedule")}
          </Button>
        </Box>
        </>
        )}
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default ScheduleCreationDialog;


