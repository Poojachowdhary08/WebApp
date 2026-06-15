import React from 'react';
import { Box, Typography } from '@mui/material';

export default function ComingSoonPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 4,
        bgcolor: '#f5f5f5',
        borderRadius: '16px',
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
        textAlign: 'center',
      }}
    >
      <Typography variant="h2" gutterBottom>
        For Avenue Realty Employees Only
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        This feature is currently under development and will be available soon to every user.
      </Typography>

      {/* Image placeholder */}
      <Box
        component="img"
        // src="http://clipart-library.com/images_k/coming-soon-transparent/coming-soon-transparent-17.png"   // // coming soon.png
        src = "https://www.psdstamps.com/wp-content/uploads/2020/03/restricted-access-stamp-png.png"  //restricted access.png
        alt="Coming Soon"
        sx={{ width: '40%', borderRadius: '12px', mb: 4 }}
      />

      {/* <Button variant="contained" color="primary">
        Notify Me When Available
      </Button> */}
    </Box>
  );
}
