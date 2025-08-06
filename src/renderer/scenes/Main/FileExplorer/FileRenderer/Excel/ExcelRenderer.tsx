import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Chip,
  Alert
} from '@mui/material';
import {
  GridView as TableIcon,
  TextFields as TextIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { ExcelDocumentData, ExcelWorksheet, ExcelRow, ExcelCell } from './types';
import { worksheetsToText } from './utils';

interface ExcelRendererProps {
  documentData: ExcelDocumentData;
  fontSize?: number;
  maxHeight?: number;
  renderMode?: 'table' | 'text';
  onRenderModeChange?: (mode: 'table' | 'text') => void;
  showDiff?: boolean;
  diff?: any;
  onApplyDiffBlock?: (block: any) => void;
  onDeclineDiffBlock?: (block: any) => void;
}

export default function ExcelRenderer({
  documentData,
  fontSize = 14,
  maxHeight = 600,
  renderMode = 'table',
  onRenderModeChange,
  showDiff = false,
  diff,
  onApplyDiffBlock,
  onDeclineDiffBlock
}: ExcelRendererProps) {
  const [activeWorksheet, setActiveWorksheet] = useState(0);

  const currentWorksheet = documentData.worksheets[activeWorksheet];

  // Convert to text for text mode
  const textContent = useMemo(() => {
    return worksheetsToText(documentData.worksheets);
  }, [documentData.worksheets]);

  // Get all column letters used in the current worksheet
  const columnLetters = useMemo(() => {
    if (!currentWorksheet?.rows) return [];
    
    const allColumns = new Set<string>();
    currentWorksheet.rows.forEach(row => {
      Object.keys(row.cells).forEach(col => allColumns.add(col));
    });
    
    return Array.from(allColumns).sort();
  }, [currentWorksheet]);

  const renderCellValue = (cell: ExcelCell) => {
    if (cell.formula) {
      return `=${cell.formula}`;
    }
    
    if (cell.type === 'number' && typeof cell.value === 'number') {
      return cell.value.toLocaleString();
    }
    
    if (cell.type === 'date' && cell.value instanceof Date) {
      return cell.value.toLocaleDateString();
    }
    
    return String(cell.value || '');
  };

  const getCellStyle = (cell: ExcelCell) => {
    const style: React.CSSProperties = {
      fontSize: `${fontSize}px`,
    };
    
    if (cell.style) {
      if (cell.style.bold) style.fontWeight = 'bold';
      if (cell.style.italic) style.fontStyle = 'italic';
      if (cell.style.underline) style.textDecoration = 'underline';
      if (cell.style.color) style.color = cell.style.color;
      if (cell.style.backgroundColor) style.backgroundColor = cell.style.backgroundColor;
      if (cell.style.alignment) style.textAlign = cell.style.alignment;
      if (cell.style.fontSize) style.fontSize = `${cell.style.fontSize}px`;
      if (cell.style.fontFamily) style.fontFamily = cell.style.fontFamily;
    }
    
    return style;
  };

  if (documentData.worksheets.length === 0) {
    return (
      <Alert severity="info">
        <FormattedMessage 
          id="excel.noWorksheets" 
          defaultMessage="No worksheets found in this Excel file." 
        />
      </Alert>
    );
  }

  if (renderMode === 'text') {
    return (
      <Box>
        {/* Render mode toggle */}
        {onRenderModeChange && (
          <Box mb={2} display="flex" alignItems="center" gap={1}>
            <Tooltip title="Switch to table view">
              <IconButton size="small" onClick={() => onRenderModeChange('table')}>
                <TableIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" color="textSecondary">
              Text Mode
            </Typography>
          </Box>
        )}
        
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            maxHeight, 
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: `${fontSize}px`,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap'
          }}
        >
          {textContent}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with mode toggle and info */}
      <Box mb={2} display="flex" alignItems="center" justifyContent="between" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          {onRenderModeChange && (
            <Tooltip title="Switch to text view">
              <IconButton size="small" onClick={() => onRenderModeChange('text')}>
                <TextIcon />
              </IconButton>
            </Tooltip>
          )}
          {/* Edit mode indicator - no duplicate title needed as copilot already shows it */}
          <Chip 
            label="Edit Mode" 
            size="small" 
            color="warning" 
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: '20px' }}
          />
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          <Chip 
            icon={<InfoIcon />}
            label={`${documentData.worksheets.length} worksheet${documentData.worksheets.length !== 1 ? 's' : ''}`}
            size="small"
            variant="outlined"
          />
          {documentData.metadata.totalCells && (
            <Chip 
              label={`${documentData.metadata.totalCells} cells`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Worksheet tabs */}
      {documentData.worksheets.length > 1 && (
        <Box mb={2}>
          <Tabs 
            value={activeWorksheet} 
            onChange={(_, newValue) => setActiveWorksheet(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {documentData.worksheets.map((worksheet, index) => (
              <Tab 
                key={index}
                label={worksheet.name}
                sx={{ minHeight: 40 }}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Excel table */}
      <TableContainer 
        component={Paper} 
        variant="outlined"
        sx={{ 
          flex: 1,
          maxHeight: 'none',
          '& .MuiTableCell-root': {
            fontSize: `${fontSize}px`,
            padding: '4px 8px',
            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            borderColor: (theme) => theme.palette.divider
          },
          '& .MuiTableCell-head': {
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#f5f5f5',
            fontWeight: 'bold',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          },
          '& .row-header': {
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#f5f5f5',
            fontWeight: 'bold',
            position: 'sticky',
            left: 0,
            zIndex: 1,
            minWidth: '50px',
            textAlign: 'center',
            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
          },
          '& .MuiTableRow-root:hover': {
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          },
          '& .MuiTableRow-root:nth-of-type(odd)': {
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          }
        }}
      >
        <Table size="small" stickyHeader>
          {/* Header row with column letters */}
          <TableHead>
            <TableRow>
              <TableCell className="row-header">#</TableCell>
              {columnLetters.map(col => (
                <TableCell key={col} className="column-header" align="center">
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          
          {/* Data rows */}
          <TableBody>
            {currentWorksheet.rows.map(row => (
              <TableRow 
                key={row.index}
                hover
                sx={{ 
                  '&:nth-of-type(odd)': { 
                    backgroundColor: 'rgba(0, 0, 0, 0.02)' 
                  }
                }}
              >
                {/* Row number */}
                <TableCell className="row-header">
                  {row.index + 1}
                </TableCell>
                
                {/* Cell data */}
                {columnLetters.map(col => {
                  const cell = row.cells[col];
                  return (
                    <TableCell 
                      key={col}
                      sx={cell ? getCellStyle(cell) : {}}
                      title={cell?.formula ? `Formula: =${cell.formula}` : undefined}
                    >
                      {cell ? renderCellValue(cell) : ''}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Worksheet info */}
      {currentWorksheet && (
        <Box mt={2}>
          <Typography variant="caption" color="textSecondary">
            <FormattedMessage 
              id="excel.worksheetInfo" 
              defaultMessage="Worksheet: {name} • {rows} rows • {columns} columns"
              values={{
                name: currentWorksheet.name,
                rows: currentWorksheet.rows.length,
                columns: columnLetters.length
              }}
            />
          </Typography>
        </Box>
      )}
    </Box>
  );
}