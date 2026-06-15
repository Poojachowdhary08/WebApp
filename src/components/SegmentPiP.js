import React from "react";

const SegmentPIP = ({ title, children, onClose }) => {
  return (
    <div style={styles.pip}>
      <div style={styles.pipHeader}>
        <span style={styles.pipTitle}>{title}</span>
        <button style={styles.pipClose} onClick={onClose}>
          &times;
        </button>
      </div>
      <div style={styles.pipContent}>{children}</div>
    </div>
  );
};

const styles = {
  pip: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "400px",
    maxHeight: "80vh",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
    zIndex: 1000,
    overflow: "hidden",
  },
  pipHeader: {
    padding: "10px 15px",
    backgroundColor: "#007bff",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pipTitle: {
    fontSize: "18px",
    fontWeight: "bold",
  },
  pipClose: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "18px",
    cursor: "pointer",
  },
  pipContent: {
    padding: "15px",
    overflowY: "auto",
  },
};

export default SegmentPIP;
