import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Select,
  MenuItem,
  Button,
  InputLabel,
  FormControl,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const fieldLabelSx = { fontSize: 12, fontWeight: 700, color: "#6B7280", mb: 0.8 };
const filledFieldSx = {
  "& .MuiInputBase-root": {
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
  },
  "& .MuiFilledInput-root:before": { borderBottom: "none" },
  "& .MuiFilledInput-root:after": { borderBottom: "none" },
};

const filledSelectSx = {
  backgroundColor: "#F3F4F6",
  borderRadius: 2,
  "&:before": { borderBottom: "none" },
  "&:after": { borderBottom: "none" },
};

// Updated schema for the employee form (excluding auto-generated fields).
const employeeSchema = [
  {
    name: "first_name",
    label: "First Name",
    type: "text",
    required: true,
    placeholder: "Enter first name",
  },
  {
    name: "last_name",
    label: "Last Name",
    type: "text",
    required: true,
    placeholder: "Enter last name",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "Enter email address",
    pattern: ".+@.+",
    title: "Email should contain the '@' symbol",
  },
  {
    name: "phone_number",
    label: "Phone Number",
    type: "text",
    required: true,
    placeholder: "Enter phone number with country code",
    pattern: "^\\+[0-9]{1,3}[0-9]{10}$",
    title: "Phone number should include country code (e.g., +91XXXXXXXXXX)",
  },
  {
    name: "job_title",
    label: "Job Title",
    type: "select",
    required: true,
    options: [
      { label: "Site Engineer", value: "Site Engineer" },
      { label: "Datso Engineer", value: "Datso Engineer" },
      { label: "Project Manager", value: "Project Manager" },
      { label: "Support Staff", value: "Support Staff" },
      { label: "Sales Manager", value: "Sales Manager" },
      { label: "Accounts", value: "Accounts" },
    ],
  },
  {
    name: "department",
    label: "Department",
    type: "select",
    required: true,
    options: [
      { label: "Construction", value: "Construction" },
      { label: "Design", value: "Design" },
      { label: "Marketing & Sales", value: "Marketing & Sales" },
      { label: "Support Staff", value: "Support Staff" },
      { label: "Management", value: "Management" },
    ],
  },
  {
    name: "hire_date",
    label: "Hire Date",
    type: "date",
    required: true,
  },
  {
    name: "salary",
    label: "Salary",
    type: "number",
    placeholder: "Enter salary",
    step: "0.01",
  },
  {
    name: "manager_id",
    label: "Manager ID",
    type: "text",
    placeholder: "Enter manager ID",
  },
  {
    name: "manager_code",
    label: "Manager Code",
    type: "text",
    placeholder: "Enter manager code",
  },
];

const DynamicEmployeeForm = ({ existingData, onClose, onCancel, embedded = false }) => {
  // Initialize form state using the schema.
  const getInitialState = () =>
    employeeSchema.reduce((acc, field) => {
      acc[field.name] = existingData?.[field.name] || "";
      return acc;
    }, {});

  const [employee, setEmployee] = useState(getInitialState());
  // Use a separate errors state to track validation messages for specific fields.
  const [errors, setErrors] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogType, setDialogType] = useState("success");

  useEffect(() => {
    if (existingData) {
      setEmployee((prev) => ({
        ...prev,
        ...existingData,
      }));
    }
  }, [existingData]);

  const handleChange = (field, value) => {
    setEmployee((prev) => ({ ...prev, [field]: value }));
  };

  // Validate specific fields onBlur.
  const handleBlur = (field, value) => {
    if (field === "email") {
      const emailRegex = /.+@.+/;
      if (!emailRegex.test(value)) {
        setErrors((prev) => ({
          ...prev,
          email: "Email must contain '@mail.com'.",
        }));
      } else {
        setErrors((prev) => ({ ...prev, email: "" }));
      }
    }
    if (field === "phone_number") {
      const phoneRegex = /^\+[0-9]{1,3}[0-9]{10}$/;
      if (!phoneRegex.test(value)) {
        setErrors((prev) => ({
          ...prev,
          phone_number:
            "Phone number must include country code (e.g., +91XXXXXXXXXX).",
        }));
      } else {
        setErrors((prev) => ({ ...prev, phone_number: "" }));
      }
    }
  };

  const handleSubmit = async () => {
    // Validate required fields.
    const missingRequired = employeeSchema.some(
      (field) => field.required && !employee[field.name]
    );
    if (missingRequired) {
      setDialogMessage("Please fill in all required fields.");
      setDialogType("error");
      setDialogOpen(true);
      return;
    }
    // Check if there are any errors from our field validations.
    if (errors.email || errors.phone_number) {
      setDialogMessage("Please fix the errors in the form.");
      setDialogType("error");
      setDialogOpen(true);
      return;
    }

    try {
      const url = existingData
        ? `http://localhost:8080/employees-a/${existingData.employee_id}`
        : "http://localhost:8080/employees-a";
      const method = existingData ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee),
        
      });
      console.log("Submitting data:", employee);


      if (!response.ok) {
        throw new Error("Failed to save employee details.");
      }

      setDialogMessage("Employee details saved successfully.");
      setDialogType("success");
      setDialogOpen(true);
    } catch (error) {
      console.error("Error saving employee:", error);
      setDialogMessage("Error saving employee. Please try again.");
      setDialogType("error");
      setDialogOpen(true);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    if (dialogType === "success") {
      if (onClose) onClose();
      else if (onCancel) onCancel();
    }
  };

  // Render each field based on its schema definition.
  const renderField = (field) => {
    const commonProps = {
      key: field.name,
      value: employee[field.name],
      onChange: (e) => handleChange(field.name, e.target.value),
      onBlur: (e) => handleBlur(field.name, e.target.value),
      fullWidth: true,
      required: field.required,
      placeholder: field.placeholder || "",
      variant: "filled",
      size: "small",
      InputProps: { disableUnderline: true, readOnly: field.readOnly || false },
      inputProps: {
        step: field.step || undefined,
        pattern: field.pattern || undefined,
        title: field.title || undefined,
      },
      error: Boolean(errors[field.name]),
      helperText: errors[field.name] || "",
      sx: filledFieldSx,
    };

    if (field.type === "select") {
      return (
        <Box key={field.name}>
          <Typography sx={fieldLabelSx}>
            {field.label}
            {field.required ? <span style={{ color: "#DC2626" }}>*</span> : null}
          </Typography>
          <FormControl fullWidth required={field.required} variant="filled" size="small" sx={filledFieldSx}>
          <Select
            value={employee[field.name] || ""}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disableUnderline
            displayEmpty
            sx={filledSelectSx}
          >
            <MenuItem value="" disabled>
              Select
            </MenuItem>
            {field.options.map((option, idx) => (
              <MenuItem key={idx} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        </Box>
      );
    } else if (field.type === "date") {
      return (
        <Box key={field.name}>
          <Typography sx={fieldLabelSx}>
            {field.label}
            {field.required ? <span style={{ color: "#DC2626" }}>*</span> : null}
          </Typography>
          <TextField {...commonProps} type="date" InputLabelProps={{ shrink: true }} />
        </Box>
      );
    } else {
      return (
        <Box key={field.name}>
          <Typography sx={fieldLabelSx}>
            {field.label}
            {field.required ? <span style={{ color: "#DC2626" }}>*</span> : null}
          </Typography>
          <TextField {...commonProps} type={field.type} />
        </Box>
      );
    }
  };

  const formBody = (
    <Box sx={{ width: "100%" }}>
      {!embedded && (
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 900, color: "#111827" }}>
            {existingData ? "Edit Employee" : "Add Employee"}
          </Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        {employeeSchema.map((field) => (
          <Grid key={field.name} item xs={12} sm={6}>
            {renderField(field)}
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, gap: 1.2 }}>
        <Button
          variant="outlined"
          onClick={onCancel || onClose}
          sx={{
            height: 36,
            borderRadius: 2,
            borderColor: "#E5E7EB",
            color: "#111827",
            fontWeight: 900,
            textTransform: "none",
            "&:hover": { backgroundColor: "#F9FAFB", borderColor: "#CBD5E1" },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={{
            height: 36,
            borderRadius: 2,
            fontWeight: 900,
            textTransform: "none",
            background: "#111827",
            "&:hover": { background: "#111827" },
          }}
        >
          Save
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      {embedded ? (
        formBody
      ) : (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
          <Card elevation={0} sx={{ width: "100%", maxWidth: "800px" }}>
            <IconButton
              onClick={onClose}
              sx={{
                position: "absolute",
                top: 16,
                right: 16,
                color: "#6B7280",
                "&:hover": { color: "#DC2626" },
              }}
            >
              <CloseIcon />
            </IconButton>
            <CardContent>{formBody}</CardContent>
          </Card>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>{dialogType === "success" ? "Success" : "Error"}</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DynamicEmployeeForm;