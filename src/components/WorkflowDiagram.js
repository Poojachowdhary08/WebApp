import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, MarkerType, getNodesBounds, useReactFlow, Panel, ReactFlowProvider, Handle, Position, } from '@xyflow/react';
import TaskManager from "./TaskManager";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem, Menu, Box, Card,
  CardContent,
  Typography,
  Collapse,
  Snackbar,
  Alert,
} from '@mui/material';
import { Tooltip } from '@mui/material';
import { Drawer, List, ListItem, ListItemText, Divider } from "@mui/material";
import DiagramExportDialog from './DiagramExportDialog';
import { exportReactFlowDiagram } from './DiagramExportHelper';
import { toPng } from 'html-to-image';
import '@xyflow/react/dist/style.css';
import AddIcon from '@mui/icons-material/Add';
import './WorkflowDiagram.css';
import jsPDF from 'jspdf';
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { IconButton } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import html2canvas from "html2canvas";
import domtoimage from 'dom-to-image-more';
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  Paper,
  FormControl,
  InputLabel,
  Select,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { LinearProgress } from '@mui/material';
import axios from 'axios';
import Grid from '@mui/material/Grid';
import CloseIcon from '@mui/icons-material/Close';
import ScheduleSummaryDialog from "./ScheduleSummaryDialog"; // adjust path if needed
import { CookieSharp } from '@mui/icons-material';
import ScheduleKPISummary from "./ScheduleKPISummary";
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import SearchIcon from '@mui/icons-material/Search';
import CustomNodeWithAddButton from "./CustomNodeWithAddButton";
import dagre from "@dagrejs/dagre";
import ELK from "elkjs/lib/elk.bundled.js";

// 👉 One place to control all edge visuals
const defaultEdgeOptions = {
  type: "smoothstep",
  style: {
    stroke: "#111827",   // dark line (2px)
    strokeWidth: 2,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#111827",
    width: 16,           // tweak until it “feels” right
    height: 16,
  },
};

// 👉 Single source of truth for node size → exact placements (spacing & overlap use these)
const LAYOUT = {
  NODE_WIDTH: 250,
  NODE_HEIGHT: 212,
  X_GAP: 50,    // horizontal space between nodes
  Y_GAP: 50,    // vertical space between rows (levels)
};
// Derived (so vertical/horizontal spacing is exact from node dimensions)
const X_SPACING = LAYOUT.NODE_WIDTH + LAYOUT.X_GAP;
const Y_SPACING = LAYOUT.NODE_HEIGHT + LAYOUT.Y_GAP;

const NOTE_NODE_WIDTH = 260;
const NOTE_NODE_HEIGHT = 80;
// Minimum spacing used by placement helpers (notes + fallback).
// Needs to be large enough for dense workflows near the bottom.
const PLACEMENT_MIN_GAP = 64;

/** Returns { x, y } that does not overlap any box. Tries desired first, then grid of slots. */
function findNonOverlappingPosition(desiredX, desiredY, boxes, boxWidth, boxHeight, minGap = PLACEMENT_MIN_GAP) {
  const stepX = boxWidth + minGap;
  const stepY = boxHeight + minGap;
  const overlaps = (x, y) =>
    boxes.some(
      (b) =>
        x + boxWidth + minGap > b.x &&
        b.x + b.width + minGap > x &&
        y + boxHeight + minGap > b.y &&
        b.y + b.height + minGap > y
    );
  // Search a larger grid around the desired point.
  // Some properties have many phases clustered tightly.
  for (let dy = 0; dy <= 60; dy++) {
    for (let dx = 0; dx <= 60; dx++) {
      const x = desiredX + dx * stepX;
      const y = desiredY + dy * stepY;
      if (!overlaps(x, y)) return { x, y };
    }
  }
  return { x: desiredX, y: desiredY };
}

/** Build boxes from React Flow nodes for collision check (main nodes use LAYOUT, text/notes use NOTE_*). */
function nodesToBoxes(nodes) {
  if (!nodes || !nodes.length) return [];
  return nodes
    .filter((n) => n.position?.x != null && n.position?.y != null)
    .map((n) => ({
      x: n.position.x,
      y: n.position.y,
      width: n.data?.isTextOnly ? NOTE_NODE_WIDTH : LAYOUT.NODE_WIDTH,
      height: n.data?.isTextOnly ? NOTE_NODE_HEIGHT : LAYOUT.NODE_HEIGHT,
    }));
}

// Minimum spacing used by overlap resolvers.
// Keep this moderate so we avoid overlap without exploding the layout.
const RESOLVE_MIN_GAP = 88;

/** Get parent schedule ids for an item (for dagre edges). */
function getScheduleParentIds(item) {
  const target = item?.scheduleid;
  if (!item) return [];
  if (item.depends_on_scheduleid != null) {
    if (Array.isArray(item.depends_on_scheduleid)) {
      return item.depends_on_scheduleid.map((id) => parseInt(id)).filter((id) => !isNaN(id) && id !== target);
    }
    const single = parseInt(item.depends_on_scheduleid);
    if (!isNaN(single) && single !== target) return [single];
  }
  if (Array.isArray(item.depends_on_scheduleids) && item.depends_on_scheduleids.length > 0) {
    return item.depends_on_scheduleids.map((id) => parseInt(id)).filter((id) => !isNaN(id) && id !== target);
  }
  return [];
}

/**
 * Dagre layout: returns a Map(scheduleid -> { x, y }) with top-left positions for each schedule node.
 * Uses LAYOUT dimensions and spacing so the diagram is hierarchical and non-overlapping.
 * Falls back to null if dagre throws (caller will use findNonOverlappingPosition).
 */
function getDagreLayout(schedule) {
  if (!schedule?.length) return new Map();
  try {
    const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: "LR",
      nodesep: LAYOUT.X_GAP,
      ranksep: LAYOUT.Y_GAP,
      marginx: 20,
      marginy: 20,
    });

    const w = LAYOUT.NODE_WIDTH;
    const h = LAYOUT.NODE_HEIGHT;

    schedule.forEach((item) => {
      const id = String(item.scheduleid);
      g.setNode(id, { width: w, height: h });
    });

    schedule.forEach((item) => {
      const target = item.scheduleid;
      const parents = getScheduleParentIds(item);
      parents.forEach((parentId) => {
        if (parentId && parentId !== target) g.setEdge(String(parentId), String(target), {});
      });
    });

    dagre.layout(g);

    const positionMap = new Map();
    schedule.forEach((item) => {
      const id = String(item.scheduleid);
      const node = g.node(id);
      if (node?.x != null && node?.y != null) {
        positionMap.set(item.scheduleid, {
          x: node.x - w / 2,
          y: node.y - h / 2,
        });
      }
    });
    return positionMap;
  } catch (err) {
    console.warn("Dagre layout failed, using fallback placement:", err?.message);
    return new Map();
  }
}

/**
 * ELK layered layout: returns a Map(scheduleid -> { x, y }) with top-left positions.
 * This handles joins (multi-parents) and nested branching more consistently than dagre.
 */
async function getElkLayout(schedule, { direction = "DOWN" } = {}) {
  if (!schedule?.length) return new Map();

  const elk = new ELK();
  const w = LAYOUT.NODE_WIDTH;
  const h = LAYOUT.NODE_HEIGHT;

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction, // "DOWN" (top->bottom) or "RIGHT" (left->right)
      // Spacing: make card diagram breathe (prevents visual/actual overlaps).
      "elk.layered.spacing.nodeNodeBetweenLayers": String(Math.max(120, Math.round(LAYOUT.Y_GAP * 2.2))),
      "elk.spacing.nodeNode": String(Math.max(90, Math.round(LAYOUT.X_GAP * 1.8))),
      "elk.layered.spacing.edgeNodeBetweenLayers": "40",
      "elk.layered.spacing.edgeEdgeBetweenLayers": "20",
      "elk.layered.spacing.edgeNode": "30",
      "elk.padding": "[top=40,left=40,bottom=40,right=40]",
      // Keep ordering stable; ELK will still optimize crossings but avoid jitter.
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.crossingMinimization.semiInteractive": "true",
    },
    children: schedule.map((item) => ({
      id: String(item.scheduleid),
      width: w,
      height: h,
    })),
    edges: [],
  };

  // Build edges from dependency parents -> target
  schedule.forEach((item) => {
    const target = item.scheduleid;
    const parents = getScheduleParentIds(item);
    parents.forEach((parentId) => {
      if (!parentId || parentId === target) return;
      elkGraph.edges.push({
        id: `e${parentId}-${target}`,
        sources: [String(parentId)],
        targets: [String(target)],
      });
    });
  });

  try {
    const out = await elk.layout(elkGraph);
    const positionMap = new Map();
    (out.children || []).forEach((n) => {
      if (n?.id != null && n.x != null && n.y != null) {
        positionMap.set(parseInt(n.id, 10), { x: n.x, y: n.y });
      }
    });
    return positionMap;
  } catch (err) {
    console.warn("ELK layout failed, falling back to existing placement:", err?.message);
    return new Map();
  }
}

/** Get box dimensions for a node (used for overlap math). */
function getNodeBox(node) {
  const isText = node.data?.isTextOnly;
  // Prefer real rendered size when available (prevents "visual overlap" bugs).
  const mw = node?.measured?.width ?? node?.width;
  const mh = node?.measured?.height ?? node?.height;

  const fallbackW = isText ? NOTE_NODE_WIDTH : LAYOUT.NODE_WIDTH;
  const fallbackH = isText ? NOTE_NODE_HEIGHT : LAYOUT.NODE_HEIGHT;

  const w = Number.isFinite(mw) && mw > 0 ? mw : fallbackW;
  const h = Number.isFinite(mh) && mh > 0 ? mh : fallbackH;

  return { w, h };
}

/** Mutate node positions so no two overlap. Uses each node's exact dimensions. */
function resolveOverlaps(nodes, minGap = RESOLVE_MIN_GAP) {
  if (!nodes?.length) return;
  const g = minGap;

  const overlaps = (posA, posB, wA, hA, wB, hB) =>
    !(posA.x + wA + g <= posB.x || posB.x + wB + g <= posA.x || posA.y + hA + g <= posB.y || posB.y + hB + g <= posA.y);

  // Same-row pass: group by Y band, sort by x, space by X_SPACING
  const byRow = new Map();
  nodes.forEach((node, idx) => {
    if (node.position?.x == null || node.position?.y == null) return;
    const rowKey = Math.round(node.position.y / Y_SPACING) * Y_SPACING;
    if (!byRow.has(rowKey)) byRow.set(rowKey, []);
    byRow.get(rowKey).push(idx);
  });
  byRow.forEach((indices) => {
    indices.sort((a, b) => nodes[a].position.x - nodes[b].position.x);
    for (let k = 1; k < indices.length; k++) {
      const i = indices[k - 1];
      const j = indices[k];
      const { w } = getNodeBox(nodes[i]);
      const posA = nodes[i].position;
      const posB = nodes[j].position;
      const needRight = posA.x + w + g - posB.x;
      if (needRight > 0) {
        nodes[j].position = { x: posA.x + X_SPACING, y: posB.y };
      }
    }
  });

  // General pass: nudge overlapping pairs using exact dimensions
  let changed = true;
  for (let pass = 0; pass < 30 && changed; pass++) {
    changed = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const posA = nodes[i].position;
        const posB = nodes[j].position;
        if (!posA || !posB) continue;
        const { w: wA, h: hA } = getNodeBox(nodes[i]);
        const { w: wB, h: hB } = getNodeBox(nodes[j]);
        if (!overlaps(posA, posB, wA, hA, wB, hB)) continue;

        const dx = Math.max(0, posA.x + wA + g - posB.x);
        const dy = Math.max(0, posA.y + hA + g - posB.y);
        if (dx > 0 || dy > 0) {
          nodes[j].position = { x: posB.x + dx, y: posB.y + dy };
          changed = true;
        }
      }
    }
  }
}

/** ELK-safe overlap resolver (no same-row re-spacing; only nudges colliding pairs). */
function resolveOverlapsGeneralOnly(nodes, minGap = RESOLVE_MIN_GAP) {
  if (!nodes?.length) return;
  const g = minGap;

  const overlaps = (posA, posB, wA, hA, wB, hB) =>
    !(posA.x + wA + g <= posB.x || posB.x + wB + g <= posA.x || posA.y + hA + g <= posB.y || posB.y + hB + g <= posA.y);

  let changed = true;
  // More passes because dense bottoms can require multiple cascaded pushes.
  for (let pass = 0; pass < 140 && changed; pass++) {
    changed = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const posA = nodes[i].position;
        const posB = nodes[j].position;
        if (!posA || !posB) continue;
        const { w: wA, h: hA } = getNodeBox(nodes[i]);
        const { w: wB, h: hB } = getNodeBox(nodes[j]);
        if (!overlaps(posA, posB, wA, hA, wB, hB)) continue;

        // Prefer nudging down first to preserve layered structure.
        const dy = Math.max(0, posA.y + hA + g - posB.y);
        if (dy > 0) {
          // IMPORTANT: keep X stable; only push down to avoid long, confusing edges.
          nodes[j].position = { x: posB.x, y: posB.y + dy };
          changed = true;
        }
      }
    }
  }
}

/**
 * Stable layout pass: stack nodes vertically within "columns" (similar X),
 * so dense bottoms don't collide and the top adjusts consistently too.
 * Keeps X fixed, only increases Y when needed.
 */
function stackColumnsVertically(nodes, minGap = RESOLVE_MIN_GAP, colGrid = 40) {
  if (!nodes?.length) return;
  const toColKey = (x) => Math.round(x / colGrid) * colGrid;

  const cols = new Map();
  nodes.forEach((n) => {
    if (n.position?.x == null || n.position?.y == null) return;
    const key = toColKey(n.position.x);
    if (!cols.has(key)) cols.set(key, []);
    cols.get(key).push(n);
  });

  cols.forEach((colNodes) => {
    colNodes.sort((a, b) => (a.position.y ?? 0) - (b.position.y ?? 0));
    for (let i = 1; i < colNodes.length; i++) {
      const prev = colNodes[i - 1];
      const cur = colNodes[i];
      const { h: prevH } = getNodeBox(prev);
      const minY = (prev.position.y ?? 0) + prevH + minGap;
      if ((cur.position.y ?? 0) < minY) {
        cur.position = { x: cur.position.x, y: minY };
      }
    }
  });
}

/**
 * Final safety pass: greedily re-pack nodes so they don't overlap.
 * This is especially important when saved backend positions are too tight.
 */
// NOTE: We intentionally do NOT do a global “repack” anymore.
// It avoids overlap but makes edges extremely long and the diagram confusing.

// Suppress ResizeObserver warning in dev
const observerErrHandler = (e) => {
  if (e.message.includes("ResizeObserver loop")) {
    e.stopImmediatePropagation();
  }
};

window.addEventListener("error", observerErrHandler);

const sendPropertyChatUpdate = async ({
  property_id,
  employee_code,
  engineer_name,
  message_text,
  files = []
}) => {
  try {
    const formData = new FormData();
    formData.append('property_id', property_id);
    formData.append('engineer_name', engineer_name);
    formData.append('employee_code', employee_code);
    formData.append('message_text', message_text);

    files.forEach(file => {
      formData.append('files', file);
    });

    const res = await axios.post('http://localhost:8080/property-chat/send', formData);
    return res.data;
  } catch (error) {
    console.error("❌ Failed to send property chat update", error);
  }
};

const DownloadButtonPdf = () => {
  const { getNodes } = useReactFlow();

  const exportPDF = () => {
    const node = document.querySelector('.react-flow'); // Whole canvas container
    if (!node) return console.error("❌ .react-flow not found");

    const bounds = node.getBoundingClientRect();

    domtoimage.toPng(node, {
      quality: 1,
      bgcolor: '#ffffff',
      width: bounds.width,
      height: bounds.height,
      style: {
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        backgroundColor: "#ffffff",
        transform: "scale(1)",
        transformOrigin: "top left"
      }
    })
      .then((dataUrl) => {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
        const img = new Image();
        img.src = dataUrl;

        img.onload = () => {
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
          const imgWidth = img.width * ratio;
          const imgHeight = img.height * ratio;
          const xOffset = (pageWidth - imgWidth) / 2;
          const yOffset = (pageHeight - imgHeight) / 2;

          pdf.addImage(img, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
          pdf.save('workflow-diagram.pdf');
        };
      })
      .catch((err) => {
        console.error("❌ PDF export failed:", err);
      });
  };


  return (
    <Panel position="top-right" style={{ zIndex: 1000, top: 0, right: 0 }}>
      {/* <button
    onClick={exportPDF}
    style={{
      padding: '6px 12px',
      fontSize: 14,
      borderRadius: 4,
      background: '#1a365d',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
    }}
  >
    🧾 Export PDF
  </button> */}

    </Panel>



  );
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
const HoldLogsButton = ({ onClick }) => {
  return (
    <Panel position="top-right">
      <button
        onClick={onClick}
        style={{
          padding: '6px 12px',
          fontSize: 14,
          borderRadius: 4,
          background: '#1a365d',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          marginRight: '150px', // adjust as needed
        }}
      >
        📋 Hold Logs
      </button>

    </Panel>
  );
};

const DownloadButton = () => {
  const { getNodes } = useReactFlow();

  const downloadImage = (dataUrl) => {
    const a = document.createElement('a');
    a.setAttribute('download', 'workflow-diagram.png');
    a.setAttribute('href', dataUrl);
    a.click();
  };

  const onClick = () => {
    const nodes = getNodes();
    const bounds = getNodesBounds(nodes);
    const padding = 20;
    const scaleFactor = bounds.width > 1500 ? 1.2 : 1.5;

    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;
    const x = bounds.x - padding;
    const y = bounds.y - padding;

    const target = document.querySelector('.react-flow');

    if (!target) {
      console.warn("❌ .react-flow__viewport not found");
      return;
    }

    toPng(target, {
      backgroundColor: '#ffffff',
      width,
      height,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${-x}px, ${-y}px)`,
        transformOrigin: 'top left',
      },
    })
      .then(downloadImage)
      .catch((err) => {
        console.error('❌ Error generating image:', err);
      });
  };


};



const formatForDisplay = (isoDate) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

const formatForInput = (ddmmyyyy) => {
  if (!ddmmyyyy.includes('/')) return ddmmyyyy;
  const [day, month, year] = ddmmyyyy.split('/');
  return `${year}-${month}-${day}`;
};

const postHoldMessageToTaskUpdates = async ({
  scheduleid,
  propertyid,
  engineerEmail,
  holdReason
}) => {
  try {
    const taskIdRes = await fetch(`http://localhost:8080/get-task-id/${scheduleid}`);
    const taskIdData = await taskIdRes.json();
    const task_id = taskIdData?.task_id;

    if (!task_id) throw new Error("Task ID not found");

    const updateForm = new FormData();
    updateForm.append("task_id", task_id);
    updateForm.append("property_id", propertyid);
    updateForm.append("schedule_id", scheduleid);
    updateForm.append("engineer_name", engineerEmail);
    updateForm.append(
      "update_text",
      `⏸️ Phase held by ${engineerEmail.split("@")[0]} – Reason: "${holdReason}"`
    );

    await fetch("http://localhost:8080/task-updates", {
      method: "POST",
      body: updateForm,
    });
  } catch (err) {
    console.error("❌ Failed to post hold message:", err);
  }
};

const postResumeMessageToTaskUpdates = async ({
  scheduleid,
  propertyid,
  engineerEmail,
  resumeReason
}) => {
  try {
    const taskIdRes = await fetch(`http://localhost:8080/get-task-id/${scheduleid}`);
    const taskIdData = await taskIdRes.json();
    const task_id = taskIdData?.task_id;

    if (!task_id) throw new Error("Task ID not found");

    const updateForm = new FormData();
    updateForm.append("task_id", task_id);
    updateForm.append("property_id", propertyid);
    updateForm.append("schedule_id", scheduleid);
    updateForm.append("engineer_name", engineerEmail);
    updateForm.append(
      "update_text",
      `✅ Phase resumed by ${engineerEmail.split("@")[0]} – Reason: "${resumeReason}"`
    );

    await fetch("http://localhost:8080/task-updates", {
      method: "POST",
      body: updateForm,
    });
  } catch (err) {
    console.error("❌ Failed to post resume message:", err);
  }
};

function DiagramContent({ data, propertyId, refreshSchedule, onOpenInTaskView, onOpenUploadSchedule }) {
  const currentUserEmail = localStorage.getItem("email") || "anonymous@system";
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const allNodesRef = useRef([]); // ✅ Holds latest nodes
  const { fitView, getViewport, setViewport, getNodes, zoomIn, zoomOut } = useReactFlow();
  const applyingOverlapFixRef = useRef(false);
  const baseNodesRef = useRef([]);
  const baseEdgesRef = useRef([]);
  const nodeIdRef = useRef(1000);
  const hasFitViewRun = useRef(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [addNodeParentId, setAddNodeParentId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [holdTypeCounts, setHoldTypeCounts] = useState({});
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [phaseSearchQuery, setPhaseSearchQuery] = useState("");
  const [toolbarMenuAnchorEl, setToolbarMenuAnchorEl] = useState(null);
  const nodeHeight = 120;

  const getResponsiveFitViewConfig = useCallback(() => {
    const width = window.innerWidth || 1366;

    // Tune defaults for laptop and smaller widths so the graph is not cramped.
    if (width <= 1366) {
      return { nodePadding: 0.7, globalPadding: 0.22, maxZoom: 0.5 };
    }

    return { nodePadding: 0.6, globalPadding: 0.12, maxZoom: 0.5 };
  }, []);

  const handlePhaseSearch = useCallback(() => {
    const q = (phaseSearchQuery || "").trim().toLowerCase();
    if (!q) return;
    const allNodes = getNodes();
    const match = allNodes.find((n) => {
      if (n.data?.isTextOnly) return false;
      const phaseName = (n.data?.label || "").split("\n")[0] || "";
      return phaseName.toLowerCase().includes(q);
    });
    if (match) {
      fitView({ nodes: [match.id], padding: 0.3, duration: 500 });
      setSelectedNodeId(match.id);
      setSnackbar({ open: true, message: `Found: ${(match.data?.label || "").split("\n")[0]}`, severity: "success" });
    } else {
      setSnackbar({ open: true, message: `No phase matching "${q}"`, severity: "warning" });
    }
  }, [phaseSearchQuery, getNodes, fitView]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomIn?.({ duration: 200 }); }
        if (e.key === "-") { e.preventDefault(); zoomOut?.({ duration: 200 }); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut]);
  const verticalSpacing = 80;
  const dragTimerRef = useRef(null);
  const reactFlowRef = useRef(null); // ✅ Used for export
  const realignRequestedRef = useRef(false);

  const totalPercentage = nodes.filter((n) => !n.data.isTextOnly).reduce((sum, n) => sum + (parseFloat(n.data.percentage || 0)), 0);
  const completedPercentage = nodes.filter((n) => n.data.status === "completed" && !n.data.isTextOnly).reduce((sum, n) => sum + (parseFloat(n.data.percentage || 0)), 0);
  const overallCompletion = totalPercentage > 0 ? (completedPercentage / totalPercentage) * 100 : 0;
  const exportWorkflowWithEdges = async () => {
    const wrapper = document.querySelector('.react-flow');
    if (!wrapper) return;
    wrapper.classList.add("export-mode");
    await new Promise((r) => setTimeout(r, 800)); // wait for re-render

    html2canvas(wrapper, {
      backgroundColor: "#fff",
      useCORS: true,
      scale: 2,
      scrollX: 0,
      scrollY: 0,
      windowWidth: wrapper.scrollWidth,
      windowHeight: wrapper.scrollHeight,
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = "workflow-diagram.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }).finally(() => {
      wrapper.classList.remove("export-mode"); // ✅ Clean up
    });
  };

  const exportCleanDiagram = async () => {
    // 1. Hide unwanted UI
    const buttons = document.querySelectorAll('.react-flow__panel'); // or custom class if you used one
    buttons.forEach(btn => btn.style.display = 'none');

    // 2. Export the canvas
    const container = document.querySelector('.react-flow'); // canvas only
    if (!container) return console.error("❌ Canvas not found");

    await new Promise(r => setTimeout(r, 200)); // let layout settle

    const dataUrl = await toPng(container, {
      backgroundColor: '#ffffff',
      includeMarkers: true, // optional
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
      }
    });

    // 3. Restore buttons
    buttons.forEach(btn => btn.style.display = '');

    // 4. Trigger download
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'workflow-clean.png';
    link.click();
  };
  const exportFullGraphPng = async () => {
    try {
      // 1) Hide UI overlays (controls/minimap/panels)
      const overlays = document.querySelectorAll(
        ".react-flow__panel, .react-flow__controls, .react-flow__minimap"
      );
      overlays.forEach((el) => (el.style.display = "none"));
  
      // 2) Target the VIEWPORT (this contains nodes + edges)
      const viewport = document.querySelector("#reactflow-container .react-flow__viewport");
      if (!viewport) {
        console.error("❌ .react-flow__viewport not found");
        overlays.forEach((el) => (el.style.display = ""));
        return;
      }
  
      // 3) Compute bounds of ALL nodes
      const nodesForBounds = getNodes().filter((n) => !n.hidden); // keep notes too
      if (!nodesForBounds.length) {
        console.warn("⚠️ No nodes to export");
        overlays.forEach((el) => (el.style.display = ""));
        return;
      }
  
      const bounds = getNodesBounds(nodesForBounds);
  
      // Add padding around the graph
      const padding = 80;
  
      const width = Math.ceil(bounds.width + padding * 2);
      const height = Math.ceil(bounds.height + padding * 2);
  
      // Shift graph so top-left of bounds starts at (padding, padding)
      const translateX = Math.ceil(-bounds.x + padding);
      const translateY = Math.ceil(-bounds.y + padding);
  
      // 4) Wait a tick so DOM settles after hiding overlays
      await new Promise((r) => setTimeout(r, 50));
  
      // 5) Export PNG
      const dataUrl = await toPng(viewport, {
        backgroundColor: "#ffffff",
        cacheBust: true,
        pixelRatio: 2, // sharper export (increase if you want bigger file)
        width,
        height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${translateX}px, ${translateY}px) scale(1)`,
          transformOrigin: "top left",
        },
        // if you ever render external images inside nodes, this helps:
        // NOTE: only works if those images allow CORS
        // useCORS: true,
      });
  
      // 6) Download
      const link = document.createElement("a");
      link.download = `workflow-diagram-${propertyId || "export"}.png`;
      link.href = dataUrl;
      link.click();
  
      // 7) Restore overlays
      overlays.forEach((el) => (el.style.display = ""));
    } catch (err) {
      console.error("❌ Full graph export failed:", err);
  
      // Restore overlays even on failure
      const overlays = document.querySelectorAll(
        ".react-flow__panel, .react-flow__controls, .react-flow__minimap"
      );
      overlays.forEach((el) => (el.style.display = ""));
    }
  };
  const exportWorkflowAsPDF = async () => {
    const wrapper = document.querySelector('.react-flow.export-area');
    if (!wrapper) {
      console.error("❌ .react-flow.export-area not found");
      return;
    }

    // Zoom out to fit everything before capture
    await fitView({ padding: 0.2 });
    await new Promise((r) => setTimeout(r, 500)); // let layout settle

    html2canvas(wrapper, {
      backgroundColor: "#ffffff",
      useCORS: true,
      scale: 2,
      windowWidth: wrapper.scrollWidth,
      windowHeight: wrapper.scrollHeight,
    }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);

      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      pdf.save("workflow-diagram.pdf");
    });
  };
  const sendSystemMessage = async (message) => {
    try {
      const payload = {
        property_id: propertyId,
        engineer_name: localStorage.getItem("first_name") || "System",
        employee_code: localStorage.getItem("employee_code") || "SYS001",
        message_text: message,
      };

      await fetch("http://localhost:8080/property-chat/send", {
        method: "POST",
        body: Object.entries(payload).reduce((form, [key, val]) => {
          form.append(key, val);
          return form;
        }, new FormData()),
      });
    } catch (err) {
      console.error("❌ Failed to send system message:", err);
    }
  };
  const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return NaN;
    const [day, month, year] = dateStr.split("/");
    if (!day || !month || !year) return NaN;
    return new Date(`${year}-${month}-${day}`);
  };

  const getEarliestStartDate = (nodes) => {
    const dates = nodes
      .filter(n => !n.data?.isTextOnly && n.data?.exp_startdate)
      .map(n => parseDate(n.data.exp_startdate))
      .filter(d => !isNaN(d));

    const earliest = new Date(Math.min(...dates));
    return earliest.toLocaleDateString("en-GB");
  };

  const getLatestEndDate = (nodes) => {
    const dates = nodes
      .filter(n => !n.data?.isTextOnly && n.data?.exp_enddate)
      .map(n => parseDate(n.data.exp_enddate))
      .filter(d => !isNaN(d));

    const latest = new Date(Math.max(...dates));
    return latest.toLocaleDateString("en-GB");
  };

  const getActualEndDate = (nodes) => {
    const allDates = nodes.flatMap(n => {
      if (!n.data || n.data.isTextOnly) return [];

      const rawDates = [
        n.data.enddate,
      ];

      return rawDates
        .filter(Boolean)
        .map(dateStr => {
          const parsed = new Date(dateStr);  // ISO safe
          //console.log(`📆 Node ${n.id}: ${dateStr} →`, parsed);
          return parsed;
        });
    }).filter(d => !isNaN(d));

    if (!allDates.length) return "—";

    const latest = new Date(Math.max(...allDates));
    return latest.toLocaleDateString("en-GB"); // e.g., "03/08/2025"
  };

  const getFinalPhaseActualDelivery = (nodes) => {
    const valid = nodes
      .filter((n) =>
        !n.data?.isTextOnly &&
        n.data?.enddate &&
        n.data?.exp_enddate
      )
      .map((n) => ({
        name: n.data.label || n.data.name || "Unnamed Phase",
        actualEnd: new Date(n.data.enddate),
        plannedEnd: parseDate(n.data.exp_enddate),
      }))
      .filter((d) => !isNaN(d.actualEnd) && !isNaN(d.plannedEnd));

    if (valid.length === 0) {
      return {
        name: "—",
        actual: "—",
        planned: "—",
        status: "—",
      };
    }

    const last = valid.reduce((a, b) => (b.actualEnd > a.actualEnd ? b : a));

    const diffDays = Math.ceil((last.plannedEnd - last.actualEnd) / (1000 * 60 * 60 * 24));
    const deliveryStatus =
      diffDays > 0
        ? `✅ Delivered early by ${diffDays} days`
        : diffDays === 0
          ? `✅ Delivered on time`
          : `❌ Delayed by ${Math.abs(diffDays)} days`;

    return {
      name: last.name,
      actual: last.actualEnd.toLocaleDateString("en-GB"),
      planned: last.plannedEnd.toLocaleDateString("en-GB"),
      status: deliveryStatus,
    };
  };

  const getFinalPhaseStatus = (nodes) => {
    const validPhases = nodes
      .filter((n) => !n.data?.isTextOnly && n.data?.exp_enddate)
      .map((n) => ({
        name: n.data?.label || n.data?.name || "Unnamed Phase",
        plannedEnd: parseDate(n.data.exp_enddate),
        actualEnd: n.data?.enddate ? new Date(n.data.enddate) : null,
      }))
      .filter((d) => !isNaN(d.plannedEnd));

    if (validPhases.length === 0)
      return { planned: "— —", actual: "— —", name: "—", status: "No Plan" };

    const final = validPhases.reduce((a, b) =>
      b.plannedEnd > a.plannedEnd ? b : a
    );

    const planned = final.plannedEnd.toLocaleDateString("en-GB");
    const actual = final.actualEnd
      ? final.actualEnd.toLocaleDateString("en-GB")
      : "— —";

    let status;
    if (final.actualEnd) {
      const daysDiff = Math.ceil((final.plannedEnd - final.actualEnd) / (1000 * 60 * 60 * 24));
      status =
        daysDiff > 0
          ? `✅ Delivered ${daysDiff} days early`
          : daysDiff < 0
            ? `❌ Delayed by ${Math.abs(daysDiff)} days`
            : `✅ Delivered on time`;
    } else {
      status = "🕓 In Progress";
    }

    return {
      planned,
      actual,
      name: final.name,
      status,
    };
  };

  const [durationDialogOpen, setDurationDialogOpen] = useState(false);
  const [newNodeDuration, setNewNodeDuration] = useState(3);
  const [newNodePhaseName, setNewNodePhaseName] = useState("New Phase");
  const [newNodeStatus, setNewNodeStatus] = useState("pending");
  const [pendingAddShape, setPendingAddShape] = useState(null);
  const [newNodePercentage, setNewNodePercentage] = useState(0);
  const newPercentage = parseFloat(newNodePercentage || "0");
  // Hold/Resume/Delete dialogs are now handled in CustomNodeWithAddButton
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTask, setSelectedTask] = useState(null); // If you want to keep the left-side selection separate
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isCompactToolbar = useMediaQuery(theme.breakpoints.down("md"));
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const plannedStart = getEarliestStartDate(nodes);
  const plannedEnd = getLatestEndDate(nodes);
  const { name, actual, planned, status } = getFinalPhaseActualDelivery(nodes);

  const [projectMeta, setProjectMeta] = useState({});
  const [holdDrawerOpen, setHoldDrawerOpen] = useState(false);
  const [holdLogs, setHoldLogs] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [propertyScheduleId, setPropertyScheduleId] = useState(null);
  const statusColors = {
    Completed: "#ace1af",
    Hold: "#C0C0C0",
    Pending: "#fff5ba",
    "In Progress": "#a3d1ff",
    Delayed: "#ffb3ba",
  };

  const statusTextColor = {
    Completed: "#013220",
    Hold: "black",
    Pending: "black",
    "In Progress": "black",
    Delayed: "black",
  };

  const statusBorderColor = {
    Completed: "#ACE1AF",
    Hold: "#C0C0C0",
    Pending: "#e6e19d",
    "In Progress": "#7bb0e6",
    Delayed: "#e6999d",
  };
  const filteredTasks =
    statusFilter === "All"
      ? data.schedule || []
      : (data.schedule || []).filter((task) => task.status === statusFilter);

  const handleDoubleNodeClick = useCallback((_, node) => {
    if (node.data?.isBlockedByHold) {
      setSnackbar({ open: true, message: "You cannot open this task until the hold on the previous phase is resolved.", severity: "warning" });
      return;
    }

    const [labelLine, dateLine] = node.data.label.split('\n');
    const matches = dateLine?.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    const [startFormatted, endFormatted] = matches;

    const formattedTask = {
      scheduleid: node.id,
      phasename: labelLine,
      startdate: startFormatted,
      enddate: endFormatted,
      status: node.data.status,
      remarks: node.data.remarks || null,
    };

    setSelectedPhase(formattedTask); // ✅ This opens the dialog
  }, []);


  const fetchHoldLogs = async () => {
    try {
      const res = await fetch(`http://localhost:8080/holds/${propertyId}`);
      const data = await res.json();

      const summary = data.reduce((acc, log) => {
        const type = log.hold_type || "Unknown";
        const duration = log.hold_duration || 0;

        if (!acc[type]) {
          acc[type] = { count: 0, totalDuration: 0 };
        }

        acc[type].count += 1;
        acc[type].totalDuration += duration;

        return acc;
      }, {});

      setHoldLogs(Array.isArray(data) ? data : []);
      setHoldTypeCounts(summary); // ✅ update with new structure


      setHoldDrawerOpen(true); // open drawer after fetching
    } catch (err) {
      console.error("❌ Failed to fetch hold logs:", err);
    }
  };


  useEffect(() => {
    //console.log("📋 Checking schedule presence:", data?.schedule);

    if (!data || !Array.isArray(data.schedule) || data.schedule.length === 0) {
      console.warn("⚠️ Schedule is missing or empty.");
      return;
    }

    data.schedule.forEach((item, index) => {
      //console.log(`📌 Schedule #${index + 1}`, item);
    });
  }, [data]);

  useEffect(() => {
    allNodesRef.current = nodes; // ✅ Always keep updated
  }, [nodes]);

  // Hold/Resume handlers moved to CustomNodeWithAddButton

  const addNodeBelow = useCallback(
    (parentId, shape = "rectangle", remarks = "") => {
      const parentNode = allNodesRef.current.find((n) => n.id === parentId);
      if (!parentNode) return;

      const newY = parentNode.position.y + nodeHeight + verticalSpacing;

      const shapeStyles = {
        rectangle: { borderRadius: 10 },
        circle: { borderRadius: "50%" },
        diamond: {
          width: 140,
          height: 140,
          transform: "rotate(45deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
          border: "2px solid #ccc",
          boxSizing: "border-box",
          position: "relative",
        },
        text: {
          width: 260,
          height: 140,
          background: "#f5b0c3",
          fontStyle: "italic",
          fontWeight: "bold",
          color: "#333",
          padding: 10,
          textAlign: "center",
          boxShadow: "2px 2px 8px rgba(0,0,0,0.05)",
          clipPath:
            "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
        },
      };

      const defaultStatus = "pending";
      const statusColors = {
        pending: { bg: "#fff8e1", border: "#ffb300" },
        completed: { bg: "#e8f5e9", border: "#4caf50" },
        "in progress": { bg: "#e3f2fd", border: "#2196f3" },
        blocked: { bg: "#ffebee", border: "#f44336" },
        // "on hold": { border: "#9e9e9e", bg: "#eeeeee" },
      };

      const { bg, border } = statusColors[defaultStatus];

      // 📌 Handle text note separately with API call
      if (shape === "text") {
        const currentUserName = localStorage.getItem("first_name") || currentUserEmail.split("@")[0];
        const currentUser = localStorage.getItem("email");
        const boxes = nodesToBoxes(allNodesRef.current || []);
        const pos = findNonOverlappingPosition(
          parentNode.position.x,
          newY,
          boxes,
          NOTE_NODE_WIDTH,
          NOTE_NODE_HEIGHT
        );
        const payload = {
          property_id: propertyId,
          note_text: "New Note",
          created_by: currentUserEmail,
          x: pos.x,
          y: pos.y,
        };
        //console.log("📤 Sending text node request", payload);

        fetch(`http://localhost:8080/schedule/${parentNode.id}/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": currentUser,
          },
          body: JSON.stringify(payload),
        })
          .then((res) => res.json())

          .then((res) => {
            if (res.note_id) {
              const textNode = {
                id: res.note_id,
                type: "custom",
                data: {
                  label: `${currentUserName.split("@")[0]}: New Note`,
                  status: "info",
                  remarks,
                  openAddNodeDialog,
                  setNodes,
                  isTextOnly: true,
                  style: shapeStyles.text,
                },
                position: {
                  x: parentNode.position.x + 200, // offset to avoid cluster
                  y: newY,
                },
              };

              const textEdge = {
                id: `e${parentId}-${res.note_id}`,
                source: parentId,
                target: res.note_id,
                type: "smoothstep",
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { strokeWidth: 2, strokeDasharray: "5 5" },
              };

              setNodes((nds) => [...nds, textNode]);
              setEdges((eds) => [...eds, textEdge]);
            } else {
              console.error("❌ No note_id returned from backend.");
            }
          })
          .catch((err) => {
            console.error("❌ Failed to save text note:", err);
          });

        return; // Stop further execution
      }

      // 🧱 Regular node logic (place without overlapping existing nodes)
      const boxes = nodesToBoxes(allNodesRef.current || []);
      const regularPos = findNonOverlappingPosition(
        parentNode.position.x,
        newY,
        boxes,
        LAYOUT.NODE_WIDTH,
        LAYOUT.NODE_HEIGHT
      );
      const newId = `node-${nodeIdRef.current++}`;
      const regularNode = {
        id: newId,
        type: "custom",
        data: {
          label: `New ${shape.charAt(0).toUpperCase() + shape.slice(1)} Node`,
          status: defaultStatus,
          remarks,
          openAddNodeDialog,
          setNodes,
          isTextOnly: false,
          style: {
            padding: 10,
            width: LAYOUT.NODE_WIDTH,
            fontSize: 12,
            height: "auto",
            minHeight: 120,
            textAlign: "center",
            background: bg,
            border: `2px solid ${border}`,
            color: "#333",
            ...shapeStyles[shape],
          },
        },
        position: {
          x: regularPos.x,
          y: regularPos.y,
        },
      };

      const regularEdge = {
        id: `e${parentId}-${newId}`,
        source: parentId,
        target: newId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2, strokeDasharray: "5 5" },
      };

      setNodes((nds) => [...nds, regularNode]);
      setEdges((eds) => [...eds, regularEdge]);
    },
    [setNodes, setEdges, propertyId, currentUserEmail]
  );

  const openAddNodeDialog = (parentId, event) => {
    event.stopPropagation();
    setAddNodeParentId(parentId);
    setAnchorEl(event.currentTarget); // Set position near the ➕
  };

  const handleNodeDoubleClick = useCallback((_, node) => {
    if (node.data?.isBlockedByHold) {
      setSnackbar({ open: true, message: "You cannot edit this task until the hold on the previous phase is resolved.", severity: "warning" });
      return;
    }
    setEditingNodeId(node.id); // ✅ Enable inline edit
  }, []);

  const downloadScheduleExcel = async (propertyId) => {
    try {
      const res = await fetch(`http://localhost:8080/download-schedule/${propertyId}`);
      if (!res.ok) throw new Error("Failed to download");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `schedule_${propertyId}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Error downloading schedule:", err);
      setSnackbar({ open: true, message: "Download failed", severity: "error" });
    }
  };
  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    // 🚫 Block if node is affected by a hold
    if (node.data?.isBlockedByHold) {
      setSnackbar({ open: true, message: "This phase is blocked due to a previous task being on hold. Please resume the hold phase first.", severity: "warning" });
      return;
    }
    setSelectedNodeId(node.id);

    // Edit data is now handled in CustomNodeWithAddButton, no need to set it here
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      node,
    });
  }, []);

  // Edit and Delete handlers moved to CustomNodeWithAddButton
  // Toolbar action callbacks - these trigger the dialogs in CustomNodeWithAddButton
  const openEditForNodeId = useCallback(
    (nodeId) => {
      // Edit is handled inline in CustomNodeWithAddButton, but we can trigger it
      const node = allNodesRef.current.find((n) => n.id === String(nodeId));
      if (!node || node.data?.isBlockedByHold) return;
      // The edit mode is handled internally by CustomNodeWithAddButton
      // We just need to ensure the node is selected
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === String(nodeId),
        }))
      );
    },
    [allNodesRef, setNodes]
  );

  const openHoldForNodeId = useCallback(
    (nodeId) => {
      // Hold dialog is handled in CustomNodeWithAddButton
      // This callback is passed via toolbarActions
    },
    []
  );

  const openResumeForNodeId = useCallback(
    (nodeId) => {
      // Resume dialog is handled in CustomNodeWithAddButton
      // This callback is passed via toolbarActions
    },
    []
  );

  const openInfoForNodeId = useCallback(
    (nodeId) => {
   const node = allNodesRef.current.find((n) => n.id === String(nodeId));
    if (!node || !node.data?.handleTaskManagerOpen) return;
   node.data.handleTaskManagerOpen({
     nodeId,
     label: node.data.label,
    status: node.data.status,
      remarks: node.data.remarks,
     });
  
    if (typeof onOpenInTaskView === "function") {
      const sid = Number(nodeId);
     if (!Number.isNaN(sid)) onOpenInTaskView(sid);
     return;
    }
    },
   [allNodesRef]
   [allNodesRef, onOpenInTaskView]
  );
  

  const openDeleteForNodeId = useCallback(
    (nodeId) => {
      // Delete dialog is handled in CustomNodeWithAddButton
      // This callback is passed via toolbarActions
      const children = edges.filter((e) => e.source === String(nodeId));
      if (children.length > 0) {
        setSnackbar({ open: true, message: `This node has ${children.length} child node(s). They will be reassigned to this node's parent(s).`, severity: "info" });
      }
    },
    [edges]
  );

  // reuse your existing add dialog + notes logic
  const addPhaseFromToolbar = useCallback(
    (nodeId) => {
      // This is now handled inline in CustomNodeWithAddButton
      // The inline form will appear when the + button is clicked
      // We don't need to open a modal dialog anymore
      setAddNodeParentId(String(nodeId));
    },
    []
  );


  // direct "comment box" from toolbar (same as your 'text' branch)
  const addCommentFromToolbar = useCallback(
    (nodeId) => {
      const parentNode = allNodesRef.current.find(
        (n) => n.id === String(nodeId)
      );
      if (!parentNode) return;

      const boxes = nodesToBoxes(allNodesRef.current || []);
      const pos = findNonOverlappingPosition(
        parentNode.position.x + X_SPACING,
        parentNode.position.y + 40,
        boxes,
        NOTE_NODE_WIDTH,
        NOTE_NODE_HEIGHT
      );
      const payload = {
        property_id: propertyId,
        note_text: "New Note",
        created_by: currentUserEmail,
        x: pos.x,
        y: pos.y,
      };

      fetch(`http://localhost:8080/schedule/${nodeId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUserEmail,
        },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.note_id) return;

          const noteNode = {
            id: res.note_id,
            type: "custom",
            data: {
              label: payload.note_text,
              status: "info",
              remarks: "",
              openAddNodeDialog,
              setNodes,
              isTextOnly: true,
              style: {
                background: "#fff9c4",
                color: "#6b4d00",
                fontStyle: "italic",
                fontWeight: 500,
                padding: "16px",
                borderRadius: "24px",
                width: 260,
                minHeight: "80px",
                fontSize: "14px",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
                boxShadow: "2px 4px 10px rgba(0,0,0,0.15)",
                textAlign: "left",
                clipPath:
                  "polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% 90%, calc(100% - 10px) 100%, 30% 100%, 20% 115%, 15% 100%, 10px 90%, 0% 80%, 0% 10px)",
              },
            },
            position: {
              x: payload.x,
              y: payload.y,
            },
          };

          const noteEdge = {
            id: `e${nodeId}-${res.note_id}`,
            source: String(nodeId),
            target: res.note_id,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2, strokeDasharray: "5 5" },
          };

          setNodes((nds) => [...nds, noteNode]);
          setEdges((eds) => [...eds, noteEdge]);
        })
        .catch((err) =>
          console.error("❌ Failed to save comment note from toolbar:", err)
        );
    },
    [allNodesRef, propertyId, currentUserEmail, setNodes, setEdges, openAddNodeDialog]
  );

  const createNodesAndLinks = useCallback(async () => {
    if (!data?.schedule?.length) return;
    // Step 1: Identify all hold tasks
    const blockedBy = new Set();
    const idToSchedule = new Map();

    data.schedule.forEach(item => idToSchedule.set(parseInt(item.scheduleid), item));

    // 🔍 Find the held node
    const heldNode = data.schedule.find(item => {
      return item.status?.toLowerCase() === "on hold" || (item.hold_date && !item.resume_date);
    });

    if (heldNode) {
      let currentId = parseInt(heldNode.scheduleid);
      const visited = new Set([currentId]);
      while (true) {
        const nextNode = data.schedule.find(
          item => parseInt(item.depends_on_scheduleid) === currentId
        );
        if (!nextNode || visited.has(parseInt(nextNode.scheduleid))) break;
        blockedBy.add(nextNode.scheduleid);
        currentId = parseInt(nextNode.scheduleid);
        visited.add(currentId);
      }
    }

    data.schedule.forEach((item) => {
      if (item.hold_date && !item.resume_date) {
        let current = item.scheduleid;
        const visited = new Set([current]);
        while (true) {
          const next = data.schedule.find(s => s.depends_on_scheduleid === current);
          if (!next || visited.has(next.scheduleid)) break;
          blockedBy.add(next.scheduleid);
          current = next.scheduleid;
          visited.add(current);
        }
      }
    });

    const scheduleMap = new Map();
    data.schedule.forEach(item => scheduleMap.set(item.scheduleid, item));

    const needsAutoLayout =
      realignRequestedRef.current ||
      data.schedule.some((item) => item.x_position == null || item.y_position == null);

    // Prefer ELK when we need an automatic (re)layout; otherwise keep saved positions.
    const elkPositionMap = needsAutoLayout
      ? await getElkLayout(data.schedule, { direction: "DOWN" })
      : new Map();

    // ----- Layout: compute levels once, then process in level order so parents are placed before children -----
    const levelMap = new Map();
    const levels = new Map();
    const visiting = new Set();

    function getParents(scheduleItem) {
      const targetId = scheduleItem?.scheduleid;
      if (!scheduleItem) return [];
      if (scheduleItem.depends_on_scheduleid) {
        if (Array.isArray(scheduleItem.depends_on_scheduleid)) {
          return scheduleItem.depends_on_scheduleid.map(p => parseInt(p)).filter(p => !isNaN(p) && p !== targetId);
        }
        const singleParent = parseInt(scheduleItem.depends_on_scheduleid);
        if (!isNaN(singleParent) && singleParent !== targetId) return [singleParent];
      }
      if (Array.isArray(scheduleItem.depends_on_scheduleids) && scheduleItem.depends_on_scheduleids.length > 0) {
        return scheduleItem.depends_on_scheduleids.map(p => parseInt(p)).filter(p => !isNaN(p) && p !== targetId);
      }
      return [];
    }

    function getLevel(id) {
      if (levelMap.has(id)) return levelMap.get(id);
      if (visiting.has(id)) {
        levelMap.set(id, 0);
        levels.set(0, [...(levels.get(0) || []), id]);
        return 0;
      }
      visiting.add(id);
      const scheduleItem = data.schedule.find(s => s.scheduleid === id);
      const parents = getParents(scheduleItem);
      if (!scheduleItem || !parents.length) {
        visiting.delete(id);
        levelMap.set(id, 0);
        levels.set(0, [...(levels.get(0) || []), id]);
        return 0;
      }
      const parentLevels = parents.map(parentId => getLevel(parentId));
      const level = parentLevels.length > 0 ? Math.max(...parentLevels) + 1 : 0;
      visiting.delete(id);
      levelMap.set(id, level);
      levels.set(level, [...(levels.get(level) || []), id]);
      return level;
    }

    data.schedule.forEach(s => getLevel(s.scheduleid));

    const dateOrEpoch = (item) => {
      const d = item.startdate || item.exp_startdate;
      if (!d) return 0;
      const t = new Date(d).getTime();
      return isNaN(t) ? 0 : t;
    };

    // Levels by start date: earliest start = level 0 (top), later dates = lower rows
    const sortedEpochs = [...new Set(data.schedule.map((item) => dateOrEpoch(item)))].sort((a, b) => a - b);
    const epochToLevel = new Map();
    sortedEpochs.forEach((epoch, idx) => epochToLevel.set(epoch, idx));
    const levelsByDate = new Map();
    data.schedule.forEach((item) => {
      const level = epochToLevel.get(dateOrEpoch(item)) ?? 0;
      if (!levelsByDate.has(level)) levelsByDate.set(level, []);
      levelsByDate.get(level).push(item.scheduleid);
    });
    levelsByDate.forEach((ids) => {
      ids.sort((a, b) => {
        const itemA = data.schedule.find((s) => s.scheduleid === a);
        const itemB = data.schedule.find((s) => s.scheduleid === b);
        return dateOrEpoch(itemA) - dateOrEpoch(itemB) || a - b;
      });
    });

    const scheduleOrdered = [...data.schedule].sort((a, b) => {
      const levelA = epochToLevel.get(dateOrEpoch(a)) ?? 0;
      const levelB = epochToLevel.get(dateOrEpoch(b)) ?? 0;
      if (levelA !== levelB) return levelA - levelB;
      return dateOrEpoch(a) - dateOrEpoch(b) || (a.scheduleid - b.scheduleid);
    });

    const positionMap = new Map();
    const columnMaxY = new Map();
    const topMargin = 20;
    const colGrid = 40;
    const toColKey = (x) => Math.round(x / colGrid) * colGrid;

    const generatedNodes = [];

    for (const item of scheduleOrdered) {
      const status = item.status?.toLowerCase();
      const isBlockedByHold = blockedBy.has(item.scheduleid);

      const isOnHold = (item.hold_date && !item.resume_date) || status === "on hold";
      let borderColor = "#9e9e9e";
      let bgColor = "#f5f5f5";
      const duration = (new Date(item.enddate) - new Date(item.startdate)) / (1000 * 60 * 60 * 24);

      const today = new Date();
      const plannedStart = item.exp_startdate ? new Date(item.exp_startdate) : null;
      const plannedEnd = item.exp_enddate ? new Date(item.exp_enddate) : null;
      const actualStart = item.startdate ? new Date(item.startdate) : null;
      const actualEnd = item.enddate ? new Date(item.enddate) : null;

      const hasPlannedEnd = plannedEnd instanceof Date && !isNaN(plannedEnd);
      const hasActualEnd = actualEnd instanceof Date && !isNaN(actualEnd);
      const pastPlannedEndNow = hasPlannedEnd && today > plannedEnd;
      const finishedLate = hasPlannedEnd && hasActualEnd && actualEnd > plannedEnd;
      const isDelayedInProgress = status === "in progress" && pastPlannedEndNow;
      const isDerivedDelayed =
        (pastPlannedEndNow && status !== "in progress" && status !== "completed") ||
        (finishedLate && status !== "completed");

      if (isOnHold) {
        borderColor = "#ff5722";
        bgColor = "#fff3e0";
      } else if (status === "completed") {
        borderColor = "#4caf50";
        bgColor = "#e8f5e9";
      } else if (status === "delayed" || isDerivedDelayed) {
        borderColor = "#f44336";
        bgColor = "#ffebee";
      } else if (isDelayedInProgress) {
        borderColor = "#fbc02d";
        bgColor = "#fff8e1";
      } else if (status === "in progress") {
        borderColor = "#2196f3";
        bgColor = "#e3f2fd";
      } else if (status === "pending") {
        borderColor = "#ff9800";
        bgColor = "#fff3e0";
      } else if (status === "blocked") {
        borderColor = "#f44336";
        bgColor = "#ffebee";
      } else if (status === "on hold") {
        borderColor = "#9e9e9e";
        bgColor = "#eeeeee";
      } else {
        borderColor = "#9e9e9e";
        bgColor = "#f5f5f5";
      }

      const level = epochToLevel.get(dateOrEpoch(item)) ?? 0;
      const siblings = levelsByDate.get(level) || [];
      const indexInLevel = siblings.indexOf(item.scheduleid);

      // Horizontal flow: row = level (top = start, bottom = end), column = index within level (left to right)
      const useSaved = !realignRequestedRef.current && item.x_position != null && item.y_position != null;
      let finalX;
      let finalY;

      if (useSaved) {
        finalX = item.x_position;
        finalY = item.y_position;
      } else {
        const elkPos = elkPositionMap.get(item.scheduleid);
        if (elkPos) {
          finalX = topMargin + elkPos.x;
          finalY = topMargin + elkPos.y;
        } else {
          finalX = topMargin + indexInLevel * X_SPACING;
          finalY = topMargin + level * Y_SPACING;
        }
      }

      const colKey = toColKey(finalX);
      const bottomY = finalY + LAYOUT.NODE_HEIGHT;
      columnMaxY.set(colKey, Math.max(columnMaxY.get(colKey) ?? 0, bottomY));
      positionMap.set(item.scheduleid, { x: finalX, y: finalY });

      generatedNodes.push({
        id: `${item.scheduleid}`,
        type: 'custom',
        data: {
          openAddNodeDialog,
          editingNodeId,
          setEditingNodeId,
          setNodes,
          propertyId,
          label: `${item.phasename.charAt(0).toUpperCase() + item.phasename.slice(1)}\n(${formatDate(item.startdate)} to ${formatDate(item.enddate)})${isOnHold ? '\n⏸️ On Hold' : ''}`,
          readableDate: `(${formatDate(item.startdate)} to ${formatDate(item.enddate)})${isOnHold ? ' · On Hold' : ''}`,
          addNodeBelow,
          status: status,
          duration,
          refreshSchedule,
          isHold: status === "on hold",
          isOnHold: isOnHold,
          isBlockedByHold: isBlockedByHold,
          percentage: parseFloat(item.percentage) || 0,
          exp_startdate: formatDate(item.exp_startdate),
          exp_enddate: formatDate(item.exp_enddate),
          hold_reason: item.hold_reason || '',
          hold_by_email: item.hold_by_email || '',

          // 🔧 This powers the TaskManager / Info click
          handleTaskManagerOpen: ({ nodeId, label = '', status, remarks }) => {
            const [phase, dateLine] = label.split('\n');
            const matches = dateLine?.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
            const safeStart = matches[0];
            const safeEnd = matches[1];

            const isValidDate = (d) => {
              if (!d) return false;
              const [dd, mm, yyyy] = d.split('/');
              if (!dd || !mm || !yyyy) return false;
              const iso = `${yyyy}-${mm}-${dd}`;
              const date = new Date(iso);
              return !isNaN(date);
            };

            const startdate = isValidDate(safeStart) ? safeStart : '01/01/2025';
            const enddate = isValidDate(safeEnd) ? safeEnd : '02/01/2025';

            const formattedTask = {
              scheduleid: item.scheduleid,
              phasename: phase || '',
              startdate,
              enddate,
              status,
              remarks: remarks || '',
            };

            setSelectedPhase(formattedTask);
          },

          // 🧠 NEW: hook up node toolbar to parent logic (which calls APIs)
          toolbarActions: {
            onHold: openHoldForNodeId,
            onResume: openResumeForNodeId,
            onEdit: openEditForNodeId,
            onDelete: openDeleteForNodeId,
            onInfo: openInfoForNodeId,
            onAddPhase: addPhaseFromToolbar,
            onAddComment: addCommentFromToolbar,
          },
          refreshSchedule: refreshSchedule, // ✅ Ensure refreshSchedule is passed
          propertyId: propertyId, // ✅ Ensure propertyId is passed
          propertyscheduleid: item.propertyscheduleid, // ✅ Pass propertyscheduleid to node
          schedule: data.schedule, // ✅ Pass schedule data for propertyscheduleid lookup

          style: {
            background: bgColor,
            border: `2px solid ${borderColor}`,
            color: '#333',
            borderRadius: 10,
            padding: 10,
            width: LAYOUT.NODE_WIDTH,
            height: LAYOUT.NODE_HEIGHT,
            boxSizing: 'border-box',
            overflow: 'hidden',
            fontSize: 12,
            whiteSpace: 'pre-line',
            textAlign: 'center',
            opacity: isBlockedByHold ? 0.4 : 1,
            pointerEvents: isBlockedByHold ? 'none' : 'auto',
          },
        },


        position: { x: finalX, y: finalY }
      });
    }

    const generatedEdges = new Map();

    // 🔁 Add single parent edges (filter self-dependencies)
    data.schedule.forEach((item) => {
      const source = item.depends_on_scheduleid;
      const target = item.scheduleid;
      if (source && source !== target && !generatedEdges.has(`e${source}-${target}`)) {
        generatedEdges.set(`e${source}-${target}`, {
          id: `e${source}-${target}`,
          source: `${source}`,
          target: `${target}`,
          type: "smoothstep",
          style: {
            strokeWidth: 2,
            stroke: "#000",
          },
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    });

    // 🔁 Add multi-parent edges (supports depends_on_scheduleid array/single and depends_on_scheduleids)
    const getEdgeParents = (scheduleItem) => {
      const target = scheduleItem?.scheduleid;
      if (!scheduleItem) return [];
      if (scheduleItem.depends_on_scheduleid) {
        if (Array.isArray(scheduleItem.depends_on_scheduleid)) {
          return scheduleItem.depends_on_scheduleid.map(id => parseInt(id)).filter(id => !isNaN(id) && id !== target);
        }
        const single = parseInt(scheduleItem.depends_on_scheduleid);
        if (!isNaN(single) && single !== target) return [single];
      }
      if (Array.isArray(scheduleItem.depends_on_scheduleids) && scheduleItem.depends_on_scheduleids.length > 0) {
        return scheduleItem.depends_on_scheduleids.map(id => parseInt(id)).filter(id => !isNaN(id) && id !== target);
      }
      return [];
    };

    data.schedule.forEach((item) => {
      const target = item.scheduleid;
      const parents = getEdgeParents(item);

      parents.forEach((parent) => {
        if (parent && parent !== target && !generatedEdges.has(`e${parent}-${target}`)) {
          generatedEdges.set(`e${parent}-${target}`, {
            id: `e${parent}-${target}`,
            source: `${parent}`,
            target: `${target}`,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
          });
        }
      });
    });

    // ✅ Set the edges
    setEdges(Array.from(generatedEdges.values()));

    // Make the whole diagram consistent first (top + bottom): stack within columns.
    stackColumnsVertically(generatedNodes, RESOLVE_MIN_GAP, 40);
    // Then do a gentle collision nudge pass (preserves shape; avoids long edges).
    resolveOverlapsGeneralOnly(generatedNodes, RESOLVE_MIN_GAP);

    // When realign: save all positions; otherwise save only nodes that had no saved position
    const scheduleById = new Map(data.schedule.map((s) => [s.scheduleid, s]));
    const saveAll = realignRequestedRef.current;
    const positionsToSave = generatedNodes
      .filter((node) => {
        const hasPosition = node.position?.x != null && node.position?.y != null;
        if (!hasPosition) return false;
        if (saveAll) return true;
        const item = scheduleById.get(parseInt(node.id, 10));
        const hadSavedPosition = item && item.x_position != null && item.y_position != null;
        return !hadSavedPosition;
      })
      .map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
      }));

    if (positionsToSave.length > 0) {
      const endpoint = saveAll ? "update-position" : "save-position";
      positionsToSave.forEach((pos, index) => {
        setTimeout(() => {
          fetch(`http://localhost:8080/${endpoint}/${pos.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ x: pos.x, y: pos.y }),
          }).catch(err => {
            console.error("❌ Failed to save position:", err);
          });
        }, index * 50);
      });
    }

    if (realignRequestedRef.current) realignRequestedRef.current = false;
    setNodes(generatedNodes);

    // 🔍 Focus on first "in progress" node after loading
    // Note: Zooming is now handled in the useEffect hook after nodes are fully rendered
    // This ensures nodes have their final sizes before zooming

    // ✅ OPTIMIZED: Batch fetch all notes in parallel instead of sequential forEach
    const notesPromises = data.schedule.map((item) =>
      fetch(`http://localhost:8080/schedule/${item.scheduleid}/notes_get`, {
        headers: {
          "x-user-email": currentUserEmail,
        },
      })
        .then((res) => res.json())
        .then((noteList) => ({ scheduleid: item.scheduleid, notes: noteList }))
        .catch((err) => {
          console.error("❌ Failed to load notes for schedule", item.scheduleid, err);
          return { scheduleid: item.scheduleid, notes: [] };
        })
    );

    // Wait for all notes to load, then add them all at once (place notes without overlapping existing nodes)
    Promise.all(notesPromises).then((notesResults) => {
      const noteNodes = [];
      const noteEdges = [];
      let boxes = nodesToBoxes(allNodesRef.current || []);

      notesResults.forEach(({ scheduleid, notes }) => {
        const parentNode = allNodesRef.current.find(n => n.id === `${scheduleid}`);
        if (!parentNode) return;

        notes.forEach((note, noteIndex) => {
          const desiredX = note.x != null ? note.x : parentNode.position.x + X_SPACING;
          const desiredY = note.y != null ? note.y : parentNode.position.y + 40 * noteIndex;
          const pos =
            note.x != null && note.y != null
              ? { x: note.x, y: note.y }
              : findNonOverlappingPosition(desiredX, desiredY, boxes, NOTE_NODE_WIDTH, NOTE_NODE_HEIGHT);

          const noteNode = {
            id: note.note_id,
            type: "custom",
            data: {
              label: note.note_text,
              status: "info",
              remarks: "",
              openAddNodeDialog,
              setNodes,
              isTextOnly: true,
              style: {
                position: "relative",
                background: "#fff9c4",
                color: "#6b4d00",
                fontStyle: "italic",
                fontWeight: "500",
                padding: "16px",
                borderRadius: "24px",
                width: 260,
                height: "auto",
                minHeight: "80px",
                fontSize: "14px",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
                wordBreak: "break-word",
                boxShadow: "2px 4px 10px rgba(0,0,0,0.15)",
                textAlign: "left",
                zIndex: 1,
                clipPath: "polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% 90%, calc(100% - 10px) 100%, 30% 100%, 20% 115%, 15% 100%, 10px 90%, 0% 80%, 0% 10px)",
              }
            },
            position: { x: pos.x, y: pos.y }
          };

          boxes = boxes.concat([{ x: pos.x, y: pos.y, width: NOTE_NODE_WIDTH, height: NOTE_NODE_HEIGHT }]);

          const noteEdge = {
            id: `e${scheduleid}-${note.note_id}`,
            source: `${scheduleid}`,
            target: `${note.note_id}`,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2, strokeDasharray: "5 5" },
          };

          noteNodes.push(noteNode);
          noteEdges.push(noteEdge);
        });
      });

      // Resolve overlaps for main + notes (exact dimensions per node), then set nodes
      if (noteNodes.length > 0) {
        const mainNodes = allNodesRef.current || [];
        const combined = [...mainNodes, ...noteNodes];
        stackColumnsVertically(combined, RESOLVE_MIN_GAP, 40);
        resolveOverlapsGeneralOnly(combined, RESOLVE_MIN_GAP);
        setNodes(combined);
        setEdges((eds) => [...eds, ...noteEdges]);
      }
    });

  }, [data, setNodes, setEdges, addNodeBelow]);


  useEffect(() => {
    if (data?.propertyscheduleid) {
      setPropertyScheduleId(data.propertyscheduleid); // ✅ Store it when data loads
    }

    // Only create nodes if we have schedule data
    if (data?.schedule?.length > 0) {
      createNodesAndLinks();
    }
  }, [data?.schedule, createNodesAndLinks]);

  // Post-render overlap fix using real measured node sizes.
  // This catches cases where cards/notes render taller than our defaults.
  useEffect(() => {
    if (!nodes?.length) return;
    if (applyingOverlapFixRef.current) return;

    const t = setTimeout(() => {
      const rfNodes = getNodes?.() || [];
      if (!rfNodes.length) return;

      // Only run when measurements are available (otherwise we'd repeat the same math).
      const hasMeasured = rfNodes.some((n) => Number.isFinite(n?.measured?.height) && n.measured.height > 0);
      if (!hasMeasured) return;

      const cloned = rfNodes.map((n) => ({
        ...n,
        position: n.position ? { ...n.position } : n.position,
      }));

      stackColumnsVertically(cloned, RESOLVE_MIN_GAP, 40);
      resolveOverlapsGeneralOnly(cloned, RESOLVE_MIN_GAP);

      const changed = cloned.some((n) => {
        const old = nodes.find((x) => x.id === n.id);
        if (!old?.position || !n.position) return false;
        return old.position.x !== n.position.x || old.position.y !== n.position.y;
      });

      if (changed) {
        applyingOverlapFixRef.current = true;
        setNodes(cloned);
        setTimeout(() => {
          applyingOverlapFixRef.current = false;
        }, 0);
      }
    }, 120);

    return () => clearTimeout(t);
  }, [nodes, getNodes, setNodes]);

  // Keep a baseline copy for hover highlight restore.
  useEffect(() => {
    if (hoveredNodeId) return;
    baseNodesRef.current = nodes;
    baseEdgesRef.current = edges;
  }, [nodes, edges, hoveredNodeId]);

  const applyDependencyHover = useCallback((nodeId) => {
    const baseNodes = baseNodesRef.current || nodes;
    const baseEdges = baseEdgesRef.current || edges;
    const id = String(nodeId);

    const relatedEdgeIds = new Set();
    const relatedNodeIds = new Set([id]);

    (baseEdges || []).forEach((e) => {
      if (!e) return;
      const s = String(e.source);
      const t = String(e.target);
      if (s === id || t === id) {
        relatedEdgeIds.add(e.id);
        relatedNodeIds.add(s);
        relatedNodeIds.add(t);
      }
    });

    setEdges((_) =>
      (baseEdges || []).map((e) => {
        const isRelated = relatedEdgeIds.has(e.id);
        const baseStyle = e.style || {};
        return {
          ...e,
          animated: isRelated,
          style: {
            ...baseStyle,
            opacity: isRelated ? 1 : 0.06,
            stroke: isRelated ? "#2563EB" : (baseStyle.stroke || "#111827"),
            strokeWidth: isRelated ? 4 : (baseStyle.strokeWidth || 2),
          },
          markerEnd: {
            ...(e.markerEnd || {}),
            color: isRelated ? "#2563EB" : (e.markerEnd?.color || "#111827"),
          },
        };
      })
    );

    setNodes((_) =>
      (baseNodes || []).map((n) => {
        const isRelated = relatedNodeIds.has(String(n.id));
        const baseStyle = n.data?.style || {};
        return {
          ...n,
          data: {
            ...n.data,
            style: {
              ...baseStyle,
              opacity: isRelated ? (baseStyle.opacity ?? 1) : 0.15,
              boxShadow: isRelated ? "0 12px 28px rgba(37,99,235,0.22)" : (baseStyle.boxShadow || "none"),
              border: isRelated
                ? (String(baseStyle.border || "").includes("solid")
                    ? baseStyle.border.replace(/#[0-9a-fA-F]{3,8}/, "#2563EB")
                    : "2px solid #2563EB")
                : baseStyle.border,
            },
          },
        };
      })
    );
  }, [nodes, edges]);

  const clearDependencyHover = useCallback(() => {
    setHoveredNodeId(null);
    setNodes(baseNodesRef.current || nodes);
    setEdges(baseEdgesRef.current || edges);
  }, [nodes, edges]);

  useEffect(() => {
    if (!hasFitViewRun.current && nodes.length > 0) {
      // Wait for nodes to fully render with their new sizes
      setTimeout(() => {
        const firstInProgressNode = nodes.find(
          (node) => !node.data?.isTextOnly && node.data?.status?.toLowerCase() === "in progress"
        );

        if (firstInProgressNode && firstInProgressNode.position) {
          // Keep focus on in-progress node but avoid over-zooming into a single card
          const responsiveFit = getResponsiveFitViewConfig();
          fitView({
            nodes: [firstInProgressNode],
            padding: responsiveFit.nodePadding,
            duration: 800,
            minZoom: 0.3,
            maxZoom: responsiveFit.maxZoom
          });
        } else {
          // If no in-progress node, just fit view to all nodes
          const responsiveFit = getResponsiveFitViewConfig();
          fitView({ padding: responsiveFit.globalPadding, duration: 800, maxZoom: responsiveFit.maxZoom });
        }
        hasFitViewRun.current = true;
      }, 800); // Increased delay to ensure nodes are fully rendered
    }
  }, [nodes, fitView, getResponsiveFitViewConfig]);

  // Listen for schedule refresh events from CustomNodeWithAddButton
  useEffect(() => {
    const handleScheduleRefresh = () => {
      console.log("🔄 Schedule refresh event received");
      refreshSchedule();
    };

    window.addEventListener("schedule-refresh", handleScheduleRefresh);
    return () => {
      window.removeEventListener("schedule-refresh", handleScheduleRefresh);
    };
  }, [refreshSchedule]);

  const handleDurationConfirm = async () => {
    const parentNode = allNodesRef.current.find((n) => n.id === addNodeParentId);
    if (!parentNode || !data?.schedule?.length) return;

    // ✅ Step 1: Fetch existing nodes that are not text-only and not the parent
    const phasesToAdjust = allNodesRef.current.filter(
      (node) =>
        !node.data.isTextOnly &&
        node.id !== addNodeParentId
    );

    // ✅ Step 2: Calculate total percentage from existing nodes
    const totalExisting = phasesToAdjust.reduce(
      (sum, node) => sum + (parseFloat(node.data.percentage) || 0),
      0
    );

    // ✅ Step 3: Calculate remaining percentage and scale factor
    const remaining = 100 - parseFloat(newNodePercentage);
    const scale = totalExisting > 0 ? remaining / totalExisting : 1;

    // ✅ Step 4: Update other nodes' percentages
    await Promise.all(
      phasesToAdjust.map((node) => {
        const original = parseFloat(node.data.percentage) || 0;
        const adjusted = parseFloat((original * scale).toFixed(2));

        return fetch(`http://localhost:8080/update-schedule/${node.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ percentage: adjusted }),
        });
      })
    );
    // 🧠 Step 1: Gather existing phases (exclude the one being added and text nodes)
    const existingPhases = nodes.filter(
      (node) =>
        node.type !== "textNode" &&
        node.data?.percentage !== undefined &&
        !node.id.startsWith("temp") // skip the temp node being added
    );

    // 🧠 Step 2: Parse new percentage (from form or input state)
    const newPercentage = parseFloat(newNodePercentage || "0");


    // 🧠 Step 3: Calculate remaining percentage to redistribute
    const remainingPercentage = 100 - newPercentage;
    const scaled_updates = existingPhases.map((node) => {
      const current = node.data.percentage || 0;
      const scaled = (current * remainingPercentage) / 100;
      return {
        scheduleid: parseInt(node.id), // ✅ FIX: include scheduleid
        updated_percentage: parseFloat(scaled.toFixed(2)),
      };
    });



    const payload = {
      propertyscheduleid: data.schedule.find(s => s.scheduleid == addNodeParentId)?.propertyscheduleid,

      propertyid: propertyId,
      phasename: newNodePhaseName,
      duration: parseInt(newNodeDuration),
      status: newNodeStatus,
      depends_on_scheduleid: parseInt(addNodeParentId),
      remarks: `Inserted from ${addNodeParentId}`,
      is_text_only: false,
      percentage: parseFloat(newNodePercentage),

      createdby: currentUserEmail,


      ...(function () {
        const boxes = nodesToBoxes(allNodesRef.current || []);
        const pos = findNonOverlappingPosition(
          parentNode.position.x + X_SPACING,
          parentNode.position.y,
          boxes,
          LAYOUT.NODE_WIDTH,
          LAYOUT.NODE_HEIGHT
        );
        return { x_position: pos.x, y_position: pos.y };
      })(),
      scaled_updates                    // ✅ redistribution array
    };

    console.log("📦 Final Payload being sent to backend:");
    Object.entries(payload).forEach(([key, value]) => {
      console.log(`   ${key}:`, value);
    });

    fetch("http://localhost:8080/add-schedule-node", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

      .then((res) => res.json())
      .then(async (res) => {
        console.log("✅ Node created on backend:", res);

        await sendPropertyChatUpdate({
          property_id: propertyId,
          employee_code: localStorage.getItem("employee_code"),
          engineer_name: `${localStorage.getItem("first_name")} ${localStorage.getItem("last_name")}`.trim(),
          message_text: `🆕 New phase *${payload.phasename}* added with *${payload.duration} day(s)* duration and *${payload.percentage}%* contribution.`,
        });

        // Force refresh schedule multiple times to ensure graph updates
        refreshSchedule();
        setTimeout(() => {
          refreshSchedule();
        }, 500);
        setTimeout(() => {
          refreshSchedule();
        }, 1000);

        setDurationDialogOpen(false);
        setNewNodeDuration(3);
        setNewNodePhaseName("New Phase");
        setNewNodeStatus("pending");
        setNewNodePercentage(0);
      })
      .catch((err) => {
        console.error("❌ Backend node creation failed:", err);
        setSnackbar({ open: true, message: "Failed to add node: " + (err.message || "Unknown error"), severity: "error" });
      });


  };

  const handleClick = (event, node) => {
    event.stopPropagation();

    // Use the node ID to update the relevant node's editing state
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === node.id
          ? {
            ...n,
            data: {
              ...n.data,
              editingField: 'phase' // or default to 'phase' edit
            }
          }
          : n
      )
    );
  };
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>

      <div style={{ width: '100%', height: '200vh' }}>
        <Box
          sx={{
            flexShrink: 0,
            minWidth: { xs: "100%", md: "auto" },
          }}
        >
          {data?.schedule && <ScheduleKPISummary schedule={data.schedule} />}
        </Box>
        <Box sx={{ width: "100%", mt: 1 }}>
  <Paper
    elevation={0}
    sx={{
      px: { xs: 2, sm: 2.5, md: 3 },
      py: { xs: 2, sm: 2.5, md: 3 },
      borderRadius: 4,
      backgroundColor: "#ffffff",
      boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
      width: "100%",
      minWidth: 0,
      overflow: "hidden",
    }}
  >
    {/* SINGLE ROW: 50% Progress | 50% Buttons */}
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: { xs: 2, sm: 2.5, md: 3 },
        flexWrap: { xs: "wrap", md: "nowrap" },
        width: "100%",
      }}
    >
      {/* LEFT 50% – Workflow Progress (only when schedule exists) */}
      {data?.schedule?.length > 0 && (
      <Box
        sx={{
          flex: { xs: "1 1 100%", md: "1 1 50%" },
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            width: "100%",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: "2px solid #16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✅
            </Box>
            <Typography variant="subtitle2">Workflow Progress</Typography>
          </Box>

          <Typography
            variant="body2"
            sx={{ mt: 0.25, fontWeight: 600 }}
          >
            {overallCompletion.toFixed(2)}%
          </Typography>

          <LinearProgress
            variant="determinate"
            value={overallCompletion}
            sx={{
              mt: 0.75,
              width: "100%",
              height: 8,
              borderRadius: 999,
              backgroundColor: "#eef2ff",
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#4caf50",
              },
            }}
          />
        </Box>
      </Box>
      )}

      {/* RIGHT – Responsive toolbar: compact mode on small screens to avoid collisions */}
      <Box
        sx={{
          flex: { xs: "1 1 100%", md: "1 1 70%" },
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: { xs: 0.75, sm: 1 },
          flexWrap: isCompactToolbar ? "nowrap" : "wrap",
          minWidth: 0,
        }}
      >
        {!data?.schedule?.length ? (
          /* No schedule: only Upload Schedule */
          onOpenUploadSchedule && (
            <Tooltip title="Upload Schedule (Excel/CSV)" arrow>
              <Button
                variant="contained"
                size="small"
                onClick={onOpenUploadSchedule}
                startIcon={<CloudUploadIcon />}
                sx={{
                  textTransform: "none",
                  borderRadius: 1,
                  background: "#2563EB",
                  "&:hover": { background: "#1D4ED8" },
                  minWidth: "auto",
                  px: { xs: 1, sm: 1.5 },
                }}
              >
                Upload Schedule
              </Button>
            </Tooltip>
          )
        ) : (
          /* Schedule exists: compact actions + overflow menu on small screens */
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, flex: isCompactToolbar ? "1 1 auto" : "0 0 auto" }}>
              {!isCompactToolbar && (
                <>
                  <Tooltip title="Zoom in (Ctrl/Cmd + +)" arrow>
                    <IconButton size="small" onClick={() => zoomIn?.({ duration: 200 })} sx={{ border: "1px solid #e5e7eb", borderRadius: 1, p: 0.75 }}>
                      <ZoomInIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Zoom out (Ctrl/Cmd + -)" arrow>
                    <IconButton size="small" onClick={() => zoomOut?.({ duration: 200 })} sx={{ border: "1px solid #e5e7eb", borderRadius: 1, p: 0.75 }}>
                      <ZoomOutIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              <TextField
                size="small"
                placeholder="Search phase…"
                value={phaseSearchQuery}
                onChange={(e) => setPhaseSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePhaseSearch()}
                sx={{
                  width: isCompactToolbar ? "100%" : 160,
                  maxWidth: { xs: 170, sm: 220, md: 180 },
                  "& .MuiInputBase-input": { py: 0.5, fontSize: 13 },
                }}
              />
              <Tooltip title="Jump to phase" arrow>
                <IconButton size="small" onClick={handlePhaseSearch} sx={{ color: "#2563EB", flexShrink: 0 }}>
                  <SearchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {!isCompactToolbar && (
              <>
                <Tooltip title="Hold Logs" arrow>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={fetchHoldLogs}
                    startIcon={<DescriptionIcon />}
                    sx={{
                      textTransform: "none",
                      borderRadius: 1,
                      minWidth: "auto",
                      px: { xs: 1, sm: 1.5 },
                    }}
                  >
                    Hold Logs
                  </Button>
                </Tooltip>

                <Tooltip title="Export Diagram as PNG" arrow>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={exportFullGraphPng}
                    startIcon={<PictureAsPdfIcon />}
                    sx={{
                      textTransform: "none",
                      borderRadius: 1,
                      background: "#1a365d",
                      "&:hover": { background: "#12223c" },
                      minWidth: "auto",
                      px: { xs: 1, sm: 1.5 },
                    }}
                  >
                    Export PNG
                  </Button>
                </Tooltip>
              </>
            )}

            <Tooltip title="Update Schedule from Excel" arrow>
              <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <input
                  accept=".xlsx"
                  style={{ display: "none" }}
                  id="update-schedule-input"
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append("propertyid", propertyId);
                    formData.append("file", file);

                    try {
                      const res = await fetch(
                        "http://localhost:8080/merge-schedule-with-reschedule",
                        {
                          method: "POST",
                          body: formData,
                        }
                      );

                      const data = await res.json();
                      if (!res.ok) {
                        setSnackbar({ open: true, message: `Failed to update schedule: ${data.detail || "Unknown error"}`, severity: "error" });
                        return;
                      }

                      setSnackbar({ open: true, message: "Schedule updated successfully!", severity: "success" });
                      refreshSchedule();
                    } catch (err) {
                      console.error("❌ Error updating schedule:", err);
                      setSnackbar({ open: true, message: "Update failed. Check console for details.", severity: "error" });
                    } finally {
                      (e.target).value = "";
                    }
                  }}
                />
                <label htmlFor="update-schedule-input">
                  <Button
                    component="span"
                    variant="contained"
                    size="small"
                    startIcon={!isCompactToolbar ? <CloudUploadIcon /> : null}
                    sx={{
                      textTransform: "none",
                      borderRadius: 1,
                      background: "#2A3663",
                      "&:hover": { background: "#1c2340" },
                      minWidth: "auto",
                      px: { xs: 1, sm: 1.5 },
                    }}
                  >
                    {isCompactToolbar ? "Update" : "Update"}
                  </Button>
                </label>
              </Box>
            </Tooltip>

            {!isCompactToolbar && (
              <>
                <Tooltip title="View Schedule Summary" arrow>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setSummaryOpen(true)}
                    startIcon={<BarChartIcon />}
                    sx={{
                      textTransform: "none",
                      borderRadius: 1,
                      background: "#2563EB",
                      "&:hover": { background: "#1D4ED8" },
                      minWidth: "auto",
                      px: { xs: 1, sm: 1.5 },
                    }}
                  >
                    Summary
                  </Button>
                </Tooltip>

                <Tooltip title="Realign diagram nodes using fixed node size and spacing (exact placements)" arrow>
                  <IconButton
                    onClick={() => {
                      realignRequestedRef.current = true;
                      createNodesAndLinks();
                    }}
                    size="small"
                    sx={{
                      color: "#1976d2",
                      border: "1px solid #1976d2",
                      borderRadius: 1,
                      p: 0.75,
                    }}
                  >
                    <AccountTreeIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Download Schedule Excel" arrow>
                  <IconButton
                    onClick={() => downloadScheduleExcel(propertyId)}
                    size="small"
                    sx={{
                      color: "#1a365d",
                      border: "1px solid #1a365d",
                      borderRadius: 1,
                      p: 0.75,
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}

            {isCompactToolbar && (
              <>
                <Tooltip title="More actions" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => setToolbarMenuAnchorEl(e.currentTarget)}
                    sx={{ border: "1px solid #e5e7eb", borderRadius: 1, p: 0.75, flexShrink: 0 }}
                  >
                    <MoreHorizIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={toolbarMenuAnchorEl}
                  open={Boolean(toolbarMenuAnchorEl)}
                  onClose={() => setToolbarMenuAnchorEl(null)}
                  PaperProps={{ sx: { minWidth: 220 } }}
                >
                  <MenuItem onClick={() => { zoomIn?.({ duration: 200 }); setToolbarMenuAnchorEl(null); }}>
                    <ZoomInIcon fontSize="small" style={{ marginRight: 8 }} /> Zoom in
                  </MenuItem>
                  <MenuItem onClick={() => { zoomOut?.({ duration: 200 }); setToolbarMenuAnchorEl(null); }}>
                    <ZoomOutIcon fontSize="small" style={{ marginRight: 8 }} /> Zoom out
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={() => { fetchHoldLogs(); setToolbarMenuAnchorEl(null); }}>
                    <DescriptionIcon fontSize="small" style={{ marginRight: 8 }} /> Hold Logs
                  </MenuItem>
                  <MenuItem onClick={() => { setSummaryOpen(true); setToolbarMenuAnchorEl(null); }}>
                    <BarChartIcon fontSize="small" style={{ marginRight: 8 }} /> Summary
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      realignRequestedRef.current = true;
                      createNodesAndLinks();
                      setToolbarMenuAnchorEl(null);
                    }}
                  >
                    <AccountTreeIcon fontSize="small" style={{ marginRight: 8 }} /> Realign
                  </MenuItem>
                  <MenuItem onClick={() => { downloadScheduleExcel(propertyId); setToolbarMenuAnchorEl(null); }}>
                    <DownloadIcon fontSize="small" style={{ marginRight: 8 }} /> Download Schedule
                  </MenuItem>
                  <MenuItem onClick={() => { exportFullGraphPng(); setToolbarMenuAnchorEl(null); }}>
                    <PictureAsPdfIcon fontSize="small" style={{ marginRight: 8 }} /> Export PNG
                  </MenuItem>
                </Menu>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  </Paper>
</Box>


        <div style={{ width: '100%', height: '100vh', overflow: 'auto' }}>

          <div
            ref={reactFlowRef}
            style={{ width: '100%', height: '90%', overflow: 'visible' }}   // 👈 allow menus to spill
            id="reactflow-container"
            className="diagram-export-wrapper"
          >


            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDoubleClick={handleNodeDoubleClick}
              onNodeClick={handleClick}
              onNodeMouseEnter={(_, node) => {
                if (!node?.id) return;
                setHoveredNodeId(String(node.id));
                applyDependencyHover(String(node.id));
              }}
              onNodeMouseLeave={() => {
                clearDependencyHover();
              }}
              panOnScroll={true}
              onNodeContextMenu={handleNodeContextMenu}
              onPaneClick={() => {
                setContextMenu(null);
                clearDependencyHover();
              }}
              onNodeDragStop={(event, node) => {
                if (node.position?.x == null || node.position?.y == null) return;

                // Save position to backend
                fetch(`http://localhost:8080/update-position/${node.id}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    x: node.position.x,
                    y: node.position.y,
                  }),
                }).catch((err) => {
                  console.error("❌ Failed to update position:", err);
                });

                // 🕒 Debounce refreshSchedule after inactivity
                if (dragTimerRef.current) {
                  clearTimeout(dragTimerRef.current);
                }

                dragTimerRef.current = setTimeout(() => {
                  requestAnimationFrame(() => {
                    console.log("🔄 Refreshing schedule after drag idle");
                    refreshSchedule();
                  });
                }, 30000);
              }}
              onEdgeClick={(e, edge) => {
                e.stopPropagation();

                const targetId = parseInt(edge.target);
                const sourceId = parseInt(edge.source);

                const targetSchedule = data.schedule.find(
                  (s) => s.scheduleid == targetId
                );

                // Handle both single parent and multiple parents
                let currentParents = [];
                if (
                  targetSchedule?.depends_on_scheduleids &&
                  Array.isArray(targetSchedule.depends_on_scheduleids)
                ) {
                  currentParents = targetSchedule.depends_on_scheduleids;
                } else if (targetSchedule?.depends_on_scheduleid) {
                  currentParents = Array.isArray(targetSchedule.depends_on_scheduleid)
                    ? targetSchedule.depends_on_scheduleid
                    : [targetSchedule.depends_on_scheduleid];
                }

                const updatedParents = currentParents
                  .map((id) => parseInt(id))
                  .filter((id) => id !== sourceId);

                console.log("🗑️ Removing connection:");
                console.log("Target ID:", targetId);
                console.log("Source ID to remove:", sourceId);
                console.log("Current parents:", currentParents);
                console.log("Updated parents:", updatedParents);

                fetch(`http://localhost:8080/update-dependencies/${targetId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ new_parent_id: updatedParents }),
                })
                  .then((res) => {
                    if (!res.ok) {
                      console.error("❌ Failed to update dependency");
                      // Revert UI change if backend fails
                      setEdges((eds) => [...eds, edge]);
                      return;
                    }
                    // Remove edge from UI after successful backend update
                    setEdges((eds) => eds.filter((ed) => ed.id !== edge.id));

                    // Recalculate timeline after removing dependency
                    return fetch(
                      `http://localhost:8080/recalculate-schedule/${targetId}`,
                      {
                        method: "POST",
                      }
                    );
                  })
                  .then((res) => {
                    if (res && !res.ok) {
                      console.error("❌ Failed to recalculate schedule");
                    }
                    refreshSchedule();
                  })
                  .catch((err) => {
                    console.error("❌ Error during dependency update", err);
                    setEdges((eds) => [...eds, edge]);
                  });
              }}
              onConnect={(params) => {
                const sourceId = parseInt(params.source);
                const targetId = parseInt(params.target);

                setEdges((eds) => [
                  ...eds,
                  {
                    ...params,
                    id: `e${params.source}-${params.target}`,
                    type: "smoothstep",
                    markerEnd: { type: MarkerType.ArrowClosed },
                  },
                ]);

                const targetSchedule = data.schedule.find(
                  (s) => s.scheduleid == targetId
                );
                const currentParents = Array.isArray(
                  targetSchedule?.depends_on_scheduleid
                )
                  ? targetSchedule.depends_on_scheduleid
                  : [targetSchedule?.depends_on_scheduleid].filter(Boolean);

                const updatedParents = [...currentParents, sourceId];

                console.log("➕ Adding connection:");
                console.log("Target ID:", targetId);
                console.log("Source ID:", sourceId);
                console.log("Updated parent list to send:", updatedParents);

                fetch(`http://localhost:8080/update-dependencies/${targetId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ new_parent_id: [sourceId] }),
                })
                  .then((res) => {
                    if (!res.ok) {
                      console.error("❌ Failed to update dependency");
                      return;
                    }

                    return fetch(
                      `http://localhost:8080/recalculate-schedule/${targetId}`,
                      {
                        method: "POST",
                      }
                    );
                  })
                  .then((res) => {
                    if (res && !res.ok) {
                      console.error("❌ Failed to recalculate schedule");
                    }
                    refreshSchedule();
                  })
                  .catch((err) => {
                    console.error(
                      "❌ Error during dependency update or recalculation",
                      err
                    );
                  });
              }}
              fitViewOptions={{ padding: getResponsiveFitViewConfig().globalPadding, maxZoom: getResponsiveFitViewConfig().maxZoom }}
              nodeTypes={{ custom: CustomNodeWithAddButton }}
              fitView
              connectOnClick={true}
              defaultEdgeOptions={defaultEdgeOptions}
            >
              <MiniMap />
              <Controls showZoom showFitView />
              <Background />

              {/* Context menu for creating nodes/comments – unchanged */}
              <Menu
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                PaperProps={{ style: { padding: 8, width: "auto" } }}
              >
                <Box p={1}>
                  {[
                    { value: "rectangle", label: "Node", style: { width: 40, height: 24, borderRadius: 12 } },
                    {
                      value: "text",
                      label: "Comment Box",
                      style: {
                        width: 48,
                        height: 28,
                        clipPath:
                          "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                      },
                    },
                  ].map((shape) => (
                    <Box
                      key={shape.value}
                      onClick={() => {
                        setPendingAddShape(shape.value);
                        setAnchorEl(null);

                        if (shape.value === "text") {
                          const parentNode = allNodesRef.current.find(
                            (n) => n.id === addNodeParentId
                          );
                          if (!parentNode || !data?.schedule?.length) return;

                          const boxes = nodesToBoxes(allNodesRef.current || []);
                          const pos = findNonOverlappingPosition(
                            parentNode.position.x + X_SPACING,
                            parentNode.position.y + 40,
                            boxes,
                            NOTE_NODE_WIDTH,
                            NOTE_NODE_HEIGHT
                          );
                          const payload = {
                            property_id: propertyId,
                            note_text: "New Note",
                            created_by: currentUserEmail,
                            x: pos.x,
                            y: pos.y,
                          };

                          fetch(
                            `http://localhost:8080/schedule/${parentNode.id}/notes`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "x-user-email": currentUserEmail,
                              },
                              body: JSON.stringify(payload),
                            }
                          )
                            .then((res) => res.json())
                            .then((res) => {
                              if (res.note_id) {
                                const noteNode = {
                                  id: res.note_id,
                                  type: "custom",
                                  data: {
                                    label: payload.note_text,
                                    status: "info",
                                    remarks: "",
                                    openAddNodeDialog,
                                    setNodes,
                                    isTextOnly: true,
                                    style: {
                                      background: "#fff9c4",
                                      color: "#6b4d00",
                                      fontStyle: "italic",
                                      fontWeight: "500",
                                      padding: "16px",
                                      borderRadius: "24px",
                                      width: 260,
                                      minHeight: "80px",
                                      fontSize: "14px",
                                      whiteSpace: "pre-wrap",
                                      overflowWrap: "break-word",
                                      boxShadow: "2px 4px 10px rgba(0,0,0,0.15)",
                                      textAlign: "left",
                                      clipPath:
                                        "polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% 90%, calc(100% - 10px) 100%, 30% 100%, 20% 115%, 15% 100%, 10px 90%, 0% 80%, 0% 10px)",
                                    },
                                  },
                                  position: {
                                    x: payload.x,
                                    y: payload.y,
                                  },
                                };

                                const noteEdge = {
                                  id: `e${addNodeParentId}-${res.note_id}`,
                                  source: addNodeParentId,
                                  target: res.note_id,
                                  type: "smoothstep",
                                  markerEnd: { type: MarkerType.ArrowClosed },
                                  style: { strokeWidth: 2, strokeDasharray: "5 5" },
                                };

                                setNodes((nds) => [...nds, noteNode]);
                                setEdges((eds) => [...eds, noteEdge]);
                              }
                            })
                            .catch((err) =>
                              console.error("❌ Failed to save comment note:", err)
                            );
                        } else {
                          setDurationDialogOpen(true);
                        }
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        py: 1,
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "#f0f0f0",
                          borderRadius: 1,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          ...shape.style,
                          backgroundColor: "#ddd",
                          border: "2px solid #004ba0",
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {shape.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Menu>
            </ReactFlow>

            <ScheduleSummaryDialog
              open={summaryOpen}
              onClose={() => setSummaryOpen(false)}
              schedule={data.schedule}
              holdLogs={holdLogs}
              propertyMeta={{ propertyId }}
            />
          </div>
        </div>
        <Drawer
          anchor="right"
          open={holdDrawerOpen}
          onClose={() => setHoldDrawerOpen(false)}
          ModalProps={{
            keepMounted: true,
          }}
          PaperProps={{
            sx: {
              width: 420,
              zIndex: 2000, // ✅ Push drawer to front
            },
          }}
          sx={{
            zIndex: 2000, // ✅ Needed for some MUI versions
          }}
        >
          <div style={{ width: 400, height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ padding: '16px', margin: 0 }}>📋 Hold Logs</h3>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
              {holdLogs.length === 0 ? (
                <p>No holds found.</p>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">🔢 Hold Type Summary</Typography>
                    {Object.entries(holdTypeCounts).map(([type, { count, totalDuration }]) => (
                      <Typography key={type} variant="body2">
                        📌 <b>{type}</b>: {count} hold(s), ⏳ Total: {totalDuration} day(s)
                      </Typography>
                    ))}
                  </Box>


                  {holdLogs.map((log, index) => {
                    const isExpanded = expandedIndex === index;

                    return (
                      <Card
                        key={index}
                        variant="outlined"
                        sx={{ marginBottom: 2, backgroundColor: '#fafafa' }}
                      >
                        <CardContent
                          onClick={() => setExpandedIndex(isExpanded ? null : index)}
                          style={{
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <Typography variant="subtitle1"><b>{log.phasename}</b></Typography>
                            <Typography variant="body2">📛 Type: <b>{log.hold_type || 'N/A'}</b></Typography> {/* ✅ Hold Type Added */}
                            <Typography variant="body2">📅 Hold: {formatDate(log.hold_date)}</Typography>
                            {log.resume_date && (
                              <Typography variant="body2">✅ Resume: {formatDate(log.resume_date)}</Typography>
                            )}
                            <Typography variant="body2">
                              ⏳ {log.hold_duration === 0 ? "Same Day" : `${log.hold_duration} day(s)`}
                            </Typography>
                          </div>

                          <IconButton size="small">
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </CardContent>


                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Divider />
                          <CardContent>
                            <Typography variant="body2">✍️ Reason: {log.hold_reason}</Typography>
                            <Typography variant="body2">📧 By: {log.hold_by_email}</Typography>
                            {log.resume_date && (
                              <Typography variant="body2">✅ Resumed: {formatDate(log.resume_date)}</Typography>
                            )}
                            {log.resume_reason && (
                              <Typography variant="body2">🔄 Resume Reason: {log.resume_reason}</Typography>
                            )}
                          </CardContent>
                        </Collapse>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
          </div>



        </Drawer>


        <Dialog open={Boolean(selectedPhase)} onClose={() => setSelectedPhase(null)} fullWidth maxWidth="lg">
          <DialogTitle sx={{ display: "flex", justifyContent: "flex-end" }}>
            <IconButton onClick={() => setSelectedPhase(null)} color="error">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>

              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, height: isMobile ? "auto" : "1500px", overflowY: "auto", borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {propertyId ? `${propertyId} – Task List` : 'Task List'}
                  </Typography>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Status Filter</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label="Status Filter"
                    >
                      <MenuItem value="All">All</MenuItem>
                      {Object.keys(statusColors).map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.replace(/_/g, " ")}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <List>
                    {filteredTasks.map((task) => {
                      const bgColor = statusColors[task.status] || "#fff";
                      const textColor = statusTextColor[task.status] || "#000";
                      const borderColor = statusBorderColor[task.status] || "#ccc";

                      return (
                        <ListItem
                          key={task.scheduleid}
                          button
                          onClick={() => setSelectedTask({ task, propertyid: propertyId })}
                          sx={{
                            mb: 1,
                            border: `2px solid ${borderColor}`,
                            borderRadius: 1,
                            backgroundColor: task.scheduleid === selectedTask?.scheduleid ? "#f0f8ff" : bgColor,
                            cursor: "pointer",
                          }}
                        >
                          <ListItemText
                            primary={<Typography sx={{ color: textColor, fontWeight: "bold" }}>{task.phasename}</Typography>}
                            secondary={<Typography sx={{ color: textColor }}>{task.status}</Typography>}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>
              </Grid>

              <Grid item xs={12} md={9}>
                <TaskManager
                  propertyId={propertyId}
                  initialTask={selectedTask?.task || selectedPhase}

                  refreshTasks={() => {
                    refreshSchedule();
                    createNodesAndLinks();
                    setTimeout(() => {
                      setSelectedTask(null);
                      setSelectedPhase(null);
                    }, 500); // wait for UI update
                  }}
                />
              </Grid>
            </Grid>

          </DialogContent>
        </Dialog>

        {/* ✅ Dialogs are now handled in CustomNodeWithAddButton component - removed duplicates here */}


        <Dialog
          open={durationDialogOpen}
          onClose={() => setDurationDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 3,
              position: "relative",
              overflow: "visible",
            },
          }}
        >
          {/* Close (X) button */}
          <IconButton
            size="small"
            onClick={() => setDurationDialogOpen(false)}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          {/* Top icon bubble */}
          <Box
            sx={{
              position: "absolute",
              top: -28,
              left: "50%",
              transform: "translateX(-50%)",
              width: 56,
              height: 56,
              borderRadius: "999px",
              backgroundColor: "#E0E7FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(15,23,42,0.18)",
            }}
          >
            <AddIcon sx={{ fontSize: 32, color: "#4F46E5" }} />
          </Box>

          {/* Title + subtitle */}
          <DialogTitle
            sx={{
              textAlign: "center",
              fontWeight: 600,
              mt: 3,
              mb: 0.5,
            }}
          >
            Create New Phase
          </DialogTitle>
          <Typography
            variant="body2"
            sx={{ textAlign: "center", color: "#6B7280", mb: 3 }}
          >
            Add a new phase to the workflow.
          </Typography>

          {/* Form fields */}
          <DialogContent sx={{ pb: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: "#9CA3AF", mb: 0.5, display: "block" }}
            >
              Phase Name
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Enter phase name"
              value={newNodePhaseName}
              onChange={(e) => setNewNodePhaseName(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Typography
              variant="caption"
              sx={{ color: "#9CA3AF", mb: 0.5, display: "block" }}
            >
              Duration (in days)
            </Typography>
            <TextField
              type="number"
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Enter duration"
              value={newNodeDuration}
              onChange={(e) => setNewNodeDuration(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Typography
              variant="caption"
              sx={{ color: "#9CA3AF", mb: 0.5, display: "block" }}
            >
              Status
            </Typography>
            <TextField
              select
              fullWidth
              variant="outlined"
              size="small"
              value={newNodeStatus}
              onChange={(e) => setNewNodeStatus(e.target.value)}
              sx={{ mb: 2 }}
            >
              {["pending", "in progress", "completed", "blocked"].map((s) => (
                <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
              ))}
            </TextField>

            <Typography
              variant="caption"
              sx={{ color: "#9CA3AF", mb: 0.5, display: "block" }}
            >
              Percentage
            </Typography>
            <TextField
              type="number"
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Enter percentage"
              value={newNodePercentage}
              onChange={(e) => setNewNodePercentage(e.target.value)}
              InputProps={{ endAdornment: <span style={{ fontSize: 12, color: "#6B7280" }}>%</span> }}
            />
          </DialogContent>

          {/* Buttons */}
          <DialogActions
            sx={{
              mt: 3,
              pt: 0,
              px: 3,
              pb: 1,
              display: "flex",
              gap: 2,
            }}
          >
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setDurationDialogOpen(false)}
              sx={{
                textTransform: "none",
                borderRadius: 999,
                bgcolor: "#F9FAFB",
              }}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handleDurationConfirm}
              sx={{
                textTransform: "none",
                borderRadius: 999,
                bgcolor: "#4F46E5",
                "&:hover": { bgcolor: "#4338CA" },
                color: "#fff",
                fontWeight: 600,
              }}
            >
              Create Phase
            </Button>
          </DialogActions>
        </Dialog>
        <DiagramExportDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          refElement={reactFlowRef} // ✅ pass the ref
        />
        <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </div>
  );
}
export default function WorkflowDiagram({ data, propertyId, refreshSchedule, onOpenInTaskView, onOpenUploadSchedule }) {
  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#fff' }}>
      <ReactFlowProvider>
        <DiagramContent
          data={data}
          propertyId={propertyId}
          refreshSchedule={refreshSchedule}
          onOpenInTaskView={onOpenInTaskView}
          onOpenUploadSchedule={onOpenUploadSchedule}
        />
      </ReactFlowProvider>
    </div>
  );
}