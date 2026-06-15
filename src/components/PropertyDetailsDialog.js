// PropertyDetailsDialog.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Paper,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  TextField,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import TaskManager from "./TaskManager";
import PropertyLiveChatUpdates from "./PropertyLiveChatUpdates"; // ✅ use the embedded one
import CalendarView from "./CalendarView";
import WorkflowDiagram from "./WorkflowDiagram";
import PropertyEmployeesTab from "./PropertyEmployeesTab";
import PropertyDocumentsTab from "./PropertyDocumentsTab";
import PropertyPhaseInventoryTab from "./PropertyPhaseInventoryTab";
import InventoryPage from "./InventoryPage";
import LabourExpenses from "./LabourExpenses";
import ScheduleCreationDialog from "./ScheduleCreationDialog";
import PropertyApprovalsTab from "./PropertyApprovalsTab";

import { useNavigate } from "react-router-dom";
import axios from "axios";
import { testLog } from "../utils/testLogger";
import { getPropertyFloors, createFloor, updateFloor } from "../services/propertyFloorsService";

const COMPONENT = "PropertyDetailsDialog";
const TOTALS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const propertyTotalsCache = new Map();

/** Normalize API error detail (string | array of {msg,loc,...} | object) to a display string */
function apiDetailToString(d) {
  if (d == null) return "";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => (e && typeof e === "object" && e.msg != null ? e.msg : String(e))).join("; ");
  if (typeof d === "object" && d.msg != null) return d.msg;
  return String(d);
}

const PropertyDetailsDialog = ({
  open,
  property,
  loading,
  role,
  onClose,
  refreshProperty,
  embedded = false,
}) => {
  const BASE_URL = "http://localhost:8080";
  const navigate = useNavigate();
  

  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogType, setDialogType] = useState("success");

  const [inventoryData, setInventoryData] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [currentProperty, setCurrentProperty] = useState(property);
  const [inventoryTotals, setInventoryTotals] = useState(null);
  const [labourTotals, setLabourTotals] = useState(null);
  const effectivePropertyId =
    currentProperty?.propertyid ||
    currentProperty?.property_id ||
    property?.propertyid ||
    property?.property_id ||
    property?.id ||
    "";
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const statusMenuOpen = Boolean(statusMenuAnchor);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [editFormData, setEditFormData] = useState({
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
    // Structural
    foundation_type: "",
    column_type: "",
    beam_type: "",
    roof_type: "",
    structural_material: "",
    load_bearing_walls: "",
    seismic_zone: "",
    soil_type: "",
    structural_notes: "",
    // Additional / Areas
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

  const isAdmin = role && String(role).toLowerCase().includes("admin");

  const mainTabs = useMemo(() => {
    const base = [
      { key: "workflow", label: "Workflow View" },
      { key: "task", label: "Task View" },
      { key: "calendar", label: "Calendar View" },
      { key: "employees", label: "Employees" },
      { key: "documents", label: "Documents" },
      { key: "chat", label: "Chat" },
      { key: "phaseInventory", label: "Phase Inventory" },
      { key: "inventory", label: "Inventory" },
      { key: "labour", label: "Labour" },
    ];
    if (isAdmin) base.push({ key: "approvals", label: "Approvals" });
    return base;
  }, [isAdmin]);

  const tabIndexByKey = useMemo(() => {
    const m = new Map();
    mainTabs.forEach((t, idx) => m.set(t.key, idx));
    return m;
  }, [mainTabs]);

  const [mainTab, setMainTab] = useState(0);

  useEffect(() => {
    if (mainTab >= mainTabs.length) setMainTab(0);
  }, [mainTab, mainTabs.length]);

  const activeTabKey = mainTabs[mainTab]?.key || "workflow";

  useEffect(() => {
    if (open && property) testLog(COMPONENT, "dialogOpen", { propertyId: property?.propertyid, propertyName: property?.name });
  }, [open, property]);

  useEffect(() => {
    if (!open) {
      setInventoryTotals(null);
      setLabourTotals(null);
    }
  }, [open, effectivePropertyId]);

  useEffect(() => {
    let active = true;

    const preloadTotals = async () => {
      if (!open || !effectivePropertyId) return;
      const cached = propertyTotalsCache.get(effectivePropertyId);
      const now = Date.now();
      if (cached && now - cached.ts < TOTALS_CACHE_TTL_MS) {
        if (active) {
          setInventoryTotals(cached.inventoryTotals || null);
          setLabourTotals(cached.labourTotals || null);
        }
        return;
      }
      try {
        const [inventoryRes, labourRes] = await Promise.allSettled([
          axios.get(`${BASE_URL}/inventory/property/${effectivePropertyId}`),
          axios.get(`${BASE_URL}/properties/${effectivePropertyId}/labour-payments`),
        ]);

        let nextInventoryTotals = null;
        if (active && inventoryRes.status === "fulfilled") {
          const rows = Array.isArray(inventoryRes.value?.data?.inventory)
            ? inventoryRes.value.data.inventory
            : [];
          nextInventoryTotals = {
            totalCost: rows.reduce((sum, r) => sum + Number(r?.material_cost || 0), 0),
            totalLimit: rows.reduce((sum, r) => sum + Number(r?.limit_quantity || 0), 0),
            totalUsed: rows.reduce((sum, r) => sum + Number(r?.used_quantity || 0), 0),
            rowCount: rows.length,
          };
          setInventoryTotals(nextInventoryTotals);
        }

        let nextLabourTotals = null;
        if (active && labourRes.status === "fulfilled") {
          const payload = labourRes.value?.data || {};
          const summary = payload?.summary || {};
          const payments = Array.isArray(payload?.payments) ? payload.payments : [];
          const fallbackTotal = payments.reduce(
            (sum, p) => sum + Number(p?.net_amount ?? p?.amount ?? 0),
            0
          );
          const fallbackPaid = payments.reduce(
            (sum, p) => sum + Number(p?.paid_amount ?? 0),
            0
          );
          const total = Number(summary?.total_amount ?? fallbackTotal ?? 0);
          const paid = Number(summary?.total_paid ?? fallbackPaid ?? 0);
          const unpaid = Number(summary?.total_unpaid ?? Math.max(0, total - paid));
          nextLabourTotals = { total, paid, unpaid };
          setLabourTotals(nextLabourTotals);
        }

        if (nextInventoryTotals || nextLabourTotals) {
          propertyTotalsCache.set(effectivePropertyId, {
            ts: now,
            inventoryTotals: nextInventoryTotals,
            labourTotals: nextLabourTotals,
          });
        }
      } catch (err) {
        // Intentionally silent; tab-level callbacks still update totals when tabs load.
      }
    };

    preloadTotals();
    return () => {
      active = false;
    };
  }, [open, effectivePropertyId]);

  useEffect(() => {
    if (open) testLog(COMPONENT, "tabChange", { tab: mainTab, tabLabel: mainTabs[mainTab]?.label });
  }, [mainTab, open, mainTabs]);

  // Floors tab state
  const [floorsData, setFloorsData] = useState([]);
  const [floorsList, setFloorsList] = useState([]); // Individual floors list
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [floorsLoaded, setFloorsLoaded] = useState(false);
  const [floorsError, setFloorsError] = useState(null);
  
  // Add floors form state (when no floors exist)
  const [showAddFloorsForm, setShowAddFloorsForm] = useState(false);
  const [numberOfFloorsToAdd, setNumberOfFloorsToAdd] = useState("");
  const [floorsToAdd, setFloorsToAdd] = useState([]);
  const [savingFloors, setSavingFloors] = useState(false);
  
  // Edit floor state
  const [editingFloorId, setEditingFloorId] = useState(null);
  const [editingFloorData, setEditingFloorData] = useState(null);

  // Floors tab: information hidden by default, press to show (actions always visible)
  const [showFloorsSummary, setShowFloorsSummary] = useState(false);
  const [showFloorsIndividual, setShowFloorsIndividual] = useState(false);

  // Edit Property form: sections hidden by default, press to show (actions always visible)
  const [editSectionBasic, setEditSectionBasic] = useState(false);
  const [editSectionLocation, setEditSectionLocation] = useState(false);
  const [editSectionStructural, setEditSectionStructural] = useState(false);
  const [editSectionAdditional, setEditSectionAdditional] = useState(false);
  const [editSectionFloors, setEditSectionFloors] = useState(false);

  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);

  // ✅ Property Details: hidden by default, press "Show" to reveal (actions always visible)
  const [detailsOpen, setDetailsOpen] = useState(false);

  const showDialog = (message, type = "success") => {
    setDialogMessage(message);
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleStatusChipClick = (event) => setStatusMenuAnchor(event.currentTarget);
  const handleStatusMenuClose = () => setStatusMenuAnchor(null);

  const handleStatusChange = async (event) => {
    const newStatus = event.target.value;
    if (!newStatus || newStatus === (currentProperty || property)?.status) return;

    setUpdatingStatus(true);
    try {
      const response = await axios.put(
        `${BASE_URL}/properties/${(currentProperty || property)?.propertyid}/status`,
        { status: newStatus },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        setCurrentProperty((prev) => ({ ...(prev || {}), status: newStatus }));
        setEditFormData((prev) => ({ ...prev, status: newStatus }));
        if (typeof refreshProperty === "function") refreshProperty();
        showDialog("Property status updated successfully!", "success");
      }
    } catch (error) {
      console.error("Error updating property status:", error?.response?.data || error);
      const msg = apiDetailToString(error?.response?.data?.detail) || error?.message || "Failed to update property status.";
      showDialog(msg, "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ✅ refresh from the SAME endpoint your list uses
  const fetchLatestPropertyFromProjectList = async () => {
    const p = currentProperty || property;
    const propertyid = p?.propertyid;
    const projectid = p?.projectid || p?.project_id;

    if (!propertyid || !projectid) return null;

    const res = await axios.get(`${BASE_URL}/projects_m/${projectid}/properties`);
    const list = res?.data?.properties || [];
    const latest = list.find((x) => x?.propertyid === propertyid) || null;
    return latest;
  };

  // Load full property + floors from GET /properties/{id}/complete when dialog opens
  useEffect(() => {
    if (!open || !property?.propertyid) {
      setLoadingComplete(false);
      return;
    }
    let cancelled = false;
    setLoadingComplete(true);
    axios
      .get(`${BASE_URL}/properties/${property.propertyid}/complete`, {
        params: { include_floors: true, include_history: false },
      })
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        if (data.success && data.property) {
          const p = data.property;
          const floors = data.floors ?? p.floors ?? [];
          const merged = { ...p, floors };
          setCurrentProperty(merged);
          const mappedFloors = Array.isArray(floors)
            ? floors.map((floor) => ({
                floor_name: floor.floor_name || "",
                dimensions: floor.dimensions || "",
                wall_height: floor.wall_height || "",
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
          setEditFormData((prev) => ({
            ...prev,
            name: p.name || "",
            type: p.type || "",
            subtype: p.subtype || "",
            dimensions: p.dimensions || "",
            budget: p.budget ?? "",
            remarks: p.remarks || "",
            status: p.status || "",
            construction_area:
              p.construction_area != null && p.construction_area !== "" ? String(p.construction_area) : "",
            number_of_floors:
              p.number_of_floors != null && p.number_of_floors !== "" ? String(p.number_of_floors) : "",
            floors: mappedFloors,
            address: p.address || "",
            city: p.city || "",
            state: p.state || "",
            pincode: p.pincode || "",
            landmark: p.landmark || "",
            gps_coordinates: p.gps_coordinates || "",
            owner_name: p.owner_name || "",
            owner_phone: p.owner_phone || "",
            owner_email: p.owner_email || "",
            owner_address: p.owner_address || "",
            foundation_type: p.foundation_type || "",
            column_type: p.column_type || "",
            beam_type: p.beam_type || "",
            roof_type: p.roof_type || "",
            structural_material: p.structural_material || "",
            load_bearing_walls: p.load_bearing_walls || "",
            seismic_zone: p.seismic_zone || "",
            soil_type: p.soil_type || "",
            structural_notes: p.structural_notes || "",
            plot_area: p.plot_area != null && p.plot_area !== "" ? String(p.plot_area) : "",
            built_up_area: p.built_up_area != null && p.built_up_area !== "" ? String(p.built_up_area) : "",
            carpet_area: p.carpet_area != null && p.carpet_area !== "" ? String(p.carpet_area) : "",
            parking_area: p.parking_area != null && p.parking_area !== "" ? String(p.parking_area) : "",
            balcony_area: p.balcony_area != null && p.balcony_area !== "" ? String(p.balcony_area) : "",
            terrace_area: p.terrace_area != null && p.terrace_area !== "" ? String(p.terrace_area) : "",
            open_area: p.open_area != null && p.open_area !== "" ? String(p.open_area) : "",
            front_setback: p.front_setback != null && p.front_setback !== "" ? String(p.front_setback) : "",
            back_setback: p.back_setback != null && p.back_setback !== "" ? String(p.back_setback) : "",
            left_setback: p.left_setback != null && p.left_setback !== "" ? String(p.left_setback) : "",
            right_setback: p.right_setback != null && p.right_setback !== "" ? String(p.right_setback) : "",
            start_date: p.start_date || p.startdate || "",
            expected_completion_date: p.expected_completion_date || p.deadline || "",
            project_manager: p.project_manager || "",
            architect: p.architect || "",
            contractor: p.contractor || "",
            finishing_grade: p.finishing_grade || "",
            additional_notes: p.additional_notes || "",
          }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentProperty(property);
          const mappedFloors = Array.isArray(property.floors)
            ? property.floors.map((f) => ({
                floor_name: f.floor_name || "",
                dimensions: f.dimensions || "",
                wall_height: f.wall_height || "",
                slab_area_regular: f.slab_area_regular ?? f.slab_area ?? "",
                brick_work_regular: f.brick_work_regular ?? f.brick_work_area ?? "",
                plastering_area_regular: f.plastering_area_regular ?? f.plastering_area ?? "",
                slab_area_customer_add_on: f.slab_area_customer_add_on ?? "",
                brick_work_customer_add_on: f.brick_work_customer_add_on ?? "",
                plastering_area_customer_add_on: f.plastering_area_customer_add_on ?? "",
                slab_area_avenue_add_on: f.slab_area_avenue_add_on ?? "",
                brick_work_avenue_add_on: f.brick_work_avenue_add_on ?? "",
                plastering_area_avenue_add_on: f.plastering_area_avenue_add_on ?? "",
              }))
            : [];
          setEditFormData((prev) => ({
            ...prev,
            name: property.name || "",
            type: property.type || "",
            subtype: property.subtype || "",
            dimensions: property.dimensions || "",
            budget: property.budget ?? "",
            remarks: property.remarks || "",
            status: property.status || "",
            construction_area:
              property.construction_area != null && property.construction_area !== ""
                ? String(property.construction_area)
                : "",
            number_of_floors:
              property.number_of_floors != null && property.number_of_floors !== ""
                ? String(property.number_of_floors)
                : "",
            floors: mappedFloors,
            address: property.address || "",
            city: property.city || "",
            state: property.state || "",
            pincode: property.pincode || "",
            landmark: property.landmark || "",
            gps_coordinates: property.gps_coordinates || "",
            owner_name: property.owner_name || "",
            owner_phone: property.owner_phone || "",
            owner_email: property.owner_email || "",
            owner_address: property.owner_address || "",
            foundation_type: property.foundation_type || "",
            column_type: property.column_type || "",
            beam_type: property.beam_type || "",
            roof_type: property.roof_type || "",
            structural_material: property.structural_material || "",
            load_bearing_walls: property.load_bearing_walls || "",
            seismic_zone: property.seismic_zone || "",
            soil_type: property.soil_type || "",
            structural_notes: property.structural_notes || "",
            plot_area: property.plot_area != null && property.plot_area !== "" ? String(property.plot_area) : "",
            built_up_area: property.built_up_area != null && property.built_up_area !== "" ? String(property.built_up_area) : "",
            carpet_area: property.carpet_area != null && property.carpet_area !== "" ? String(property.carpet_area) : "",
            parking_area: property.parking_area != null && property.parking_area !== "" ? String(property.parking_area) : "",
            balcony_area: property.balcony_area != null && property.balcony_area !== "" ? String(property.balcony_area) : "",
            terrace_area: property.terrace_area != null && property.terrace_area !== "" ? String(property.terrace_area) : "",
            open_area: property.open_area != null && property.open_area !== "" ? String(property.open_area) : "",
            front_setback: property.front_setback != null && property.front_setback !== "" ? String(property.front_setback) : "",
            back_setback: property.back_setback != null && property.back_setback !== "" ? String(property.back_setback) : "",
            left_setback: property.left_setback != null && property.left_setback !== "" ? String(property.left_setback) : "",
            right_setback: property.right_setback != null && property.right_setback !== "" ? String(property.right_setback) : "",
            start_date: property.start_date || property.startdate || "",
            expected_completion_date: property.expected_completion_date || property.deadline || "",
            project_manager: property.project_manager || "",
            architect: property.architect || "",
            contractor: property.contractor || "",
            finishing_grade: property.finishing_grade || "",
            additional_notes: property.additional_notes || "",
          }));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingComplete(false);
      });
    return () => { cancelled = true; };
  }, [open, property?.propertyid]);

  useEffect(() => {
    if (!property) return;

    setCurrentProperty(property);
    // Map floors to ensure they have the new structure (fallback when complete not loaded yet)
    const mappedFloors = Array.isArray(property.floors) ? property.floors.map((floor) => ({
      floor_name: floor.floor_name || "",
      dimensions: floor.dimensions || "",
      wall_height: floor.wall_height || "",
      slab_area_regular: floor.slab_area_regular ?? floor.slab_area ?? "",
      brick_work_regular: floor.brick_work_regular ?? floor.brick_work_area ?? "",
      plastering_area_regular: floor.plastering_area_regular ?? floor.plastering_area ?? "",
      slab_area_customer_add_on: floor.slab_area_customer_add_on ?? "",
      brick_work_customer_add_on: floor.brick_work_customer_add_on ?? "",
      plastering_area_customer_add_on: floor.plastering_area_customer_add_on ?? "",
      slab_area_avenue_add_on: floor.slab_area_avenue_add_on ?? "",
      brick_work_avenue_add_on: floor.brick_work_avenue_add_on ?? "",
      plastering_area_avenue_add_on: floor.plastering_area_avenue_add_on ?? "",
    })) : [];

    setEditFormData((prev) => ({
      ...prev,
      name: property.name || "",
      type: property.type || "",
      subtype: property.subtype || "",
      dimensions: property.dimensions || "",
      budget: property.budget ?? "",
      remarks: property.remarks || "",
      status: property.status || "",
      construction_area:
        property.construction_area != null && property.construction_area !== ""
          ? String(property.construction_area)
          : "",
      number_of_floors:
        property.number_of_floors != null && property.number_of_floors !== ""
          ? String(property.number_of_floors)
          : "",
      floors: mappedFloors,
      address: property.address || "",
      city: property.city || "",
      state: property.state || "",
      pincode: property.pincode || "",
      landmark: property.landmark || "",
      gps_coordinates: property.gps_coordinates || "",
      owner_name: property.owner_name || "",
      owner_phone: property.owner_phone || "",
      owner_email: property.owner_email || "",
      owner_address: property.owner_address || "",
      foundation_type: property.foundation_type || "",
      column_type: property.column_type || "",
      beam_type: property.beam_type || "",
      roof_type: property.roof_type || "",
      structural_material: property.structural_material || "",
      load_bearing_walls: property.load_bearing_walls || "",
      seismic_zone: property.seismic_zone || "",
      soil_type: property.soil_type || "",
      structural_notes: property.structural_notes || "",
      plot_area: property.plot_area != null && property.plot_area !== "" ? String(property.plot_area) : "",
      built_up_area: property.built_up_area != null && property.built_up_area !== "" ? String(property.built_up_area) : "",
      carpet_area: property.carpet_area != null && property.carpet_area !== "" ? String(property.carpet_area) : "",
      parking_area: property.parking_area != null && property.parking_area !== "" ? String(property.parking_area) : "",
      balcony_area: property.balcony_area != null && property.balcony_area !== "" ? String(property.balcony_area) : "",
      terrace_area: property.terrace_area != null && property.terrace_area !== "" ? String(property.terrace_area) : "",
      open_area: property.open_area != null && property.open_area !== "" ? String(property.open_area) : "",
      front_setback: property.front_setback != null && property.front_setback !== "" ? String(property.front_setback) : "",
      back_setback: property.back_setback != null && property.back_setback !== "" ? String(property.back_setback) : "",
      left_setback: property.left_setback != null && property.left_setback !== "" ? String(property.left_setback) : "",
      right_setback: property.right_setback != null && property.right_setback !== "" ? String(property.right_setback) : "",
      start_date: property.start_date || property.startdate || "",
      expected_completion_date: property.expected_completion_date || property.deadline || "",
      project_manager: property.project_manager || "",
      architect: property.architect || "",
      contractor: property.contractor || "",
      finishing_grade: property.finishing_grade || "",
      additional_notes: property.additional_notes || "",
    }));

    setIsEditDialogOpen(false);
  }, [property]);

  // --- Inventory ---
  const fetchInventoryData = async () => {
    if (!property) return;
    setLoadingInventory(true);
    try {
      const propName = property.property_name || property.name;
      const projName = property.project_name || property.projectid;

      const response = await axios.get(`${BASE_URL}/property-inventory/${propName}/project/${projName}`);
      setInventoryData(response.data);
    } catch (error) {
      console.error("Error fetching inventory data:", error?.response?.data || error);
      setInventoryData([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  // --- Schedule ---
  const fetchSchedule = async () => {
    if (!property?.propertyid) return;
    setLoadingSchedule(true);
    try {
      const response = await axios.get(`${BASE_URL}/properties/${property.propertyid}/schedule`);
      setSchedule(response.data.schedule || []);
    } catch (error) {
      console.error("Unable to fetch schedule:", error?.response?.data || error);
      setSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const refreshTasks = () => fetchSchedule();

  const handleDeleteSchedule = async () => {
    if (!window.confirm("Are you sure you want to delete the entire schedule?")) return;
    try {
      await axios.delete(`${BASE_URL}/properties/${property.propertyid}/schedule`);
      setSchedule([]);
      fetchSchedule();
      showDialog("Schedule deleted successfully.", "success");
    } catch (error) {
      console.error("Error deleting schedule:", error?.response?.data || error);
      showDialog("Failed to delete schedule.", "error");
    }
  };

  const handleDeleteProperty = async () => {
    try {
      const response = await axios.patch(`${BASE_URL}/properties/${property.propertyid}/soft-delete`);
      if (response.status === 200) {
        showDialog("Property deleted successfully!", "success");
        setTimeout(() => {
          setDeleteConfirmOpen(false);
          if (typeof refreshProperty === "function") refreshProperty();
          onClose?.();
        }, 1500);
      }
    } catch (error) {
      console.error("Error deleting property:", error?.response?.data || error);
      showDialog("Failed to delete property.", "error");
    }
  };

  // ✅ OPEN edit dialog
  const openEditDialog = () => {
    const p = currentProperty || property;
    // Map floors to new structure if they come from old API format
    const mappedFloors = Array.isArray(p?.floors) ? p.floors.map((floor) => ({
      floor_name: floor.floor_name || "",
      dimensions: floor.dimensions || "",
      wall_height: floor.wall_height || "",
      // Map old fields to new structure if needed
      slab_area_regular: floor.slab_area_regular ?? floor.slab_area ?? "",
      brick_work_regular: floor.brick_work_regular ?? floor.brick_work_area ?? "",
      plastering_area_regular: floor.plastering_area_regular ?? floor.plastering_area ?? "",
      slab_area_customer_add_on: floor.slab_area_customer_add_on ?? "",
      brick_work_customer_add_on: floor.brick_work_customer_add_on ?? "",
      plastering_area_customer_add_on: floor.plastering_area_customer_add_on ?? "",
      slab_area_avenue_add_on: floor.slab_area_avenue_add_on ?? "",
      brick_work_avenue_add_on: floor.brick_work_avenue_add_on ?? "",
      plastering_area_avenue_add_on: floor.plastering_area_avenue_add_on ?? "",
    })) : [];
    
    setEditFormData((prev) => ({
      ...prev,
      name: p?.name || "",
      type: p?.type || "",
      budget: p?.budget ?? "",
      remarks: p?.remarks || "",
      dimensions: p?.dimensions || "",
      subtype: p?.subtype || "",
      status: p?.status || "",
      construction_area:
        p?.construction_area != null && p?.construction_area !== ""
          ? p.construction_area
          : "",
      number_of_floors:
        p?.number_of_floors != null && p?.number_of_floors !== ""
          ? p.number_of_floors
          : "",
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
    }));
    // When property has no floors, auto-expand Basic info and Floor Details so user can add floors easily
    const hasNoFloors = mappedFloors.length === 0;
    if (hasNoFloors) {
      setEditSectionBasic(true);
      setEditSectionFloors(true);
    }
    setIsEditDialogOpen(true);
  };

  // Helper functions for floors management
  const addFloor = () => {
    setEditFormData((prev) => ({
      ...prev,
      floors: [
        ...(prev.floors || []),
        {
          floor_name: "",
          dimensions: "",
          wall_height: "",
          // Regular areas
          slab_area_regular: "",
          brick_work_regular: "",
          plastering_area_regular: "",
          // Customer add-on areas
          slab_area_customer_add_on: "",
          brick_work_customer_add_on: "",
          plastering_area_customer_add_on: "",
          // Avenue add-on areas
          slab_area_avenue_add_on: "",
          brick_work_avenue_add_on: "",
          plastering_area_avenue_add_on: "",
        },
      ],
    }));
  };

  const removeFloor = (index) => {
    setEditFormData((prev) => {
      const newFloors = prev.floors.filter((_, i) => i !== index);
      return {
        ...prev,
        floors: newFloors,
        number_of_floors: String(newFloors.length),
      };
    });
  };

  // Sync floors array when "Number of Floors" changes so added floors are saved and reflected
  const handleNumberOfFloorsChange = (value) => {
    const numFloors = parseInt(value, 10) || 0;
    setEditFormData((prev) => {
      const currentFloors = prev.floors || [];
      let newFloors;
      if (numFloors <= 0) {
        newFloors = [];
      } else if (numFloors > currentFloors.length) {
        const emptyFloor = () => ({
          floor_name: "",
          dimensions: prev.dimensions || "",
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
        newFloors = [...currentFloors];
        for (let i = currentFloors.length; i < numFloors; i++) {
          newFloors.push(emptyFloor());
        }
      } else {
        newFloors = currentFloors.slice(0, numFloors);
      }
      return {
        ...prev,
        number_of_floors: numFloors > 0 ? String(numFloors) : "",
        floors: newFloors,
      };
    });
  };

  const updateFloor = (index, field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      floors: prev.floors.map((floor, i) =>
        i === index ? { ...floor, [field]: value } : floor
      ),
    }));
  };

  // ✅ UPDATED handleEditSave
  const handleEditSave = async () => {
    try {
      const ca = editFormData.construction_area;
      let constructionAreaValue = 0;

      if (ca !== null && ca !== undefined && ca !== "") {
        const strValue = String(ca).trim();
        if (strValue !== "") {
          const numValue = parseFloat(strValue);
          constructionAreaValue = isNaN(numValue) ? 0 : numValue;
        }
      }

      // Helper function to parse numeric values
      const parseNumericValue = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const strValue = String(value).trim();
        if (strValue === "") return null;
        const numValue = parseFloat(strValue);
        return isNaN(numValue) ? null : numValue;
      };

      // Process floors array - match new schema structure
      const processedFloors = (editFormData.floors || []).map((floor, index) => ({
        floor_name: floor.floor_name || "",
        dimensions: floor.dimensions || "",
        wall_height: parseNumericValue(floor.wall_height),
        floor_order: index,
        // Regular areas
        slab_area_regular: parseNumericValue(floor.slab_area_regular),
        brick_work_regular: parseNumericValue(floor.brick_work_regular),
        plastering_area_regular: parseNumericValue(floor.plastering_area_regular),
        // Customer add-on areas
        slab_area_customer_add_on: parseNumericValue(floor.slab_area_customer_add_on),
        brick_work_customer_add_on: parseNumericValue(floor.brick_work_customer_add_on),
        plastering_area_customer_add_on: parseNumericValue(floor.plastering_area_customer_add_on),
        // Avenue add-on areas
        slab_area_avenue_add_on: parseNumericValue(floor.slab_area_avenue_add_on),
        brick_work_avenue_add_on: parseNumericValue(floor.brick_work_avenue_add_on),
        plastering_area_avenue_add_on: parseNumericValue(floor.plastering_area_avenue_add_on),
      }));

      const requestData = {
        name: editFormData.name || "",
        type: editFormData.type || "",
        subtype: editFormData.subtype || "",
        budget: editFormData.budget
          ? typeof editFormData.budget === "string"
            ? parseFloat(editFormData.budget)
            : editFormData.budget
          : null,
        remarks: editFormData.remarks || "",
        dimensions: editFormData.dimensions || "",
        status: editFormData.status || "",
        construction_area: Number(constructionAreaValue),
        // Ensure number_of_floors matches floors count so backend doesn't store 0 when we have floors
        number_of_floors:
          processedFloors.length > 0
            ? Math.max(parseNumericValue(editFormData.number_of_floors) || 0, processedFloors.length)
            : parseNumericValue(editFormData.number_of_floors),
        floors: processedFloors,
        // Location & Owner
        address: editFormData.address || "",
        city: editFormData.city || "",
        state: editFormData.state || "",
        pincode: editFormData.pincode || "",
        landmark: editFormData.landmark || "",
        gps_coordinates: editFormData.gps_coordinates || "",
        owner_name: editFormData.owner_name || "",
        owner_phone: editFormData.owner_phone || "",
        owner_email: editFormData.owner_email || "",
        owner_address: editFormData.owner_address || "",
        // Structural
        foundation_type: editFormData.foundation_type || "",
        column_type: editFormData.column_type || "",
        beam_type: editFormData.beam_type || "",
        roof_type: editFormData.roof_type || "",
        structural_material: editFormData.structural_material || "",
        load_bearing_walls: editFormData.load_bearing_walls || "",
        seismic_zone: editFormData.seismic_zone || "",
        soil_type: editFormData.soil_type || "",
        structural_notes: editFormData.structural_notes || "",
        // Additional / Areas
        plot_area: parseNumericValue(editFormData.plot_area),
        built_up_area: parseNumericValue(editFormData.built_up_area),
        carpet_area: parseNumericValue(editFormData.carpet_area),
        parking_area: parseNumericValue(editFormData.parking_area),
        balcony_area: parseNumericValue(editFormData.balcony_area),
        terrace_area: parseNumericValue(editFormData.terrace_area),
        open_area: parseNumericValue(editFormData.open_area),
        front_setback: parseNumericValue(editFormData.front_setback),
        back_setback: parseNumericValue(editFormData.back_setback),
        left_setback: parseNumericValue(editFormData.left_setback),
        right_setback: parseNumericValue(editFormData.right_setback),
        start_date: editFormData.start_date || "",
        expected_completion_date: editFormData.expected_completion_date || "",
        project_manager: editFormData.project_manager || "",
        architect: editFormData.architect || "",
        contractor: editFormData.contractor || "",
        finishing_grade: editFormData.finishing_grade || "",
        additional_notes: editFormData.additional_notes || "",
      };

      const response = await axios.put(`${BASE_URL}/properties/${property.propertyid}`, requestData);

      if (response.status === 200) {
        // Sync floors via floors API so they persist after refresh (PUT may not store floors)
        if (processedFloors.length > 0) {
          let existingList = [];
          try {
            const existingRes = await getPropertyFloors(property.propertyid);
            existingList = Array.isArray(existingRes)
              ? existingRes
              : Array.isArray(existingRes?.floors)
                ? existingRes.floors
                : [];
          } catch (_) {
            // GET floors can 404 or fail if endpoint not available; treat as no existing floors
            existingList = [];
          }
          const existingSorted = [...existingList].sort(
            (a, b) => (a.floor_order ?? 0) - (b.floor_order ?? 0)
          );
          let syncError = null;
          for (let i = 0; i < processedFloors.length; i++) {
            const payload = { ...processedFloors[i], floor_order: i };
            const existing = existingSorted[i];
            const floorId = existing?.id ?? existing?.floor_id;
            try {
              if (floorId != null) {
                await updateFloor(floorId, payload);
              } else {
                await createFloor(property.propertyid, payload);
              }
            } catch (err) {
              syncError = err?.response?.data?.message || err?.response?.data?.detail || err?.message || "Create/update floor failed";
              console.error("Floor sync error:", err?.response?.data || err);
              break;
            }
          }
          if (syncError) {
            showDialog(`Property saved but floors could not be synced: ${syncError}`, "error");
          }
        }

        if (typeof refreshProperty === "function") refreshProperty();

        try {
          const completeRes = await axios.get(`${BASE_URL}/properties/${property.propertyid}/complete`, {
            params: { include_floors: true, include_history: false },
          });
          if (completeRes.data?.success && completeRes.data?.property) {
            const p = completeRes.data.property;
            let floors = completeRes.data.floors ?? p.floors ?? [];
            // If API returned no floors but we just saved floors, show what we saved so UI reflects the edit
            if (!Array.isArray(floors) || floors.length === 0) {
              if (processedFloors.length > 0) {
                floors = processedFloors.map((f) => ({
                  floor_name: f.floor_name || "",
                  dimensions: f.dimensions || "",
                  wall_height: f.wall_height ?? "",
                  slab_area_regular: f.slab_area_regular ?? f.slab_area ?? "",
                  brick_work_regular: f.brick_work_regular ?? f.brick_work_area ?? "",
                  plastering_area_regular: f.plastering_area_regular ?? f.plastering_area ?? "",
                  slab_area_customer_add_on: f.slab_area_customer_add_on ?? "",
                  brick_work_customer_add_on: f.brick_work_customer_add_on ?? "",
                  plastering_area_customer_add_on: f.plastering_area_customer_add_on ?? "",
                  slab_area_avenue_add_on: f.slab_area_avenue_add_on ?? "",
                  brick_work_avenue_add_on: f.brick_work_avenue_add_on ?? "",
                  plastering_area_avenue_add_on: f.plastering_area_avenue_add_on ?? "",
                }));
              }
            }
            const merged = { ...p, floors };
            setCurrentProperty(merged);
            const mappedFloors = Array.isArray(floors)
              ? floors.map((f) => ({
                  floor_name: f.floor_name || "",
                  dimensions: f.dimensions || "",
                  wall_height: f.wall_height || "",
                  slab_area_regular: f.slab_area_regular ?? f.slab_area ?? "",
                  brick_work_regular: f.brick_work_regular ?? f.brick_work_area ?? "",
                  plastering_area_regular: f.plastering_area_regular ?? f.plastering_area ?? "",
                  slab_area_customer_add_on: f.slab_area_customer_add_on ?? "",
                  brick_work_customer_add_on: f.brick_work_customer_add_on ?? "",
                  plastering_area_customer_add_on: f.plastering_area_customer_add_on ?? "",
                  slab_area_avenue_add_on: f.slab_area_avenue_add_on ?? "",
                  brick_work_avenue_add_on: f.brick_work_avenue_add_on ?? "",
                  plastering_area_avenue_add_on: f.plastering_area_avenue_add_on ?? "",
                }))
              : [];
            setEditFormData((prev) => ({
              ...prev,
              name: p.name || "",
              type: p.type || "",
              subtype: p.subtype || "",
              dimensions: p.dimensions || "",
              budget: p.budget ?? "",
              remarks: p.remarks || "",
              status: p.status || "",
              construction_area: p.construction_area != null && p.construction_area !== "" ? String(p.construction_area) : "",
              number_of_floors: p.number_of_floors != null && p.number_of_floors !== "" ? String(p.number_of_floors) : "",
              floors: mappedFloors,
              address: p.address || "",
              city: p.city || "",
              state: p.state || "",
              pincode: p.pincode || "",
              landmark: p.landmark || "",
              gps_coordinates: p.gps_coordinates || "",
              owner_name: p.owner_name || "",
              owner_phone: p.owner_phone || "",
              owner_email: p.owner_email || "",
              owner_address: p.owner_address || "",
              foundation_type: p.foundation_type || "",
              column_type: p.column_type || "",
              beam_type: p.beam_type || "",
              roof_type: p.roof_type || "",
              structural_material: p.structural_material || "",
              load_bearing_walls: p.load_bearing_walls || "",
              seismic_zone: p.seismic_zone || "",
              soil_type: p.soil_type || "",
              structural_notes: p.structural_notes || "",
              plot_area: p.plot_area != null && p.plot_area !== "" ? String(p.plot_area) : "",
              built_up_area: p.built_up_area != null && p.built_up_area !== "" ? String(p.built_up_area) : "",
              carpet_area: p.carpet_area != null && p.carpet_area !== "" ? String(p.carpet_area) : "",
              parking_area: p.parking_area != null && p.parking_area !== "" ? String(p.parking_area) : "",
              balcony_area: p.balcony_area != null && p.balcony_area !== "" ? String(p.balcony_area) : "",
              terrace_area: p.terrace_area != null && p.terrace_area !== "" ? String(p.terrace_area) : "",
              open_area: p.open_area != null && p.open_area !== "" ? String(p.open_area) : "",
              front_setback: p.front_setback != null && p.front_setback !== "" ? String(p.front_setback) : "",
              back_setback: p.back_setback != null && p.back_setback !== "" ? String(p.back_setback) : "",
              left_setback: p.left_setback != null && p.left_setback !== "" ? String(p.left_setback) : "",
              right_setback: p.right_setback != null && p.right_setback !== "" ? String(p.right_setback) : "",
              start_date: p.start_date || p.startdate || "",
              expected_completion_date: p.expected_completion_date || p.deadline || "",
              project_manager: p.project_manager || "",
              architect: p.architect || "",
              contractor: p.contractor || "",
              finishing_grade: p.finishing_grade || "",
              additional_notes: p.additional_notes || "",
            }));
          } else {
            const latest = await fetchLatestPropertyFromProjectList();
            if (latest) {
              let displayFloors = Array.isArray(latest.floors) ? latest.floors : [];
              if (displayFloors.length === 0 && processedFloors.length > 0) {
                displayFloors = processedFloors.map((f) => ({
                  floor_name: f.floor_name || "",
                  dimensions: f.dimensions || "",
                  wall_height: f.wall_height ?? "",
                  slab_area_regular: f.slab_area_regular ?? "",
                  brick_work_regular: f.brick_work_regular ?? "",
                  plastering_area_regular: f.plastering_area_regular ?? "",
                  slab_area_customer_add_on: f.slab_area_customer_add_on ?? "",
                  brick_work_customer_add_on: f.brick_work_customer_add_on ?? "",
                  plastering_area_customer_add_on: f.plastering_area_customer_add_on ?? "",
                  slab_area_avenue_add_on: f.slab_area_avenue_add_on ?? "",
                  brick_work_avenue_add_on: f.brick_work_avenue_add_on ?? "",
                  plastering_area_avenue_add_on: f.plastering_area_avenue_add_on ?? "",
                }));
              }
              setCurrentProperty((prev) => ({ ...(prev || {}), ...latest, floors: displayFloors }));
              const mapToFormFloors = (arr) =>
                (arr || []).map((f) => ({
                  floor_name: f.floor_name || "",
                  dimensions: f.dimensions || "",
                  wall_height: f.wall_height != null && f.wall_height !== "" ? String(f.wall_height) : "",
                  slab_area_regular: f.slab_area_regular ?? f.slab_area ?? "",
                  brick_work_regular: f.brick_work_regular ?? f.brick_work_area ?? "",
                  plastering_area_regular: f.plastering_area_regular ?? f.plastering_area ?? "",
                  slab_area_customer_add_on: f.slab_area_customer_add_on ?? "",
                  brick_work_customer_add_on: f.brick_work_customer_add_on ?? "",
                  plastering_area_customer_add_on: f.plastering_area_customer_add_on ?? "",
                  slab_area_avenue_add_on: f.slab_area_avenue_add_on ?? "",
                  brick_work_avenue_add_on: f.brick_work_avenue_add_on ?? "",
                  plastering_area_avenue_add_on: f.plastering_area_avenue_add_on ?? "",
                }));
              const mappedLatestFloors =
                displayFloors.length > 0 ? mapToFormFloors(displayFloors) : mapToFormFloors(latest.floors);
              setEditFormData({
                name: latest.name || "",
                type: latest.type || "",
                budget: latest.budget ?? "",
                remarks: latest.remarks || "",
                dimensions: latest.dimensions || "",
                subtype: latest.subtype || "",
                status: latest.status || "",
                construction_area: latest.construction_area != null && latest.construction_area !== "" ? latest.construction_area : "",
                number_of_floors: latest.number_of_floors != null && latest.number_of_floors !== "" ? latest.number_of_floors : "",
                floors: mappedLatestFloors,
              });
            } else {
              setCurrentProperty((prev) => ({ ...(prev || {}), ...requestData }));
            }
          }
        } catch (e) {
          console.error("Error refreshing after edit:", e?.response?.data || e);
          setCurrentProperty((prev) => ({ ...(prev || {}), ...requestData }));
        }

        showDialog("Property details updated successfully!", "success");
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      console.error("Error updating property details:", error?.response?.data || error);
      showDialog("Failed to update property details.", "error");
    }
  };

  // Initial fetch
  useEffect(() => {
    if (property?.propertyid) {
      fetchSchedule();
      fetchInventoryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.propertyid]);

  // Default selected task when schedule loads
  useEffect(() => {
    if (!selectedScheduleId && Array.isArray(schedule) && schedule.length > 0) {
      const first = schedule[0];
      setSelectedScheduleId(first?.scheduleid ?? null);
    }
  }, [schedule, selectedScheduleId]);

  const filteredSchedule = useMemo(() => {
    const list = Array.isArray(schedule) ? schedule : [];
    return list.filter((s) => {
      const q = taskSearch.trim().toLowerCase();
      const matchesText =
        !q ||
        String(s?.phasename || "").toLowerCase().includes(q) ||
        String(s?.remarks || "").toLowerCase().includes(q);

      const st = String(s?.status || "").toLowerCase();
      const filter = String(taskStatusFilter || "All").toLowerCase();
      const matchesStatus = filter === "all" ? true : st === filter;

      return matchesText && matchesStatus;
    });
  }, [schedule, taskSearch, taskStatusFilter]);

  const selectedTask = useMemo(() => {
    const list = Array.isArray(schedule) ? schedule : [];
    return list.find((s) => s?.scheduleid === selectedScheduleId) || list[0] || null;
  }, [schedule, selectedScheduleId]);

  if (!open) return null;

  const content = (
    <>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "70vh" }}>
          <CircularProgress />
        </Box>
      ) : property ? (
        <Box sx={{ p: 1.5 }}>
          {/* Top bar */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                {(currentProperty || property)?.name} Details
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Chip
                size="small"
                label={`Inventory: ₹ ${Number(inventoryTotals?.totalCost || 0).toLocaleString("en-IN")}`}
                sx={{ fontWeight: 700, bgcolor: "#EEF2FF", color: "#1E40AF" }}
              />
              <Chip
                size="small"
                label={`Labour: ₹ ${Number(labourTotals?.total || 0).toLocaleString("en-IN")}`}
                sx={{ fontWeight: 700, bgcolor: "#ECFDF5", color: "#065F46" }}
              />
              <Button
                onClick={() => setDetailsOpen((v) => !v)}
                startIcon={detailsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ whiteSpace: "nowrap", textTransform: "none", borderRadius: 2, fontWeight: 800 }}
              >
                {detailsOpen ? "Hide " : "Show "}
              </Button>

              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={openEditDialog}
                sx={{
                  bgcolor: "#2a3663",
                  color: "white",
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 800,
                  "&:hover": { bgcolor: "#1E2A48" },
                }}
              >
                Edit
              </Button>

              <Tooltip title="Delete Property">
                <IconButton
                  color="error"
                  onClick={() => setDeleteConfirmOpen(true)}
                  sx={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    "&:hover": { backgroundColor: "#ffe6e6" },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>

              <Button
                variant="outlined"
                onClick={onClose}
                sx={{
                  borderRadius: 2,
                  border: "1px solid #e5e7eb",
                  color: "#374151",
                  backgroundColor: "#fff",
                  fontWeight: 700,
                  px: 2,
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#f9fafb",
                    borderColor: "#d1d5db",
                  },
                }}
              >
                Close
              </Button>
            </Box>
          </Box>

          {/* Always-visible overview: key fields from GET (dimensions, etc.) */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              mb: 1.5,
              p: 2,
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} sm={4} md={2}>
                <Typography sx={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>Name</Typography>
                <Typography sx={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                  {(currentProperty || property)?.name || "—"}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography sx={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>Type</Typography>
                <Typography sx={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                  {(currentProperty || property)?.type || "—"}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography sx={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>Dimensions</Typography>
                <Typography sx={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                  {(currentProperty || property)?.dimensions || "—"}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography sx={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>Construction Area</Typography>
                <Typography sx={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                  {(currentProperty || property)?.construction_area != null && (currentProperty || property)?.construction_area !== ""
                    ? `${(currentProperty || property)?.construction_area} sq.ft`
                    : "—"}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography sx={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>Budget</Typography>
                <Typography sx={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                  {(currentProperty || property)?.budget != null ? `₹ ${(currentProperty || property)?.budget}` : "—"}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography sx={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>Status</Typography>
                <Typography sx={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                  {(currentProperty || property)?.status || "—"}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Summary bar wrapper (collapsible) */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              bgcolor: "#fff",
              border: "1px solid #e5e7eb",
              mb: 0.5,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.25,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "#fbfdff",
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>
                Property Details
              </Typography>
            </Box>

            <Divider sx={{ borderColor: "#e5e7eb" }} />

            <Collapse in={detailsOpen} timeout={180} unmountOnExit>
              <Box sx={{ p: 2 }}>
                {loadingComplete ? (
                  <Box sx={{ py: 3, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <CircularProgress size={28} sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">Loading property details…</Typography>
                  </Box>
                ) : (
                <>
                <Grid container spacing={2} alignItems="flex-start">
                  {/* Name, Type, Dimensions, Construction Area, Budget, Status are in the overview bar above — not repeated here */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Sub Type</Typography>
                    <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                      {(currentProperty || property)?.subtype || "N/A"}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Remarks</Typography>
                    <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                      {(currentProperty || property)?.remarks || "—"}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3} sx={{ display: "flex" }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>
                        Status
                      </Typography>
                      <Chip
                        label={String((currentProperty || property)?.status || "N/A").toUpperCase()}
                        onClick={handleStatusChipClick}
                        sx={{
                          fontWeight: 900,
                          letterSpacing: 0.3,
                          px: 1,
                          cursor: "pointer",
                          borderRadius: 999,
                          bgcolor: "#eef2f7",
                          color: "#334155",
                          border: "1px solid #e2e8f0",
                          ml: 1,
                        }}
                      />

                      <Menu
                        anchorEl={statusMenuAnchor}
                        open={statusMenuOpen}
                        onClose={handleStatusMenuClose}
                        PaperProps={{
                          sx: {
                            borderRadius: 3,
                            boxShadow: "0px 10px 30px rgba(0,0,0,0.12)",
                            mt: 1,
                            minWidth: 220,
                          },
                        }}
                      >
                        {[
                          "Planning",
                          "In Progress",
                          "Completed",
                          "Not Started",
                          "On Hold",
                          "Cancelled",
                          "Available",
                          "Sold",
                          "Under Construction",
                        ].map((status) => (
                          <MenuItem
                            key={status}
                            onClick={() => {
                              handleStatusChange({ target: { value: status } });
                              handleStatusMenuClose();
                              setEditFormData((p) => ({ ...p, status }));
                            }}
                            selected={status === (currentProperty || property)?.status}
                            disabled={updatingStatus}
                            sx={{ py: 1.2, px: 2, fontWeight: 700 }}
                          >
                            {status}
                          </MenuItem>
                        ))}
                      </Menu>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>
                      Number of Floors
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                      {(currentProperty || property)?.number_of_floors != null &&
                      (currentProperty || property)?.number_of_floors !== ""
                        ? (currentProperty || property)?.number_of_floors
                        : "N/A"}
                    </Typography>
                  </Grid>

                  {/* Location & Owner */}
                  {(currentProperty || property)?.address || (currentProperty || property)?.city || (currentProperty || property)?.owner_name ? (
                    <>
                      <Grid item xs={12}>
                        <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#374151", mt: 2, mb: 1 }}>
                          Location & Owner
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Address</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.address || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>City</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.city || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>State</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.state || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Pincode</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.pincode || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Owner Name</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.owner_name || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Owner Phone</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.owner_phone || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Owner Email</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.owner_email || "—"}
                        </Typography>
                      </Grid>
                    </>
                  ) : null}

                  {/* Structural Information */}
                  {(currentProperty || property)?.foundation_type || (currentProperty || property)?.roof_type || (currentProperty || property)?.structural_material ? (
                    <>
                      <Grid item xs={12}>
                        <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#374151", mt: 2, mb: 1 }}>
                          Structural Information
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Foundation Type</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.foundation_type || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Column Type</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.column_type || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Beam Type</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.beam_type || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Roof Type</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.roof_type || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Structural Material</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.structural_material || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Seismic Zone</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.seismic_zone || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Soil Type</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.soil_type || "—"}
                        </Typography>
                      </Grid>
                      {(currentProperty || property)?.structural_notes ? (
                        <Grid item xs={12}>
                          <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Structural Notes</Typography>
                          <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                            {(currentProperty || property)?.structural_notes}
                          </Typography>
                        </Grid>
                      ) : null}
                    </>
                  ) : null}

                  {/* Additional Details / Areas */}
                  {((currentProperty || property)?.plot_area != null && (currentProperty || property)?.plot_area !== "") ||
                  ((currentProperty || property)?.built_up_area != null && (currentProperty || property)?.built_up_area !== "") ||
                  (currentProperty || property)?.parking_area != null || (currentProperty || property)?.project_manager ? (
                    <>
                      <Grid item xs={12}>
                        <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#374151", mt: 2, mb: 1 }}>
                          Additional Details & Areas
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Plot Area (sq.ft)</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.plot_area != null && (currentProperty || property)?.plot_area !== "" ? (currentProperty || property)?.plot_area : "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Built-up Area (sq.ft)</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.built_up_area != null && (currentProperty || property)?.built_up_area !== "" ? (currentProperty || property)?.built_up_area : "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Carpet Area (sq.ft)</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.carpet_area != null && (currentProperty || property)?.carpet_area !== "" ? (currentProperty || property)?.carpet_area : "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Parking Area (sq.ft)</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.parking_area != null && (currentProperty || property)?.parking_area !== "" ? (currentProperty || property)?.parking_area : "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Balcony / Terrace / Open (sq.ft)</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {((currentProperty || property)?.balcony_area != null && (currentProperty || property)?.balcony_area !== "") ||
                          ((currentProperty || property)?.terrace_area != null && (currentProperty || property)?.terrace_area !== "") ||
                          ((currentProperty || property)?.open_area != null && (currentProperty || property)?.open_area !== "")
                            ? `${(currentProperty || property)?.balcony_area ?? "—"} / ${(currentProperty || property)?.terrace_area ?? "—"} / ${(currentProperty || property)?.open_area ?? "—"}`
                            : "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Project Manager</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.project_manager || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Architect</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.architect || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Contractor</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.contractor || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Finishing Grade</Typography>
                        <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                          {(currentProperty || property)?.finishing_grade || "—"}
                        </Typography>
                      </Grid>
                      {(currentProperty || property)?.start_date || (currentProperty || property)?.startdate ? (
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Start Date</Typography>
                          <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                            {(currentProperty || property)?.start_date || (currentProperty || property)?.startdate || "—"}
                          </Typography>
                        </Grid>
                      ) : null}
                      {(currentProperty || property)?.expected_completion_date || (currentProperty || property)?.deadline ? (
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography sx={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>Expected Completion</Typography>
                          <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 800 }}>
                            {(currentProperty || property)?.expected_completion_date || (currentProperty || property)?.deadline || "—"}
                          </Typography>
                        </Grid>
                      ) : null}
                    </>
                  ) : null}
                </Grid>

                {/* Floors: from GET complete (include_floors: true), shown in details only */}
                {Array.isArray((currentProperty || property)?.floors) && (currentProperty || property).floors.length > 0 ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#374151", mb: 1.5 }}>
                      Floor Details
                    </Typography>
                    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, overflow: "auto" }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ bgcolor: "#f8fafc" }}>
                            <TableCell sx={{ fontWeight: 800, fontSize: 11, color: "#64748b" }}>Floor</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: 11, color: "#64748b" }}>Dimensions</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: 11, color: "#64748b" }}>Wall Ht</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: 11, color: "#64748b" }}>Slab (sq.ft)</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: 11, color: "#64748b" }}>Brick (sq.ft)</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: 11, color: "#64748b" }}>Plaster (sq.ft)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(currentProperty || property).floors.map((f, i) => (
                            <TableRow key={i} sx={{ "&:nth-of-type(even)": { bgcolor: "#fafafa" } }}>
                              <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{f.floor_name || `Floor ${i + 1}`}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{f.dimensions || "—"}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{f.wall_height != null && f.wall_height !== "" ? f.wall_height : "—"}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{f.slab_area_regular ?? f.slab_area ?? "—"}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{f.brick_work_regular ?? f.brick_work_area ?? "—"}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{f.plastering_area_regular ?? f.plastering_area ?? "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ) : (
                  <Box sx={{ mt: 2, py: 1.5, px: 2, bgcolor: "#f8fafc", borderRadius: 1, border: "1px solid #e2e8f0" }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      No floor details available. Add floors in Edit Property.
                    </Typography>
                  </Box>
                )}
                </>
                )}
              </Box>
            </Collapse>
          </Paper>

          {/* Main tabs */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e5e7eb", bgcolor: "#fff" }}>
            <Box sx={{ px: 2, pt: 1 }}>
              <Tabs
                value={mainTab}
                onChange={(e, v) => setMainTab(v)}
                sx={{
                  minHeight: 40,
                  "& .MuiTab-root": { textTransform: "none", fontWeight: 800, minHeight: 40 },
                }}
              >
                {mainTabs.map((t) => (
                  <Tab key={t.key} label={t.label} />
                ))}
              </Tabs>
            </Box>

            <Divider sx={{ borderColor: "#e5e7eb" }} />

            <Box sx={{ p: 2 }}>

              {activeTabKey === "workflow" && (
                <Box
                  sx={{
                    width: "100%",
                    minHeight: 520,
                    bgcolor: "#f3f4f6",
                    borderRadius: 3,
                    border: "1px solid #e5e7eb",
                    p: 2,
                  }}
                >
                  {loadingSchedule ? (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, width: "100%" }}>
                      <CircularProgress size={48} sx={{ color: "#2563EB" }} />
                      <Typography sx={{ ml: 2, color: "#64748b" }}>Loading schedule…</Typography>
                    </Box>
                  ) : (
                    <WorkflowDiagram
                      data={{ schedule }}
                      propertyId={property.propertyid}
                      propertyScheduleId={property.propertyScheduleId}
                      refreshSchedule={fetchSchedule}
                      onOpenInTaskView={(scheduleid) => {
                        if (scheduleid != null) setSelectedScheduleId(Number(scheduleid));
                        setMainTab(tabIndexByKey.get("task") ?? 0);
                      }}
                      onOpenUploadSchedule={() => setUploadDialogOpen(true)}
                    />
                  )}
                </Box>
              )}

              {activeTabKey === "task" && (
                <Box sx={{ display: "flex", gap: 2, height: "72vh", minHeight: 560 }}>
                  <TaskManager
                    propertyId={property?.propertyid}
                    initialTask={selectedTask}
                    refreshTasks={refreshTasks}
                  />
                </Box>
              )}

              {activeTabKey === "calendar" && (
                <Box sx={{ width: "100%", maxWidth: 1500, mx: "auto" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                    {schedule.length > 0 ? (
                      <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteSchedule}
                        sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2 }}
                      >
                        Delete Schedule
                      </Button>
                    ) : (
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
                        <Button
                          variant="contained"
                          onClick={() => setUploadDialogOpen(true)}
                          startIcon={<AddIcon />}
                          sx={{
                            textTransform: "none",
                            fontWeight: 900,
                            borderRadius: 2,
                            bgcolor: "#2563EB",
                            color: "#fff",
                            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.5)",
                            border: "2px solid #1d4ed8",
                            "&:hover": {
                              bgcolor: "#1d4ed8",
                              boxShadow: "0 6px 20px rgba(37, 99, 235, 0.55)",
                            },
                          }}
                        >
                          Upload Schedule
                        </Button>
                        <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 700 }}>
                          No schedule found — upload to add one
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <CalendarView
                    propertyId={property?.propertyid}
                    tasks={filteredSchedule}
                    refreshTasks={refreshTasks}
                    onOpenTaskInTaskView={(task) => {
                      if (task?.scheduleid != null) setSelectedScheduleId(task.scheduleid);
                      setMainTab(tabIndexByKey.get("task") ?? 0);
                    }}
                  />
                </Box>
              )}

              {activeTabKey === "employees" && <PropertyEmployeesTab property={property} showDialog={showDialog} />}
              {activeTabKey === "documents" && <PropertyDocumentsTab property={property} showDialog={showDialog} />}

              {/* Chat tab */}
              {activeTabKey === "chat" && (
                <Box sx={{ width: "100%" }}>
                  <PropertyLiveChatUpdates property={property} height="72vh" />
                </Box>
              )}

              {activeTabKey === "phaseInventory" && (
                <PropertyPhaseInventoryTab
                  property={currentProperty || property}
                  baseUrl={BASE_URL}
                  showDialog={showDialog}
                  onScheduleUploaded={fetchSchedule}
                />
              )}

              {activeTabKey === "inventory" && (
                <Box sx={{ minHeight: 400 }}>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<OpenInNewIcon />}
                      onClick={() => navigate(`/property/${encodeURIComponent(effectivePropertyId)}/inventory`)}
                      sx={{ textTransform: "none", fontWeight: 800 }}
                    >
                      Open full page
                    </Button>
                  </Box>
                  <InventoryPage
                    propertyId={effectivePropertyId}
                    onClose={onClose}
                    onTotalsChange={setInventoryTotals}
                  />
                </Box>
              )}

              {activeTabKey === "labour" && (
                <Box sx={{ minHeight: 400 }}>
                  <LabourExpenses
                    propertyId={effectivePropertyId}
                    onClose={onClose}
                    onTotalsChange={setLabourTotals}
                  />
                </Box>
              )}

              {activeTabKey === "approvals" && (
                <Box sx={{ minHeight: 420 }}>
                  <PropertyApprovalsTab propertyId={effectivePropertyId} />
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      ) : (
        <Box padding={4}>
          <Typography variant="body1">Property not found.</Typography>
        </Box>
      )}

      {/* ✅ Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: "90%",
            maxWidth: "1000px",
            maxHeight: "90vh",
          },
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Edit Property Details
          </Typography>
        </Box>

        <DialogContent sx={{ pt: 0, px: 2, mt: 0, maxHeight: "70vh", overflowY: "auto" }}>
          {/* Basic info: hidden by default, press to show */}
          <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, mb: 1.5, overflow: "hidden" }}>
            <Button
              fullWidth
              onClick={() => setEditSectionBasic((v) => !v)}
              startIcon={editSectionBasic ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ justifyContent: "flex-start", px: 2, py: 1.5, textTransform: "none", fontWeight: 800, color: "#374151" }}
            >
              {editSectionBasic ? "Hide" : "Show"} Basic info (Name, Type, Budget, Status…)
            </Button>
            <Collapse in={editSectionBasic}>
              <Box sx={{ px: 2, pb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Name" variant="outlined" value={editFormData.name || ""} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Type" variant="outlined" value={editFormData.type || ""} onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Budget" variant="outlined" value={editFormData.budget || ""} onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Remarks" variant="outlined" value={editFormData.remarks || ""} onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Dimensions" variant="outlined" value={editFormData.dimensions || ""} onChange={(e) => setEditFormData({ ...editFormData, dimensions: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Subtype" variant="outlined" value={editFormData.subtype || ""} onChange={(e) => setEditFormData({ ...editFormData, subtype: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Status" variant="outlined" value={editFormData.status || ""} onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Construction Area" variant="outlined" type="number" value={editFormData.construction_area != null && editFormData.construction_area !== "" ? editFormData.construction_area : ""} onChange={(e) => setEditFormData({ ...editFormData, construction_area: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} helperText="sq.ft" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Number of Floors" variant="outlined" type="number" value={editFormData.number_of_floors != null && editFormData.number_of_floors !== "" ? editFormData.number_of_floors : ""} onChange={(e) => handleNumberOfFloorsChange(e.target.value)} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} inputProps={{ min: 0 }} helperText={editFormData.floors?.length ? `${editFormData.floors.length} floor(s) will be saved` : ""} />
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Paper>

          {/* Location & Owner: hidden by default */}
          <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, mb: 1.5, overflow: "hidden" }}>
            <Button
              fullWidth
              onClick={() => setEditSectionLocation((v) => !v)}
              startIcon={editSectionLocation ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ justifyContent: "flex-start", px: 2, py: 1.5, textTransform: "none", fontWeight: 800, color: "#374151" }}
            >
              {editSectionLocation ? "Hide" : "Show"} Location & Owner
            </Button>
            <Collapse in={editSectionLocation}>
              <Box sx={{ px: 2, pb: 2 }}>
                <Grid container spacing={2}>
                  {["address", "city", "state", "pincode", "landmark", "gps_coordinates", "owner_name", "owner_phone", "owner_email", "owner_address"].map((field) => (
                    <Grid item xs={12} sm={6} key={field}>
                      <TextField fullWidth label={field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} variant="outlined" size="small" value={editFormData[field] || ""} onChange={(e) => setEditFormData({ ...editFormData, [field]: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} multiline={field === "owner_address"} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Collapse>
          </Paper>

          {/* Structural: hidden by default */}
          <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, mb: 1.5, overflow: "hidden" }}>
            <Button fullWidth onClick={() => setEditSectionStructural((v) => !v)} startIcon={editSectionStructural ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ justifyContent: "flex-start", px: 2, py: 1.5, textTransform: "none", fontWeight: 800, color: "#374151" }}>
              {editSectionStructural ? "Hide" : "Show"} Structural Information
            </Button>
            <Collapse in={editSectionStructural}>
              <Box sx={{ px: 2, pb: 2 }}>
                <Grid container spacing={2}>
                  {["foundation_type", "column_type", "beam_type", "roof_type", "structural_material", "load_bearing_walls", "seismic_zone", "soil_type", "structural_notes"].map((field) => (
                    <Grid item xs={12} sm={6} key={field}>
                      <TextField fullWidth label={field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} variant="outlined" size="small" value={editFormData[field] || ""} onChange={(e) => setEditFormData({ ...editFormData, [field]: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} multiline={field === "structural_notes"} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Collapse>
          </Paper>

          {/* Additional Details & Areas: hidden by default */}
          <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, mb: 1.5, overflow: "hidden" }}>
            <Button fullWidth onClick={() => setEditSectionAdditional((v) => !v)} startIcon={editSectionAdditional ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ justifyContent: "flex-start", px: 2, py: 1.5, textTransform: "none", fontWeight: 800, color: "#374151" }}>
              {editSectionAdditional ? "Hide" : "Show"} Additional Details & Areas
            </Button>
            <Collapse in={editSectionAdditional}>
              <Box sx={{ px: 2, pb: 2 }}>
                <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Plot Area (sq.ft)" variant="outlined" size="small" type="number" value={editFormData.plot_area || ""} onChange={(e) => setEditFormData({ ...editFormData, plot_area: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Built-up Area (sq.ft)" variant="outlined" size="small" type="number" value={editFormData.built_up_area || ""} onChange={(e) => setEditFormData({ ...editFormData, built_up_area: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Carpet Area (sq.ft)" variant="outlined" size="small" type="number" value={editFormData.carpet_area || ""} onChange={(e) => setEditFormData({ ...editFormData, carpet_area: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Parking Area (sq.ft)" variant="outlined" size="small" type="number" value={editFormData.parking_area || ""} onChange={(e) => setEditFormData({ ...editFormData, parking_area: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Project Manager" variant="outlined" size="small" value={editFormData.project_manager || ""} onChange={(e) => setEditFormData({ ...editFormData, project_manager: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Architect" variant="outlined" size="small" value={editFormData.architect || ""} onChange={(e) => setEditFormData({ ...editFormData, architect: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Contractor" variant="outlined" size="small" value={editFormData.contractor || ""} onChange={(e) => setEditFormData({ ...editFormData, contractor: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Finishing Grade" variant="outlined" size="small" value={editFormData.finishing_grade || ""} onChange={(e) => setEditFormData({ ...editFormData, finishing_grade: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Start Date" variant="outlined" size="small" value={editFormData.start_date || ""} onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Expected Completion" variant="outlined" size="small" value={editFormData.expected_completion_date || ""} onChange={(e) => setEditFormData({ ...editFormData, expected_completion_date: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Additional Notes" variant="outlined" size="small" multiline rows={2} value={editFormData.additional_notes || ""} onChange={(e) => setEditFormData({ ...editFormData, additional_notes: e.target.value })} sx={{ backgroundColor: "#fafafa", borderRadius: 1 }} />
            </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Paper>

          {/* Floor Details: hidden by default, action Add Floor in header */}
          <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, mb: 2, overflow: "hidden" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1.5, flexWrap: "wrap", gap: 1 }}>
              <Button
                fullWidth
                onClick={() => setEditSectionFloors((v) => !v)}
                startIcon={editSectionFloors ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ justifyContent: "flex-start", textTransform: "none", fontWeight: 800, color: "#374151", flex: 1, minWidth: 200 }}
              >
                {editSectionFloors ? "Hide" : "Show"} Floor Details {editFormData.floors?.length ? `(${editFormData.floors.length})` : ""}
              </Button>
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={addFloor} sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#2a3663", "&:hover": { bgcolor: "#1E2A48" } }}>
                Add Floor
              </Button>
            </Box>
            <Collapse in={editSectionFloors}>
          <Box sx={{ px: 2, pb: 2 }}>

            {editFormData.floors && editFormData.floors.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {editFormData.floors.map((floor, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 2,
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      bgcolor: "#fafafa",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: 14, color: "#111827" }}>
                        Floor {index + 1}
                      </Typography>
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
                      {/* Basic Info */}
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Floor Name (e.g., GF, FF, SF)"
                          variant="outlined"
                          size="small"
                          value={floor.floor_name || ""}
                          onChange={(e) => updateFloor(index, "floor_name", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                          placeholder="GF, FF, SF, etc."
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Dimensions"
                          variant="outlined"
                          size="small"
                          value={floor.dimensions || ""}
                          onChange={(e) => updateFloor(index, "dimensions", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                          placeholder="e.g., 30x40"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Wall Height"
                          variant="outlined"
                          type="number"
                          size="small"
                          value={floor.wall_height || ""}
                          onChange={(e) => updateFloor(index, "wall_height", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                          helperText="feet"
                          inputProps={{ min: 0, step: 0.1 }}
                        />
                      </Grid>

                      {/* Divider */}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#6b7280", mb: 1 }}>
                          Slab Area (sq. ft)
                        </Typography>
                      </Grid>

                      {/* Slab Areas */}
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Regular"
                          variant="outlined"
                          type="number"
                          size="small"
                          value={floor.slab_area_regular || ""}
                          onChange={(e) => updateFloor(index, "slab_area_regular", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Customer Add-on"
                          variant="outlined"
                          type="number"
                          size="small"
                          value={floor.slab_area_customer_add_on || ""}
                          onChange={(e) => updateFloor(index, "slab_area_customer_add_on", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1, border: "1px solid #10b981" }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Avenue Add-on"
                          variant="outlined"
                          type="number"
                          size="small"
                          value={floor.slab_area_avenue_add_on || ""}
                          onChange={(e) => updateFloor(index, "slab_area_avenue_add_on", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1, border: "1px solid #ef4444" }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>

                      {/* Divider */}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#6b7280", mb: 1 }}>
                          Brick Work Area (sq. ft)
                        </Typography>
                      </Grid>

                      {/* Brick Work Areas */}
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Regular"
                          variant="outlined"
                          type="number"
                          size="small"
                          value={floor.brick_work_regular || ""}
                          onChange={(e) => updateFloor(index, "brick_work_regular", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Customer Add-on"
                          variant="outlined"
                          type="number"
                          size="small"
                          value={floor.brick_work_customer_add_on || ""}
                          onChange={(e) => updateFloor(index, "brick_work_customer_add_on", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1, border: "1px solid #10b981" }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Avenue Add-on"
                          variant="outlined"
                          type="number"
                          size="small"
                          value={floor.brick_work_avenue_add_on || ""}
                          onChange={(e) => updateFloor(index, "brick_work_avenue_add_on", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1, border: "1px solid #ef4444" }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>

                      {/* Divider */}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#6b7280", mb: 1 }}>
                          Plastering Area (sq. ft)
                        </Typography>
                      </Grid>

                      {/* Plastering Areas */}
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Regular"
                          variant="outlined"
                          type="number"
                          size="small"
                          value={floor.plastering_area_regular || ""}
                          onChange={(e) => updateFloor(index, "plastering_area_regular", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Customer Add-on"
                          variant="outlined"
                          type="number"
                          size="small"
                          value={floor.plastering_area_customer_add_on || ""}
                          onChange={(e) => updateFloor(index, "plastering_area_customer_add_on", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1, border: "1px solid #10b981" }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Avenue Add-on"
                          variant="outlined"
                          type="number"
                          size="small"
                          value={floor.plastering_area_avenue_add_on || ""}
                          onChange={(e) => updateFloor(index, "plastering_area_avenue_add_on", e.target.value)}
                          sx={{ backgroundColor: "#fff", borderRadius: 1, border: "1px solid #ef4444" }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: "1px dashed #d1d5db",
                  borderRadius: 2,
                  textAlign: "center",
                  bgcolor: "#f9fafb",
                }}
              >
                <Typography sx={{ color: "#6b7280", fontSize: 14 }}>
                  No floors yet. Set <strong>Number of Floors</strong> in Basic info above, or click <strong>Add Floor</strong> to add floor details. Then click Save.
                </Typography>
              </Paper>
            )}
          </Box>
            </Collapse>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ pt: 1, justifyContent: "flex-end", px: 2 }}>
          <Button onClick={() => setIsEditDialogOpen(false)} variant="text" sx={{ textTransform: "none", color: "error" }}>
            Cancel
          </Button>
          <Button onClick={handleEditSave} variant="contained" sx={{ textTransform: "none", bgcolor: "#2a3663", "&:hover": { bgcolor: "#1E2A48" } }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Upload / Create – same dialog from Workflow or Calendar tab */}
      <ScheduleCreationDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        property={property}
        onSuccess={() => {
          fetchSchedule();
          setUploadDialogOpen(false);
        }}
      />

      {/* Global message dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <Box sx={{ padding: 3, textAlign: "center" }}>
          <Typography variant="h6" sx={{ color: dialogType === "success" ? "green" : "red" }}>
            {dialogMessage}
          </Typography>
          <Button onClick={() => setDialogOpen(false)} variant="contained" sx={{ marginTop: 2 }}>
            OK
          </Button>
        </Box>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <Box sx={{ padding: 3, textAlign: "center" }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Are you sure you want to delete this property?
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            This action will remove the property.
          </Typography>
          <Box display="flex" justifyContent="center" gap={2}>
            <Button variant="outlined" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="contained" color="error" onClick={handleDeleteProperty}>
              Delete
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );

  if (embedded) {
    return <Box sx={{ bgcolor: "#f6f7fb", borderRadius: 4, overflow: "hidden" }}>{content}</Box>;
  }

  return (
    <Dialog
      open={open}
      onClose={() => { testLog(COMPONENT, "dialogClose", { propertyId: property?.propertyid }); onClose?.(); }}
      fullWidth
      maxWidth="xl"
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 4,
          overflow: "hidden",
          bgcolor: "#f6f7fb",
        },
      }}
    >
      {content}
    </Dialog>
  );
};

export default PropertyDetailsDialog;
