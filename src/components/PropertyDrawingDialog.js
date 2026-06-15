import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import axios from 'axios';
import DrawingViewerDialog from './DrawingViewerDialog'; // ✅ Full-screen viewer

const PropertyDrawingDialog = ({ open, onClose, propertyId }) => {
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeDrawing, setActiveDrawing] = useState(null);

  useEffect(() => {
    if (open && propertyId) fetchDrawings();
  }, [open, propertyId]);

  const fetchDrawings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/property-drawings/${propertyId}`);
      setDrawings(res.data.drawings);
    } catch (err) {
      console.error('Error fetching drawings:', err);
    }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    const currentUserEmail = localStorage.getItem("email") || "anonymous@system";

    const formData = new FormData();
    formData.append("property_id", propertyId);
    for (let file of files) {
      formData.append("files", file);
    }

    try {
      await axios.post(`${API_BASE}/upload-property-drawing", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-user-email": currentUserEmail
        }
      });
      fetchDrawings();
    } catch (err) {
      console.error("❌ Upload failed:", err.response?.data || err.message);
    }
  };

  const openViewer = (drawing) => {
    setActiveDrawing(drawing);
    setViewerOpen(true);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg"
        PaperProps={{ sx: { height: '95vh' } }}>
        <DialogTitle>
          Property Drawings - {propertyId}
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 16,
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                borderColor: '#999',
              },
              padding: '6px',
              boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <CloseIcon />
          </IconButton>

          <Tooltip title="Upload">
            <IconButton component="label" sx={{ position: 'absolute', right: 56 }}>
              <UploadFileIcon />
              <input
                type="file"
                hidden
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleUpload}
              />
            </IconButton>
          </Tooltip>
        </DialogTitle>

        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" mt={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box display="flex" flexWrap="wrap" gap={2}>
              {drawings.map((drawing) => (
                <Box
                  key={drawing.drawing_id}
                  onClick={() => openViewer(drawing)}
                  sx={{
                    width: 200,
                    border: '1px solid #ddd',
                    borderRadius: 2,
                    boxShadow: 2,
                    cursor: 'pointer',
                    transition: '0.3s',
                    '&:hover': {
                      boxShadow: 5,
                      transform: 'scale(1.02)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      height: 120,
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                    }}
                  >
                    {drawing.file_name.endsWith('.pdf') ? (
                      <Typography variant="caption" color="textSecondary">PDF File</Typography>
                    ) : (
                      <img
                        src={drawing.file_url}
                        alt={drawing.file_name}
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                      />
                    )}
                  </Box>
                  <Box p={1}>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {drawing.file_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      Version {drawing.version}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      By {drawing.uploaded_by}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ Fullscreen Drawing Viewer */}
      {activeDrawing && (
        <DrawingViewerDialog
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          drawing={activeDrawing}
        />
      )}
    </>
  );
};

export default PropertyDrawingDialog;
