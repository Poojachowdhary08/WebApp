import React from 'react';
import {
  Dialog,
  IconButton,
  Typography,
  Box,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const DrawingViewerDialog = ({ open, onClose, drawing }) => {
  if (!drawing) return null;

  const { file_url, file_name, version, uploaded_by } = drawing;

  // File type checks
  const lowerName = file_name.toLowerCase();
  const isDWG = lowerName.endsWith('.dwg');
  const isPDF = lowerName.endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(lowerName);

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      {/* Top Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        p={2}
        bgcolor="#f5f5f5"
        borderBottom="1px solid #ccc"
      >
        <Box>
          <Typography variant="h6">{file_name}</Typography>
          <Typography variant="caption">
            Version {version} • Uploaded by {uploaded_by}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Viewer Section */}
      <Box
        flex={1}
        height="100%"
        display="flex"
        justifyContent="center"
        alignItems="center"
        bgcolor="#eaeaea"
      >
        {isDWG ? (
          <iframe
            src={`https://sharecad.org/cadframe/load?url=${encodeURIComponent(file_url)}`}
            width="100%"
            height="100%"
            title="DWG Viewer"
            style={{ border: 'none' }}
          />
        ) : isPDF ? (
          <iframe
            src={file_url}
            width="100%"
            height="100%"
            title="PDF Viewer"
            style={{ border: 'none' }}
          />
        ) : isImage ? (
          <img
            src={file_url}
            alt={file_name}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        ) : (
          <Box textAlign="center">
            <Typography variant="h6">
              Preview not available for this file type
            </Typography>
            <a href={file_url} download>
              <Button variant="contained" sx={{ mt: 2 }}>
                Download File
              </Button>
            </a>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

export default DrawingViewerDialog;
