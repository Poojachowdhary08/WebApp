import React, { useState, useEffect } from "react";
import axios from "axios";
import SegmentPIP from "./SegmentPiP"; // Import the SegmentPIP component
import { API_BASE } from "../config";
import { useUiPolish } from "../plugins/uiPolish";

const ProjectsList = () => {
  const ui = useUiPolish();
  const [projects, setProjects] = useState([]);
  const [segmentsMap, setSegmentsMap] = useState({});
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [showPip, setShowPip] = useState(false);
  const [pipContent, setPipContent] = useState(null);
  const [uploadingProjectId, setUploadingProjectId] = useState(null);

  const loadProjects = ui.useAsyncAction({
    actionName: "load projects",
    messages: { error: "Failed to load projects" },
    successToast: false,
  });

  const loadSegments = ui.useAsyncAction({
    actionName: "load segments",
    messages: { error: "Failed to load segments for this project" },
    successToast: false,
  });

  const uploadSegments = ui.useAsyncAction({
    actionName: "upload segments",
    messages: { success: "Segments uploaded successfully", error: "Failed to upload segments" },
  });

  const addSegment = ui.useAsyncAction({
    actionName: "add segment",
    messages: { success: "Segment added successfully", error: "Failed to add segment" },
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchProjects();
  }, []); // run once

  const fetchProjects = async () => {
    await loadProjects.run(async () => {
      const response = await axios.get(`${API_BASE}/projects`);
      setProjects(response.data.projects || []);
      return response.data;
    });
  };

  const fetchSegments = async (projectId) => {
    if (segmentsMap[projectId]) {
      setExpandedProjectId(expandedProjectId === projectId ? null : projectId);
      return;
    }

    await loadSegments.run(async () => {
      const response = await axios.get(`${API_BASE}/projects/${projectId}/segments`);
      const segments = response.data.segments || [];
      setSegmentsMap((prev) => ({
        ...prev,
        [projectId]: segments,
      }));
      setExpandedProjectId(projectId);
      return response.data;
    });
  };

  const handleFileUpload = async (file, projectId) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingProjectId(projectId);
      await uploadSegments.run(async () => {
        const response = await axios.post(`${API_BASE}/projects/${projectId}/segments/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
      });

      // refresh segments for this project
      setSegmentsMap((prev) => ({ ...prev, [projectId]: undefined }));
      await fetchSegments(projectId);
      setShowPip(false);
    } catch (error) {
      console.error("Error uploading segments:", error);
    } finally {
      setUploadingProjectId(null);
    }
  };

  const handleManualAdd = (projectId) => {
    setShowPip(true);
    setPipContent(
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const segmentName = e.target.segmentName.value;
          const segmentType = e.target.segmentType.value;
          const status = e.target.status.value || "Pending";
          const startDate = e.target.startDate.value || null;
          const endDate = e.target.endDate.value || null;
          const description = e.target.description.value;

          try {
            await addSegment.run(async () => {
              const res = await axios.post(`${API_BASE}/projects/${projectId}/segments`, {
                segment_name: segmentName,
                segment_type: segmentType,
                status,
                start_date: startDate,
                end_date: endDate,
                description,
              });
              return res.data;
            });

            // refresh segments for this project
            setSegmentsMap((prev) => ({ ...prev, [projectId]: undefined }));
            await fetchSegments(projectId);
            setShowPip(false);
          } catch (error) {
            console.error("Error adding segment:", error);
          }
        }}
        style={styles.form}
      >
        <h3 style={styles.formHeader}>Add Segment</h3>
        <label style={styles.label}>
          Segment Name:
          <input type="text" name="segmentName" required style={styles.input} disabled={addSegment.isLoading} />
        </label>
        <label style={styles.label}>
          Segment Type:
          <input type="text" name="segmentType" required style={styles.input} disabled={addSegment.isLoading} />
        </label>
        <label style={styles.label}>
          Status:
          <select name="status" style={styles.input} disabled={addSegment.isLoading}>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
        <label style={styles.label}>
          Start Date:
          <input type="date" name="startDate" style={styles.input} disabled={addSegment.isLoading} />
        </label>
        <label style={styles.label}>
          End Date:
          <input type="date" name="endDate" style={styles.input} disabled={addSegment.isLoading} />
        </label>
        <label style={styles.label}>
          Description:
          <textarea name="description" style={styles.textarea} disabled={addSegment.isLoading}></textarea>
        </label>
        <div style={styles.actions}>
          <button type="submit" style={styles.submitButton} disabled={addSegment.isLoading}>
            {addSegment.isLoading ? "Adding…" : "Add Segment"}
          </button>
          <button
            type="button"
            style={styles.cancelButton}
            onClick={() => setShowPip(false)}
            disabled={addSegment.isLoading}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Projects List</h2>

      <ui.AsyncState
        status={loadProjects.status}
        error={loadProjects.error}
        onRetry={fetchProjects}
        isEmpty={loadProjects.status !== "loading" && projects.length === 0}
        emptyMessage="No projects found."
        loadingMessage="Loading projects…"
      >
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.headerCell}>Project ID</th>
              <th style={styles.headerCell}>Project Name</th>
              <th style={styles.headerCell}>Client Name</th>
              <th style={styles.headerCell}>Budget</th>
              <th style={styles.headerCell}>Status</th>
              <th style={styles.headerCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <React.Fragment key={project.project_id}>
                <tr style={styles.tableRow}>
                  <td style={styles.cell}>{project.project_id}</td>
                  <td style={styles.cell}>{project.project_name}</td>
                  <td style={styles.cell}>{project.client_name}</td>
                  <td style={styles.cell}>{ui.formatCurrency(project.budget)}</td>
                  <td style={styles.cell}>{project.project_status}</td>
                  <td style={styles.cell}>
                    <button
                      style={styles.button}
                      onClick={() => fetchSegments(project.project_id)}
                      disabled={loadSegments.isLoading && expandedProjectId !== project.project_id}
                    >
                      {expandedProjectId === project.project_id ? "Hide Segments" : "View Segments"}
                    </button>
                    {expandedProjectId === project.project_id && (
                      <button style={styles.addButton} onClick={() => handleManualAdd(project.project_id)}>
                        Add Segment
                      </button>
                    )}
                  </td>
                </tr>
                {expandedProjectId === project.project_id && (
                  <tr>
                    <td colSpan="6" style={styles.dropdownCell}>
                      {segmentsMap[project.project_id]?.length > 0 ? (
                        <table style={styles.innerTable}>
                          <thead>
                            <tr style={styles.tableHeaderRow}>
                              <th style={styles.headerCell}>Segment Name</th>
                              <th style={styles.headerCell}>Segment Type</th>
                              <th style={styles.headerCell}>Status</th>
                              <th style={styles.headerCell}>Start Date</th>
                              <th style={styles.headerCell}>End Date</th>
                              <th style={styles.headerCell}>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {segmentsMap[project.project_id].map((segment) => (
                              <tr key={segment.segment_id} style={styles.tableRow}>
                                <td style={styles.cell}>{segment.segment_name}</td>
                                <td style={styles.cell}>{segment.segment_type}</td>
                                <td style={styles.cell}>{segment.status}</td>
                                <td style={styles.cell}>
                                  {segment.start_date ? ui.formatDate(segment.start_date) : "Not Set"}
                                </td>
                                <td style={styles.cell}>
                                  {segment.end_date ? ui.formatDate(segment.end_date) : "Not Set"}
                                </td>
                                <td style={styles.cell}>{segment.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div style={styles.noSegmentsContainer}>
                          <p>No segments found for this project.</p>
                          <label style={styles.uploadLabel}>
                            Upload Excel:
                            <input
                              type="file"
                              onChange={(e) => handleFileUpload(e.target.files?.[0], project.project_id)}
                              accept=".xlsx, .xls"
                              disabled={uploadingProjectId === project.project_id && uploadSegments.isLoading}
                            />
                          </label>
                          <button style={styles.addButton} onClick={() => handleManualAdd(project.project_id)}>
                            Add Manually
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </ui.AsyncState>

      {showPip && (
        <SegmentPIP title="Add Segment" onClose={() => setShowPip(false)}>
          {pipContent}
        </SegmentPIP>
      )}
    </div>
  );
};
const styles = {
  container: {
    padding: "20px",
    background: "#f5f5f5",
    borderRadius: "10px",
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
    fontFamily: "'Arial', sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: "20px",
    color: "#333",
    fontSize: "24px",
    fontWeight: "bold",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fff",
  },
  tableHeaderRow: {
    backgroundColor: "#007bff",
    color: "#fff",
  },
  headerCell: {
    padding: "10px",
    textAlign: "left",
    fontWeight: "bold",
    borderBottom: "1px solid #ddd",
  },
  tableRow: {
    textAlign: "left",
    backgroundColor: "#fff",
  },
  cell: {
    padding: "10px",
    borderBottom: "1px solid #ddd",
    color: "#333", // Ensure text color is visible
  },
  dropdownCell: {
    backgroundColor: "#f9f9f9",
    padding: "10px",
    borderBottom: "1px solid #ddd",
  },
  button: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "5px",
    cursor: "pointer",
    marginRight: "10px",
  },
  addButton: {
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  uploadLabel: {
    display: "block",
    marginTop: "10px",
    fontWeight: "bold",
    color: "#333",
  },
  uploadInput: {
    display: "block",
    marginTop: "5px",
    padding: "5px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    backgroundColor: "#fff",
    color: "#333",
  },
  noSegmentsContainer: {
    textAlign: "center",
    padding: "20px",
    backgroundColor: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "10px",
    color: "#333",
  },
  form: {
    padding: "20px",
    fontFamily: "'Arial', sans-serif",
  },
  formHeader: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px",
    color: "#333",
  },
  label: {
    display: "block",
    marginBottom: "10px",
    fontWeight: "bold",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "8px",
    marginBottom: "10px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    color: "#333",
    backgroundColor: "#fff",
    fontSize: "14px",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    height: "80px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    resize: "none",
    color: "#333",
    backgroundColor: "#fff",
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "10px",
  },
  submitButton: {
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  cancelButton: {
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  innerTable: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fefefe",
  },
  loading: {
    textAlign: "center",
    color: "#007bff",
    fontSize: "18px",
    fontWeight: "bold",
  },
  error: {
    textAlign: "center",
    color: "red",
    fontSize: "18px",
    fontWeight: "bold",
  },
  pipContainer: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "600px",
    maxWidth: "90%",
    backgroundColor: "#fff",
    borderRadius: "10px",
    boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.2)",
    zIndex: 1000,
    padding: "20px",
    fontFamily: "'Arial', sans-serif",
  },
  pipHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    fontSize: "20px",
    fontWeight: "bold",
    color: "#333",
  },
  pipContent: {
    maxHeight: "70vh",
    overflowY: "auto",
  },
  pipCloseButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#333",
  },
};



export default ProjectsList;
