/**
 * PropertyDataEntryPage.js
 * Temporary page: fill all missing property details by project in one place.
 * Can be removed later by deleting this file and its sidebar/route references.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Autocomplete,
  Collapse,
  IconButton,
  Snackbar,
  Alert,
  Chip,
  alpha,
  Tabs,
  Tab,
  Divider,
  Tooltip,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";

import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import ArchitectureRoundedIcon from "@mui/icons-material/ArchitectureRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";

import axios from "axios";

const BASE_URL = "http://localhost:8080";

const COLORS = {
  primary: "#2A3663",
  primaryLight: "#EEF2FF",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  textSecondary: "#6B7280",
  success: "#059669",
  error: "#DC2626",
};

const emptyForm = () => ({
  name: "",
  type: "",
  subtype: "",
  dimensions: "",
  construction_area: "",
  budget: "",
  remarks: "",
  status: "",
  number_of_floors: "",
  floors: [],
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
  foundation_type: "",
  column_type: "",
  beam_type: "",
  roof_type: "",
  structural_material: "",
  load_bearing_walls: "",
  seismic_zone: "",
  soil_type: "",
  structural_notes: "",
  plot_area: "",
  built_up_area: "",
  carpet_area: "",
  parking_area: "",
  balcony_area: "",
  terrace_area: "",
  open_area: "",
  front_setback: "",
  back_setback: "",
  left_setback: "",
  right_setback: "",
  start_date: "",
  expected_completion_date: "",
  project_manager: "",
  architect: "",
  contractor: "",
  finishing_grade: "",
  additional_notes: "",
});

function mapPropertyToForm(p) {
  const mappedFloors = Array.isArray(p?.floors)
    ? p.floors.map((floor) => ({
        floor_name: floor.floor_name || "",
        dimensions: floor.dimensions || "",
        wall_height: floor.wall_height ?? "",
        slab_area_regular: floor.slab_area_regular ?? floor.slab_area ?? "",
        brick_work_regular: floor.brick_work_regular ?? floor.brick_work_area ?? "",
        plastering_area_regular: floor.plastering_area_regular ?? floor.plastering_area ?? "",
        slab_area_customer_add_on: floor.slab_area_customer_add_on ?? "",
        brick_work_customer_add_on: floor.brick_work_customer_add_on ?? "",
        plastering_area_customer_add_on: floor.plastering_area_customer_add_on ?? "",
        slab_area_avenue_add_on: floor.slab_area_avenue_add_on ?? "",
        brick_work_avenue_add_on: floor.brick_work_avenue_add_on ?? "",
        plastering_area_avenue_add_on: floor.plastering_area_avenue_add_on ?? "",
      }))
    : [];
  return {
    ...emptyForm(),
    name: p?.name || "",
    type: p?.type || "",
    subtype: p?.subtype || "",
    budget: p?.budget ?? "",
    remarks: p?.remarks || "",
    dimensions: p?.dimensions || "",
    status: p?.status || "",
    construction_area: p?.construction_area != null && p?.construction_area !== "" ? String(p.construction_area) : "",
    number_of_floors: p?.number_of_floors != null && p?.number_of_floors !== "" ? String(p.number_of_floors) : "",
    floors: mappedFloors,
    address: p?.address || "",
    city: p?.city || "",
    state: p?.state || "",
    pincode: p?.pincode || "",
    landmark: p?.landmark || "",
    gps_coordinates: p?.gps_coordinates || "",
    owner_name: p?.owner_name || "",
    owner_phone: p?.owner_phone || "",
    owner_email: p?.owner_email || "",
    owner_address: p?.owner_address || "",
    foundation_type: p?.foundation_type || "",
    column_type: p?.column_type || "",
    beam_type: p?.beam_type || "",
    roof_type: p?.roof_type || "",
    structural_material: p?.structural_material || "",
    load_bearing_walls: p?.load_bearing_walls || "",
    seismic_zone: p?.seismic_zone || "",
    soil_type: p?.soil_type || "",
    structural_notes: p?.structural_notes || "",
    plot_area: p?.plot_area != null && p?.plot_area !== "" ? String(p.plot_area) : "",
    built_up_area: p?.built_up_area != null && p?.built_up_area !== "" ? String(p.built_up_area) : "",
    carpet_area: p?.carpet_area != null && p?.carpet_area !== "" ? String(p.carpet_area) : "",
    parking_area: p?.parking_area != null && p?.parking_area !== "" ? String(p.parking_area) : "",
    balcony_area: p?.balcony_area != null && p?.balcony_area !== "" ? String(p.balcony_area) : "",
    terrace_area: p?.terrace_area != null && p?.terrace_area !== "" ? String(p.terrace_area) : "",
    open_area: p?.open_area != null && p?.open_area !== "" ? String(p.open_area) : "",
    front_setback: p?.front_setback != null && p?.front_setback !== "" ? String(p.front_setback) : "",
    back_setback: p?.back_setback != null && p?.back_setback !== "" ? String(p.back_setback) : "",
    left_setback: p?.left_setback != null && p?.left_setback !== "" ? String(p.left_setback) : "",
    right_setback: p?.right_setback != null && p?.right_setback !== "" ? String(p.right_setback) : "",
    start_date: p?.start_date || p?.startdate || "",
    expected_completion_date: p?.expected_completion_date || p?.deadline || "",
    project_manager: p?.project_manager || "",
    architect: p?.architect || "",
    contractor: p?.contractor || "",
    finishing_grade: p?.finishing_grade || "",
    additional_notes: p?.additional_notes || "",
  };
}

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

export default function PropertyDataEntryPage() {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [formDataByKey, setFormDataByKey] = useState({});
  const [loadingComplete, setLoadingComplete] = useState({});
  const [savingId, setSavingId] = useState(null);

  // ✅ per-property active tab (dynamic UI)
  const [activeTabById, setActiveTabById] = useState({});

  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await axios.get(`${BASE_URL}/projects_m`);
      const list = res?.data?.projects ?? res?.data ?? [];
      setProjects(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setSnack({ open: true, message: "Failed to load projects", severity: "error" });
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!selectedProject?.project_id) {
      setProperties([]);
      setExpandedId(null);
      setFormDataByKey({});
      return;
    }
    setLoadingProperties(true);
    setExpandedId(null);
    setFormDataByKey({});
    axios
      .get(`${BASE_URL}/projects_m/${selectedProject.project_id}/properties`)
      .then((res) => {
        const list = res?.data?.properties ?? [];
        setProperties(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        console.error(e);
        setSnack({ open: true, message: "Failed to load properties", severity: "error" });
        setProperties([]);
      })
      .finally(() => setLoadingProperties(false));
  }, [selectedProject?.project_id]);

  const loadPropertyComplete = useCallback(async (property) => {
    const id = property?.propertyid;
    if (!id) return;
    setLoadingComplete((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await axios.get(`${BASE_URL}/properties/${id}/complete`, {
        params: { include_floors: true, include_history: false },
      });
      const p = res?.data?.property ?? res?.data;
      const floors = res?.data?.floors ?? p?.floors ?? [];
      const merged = { ...p, floors };
      setFormDataByKey((prev) => ({ ...prev, [id]: mapPropertyToForm(merged) }));
    } catch (e) {
      console.error(e);
      setFormDataByKey((prev) => ({ ...prev, [id]: mapPropertyToForm(property) }));
      setSnack({ open: true, message: "Could not load full details; showing list data", severity: "warning" });
    } finally {
      setLoadingComplete((prev) => ({ ...prev, [id]: false }));
    }
  }, []);

  const toggleExpand = (property) => {
    const id = property?.propertyid;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);

    // default tab = 0 (Basic) for new expand
    setActiveTabById((prev) => (prev[id] != null ? prev : { ...prev, [id]: 0 }));

    if (!formDataByKey[id]) loadPropertyComplete(property);
  };

  const setFormFor = (propertyId, updater) => {
    setFormDataByKey((prev) => ({
      ...prev,
      [propertyId]: typeof updater === "function" ? updater(prev[propertyId] || emptyForm()) : updater,
    }));
  };

  const addFloor = (propertyId) => {
    setFormFor(propertyId, (prev) => ({
      ...prev,
      floors: [
        ...(prev.floors || []),
        {
          floor_name: "",
          dimensions: "",
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
        },
      ],
    }));
  };

  const removeFloor = (propertyId, index) => {
    setFormFor(propertyId, (prev) => ({
      ...prev,
      floors: (prev.floors || []).filter((_, i) => i !== index),
    }));
  };

  const updateFloor = (propertyId, index, field, value) => {
    setFormFor(propertyId, (prev) => ({
      ...prev,
      floors: (prev.floors || []).map((f, i) => (i === index ? { ...f, [field]: value } : f)),
    }));
  };

  const parseNum = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  const handleSave = async (property) => {
    const id = property?.propertyid;
    const form = formDataByKey[id];
    if (!id || !form) return;
    setSavingId(id);
    try {
      const constructionAreaValue =
        form.construction_area !== "" && form.construction_area != null
          ? parseFloat(String(form.construction_area)) || 0
          : 0;

      const processedFloors = (form.floors || []).map((floor, index) => ({
        floor_name: floor.floor_name || "",
        dimensions: floor.dimensions || "",
        wall_height: parseNum(floor.wall_height),
        floor_order: index,
        slab_area_regular: parseNum(floor.slab_area_regular),
        brick_work_regular: parseNum(floor.brick_work_regular),
        plastering_area_regular: parseNum(floor.plastering_area_regular),
        slab_area_customer_add_on: parseNum(floor.slab_area_customer_add_on),
        brick_work_customer_add_on: parseNum(floor.brick_work_customer_add_on),
        plastering_area_customer_add_on: parseNum(floor.plastering_area_customer_add_on),
        slab_area_avenue_add_on: parseNum(floor.slab_area_avenue_add_on),
        brick_work_avenue_add_on: parseNum(floor.brick_work_avenue_add_on),
        plastering_area_avenue_add_on: parseNum(floor.plastering_area_avenue_add_on),
      }));

      const requestData = {
        name: form.name || "",
        type: form.type || "",
        subtype: form.subtype || "",
        budget: form.budget ? (typeof form.budget === "string" ? parseFloat(form.budget) : form.budget) : null,
        remarks: form.remarks || "",
        dimensions: form.dimensions || "",
        status: form.status || "",
        construction_area: Number(constructionAreaValue),
        number_of_floors: parseNum(form.number_of_floors),
        floors: processedFloors,
        address: form.address || "",
        city: form.city || "",
        state: form.state || "",
        pincode: form.pincode || "",
        landmark: form.landmark || "",
        gps_coordinates: form.gps_coordinates || "",
        owner_name: form.owner_name || "",
        owner_phone: form.owner_phone || "",
        owner_email: form.owner_email || "",
        owner_address: form.owner_address || "",
        foundation_type: form.foundation_type || "",
        column_type: form.column_type || "",
        beam_type: form.beam_type || "",
        roof_type: form.roof_type || "",
        structural_material: form.structural_material || "",
        load_bearing_walls: form.load_bearing_walls || "",
        seismic_zone: form.seismic_zone || "",
        soil_type: form.soil_type || "",
        structural_notes: form.structural_notes || "",
        plot_area: parseNum(form.plot_area),
        built_up_area: parseNum(form.built_up_area),
        carpet_area: parseNum(form.carpet_area),
        parking_area: parseNum(form.parking_area),
        balcony_area: parseNum(form.balcony_area),
        terrace_area: parseNum(form.terrace_area),
        open_area: parseNum(form.open_area),
        front_setback: parseNum(form.front_setback),
        back_setback: parseNum(form.back_setback),
        left_setback: parseNum(form.left_setback),
        right_setback: parseNum(form.right_setback),
        start_date: form.start_date || "",
        expected_completion_date: form.expected_completion_date || "",
        project_manager: form.project_manager || "",
        architect: form.architect || "",
        contractor: form.contractor || "",
        finishing_grade: form.finishing_grade || "",
        additional_notes: form.additional_notes || "",
      };

      await axios.put(`${BASE_URL}/properties/${id}`, requestData);
      setSnack({ open: true, message: `Saved: ${form.name || property?.name || "Property"}`, severity: "success" });
      setFormDataByKey((prev) => ({ ...prev, [id]: { ...form } }));
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail
        ? Array.isArray(e.response.data.detail)
          ? e.response.data.detail.map((d) => d?.msg || d).join("; ")
          : e.response.data.detail
        : e?.message || "Save failed";
      setSnack({ open: true, message: msg, severity: "error" });
    } finally {
      setSavingId(null);
    }
  };

  const field = (propertyId, form, key, label, type = "text", multiline = false, numProps = {}) => (
    <Grid item xs={12} sm={6} md={4} key={key}>
      <TextField
        fullWidth
        size="small"
        label={label || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        variant="outlined"
        type={type}
        value={form[key] ?? ""}
        onChange={(e) => setFormFor(propertyId, (p) => ({ ...p, [key]: e.target.value }))}
        multiline={multiline}
        rows={multiline ? 3 : undefined}
        inputProps={numProps}
        sx={{
          "& .MuiOutlinedInput-root": { bgcolor: "#fff", borderRadius: 2 },
          "& .MuiInputLabel-root": { fontWeight: 800 },
        }}
      />
    </Grid>
  );

  const tabMeta = useMemo(
    () => [
      { label: "Basic", icon: <NotesRoundedIcon fontSize="small" /> },
      { label: "Location", icon: <LocationOnRoundedIcon fontSize="small" /> },
      { label: "Structural", icon: <ArchitectureRoundedIcon fontSize="small" /> },
      { label: "Additional", icon: <NotesRoundedIcon fontSize="small" /> },
      { label: "Floors", icon: <LayersRoundedIcon fontSize="small" /> },
    ],
    []
  );

  return (
    <Box
    sx={{
      width: "100%",
      minHeight: "calc(100vh - 280px)",
      bgcolor: "#F3F4F6",
      borderRadius: 3,
      p: 2,
    }}
  >      <Typography variant="h4" sx={{ fontWeight: 900, color: "#0f172a", letterSpacing: -0.5, mb: 0.5 }}>
        Property Data Entry
      </Typography>
      <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
        Expand a property and edit it tab-by-tab. Less scrolling. More pretending we’re productive.
      </Typography>

      {/* Project picker */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          bgcolor: COLORS.surface,
          mb: 3,
          boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
        }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 900, color: COLORS.textSecondary, mb: 1.5 }}>
          Project
        </Typography>

        <Autocomplete
          value={selectedProject}
          onChange={(_, v) => setSelectedProject(v)}
          options={projects}
          getOptionLabel={(o) => o?.project_name || o?.name || ""}
          isOptionEqualToValue={(a, b) => (a?.project_id ?? a?.id) === (b?.project_id ?? b?.id)}
          loading={loadingProjects}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Select project"
              size="small"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <FolderOpenOutlinedIcon sx={{ color: COLORS.textSecondary, mr: 1, fontSize: 20 }} />
                    {params.InputProps.startAdornment}
                  </>
                ),
                endAdornment: (
                  <>
                    {loadingProjects ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" } }}
            />
          )}
          sx={{ maxWidth: 520 }}
        />
      </Paper>

      {loadingProperties && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress sx={{ color: COLORS.primary }} />
        </Box>
      )}

      {!loadingProperties && selectedProject && properties.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            bgcolor: alpha(COLORS.primary, 0.02),
          }}
        >
          <Typography color="text.secondary">No properties in this project.</Typography>
        </Paper>
      )}

      {!loadingProperties && properties.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {properties.map((property) => {
            const id = property.propertyid;
            const form = formDataByKey[id];
            const expanded = expandedId === id;
            const loading = loadingComplete[id];
            const saving = savingId === id;

            const activeTab = activeTabById[id] ?? 0;

            return (
              <Paper
                key={id}
                elevation={0}
                sx={{
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 3,
                  overflow: "hidden",
                  bgcolor: "#fff",
                  boxShadow: expanded ? "0 10px 24px rgba(15,23,42,0.10)" : "0 6px 16px rgba(15,23,42,0.06)",
                }}
              >
                {/* Card header */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    p: 2,
                    background: expanded
                      ? "linear-gradient(180deg, rgba(42,54,99,0.10), rgba(255,255,255,1))"
                      : "#ffffff",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleExpand(property)}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        background: "rgba(42,54,99,0.10)",
                        display: "grid",
                        placeItems: "center",
                        color: "#2A3663",
                        flexShrink: 0,
                      }}
                    >
                      <ApartmentRoundedIcon fontSize="small" />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }} noWrap>
                        {property.name || "Unnamed"}
                      </Typography>

                      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.75 }}>
                        {property.type ? <Chip label={property.type} size="small" /> : null}
                        {property.status ? <Chip label={property.status} size="small" variant="outlined" /> : null}
                        {property.dimensions ? <Chip label={property.dimensions} size="small" variant="outlined" /> : null}
                      </Box>
                    </Box>
                  </Box>

                  <IconButton size="small">{expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                </Box>

                {/* Expanded content */}
                <Collapse in={expanded}>
                  <Box sx={{ p: 2, bgcolor: "#f8fafc", borderTop: "1px solid #e5e7eb" }}>
                    {loading && (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                        <CircularProgress size={28} />
                      </Box>
                    )}

                    {!loading && form && (
                      <Paper
                        elevation={0}
                        sx={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 3,
                          overflow: "hidden",
                          bgcolor: "#fff",
                        }}
                      >
                        {/* Tabs */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            px: 2,
                            pt: 1.5,
                            gap: 2,
                            bgcolor: "rgba(42,54,99,0.04)",
                          }}
                        >
                          <Tabs
                            value={activeTab}
                            onChange={(_, v) => setActiveTabById((prev) => ({ ...prev, [id]: v }))}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                              minHeight: 44,
                              "& .MuiTab-root": {
                                minHeight: 44,
                                textTransform: "none",
                                fontWeight: 900,
                              },
                            }}
                          >
                            {tabMeta.map((t) => (
                              <Tab
                                key={t.label}
                                label={
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    {t.icon}
                                    <span>{t.label}</span>
                                    {t.label === "Floors" ? (
                                      <Chip
                                        size="small"
                                        label={(form.floors || []).length}
                                        sx={{ ml: 0.5, fontWeight: 900 }}
                                      />
                                    ) : null}
                                  </Box>
                                }
                              />
                            ))}
                          </Tabs>

                          {/* Save button always visible */}
                          <Tooltip title="Save this property">
                            <span>
                              <Button
                                variant="contained"
                                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlinedIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSave(property);
                                }}
                                disabled={saving}
                                sx={{
                                  bgcolor: COLORS.primary,
                                  "&:hover": { bgcolor: "#1E2A48" },
                                  textTransform: "none",
                                  fontWeight: 900,
                                  borderRadius: 2,
                                  px: 2.5,
                                }}
                              >
                                {saving ? "Saving…" : "Save"}
                              </Button>
                            </span>
                          </Tooltip>
                        </Box>

                        <Divider />

                        {/* Tab Panels */}
                        <Box sx={{ p: 2 }}>
                          {/* 0 BASIC */}
                          <TabPanel value={activeTab} index={0}>
                            <Grid container spacing={2}>
                              {[
                                "name",
                                "type",
                                "subtype",
                                "dimensions",
                                "status",
                                "construction_area",
                                "number_of_floors",
                                "budget",
                                "remarks",
                              ].map((k) =>
                                field(
                                  id,
                                  form,
                                  k,
                                  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                                  k === "construction_area" || k === "number_of_floors" || k === "budget"
                                    ? "number"
                                    : "text",
                                  false,
                                  k === "construction_area" || k === "number_of_floors" ? { min: 0 } : {}
                                )
                              )}
                            </Grid>
                          </TabPanel>

                          {/* 1 LOCATION */}
                          <TabPanel value={activeTab} index={1}>
                            <Grid container spacing={2}>
                              {[
                                "address",
                                "city",
                                "state",
                                "pincode",
                                "landmark",
                                "gps_coordinates",
                                "owner_name",
                                "owner_phone",
                                "owner_email",
                                "owner_address",
                              ].map((k) =>
                                field(
                                  id,
                                  form,
                                  k,
                                  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                                  "text",
                                  k === "owner_address" || k === "address"
                                )
                              )}
                            </Grid>
                          </TabPanel>

                          {/* 2 STRUCTURAL */}
                          <TabPanel value={activeTab} index={2}>
                            <Grid container spacing={2}>
                              {[
                                "foundation_type",
                                "column_type",
                                "beam_type",
                                "roof_type",
                                "structural_material",
                                "load_bearing_walls",
                                "seismic_zone",
                                "soil_type",
                                "structural_notes",
                              ].map((k) =>
                                field(
                                  id,
                                  form,
                                  k,
                                  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                                  "text",
                                  k === "structural_notes"
                                )
                              )}
                            </Grid>
                          </TabPanel>

                          {/* 3 ADDITIONAL */}
                          <TabPanel value={activeTab} index={3}>
                            <Grid container spacing={2}>
                              {[
                                "plot_area",
                                "built_up_area",
                                "carpet_area",
                                "parking_area",
                                "balcony_area",
                                "terrace_area",
                                "open_area",
                                "front_setback",
                                "back_setback",
                                "left_setback",
                                "right_setback",
                                "start_date",
                                "expected_completion_date",
                                "project_manager",
                                "architect",
                                "contractor",
                                "finishing_grade",
                                "additional_notes",
                              ].map((k) =>
                                field(
                                  id,
                                  form,
                                  k,
                                  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                                  [
                                    "plot_area",
                                    "built_up_area",
                                    "carpet_area",
                                    "parking_area",
                                    "balcony_area",
                                    "terrace_area",
                                    "open_area",
                                    "front_setback",
                                    "back_setback",
                                    "left_setback",
                                    "right_setback",
                                  ].includes(k)
                                    ? "number"
                                    : "text",
                                  k === "additional_notes",
                                  { min: 0 }
                                )
                              )}
                            </Grid>
                          </TabPanel>

                          {/* 4 FLOORS */}
                          <TabPanel value={activeTab} index={4}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                              <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
                                Floors ({(form.floors || []).length})
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => addFloor(id)}
                                sx={{
                                  textTransform: "none",
                                  fontWeight: 900,
                                  borderRadius: 2,
                                  bgcolor: "rgba(42,54,99,0.10)",
                                  color: "#2A3663",
                                  "&:hover": { bgcolor: "rgba(42,54,99,0.16)" },
                                }}
                              >
                                Add Floor
                              </Button>
                            </Box>

                            {(form.floors || []).length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                No floors. Click Add Floor.
                              </Typography>
                            ) : (
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                {(form.floors || []).map((floor, index) => (
                                  <Paper
                                    key={index}
                                    elevation={0}
                                    sx={{
                                      p: 2,
                                      border: "1px solid #e5e7eb",
                                      borderRadius: 2,
                                      bgcolor: "#fff",
                                    }}
                                  >
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                                      <Chip label={`Floor ${index + 1}`} size="small" sx={{ fontWeight: 900 }} />
                                      <IconButton size="small" onClick={() => removeFloor(id, index)} sx={{ color: COLORS.error }}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>

                                    <Divider sx={{ mb: 2 }} />

                                    <Grid container spacing={2}>
                                      {[
                                        ["floor_name", "Floor name"],
                                        ["dimensions", "Dimensions"],
                                        ["wall_height", "Wall height"],
                                        ["slab_area_regular", "Slab regular"],
                                        ["slab_area_customer_add_on", "Slab customer add-on"],
                                        ["slab_area_avenue_add_on", "Slab avenue add-on"],
                                        ["brick_work_regular", "Brick regular"],
                                        ["brick_work_customer_add_on", "Brick customer add-on"],
                                        ["brick_work_avenue_add_on", "Brick avenue add-on"],
                                        ["plastering_area_regular", "Plaster regular"],
                                        ["plastering_area_customer_add_on", "Plaster customer add-on"],
                                        ["plastering_area_avenue_add_on", "Plaster avenue add-on"],
                                      ].map(([key, label]) => (
                                        <Grid item xs={12} sm={6} md={4} key={key}>
                                          <TextField
                                            fullWidth
                                            size="small"
                                            label={label}
                                            type={key.includes("area") || key.includes("height") ? "number" : "text"}
                                            value={floor[key] ?? ""}
                                            onChange={(e) => updateFloor(id, index, key, e.target.value)}
                                            sx={{
                                              "& .MuiOutlinedInput-root": { bgcolor: "#f8fafc", borderRadius: 2 },
                                              "& .MuiInputLabel-root": { fontWeight: 800 },
                                            }}
                                            inputProps={key.includes("area") || key.includes("height") ? { min: 0, step: 0.01 } : {}}
                                          />
                                        </Grid>
                                      ))}
                                    </Grid>
                                  </Paper>
                                ))}
                              </Box>
                            )}
                          </TabPanel>
                        </Box>
                      </Paper>
                    )}
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </Box>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}