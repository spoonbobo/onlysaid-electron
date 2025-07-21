import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Paper,
  Alert,
  Stack,
  TextField,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Slider,
  Checkbox,
} from "@mui/material";
import {
  PlayArrow as PlayArrowIcon,
  Search as SearchIcon,
  QuestionAnswer as QuestionAnswerIcon,
} from "@mui/icons-material";
import { useKBStore } from "@/renderer/stores/KB/KBStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { useKBSettingsStore } from "@/renderer/stores/KB/KBSettingStore";
import { toast } from "@/utils/toast";

interface KBDebugProps {}

const KBDebug: React.FC<KBDebugProps> = () => {
  const [testQuery, setTestQuery] = useState<string>("");
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestLoading, setIsTestLoading] = useState<boolean>(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState<"query" | "retrieve">("query");
  const [useNonStreaming, setUseNonStreaming] = useState<boolean>(true);
  const [topK, setTopK] = useState<number>(5);
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [availableKBs, setAvailableKBs] = useState<any[]>([]);

  const { workspaces } = useWorkspaceStore();
  const { getKnowledgeBaseDetailsList } = useKBStore();
  const { selectedKbIds, setSelectedKBs: setGlobalSelectedKBs } = useKBSettingsStore();

  useEffect(() => {
    const loadAvailableKBs = async () => {
      if (selectedWorkspace) {
        try {
          const workspace = workspaces.find(w => w.id === selectedWorkspace);
          toast.info(`Loading Knowledge Bases for ${workspace?.name || 'workspace'}...`);
          
          const kbs = await getKnowledgeBaseDetailsList(selectedWorkspace);
          const validKBs = kbs || [];
          setAvailableKBs(validKBs);
          
          if (validKBs.length === 0) {
            toast.warning("No Knowledge Bases found in this workspace");
          } else {
            toast.success(`Found ${validKBs.length} Knowledge Base(s)`);
          }
          
          // Initialize with currently selected KBs from settings store
          if (validKBs.length > 0) {
            const validSelectedKBs = selectedKbIds.filter(id => 
              validKBs.some(kb => kb.id === id)
            );
            if (validSelectedKBs.length > 0) {
              setSelectedKBs(validSelectedKBs);
              toast.info(`Using ${validSelectedKBs.length} KB(s) from global settings`);
            } else {
              // If no valid selected KBs, select all available
              setSelectedKBs(validKBs.map(kb => kb.id));
              toast.info(`Auto-selected all ${validKBs.length} available KB(s)`);
            }
          }
        } catch (error: any) {
          console.error('Failed to load KBs for testing:', error);
          setAvailableKBs([]);
          setSelectedKBs([]);
          toast.error(`Failed to load Knowledge Bases: ${error.message}`);
        }
      } else {
        setAvailableKBs([]);
        setSelectedKBs([]);
      }
    };
    
    loadAvailableKBs();
  }, [selectedWorkspace, selectedKbIds]);

  // Initialize with first workspace if available
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspace]);

  const handleTestKB = async () => {
    if (!testQuery.trim()) {
      setTestError("Please provide a query");
      toast.error("Please enter a test query");
      return;
    }
    
    if (!selectedWorkspace) {
      setTestError("Please select a workspace");
      toast.error("Please select a workspace");
      return;
    }

    if (selectedKBs.length === 0) {
      setTestError("Please select at least one Knowledge Base");
      toast.error("Please select at least one Knowledge Base");
      return;
    }

    setIsTestLoading(true);
    setTestError(null);
    setTestResults(null);

    const startTime = Date.now();
    toast.info(`Starting ${testMode} test...`);

    try {
      let result;
      
      if (testMode === "query") {
        if (useNonStreaming) {
          // Test non-streaming query
          result = await window.electron.knowledgeBase.queryNonStreaming({
            workspaceId: selectedWorkspace,
            queryText: testQuery,
            kbIds: selectedKBs.length > 0 ? selectedKBs : undefined,
            topK,
            preferredLanguage: "en",
          });
        } else {
          setTestError("Streaming mode testing not implemented in playground");
          toast.error("Streaming mode testing not implemented in playground");
          return;
        }
      } else {
        // Test document retrieval
        result = await window.electron.knowledgeBase.retrieve({
          workspaceId: selectedWorkspace,
          queryText: testQuery,
          kbIds: selectedKBs.length > 0 ? selectedKBs : undefined,
          topK,
        });
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (result && result.status === "success") {
        setTestResults(result);
        
        if (testMode === "query") {
          toast.success(`Query completed in ${duration}s`);
        } else {
          const docCount = result.results?.length || 0;
          toast.success(`Retrieved ${docCount} document(s) in ${duration}s`);
        }
      } else {
        throw new Error(result?.message || "Unknown error occurred");
      }
      
    } catch (error: any) {
      console.error('Test failed:', error);
      const errorMessage = error.message || "Test failed";
      setTestError(errorMessage);
      toast.error(`Test failed: ${errorMessage}`);
    } finally {
      setIsTestLoading(false);
    }
  };

  // Add helper functions for KB selection
  const handleKBToggle = (kbId: string) => {
    setSelectedKBs(prev => {
      const kb = availableKBs.find(k => k.id === kbId);
      const kbName = kb?.name || kbId;
      
      if (prev.includes(kbId)) {
        toast.info(`Deselected: ${kbName}`);
        return prev.filter(id => id !== kbId);
      } else {
        toast.info(`Selected: ${kbName}`);
        return [...prev, kbId];
      }
    });
  };

  const handleSelectAllKBs = () => {
    if (selectedKBs.length === availableKBs.length) {
      setSelectedKBs([]);
      toast.info("Deselected all Knowledge Bases");
    } else {
      setSelectedKBs(availableKBs.map(kb => kb.id));
      toast.info(`Selected all ${availableKBs.length} Knowledge Bases`);
    }
  };

  const handleSyncWithGlobalSettings = () => {
    setGlobalSelectedKBs(selectedKBs);
    toast.success("KB selection synced with global settings");
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1, color: 'primary.main' }}>
        🧠 Knowledge Base Testing
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Test your Knowledge Base queries and document retrieval
      </Typography>

      <Stack spacing={3}>
        {/* Workspace Selection */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Workspace Selection</Typography>
          <FormControl fullWidth size="small">
            <Typography variant="body2" sx={{ mb: 1 }}>Workspace</Typography>
            <Select
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>Select workspace...</MenuItem>
              {workspaces.map((workspace) => (
                <MenuItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {selectedWorkspace && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Available KBs: {availableKBs.length}
            </Typography>
          )}
        </Paper>

        {/* Knowledge Base Selection */}
        {availableKBs.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Knowledge Base Selection</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSelectAllKBs}
                >
                  {selectedKBs.length === availableKBs.length ? "Deselect All" : "Select All"}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSyncWithGlobalSettings}
                  disabled={selectedKBs.length === 0}
                >
                  Sync to Global
                </Button>
              </Stack>
            </Stack>
            
            <Stack spacing={1} sx={{ maxHeight: 200, overflow: 'auto' }}>
              {availableKBs.map((kb) => (
                <FormControlLabel
                  key={kb.id}
                  control={
                    <Checkbox
                      checked={selectedKBs.includes(kb.id)}
                      onChange={() => handleKBToggle(kb.id)}
                    />
                  }
                  label={
                    <Stack>
                      <Typography variant="body2" fontWeight="500">
                        {kb.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {kb.description || "No description"}
                      </Typography>
                    </Stack>
                  }
                />
              ))}
            </Stack>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Selected: {selectedKBs.length} / {availableKBs.length} KBs
            </Typography>
          </Paper>
        )}

        {/* Test Mode Tabs */}
        <Tabs value={testMode} onChange={(_, value) => setTestMode(value)}>
          <Tab 
            value="query" 
            label="Query (with generation)" 
            icon={<QuestionAnswerIcon />} 
          />
          <Tab 
            value="retrieve" 
            label="Retrieve (documents only)" 
            icon={<SearchIcon />} 
          />
        </Tabs>

        {/* Configuration */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Configuration</Typography>
          <Stack spacing={2}>
            {testMode === "query" && (
              <FormControlLabel
                control={
                  <Switch
                    checked={useNonStreaming}
                    onChange={(e) => setUseNonStreaming(e.target.checked)}
                  />
                }
                label="Use Non-Streaming Mode"
              />
            )}
            
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Top K Results: {topK}
              </Typography>
              <Slider
                value={topK}
                onChange={(_, value) => setTopK(value as number)}
                min={1}
                max={20}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                <strong>Workspace:</strong> {workspaces.find(w => w.id === selectedWorkspace)?.name || "None selected"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Selected KBs:</strong> {selectedKBs.length > 0 ? `${selectedKBs.length} selected` : "None selected"}
              </Typography>
              {selectedKBs.length > 0 && selectedKBs.length <= 3 && (
                <Typography variant="caption" color="text.secondary">
                  {selectedKBs.map(id => availableKBs.find(kb => kb.id === id)?.name).filter(Boolean).join(", ")}
                </Typography>
              )}
            </Stack>
          </Stack>
        </Paper>

        {/* Query Input */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Test Query"
          placeholder="Enter your question or search query..."
          value={testQuery}
          onChange={(e) => setTestQuery(e.target.value)}
          variant="outlined"
        />

        {/* Test Button */}
        <Button
          variant="contained"
          onClick={handleTestKB}
          disabled={isTestLoading || !testQuery.trim() || !selectedWorkspace || selectedKBs.length === 0}
          startIcon={isTestLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          size="large"
        >
          {isTestLoading ? "Testing..." : `Test ${testMode === "query" ? "Query" : "Retrieval"}`}
        </Button>

        {/* Status Messages */}
        {!selectedWorkspace && (
          <Alert severity="warning">
            Please select a workspace to continue
          </Alert>
        )}
        
        {selectedWorkspace && availableKBs.length === 0 && (
          <Alert severity="info">
            No Knowledge Bases found in this workspace. Create some KBs first.
          </Alert>
        )}
        
        {selectedWorkspace && availableKBs.length > 0 && selectedKBs.length === 0 && (
          <Alert severity="warning">
            Please select at least one Knowledge Base to test
          </Alert>
        )}

        {/* Error Display */}
        {testError && (
          <Alert severity="error">
            <Typography variant="subtitle2">Test Failed</Typography>
            <Typography variant="body2">{testError}</Typography>
          </Alert>
        )}

        {/* Results Display */}
        {testResults && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Test Results
            </Typography>
            
            {testMode === "query" ? (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="primary" fontWeight="600">
                    Generated Answer:
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    {testResults.results || "No answer generated"}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Status: {testResults.status}
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography variant="body2" color="primary" fontWeight="600">
                  Retrieved Documents ({testResults.results?.length || 0}):
                </Typography>
                {testResults.results?.map((doc: any, index: number) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2" fontWeight="600">
                          Document {index + 1}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Source: {doc.source || 'Unknown'}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        bgcolor: 'background.default', 
                        p: 1, 
                        borderRadius: 1,
                        maxHeight: 100,
                        overflow: 'auto'
                      }}>
                        {doc.text || 'No content'}
                      </Typography>
                      {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Metadata: {JSON.stringify(doc.metadata)}
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                ))}
                <Typography variant="caption" color="text.secondary">
                  Status: {testResults.status}
                </Typography>
              </Stack>
            )}
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default KBDebug;
