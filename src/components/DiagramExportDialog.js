import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function DiagramExportDialog({ open, onClose, refElement }) {
  const [loading, setLoading] = React.useState(false);

  const handleExport = async (format = "png") => {
    const container = refElement?.current?.querySelector(".react-flow");

    if (!container) {
      alert("❌ Could not find the diagram container.");
      return;
    }

    setLoading(true);

    // Save original height and scroll position
    const originalHeight = container.style.height;
    const originalScrollTop = container.scrollTop;

    // Expand container for full scroll height
    container.style.height = `${container.scrollHeight}px`;
    container.scrollTop = 0;

    // Wait for layout to settle
    await new Promise((res) => setTimeout(res, 300));

    try {
      const canvas = await html2canvas(container, {
        backgroundColor: "#ffffff",
        useCORS: true,
        scale: 2,
      });

      const image = canvas.toDataURL("image/png");

      if (format === "png") {
        const link = document.createElement("a");
        link.href = image;
        link.download = "workflow-diagram.png";
        link.click();
      } else if (format === "pdf") {
        const pdf = new jsPDF("landscape", "pt", "a4");
        const imgProps = pdf.getImageProperties(image);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(image, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save("workflow-diagram.pdf");
      }
    } catch (err) {
      console.error("❌ Export error:", err);
      alert("Failed to export the diagram.");
    } finally {
      // Restore original layout
      container.style.height = originalHeight;
      container.scrollTop = originalScrollTop;
      setLoading(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>⬇ Export Workflow Diagram</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <CircularProgress />
            <div style={{ marginTop: 10 }}>Exporting…</div>
          </div>
        ) : (
          <>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mb: 2 }}
              onClick={() => handleExport("png")}
            >
              Export as PNG 🖼️
            </Button>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={() => handleExport("pdf")}
            >
              Export as PDF 🧾
            </Button>
          </>
        )}
      </DialogContent>
      {!loading && (
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}