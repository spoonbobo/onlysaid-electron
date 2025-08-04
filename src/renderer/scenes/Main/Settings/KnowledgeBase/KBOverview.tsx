import React from 'react';
import {
  Box,
  Typography,
  Divider
} from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { IKnowledgeBase } from '@/../../types/KnowledgeBase/KnowledgeBase';
import { IKBStatus } from './KBExplorer';
import KBInfo from './KBInfo';
import { ChipProps } from '@mui/material';

interface KBOverviewProps {
  knowledgeBase: IKnowledgeBase;
  kbStatus: IKBStatus | null;
  isLoading: boolean;
  isKbStatusLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  getEmbeddingEngineName: (embeddingModel: string) => string;
  getKbSourceIconAndLabel: (db: IKnowledgeBase) => { icon: React.JSX.Element; label: string; color: ChipProps['color'] };
}

export default function KBOverview({
  knowledgeBase,
  kbStatus,
  isLoading,
  isKbStatusLoading,
  onEdit,
  onDelete,
  getEmbeddingEngineName,
  getKbSourceIconAndLabel
}: KBOverviewProps) {
  return (
    <Box>
      {/* Section Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <FormattedMessage id="kb.overview.title" />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage id="kb.overview.description" />
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Knowledge Base Information */}
      <KBInfo
        knowledgeBase={knowledgeBase}
        kbRawStatus={kbStatus}
        isLoading={isLoading}
        isKbStatusLoading={isKbStatusLoading}
        onEdit={onEdit}
        onDelete={onDelete}
        getEmbeddingEngineName={getEmbeddingEngineName}
        getKbSourceIconAndLabel={getKbSourceIconAndLabel}
      />
    </Box>
  );
} 