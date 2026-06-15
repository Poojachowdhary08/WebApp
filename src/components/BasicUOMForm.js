import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  CircularProgress,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import * as XLSX from "xlsx";

const BasicUOMForm = ({ 
  initialData = null, 
  onSave, 
  onCancel, 
  mode = "add", // "add" or "edit"
  inDialog = false, // Whether form is used inside a dialog
  onBulkComplete = null // Callback when bulk upload completes
}) => {
  const [formData, setFormData] = useState({
    uom_code: "",
    uom_name: "",
    uom_category: "",
    allow_fractional: true,
    default_precision: 6,
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [inputMode, setInputMode] = useState("manual"); // "manual" or "excel"
  const [excelFile, setExcelFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState([]);
  const [excelErrors, setExcelErrors] = useState([]);
  const [parsingExcel, setParsingExcel] = useState(false);

  // Initialize form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        uom_code: initialData.uom_code || "",
        uom_name: initialData.uom_name || "",
        uom_category: initialData.uom_category || "",
        allow_fractional: initialData.allow_fractional !== undefined ? initialData.allow_fractional : true,
        default_precision: initialData.default_precision || 6,
        description: initialData.description || "",
      });
    } else {
      // Reset form for add mode
      setFormData({
        uom_code: "",
        uom_name: "",
        uom_category: "",
        allow_fractional: true,
        default_precision: 6,
        description: "",
      });
    }
    setErrors({});
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.uom_code.trim()) {
      newErrors.uom_code = "UOM code is required";
    }

    if (!formData.uom_name.trim()) {
      newErrors.uom_name = "UOM name is required";
    }

    if (!formData.uom_category) {
      newErrors.uom_category = "UOM category is required";
    }

    if (formData.default_precision < 0 || formData.default_precision > 10) {
      newErrors.default_precision = "Precision must be between 0 and 10";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error in form submission:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleExcelFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setExcelErrors(["Please upload a valid Excel file (.xlsx or .xls)"]);
      return;
    }

    setExcelFile(file);
    setExcelPreview([]);
    setExcelErrors([]);
    setParsingExcel(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: "",
          });

          if (jsonData.length < 2) {
            setExcelErrors(["Excel file must have at least a header row and one data row"]);
            setParsingExcel(false);
            return;
          }

          // Parse header row (first row)
          const headers = jsonData[0].map((h) => String(h).trim().toLowerCase());
          
          // Expected column mappings (flexible)
          const columnMap = {
            uom_code: headers.findIndex((h) => 
              h.includes("code") || h.includes("uom code") || h === "code"
            ),
            uom_name: headers.findIndex((h) => 
              h.includes("name") || h.includes("uom name") || h === "name"
            ),
            uom_category: headers.findIndex((h) => 
              h.includes("category") || h === "category"
            ),
            allow_fractional: headers.findIndex((h) => 
              h.includes("fractional") || h.includes("allow") || h === "fractional"
            ),
            default_precision: headers.findIndex((h) => 
              h.includes("precision") || h.includes("decimal") || h === "precision"
            ),
            description: headers.findIndex((h) => 
              h.includes("description") || h.includes("desc") || h === "description"
            ),
          };

          // Validate required columns
          const missingColumns = [];
          if (columnMap.uom_code === -1) missingColumns.push("UOM Code");
          if (columnMap.uom_name === -1) missingColumns.push("UOM Name");
          if (columnMap.uom_category === -1) missingColumns.push("Category");

          if (missingColumns.length > 0) {
            setExcelErrors([
              `Missing required columns: ${missingColumns.join(", ")}`,
              "Expected columns: UOM Code, UOM Name, Category (and optionally: Allow Fractional, Default Precision, Description)"
            ]);
            setParsingExcel(false);
            return;
          }

          // Parse data rows
          const parsedData = [];
          const rowErrors = [];

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.every((cell) => !cell || cell.toString().trim() === "")) {
              continue; // Skip empty rows
            }

            const rowData = {
              uom_code: String(row[columnMap.uom_code] || "").trim().toUpperCase(),
              uom_name: String(row[columnMap.uom_name] || "").trim(),
              uom_category: String(row[columnMap.uom_category] || "").trim().toUpperCase(),
              allow_fractional: row[columnMap.allow_fractional] !== undefined 
                ? String(row[columnMap.allow_fractional]).toLowerCase() === "true" || 
                  String(row[columnMap.allow_fractional]).toLowerCase() === "yes" ||
                  row[columnMap.allow_fractional] === 1
                : true,
              default_precision: row[columnMap.default_precision] !== undefined 
                ? parseInt(row[columnMap.default_precision]) || 6 
                : 6,
              description: String(row[columnMap.description] || "").trim(),
              _rowNumber: i + 1,
            };

            // Validate row
            const rowValidationErrors = [];
            if (!rowData.uom_code) rowValidationErrors.push("UOM Code is required");
            if (!rowData.uom_name) rowValidationErrors.push("UOM Name is required");
            if (!rowData.uom_category) rowValidationErrors.push("Category is required");
            if (rowData.default_precision < 0 || rowData.default_precision > 10) {
              rowValidationErrors.push("Precision must be between 0 and 10");
            }

            if (rowValidationErrors.length > 0) {
              rowErrors.push({
                row: i + 1,
                errors: rowValidationErrors,
              });
            }

            parsedData.push(rowData);
          }

          setExcelPreview(parsedData);
          if (rowErrors.length > 0) {
            setExcelErrors([
              `Found ${rowErrors.length} row(s) with errors. Please fix them before submitting.`,
              ...rowErrors.map((e) => `Row ${e.row}: ${e.errors.join(", ")}`),
            ]);
          } else {
            setExcelErrors([]);
          }
        } catch (parseError) {
          console.error("Error parsing Excel:", parseError);
          setExcelErrors([`Error parsing Excel file: ${parseError.message}`]);
        } finally {
          setParsingExcel(false);
        }
      };

      reader.onerror = () => {
        setExcelErrors(["Error reading file. Please try again."]);
        setParsingExcel(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error processing file:", error);
      setExcelErrors([`Error processing file: ${error.message}`]);
      setParsingExcel(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (excelPreview.length === 0) {
      setExcelErrors(["No valid data to submit"]);
      return;
    }

    // Validate all rows
    const invalidRows = excelPreview.filter((row) => {
      return !row.uom_code || !row.uom_name || !row.uom_category;
    });

    if (invalidRows.length > 0) {
      setExcelErrors([
        `Please fix all errors before submitting. ${invalidRows.length} row(s) have errors.`,
        ...invalidRows.map((row) => 
          `Row ${row._rowNumber || "?"}: Missing or invalid required fields`
        ),
      ]);
      return;
    }

    setSaving(true);
    setExcelErrors([]);
    
    try {
      // Submit each row sequentially
      const results = [];
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < excelPreview.length; i++) {
        const row = excelPreview[i];
        try {
          // Call onSave for each row - pass bulkMode flag
          await onSave(row, false, true); // false = not edit, true = bulk mode
          successCount++;
          results.push({ row, success: true });
        } catch (error) {
          failCount++;
          results.push({ 
            row, 
            success: false, 
            error: error.response?.data?.detail || error.message || "Unknown error" 
          });
        }
      }
      
      // Refresh list after all operations
      if (typeof window !== 'undefined' && window.location) {
        // Trigger refresh - the parent component should handle this
        // For now, we'll just show the results
      }

      // Show results
      if (failCount === 0) {
        // All succeeded - refresh list and close
        if (onBulkComplete) {
          await onBulkComplete();
        }
        if (onCancel) {
          onCancel();
        }
        return;
      } else {
        // Some failed - show errors but don't close
        setExcelErrors([
          `${successCount} UOM(s) created successfully, ${failCount} failed.`,
          ...results.filter((r) => !r.success).slice(0, 10).map((r) => 
            `${r.row.uom_code || "Unknown"}: ${r.error}`
          ),
          ...(results.filter((r) => !r.success).length > 10 
            ? [`... and ${results.filter((r) => !r.success).length - 10} more errors`]
            : []),
        ]);
        // Refresh list even if some failed to show the successful ones
        if (onBulkComplete && successCount > 0) {
          await onBulkComplete();
        }
      }
    } catch (error) {
      setExcelErrors([`Bulk upload failed: ${error.message}`]);
    } finally {
      setSaving(false);
    }
  };

  const isEditMode = mode === "edit" || !!initialData;

  const FormWrapper = inDialog ? Box : Paper;
  const wrapperProps = inDialog
    ? { 
        sx: { 
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        } 
      }
    : {
        sx: {
          p: 3,
          mb: 3,
          borderRadius: 2,
          boxShadow: 2,
          bgcolor: "#fff",
          border: "2px solid #2a3663",
        },
      };

  return (
    <FormWrapper {...wrapperProps}>
      {/* Sticky Header */}
      <Box 
        sx={{ 
          p: 3,
          pb: 2,
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          borderBottom: inDialog ? "1px solid #E5E7EB" : "none",
          bgcolor: "#fff",
          position: inDialog ? "sticky" : "relative",
          top: 0,
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {isEditMode ? (
            <EditIcon sx={{ color: "#2a3663", fontSize: 28 }} />
          ) : (
            <AddIcon sx={{ color: "#2a3663", fontSize: 28 }} />
          )}
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: "#2a3663" }}>
              {isEditMode ? "Edit UOM" : "Add New UOM"}
            </Typography>
            {inDialog && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {isEditMode 
                  ? "Update the unit of measurement details" 
                  : "Create a new unit of measurement"}
              </Typography>
            )}
          </Box>
        </Box>
        {onCancel && (
          <IconButton
            size="small"
            onClick={onCancel}
            disabled={saving}
            sx={{ 
              color: "text.secondary",
              "&:hover": { bgcolor: "#F3F4F6" },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Tabs for Input Mode (only in add mode) */}
      {!isEditMode && (
        <Box sx={{ px: 3, pt: 2, borderBottom: "1px solid #E5E7EB" }}>
          <Tabs
            value={inputMode}
            onChange={(e, newValue) => {
              setInputMode(newValue);
              setExcelFile(null);
              setExcelPreview([]);
              setExcelErrors([]);
            }}
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                minHeight: 40,
                textTransform: "none",
                fontWeight: 500,
              },
            }}
          >
            <Tab label="Manual Entry" value="manual" />
            <Tab label="Excel Upload" value="excel" />
          </Tabs>
        </Box>
      )}

      {/* Scrollable Content */}
      <Box 
        sx={{ 
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          px: 3,
          py: 3,
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "#F3F4F6",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#CBD5E1",
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: "#94A3B8",
            },
          },
        }}
      >
      {inputMode === "excel" && !isEditMode ? (
        // Excel Upload Mode
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Excel Format Requirements:
            </Typography>
            <Typography variant="caption" component="div">
              Required columns: <strong>UOM Code</strong>, <strong>UOM Name</strong>, <strong>Category</strong>
              <br />
              Optional columns: <strong>Allow Fractional</strong> (true/false), <strong>Default Precision</strong> (0-10), <strong>Description</strong>
              <br />
              Category must be one of: WEIGHT, LENGTH, COUNT, VOLUME
            </Typography>
          </Alert>

          {/* File Upload */}
          <Box
            sx={{
              border: "2px dashed #CBD5E1",
              borderRadius: 2,
              p: 3,
              textAlign: "center",
              mb: 3,
              bgcolor: "#F9FAFB",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: "#2a3663",
                bgcolor: "#F3F4F6",
              },
            }}
          >
            <input
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              id="excel-upload-input"
              type="file"
              onChange={handleExcelFileChange}
            />
            <label htmlFor="excel-upload-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={parsingExcel ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                disabled={parsingExcel}
                sx={{
                  textTransform: "none",
                  mb: 2,
                  borderColor: "#2a3663",
                  color: "#2a3663",
                  "&:hover": {
                    borderColor: "#1e2a4a",
                    bgcolor: "#E0EDFF",
                  },
                }}
              >
                {parsingExcel ? "Parsing Excel..." : "Upload Excel File"}
              </Button>
            </label>
            {excelFile && (
              <Box sx={{ mt: 2 }}>
                <Chip
                  icon={<DescriptionIcon />}
                  label={excelFile.name}
                  onDelete={() => {
                    setExcelFile(null);
                    setExcelPreview([]);
                    setExcelErrors([]);
                  }}
                  sx={{ bgcolor: "#E0EDFF", color: "#1E40AF" }}
                />
              </Box>
            )}
          </Box>

          {/* Errors */}
          {excelErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {excelErrors.map((error, idx) => (
                <Typography key={idx} variant="body2" component="div">
                  {error}
                </Typography>
              ))}
            </Alert>
          )}

          {/* Preview Table */}
          {excelPreview.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: "#172B4D" }}>
                Preview ({excelPreview.length} {excelPreview.length === 1 ? "entry" : "entries"})
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400, mb: 3 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: "#2A3663", color: "#fff", fontWeight: "bold" }}>
                        UOM Code
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#2A3663", color: "#fff", fontWeight: "bold" }}>
                        UOM Name
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#2A3663", color: "#fff", fontWeight: "bold" }}>
                        Category
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#2A3663", color: "#fff", fontWeight: "bold" }}>
                        Fractional
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#2A3663", color: "#fff", fontWeight: "bold" }}>
                        Precision
                      </TableCell>
                      <TableCell sx={{ bgcolor: "#2A3663", color: "#fff", fontWeight: "bold" }}>
                        Description
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {excelPreview.map((row, idx) => {
                      const hasError = !row.uom_code || !row.uom_name || !row.uom_category ||
                        !["WEIGHT", "LENGTH", "COUNT", "VOLUME"].includes(row.uom_category);
                      
                      return (
                        <TableRow 
                          key={idx} 
                          sx={{ 
                            bgcolor: hasError ? "#FEE2E2" : "transparent",
                            "&:hover": { bgcolor: hasError ? "#FEE2E2" : "#F9FAFB" },
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {row.uom_code || "-"}
                            </Typography>
                          </TableCell>
                          <TableCell>{row.uom_name || "-"}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.uom_category || "-"}
                              size="small"
                              sx={{
                                bgcolor: row.uom_category && ["WEIGHT", "LENGTH", "COUNT", "VOLUME"].includes(row.uom_category)
                                  ? "#D1FAE5"
                                  : "#FEE2E2",
                                color: row.uom_category && ["WEIGHT", "LENGTH", "COUNT", "VOLUME"].includes(row.uom_category)
                                  ? "#065F46"
                                  : "#991B1B",
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {row.allow_fractional ? (
                              <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: 18, color: "error.main" }} />
                            )}
                          </TableCell>
                          <TableCell>{row.default_precision || 6}</TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.description || "-"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      ) : (
        // Manual Entry Mode
        <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="UOM Code"
            value={formData.uom_code}
            onChange={(e) => handleChange("uom_code", e.target.value.toUpperCase())}
            required
            disabled={saving || isEditMode}
            placeholder="e.g., COIL, METER, TON"
            helperText={errors.uom_code || (isEditMode ? "Code cannot be changed after creation" : "Unique code identifier (uppercase)")}
            error={!!errors.uom_code}
            autoFocus={!isEditMode}
            sx={{ mb: 1 }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="UOM Name"
            value={formData.uom_name}
            onChange={(e) => handleChange("uom_name", e.target.value)}
            required
            disabled={saving}
            placeholder="e.g., Coil, Meter, Ton"
            helperText={errors.uom_name || "Display name for this UOM"}
            error={!!errors.uom_name}
            autoFocus={isEditMode}
            sx={{ mb: 1 }}
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth required error={!!errors.uom_category}>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.uom_category}
              onChange={(e) => handleChange("uom_category", e.target.value)}
              label="Category"
              disabled={saving}
            >
              <MenuItem value="WEIGHT">WEIGHT</MenuItem>
              <MenuItem value="LENGTH">LENGTH</MenuItem>
              <MenuItem value="COUNT">COUNT</MenuItem>
              <MenuItem value="VOLUME">VOLUME</MenuItem>
            </Select>
            {errors.uom_category && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                {errors.uom_category}
              </Typography>
            )}
            {!errors.uom_category && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.75 }}>
                Select the category for this unit of measurement
              </Typography>
            )}
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Default Precision"
            type="number"
            value={formData.default_precision}
            onChange={(e) => handleChange("default_precision", parseInt(e.target.value) || 0)}
            disabled={saving}
            inputProps={{ min: 0, max: 10 }}
            helperText={errors.default_precision || "Number of decimal places (0-10)"}
            error={!!errors.default_precision}
            sx={{ mb: 1 }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box sx={{ pt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.allow_fractional}
                  onChange={(e) => handleChange("allow_fractional", e.target.checked)}
                  disabled={saving}
                  color="primary"
                />
              }
              label="Allow Fractional Values"
              sx={{ mb: 0.5 }}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4.5 }}>
              Allow decimal/fractional quantities for this UOM
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            disabled={saving}
            multiline
            rows={4}
            placeholder="Optional description for this UOM"
            sx={{ mb: 1 }}
          />
        </Grid>
      </Grid>
      )}
      </Box>

      {/* Sticky Footer */}
      {inDialog && (
        <Box
          sx={{
            p: 3,
            pt: 2,
            borderTop: "1px solid #E5E7EB",
            bgcolor: "#F9FAFB",
            position: "sticky",
            bottom: 0,
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            {onCancel && (
              <Button
                onClick={onCancel}
                disabled={saving}
                sx={{ textTransform: "none", minWidth: 100 }}
              >
                Cancel
              </Button>
            )}
            {inputMode === "excel" && !isEditMode ? (
              <Button
                variant="contained"
                onClick={handleBulkSubmit}
                disabled={
                  saving ||
                  excelPreview.length === 0 ||
                  excelErrors.length > 0 ||
                  excelPreview.some((row) => !row.uom_code || !row.uom_name || !row.uom_category)
                }
                startIcon={
                  saving ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <AddIcon />
                  )
                }
                sx={{
                  bgcolor: "#2a3663",
                  textTransform: "none",
                  px: 3,
                  minWidth: 180,
                  "&:hover": { bgcolor: "#1e2a4a" },
                }}
              >
                {saving
                  ? `Creating ${excelPreview.length} UOM(s)...`
                  : `Create ${excelPreview.length} UOM(s)`}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={
                  saving ||
                  !formData.uom_name.trim() ||
                  !formData.uom_code.trim() ||
                  !formData.uom_category
                }
                startIcon={
                  saving ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : isEditMode ? (
                    <EditIcon />
                  ) : (
                    <AddIcon />
                  )
                }
                sx={{
                  bgcolor: "#2a3663",
                  textTransform: "none",
                  px: 3,
                  minWidth: 140,
                  "&:hover": { bgcolor: "#1e2a4a" },
                }}
              >
                {saving
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                  ? "Update UOM"
                  : "Create UOM"}
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* Inline Footer (for non-dialog mode) */}
      {!inDialog && (
        <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #E5E7EB" }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            {onCancel && (
              <Button
                onClick={onCancel}
                disabled={saving}
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>
            )}
            {inputMode === "excel" && !isEditMode ? (
              <Button
                variant="contained"
                onClick={handleBulkSubmit}
                disabled={
                  saving ||
                  excelPreview.length === 0 ||
                  excelErrors.length > 0 ||
                  excelPreview.some((row) => !row.uom_code || !row.uom_name || !row.uom_category)
                }
                startIcon={
                  saving ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <AddIcon />
                  )
                }
                sx={{
                  bgcolor: "#2a3663",
                  textTransform: "none",
                  px: 3,
                  minWidth: 180,
                  "&:hover": { bgcolor: "#1e2a4a" },
                }}
              >
                {saving
                  ? `Creating ${excelPreview.length} UOM(s)...`
                  : `Create ${excelPreview.length} UOM(s)`}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={
                  saving ||
                  !formData.uom_name.trim() ||
                  !formData.uom_code.trim() ||
                  !formData.uom_category
                }
                startIcon={
                  saving ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : isEditMode ? (
                    <EditIcon />
                  ) : (
                    <AddIcon />
                  )
                }
                sx={{
                  bgcolor: "#2a3663",
                  textTransform: "none",
                  px: 3,
                  "&:hover": { bgcolor: "#1e2a4a" },
                }}
              >
                {saving
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                  ? "Update UOM"
                  : "Create UOM"}
              </Button>
            )}
          </Box>
        </Box>
      )}
    </FormWrapper>
  );
};

export default BasicUOMForm;
