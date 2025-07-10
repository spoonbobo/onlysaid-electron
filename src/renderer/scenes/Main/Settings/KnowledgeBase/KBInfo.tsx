import React from 'react';
import { Box, Typography, Card, CardContent, Chip, Stack, Divider, IconButton, Tooltip, ChipProps } from "@mui/material";
import { FormattedMessage, useIntl, IntlShape } from "react-intl";
import { IKnowledgeBase } from "@/../../types/KnowledgeBase/KnowledgeBase";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";  // ✅ UPDATED: Changed to more appropriate icon
import StatusBadge, { KBOverallStatus } from '@/renderer/components/Badge/StatusBadge';
import { IKBStatus } from "./KBExplorer";

interface KBInfoProps {
  knowledgeBase: IKnowledgeBase;
  kbRawStatus: IKBStatus | null;
  isLoading: boolean;
  isKbStatusLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  getEmbeddingEngineName: (engineId: string) => string;
  getKbSourceIconAndLabel: (db: IKnowledgeBase) => { icon: React.JSX.Element; label: string; color: ChipProps['color'] };
}

const KBInfo: React.FC<KBInfoProps> = ({
  knowledgeBase,
  kbRawStatus,
  isLoading,
  isKbStatusLoading,
  onEdit,
  onDelete,
  getEmbeddingEngineName,
  getKbSourceIconAndLabel,
}) => {
  const intl: IntlShape = useIntl();

  // ✅ UPDATED: Renamed handler to be more descriptive
  const handleManageKB = async () => {
    try {
      const kbUrl = await window.electron.knowledgeBase.getUrl();
      await window.electron.shell.openExternal(kbUrl);
    } catch (error) {
      console.error('Failed to open KB management website:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString(intl.locale, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const renderDetailItem = (labelId: string, defaultValue: string, value?: string | number | null) => (
    <Typography variant="body2" gutterBottom sx={{ display: 'flex' }}>
      <FormattedMessage id={labelId} defaultMessage={defaultValue} />:&nbsp;
      <Typography component="span" fontWeight="bold">{value ?? "-"}</Typography>
    </Typography>
  );

  const determineOverallStatus = (): KBOverallStatus | null => {
    if (!knowledgeBase.configured) return null;

    if (isKbStatusLoading) {
      return 'initializing';
    }

    // Temporarily removed: if (!kbRawStatus) return 'not_found';

    if (kbRawStatus && kbRawStatus.syncState) {
      switch (kbRawStatus.syncState) {
        case 'syncing':
          return 'initializing';
        case 'synced':
          return 'running';
        case 'error':
          return 'error';
        case 'pending':
          return 'initializing';
      }
    }

    if (kbRawStatus && kbRawStatus.status) {
      const statusValue = kbRawStatus.status.toLowerCase();
      switch (statusValue) {
        case 'running':
        case 'synced':
          return 'running';
        case 'syncing':
        case 'initializing':
        case 'pending':
          return 'initializing';
        case 'error':
          return 'error';
      }
    }

    if (kbRawStatus && kbRawStatus.errorDetails) {
      return 'error';
    }

    // Return null instead of 'not_found' when no status is available
    return null;
  };

  const overallStatus = determineOverallStatus();

  return (
    <Card sx={{ width: '100%' }} elevation={0}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              {knowledgeBase.name}
            </Typography>
            {overallStatus && <StatusBadge status={overallStatus} />}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
            {/* ✅ UPDATED: Changed to "manage" with appropriate icon */}
            <Tooltip title={intl.formatMessage({ id: "settings.kb.private.manage", defaultMessage: "Manage" })}>
              <span>
                <IconButton size="small" color="secondary" onClick={handleManageKB} disabled={isLoading}>
                  <ManageAccountsIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={intl.formatMessage({ id: "settings.kb.private.edit", defaultMessage: "Edit" })}>
              <span>
                <IconButton size="small" color="primary" onClick={onEdit} disabled={isLoading}>
                  <EditIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={intl.formatMessage({ id: "settings.kb.private.delete", defaultMessage: "Delete" })}>
              <span>
                <IconButton size="small" color="error" onClick={onDelete} disabled={isLoading}>
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {knowledgeBase.description || intl.formatMessage({ id: "settings.kb.selected.noDescription", defaultMessage: "No description provided." })}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            color={knowledgeBase.configured ? "success" : "warning"}
            label={intl.formatMessage({
              id: knowledgeBase.configured ? "settings.kb.status.configured" : "settings.kb.status.notConfigured",
              defaultMessage: knowledgeBase.configured ? "Configured" : "Not Configured"
            })}
          />
          {knowledgeBase.configured && (
            <Chip
              size="small"
              color="primary"
              label={intl.formatMessage({
                id: "settings.kb.status.enabled",
                defaultMessage: "Enabled"
              })}
            />
          )}
          <Chip
            size="small"
            icon={getKbSourceIconAndLabel(knowledgeBase).icon}
            label={getKbSourceIconAndLabel(knowledgeBase).label}
            color={getKbSourceIconAndLabel(knowledgeBase).color}
          />
          {knowledgeBase.embedding_engine && (
            <Chip
              size="small"
              variant="outlined"
              label={getEmbeddingEngineName(knowledgeBase.embedding_engine)}
              title={intl.formatMessage({ id: "settings.kb.embeddingEngineUsed", defaultMessage: "Embedding Engine" })}
            />
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {renderDetailItem(
          "settings.kb.selected.createdAt", "Created",
          formatDate(knowledgeBase.create_at)
        )}
        {renderDetailItem(
          "settings.kb.selected.updatedAt", "Last Updated",
          formatDate(knowledgeBase.update_at)
        )}

      </CardContent>
    </Card>
  );
};

export default KBInfo;

