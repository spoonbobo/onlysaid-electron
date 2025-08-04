import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  useTheme,
  alpha
} from '@mui/material';
import {
  Dashboard as OverviewIcon,
  Description as DocumentsIcon,
  Settings as SettingsIcon,
  Group as MembersIcon
} from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';

export type KBNavigationTab = 'overview' | 'documents' | 'settings' | 'members';

interface KBNavigationBarProps {
  activeTab: KBNavigationTab;
  onTabChange: (tab: KBNavigationTab) => void;
  knowledgeBaseName?: string;
  disabled?: boolean;
}

const navigationTabs = [
  {
    id: 'overview' as const,
    labelId: 'kb.nav.overview',
    icon: <OverviewIcon />,
    defaultLabel: 'Overview'
  },
  {
    id: 'documents' as const,
    labelId: 'kb.nav.documents',
    icon: <DocumentsIcon />,
    defaultLabel: 'Documents'
  },
  {
    id: 'settings' as const,
    labelId: 'kb.nav.settings',
    icon: <SettingsIcon />,
    defaultLabel: 'Settings'
  },
  {
    id: 'members' as const,
    labelId: 'kb.nav.members',
    icon: <MembersIcon />,
    defaultLabel: 'Members'
  }
];

export default function KBNavigationBar({ 
  activeTab, 
  onTabChange, 
  knowledgeBaseName,
  disabled = false 
}: KBNavigationBarProps) {
  const theme = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: KBNavigationTab) => {
    if (!disabled) {
      onTabChange(newValue);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        mb: 2
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        {/* Knowledge Base Title */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            <FormattedMessage id="settings.kb.title" defaultMessage="Knowledge Base" />
          </Typography>
          {knowledgeBaseName && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {knowledgeBaseName}
            </Typography>
          )}
        </Box>

        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9rem',
              minWidth: 120,
              mx: 0.5,
              opacity: disabled ? 0.5 : 1,
              pointerEvents: disabled ? 'none' : 'auto',
              '&.Mui-selected': {
                fontWeight: 600,
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '1.5px 1.5px 0 0',
            },
          }}
        >
          {navigationTabs.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              icon={tab.icon}
              iconPosition="start"
              label={
                <FormattedMessage 
                  id={tab.labelId} 
                  defaultMessage={tab.defaultLabel} 
                />
              }
              sx={{
                gap: 1,
                '& .MuiTab-iconWrapper': {
                  fontSize: '1.2rem',
                },
              }}
            />
          ))}
        </Tabs>
      </Box>
    </Paper>
  );
} 