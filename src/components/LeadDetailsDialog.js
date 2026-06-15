// LeadDetailsDialog.js – Full CRM Flow with Dropdowns to Reduce Manual Errors
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Grid,
  Button,
  Chip,
  Divider,
  TextField,
  MenuItem
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const primaryColor = "#1E3A8A";

const interestOptions = ["High", "Moderate", "Low"];
const contactMethods = ["Call", "WhatsApp", "Email"];
const languageOptions = ["English", "Hindi", "Telugu"];
const timePreferences = ["Morning", "Afternoon", "Evening"];
const visitTypes = ["Site Visit", "Online Tour"];
const dropReasons = ["Budget Mismatch", "Location Issue", "Chose Competitor", "No Response", "Other"];

const LeadDetailsDialog = ({ lead, onClose }) => {
  const [editField, setEditField] = useState(null);
  const [form, setForm] = useState({
    ...lead,
    interestLevel: lead.interestLevel || "High",
    decisionBy: lead.decisionBy || "",
    preferredMethod: lead.preferredMethod || "Call",
    language: lead.language || "English",
    bestTime: lead.bestTime || "Morning",
    scheduleVisitOpen: false,
    converted: lead.status === "Converted" ? "Yes" : null,
    conversionLog: lead.logs || [],
    visitSchedules: lead.visitSchedules || [],
    visitType: "Site Visit",
    dropReason: ""
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = () => {
    setEditField(null);
    // TODO: trigger autosave to backend
  };

  const handleScheduleClick = () => {
    setForm((prev) => ({ ...prev, scheduleVisitOpen: true }));
  };

  const handleConvertStatus = (value) => {
    setForm((prev) => ({ ...prev, converted: value }));
  };

  return (
    <Dialog open onClose={onClose} maxWidth="100%" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6">Lead Details – {lead.id}</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ maxHeight: "65vh", overflowY: "auto", mt: 2 }}>

        <Section title="Lead Details">
          <Grid container spacing={2}>
            {['name', 'contact', 'email', 'agent'].map((field) => (
              <Grid key={field} item xs={3}>
                <EditableField
                  label={capitalize(field)}
                  value={form[field]}
                  onChange={(val) => handleChange(field, val)}
                  onBlur={handleBlur}
                  isEditing={editField === field}
                  onFocus={() => setEditField(field)}
                />
              </Grid>
            ))}
          </Grid>
        </Section>

        <Section title="Lead Profile">
          <Grid container spacing={2}>
            {["source", "interestedProjects", "locationPref", "budgetFlex"].map((field) => (
              <Grid key={field} item xs={3}>
                <EditableField
                  label={field.replace(/([A-Z])/g, ' $1')}
                  value={form[field] || ""}
                  onChange={(val) => handleChange(field, val)}
                  onBlur={handleBlur}
                  isEditing={editField === field}
                  onFocus={() => setEditField(field)}
                />
              </Grid>
            ))}
          </Grid>
        </Section>

        <Section title="Communication Preferences">
          <Grid container spacing={2}>
            <Grid item xs={3}><SelectField label="Preferred Method" options={contactMethods} value={form.preferredMethod} onChange={(val) => handleChange("preferredMethod", val)} /></Grid>
            <Grid item xs={3}><SelectField label="Language" options={languageOptions} value={form.language} onChange={(val) => handleChange("language", val)} /></Grid>
            <Grid item xs={3}><SelectField label="Best Time" options={timePreferences} value={form.bestTime} onChange={(val) => handleChange("bestTime", val)} /></Grid>
            <Grid item xs={3}><SelectField label="Interest Level" options={interestOptions} value={form.interestLevel} onChange={(val) => handleChange("interestLevel", val)} /></Grid>
            <Grid item xs={3}><EditableField label="Decision Maker" value={form.decisionBy} onChange={(val) => handleChange("decisionBy", val)} onBlur={handleBlur} isEditing={editField === "decisionBy"} onFocus={() => setEditField("decisionBy")} /></Grid>
          </Grid>
        </Section>

        <Section title="Schedule Visit">
          <Button variant="outlined" onClick={handleScheduleClick}>Schedule Visit</Button>
          {form.scheduleVisitOpen && (
            <Grid container spacing={2} mt={2}>
              <Grid item xs={3}><TextField fullWidth label="Agenda" /></Grid>
              <Grid item xs={3}><TextField fullWidth type="date" label="Date" /></Grid>
              <Grid item xs={3}><TextField fullWidth type="time" label="Time" /></Grid>
              <Grid item xs={3}><TextField fullWidth label="Location" /></Grid>
              <Grid item xs={3}><SelectField label="Type" options={visitTypes} value={form.visitType} onChange={(val) => handleChange("visitType", val)} /></Grid>
              <Grid item xs={3}><TextField fullWidth label="Sales Contact Info" /></Grid>
            </Grid>
          )}
        </Section>

        <Section title="Conversion Progress">
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <TextField
                select
                fullWidth
                label="Converted"
                value={form.converted || ""}
                onChange={(e) => handleConvertStatus(e.target.value)}
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>
            </Grid>
            {form.converted === "No" && (
              <Grid item xs={3}><SelectField label="Reason for Drop" options={dropReasons} value={form.dropReason} onChange={(val) => handleChange("dropReason", val)} /></Grid>
            )}
            <Grid item xs={12} mt={2}>
              <Typography variant="subtitle2">Lead Activity Log</Typography>
              <Box sx={{ height: 200, overflowY: 'auto', mt: 1, background: '#f5f5f5', p: 2, borderRadius: 2 }}>
                {form.conversionLog.map((log, i) => (
                  <Typography key={i} variant="body2">{log}</Typography>
                ))}
              </Box>
            </Grid>
            {form.converted === "Yes" && (
              <Grid item xs={3}><Chip label="Lead Converted" color="success" /></Grid>
            )}
          </Grid>
        </Section>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant="contained" onClick={onClose} sx={{ backgroundColor: primaryColor }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const Section = ({ title, children }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="subtitle1" color={primaryColor} sx={{ mb: 1 }}>{title}</Typography>
    {children}
  </Box>
);

const EditableField = ({ label, value, onChange, onBlur, isEditing, onFocus }) => (
  <TextField
    fullWidth
    label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    onFocus={onFocus}
    variant="outlined"
    size="small"
    sx={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
  />
);

const SelectField = ({ label, options, value, onChange }) => (
  <TextField
    select
    fullWidth
    label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    size="small"
  >
    {options.map((opt) => (
      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
    ))}
  </TextField>
);

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

export default LeadDetailsDialog;
