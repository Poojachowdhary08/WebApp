import React from "react";
import {
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  Tooltip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import { AiFillFileExcel } from "react-icons/ai";


// S3 file URLs mapped to template names
const templateFiles = [
  {
    name: "East Facing Villa",
    downloadUrl: "https://your-s3-bucket.s3.amazonaws.com/templates/east_villa_template.xlsx",
  },
  {
    name: "West Facing Villa",
    downloadUrl: "https://your-s3-bucket.s3.amazonaws.com/templates/west_villa_template.xlsx",
  },
  {
    name: "Clubhouse",
    downloadUrl: "https://your-s3-bucket.s3.amazonaws.com/templates/clubhouse_template.xlsx",
  },
  {
    name: "Apartment",
    downloadUrl: "https://your-s3-bucket.s3.amazonaws.com/templates/apartment_template.xlsx",
  },
];

const TemplateComponent = ({ onClose }) => {
  const handleDownload = (url, name) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name.replace(/ /g, "_")}_template.xlsx`;
    link.click();
  };

  const handleUpload = (event, templateName) => {
    const file = event.target.files[0];
    if (file) {
      console.log(`Uploading file for ${templateName}:`, file.name);
      // 🔁 Call backend API with FormData if needed
    }
  };

  return (
    <Box sx={{ padding: 2, position: "relative" }}>
      {/* Close Button */}
      <Button
        onClick={onClose}
        variant="outlined"
        startIcon={<CloseIcon />}
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          borderColor: "#e53935",
          color: "#e53935",
          fontWeight: "bold",
          borderRadius: "5px",
          textTransform: "none",
          "&:hover": {
            backgroundColor: "#ffebee",
            borderColor: "#c62828",
          },
        }}
      >
        Close
      </Button>

      <Typography variant="h6" sx={{ fontWeight: "bold", mb: 3 }}>
        Templates Excel
      </Typography>

      <Grid container spacing={3}>
        {templateFiles.map((template) => (
          <Grid item xs={12} sm={6} md={3} key={template.name}>
       <Paper
  elevation={3}
  sx={{
    padding: 3,
    height: "220px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: "12px",
  }}
>
  <AiFillFileExcel style={{ fontSize: 50, color: "#4CAF50" }} />
  <Typography
    variant="subtitle1"
    align="center"
    sx={{ fontWeight: 600 }}
  >
    {template.name}
  </Typography>


              <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center">
                <Tooltip title="Download Template">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<DownloadIcon />}
                    sx={{  color: "white" }}
                    onClick={() => handleDownload(template.downloadUrl, template.name)}
                  >
                    Download 
                  </Button>
                </Tooltip>

                <Tooltip title="Upload Filled Sheet">
                  <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    startIcon={<UploadFileIcon />}
                  >
                    Upload
                    <input
                      type="file"
                      hidden
                      accept=".xlsx, .xls"
                      onChange={(e) => handleUpload(e, template.name)}
                    />
                  </Button>
                </Tooltip>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TemplateComponent;