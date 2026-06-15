// TemplateSelectionPage.js – Template selection as cards on a separate page
import React from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Chip,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionIcon from "@mui/icons-material/Description";

const TemplateSelectionPage = ({
  templates = [],
  loadingTemplates,
  selectedTemplateId,
  onSelectTemplate,
  onDownloadSample,
  onUpload,
  onViewTemplate,
  onDeleteTemplate,
  onBack,
}) => {
  return (
    <Box sx={{ width: "100%", py: { xs: 1.5, sm: 2 }, px: { xs: 0, sm: 0 }, overflowX: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 700, color: "#111827", letterSpacing: "-0.03em" }}>
            Select a template
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 14 }, color: "#64748b", mt: 0.5 }}>
            Choose an inventory template to use for forecast planning
          </Typography>
        </Box>
        {onBack && (
          <Button size="small" onClick={onBack} sx={{ textTransform: "none", fontWeight: 600, alignSelf: { xs: "flex-start", sm: "center" } }}>
            ← Back
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 1, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onDownloadSample}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Download sample
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onUpload}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Upload template
        </Button>
      </Box>

      {loadingTemplates ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={40} />
        </Box>
      ) : templates.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            border: "1px dashed #e5e7eb",
            borderRadius: 2,
            bgcolor: "#f8fafc",
          }}
        >
          <DescriptionIcon sx={{ fontSize: 48, color: "#94a3b8", mb: 1 }} />
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#475569", mb: 0.5 }}>No templates yet</Typography>
          <Typography sx={{ fontSize: 13, color: "#64748b", mb: 2 }}>
            Upload an Excel file with phases and materials, or download the sample to see the format.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={onUpload} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5c4a" } }}>
              Upload template
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onDownloadSample} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Download sample
            </Button>
          </Box>
        </Paper>
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {templates.map((t) => {
            const id = String(t.template_id ?? t.id ?? "");
            const name = t.template_name ?? t.name ?? `Template ${id}`;
            const isSelected = selectedTemplateId === id;
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={id}>
                <Card
                  elevation={0}
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    overflow: "hidden",
                    bgcolor: isSelected ? "#f0fdf4" : "#fff",
                    borderColor: isSelected ? "#16a34a" : "#e5e7eb",
                    "&:hover": {
                      borderColor: "#16a34a",
                      bgcolor: isSelected ? "#f0fdf4" : "#f8fafc",
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => onSelectTemplate?.(id)}
                    sx={{ height: "100%", display: "block" }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                        <Typography
                          sx={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#111827",
                            flex: 1,
                            lineHeight: 1.3,
                          }}
                        >
                          {name}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                          {onViewTemplate && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewTemplate(id);
                              }}
                              sx={{ color: "#64748b" }}
                              title="View template"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          )}
                          {onDeleteTemplate && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete template "${name}"? This cannot be undone.`)) onDeleteTemplate(id);
                              }}
                              sx={{ color: "#dc2626" }}
                              title="Delete template"
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                        ID: {id}
                      </Typography>
                      {isSelected && (
                        <Chip
                          size="small"
                          label="Selected"
                          color="success"
                          sx={{ mt: 1, fontWeight: 600 }}
                        />
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default TemplateSelectionPage;
