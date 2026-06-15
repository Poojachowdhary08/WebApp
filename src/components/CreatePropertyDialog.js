import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Grid,
  Paper,
  IconButton,
  Divider,
  Chip,
  CircularProgress,
  LinearProgress,
  Alert,
  MenuItem,
  InputAdornment,
  Card,
  CardContent,
  Stack,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import MyLocationOutlinedIcon from "@mui/icons-material/MyLocationOutlined";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import axios from "axios";

const BASE_URL = "http://localhost:8080";

/** Normalize API error detail (string | array of {msg,loc,...} | object) to a single display string */
function apiDetailToString(d) {
  if (d == null) return "";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => (e && typeof e === "object" && e.msg != null ? e.msg : String(e))).join("; ");
  if (typeof d === "object" && d.msg != null) return d.msg;
  return String(d);
}

const steps = ["Basic Information", "Location & Owner", "Floor Configuration", "Structural Information", "Additional Details", "Review & Submit"];

const propertyTypes = ["Residential", "Commercial", "Industrial", "Mixed Use", "Agricultural", "Institutional"];
const propertySubTypes = [
  "Apartment",
  "Villa",
  "House",
  "Office",
  "Shop",
  "Warehouse",
  "Factory",
  "Plot",
  "Farmhouse",
  "Penthouse",
  "Studio",
  "Duplex",
];
const propertyStatuses = [
  "Planning",
  "Not Started",
  "In Progress",
  "On Hold",
  "Completed",
  "Available",
  "Sold",
  "Under Construction",
  "Cancelled",
];
const commonFloorNames = ["GF", "FF", "SF", "TF", "4F", "5F", "6F", "7F", "8F", "9F", "10F", "Basement", "Ground", "First", "Second", "Third", "Fourth", "Fifth"];
const commonDimensions = ["30x40", "25x35", "40x60", "50x80", "20x30", "35x50", "45x70", "60x90", "30x50", "40x50"];

// Structural Information Options
const foundationTypes = ["Raft Foundation", "Isolated Footing", "Combined Footing", "Strip Foundation", "Pile Foundation", "Mat Foundation"];
const columnTypes = ["RCC Column", "Steel Column", "Composite Column", "Precast Column"];
const beamTypes = ["RCC Beam", "Steel Beam", "Composite Beam", "Precast Beam", "Wooden Beam"];
const roofTypes = ["RCC Slab", "Steel Truss", "Precast Slab", "Metal Sheet", "Tiles", "Concrete Tiles"];
const structuralMaterials = ["RCC (Reinforced Concrete)", "Steel Frame", "Composite", "Precast Concrete", "Brick Masonry"];
const seismicZones = ["Zone I", "Zone II", "Zone III", "Zone IV", "Zone V"];
const soilTypes = ["Hard Soil", "Medium Soil", "Soft Soil", "Rocky", "Sandy", "Clayey"];

// Common Indian States
const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli",
  "Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// Finishing Grades
const finishingGrades = ["Basic", "Standard", "Premium", "Luxury", "Custom"];

const CreatePropertyDialog = ({ open, onClose, projectId, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    // Basic Information
    name: "",
    type: "",
    subtype: "",
    dimensions: "",
    budget: "",
    status: "Planning",
    remarks: "",
    construction_area: "",
    number_of_floors: "",
    // Location & Owner
    address: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    gps_coordinates: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    owner_address: "",
    // Floors
    floors: [],
    // Structural Information
    foundation_type: "",
    column_type: "",
    beam_type: "",
    roof_type: "",
    structural_material: "",
    load_bearing_walls: "",
    seismic_zone: "",
    soil_type: "",
    structural_notes: "",
    // Additional Details
    start_date: "",
    expected_completion_date: "",
    project_manager: "",
    architect: "",
    contractor: "",
    building_permit_number: "",
    building_permit_date: "",
    occupancy_certificate: "",
    parking_area: "",
    balcony_area: "",
    terrace_area: "",
    open_area: "",
    front_setback: "",
    back_setback: "",
    left_setback: "",
    right_setback: "",
    plot_area: "",
    built_up_area: "",
    carpet_area: "",
    electrical_specifications: "",
    plumbing_specifications: "",
    hvac_specifications: "",
    finishing_grade: "",
    quality_standards: "",
    additional_notes: "",
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setFormData({
        name: "",
        type: "",
        subtype: "",
        dimensions: "",
        budget: "",
        status: "Planning",
        remarks: "",
        construction_area: "",
        number_of_floors: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        landmark: "",
        gps_coordinates: "",
        owner_name: "",
        owner_phone: "",
        owner_email: "",
        owner_address: "",
        floors: [],
        foundation_type: "",
        column_type: "",
        beam_type: "",
        roof_type: "",
        structural_material: "",
        load_bearing_walls: "",
        seismic_zone: "",
        soil_type: "",
        structural_notes: "",
        start_date: "",
        expected_completion_date: "",
        project_manager: "",
        architect: "",
        contractor: "",
        building_permit_number: "",
        building_permit_date: "",
        occupancy_certificate: "",
        parking_area: "",
        balcony_area: "",
        terrace_area: "",
        open_area: "",
        front_setback: "",
        back_setback: "",
        left_setback: "",
        right_setback: "",
        plot_area: "",
        built_up_area: "",
        carpet_area: "",
        electrical_specifications: "",
        plumbing_specifications: "",
        hvac_specifications: "",
        finishing_grade: "",
        quality_standards: "",
        additional_notes: "",
      });
      setErrors({});
      setSubmitError("");
      setSelectedFiles([]);
      setIsDragging(false);
    }
  }, [open]);

  // Note: Floor initialization is now handled directly in the number_of_floors onChange handler
  // This provides better user experience with immediate feedback

  const getDefaultFloorName = (index) => {
    return commonFloorNames[index] || `Floor ${index + 1}`;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleFloorChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedFloors = prev.floors.map((floor, i) => (i === index ? { ...floor, [field]: value } : floor));
      
      // Calculate construction area from total of all floor brick work areas
      const totalConstructionArea = updatedFloors.reduce((sum, floor) => {
        const regular = parseFloat(floor.brick_work_regular) || 0;
        const customer = parseFloat(floor.brick_work_customer_add_on) || 0;
        const avenue = parseFloat(floor.brick_work_avenue_add_on) || 0;
        return sum + regular + customer + avenue;
      }, 0);
      
      return {
        ...prev,
        floors: updatedFloors,
        construction_area: totalConstructionArea > 0 ? totalConstructionArea.toFixed(2) : "",
      };
    });
  };

  const addFloor = () => {
    const newFloor = {
      floor_name: getDefaultFloorName(formData.floors.length),
      dimensions: formData.dimensions || "",
      wall_height: "",
      slab_area_regular: "",
      brick_work_regular: "",
      plastering_area_regular: "",
      slab_area_customer_add_on: "",
      brick_work_customer_add_on: "",
      plastering_area_customer_add_on: "",
      slab_area_avenue_add_on: "",
      brick_work_avenue_add_on: "",
      plastering_area_avenue_add_on: "",
    };
    setFormData((prev) => ({ ...prev, floors: [...prev.floors, newFloor] }));
  };

  const removeFloor = (index) => {
    setFormData((prev) => ({
      ...prev,
      floors: prev.floors.filter((_, i) => i !== index),
      number_of_floors: prev.floors.length - 1,
    }));
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Property name is required";
    if (!formData.type) newErrors.type = "Property type is required";
    if (!projectId) newErrors.project = "Project ID is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    const numFloors = parseInt(formData.number_of_floors) || 0;
    if (numFloors === 0) {
      newErrors.number_of_floors = "At least one floor is required";
    }
    formData.floors.forEach((floor, index) => {
      if (!floor.floor_name?.trim()) {
        newErrors[`floor_${index}_name`] = "Floor name is required";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!validateStep1()) return;
    } else if (activeStep === 2) {
      if (!validateStep2()) return;
    }
    // Other steps don't require validation (optional fields)
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleStepClick = (stepIndex) => {
    // Allow free navigation to any step
    setActiveStep(stepIndex);
  };

  const parseNumericValue = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const strValue = String(value).trim();
    if (strValue === "") return null;
    const numValue = parseFloat(strValue);
    return isNaN(numValue) ? null : numValue;
  };

  const handleSubmit = async () => {
    setSubmitError("");
    setIsSubmitting(true);

    try {
      // Send projectId as-is (number or string e.g. "LAK_RES_001"); backend resolves it
      const projectIdToSend = (() => {
        const trimmed = String(projectId).trim();
        if (trimmed === "") return projectId;
        const parsed = parseInt(projectId, 10);
        if (!isNaN(parsed) && String(parsed) === trimmed) return parsed;
        return projectId;
      })();

      // Process construction area
      const constructionAreaValue = parseNumericValue(formData.construction_area) || 0;

      // Process floors - Map to backend expected structure
      const processedFloors = formData.floors.map((floor, index) => ({
        floor_name: floor.floor_name || "",
        dimensions: floor.dimensions || "",
        wall_height: parseNumericValue(floor.wall_height),
        floor_order: index,
        // Map regular areas (backend may expect different field names)
        slab_area: parseNumericValue(floor.slab_area_regular) || 0,
        brick_work_area: parseNumericValue(floor.brick_work_regular) || 0,
        plastering_area: parseNumericValue(floor.plastering_area_regular) || 0,
        // Additional areas (customer add-on)
        additional_slab_area: parseNumericValue(floor.slab_area_customer_add_on) || 0,
        additional_brick_work_area: parseNumericValue(floor.brick_work_customer_add_on) || 0,
        additional_plastering_area: parseNumericValue(floor.plastering_area_customer_add_on) || 0,
        // Avenue add-on areas (if backend supports separate field, otherwise add to additional)
        slab_area_avenue_add_on: parseNumericValue(floor.slab_area_avenue_add_on) || 0,
        brick_work_avenue_add_on: parseNumericValue(floor.brick_work_avenue_add_on) || 0,
        plastering_area_avenue_add_on: parseNumericValue(floor.plastering_area_avenue_add_on) || 0,
      }));

      // Prepare request payload
      const requestData = {
        name: formData.name.trim(),
        type: formData.type || "",
        subtype: formData.subtype || "",
        budget: parseNumericValue(formData.budget),
        remarks: formData.remarks || "",
        dimensions: formData.dimensions || "",
        status: formData.status || "Planning",
        construction_area: Number(constructionAreaValue),
        number_of_floors: parseInt(formData.number_of_floors) || formData.floors.length,
        floors: processedFloors,
        // Location & Owner
        address: formData.address || "",
        city: formData.city || "",
        state: formData.state || "",
        pincode: formData.pincode || "",
        landmark: formData.landmark || "",
        gps_coordinates: formData.gps_coordinates || "",
        owner_name: formData.owner_name || "",
        owner_phone: formData.owner_phone || "",
        owner_email: formData.owner_email || "",
        owner_address: formData.owner_address || "",
        // Structural Information
        foundation_type: formData.foundation_type || "",
        column_type: formData.column_type || "",
        beam_type: formData.beam_type || "",
        roof_type: formData.roof_type || "",
        structural_material: formData.structural_material || "",
        load_bearing_walls: formData.load_bearing_walls || "",
        seismic_zone: formData.seismic_zone || "",
        soil_type: formData.soil_type || "",
        structural_notes: formData.structural_notes || "",
        // Additional Details
        start_date: formData.start_date || "",
        expected_completion_date: formData.expected_completion_date || "",
        project_manager: formData.project_manager || "",
        architect: formData.architect || "",
        contractor: formData.contractor || "",
        building_permit_number: formData.building_permit_number || "",
        building_permit_date: formData.building_permit_date || "",
        occupancy_certificate: formData.occupancy_certificate || "",
        plot_area: parseNumericValue(formData.plot_area),
        built_up_area: parseNumericValue(formData.built_up_area),
        carpet_area: parseNumericValue(formData.carpet_area),
        parking_area: parseNumericValue(formData.parking_area),
        balcony_area: parseNumericValue(formData.balcony_area),
        terrace_area: parseNumericValue(formData.terrace_area),
        open_area: parseNumericValue(formData.open_area),
        front_setback: parseNumericValue(formData.front_setback),
        back_setback: parseNumericValue(formData.back_setback),
        left_setback: parseNumericValue(formData.left_setback),
        right_setback: parseNumericValue(formData.right_setback),
        electrical_specifications: formData.electrical_specifications || "",
        plumbing_specifications: formData.plumbing_specifications || "",
        hvac_specifications: formData.hvac_specifications || "",
        finishing_grade: formData.finishing_grade || "",
        quality_standards: formData.quality_standards || "",
        additional_notes: formData.additional_notes || "",
      };

      // Use create_property_dynamic so all form fields (location, structural, floors, etc.) are saved and returned by GET
      const hasFiles = selectedFiles.length > 0;
      const payload = { ...requestData, projectid: projectIdToSend };
      let response;

      try {
        if (hasFiles) {
          const formDataToSend = new FormData();
          formDataToSend.append("data", JSON.stringify(payload));
          formDataToSend.append("projectid", projectIdToSend);
          selectedFiles.forEach((file) => formDataToSend.append("documents", file));
          response = await axios.post(`${BASE_URL}/create_property_dynamic`, formDataToSend, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          response = await axios.post(
            `${BASE_URL}/create_property_dynamic`,
            payload,
            { headers: { "Content-Type": "application/json" } }
          );
        }
      } catch (err) {
        throw err;
      }

      if (response.status === 200 || response.status === 201) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Error creating property:", error?.response?.data || error);
      const detail = error?.response?.data?.detail;
      setSubmitError(
        apiDetailToString(detail) ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create property. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <Box sx={{ py: 2 }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          fontWeight: 800, 
          color: "#111827", 
          fontSize: 26,
          letterSpacing: "-0.02em",
          background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Basic Property Information
      </Typography>

      <Grid container spacing={3}>
        {/* 1. Property Name */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Property Name <Box component="span" sx={{ color: "#dc2626" }}>*</Box>
            </Typography>
            <TextField
              fullWidth
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              placeholder="Enter property name"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        {/* 2. Property Type */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Property Type <Box component="span" sx={{ color: "#dc2626" }}>*</Box>
            </Typography>
            <Autocomplete
              freeSolo
              options={propertyTypes}
              value={formData.type}
              onChange={(event, newValue) => {
                handleChange("type", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("type", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type property type"
                  error={!!errors.type}
                  helperText={errors.type}
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* 3. Sub Type */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Sub Type
            </Typography>
            <Autocomplete
              freeSolo
              options={propertySubTypes}
              value={formData.subtype}
              onChange={(event, newValue) => {
                handleChange("subtype", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("subtype", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="e.g., Apartment, Villa, Office"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* 4. Number of Floors */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Number of Floors <Box component="span" sx={{ color: "#dc2626" }}>*</Box>
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.number_of_floors}
              onChange={(e) => {
                const numFloors = parseInt(e.target.value) || 0;
                handleChange("number_of_floors", e.target.value);
                
                // Intelligently create/update floors array
                if (numFloors > 0) {
                  const currentFloors = formData.floors || [];
                  const newFloors = [];
                  
                  for (let i = 0; i < numFloors; i++) {
                    if (currentFloors[i]) {
                      // Keep existing floor data
                      newFloors.push({
                        ...currentFloors[i],
                        floor_name: currentFloors[i].floor_name || getDefaultFloorName(i),
                        dimensions: currentFloors[i].dimensions || formData.dimensions || "",
                      });
                    } else {
                      // Create new floor with defaults
                      newFloors.push({
                        floor_name: getDefaultFloorName(i),
                        dimensions: formData.dimensions || "",
                        wall_height: "",
                        slab_area_regular: "",
                        brick_work_regular: "",
                        plastering_area_regular: "",
                        slab_area_customer_add_on: "",
                        brick_work_customer_add_on: "",
                        plastering_area_customer_add_on: "",
                        slab_area_avenue_add_on: "",
                        brick_work_avenue_add_on: "",
                        plastering_area_avenue_add_on: "",
                      });
                    }
                  }
                  
                  // Calculate construction area from total floor brick work areas
                  const totalConstructionArea = newFloors.reduce((sum, floor) => {
                    const regular = parseFloat(floor.brick_work_regular) || 0;
                    const customer = parseFloat(floor.brick_work_customer_add_on) || 0;
                    const avenue = parseFloat(floor.brick_work_avenue_add_on) || 0;
                    return sum + regular + customer + avenue;
                  }, 0);
                  
                  setFormData((prev) => ({
                    ...prev,
                    floors: newFloors,
                    construction_area: totalConstructionArea > 0 ? totalConstructionArea.toFixed(2) : "",
                  }));
                } else {
                  setFormData((prev) => ({
                    ...prev,
                    floors: [],
                    construction_area: "",
                  }));
                }
              }}
              error={!!errors.number_of_floors}
              helperText={errors.number_of_floors || `${formData.floors.length} floor${formData.floors.length !== 1 ? "s" : ""} will be configured in the next step`}
              placeholder="Enter number of floors"
              inputProps={{ min: 1, max: 20 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "& fieldset": {
                    borderColor: errors.number_of_floors ? "#dc2626" : "#e5e7eb",
                  },
                  "&:hover fieldset": {
                    borderColor: "#d1d5db",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        {/* 5. Dimensions */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Dimensions
            </Typography>
            <Autocomplete
              freeSolo
              options={commonDimensions}
              value={formData.dimensions}
              onChange={(event, newValue) => {
                const dimValue = newValue || "";
                handleChange("dimensions", dimValue);
                
                // Auto-apply dimensions to all floors that don't have dimensions set
                if (dimValue && formData.floors.length > 0) {
                  setFormData((prev) => ({
                    ...prev,
                    floors: prev.floors.map((floor) => ({
                      ...floor,
                      dimensions: floor.dimensions || dimValue,
                    })),
                  }));
                }
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("dimensions", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="e.g., 30x40"
                  helperText="This will be applied to all floors by default"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* 6. Status */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Status
            </Typography>
            <Autocomplete
              freeSolo
              options={propertyStatuses}
              value={formData.status}
              onChange={(event, newValue) => {
                handleChange("status", newValue || "Planning");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("status", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type status"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* 7. Budget */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Budget (₹)
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.budget}
              onChange={(e) => handleChange("budget", e.target.value)}
              placeholder="Enter budget amount"
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        {/* Construction Area - Manual entry or auto-calculated from Floors */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Construction Area (sq. ft)
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.construction_area}
              onChange={(e) => handleChange("construction_area", e.target.value)}
              placeholder="Enter area or auto-filled from floor brick work"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Enter here or it will be calculated from floor brick work areas in Floor Configuration"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "& fieldset": {
                    borderColor: "#e5e7eb",
                  },
                  "&:hover fieldset": {
                    borderColor: "#d1d5db",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        {/* Remarks - Optional */}
        <Grid item xs={12}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Remarks
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={formData.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              placeholder="Additional notes or comments..."
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep3 = () => (
    <Box sx={{ py: 2, pb: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 800, 
            color: "#111827", 
            fontSize: 26,
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Floor Configuration
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addFloor}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            borderColor: "#2a3663",
            color: "#2a3663",
            "&:hover": { borderColor: "#1E2A48", bgcolor: "#f0f2ff" },
          }}
        >
          Add Floor
        </Button>
      </Box>

      {formData.floors.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            border: "2px dashed #d1d5db",
            borderRadius: 2,
            bgcolor: "#f9fafb",
          }}
        >
          <InfoIcon sx={{ fontSize: 48, color: "#9ca3af", mb: 2 }} />
          <Typography sx={{ color: "#6b7280", fontSize: 16, fontWeight: 600, mb: 1 }}>
            No Floors Configured
          </Typography>
          <Typography sx={{ color: "#9ca3af", fontSize: 14, mb: 3 }}>
            Set the number of floors in Step 1, or click "Add Floor" to manually add floors.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addFloor}
            sx={{
              textTransform: "none",
              bgcolor: "#2a3663",
              "&:hover": { bgcolor: "#1E2A48" },
              borderRadius: 2,
            }}
          >
            Add First Floor
          </Button>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: "75vh",
            overflowY: "auto",
            overflowX: "hidden",
            pr: 1,
            "&::-webkit-scrollbar": { width: 8 },
            "&::-webkit-scrollbar-track": { bgcolor: "#f1f5f9", borderRadius: 4 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "#cbd5e1", borderRadius: 4 },
          }}
        >
          {formData.floors.map((floor, index) => (
            <Card
              key={index}
              elevation={0}
              sx={{
                border: "1px solid #e5e7eb",
                borderRadius: 2,
                bgcolor: "#fff",
                flexShrink: 0,
                "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
              }}
            >
              <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Chip
                      label={`Floor ${index + 1}`}
                      size="small"
                      sx={{ bgcolor: "#e0e7ff", color: "#2a3663", fontWeight: 700 }}
                    />
                    <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#111827" }}>
                      {floor.floor_name || `Floor ${index + 1}`}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => removeFloor(index)}
                    sx={{
                      color: "#dc2626",
                      "&:hover": { bgcolor: "#fee2e2" },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography sx={{ mb: 1, fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        Floor Name <Box component="span" sx={{ color: "#dc2626" }}>*</Box>
                      </Typography>
                      <Autocomplete
                        freeSolo
                        options={commonFloorNames}
                        value={floor.floor_name}
                        onChange={(event, newValue) => {
                          handleFloorChange(index, "floor_name", newValue || "");
                        }}
                        onInputChange={(event, newInputValue) => {
                          handleFloorChange(index, "floor_name", newInputValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder="e.g., GF, FF, SF"
                            error={!!errors[`floor_${index}_name`]}
                            helperText={errors[`floor_${index}_name`]}
                            sx={{
                              bgcolor: "#ffffff",
                              borderRadius: 2,
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                                "& fieldset": {
                                  borderColor: errors[`floor_${index}_name`] ? "#dc2626" : "#e5e7eb",
                                },
                                "&:hover fieldset": {
                                  borderColor: "#d1d5db",
                                },
                                "&.Mui-focused fieldset": {
                                  borderColor: "#dc2626",
                                },
                              },
                            }}
                          />
                        )}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography sx={{ mb: 1, fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        Dimensions
                      </Typography>
                      <Autocomplete
                        freeSolo
                        options={commonDimensions}
                        value={floor.dimensions}
                        onChange={(event, newValue) => {
                          handleFloorChange(index, "dimensions", newValue || "");
                        }}
                        onInputChange={(event, newInputValue) => {
                          handleFloorChange(index, "dimensions", newInputValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder="e.g., 30x40"
                            sx={{
                              bgcolor: "#ffffff",
                              borderRadius: 2,
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                                "& fieldset": {
                                  borderColor: "#e5e7eb",
                                },
                                "&:hover fieldset": {
                                  borderColor: "#d1d5db",
                                },
                                "&.Mui-focused fieldset": {
                                  borderColor: "#dc2626",
                                },
                              },
                            }}
                          />
                        )}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography sx={{ mb: 1, fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        Wall Height <Box component="span" sx={{ color: "#dc2626" }}>*</Box>
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        size="small"
                        value={floor.wall_height}
                        onChange={(e) => handleFloorChange(index, "wall_height", e.target.value)}
                        placeholder="Enter wall height"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">ft</InputAdornment>,
                        }}
                        inputProps={{ min: 0, step: 0.1 }}
                        sx={{
                          bgcolor: "#ffffff",
                          borderRadius: 2,
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            "& fieldset": {
                              borderColor: "#e5e7eb",
                            },
                            "&:hover fieldset": {
                              borderColor: "#d1d5db",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#dc2626",
                            },
                          },
                        }}
                      />
                    </Box>
                  </Grid>

                  {/* Areas table: Slab, Brick Work, Plastering — fully visible, not clipped */}
                  <Grid item xs={12} sx={{ mt: 0.5 }}>
                    <Divider sx={{ my: 1 }} />
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#111827", mb: 0.5 }}>
                      Areas (sq. ft) — Slab, Brick Work & Plastering
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#6b7280", display: "block", mb: 1 }}>
                      Fill all three types below. Construction area = sum of Brick Work (all columns).
                    </Typography>
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 2,
                        overflow: "visible",
                        minHeight: 1,
                      }}
                    >
                      <Table size="small" padding="none" sx={{ tableLayout: "fixed" }}>
                        <TableHead>
                          <TableRow sx={{ bgcolor: "#f8fafc" }}>
                            <TableCell sx={{ fontWeight: 800, fontSize: 12, color: "#374151", width: 128, py: 1 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: 12, color: "#374151", borderLeft: "1px solid #e2e8f0", py: 1 }}>Regular</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: 12, color: "#059669", borderLeft: "1px solid #e2e8f0", py: 1 }}>Customer Add-on</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: 12, color: "#dc2626", borderLeft: "1px solid #e2e8f0", py: 1 }}>Avenue Add-on</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow sx={{ "& td": { verticalAlign: "middle", minHeight: 56, py: 1 } }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#111827", bgcolor: "#fafafa", width: 128 }}>Slab (sq.ft)</TableCell>
                            <TableCell sx={{ borderLeft: "1px solid #e2e8f0", px: 1 }}>
                              <TextField fullWidth size="small" type="number" value={floor.slab_area_regular || ""} onChange={(e) => handleFloorChange(index, "slab_area_regular", e.target.value)} placeholder="0" inputProps={{ min: 0, step: 0.01 }} variant="outlined" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: "#fff" } }} />
                            </TableCell>
                            <TableCell sx={{ borderLeft: "1px solid #e2e8f0", px: 1 }}>
                              <TextField fullWidth size="small" type="number" value={floor.slab_area_customer_add_on || ""} onChange={(e) => handleFloorChange(index, "slab_area_customer_add_on", e.target.value)} placeholder="0" inputProps={{ min: 0, step: 0.01 }} variant="outlined" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: "#fff" } }} />
                            </TableCell>
                            <TableCell sx={{ borderLeft: "1px solid #e2e8f0", px: 1 }}>
                              <TextField fullWidth size="small" type="number" value={floor.slab_area_avenue_add_on || ""} onChange={(e) => handleFloorChange(index, "slab_area_avenue_add_on", e.target.value)} placeholder="0" inputProps={{ min: 0, step: 0.01 }} variant="outlined" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: "#fff" } }} />
                            </TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: "#fafafa", "& td": { verticalAlign: "middle", minHeight: 56, py: 1 } }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#111827", width: 128 }}>Brick Work (sq.ft)</TableCell>
                            <TableCell sx={{ borderLeft: "1px solid #e2e8f0", px: 1 }}>
                              <TextField fullWidth size="small" type="number" value={floor.brick_work_regular || ""} onChange={(e) => handleFloorChange(index, "brick_work_regular", e.target.value)} placeholder="0" inputProps={{ min: 0, step: 0.01 }} variant="outlined" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: "#fff" } }} />
                            </TableCell>
                            <TableCell sx={{ borderLeft: "1px solid #e2e8f0", px: 1 }}>
                              <TextField fullWidth size="small" type="number" value={floor.brick_work_customer_add_on || ""} onChange={(e) => handleFloorChange(index, "brick_work_customer_add_on", e.target.value)} placeholder="0" inputProps={{ min: 0, step: 0.01 }} variant="outlined" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: "#fff" } }} />
                            </TableCell>
                            <TableCell sx={{ borderLeft: "1px solid #e2e8f0", px: 1 }}>
                              <TextField fullWidth size="small" type="number" value={floor.brick_work_avenue_add_on || ""} onChange={(e) => handleFloorChange(index, "brick_work_avenue_add_on", e.target.value)} placeholder="0" inputProps={{ min: 0, step: 0.01 }} variant="outlined" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: "#fff" } }} />
                            </TableCell>
                          </TableRow>
                          <TableRow sx={{ "& td": { verticalAlign: "middle", minHeight: 56, py: 1 } }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#111827", bgcolor: "#fafafa", width: 128 }}>Plastering (sq.ft)</TableCell>
                            <TableCell sx={{ borderLeft: "1px solid #e2e8f0", px: 1 }}>
                              <TextField fullWidth size="small" type="number" value={floor.plastering_area_regular || ""} onChange={(e) => handleFloorChange(index, "plastering_area_regular", e.target.value)} placeholder="0" inputProps={{ min: 0, step: 0.01 }} variant="outlined" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: "#fff" } }} />
                            </TableCell>
                            <TableCell sx={{ borderLeft: "1px solid #e2e8f0", px: 1 }}>
                              <TextField fullWidth size="small" type="number" value={floor.plastering_area_customer_add_on || ""} onChange={(e) => handleFloorChange(index, "plastering_area_customer_add_on", e.target.value)} placeholder="0" inputProps={{ min: 0, step: 0.01 }} variant="outlined" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: "#fff" } }} />
                            </TableCell>
                            <TableCell sx={{ borderLeft: "1px solid #e2e8f0", px: 1 }}>
                              <TextField fullWidth size="small" type="number" value={floor.plastering_area_avenue_add_on || ""} onChange={(e) => handleFloorChange(index, "plastering_area_avenue_add_on", e.target.value)} placeholder="0" inputProps={{ min: 0, step: 0.01 }} variant="outlined" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: "#fff" } }} />
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );

  const renderStep2 = () => (
    <Box sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          fontWeight: 800, 
          color: "#111827", 
          fontSize: 26,
          letterSpacing: "-0.02em",
          background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Location & Owner Information
      </Typography>

      <Grid container spacing={3}>
        {/* Location Section */}
        <Grid item xs={12}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
            Property Location
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Address
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Enter complete property address"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              City
            </Typography>
            <Autocomplete
              freeSolo
              options={[]}
              value={formData.city}
              onChange={(event, newValue) => {
                handleChange("city", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("city", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Enter city"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              State
            </Typography>
            <Autocomplete
              freeSolo
              options={indianStates}
              value={formData.state}
              onChange={(event, newValue) => {
                handleChange("state", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("state", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type state"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Pincode
            </Typography>
            <TextField
              fullWidth
              value={formData.pincode}
              onChange={(e) => handleChange("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit pincode"
              inputProps={{ maxLength: 6 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Landmark
            </Typography>
            <TextField
              fullWidth
              value={formData.landmark}
              onChange={(e) => handleChange("landmark", e.target.value)}
              placeholder="e.g., Near Metro Station, Opposite Park"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              GPS Coordinates
            </Typography>
            <TextField
              fullWidth
              value={formData.gps_coordinates}
              onChange={(e) => handleChange("gps_coordinates", e.target.value)}
              placeholder="e.g., 12.9716° N, 77.5946° E"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" sx={{ color: "#6b7280" }}>
                      <MyLocationOutlinedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        {/* Owner Section */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
            Owner/Client Information
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Owner Name
            </Typography>
            <TextField
              fullWidth
              value={formData.owner_name}
              onChange={(e) => handleChange("owner_name", e.target.value)}
              placeholder="Enter owner/client name"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Owner Phone
            </Typography>
            <TextField
              fullWidth
              value={formData.owner_phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                handleChange("owner_phone", value);
                // Validate phone format
                if (value && value.length === 10) {
                  setErrors((prev) => ({ ...prev, owner_phone: "" }));
                } else if (value && value.length < 10) {
                  setErrors((prev) => ({ ...prev, owner_phone: "Phone number must be 10 digits" }));
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value && value.length !== 10) {
                  setErrors((prev) => ({ ...prev, owner_phone: "Phone number must be 10 digits" }));
                }
              }}
              placeholder="Enter 10-digit phone number"
              inputProps={{ maxLength: 10 }}
              error={!!errors.owner_phone}
              helperText={errors.owner_phone}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "& fieldset": {
                    borderColor: errors.owner_phone ? "#dc2626" : "#e5e7eb",
                  },
                  "&:hover fieldset": {
                    borderColor: "#d1d5db",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Owner Email
            </Typography>
            <TextField
              fullWidth
              type="email"
              value={formData.owner_email}
              onChange={(e) => {
                const value = e.target.value;
                handleChange("owner_email", value);
                // Validate email format
                if (value) {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(value)) {
                    setErrors((prev) => ({ ...prev, owner_email: "Invalid email format" }));
                  } else {
                    setErrors((prev) => ({ ...prev, owner_email: "" }));
                  }
                } else {
                  setErrors((prev) => ({ ...prev, owner_email: "" }));
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value) {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(value)) {
                    setErrors((prev) => ({ ...prev, owner_email: "Invalid email format" }));
                  }
                }
              }}
              placeholder="Enter email address"
              error={!!errors.owner_email}
              helperText={errors.owner_email}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "& fieldset": {
                    borderColor: errors.owner_email ? "#dc2626" : "#e5e7eb",
                  },
                  "&:hover fieldset": {
                    borderColor: "#d1d5db",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Owner Address
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={formData.owner_address}
              onChange={(e) => handleChange("owner_address", e.target.value)}
              placeholder="Enter owner address (if different)"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep4 = () => (
    <Box sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          fontWeight: 800, 
          color: "#111827", 
          fontSize: 26,
          letterSpacing: "-0.02em",
          background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Structural Information
      </Typography>

      <Grid container spacing={3}>
        {/* Foundation Type */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Foundation Type
            </Typography>
            <Autocomplete
              freeSolo
              options={foundationTypes}
              value={formData.foundation_type}
              onChange={(event, newValue) => {
                handleChange("foundation_type", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("foundation_type", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type foundation type"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* Column Type */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Column Type
            </Typography>
            <Autocomplete
              freeSolo
              options={columnTypes}
              value={formData.column_type}
              onChange={(event, newValue) => {
                handleChange("column_type", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("column_type", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type column type"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* Beam Type */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Beam Type
            </Typography>
            <Autocomplete
              freeSolo
              options={beamTypes}
              value={formData.beam_type}
              onChange={(event, newValue) => {
                handleChange("beam_type", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("beam_type", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type beam type"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* Roof Type */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Roof Type
            </Typography>
            <Autocomplete
              freeSolo
              options={roofTypes}
              value={formData.roof_type}
              onChange={(event, newValue) => {
                handleChange("roof_type", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("roof_type", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type roof type"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* Structural Material */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Structural Material
            </Typography>
            <Autocomplete
              freeSolo
              options={structuralMaterials}
              value={formData.structural_material}
              onChange={(event, newValue) => {
                handleChange("structural_material", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("structural_material", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type structural material"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* Load Bearing Walls */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Load Bearing Walls
            </Typography>
            <Autocomplete
              freeSolo
              options={["Yes", "No", "Partial", "Frame Structure"]}
              value={formData.load_bearing_walls}
              onChange={(event, newValue) => {
                handleChange("load_bearing_walls", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("load_bearing_walls", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* Seismic Zone */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Seismic Zone
            </Typography>
            <Autocomplete
              freeSolo
              options={seismicZones}
              value={formData.seismic_zone}
              onChange={(event, newValue) => {
                handleChange("seismic_zone", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("seismic_zone", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type seismic zone"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* Soil Type */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Soil Type
            </Typography>
            <Autocomplete
              freeSolo
              options={soilTypes}
              value={formData.soil_type}
              onChange={(event, newValue) => {
                handleChange("soil_type", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("soil_type", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type soil type"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* Structural Notes */}
        <Grid item xs={12}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Structural Notes
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={formData.structural_notes}
              onChange={(e) => handleChange("structural_notes", e.target.value)}
              placeholder="Additional structural information, specifications, or notes..."
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep5 = () => (
    <Box sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          fontWeight: 800, 
          color: "#111827", 
          fontSize: 26,
          letterSpacing: "-0.02em",
          background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Additional Details
      </Typography>

      <Grid container spacing={3}>
        {/* Timeline Section */}
        <Grid item xs={12}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
            Project Timeline
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Start Date
            </Typography>
            <TextField
              fullWidth
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayIcon sx={{ color: "#6b7280", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Expected Completion Date
            </Typography>
            <TextField
              fullWidth
              type="date"
              value={formData.expected_completion_date}
              onChange={(e) => handleChange("expected_completion_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayIcon sx={{ color: "#6b7280", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        {/* Team Section */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
            Project Team
          </Typography>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Project Manager
            </Typography>
            <TextField
              fullWidth
              value={formData.project_manager}
              onChange={(e) => handleChange("project_manager", e.target.value)}
              placeholder="Enter project manager name"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Architect
            </Typography>
            <TextField
              fullWidth
              value={formData.architect}
              onChange={(e) => handleChange("architect", e.target.value)}
              placeholder="Enter architect name"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Contractor
            </Typography>
            <TextField
              fullWidth
              value={formData.contractor}
              onChange={(e) => handleChange("contractor", e.target.value)}
              placeholder="Enter contractor name"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        {/* Compliance Section */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
            Compliance & Permits
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Building Permit Number
            </Typography>
            <TextField
              fullWidth
              value={formData.building_permit_number}
              onChange={(e) => handleChange("building_permit_number", e.target.value)}
              placeholder="Enter permit number"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Building Permit Date
            </Typography>
            <TextField
              fullWidth
              type="date"
              value={formData.building_permit_date}
              onChange={(e) => handleChange("building_permit_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayIcon sx={{ color: "#6b7280", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Occupancy Certificate
            </Typography>
            <Autocomplete
              freeSolo
              options={["Yes", "No", "Applied", "Pending"]}
              value={formData.occupancy_certificate}
              onChange={(event, newValue) => {
                handleChange("occupancy_certificate", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("occupancy_certificate", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type status"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        {/* Additional Areas Section */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
            Additional Areas (sq. ft)
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Plot Area
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.plot_area}
              onChange={(e) => handleChange("plot_area", e.target.value)}
              placeholder="Enter plot area"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Built-up Area
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.built_up_area}
              onChange={(e) => handleChange("built_up_area", e.target.value)}
              placeholder="Enter built-up area"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Carpet Area
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.carpet_area}
              onChange={(e) => handleChange("carpet_area", e.target.value)}
              placeholder="Enter carpet area"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Parking Area
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.parking_area}
              onChange={(e) => handleChange("parking_area", e.target.value)}
              placeholder="Enter parking area"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Balcony Area
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.balcony_area}
              onChange={(e) => handleChange("balcony_area", e.target.value)}
              placeholder="Enter balcony area"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Terrace Area
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.terrace_area}
              onChange={(e) => handleChange("terrace_area", e.target.value)}
              placeholder="Enter terrace area"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Open Area
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.open_area}
              onChange={(e) => handleChange("open_area", e.target.value)}
              placeholder="Enter open area"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        {/* Setbacks Section */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
            Setback Areas (sq. ft)
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Front Setback
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.front_setback}
              onChange={(e) => handleChange("front_setback", e.target.value)}
              placeholder="Enter front setback"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Back Setback
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.back_setback}
              onChange={(e) => handleChange("back_setback", e.target.value)}
              placeholder="Enter back setback"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Left Setback
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.left_setback}
              onChange={(e) => handleChange("left_setback", e.target.value)}
              placeholder="Enter left setback"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Right Setback
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={formData.right_setback}
              onChange={(e) => handleChange("right_setback", e.target.value)}
              placeholder="Enter right setback"
              InputProps={{
                endAdornment: <InputAdornment position="end">sq. ft</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        {/* Specifications Section */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
            Specifications & Quality
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Finishing Grade
            </Typography>
            <Autocomplete
              freeSolo
              options={finishingGrades}
              value={formData.finishing_grade}
              onChange={(event, newValue) => {
                handleChange("finishing_grade", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleChange("finishing_grade", newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type finishing grade"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "& fieldset": {
                        borderColor: "#e5e7eb",
                      },
                      "&:hover fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc2626",
                      },
                    },
                  }}
                />
              )}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Quality Standards
            </Typography>
            <TextField
              fullWidth
              value={formData.quality_standards}
              onChange={(e) => handleChange("quality_standards", e.target.value)}
              placeholder="e.g., IS 456, IS 800, BIS Standards"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Electrical Specifications
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={formData.electrical_specifications}
              onChange={(e) => handleChange("electrical_specifications", e.target.value)}
              placeholder="e.g., 3-phase, 15kW load, MCB type"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Plumbing Specifications
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={formData.plumbing_specifications}
              onChange={(e) => handleChange("plumbing_specifications", e.target.value)}
              placeholder="e.g., CPVC pipes, water tank capacity"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              HVAC Specifications
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={formData.hvac_specifications}
              onChange={(e) => handleChange("hvac_specifications", e.target.value)}
              placeholder="e.g., Central AC, Split units, capacity"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box>
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Additional Notes
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={formData.additional_notes}
              onChange={(e) => handleChange("additional_notes", e.target.value)}
              placeholder="Any additional information, special requirements, or notes..."
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#dc2626",
                    borderWidth: "2px",
                    boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.1)",
                  },
                },
              }}
            />
          </Box>
        </Grid>

        {/* Documents Section */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
            Property Documents
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
              const files = Array.from(e.dataTransfer.files);
              setSelectedFiles((prev) => [...prev, ...files]);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            sx={{
              border: `2px dashed ${isDragging ? "#dc2626" : "#e5e7eb"}`,
              borderRadius: 2,
              p: 3,
              textAlign: "center",
              bgcolor: isDragging ? "#fef2f2" : "#f9fafb",
              cursor: "pointer",
              transition: "all 0.3s ease",
              "&:hover": {
                borderColor: "#dc2626",
                bgcolor: "#fef2f2",
              },
            }}
          >
            <input
              type="file"
              multiple
              id="file-upload"
              style={{ display: "none" }}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setSelectedFiles((prev) => [...prev, ...files]);
              }}
            />
            <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
              <CloudUploadIcon sx={{ fontSize: 40, color: "#6b7280", mb: 1 }} />
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827", mb: 0.5 }}>
                Click to upload or drag and drop
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#6b7280" }}>
                Property plans, permits, photos, certificates (PDF, JPG, PNG)
              </Typography>
            </label>
          </Box>
        </Grid>

        {selectedFiles.length > 0 && (
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827", mb: 1 }}>
                Selected Files ({selectedFiles.length})
              </Typography>
              <Stack spacing={1}>
                {selectedFiles.map((file, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      bgcolor: "#ffffff",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <DescriptionIcon sx={{ color: "#6b7280", fontSize: 24 }} />
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                          {file.name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "#6b7280" }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
                      }}
                      sx={{ color: "#dc2626" }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                ))}
              </Stack>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderStep6 = () => {
    const totalFloors = formData.floors.length;
    const floorsWithWallHeight = formData.floors.filter((f) => f.wall_height).length;
    
    // Calculate completion percentage
    const requiredFields = [
      formData.name,
      formData.type,
      formData.number_of_floors,
      formData.floors.length > 0,
    ];
    const completedFields = requiredFields.filter(Boolean).length;
    const completionPercentage = (completedFields / requiredFields.length) * 100;
    
    // Calculate area statistics
    const totalSlabArea = formData.floors.reduce((sum, floor) => {
      const regular = parseFloat(floor.slab_area_regular) || 0;
      const customer = parseFloat(floor.slab_area_customer_add_on) || 0;
      const avenue = parseFloat(floor.slab_area_avenue_add_on) || 0;
      return sum + regular + customer + avenue;
    }, 0);
    
    const totalBrickWork = formData.floors.reduce((sum, floor) => {
      const regular = parseFloat(floor.brick_work_regular) || 0;
      const customer = parseFloat(floor.brick_work_customer_add_on) || 0;
      const avenue = parseFloat(floor.brick_work_avenue_add_on) || 0;
      return sum + regular + customer + avenue;
    }, 0);
    
    const totalPlastering = formData.floors.reduce((sum, floor) => {
      const regular = parseFloat(floor.plastering_area_regular) || 0;
      const customer = parseFloat(floor.plastering_area_customer_add_on) || 0;
      const avenue = parseFloat(floor.plastering_area_avenue_add_on) || 0;
      return sum + regular + customer + avenue;
    }, 0);

    return (
      <Box sx={{ py: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 4, 
            fontWeight: 800, 
            color: "#111827", 
            fontSize: 26,
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Review & Submit
        </Typography>

        {/* Visual Progress Indicator */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3.5, 
            mb: 3, 
            border: "1px solid #e2e8f0", 
            borderRadius: 3, 
            bgcolor: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>
              Form Completion
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>
              {Math.round(completionPercentage)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completionPercentage}
            sx={{
              height: 12,
              borderRadius: 6,
              bgcolor: "#f1f5f9",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 6,
                background: "linear-gradient(90deg, #dc2626 0%, #ef4444 100%)",
                boxShadow: "0 2px 8px rgba(220, 38, 38, 0.4)",
              },
            }}
          />
        </Paper>

        {/* Visual Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0} 
              sx={{ 
                border: "1px solid #e2e8f0", 
                borderRadius: 3, 
                bgcolor: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
                  borderColor: "#cbd5e1",
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 600, mb: 1.5, letterSpacing: "0.02em" }}>
                  Total Floors
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                  {totalFloors}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0} 
              sx={{ 
                border: "1px solid #e2e8f0", 
                borderRadius: 3, 
                bgcolor: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
                  borderColor: "#cbd5e1",
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 600, mb: 1.5, letterSpacing: "0.02em" }}>
                  Construction Area
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#dc2626", letterSpacing: "-0.02em" }}>
                  {formData.construction_area ? `${parseFloat(formData.construction_area).toLocaleString()}` : "0"} sq. ft
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0} 
              sx={{ 
                border: "1px solid #e2e8f0", 
                borderRadius: 3, 
                bgcolor: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
                  borderColor: "#cbd5e1",
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 600, mb: 1.5, letterSpacing: "0.02em" }}>
                  Budget
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                  {formData.budget ? `₹${parseFloat(formData.budget).toLocaleString()}` : "—"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0} 
              sx={{ 
                border: "1px solid #e2e8f0", 
                borderRadius: 3, 
                bgcolor: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
                  borderColor: "#cbd5e1",
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 600, mb: 1.5, letterSpacing: "0.02em" }}>
                  Documents
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                  {selectedFiles.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Area Distribution Visualization */}
        {(totalSlabArea > 0 || totalBrickWork > 0 || totalPlastering > 0) && (
          <Paper elevation={0} sx={{ p: 3, mb: 3, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
              Area Distribution (sq. ft)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography sx={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
                      Slab Area
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                      {totalSlabArea.toLocaleString()}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={totalSlabArea > 0 ? Math.min(100, (totalSlabArea / (totalSlabArea + totalBrickWork + totalPlastering)) * 100) : 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "#e5e7eb",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 4,
                        bgcolor: "#3b82f6",
                      },
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography sx={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
                      Brick Work
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                      {totalBrickWork.toLocaleString()}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={totalBrickWork > 0 ? Math.min(100, (totalBrickWork / (totalSlabArea + totalBrickWork + totalPlastering)) * 100) : 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "#e5e7eb",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 4,
                        bgcolor: "#dc2626",
                      },
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography sx={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
                      Plastering
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                      {totalPlastering.toLocaleString()}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={totalPlastering > 0 ? Math.min(100, (totalPlastering / (totalSlabArea + totalBrickWork + totalPlastering)) * 100) : 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "#e5e7eb",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 4,
                        bgcolor: "#16a34a",
                      },
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Please review all information before submitting. You can go back to make changes.
        </Alert>

        {/* Basic Information Summary */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3.5, 
            mb: 3, 
            border: "1px solid #e2e8f0", 
            borderRadius: 3,
            bgcolor: "#ffffff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            transition: "all 0.2s ease",
            "&:hover": {
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            },
          }}
        >
          <Typography sx={{ fontSize: 17, fontWeight: 800, color: "#111827", mb: 2.5, letterSpacing: "-0.01em" }}>
            Basic Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Property Name</Typography>
              <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.name || "—"}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Type</Typography>
              <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.type || "—"}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Sub Type</Typography>
              <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>
                {formData.subtype || "—"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Dimensions</Typography>
              <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>
                {formData.dimensions || "—"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Construction Area</Typography>
              <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>
                {formData.construction_area ? `${formData.construction_area} sq. ft` : "—"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Number of Floors</Typography>
              <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>
                {formData.number_of_floors || "—"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Budget</Typography>
              <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>
                {formData.budget ? `₹ ${parseFloat(formData.budget).toLocaleString()}` : "—"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Status</Typography>
              <Chip
                label={formData.status}
                size="small"
                sx={{
                  bgcolor: "#e0e7ff",
                  color: "#2a3663",
                  fontWeight: 600,
                  mt: 0.5,
                }}
              />
            </Grid>
            {formData.remarks && (
              <Grid item xs={12}>
                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Remarks</Typography>
                <Typography sx={{ fontSize: 14, color: "#111827" }}>{formData.remarks}</Typography>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Location & Owner Summary */}
        {(formData.address || formData.city || formData.state || formData.owner_name) && (
          <Paper elevation={0} sx={{ p: 3, mb: 3, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
              Location & Owner Information
            </Typography>
            <Grid container spacing={2}>
              {formData.address && (
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Address</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827" }}>{formData.address}</Typography>
                </Grid>
              )}
              {(formData.city || formData.state || formData.pincode) && (
                <Grid item xs={12} sm={4}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>City</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.city || "—"}</Typography>
                </Grid>
              )}
              {(formData.city || formData.state || formData.pincode) && (
                <Grid item xs={12} sm={4}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>State</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.state || "—"}</Typography>
                </Grid>
              )}
              {(formData.city || formData.state || formData.pincode) && (
                <Grid item xs={12} sm={4}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Pincode</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.pincode || "—"}</Typography>
                </Grid>
              )}
              {formData.landmark && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Landmark</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827" }}>{formData.landmark}</Typography>
                </Grid>
              )}
              {formData.gps_coordinates && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>GPS Coordinates</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827" }}>{formData.gps_coordinates}</Typography>
                </Grid>
              )}
              {formData.owner_name && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Owner Name</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.owner_name}</Typography>
                </Grid>
              )}
              {formData.owner_phone && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Owner Phone</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827" }}>{formData.owner_phone}</Typography>
                </Grid>
              )}
              {formData.owner_email && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Owner Email</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827" }}>{formData.owner_email}</Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Structural Information Summary */}
        {(formData.foundation_type || formData.column_type || formData.beam_type || formData.roof_type || formData.structural_material || formData.seismic_zone || formData.soil_type) && (
          <Paper elevation={0} sx={{ p: 3, mb: 3, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
              Structural Information
            </Typography>
            <Grid container spacing={2}>
              {formData.foundation_type && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Foundation Type</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.foundation_type}</Typography>
                </Grid>
              )}
              {formData.column_type && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Column Type</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.column_type}</Typography>
                </Grid>
              )}
              {formData.beam_type && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Beam Type</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.beam_type}</Typography>
                </Grid>
              )}
              {formData.roof_type && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Roof Type</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.roof_type}</Typography>
                </Grid>
              )}
              {formData.structural_material && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Structural Material</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.structural_material}</Typography>
                </Grid>
              )}
              {formData.load_bearing_walls && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Load Bearing Walls</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.load_bearing_walls}</Typography>
                </Grid>
              )}
              {formData.seismic_zone && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Seismic Zone</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.seismic_zone}</Typography>
                </Grid>
              )}
              {formData.soil_type && (
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Soil Type</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.soil_type}</Typography>
                </Grid>
              )}
              {formData.structural_notes && (
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Structural Notes</Typography>
                  <Typography sx={{ fontSize: 14, color: "#111827" }}>{formData.structural_notes}</Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Additional Details Summary */}
        {(formData.start_date || formData.expected_completion_date || formData.project_manager || formData.architect || formData.contractor || formData.building_permit_number || formData.plot_area || formData.parking_area) && (
          <Paper elevation={0} sx={{ p: 3, mb: 3, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 2 }}>
              Additional Details
            </Typography>
            <Grid container spacing={2}>
              {(formData.start_date || formData.expected_completion_date) && (
                <>
                  {formData.start_date && (
                    <Grid item xs={12} sm={6}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Start Date</Typography>
                      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>
                        {new Date(formData.start_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                  {formData.expected_completion_date && (
                    <Grid item xs={12} sm={6}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Expected Completion</Typography>
                      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>
                        {new Date(formData.expected_completion_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                </>
              )}
              {(formData.project_manager || formData.architect || formData.contractor) && (
                <>
                  {formData.project_manager && (
                    <Grid item xs={12} sm={4}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Project Manager</Typography>
                      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.project_manager}</Typography>
                    </Grid>
                  )}
                  {formData.architect && (
                    <Grid item xs={12} sm={4}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Architect</Typography>
                      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.architect}</Typography>
                    </Grid>
                  )}
                  {formData.contractor && (
                    <Grid item xs={12} sm={4}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Contractor</Typography>
                      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.contractor}</Typography>
                    </Grid>
                  )}
                </>
              )}
              {(formData.building_permit_number || formData.occupancy_certificate) && (
                <>
                  {formData.building_permit_number && (
                    <Grid item xs={12} sm={6}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Building Permit</Typography>
                      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.building_permit_number}</Typography>
                    </Grid>
                  )}
                  {formData.occupancy_certificate && (
                    <Grid item xs={12} sm={6}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Occupancy Certificate</Typography>
                      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.occupancy_certificate}</Typography>
                    </Grid>
                  )}
                </>
              )}
              {(formData.plot_area || formData.built_up_area || formData.carpet_area || formData.parking_area) && (
                <>
                  {formData.plot_area && (
                    <Grid item xs={12} sm={3}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Plot Area</Typography>
                      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.plot_area} sq. ft</Typography>
                    </Grid>
                  )}
                  {formData.built_up_area && (
                    <Grid item xs={12} sm={3}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Built-up Area</Typography>
                      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.built_up_area} sq. ft</Typography>
                    </Grid>
                  )}
                  {formData.carpet_area && (
                    <Grid item xs={12} sm={3}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Carpet Area</Typography>
                      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.carpet_area} sq. ft</Typography>
                    </Grid>
                  )}
                  {formData.parking_area && (
                    <Grid item xs={12} sm={3}>
                      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Parking Area</Typography>
                      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{formData.parking_area} sq. ft</Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Paper>
        )}

        {/* Floors Summary */}
        <Paper elevation={0} sx={{ p: 3, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
              Floor Configuration
            </Typography>
            <Chip
              label={`${totalFloors} Floor${totalFloors !== 1 ? "s" : ""}`}
              size="small"
              sx={{ bgcolor: "#e0e7ff", color: "#2a3663", fontWeight: 700 }}
            />
          </Box>

          {totalFloors === 0 ? (
            <Typography sx={{ color: "#9ca3af", fontSize: 14, fontStyle: "italic" }}>
              No floors configured
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {formData.floors.map((floor, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    bgcolor: "#f9fafb",
                    borderRadius: 1,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                      {floor.floor_name || `Floor ${index + 1}`}
                    </Typography>
                    {floor.wall_height && (
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                        label={`Wall Height: ${floor.wall_height} ft`}
                        size="small"
                        sx={{ bgcolor: "#d1fae5", color: "#065f46", fontSize: 11 }}
                      />
                    )}
                  </Box>
                  <Grid container spacing={1}>
                    <Grid item xs={6} sm={3}>
                      <Typography sx={{ fontSize: 11, color: "#6b7280" }}>Dimensions</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{floor.dimensions || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography sx={{ fontSize: 11, color: "#6b7280" }}>Slab Area</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                        {floor.slab_area_regular || "0"} sq. ft
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography sx={{ fontSize: 11, color: "#6b7280" }}>Brick Work</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                        {floor.brick_work_regular || "0"} sq. ft
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography sx={{ fontSize: 11, color: "#6b7280" }}>Plastering</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                        {floor.plastering_area_regular || "0"} sq. ft
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {submitError && (
          <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
            {submitError}
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          maxHeight: "95vh",
          boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.05)",
          overflow: "hidden",
        },
      }}
    >
      {/* Header - Modern Gradient */}
      <Box
        sx={{
          px: 4,
          py: 3,
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 800, 
            color: "#ffffff", 
            fontSize: 22,
            letterSpacing: "-0.02em",
          }}
        >
          Create New Property
        </Typography>
        <IconButton 
          onClick={onClose} 
          size="small" 
          sx={{ 
            color: "#ffffff", 
            bgcolor: "rgba(255,255,255,0.1)",
            "&:hover": { 
              bgcolor: "rgba(255,255,255,0.2)",
              transform: "scale(1.05)",
            },
            transition: "all 0.2s ease",
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Stepper - Modern with Red Accent - Clickable */}
      <Box 
        sx={{ 
          px: 4, 
          py: 3.5, 
          bgcolor: "#ffffff", 
          borderBottom: "1px solid #f1f5f9",
          background: "linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-around", alignItems: "center", position: "relative" }}>
          {steps.map((label, index) => (
            <Box
              key={label}
              onClick={() => handleStepClick(index)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                position: "relative",
                cursor: "pointer",
                px: 2.5,
                py: 1.5,
                borderRadius: 3,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  bgcolor: activeStep === index ? "transparent" : "rgba(220, 38, 38, 0.04)",
                  transform: activeStep === index ? "none" : "translateY(-2px)",
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: activeStep === index ? 800 : 500,
                  color: activeStep === index ? "#dc2626" : "#9ca3af",
                  mb: 1.5,
                  transition: "all 0.3s ease",
                  userSelect: "none",
                  letterSpacing: activeStep === index ? "-0.01em" : "0",
                }}
              >
                {label}
              </Typography>
              <Box
                sx={{
                  width: "100%",
                  height: 3,
                  bgcolor: activeStep === index ? "#dc2626" : "#e5e7eb",
                  borderRadius: 2,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: activeStep === index ? "0 2px 8px rgba(220, 38, 38, 0.3)" : "none",
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Content */}
      <DialogContent 
        sx={{ 
          px: 4, 
          py: 3, 
          minHeight: "450px", 
          maxHeight: "65vh", 
          overflowY: "auto",
          bgcolor: "#fafbfc",
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#f1f5f9",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#cbd5e1",
            borderRadius: "4px",
            "&:hover": {
              background: "#94a3b8",
            },
          },
        }}
      >
        {activeStep === 0 && renderStep1()}
        {activeStep === 1 && renderStep2()}
        {activeStep === 2 && renderStep3()}
        {activeStep === 3 && renderStep4()}
        {activeStep === 4 && renderStep5()}
        {activeStep === 5 && renderStep6()}
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          px: 4,
          py: 3.5,
          borderTop: "1px solid #f1f5f9",
          bgcolor: "#ffffff",
          justifyContent: "space-between",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.04)",
        }}
      >
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            onClick={activeStep === 0 ? onClose : handleBack}
            disabled={isSubmitting}
            startIcon={activeStep > 0 ? <ArrowBackIcon /> : null}
            sx={{
            textTransform: "none",
            color: "#475569",
            fontWeight: 700,
            bgcolor: "#f8fafc",
            borderRadius: 3,
            px: 4,
            py: 1.5,
            border: "1.5px solid #e2e8f0",
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: "#f1f5f9",
              borderColor: "#cbd5e1",
              transform: "translateY(-1px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            },
            "&:disabled": {
              bgcolor: "#f8fafc",
              color: "#94a3b8",
              borderColor: "#e2e8f0",
            },
          }}
        >
          {activeStep === 0 ? "Cancel" : "Back"}
        </Button>

        <Stack direction="row" spacing={2}>
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<ArrowForwardIcon />}
              sx={{
                textTransform: "none",
                background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                "&:hover": { 
                  background: "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 20px rgba(220, 38, 38, 0.4)",
                },
                borderRadius: 3,
                fontWeight: 700,
                px: 5,
                py: 1.5,
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={isSubmitting}
              endIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
              sx={{
                textTransform: "none",
                background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                "&:hover": { 
                  background: "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 20px rgba(220, 38, 38, 0.4)",
                },
                borderRadius: 3,
                fontWeight: 700,
                px: 5,
                py: 1.5,
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:disabled": {
                  background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  opacity: 0.6,
                  transform: "none",
                },
              }}
            >
              {isSubmitting ? "Creating..." : "Create Property"}
            </Button>
          )}
        </Stack>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CreatePropertyDialog;
