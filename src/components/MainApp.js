import React, { useState } from 'react';
import { Box } from '@mui/material'; 
import AppSearchbar from './AppSearchbar';
export default function MainApp() {
  const [formType, setFormType] = useState('');
  const [searchValue, setSearchValue] = useState('');

  return (
    <Box>
      {/* AppBar */}
      <AppSearchbar formType={formType} setFormType={setFormType} />
    </Box>
  );
}
