import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { useIntl } from 'react-intl';

export type KBOverallStatus = "disabled" | "initializing" | "running" | "error" | "not_found";

interface StatusBadgeProps {
  status: KBOverallStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const intl = useIntl();

  let color: ChipProps['color'] = 'default';
  let labelId = '';
  let defaultLabel = '';

  switch (status) {
    case 'disabled':
      color = 'default';
      labelId = 'statusBadge.disabled';
      defaultLabel = 'Disabled';
      break;
    case 'initializing':
      color = 'info';
      labelId = 'statusBadge.initializing';
      defaultLabel = 'Initializing';
      break;
    case 'running':
      color = 'success';
      labelId = 'statusBadge.running';
      defaultLabel = 'Running';
      break;
    case 'error':
      color = 'error';
      labelId = 'statusBadge.error';
      defaultLabel = 'Error';
      break;
    case 'not_found':
      color = 'warning';
      labelId = 'statusBadge.notFound';
      defaultLabel = 'Not Found';
      break;
    default:
      return null; // Or some default representation for an unknown status
  }

  return (
    <Chip
      label={intl.formatMessage({ id: labelId, defaultMessage: defaultLabel })}
      color={color}
      size="small"
      sx={{
        ml: 1,
        backgroundColor: 'transparent',
        border: 'none',
        '& .MuiChip-label': {
          color: (theme) => {
            if (color && color !== 'default' && theme.palette[color]) {
              return theme.palette[color].main;
            }
            return theme.palette.text.primary;
          },
        },
      }}
    />
  );
};

export default StatusBadge;
