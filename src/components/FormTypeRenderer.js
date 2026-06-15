import React from 'react';
import { Box, Typography } from '@mui/material';


export default function FormTypeRenderer({ formType }) {
  return (
    <Box sx={{ padding: 0 }}>
      {formType === 'View Land Deals' && (
        <Typography variant="h4">View Land Deals Coming Soon...</Typography>
      )}
      {formType === 'Inventory Management' && (
        <Typography variant="h4">Inventory Management Coming Soon...</Typography>
      )}
      {!formType && (
        <Typography variant="h4"> Coming Soon...</Typography>
      )}
      
    </Box>
  );
}
