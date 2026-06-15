import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Export the currently rendered full diagram including edges.
 * @param {Object} reactFlowInstance - result of useReactFlow()
 * @param {'png'|'pdf'} format - export format
 */
export const exportReactFlowDiagram = async (reactFlowInstance, format = 'png') => {
  if (!reactFlowInstance) {
    console.error("❌ Missing reactFlowInstance");
    return;
  }

  const viewport = document.querySelector('.react-flow__viewport');

  if (!viewport) {
    console.error("❌ .react-flow__viewport not found");
    return;
  }

  const originalViewport = reactFlowInstance.getViewport(); // { x, y, zoom }

  // Step 1: Zoom out to fit all nodes
  await reactFlowInstance.fitView({ padding: 0.2 });

  // Step 2: Wait for render
  await new Promise((resolve) => requestAnimationFrame(resolve));

  // Step 3: Take snapshot
  toPng(viewport, { backgroundColor: '#ffffff' })
    .then((dataUrl) => {
      if (format === 'pdf') {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
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
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'workflow-diagram.png';
        a.click();
      }

      // Step 4: Restore original viewport
      reactFlowInstance.setViewport(originalViewport);
    })
    .catch((err) => {
      console.error("❌ Failed to export:", err);
      reactFlowInstance.setViewport(originalViewport);
    });
};