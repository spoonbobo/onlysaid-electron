import { Box, Typography, Button, Chip, Link } from "@mui/material";
import { IChatMessageToolCall } from "@/../../types/Chat/Message";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { memo, useCallback, useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useLLMStore, IToolLog } from "@/renderer/stores/LLM/LLMStore";
import ToolLogDialog from "@/renderer/components/Dialog/MCP/ToolLog";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useMCPClientStore } from "@/renderer/stores/MCP/MCPClient";
import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";
import ToolResultDialog from "@/renderer/components/Dialog/MCP/ToolResult";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { toast } from "@/utils/toast";
import { extractUrls, formatUrlForDisplay, extractDomain } from "@/utils/url";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useStreamStore } from "@/renderer/stores/Stream/StreamStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { HumanInteractionResponse } from "@/service/langchain/human_in_the_loop/renderer/human_in_the_loop";

interface ToolDisplayProps {
  toolCalls: IChatMessageToolCall[];
  chatId: string;
  messageId: string;
}

const ToolDisplay = memo(({ toolCalls, chatId, messageId }: ToolDisplayProps) => {
  const intl = useIntl();
  const { updateToolCallStatus, updateToolCallResult, getLogsForToolCall, addLogForToolCall } = useLLMStore();
  const refreshMessage = useChatStore(state => state.refreshMessage);
  const { executeTool } = useMCPClientStore.getState();
  const { getAllConfiguredServers, getServerAutoApproved } = useMCPStore.getState();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedLogContent, setSelectedLogContent] = useState<IToolLog[]>([]);
  const [selectedToolName, setSelectedToolName] = useState<string | undefined>(undefined);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [executingToolIds, setExecutingToolIds] = useState<Set<string>>(new Set());
  const [executionStartTimes, setExecutionStartTimes] = useState<Map<string, number>>(new Map());
  const [executionDurations, setExecutionDurations] = useState<Map<string, number>>(new Map());
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedToolCall, setSelectedToolCall] = useState<IChatMessageToolCall | null>(null);
  const [autoApprovedTools, setAutoApprovedTools] = useState<Set<string>>(new Set());
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper function to format MCP name for display
  const formatMCPName = useCallback((key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
      .replace(/Category$/, '')
      .trim();
  }, []);

  const isAgentExecution = useCallback((toolCall: IChatMessageToolCall) => {
    // ✅ Add null/undefined checks
    const functionName = toolCall?.function?.name;
    const mcpServer = toolCall?.mcp_server;
    
    if (!functionName) return false; // ✅ Guard against undefined
    
    const result = mcpServer === 'agent_orchestrator' || 
           functionName.endsWith('_agent_execution');
    
    console.log('[ToolDisplay] 🐛 DEBUG: isAgentExecution check:', {
      toolCallId: toolCall.id,
      functionName: functionName,
      mcpServer: mcpServer,
      isAgentExecution: result
    });
    
    return result;
  }, []);

  const handleExecute = useCallback(async (toolCall: IChatMessageToolCall) => {
    if (!toolCall.mcp_server) {
      console.error('No MCP server specified for tool call:', toolCall.id);
      await addLogForToolCall(toolCall.id, 'Error: No MCP server specified for this tool call.');
      return;
    }

    const serverId = toolCall.mcp_server;
    const allServers = getAllConfiguredServers();

    if (!allServers[serverId]) {
      console.error('Could not find MCP server configuration for:', serverId);
      await addLogForToolCall(toolCall.id, `Error: Could not find MCP server configuration for "${serverId}".`);
      return;
    }

    // Track execution start time
    const startTime = Date.now();
    setExecutionStartTimes(prev => new Map(prev).set(toolCall.id, startTime));
    setExecutingToolIds(prev => new Set(prev).add(toolCall.id));

    try {
      console.log(`Executing tool ${toolCall.function.name} on server ${serverId} with args:`, toolCall.function.arguments);
      await addLogForToolCall(toolCall.id, `Starting execution of tool "${toolCall.function.name}" on server "${serverId}".`);

      const result = await executeTool(
        serverId,
        toolCall.function.name,
        typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments
      );

      if (result.success) {
        console.log(`Tool ${toolCall.function.name} executed successfully:`, result.data);

        // Calculate execution duration
        const endTime = Date.now();
        const duration = Math.floor((endTime - startTime) / 1000);

        await updateToolCallResult(toolCall.id, result.data, duration);
        await addLogForToolCall(toolCall.id, `Tool execution completed successfully in ${duration}s. Result: ${JSON.stringify(result.data, null, 2)}`);
      } else {
        console.error(`Tool ${toolCall.function.name} execution failed:`, result.error);
        await updateToolCallStatus(toolCall.id, 'error');
        await addLogForToolCall(toolCall.id, `Tool execution failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error(`Error executing tool ${toolCall.function.name}:`, error);
      await updateToolCallStatus(toolCall.id, 'error');
      await addLogForToolCall(toolCall.id, `Tool execution error: ${error.message || error}`);
    } finally {
      // Calculate execution duration for local state
      const endTime = Date.now();
      const duration = Math.floor((endTime - startTime) / 1000);
      setExecutionDurations(prev => new Map(prev).set(toolCall.id, duration));

      setExecutingToolIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolCall.id);
        return newSet;
      });
      setExecutionStartTimes(prev => {
        const newMap = new Map(prev);
        newMap.delete(toolCall.id);
        return newMap;
      });
      await refreshMessage(chatId, messageId);
    }
  }, [executeTool, updateToolCallResult, updateToolCallStatus, addLogForToolCall, chatId, messageId, refreshMessage, getAllConfiguredServers]);

  // Auto-approve and auto-execute tool calls when component mounts or tool calls change
  useEffect(() => {
    const checkAndAutoApprove = async () => {
      for (const toolCall of toolCalls) {
        // Only auto-approve if tool is pending and not already auto-approved
        if ((toolCall.status === 'pending' || !toolCall.status) &&
          toolCall.mcp_server &&
          !autoApprovedTools.has(toolCall.id)) {

          const isAutoApproved = getServerAutoApproved(toolCall.mcp_server);

          if (isAutoApproved) {
            console.log(`Auto-approving and executing tool call ${toolCall.id} for server ${toolCall.mcp_server}`);

            // Mark as auto-approved to prevent duplicate processing
            setAutoApprovedTools(prev => new Set(prev).add(toolCall.id));

            // Update tool call status to approved
            await updateToolCallStatus(toolCall.id, 'approved');

            // Show notification to user
            toast.success(
              `Tool "${toolCall.function.name}" auto-approved and executing for ${formatMCPName(toolCall.mcp_server)}`,
            );

            // Refresh the message to show updated status
            await refreshMessage(chatId, messageId);

            // Auto-execute the tool after a brief delay to ensure state is updated
            setTimeout(() => {
              handleExecute(toolCall);
            }, 100);
          }
        }
      }
    };

    checkAndAutoApprove();
  }, [toolCalls, chatId, messageId, getServerAutoApproved, updateToolCallStatus, refreshMessage, formatMCPName, autoApprovedTools, handleExecute]);

  const handleApprove = async (toolCallId: string) => {
    console.log(`🔍 [ToolDisplay-APPROVE] ==================== APPROVE CLICKED ====================`);
    console.log(`🔍 [ToolDisplay-APPROVE] toolCallId: ${toolCallId}`);
    
    try {
      setIsProcessing(true);
      
      const toolCall = toolCalls.find(tc => tc.id === toolCallId);
      console.log(`🔍 [ToolDisplay-APPROVE] Found tool call:`, {
        found: !!toolCall,
        functionName: toolCall?.function?.name,
        mcpServer: toolCall?.mcp_server,
        status: toolCall?.status,
        hasArguments: !!toolCall?.function?.arguments
      });
      
      // ✅ Check if this is a LangGraph tool call
      const agentStore = useAgentStore.getState();
      const { resumeLangGraphWorkflow, pendingHumanInteractions } = agentStore;
      
      const interaction = Object.values(pendingHumanInteractions || {})
        .find(interaction => interaction.request.id === toolCallId);
      
      console.log(`🔍 [ToolDisplay-APPROVE] Interaction check:`, {
        hasInteraction: !!interaction,
        interactionId: interaction?.request?.id,
        threadId: interaction?.request?.threadId,
        requestType: interaction?.request?.type
      });
      
      if (interaction && toolCall) {
        console.log(`🔍 [ToolDisplay-APPROVE] 🔧 LangGraph tool approval - executing and reporting back`);
        
        // ✅ Update status to executing first
        await updateToolCallStatus(toolCallId, 'executing');
        await addLogForToolCall(toolCallId, `User approved tool execution. Starting execution...`);
        await refreshMessage(chatId, messageId);
        
        let toolExecutionResult: any = null;
        let executionSuccess = false;
        let executionError = '';
        
        // ✅ Execute MCP tool if it has an MCP server
        if (toolCall.mcp_server && toolCall.mcp_server !== 'langgraph') {
          console.log(`🔍 [ToolDisplay-APPROVE] Executing MCP tool:`, {
            mcpServer: toolCall.mcp_server,
            toolName: toolCall.function.name,
            argumentsType: typeof toolCall.function.arguments
          });
          
          try {
            const startTime = Date.now();
            
            let toolArgs = {};
            if (typeof toolCall.function.arguments === 'string') {
              try {
                toolArgs = JSON.parse(toolCall.function.arguments);
                console.log(`🔍 [ToolDisplay-APPROVE] Parsed tool arguments:`, toolArgs);
              } catch (parseError) {
                console.error(`🔍 [ToolDisplay-APPROVE] Failed to parse arguments:`, parseError);
                toolArgs = {};
              }
            } else {
              toolArgs = toolCall.function.arguments || {};
            }
            
            console.log(`🔍 [ToolDisplay-APPROVE] Calling executeMCPToolDirectly with:`, {
              serverName: toolCall.mcp_server,
              toolName: toolCall.function.name,
              args: toolArgs
            });
            
            const mcpResult = await executeMCPToolDirectly(
              toolCall.mcp_server,
              toolCall.function.name,
              toolArgs
            );
            
            const executionTime = Math.floor((Date.now() - startTime) / 1000);
            
            console.log(`🔍 [ToolDisplay-APPROVE] MCP execution result:`, {
              success: mcpResult.success,
              hasData: !!mcpResult.data,
              dataType: typeof mcpResult.data,
              error: mcpResult.error,
              executionTime
            });
            
            if (mcpResult.success) {
              toolExecutionResult = mcpResult.data;
              executionSuccess = true;
              
              await updateToolCallStatus(toolCallId, 'executed');
              await updateToolCallResult(toolCallId, mcpResult.data, executionTime);
              await addLogForToolCall(toolCallId, `Tool executed successfully in ${executionTime}s: ${JSON.stringify(mcpResult.data)}`);
              
              console.log(`🔍 [ToolDisplay-APPROVE] ✅ MCP tool executed successfully`);
              console.log(`🔍 [ToolDisplay-APPROVE] Result preview:`, 
                JSON.stringify(mcpResult.data).substring(0, 200) + '...');
            } else {
              executionError = mcpResult.error;
              await updateToolCallStatus(toolCallId, 'error');
              await addLogForToolCall(toolCallId, `Tool execution failed: ${mcpResult.error}`);
              console.error(`🔍 [ToolDisplay-APPROVE] ❌ MCP tool execution failed:`, mcpResult.error);
            }
            
          } catch (error: any) {
            executionError = error.message;
            await updateToolCallStatus(toolCallId, 'error'); 
            await addLogForToolCall(toolCallId, `Tool execution error: ${error.message}`);
            console.error(`🔍 [ToolDisplay-APPROVE] ❌ MCP tool execution error:`, error);
          }
        } else {
          // No MCP execution needed, just mark as approved
          executionSuccess = true;
          await updateToolCallStatus(toolCallId, 'executed');
          await addLogForToolCall(toolCallId, `Tool approved (no MCP execution required)`);
          console.log(`🔍 [ToolDisplay-APPROVE] ✅ Non-MCP tool marked as executed`);
        }
        
        // ✅ Create enhanced response with execution results
        const response: HumanInteractionResponse = {
          id: interaction.request.id,
          approved: true,
          timestamp: Date.now(),
          // ✅ Add execution results to the response
          toolExecutionResult: executionSuccess ? {
            success: true,
            result: toolExecutionResult,
            toolName: toolCall.function.name,
            mcpServer: toolCall.mcp_server
          } : {
            success: false,
            error: executionError,
            toolName: toolCall.function.name,
            mcpServer: toolCall.mcp_server
          }
        };
        
        console.log(`🔍 [ToolDisplay-APPROVE] 🔧 Creating response for LangGraph:`, {
          id: response.id,
          approved: response.approved,
          timestamp: response.timestamp,
          hasToolExecutionResult: !!response.toolExecutionResult,
          toolExecutionSuccess: response.toolExecutionResult?.success,
          toolName: response.toolExecutionResult?.toolName,
          mcpServer: response.toolExecutionResult?.mcpServer,
          hasResult: !!response.toolExecutionResult?.result,
          hasError: !!response.toolExecutionResult?.error
        });
        
        if (response.toolExecutionResult?.result) {
          console.log(`🔍 [ToolDisplay-APPROVE] Tool result being sent to LangGraph:`, 
            JSON.stringify(response.toolExecutionResult.result).substring(0, 300) + '...');
        }
        
        console.log(`🔍 [ToolDisplay-APPROVE] 🔧 Resuming LangGraph workflow with execution results:`, {
          threadId: interaction.request.threadId,
          approved: true,
          hasExecutionResult: !!response.toolExecutionResult
        });
        
        // ✅ Resume workflow with execution results
        const resumeResult = await resumeLangGraphWorkflow(interaction.request.threadId, response);
        
        console.log(`🔍 [ToolDisplay-APPROVE] Resume workflow result:`, {
          success: resumeResult.success,
          completed: resumeResult.completed,
          error: resumeResult.error
        });
        
        if (resumeResult.success && resumeResult.completed && resumeResult.result) {
          await addLogForToolCall(toolCallId, `Workflow completed successfully. Final response handled by Chat component.`);
          toast.success(`Workflow completed successfully!`);
        } else if (resumeResult.success) {
          await addLogForToolCall(toolCallId, `Workflow resumed successfully with execution results.`);
          if (executionSuccess) {
            toast.success(`Tool "${toolCall.function.name}" executed and workflow resumed`);
          } else {
            toast.error(`Tool execution failed but workflow resumed`);
          }
        } else {
          await addLogForToolCall(toolCallId, `Failed to resume workflow: ${resumeResult.error}`);
          toast.error(`Failed to resume workflow: ${resumeResult.error}`);
        }
        
      } else {
        console.log(`🔍 [ToolDisplay-APPROVE] 🔧 Non-LangGraph tool - executing directly`);
        // ... existing non-LangGraph handling ...
      }
      
    } catch (error: any) {
      console.error(`🔍 [ToolDisplay-APPROVE] ❌ Error in handleApprove:`, error);
      // ... existing error handling ...
    } finally {
      setIsProcessing(false);
      await refreshMessage(chatId, messageId);
      console.log(`🔍 [ToolDisplay-APPROVE] ==================== APPROVE COMPLETED ====================`);
    }
  };

  // ✅ Enhanced MCP tool execution with better error handling
  const executeMCPToolDirectly = useCallback(async (
    serverName: string, 
    toolName: string, 
    args: Record<string, any>
  ) => {
    console.log(`[ToolDisplay-MCP] Executing MCP tool directly:`, {
      serverName, toolName, args
    });
    
    try {
      const { executeTool } = useMCPClientStore.getState();
      
      if (!executeTool) {
        throw new Error('MCP client executeTool function not available');
      }
      
      // ✅ Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tool execution timeout after 30 seconds')), 30000);
      });
      
      const executionPromise = executeTool(serverName, toolName, args);
      
      const result = await Promise.race([executionPromise, timeoutPromise]) as any;
      
      console.log(`[ToolDisplay-MCP] Direct execution result:`, result);
      return result;
    } catch (error: any) {
      console.error(`[ToolDisplay-MCP] Direct execution failed:`, error);
      throw error;
    }
  }, []);

  const handleReject = async (toolCallId: string) => {
    console.log(`🔍 [ToolDisplay-DEBUG] ==================== REJECT CLICKED ====================`);
    console.log(`🔍 [ToolDisplay-DEBUG] toolCallId: ${toolCallId}`);
    
    try {
      setIsProcessing(true);
      
      const agentStore = useAgentStore.getState();
      const { resumeLangGraphWorkflow } = agentStore;
      
      const interaction = Object.values(agentStore.pendingHumanInteractions || {})
        .find(interaction => interaction.request.id === toolCallId);
      
      if (!interaction) {
        console.error(`🔍 [ToolDisplay-DEBUG] ❌ No interaction found for toolCallId: ${toolCallId}`);
        toast.error('No interaction found for this tool call');
        return;
      }
      
      const response: HumanInteractionResponse = {
        id: interaction.request.id,
        approved: false,
        timestamp: Date.now()
      };
      
      await updateToolCallStatus(toolCallId, 'rejected');
      await addLogForToolCall(toolCallId, `User rejected tool execution.`);
      
      const resumeResult = await resumeLangGraphWorkflow(interaction.request.threadId, response);
      
      if (resumeResult.success) {
        await addLogForToolCall(toolCallId, `Workflow resumed after rejection.`);
        toast.success('Tool rejected - workflow resumed');
      } else {
        await addLogForToolCall(toolCallId, `Failed to resume workflow: ${resumeResult.error}`);
        toast.error(`Failed to resume workflow: ${resumeResult.error}`);
      }
      
    } catch (error: any) {
      console.error(`🔍 [ToolDisplay-DEBUG] ❌ Error in handleReject:`, error);
      toast.error(`Error rejecting tool: ${error.message}`);
    } finally {
      setIsProcessing(false);
      console.log(`🔍 [ToolDisplay-DEBUG] ==================== REJECT COMPLETED ====================`);
    }
  };

  const handleDeny = useCallback(async (toolCallId: string) => {
    console.log(`Tool call ${toolCallId} denied for message ${messageId} in chat ${chatId}`);
    
    const isAgentOrchestrated = toolCallId.startsWith('approval-');
    const isLangGraphOrchestrated = toolCalls.find(tc => tc.id === toolCallId)?.mcp_server === 'langgraph';
    
    if (isAgentOrchestrated) {
      console.log(`[ToolDisplay] 🔧 Agent-orchestrated tool call ${toolCallId} denied`);
      
      try {
        // Add log for Agent denial
        const toolCall = toolCalls.find(tc => tc.id === toolCallId);
        if (toolCall) {
          await addLogForToolCall(toolCallId, `Agent tool "${toolCall.function.name}" denied by user. Sending denial to Agent orchestrator.`);
        }
        
        // Send denial to Agent via IPC
        await window.electron.agent.approveTool({
          approvalId: toolCallId,
          approved: false
        });
        
        // ✅ Update both chat store AND database for Agent tools
        const { updateMessage } = useChatStore.getState();
        const messages = useChatStore.getState().messages[chatId] || [];
        const currentMessage = messages.find(msg => msg.id === messageId);
        
        if (currentMessage && currentMessage.tool_calls) {
          const updatedToolCalls = currentMessage.tool_calls.map(tc => 
            tc.id === toolCallId ? { ...tc, status: 'denied' as const } : tc
          );
          
          await updateMessage(chatId, messageId, {
            tool_calls: updatedToolCalls
          });
          
          console.log(`[ToolDisplay] 🔧 Agent-orchestrated tool call status updated in chat store`);
        }
        
        // ✅ ALSO update the database so the denial persists across chat re-entries
        await updateToolCallStatus(toolCallId, 'denied');
        
        // Add log for successful denial
        await addLogForToolCall(toolCallId, `Denial sent to Agent orchestrator successfully. Tool execution cancelled.`);
        
        toast.info('Tool denied');
      } catch (error: any) {
        console.error('[ToolDisplay] 🔧 Error denying Agent-orchestrated tool:', error);
        await addLogForToolCall(toolCallId, `Error during Agent denial: ${error.message}`);
        toast.error(`Failed to deny tool: ${error.message}`);
      }
    } else if (isLangGraphOrchestrated) {
      console.log(`[ToolDisplay] 🔧 LangGraph-orchestrated tool call ${toolCallId} denied`);
      
      try {
        const toolCall = toolCalls.find(tc => tc.id === toolCallId);
        if (toolCall) {
          await addLogForToolCall(toolCallId, `LangGraph tool "${toolCall.function.name}" denied by user.`);
        }
        
        // ✅ Update tool call status in UI and database
        const { updateMessage } = useChatStore.getState();
        const messages = useChatStore.getState().messages[chatId] || [];
        const currentMessage = messages.find(msg => msg.id === messageId);
        
        if (currentMessage && currentMessage.tool_calls) {
          const updatedToolCalls = currentMessage.tool_calls.map(tc => 
            tc.id === toolCallId ? { ...tc, status: 'denied' as const } : tc
          );
          
          await updateMessage(chatId, messageId, {
            tool_calls: updatedToolCalls
          });
        }
        
        await updateToolCallStatus(toolCallId, 'denied');
        
        // ✅ Send denial response to resume LangGraph workflow
        const { resumeLangGraphWorkflow } = useAgentStore.getState();
        const langGraphInteractions = (window as any).langGraphInteractions || new Map();
        const interaction = langGraphInteractions.get(toolCallId);
        
        if (interaction) {
          const response = {
            id: toolCallId,
            approved: false,
            timestamp: Date.now()
          };
          
          await resumeLangGraphWorkflow(toolCallId, response);
          await addLogForToolCall(toolCallId, `Denial sent to LangGraph successfully. Workflow will abort.`);
        }
        
        toast.info('Agent execution denied - workflow aborted');
      } catch (error: any) {
        await addLogForToolCall(toolCallId, `Error during LangGraph denial: ${error.message}`);
        toast.error(`Failed to deny agent execution: ${error.message}`);
      }
    } else {
      // Regular MCP tool call
      await updateToolCallStatus(toolCallId, 'denied');
      await refreshMessage(chatId, messageId);
      toast.info('Tool denied');
    }
  }, [toolCalls, updateToolCallStatus, chatId, messageId, refreshMessage, addLogForToolCall]);

  const handleViewLogs = useCallback(async (toolCallId: string, toolName: string) => {
    setIsLoadingLogs(true);
    setSelectedToolName(toolName);
    
    // Now uses the properly imported store action
    const logs = await getLogsForToolCall(toolCallId);
    
    setSelectedLogContent(logs);
    setIsLoadingLogs(false);
    setLogDialogOpen(true);
  }, [getLogsForToolCall]);

  const handleCloseLogDialog = useCallback(() => {
    setLogDialogOpen(false);
    setSelectedLogContent([]);
    setSelectedToolName(undefined);
  }, []);

  const handleReset = useCallback(async (toolCallId: string) => {
    console.log(`Tool call ${toolCallId} reset to pending for message ${messageId} in chat ${chatId}`);
    
    // Check if this is an Agent-orchestrated tool call (approval ID format)
    const isAgentOrchestrated = toolCallId.startsWith('approval-');
    
    // Remove from auto-approved set when resetting
    setAutoApprovedTools(prev => {
      const newSet = new Set(prev);
      newSet.delete(toolCallId);
      return newSet;
    });
    
    if (isAgentOrchestrated) {
      // ✅ Update both chat store AND database for Agent tools
      const { updateMessage } = useChatStore.getState();
      const messages = useChatStore.getState().messages[chatId] || [];
      const currentMessage = messages.find(msg => msg.id === messageId);
      
      if (currentMessage && currentMessage.tool_calls) {
        const updatedToolCalls = currentMessage.tool_calls.map(tc => 
          tc.id === toolCallId ? { ...tc, status: 'pending' as const } : tc
        );
        
        await updateMessage(chatId, messageId, {
          tool_calls: updatedToolCalls
        });
        
        console.log(`[ToolDisplay] 🔧 Agent-orchestrated tool call reset in chat store`);
      }
      
      // ✅ ALSO update the database so the reset persists across chat re-entries
      await updateToolCallStatus(toolCallId, 'pending');
      
      // Add log for reset
      await addLogForToolCall(toolCallId, `Agent tool call reset to pending status by user.`);
    } else {
      // Regular MCP tool call (not Agent-orchestrated) - use database operations
      await updateToolCallStatus(toolCallId, 'pending');
      await refreshMessage(chatId, messageId);
    }
  }, [toolCalls, updateToolCallStatus, chatId, messageId, refreshMessage, addLogForToolCall]);

  const handleViewResult = useCallback((toolCall: IChatMessageToolCall) => {
    setSelectedToolCall(toolCall);
    setResultDialogOpen(true);
  }, []);

  const handleCloseResultDialog = useCallback(() => {
    setResultDialogOpen(false);
    setSelectedToolCall(null);
  }, []);

  const trimId = (id: string, length: number = 8) => {
    if (id.length <= length + 3) return id;
    return `${id.substring(0, length)}...`;
  };

  // Add summarize handler
  const handleSummarize = useCallback(async () => {
    const completedTools = toolCalls.filter(tool =>
      tool.status === 'executed' || tool.status === 'error'
    );

    if (completedTools.length === 0) {
      toast.error('No completed tools to summarize');
      return;
    }

    const hasResults = completedTools.some(tool => tool.result);
    if (!hasResults) {
      toast.error('No tool results to summarize');
      return;
    }

    setIsSummarizing(true);

    try {
      // Get required stores and data
      const { summarizeToolCallResults } = useAgentStore.getState();
      const { appendMessage, updateMessage } = useChatStore.getState();
      const { streamChatCompletion } = useStreamStore.getState();
      const { setStreamingState, markStreamAsCompleted } = useTopicStore.getState();
      const { modelId, provider } = useLLMConfigurationStore.getState();
      const { user: currentUser } = useUserStore.getState();
      const { agent } = useAgentStore.getState();

      if (!modelId) {
        toast.error('No model selected for summarization');
        return;
      }

      // Get existing messages for context
      const messages = useChatStore.getState().messages[chatId] || [];

      // Prepare tool results data
      const toolResults = completedTools.map(tool => ({
        toolName: tool.function.name,
        result: tool.result,
        executionTime: tool.execution_time_seconds,
        status: tool.status || 'unknown'
      }));

      // Call the summarizeToolCallResults method from AgentStore
      const result = await summarizeToolCallResults({
        activeChatId: chatId,
        toolCallResults: toolResults,
        modelId,
        provider: provider || "openai",
        agent,
        currentUser,
        existingMessages: messages,
        appendMessage,
        updateMessage,
        setStreamingState,
        markStreamAsCompleted,
        streamChatCompletion,
      });

      if (result.success) {
        toast.success('Tool results summarized successfully');
      } else {
        toast.error(`Failed to summarize: ${result.error}`);
      }

    } catch (error: any) {
      console.error('Error summarizing tool results:', error);
      toast.error(`Error summarizing tool results: ${error.message}`);
    } finally {
      setIsSummarizing(false);
    }
  }, [toolCalls, chatId]);

  // Helper function to get all URLs from completed tool calls
  const getAllReferencesFromTools = useCallback(() => {
    const allUrls: string[] = [];

    toolCalls.forEach(toolCall => {
      if ((toolCall.status === 'executed' || toolCall.status === 'error') && toolCall.result) {
        const urls = extractUrls(toolCall.result);
        allUrls.push(...urls);
      }
    });

    // Remove duplicates
    return [...new Set(allUrls)];
  }, [toolCalls]);

  const allReferences = getAllReferencesFromTools();

  // Check if we should show the summarize option for this specific tool call
  const shouldShowSummarizeForTool = useCallback((toolCall: IChatMessageToolCall) => {
    // Only show summarize on the last completed tool call when all tools are done
    const completedTools = toolCalls.filter(tool =>
      tool.status === 'executed' || tool.status === 'error'
    );
    const allToolsCompleted = completedTools.length === toolCalls.length && toolCalls.length > 0;
    const hasResults = completedTools.some(tool => tool.result);
    const isLastCompletedTool = toolCall === completedTools[completedTools.length - 1];
    
    return allToolsCompleted && hasResults && isLastCompletedTool;
  }, [toolCalls]);

  // Instead, just add a simple refresh effect when toolCalls change
  useEffect(() => {
    // If any Agent tool calls have results, the component will re-render automatically
    console.log('[ToolDisplay] Tool calls updated:', toolCalls.map(tc => ({ 
      id: tc.id, 
      status: tc.status, 
      hasResult: !!tc.result 
    })));
  }, [toolCalls]);

  // Add this enhanced component mount effect for debugging:
  useEffect(() => {
    console.log(`🔍 [ToolDisplay-DEBUG] ==================== COMPONENT MOUNT/UPDATE ====================`);
    console.log(`🔍 [ToolDisplay-DEBUG] Component props:`, {
      toolCallsCount: toolCalls.length,
      chatId,
      messageId,
      toolCalls: toolCalls.map(tc => ({
        id: tc.id,
        functionName: tc.function.name,
        mcpServer: tc.mcp_server,
        status: tc.status,
        hasResult: !!tc.result
      }))
    });
    
    // Debug global state
    console.log(`🔍 [ToolDisplay-DEBUG] Global state:`, {
      langGraphInteractions: {
        exists: !!(window as any).langGraphInteractions,
        size: ((window as any).langGraphInteractions || new Map()).size,
        keys: Array.from(((window as any).langGraphInteractions || new Map()).keys())
      },
      agentStore: {
        exists: !!useAgentStore.getState(),
        hasResumeFunction: typeof useAgentStore.getState().resumeLangGraphWorkflow === 'function'
      }
    });
    
    console.log(`🔍 [ToolDisplay-DEBUG] ==================== END COMPONENT DEBUG ====================`);
  }, [toolCalls, chatId, messageId]);

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <>
      <Box sx={{ pt: 0.5, color: "text.primary" }}>
        <Typography variant="body2" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          {intl.formatMessage({ id: 'toolDisplay.title' })}
        </Typography>

        {toolCalls.map((toolCall) => {
          console.log(`🔍 [ToolDisplay-DEBUG] ==================== RENDERING TOOL ====================`);
          console.log(`🔍 [ToolDisplay-DEBUG] Tool render debug:`, {
            id: toolCall.id,
            functionName: toolCall.function.name,
            mcpServer: toolCall.mcp_server,
            toolDescription: toolCall.tool_description,
            status: toolCall.status,
            isAgentExecution: isAgentExecution(toolCall),
            hasResult: !!toolCall.result,
            resultLength: toolCall.result ? String(toolCall.result).length : 0
          });
          
          // Debug interaction tracking
          const langGraphInteractions = (window as any).langGraphInteractions || new Map();
          const hasInteraction = langGraphInteractions.has(toolCall.id);
          console.log(`🔍 [ToolDisplay-DEBUG] Tool interaction tracking:`, {
            toolId: toolCall.id,
            hasInteraction,
            interactionDetails: hasInteraction ? {
              requestId: langGraphInteractions.get(toolCall.id)?.request?.id,
              threadId: langGraphInteractions.get(toolCall.id)?.request?.threadId,
              type: langGraphInteractions.get(toolCall.id)?.request?.type
            } : null
          });
          
          const isLoadingThisLog = isLoadingLogs && selectedToolName === toolCall.function.name;
          const isExecuting = executingToolIds.has(toolCall.id);
          const currentStatus = toolCall.status;
          const isAutoApproved = autoApprovedTools.has(toolCall.id);
          const duration = toolCall.execution_time_seconds || executionDurations.get(toolCall.id);
          const isCompleted = currentStatus === 'executed' || currentStatus === 'error';
          const showSummarize = shouldShowSummarizeForTool(toolCall);
          const isAgentOrchestrated = toolCall.id.startsWith('approval-');
          const isLangGraphOrchestrated = toolCall.mcp_server === 'langgraph';
          const isAgentExecutionCall = isAgentExecution(toolCall);

          let statusDisplayKey;
          if (currentStatus === 'approved') {
            statusDisplayKey = 'toolDisplay.approved';
          } else if (currentStatus === 'denied') {
            statusDisplayKey = 'toolDisplay.denied';
          } else if (currentStatus === 'executed') {
            statusDisplayKey = 'toolDisplay.executed';
          } else if (currentStatus === 'error') {
            statusDisplayKey = 'toolDisplay.error';
          } else if (currentStatus === 'executing') {
            statusDisplayKey = 'toolDisplay.executing';
          } else {
            statusDisplayKey = 'toolDisplay.statusPending';
          }

          return (
            <Box key={toolCall.id} sx={{ mb: 1, pl: 0 }}>
              <Typography variant="body2" component="div" sx={{ color: "text.secondary", display: 'flex', alignItems: 'center', mb: 0.25 }}>
                <Box component="span" sx={{ mr: 0.5 }}>•</Box>
                <Box component="span" sx={{ fontFamily: "monospace", color: "primary.main", px: 0.5, borderRadius: '4px' }}>
                  {isAgentExecutionCall 
                    ? toolCall.function.name.replace('_agent_execution', '').replace('_', ' ').toUpperCase() + ' Agent'
                    : toolCall.function.name
                  }
                </Box>
                {toolCall.mcp_server && (
                  <Box component="span" sx={{ ml: 1, fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic' }}>
                    ({isAgentExecutionCall 
                      ? 'Agent Orchestrator'
                      : isLangGraphOrchestrated 
                        ? 'LangGraph' 
                        : formatMCPName(toolCall.mcp_server)
                    })
                  </Box>
                )}
                {isAgentOrchestrated && (
                  <Box component="span" sx={{ ml: 1, fontSize: '0.75rem', color: 'warning.main', fontStyle: 'italic' }}>
                    via Agent
                  </Box>
                )}
                {isAutoApproved && (
                  <Chip
                    label="Auto-approved"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ ml: 1, fontSize: '0.65rem', height: 18 }}
                  />
                )}
                :
              </Typography>

              {toolCall.tool_description && (
                <Typography variant="caption" component="div" sx={{ color: "text.secondary", fontStyle: 'italic', pl: 2, mb: 0.5 }}>
                  {toolCall.tool_description}
                </Typography>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 0.5, pl: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {(currentStatus === 'pending' || currentStatus === undefined || currentStatus === null) ? (
                    <>
                      <Button
                        disableElevation
                        variant='outlined'
                        size="small"
                        color="success"
                        startIcon={<CheckCircleOutlineIcon />}
                        onClick={() => handleApprove(toolCall.id)}
                      >
                        {intl.formatMessage({ id: 'toolDisplay.approve' })}
                      </Button>
                      <Button
                        disableElevation
                        variant='outlined'
                        size="small"
                        color="error"
                        startIcon={<CancelOutlinedIcon />}
                        onClick={() => handleReject(toolCall.id)}
                      >
                        {intl.formatMessage({ id: 'toolDisplay.deny' })}
                      </Button>
                    </>
                  ) : currentStatus === 'approved' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {intl.formatMessage({ id: 'toolDisplay.approved' })}
                        {isAutoApproved && (
                          <Typography component="span" sx={{ fontSize: '0.75rem', ml: 0.5, opacity: 0.8 }}>
                            (Auto)
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  ) : currentStatus === 'executing' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                        {intl.formatMessage({ id: 'toolDisplay.executing' })}
                      </Typography>
                      <Chip
                        icon={<AccessTimeIcon sx={{ fontSize: '0.75rem' }} />}
                        label={`${Math.floor((Date.now() - (executionStartTimes.get(toolCall.id) || Date.now())) / 1000)}s`}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </Box>
                  ) : currentStatus === 'denied' ? (
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      {intl.formatMessage({ id: 'toolDisplay.denied' })}
                    </Typography>
                  ) : currentStatus === 'executed' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="caption"
                        component="span"
                        onClick={() => handleViewResult(toolCall)}
                        sx={{
                          cursor: 'pointer',
                          color: 'success.main',
                          textDecoration: 'underline',
                          '&:hover': {
                            color: 'success.dark',
                          }
                        }}
                      >
                        View Result {duration && `(${duration}s)`}
                      </Typography>
                      
                      {showSummarize && (
                        <Typography
                          variant="caption"
                          component="span"
                          onClick={isSummarizing ? undefined : handleSummarize}
                          sx={{
                            cursor: isSummarizing ? 'default' : 'pointer',
                            color: isSummarizing ? 'text.disabled' : 'primary.main',
                            textDecoration: isSummarizing ? 'none' : 'underline',
                            '&:hover': {
                              color: isSummarizing ? 'text.disabled' : 'primary.dark',
                            }
                          }}
                        >
                          {isSummarizing 
                            ? intl.formatMessage({ id: 'toolDisplay.summarizing' })
                            : intl.formatMessage({ id: 'toolDisplay.summarize' })
                          }
                        </Typography>
                      )}
                    </Box>
                  ) : currentStatus === 'error' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="caption"
                        component="span"
                        onClick={() => handleViewResult(toolCall)}
                        sx={{
                          cursor: 'pointer',
                          color: 'error.main',
                          textDecoration: 'underline',
                          '&:hover': {
                            color: 'error.dark',
                          }
                        }}
                      >
                        View Error {duration && `(${duration}s)`}
                      </Typography>
                      
                      {showSummarize && (
                        <Typography
                          variant="caption"
                          component="span"
                          onClick={isSummarizing ? undefined : handleSummarize}
                          sx={{
                            cursor: isSummarizing ? 'default' : 'pointer',
                            color: isSummarizing ? 'text.disabled' : 'primary.main',
                            textDecoration: isSummarizing ? 'none' : 'underline',
                            '&:hover': {
                              color: isSummarizing ? 'text.disabled' : 'primary.dark',
                            }
                          }}
                        >
                          {isSummarizing 
                            ? intl.formatMessage({ id: 'toolDisplay.summarizing' })
                            : intl.formatMessage({ id: 'toolDisplay.summarize' })
                          }
                        </Typography>
                      )}
                    </Box>
                  ) : null}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', color: "text.secondary", gap: 1 }}>
                  <Typography variant="caption" component="span">
                    {intl.formatMessage({ id: 'toolDisplay.idLabel' })} {trimId(toolCall.id, 6)} | {intl.formatMessage({ id: 'toolDisplay.statusLabel' })}{' '}
                    <Box component="span" sx={{
                      fontWeight: 'medium',
                      color: currentStatus === 'approved' ? 'success.main'
                        : currentStatus === 'denied' ? 'error.main'
                          : currentStatus === 'executed' ? 'success.main'
                            : currentStatus === 'error' ? 'error.main'
                              : 'text.secondary'
                    }}>
                      {intl.formatMessage({ id: statusDisplayKey })}
                    </Box>
                  </Typography>
                  <Typography
                    variant="caption"
                    component="span"
                    onClick={() => {
                      if (!isLoadingThisLog) {
                        handleViewLogs(toolCall.id, toolCall.function.name);
                      }
                    }}
                    sx={{
                      cursor: isLoadingThisLog ? 'default' : 'pointer',
                      color: isLoadingThisLog ? 'text.disabled' : 'info.main',
                      textDecoration: isLoadingThisLog ? 'none' : 'underline',
                      '&:hover': {
                        color: isLoadingThisLog ? 'text.disabled' : 'info.dark',
                      }
                    }}
                  >
                    {isLoadingThisLog ? intl.formatMessage({ id: 'toolDisplay.loadingLogs' }) : intl.formatMessage({ id: 'toolDisplay.logs' })}
                  </Typography>
                  {(currentStatus === 'approved' || currentStatus === 'denied' || currentStatus === 'executed' || currentStatus === 'error') && (
                    <Typography
                      variant="caption"
                      component="span"
                      onClick={() => handleReset(toolCall.id)}
                      sx={{
                        cursor: 'pointer',
                        color: 'warning.main',
                        textDecoration: 'underline',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                        '&:hover': {
                          color: 'warning.dark',
                        }
                      }}
                    >
                      <RestartAltIcon sx={{ fontSize: '0.75rem' }} />
                      {intl.formatMessage({ id: 'toolDisplay.reset' })}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )
        })}

        {/* References Section */}
        {allReferences.length > 0 && (
          <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography
              variant="caption"
              component="div"
              sx={{
                fontWeight: 'medium',
                mb: 0.5,
                color: 'text.secondary',
                opacity: 0.8
              }}
            >
              References ({allReferences.length}):
            </Typography>
            <Box sx={{ pl: 1 }}>
              {allReferences.map((url, index) => (
                <Typography
                  key={index}
                  variant="caption"
                  component="div"
                  sx={{ mb: 0.25 }}
                >
                  <Typography
                    component="span"
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                    sx={{
                      cursor: 'pointer',
                      color: 'text.secondary',
                      opacity: 0.7,
                      fontSize: '0.7rem',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                        opacity: 0.9,
                      },
                      wordBreak: 'break-all',
                    }}
                  >
                    • {formatUrlForDisplay(url, 70)}
                  </Typography>
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <ToolLogDialog
        open={logDialogOpen}
        onClose={handleCloseLogDialog}
        logContent={selectedLogContent}
        toolName={selectedToolName}
      />

      <ToolResultDialog
        open={resultDialogOpen}
        onClose={handleCloseResultDialog}
        toolCall={selectedToolCall}
        executionTime={selectedToolCall ? executionDurations.get(selectedToolCall.id) : undefined}
      />
    </>
  );
});

export default ToolDisplay;
