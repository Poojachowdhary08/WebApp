import React, { useState } from 'react';

// Simple Dialog component (Modal)
const Dialog = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>Dialog Box</h2>
        <p>This is a dialog box inside a try block</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

// Styles for modal and overlay (just for this example)
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const modalStyle = {
  padding: '20px',
  backgroundColor: 'white',
  borderRadius: '5px',
  boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.3)',
};

// Main Component
const DialogBox = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  return (
    <div>
      <Dialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </div>
  );
};

export default DialogBox;
