// DelayInsightsPanel.js

import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { getDelayStatus } from './delayUtils';

const DelayInsightsPanel = ({ nodes }) => {
  const delays = [];
  const early = [];
  const onTime = [];

  let totalDelayDays = 0;

  nodes.forEach((n) => {
    if (n.data?.isTextOnly) return;

    const delayType = getDelayStatus(
      n.data.startDate,
      n.data.endDate,
      n.data.exp_startdate,
      n.data.exp_enddate
    );

    const phaseName = n.data.label?.split('\n')[0] || 'Unnamed Phase';

    if (delayType.includes("Delay")) {
      const actualEnd = new Date(n.data.endDate);
      const expectedEnd = new Date(n.data.exp_enddate);
      const delayDays = Math.max(0, (actualEnd - expectedEnd) / (1000 * 60 * 60 * 24));
      totalDelayDays += delayDays;

      delays.push({ phaseName, delayType, delayDays: Math.round(delayDays) });
    } else if (delayType === "Faster than expected") {
      early.push({ phaseName });
    } else if (delayType === "On Schedule") {
      onTime.push({ phaseName });
    }
  });

  return (
    <Box p={2}>
      <Typography variant="h6">📊 Delay Insights</Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>
        🧭 Total Project Delay: <b>{Math.round(totalDelayDays)} days</b>
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1">⚠️ Delayed Phases</Typography>
      {delays.length === 0 ? (
        <Typography variant="body2">None</Typography>
      ) : (
        delays.map((item, idx) => (
          <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
            • {item.phaseName} → <b>{item.delayType}</b> (+{item.delayDays}d)
          </Typography>
        ))
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1">🚀 Early Phases</Typography>
      {early.length === 0 ? (
        <Typography variant="body2">None</Typography>
      ) : (
        early.map((item, idx) => (
          <Typography key={idx} variant="body2">• {item.phaseName}</Typography>
        ))
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1">✅ On-Schedule Phases</Typography>
      {onTime.length === 0 ? (
        <Typography variant="body2">None</Typography>
      ) : (
        onTime.map((item, idx) => (
          <Typography key={idx} variant="body2">• {item.phaseName}</Typography>
        ))
      )}
    </Box>
  );
};

export default DelayInsightsPanel;
