import React from 'react';
import { Box } from '@mui/material';
import Employee_Table from './Employee_Table';

const EmployeeTab = () => {
  return (
    <Box sx={{ 
      width: '100%', 
      height: 'calc(100vh - 200px)',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Employee_Table />
    </Box>
  );
};

export default EmployeeTab;
