import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  GridView as TableIcon,
  TextFields as TextIcon,
  Info as InfoIcon,
  Download as ExportIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { ExcelDocumentData, ExcelWorksheet, ExcelRow, ExcelCell } from './types';
import { worksheetsToText } from './utils';

interface ExcelViewRendererProps {
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

export default function ExcelViewRenderer({
  documentData,
  fontSize = 14,
  maxHeight = 600,
  renderMode = 'table',
  onRenderModeChange,
  showDiff = false,
  diff,
  onApplyDiffBlock,
  onDeclineDiffBlock
}: ExcelViewRendererProps) {
  const [activeWorksheet, setActiveWorksheet] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

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

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!currentWorksheet?.rows) return [];
    
    let filteredRows = currentWorksheet.rows;
    
    // Apply search filter
    if (searchTerm) {
      filteredRows = currentWorksheet.rows.filter(row =>
        Object.values(row.cells).some(cell => {
          const searchableValue = cell.formula || String(cell.value || '');
          return searchableValue.toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }
    
    // Apply sorting
    if (sortColumn) {
      filteredRows = [...filteredRows].sort((a, b) => {
        const aCell = a.cells[sortColumn];
        const bCell = b.cells[sortColumn];
        
        const aValue = aCell?.value || '';
        const bValue = bCell?.value || '';
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        const aStr = String(aValue);
        const bStr = String(bValue);
        
        return sortDirection === 'asc' 
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }
    
    return filteredRows;
  }, [currentWorksheet, searchTerm, sortColumn, sortDirection]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedData, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page when sorting
  };

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

  const handleExportCSV = () => {
    if (!currentWorksheet) return;
    
    const csvContent = currentWorksheet.rows.map(row => {
      const columnLetters = Object.keys(row.cells).sort();
      return columnLetters.map(col => {
        const cell = row.cells[col];
        if (!cell) return '';
        const value = cell.formula ? `=${cell.formula}` : String(cell.value || '');
        // Escape CSV values that contain commas or quotes
        return value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(',');
    }).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentWorksheet.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        {/* Text mode controls */}
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
            maxHeight: isFullscreen ? '90vh' : maxHeight, 
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
    <Box sx={{ height: isFullscreen ? '90vh' : 'auto' }}>
      {/* Header with enhanced controls */}
      <Box mb={2} display="flex" alignItems="center" justifyContent="between" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          {onRenderModeChange && (
            <Tooltip title="Switch to text view">
              <IconButton size="small" onClick={() => onRenderModeChange('text')}>
                <TextIcon />
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="h6" component="h3">
            {documentData.metadata.title}
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={1} alignItems="center">
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
          
          <Tooltip title="Export as CSV">
            <IconButton size="small" onClick={handleExportCSV} disabled={!currentWorksheet}>
              <ExportIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen view"}>
            <IconButton size="small" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
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

      {/* Advanced controls */}
      {showAdvancedFeatures && (
        <Box mb={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search in cells..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Rows per page</InputLabel>
            <Select
              value={rowsPerPage}
              label="Rows per page"
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="body2" color="textSecondary">
            {filteredAndSortedData.length} rows total
          </Typography>
        </Box>
      )}

      {/* Enhanced Table */}
      <TableContainer 
        component={Paper} 
        variant="outlined"
        sx={{ 
          maxHeight: isFullscreen ? 'calc(90vh - 300px)' : maxHeight,
          '& .MuiTableCell-root': {
            fontSize: `${fontSize}px`,
            padding: '4px 8px',
            borderRight: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
          },
          '& .MuiTableCell-head': {
            backgroundColor: '#f5f5f5',
            fontWeight: 'bold',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: '#e8e8e8'
            }
          },
          '& .row-header': {
            backgroundColor: '#f5f5f5',
            fontWeight: 'bold',
            position: 'sticky',
            left: 0,
            zIndex: 1,
            minWidth: '50px',
            textAlign: 'center',
          },
          '& .MuiTableRow-root:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          '& .MuiTableRow-root:nth-of-type(odd)': {
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
          }
        }}
      >
        <Table size="small" stickyHeader>
          {/* Header row with sortable column letters */}
          <TableHead>
            <TableRow>
              <TableCell className="row-header">#</TableCell>
              {columnLetters.map(col => (
                <TableCell 
                  key={col} 
                  className="column-header" 
                  align="center"
                  onClick={() => handleSort(col)}
                  sx={{
                    userSelect: 'none',
                    '&:hover': {
                      backgroundColor: '#e0e0e0'
                    }
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                    {col}
                    {sortColumn === col && (
                      <SortIcon 
                        fontSize="small" 
                        sx={{ 
                          transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s'
                        }} 
                      />
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          
          {/* Data rows */}
          <TableBody>
            {paginatedData.map(row => (
              <TableRow 
                key={row.index}
                hover
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Box mt={2} display="flex" justifyContent="center" alignItems="center" gap={2}>
          <Typography variant="body2" color="textSecondary">
            Page {page} of {totalPages}
          </Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            size="small"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Advanced features toggle */}
      <Box mt={1} display="flex" justifyContent="center">
        <Button
          size="small"
          variant="text"
          onClick={() => setShowAdvancedFeatures(!showAdvancedFeatures)}
          startIcon={showAdvancedFeatures ? <FilterIcon /> : <SearchIcon />}
          sx={{ fontSize: '0.75rem' }}
        >
          {showAdvancedFeatures ? 'Hide Advanced Tools' : 'Show Advanced Tools'}
        </Button>
      </Box>

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