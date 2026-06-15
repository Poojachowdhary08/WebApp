// PropertyDocumentsTab.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  IconButton,
  Chip,
  Stack,
  Divider,
  Tooltip,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import FolderIcon from "@mui/icons-material/Folder";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import GridOnIcon from "@mui/icons-material/GridOn";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

import axios from "axios";

const PropertyDocumentsTab = ({ property, showDialog }) => {
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Folder filter
  const [activeFolder, setActiveFolder] = useState("all"); // all | pdf | images | excel | other

  // Preview dialog
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Upload
  const [pendingFiles, setPendingFiles] = useState([]);
  const [fileUploadDialogOpen, setFileUploadDialogOpen] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!property?.propertyid) return;

    setLoadingFiles(true);
    try {
      // Task files
      const taskFileRes = await axios.get(
        `http://localhost:8080/file/property/${property.propertyid}`
      );
      const taskFilesRaw = taskFileRes?.data?.files || [];
      const taskFiles = taskFilesRaw.flatMap((entry) => entry.files || []);

      const normalizedTaskFiles = taskFiles.map((f) => ({
        ...f,
        uploaded_at: f.uploaded_at ? new Date(f.uploaded_at) : new Date(0),
        source: "task",
        file_name:
          f.file_name ||
          decodeURIComponent((f.file_url || "").split("/").pop() || "Unnamed"),
        file_type: f.file_type || "",
        file_url: f.file_url || "",
      }));

      // Project docs
      const projectDocRes = await axios.get(
        `http://localhost:8080/properties-documents/${property.propertyid}`
      );
      const projectDocs = projectDocRes?.data?.documents || [];

      const normalizedProjectFiles = projectDocs.flatMap((doc) =>
        Array.isArray(doc.file_urls)
          ? doc.file_urls.map((url) => ({
              file_url: url,
              file_name: decodeURIComponent(url.split("/").pop()),
              file_type: url.split(".").pop(),
              uploaded_at: new Date(doc.created_at || 0),
              source: "project",
            }))
          : []
      );

      const allFiles = [...normalizedTaskFiles, ...normalizedProjectFiles].sort(
        (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)
      );

      setFiles(allFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [property?.propertyid]);

  useEffect(() => {
    if (property?.propertyid) fetchFiles();
  }, [property?.propertyid, fetchFiles]);

  const displayedFiles = useMemo(() => (Array.isArray(files) ? files : []), [files]);

  // ---------- Helpers ----------
  const getExt = (file) => {
    const name = (file?.file_name || "").toLowerCase();
    const fromName = name.includes(".") ? name.split(".").pop() : "";
    const fromType = String(file?.file_type || "").toLowerCase();

    if (fromType.includes("pdf")) return "pdf";
    if (fromType.includes("image")) return "image";
    return fromName || fromType;
  };

  const classifyFolder = (file) => {
    const ext = getExt(file);
    if (!ext) return "other";

    if (ext === "pdf") return "pdf";
    if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "image"].includes(ext))
      return "images";
    if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "excel";

    return "other";
  };

  const isPreviewable = (file) => {
    const bucket = classifyFolder(file);
    return bucket === "images" || bucket === "pdf";
  };

  const folders = useMemo(() => {
    const counts = { all: 0, pdf: 0, images: 0, excel: 0, other: 0 };
    for (const f of displayedFiles) {
      counts.all += 1;
      const bucket = classifyFolder(f);
      counts[bucket] += 1;
    }
    return counts;
  }, [displayedFiles]);

  const filteredFiles = useMemo(() => {
    if (activeFolder === "all") return displayedFiles;
    return displayedFiles.filter((f) => classifyFolder(f) === activeFolder);
  }, [displayedFiles, activeFolder]);

  const fmtWhen = (d) => {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  // ---------- ✅ Download (S3-safe) ----------
  // IMPORTANT: Do NOT append response-content-disposition for anonymous S3 URLs.
  async function handleDownload(url, suggestedName) {
    if (!url) return;

    // 1) Try blob download (works only if CORS allows)
    try {
      await blobDownload(url, suggestedName);
      return;
    } catch (err) {
      // 2) Fallback: open the original URL (no query params!)
      // User can download from browser viewer.
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function blobDownload(url, suggestedName) {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = suggestedName || getFilenameFromUrl(url) || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function getFilenameFromUrl(url) {
    try {
      const u = new URL(url, window.location.href);
      return decodeURIComponent(u.pathname.split("/").pop() || "");
    } catch {
      return "";
    }
  }

  // ---------- Upload ----------
  const handleFileChangeAndUpload = (e) => {
    const filesArr = Array.from(e.target.files || []);
    if (!filesArr.length) return;
    setPendingFiles(filesArr);
    setFileUploadDialogOpen(true);
  };

  const handleSendProjectDocuments = async (filesParam = []) => {
    if (!filesParam.length) return;

    const engineer_name = localStorage.getItem("emp_name") || "Unknown";
    const property_id = property?.propertyid || "Unknown";

    const formData = new FormData();
    formData.append("property_id", property_id);
    formData.append("engineer_name", engineer_name);
    formData.append("description", "General document upload");

    for (let file of filesParam) formData.append("files", file);

    try {
      await axios.post("http://localhost:8080/properties-documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showDialog?.("Documents uploaded successfully!", "success");
      setPendingFiles([]);
      await fetchFiles();
    } catch (error) {
      const errorMsg = error?.response?.data?.detail || "Upload failed.";
      showDialog?.(`Upload failed: ${errorMsg}`, "error");
    }
  };

  const FolderChip = ({ id, label, count, icon }) => {
    const active = activeFolder === id;
    return (
      <Chip
        icon={icon}
        label={`${label} (${count})`}
        onClick={() => setActiveFolder(id)}
        variant={active ? "filled" : "outlined"}
        sx={{
          fontWeight: 900,
          borderRadius: 2,
          bgcolor: active ? "#2A3663" : "#fff",
          color: active ? "#fff" : "#111827",
          borderColor: "#e5e7eb",
          "&:hover": { bgcolor: active ? "#1E2A48" : "#f3f4f6" },
          "& .MuiChip-icon": { color: active ? "#fff" : "#6b7280" },
        }}
      />
    );
  };

  const openPreview = (file) => {
    if (!file?.file_url) return;
    setPreviewFile(file);
    setPreviewDialogOpen(true);
  };

  // Thumbnail block like screenshot
  const Thumb = ({ file }) => {
    const bucket = classifyFolder(file);

    if (bucket === "images") {
      return (
        <Box
          component="img"
          src={file.file_url}
          alt={file.file_name}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            borderRadius: 2,
          }}
        />
      );
    }

    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          borderRadius: 2,
          bgcolor: "#eef2f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {bucket === "pdf" ? (
          <PictureAsPdfIcon sx={{ fontSize: 42, color: "#F44336" }} />
        ) : bucket === "excel" ? (
          <GridOnIcon sx={{ fontSize: 42, color: "#4CAF50" }} />
        ) : (
          <InsertDriveFileIcon sx={{ fontSize: 42, color: "#6b7280" }} />
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <FolderChip id="all" label="All" count={folders.all} icon={<FolderIcon />} />
            <FolderChip id="pdf" label="PDF" count={folders.pdf} icon={<PictureAsPdfIcon />} />
            <FolderChip id="images" label="Images" count={folders.images} icon={<ImageIcon />} />
            <FolderChip id="excel" label="Excel" count={folders.excel} icon={<GridOnIcon />} />
            <FolderChip id="other" label="Other" count={folders.other} icon={<DescriptionIcon />} />
          </Stack>
        </Box>

        <Button
          variant="contained"
          component="label"
          sx={{
            bgcolor: "#2A3663",
            color: "#fff",
            fontWeight: 900,
            borderRadius: 2,
            px: 2,
            textTransform: "none",
            "&:hover": { bgcolor: "#1E2A48" },
          }}
        >
          Upload Documents
          <input
            type="file"
            hidden
            multiple
            onChange={handleFileChangeAndUpload}
            accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx,.csv,.doc,.docx"
          />
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {loadingFiles ? (
        <Box display="flex" justifyContent="flex-start" alignItems="center" height={140}>
          <CircularProgress />
        </Box>
      ) : filteredFiles.length === 0 ? (
        <Typography sx={{ textAlign: "left", fontStyle: "italic", color: "#6b7280", py: 2 }}>
          No documents found in <b>{activeFolder.toUpperCase()}</b>.
        </Typography>
      ) : (
        <Box sx={{ height: 520, overflowY: "auto", pr: 1 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: 2,
              alignItems: "start",
            }}
          >
            {filteredFiles.map((file) => {
              const when = fmtWhen(file.uploaded_at);

              return (
                <Box
                  key={file.file_id || file.file_url || file.file_name}
                  sx={{
                    borderRadius: 3,
                    bgcolor: "#f3f5f9",
                    p: 1.2,
                    border: "1px solid #eef2f7",
                  }}
                >
                  {/* Thumbnail */}
                  <Box
                    onClick={() => {
                      if (isPreviewable(file)) openPreview(file);
                    }}
                    sx={{
                      height: 92,
                      borderRadius: 2,
                      overflow: "hidden",
                      cursor: isPreviewable(file) ? "pointer" : "default",
                      bgcolor: "#fff",
                    }}
                  >
                    <Thumb file={file} />
                  </Box>

                  {/* File name + meta + download icon */}
                  <Box sx={{ mt: 1, display: "flex", alignItems: "flex-end", gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#111827",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={file.file_name}
                      >
                        {file.file_name}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 10,
                          color: "#9aa3af",
                          fontWeight: 700,
                          mt: 0.3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={when}
                      >
                        {when}
                      </Typography>
                    </Box>

                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file.file_url, file.file_name);
                        }}
                        sx={{
                          bgcolor: "#fff",
                          border: "1px solid #e5e7eb",
                          "&:hover": { bgcolor: "#f3f4f6" },
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Typography sx={{ fontSize: 11, color: "#9aa3af", mt: 2, fontWeight: 700 }}>
            Showing {filteredFiles.length} results
          </Typography>
        </Box>
      )}

      {/* Upload Preview Confirm Dialog */}
      <Dialog
        open={fileUploadDialogOpen}
        onClose={() => {
          setFileUploadDialogOpen(false);
          setPendingFiles([]);
        }}
        fullWidth
        maxWidth="md"
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
            Preview & Confirm Upload
          </Typography>

          {pendingFiles.length === 0 ? (
            <Typography>No files selected.</Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 2,
              }}
            >
              {pendingFiles.map((file, index) => {
                const isImage = file.type?.startsWith("image/");
                return (
                  <Box
                    key={index}
                    sx={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      p: 1,
                      bgcolor: "#f9fafb",
                    }}
                  >
                    <Box
                      sx={{
                        height: 90,
                        borderRadius: 2,
                        overflow: "hidden",
                        bgcolor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isImage ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <InsertDriveFileIcon sx={{ fontSize: 42, color: "#6b7280" }} />
                      )}
                    </Box>

                    <Typography
                      sx={{
                        fontSize: 12,
                        mt: 1,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={file.name}
                    >
                      {file.name}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}

          <Box display="flex" justifyContent="flex-end" mt={3} gap={2}>
            <Button
              onClick={() => {
                setFileUploadDialogOpen(false);
                setPendingFiles([]);
              }}
              variant="outlined"
              sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                await handleSendProjectDocuments(pendingFiles);
                setFileUploadDialogOpen(false);
                setPendingFiles([]);
              }}
              disabled={pendingFiles.length === 0}
              sx={{
                textTransform: "none",
                fontWeight: 900,
                borderRadius: 2,
                bgcolor: "#2A3663",
                "&:hover": { bgcolor: "#1E2A48" },
              }}
            >
              Upload
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Preview Dialog (PDF/Image) */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => {
          setPreviewDialogOpen(false);
          setPreviewFile(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ p: 2.5, position: "relative" }}>
          <IconButton
            onClick={() => {
              setPreviewDialogOpen(false);
              setPreviewFile(null);
            }}
            sx={{ position: "absolute", top: 8, right: 8, color: "grey.500" }}
          >
            <CloseIcon />
          </IconButton>

          {previewFile && (
            <>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 900 }}>
                {previewFile.file_name}
              </Typography>

              {classifyFolder(previewFile) === "pdf" ? (
                <iframe
                  src={previewFile.file_url}
                  title={previewFile.file_name}
                  style={{ width: "100%", height: "80vh", border: "none" }}
                />
              ) : (
                <img
                  src={previewFile.file_url}
                  alt={previewFile.file_name}
                  style={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }}
                />
              )}
            </>
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

export default PropertyDocumentsTab;
