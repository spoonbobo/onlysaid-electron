import { useState, useEffect, useCallback } from 'react';
import { IChatMessageToolCall } from "@/../../types/Chat/Message";
import { useLLMStore } from "@/renderer/stores/LLM/LLMStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useMCPClientStore } from "@/renderer/stores/MCP/MCPClient";
import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { toast } from "@/utils/toast";
import { extractUrls } from "@/utils/url";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useStreamStore } from "@/renderer/stores/Stream/StreamStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { HumanInteractionResponse } from "@/service/langchain/human_in_the_loop/renderer/human_in_the_loop";

// Add this constant at the top of the file, after imports
const TOOL_EXECUTION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

interface UseToolDisplayLogicProps {
  toolCalls: IChatMessageToolCall[];
  chatId: string;
  messageId: string;
}

export const useToolDisplayLogic = ({ toolCalls, chatId, messageId }: UseToolDisplayLogicProps) => {
  const { updateToolCallStatus, updateToolCallResult, addLogForToolCall } = useLLMStore();
  const refreshMessage = useChatStore(state => state.refreshMessage);
  const { executeTool } = useMCPClientStore.getState();
  const { getAllConfiguredServers, getServerAutoApproved } = useMCPStore.getState();
  
  const [executingToolIds, setExecutingToolIds] = useState<Set<string>>(new Set());
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
    const functionName = toolCall?.function?.name;
    const mcpServer = toolCall?.mcp_server;
    
    if (!functionName) return false;
    
    const result = mcpServer === 'agent_orchestrator' || 
           functionName.endsWith('_agent_execution');
    
    // console.log('[ToolDisplay] 🐛 DEBUG: isAgentExecution check:', {
    //   toolCallId: toolCall.id,
    //   functionName: functionName,
    //   mcpServer: mcpServer,
    //   isAgentExecution: result
    // });
    
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

    const startTime = Date.now();
    setExecutingToolIds(prev => new Set(prev).add(toolCall.id));
    
    await updateToolCallStatus(toolCall.id, 'executing');
    await refreshMessage(chatId, messageId);

    try {
      console.log(`[ToolDisplay-Timer] Executing tool ${toolCall.function.name} on server ${serverId} - timer started`);
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

        const endTime = Date.now();
        const duration = Math.floor((endTime - startTime) / 1000);

        await updateToolCallResult(toolCall.id, result.data, duration);
        await addLogForToolCall(toolCall.id, `Tool execution completed successfully in ${duration}s. Result: ${JSON.stringify(result.data, null, 2)}`);
        
        console.log(`[ToolDisplay-Timer] Tool ${toolCall.function.name} completed in ${duration}s`);
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
      const endTime = Date.now();
      const duration = Math.floor((endTime - startTime) / 1000);

      setExecutingToolIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolCall.id);
        return newSet;
      });
      
      console.log(`[ToolDisplay-Timer] Tool ${toolCall.function.name} execution finished - final duration: ${duration}s`);
      await refreshMessage(chatId, messageId);
    }
  }, [executeTool, updateToolCallResult, updateToolCallStatus, addLogForToolCall, chatId, messageId, refreshMessage, getAllConfiguredServers]);

  // Enhanced MCP tool execution
  const executeMCPToolDirectly = useCallback(async (
    serverName: string, 
    toolName: string, 
    args: Record<string, any>
  ) => {
    const startTime = Date.now();
    console.log(`[ToolDisplay-MCP] Executing MCP tool directly at ${new Date(startTime).toLocaleTimeString()}:`, {
      serverName, toolName, args
    });
    
    try {
      const { executeTool } = useMCPClientStore.getState();
      
      if (!executeTool) {
        throw new Error('MCP client executeTool function not available');
      }
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Tool execution timeout after ${TOOL_EXECUTION_TIMEOUT / 1000} seconds`)), TOOL_EXECUTION_TIMEOUT);
      });
      
      const executionPromise = executeTool(serverName, toolName, args);
      
      const result = await Promise.race([executionPromise, timeoutPromise]) as any;
      
      const endTime = Date.now();
      const duration = Math.floor((endTime - startTime) / 1000);
      
      console.log(`[ToolDisplay-MCP] Direct execution completed in ${duration}s:`, result);
      return result;
    } catch (error: any) {
      const endTime = Date.now();
      const duration = Math.floor((endTime - startTime) / 1000);
      console.error(`[ToolDisplay-MCP] Direct execution failed after ${duration}s:`, error);
      throw error;
    }
  }, []);

  // Auto-approve and auto-execute tool calls
  useEffect(() => {
    const checkAndAutoApprove = async () => {
      for (const toolCall of toolCalls) {
        if ((toolCall.status === 'pending' || !toolCall.status) &&
          toolCall.mcp_server &&
          !autoApprovedTools.has(toolCall.id)) {

          const isAutoApproved = getServerAutoApproved(toolCall.mcp_server);

          if (isAutoApproved) {
            console.log(`Auto-approving and executing tool call ${toolCall.id} for server ${toolCall.mcp_server}`);

            setAutoApprovedTools(prev => new Set(prev).add(toolCall.id));
            await updateToolCallStatus(toolCall.id, 'approved');

            toast.success(
              `Tool "${toolCall.function.name}" auto-approved and executing for ${formatMCPName(toolCall.mcp_server)}`,
            );

            await refreshMessage(chatId, messageId);

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
      
      const approvalTime = Date.now();
      console.log(`[ToolDisplay-Timer] Approval granted at ${new Date(approvalTime).toLocaleTimeString()} for ${toolCallId}`);
      
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
        
        await updateToolCallStatus(toolCallId, 'executing');
        await addLogForToolCall(toolCallId, `User approved tool execution at ${new Date(approvalTime).toLocaleTimeString()}. Starting execution...`);
        await refreshMessage(chatId, messageId);
        
        let toolExecutionResult: any = null;
        let executionSuccess = false;
        let executionError = '';
        let executionDuration = 0;
        
        if (toolCall.mcp_server && toolCall.mcp_server !== 'langgraph') {
          console.log(`🔍 [ToolDisplay-APPROVE] Executing MCP tool:`, {
            mcpServer: toolCall.mcp_server,
            toolName: toolCall.function.name,
            argumentsType: typeof toolCall.function.arguments
          });
          
          try {
            const executionStartTime = Date.now();
            
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
            
            const executionEndTime = Date.now();
            executionDuration = Math.floor((executionEndTime - executionStartTime) / 1000);
            
            console.log(`🔍 [ToolDisplay-APPROVE] MCP execution result:`, {
              success: mcpResult.success,
              hasData: !!mcpResult.data,
              dataType: typeof mcpResult.data,
              error: mcpResult.error,
              executionDuration
            });
            
            if (mcpResult.success) {
              toolExecutionResult = mcpResult.data;
              executionSuccess = true;
              
              await updateToolCallStatus(toolCallId, 'executed');
              await updateToolCallResult(toolCallId, mcpResult.data, executionDuration);
              await addLogForToolCall(toolCallId, `Tool executed successfully in ${executionDuration}s: ${JSON.stringify(mcpResult.data)}`);
              
              console.log(`🔍 [ToolDisplay-APPROVE] ✅ MCP tool executed successfully in ${executionDuration}s`);
            } else {
              executionError = mcpResult.error;
              await updateToolCallStatus(toolCallId, 'error');
              await addLogForToolCall(toolCallId, `Tool execution failed after ${executionDuration}s: ${mcpResult.error}`);
              console.error(`🔍 [ToolDisplay-APPROVE] ❌ MCP tool execution failed:`, mcpResult.error);
            }
            
          } catch (error: any) {
            const executionEndTime = Date.now();
            executionDuration = Math.floor((executionEndTime - approvalTime) / 1000);
            
            executionError = error.message;
            await updateToolCallStatus(toolCallId, 'error'); 
            await addLogForToolCall(toolCallId, `Tool execution error after ${executionDuration}s: ${error.message}`);
            console.error(`🔍 [ToolDisplay-APPROVE] ❌ MCP tool execution error:`, error);
          }
        } else {
          executionSuccess = true;
          await updateToolCallStatus(toolCallId, 'executed');
          await addLogForToolCall(toolCallId, `Tool approved (no MCP execution required)`);
          console.log(`🔍 [ToolDisplay-APPROVE] ✅ Non-MCP tool marked as executed`);
        }
        
        const response: HumanInteractionResponse = {
          id: interaction.request.id,
          approved: true,
          timestamp: Date.now(),
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
          toolName: response.toolExecutionResult?.toolName
        });
        
        console.log(`🔍 [ToolDisplay-APPROVE] 🔧 Resuming LangGraph workflow with execution results:`, {
          threadId: interaction.request.threadId,
          approved: true,
          hasExecutionResult: !!response.toolExecutionResult
        });
        
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
          await addLogForToolCall(toolCallId, `Workflow resumed successfully with execution results (${executionDuration}s).`);
          if (executionSuccess) {
            toast.success(`Tool "${toolCall.function.name}" executed (${executionDuration}s) and workflow resumed`);
          } else {
            toast.error(`Tool execution failed but workflow resumed`);
          }
        } else {
          await addLogForToolCall(toolCallId, `Failed to resume workflow: ${resumeResult.error}`);
          toast.error(`Failed to resume workflow: ${resumeResult.error}`);
        }
        
      } else {
        console.log(`🔍 [ToolDisplay-APPROVE] 🔧 Non-LangGraph tool - executing directly`);
        // Handle non-LangGraph tools here if needed
      }
      
    } catch (error: any) {
      console.error(`🔍 [ToolDisplay-APPROVE] ❌ Error in handleApprove:`, error);
      toast.error(`Error approving tool: ${error.message}`);
    } finally {
      setIsProcessing(false);
      await refreshMessage(chatId, messageId);
      console.log(`🔍 [ToolDisplay-APPROVE] ==================== APPROVE COMPLETED ====================`);
    }
  };

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

  const handleReset = useCallback(async (toolCallId: string) => {
    console.log(`Tool call ${toolCallId} reset to pending for message ${messageId} in chat ${chatId}`);
    
    setAutoApprovedTools(prev => {
      const newSet = new Set(prev);
      newSet.delete(toolCallId);
      return newSet;
    });
    
    const isAgentOrchestrated = toolCallId.startsWith('approval-');
    
    if (isAgentOrchestrated) {
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
      
      await updateToolCallStatus(toolCallId, 'pending');
      await addLogForToolCall(toolCallId, `Agent tool call reset to pending status by user.`);
    } else {
      await updateToolCallStatus(toolCallId, 'pending');
      await refreshMessage(chatId, messageId);
    }
  }, [toolCalls, updateToolCallStatus, chatId, messageId, refreshMessage, addLogForToolCall]);

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

      const messages = useChatStore.getState().messages[chatId] || [];

      const toolResults = completedTools.map(tool => ({
        toolName: tool.function.name,
        result: tool.result,
        executionTime: tool.execution_time_seconds,
        status: tool.status || 'unknown'
      }));

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

    return [...new Set(allUrls)];
  }, [toolCalls]);

  // Check if we should show the summarize option for this specific tool call
  const shouldShowSummarizeForTool = useCallback((toolCall: IChatMessageToolCall) => {
    const completedTools = toolCalls.filter(tool =>
      tool.status === 'executed' || tool.status === 'error'
    );
    const allToolsCompleted = completedTools.length === toolCalls.length && toolCalls.length > 0;
    const hasResults = completedTools.some(tool => tool.result);
    const isLastCompletedTool = toolCall === completedTools[completedTools.length - 1];
    
    return allToolsCompleted && hasResults && isLastCompletedTool;
  }, [toolCalls]);

  // Debug effect
  useEffect(() => {
    console.log('[ToolDisplay] Tool calls updated:', toolCalls.map(tc => ({ 
      id: tc.id, 
      status: tc.status, 
      hasResult: !!tc.result 
    })));
  }, [toolCalls]);

  return {
    executingToolIds,
    autoApprovedTools,
    isSummarizing,
    isProcessing,
    handleApprove,
    handleReject,
    handleReset,
    handleSummarize,
    shouldShowSummarizeForTool,
    getAllReferencesFromTools,
    formatMCPName,
    isAgentExecution
  };
}; 