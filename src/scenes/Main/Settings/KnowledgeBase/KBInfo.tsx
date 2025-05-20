import React from 'react';
import { Box, Typography, Card, CardContent, Chip, Stack, Divider, IconButton, Switch, Tooltip, ChipProps } from "@mui/material";
import { FormattedMessage, useIntl, IntlShape } from "react-intl";
import { IKnowledgeBase } from "@/../../types/KnowledgeBase/KnowledgeBase";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";

interface KBInfoProps {
  knowledgeBase: IKnowledgeBase;
  isLoading: boolean;
  onToggleEnabled: (enabled: boolean) => Promise<void>;
  onReinitialize: () => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
  getEmbeddingEngineName: (engineId: string) => string;
  getKbSourceIconAndLabel: (db: IKnowledgeBase) => { icon: React.JSX.Element; label: string; color: ChipProps['color'] };
}

const KBInfo: React.FC<KBInfoProps> = ({
  knowledgeBase,
  isLoading,
  onToggleEnabled,
  onReinitialize,
  onEdit,
  onDelete,
  getEmbeddingEngineName,
  getKbSourceIconAndLabel,
}) => {
  const intl: IntlShape = useIntl();

  const renderDetailItem = (labelId: string, defaultValue: string, value?: string | number | null) => (
    <Typography variant="body2" gutterBottom sx={{ display: 'flex' }}>
      <FormattedMessage id={labelId} defaultMessage={defaultValue} />:&nbsp;
      <Typography component="span" fontWeight="bold">{value ?? "-"}</Typography>
    </Typography>
  );

  return (
    <Card sx={{ width: '100%' }} elevation={0}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {knowledgeBase.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
            <Tooltip title={intl.formatMessage({ id: "settings.kb.private.enableKB", defaultMessage: "Enable Knowledge Base" })}>
              <span>
                <Switch
                  checked={knowledgeBase.enabled}
                  onChange={(e) => onToggleEnabled(e.target.checked)}
                  disabled={!knowledgeBase.configured || isLoading}
                  size="small"
                />
              </span>
            </Tooltip>
            <Tooltip title={intl.formatMessage({ id: "settings.kb.private.reinitialize", defaultMessage: "Reinitialize" })}>
              <span>
                <IconButton size="small" color="secondary" onClick={onReinitialize} disabled={isLoading}>
                  <RefreshIcon />
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
              color={knowledgeBase.enabled ? "primary" : "default"}
              label={intl.formatMessage({
                id: knowledgeBase.enabled ? "settings.kb.status.enabled" : "settings.kb.status.disabled",
                defaultMessage: knowledgeBase.enabled ? "Enabled" : "Disabled"
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

        {renderDetailItem("settings.kb.selected.documents", "Documents", knowledgeBase.configured ? knowledgeBase.documents : undefined)}
        {renderDetailItem(
          "settings.kb.selected.size", "Size (KB)",
          knowledgeBase.configured && knowledgeBase.size != null ? (knowledgeBase.size / 1024).toFixed(2) : undefined
        )}
        {renderDetailItem(
          "settings.kb.selected.createdAt", "Created",
          new Date(knowledgeBase.create_at).toLocaleDateString()
        )}

      </CardContent>
    </Card>
  );
};

export default KBInfo;
