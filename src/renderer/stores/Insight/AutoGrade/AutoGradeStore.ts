import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentWorkspaceId } from '@/utils/workspace';
import { getUserFromStore, getUserTokenFromStore } from '@/utils/user';
import { useChatStore } from '@/renderer/stores/Chat/ChatStore';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { useAgentStore } from '@/renderer/stores/Agent/AgentStore';
import { useLLMConfigurationStore } from '@/renderer/stores/LLM/LLMConfiguration';
import { useMCPSettingsStore } from '@/renderer/stores/MCP/MCPSettingsStore';
import { useKBSettingsStore } from '@/renderer/stores/KB/KBSettingStore';
import { useAgentSettingsStore } from '@/renderer/stores/Agent/AgentSettingStore';
import { getServiceTools } from '@/utils/mcp';
import type { MarkingScheme } from './MarkingSchemeStore';
import type OpenAI from 'openai';

interface GradeSubmission {
  studentId: string;
  assignmentId: string;
  courseId: string;
  grade: number;
  feedback?: string;
  timestamp: string;
  published: boolean;
}

// NEW: Hierarchical grade info structure
interface UserGradeInfo {
  aiGrade: string;
  currentGrade: number | null;
  feedback: string;
  timestamp: string;
  published: boolean;
}

// NEW: Hierarchical structure - workspace:course:user:info
interface WorkspaceGradeData {
  [courseId: string]: {
    [userId: string]: UserGradeInfo;
  };
}

// NEW: Add grading state interface
interface GradingState {
  isGrading: boolean;
  studentId: string | null;
  chatId: string | null;
  assignmentName: string | null;
  studentName: string | null;
}

// NEW: Add pending grading request interface
interface PendingGradingRequest {
  studentData: any;
  markingScheme: MarkingScheme;
  assignment: any;
  workspaceId: string;
  courseId: string;
  maxGrade: number;
  executionId: string;
  resolve: (result: { aiGrade: string; feedback: string }) => void;
  reject: (error: Error) => void;
}

interface AutoGradeState {
  // UPDATED: New hierarchical structure
  workspaceGrades: Record<string, WorkspaceGradeData>; // workspaceId -> courseId -> userId -> info
  
  // NEW: Add grading state
  gradingState: GradingState;
  
  // NEW: Add pending grading requests
  pendingGradingRequests: Map<string, PendingGradingRequest>;
  
  // Legacy support (keep for backward compatibility)
  autoGradeResults: Record<string, { aiGrade: string; feedback: string; timestamp: string }>; // Keyed by studentId
  gradeSubmissions: Record<string, GradeSubmission>; // Keyed by `${assignmentId}-${studentId}`
  
  // NEW: Hierarchical grade methods
  setUserGradeInfo: (workspaceId: string, courseId: string, userId: string, info: UserGradeInfo) => void;
  getUserGradeInfo: (workspaceId: string, courseId: string, userId: string) => UserGradeInfo | undefined;
  updateUserCurrentGrade: (workspaceId: string, courseId: string, userId: string, currentGrade: number) => void;
  updateUserPublishedStatus: (workspaceId: string, courseId: string, userId: string, published: boolean) => void;
  clearUserGradeInfo: (workspaceId: string, courseId: string, userId: string) => void;
  clearCourseGrades: (workspaceId: string, courseId: string) => void;
  clearWorkspaceGrades: (workspaceId: string) => void;
  
  // NEW: Grading state methods
  setGradingState: (isGrading: boolean, studentId?: string, chatId?: string, assignmentName?: string, studentName?: string) => void;
  clearGradingState: () => void;
  navigateToGradingChat: () => void;
  
  // NEW: Pending grading request methods
  addPendingGradingRequest: (executionId: string, request: PendingGradingRequest) => void;
  getPendingGradingRequest: (executionId: string) => PendingGradingRequest | undefined;
  removePendingGradingRequest: (executionId: string) => void;
  handleGradingSynthesis: (executionId: string, result: string) => void;
  
  // Auto-grade execution - UPDATED to include apiToken
  executeAutoGrade: (studentData: any, markingScheme: MarkingScheme, assignment: any, workspaceId: string, courseId: string, apiToken: string) => Promise<{ aiGrade: string; feedback: string }>;
  
  // Legacy methods (keep for backward compatibility)
  setAutoGradeResult: (studentId: string, result: { aiGrade: string; feedback: string }) => void;
  getAutoGradeResult: (studentId: string) => { aiGrade: string; feedback: string; timestamp: string } | undefined;
  clearAutoGradeResult: (studentId: string) => void;
  setGradeSubmission: (key: string, submission: GradeSubmission) => void;
  getGradeSubmission: (assignmentId: string, studentId: string) => GradeSubmission | undefined;
  isGradePublished: (assignmentId: string, studentId: string) => boolean;
  refreshGradeStatus: (assignmentId: string, studentId: string, apiGrade: any, courseId: string) => void;
  
  // UPDATED: Reset grade methods instead of delete
  resetUserGrade: (workspaceId: string, courseId: string, userId: string) => void;
  resetGradeSubmission: (assignmentId: string, studentId: string) => void;
}

export const useAutoGradeStore = create<AutoGradeState>()(
  persist(
    (set, get) => ({
      workspaceGrades: {},
      autoGradeResults: {},
      gradeSubmissions: {},
      pendingGradingRequests: new Map(),
      
      // NEW: Initialize grading state
      gradingState: {
        isGrading: false,
        studentId: null,
        chatId: null,
        assignmentName: null,
        studentName: null,
      },
      
      // NEW: Hierarchical grade methods
      setUserGradeInfo: (workspaceId, courseId, userId, info) => {
        console.log('🔄 Setting user grade info:', { workspaceId, courseId, userId, info });
        set((state) => {
          const newState = {
            workspaceGrades: {
              ...state.workspaceGrades,
              [workspaceId]: {
                ...state.workspaceGrades[workspaceId],
                [courseId]: {
                  ...state.workspaceGrades[workspaceId]?.[courseId],
                  [userId]: info,
                },
              },
            },
          };
          console.log('✅ User grade info stored:', newState.workspaceGrades[workspaceId]?.[courseId]?.[userId]);
          return newState;
        });
      },
      
      getUserGradeInfo: (workspaceId, courseId, userId) => {
        const info = get().workspaceGrades[workspaceId]?.[courseId]?.[userId];
        console.log('📖 Getting user grade info:', { workspaceId, courseId, userId, info });
        return info;
      },
      
      updateUserCurrentGrade: (workspaceId, courseId, userId, currentGrade) =>
        set((state) => {
          const existingInfo = state.workspaceGrades[workspaceId]?.[courseId]?.[userId];
          if (existingInfo) {
            return {
              workspaceGrades: {
                ...state.workspaceGrades,
                [workspaceId]: {
                  ...state.workspaceGrades[workspaceId],
                  [courseId]: {
                    ...state.workspaceGrades[workspaceId][courseId],
                    [userId]: {
                      ...existingInfo,
                      currentGrade,
                      timestamp: new Date().toISOString(),
                    },
                  },
                },
              },
            };
          }
          return state;
        }),
      
      updateUserPublishedStatus: (workspaceId, courseId, userId, published) =>
        set((state) => {
          const existingInfo = state.workspaceGrades[workspaceId]?.[courseId]?.[userId];
          if (existingInfo) {
            return {
              workspaceGrades: {
                ...state.workspaceGrades,
                [workspaceId]: {
                  ...state.workspaceGrades[workspaceId],
                  [courseId]: {
                    ...state.workspaceGrades[workspaceId][courseId],
                    [userId]: {
                      ...existingInfo,
                      published,
                      timestamp: new Date().toISOString(),
                    },
                  },
                },
              },
            };
          }
          return state;
        }),
      
      clearUserGradeInfo: (workspaceId, courseId, userId) =>
        set((state) => {
          if (state.workspaceGrades[workspaceId]?.[courseId]?.[userId]) {
            const newCourseGrades = { ...state.workspaceGrades[workspaceId][courseId] };
            delete newCourseGrades[userId];
            return {
              workspaceGrades: {
                ...state.workspaceGrades,
                [workspaceId]: {
                  ...state.workspaceGrades[workspaceId],
                  [courseId]: newCourseGrades,
                },
              },
            };
          }
          return state;
        }),
      
      clearCourseGrades: (workspaceId, courseId) =>
        set((state) => {
          if (state.workspaceGrades[workspaceId]?.[courseId]) {
            const newWorkspaceGrades = { ...state.workspaceGrades[workspaceId] };
            delete newWorkspaceGrades[courseId];
            return {
              workspaceGrades: {
                ...state.workspaceGrades,
                [workspaceId]: newWorkspaceGrades,
              },
            };
          }
          return state;
        }),
      
      clearWorkspaceGrades: (workspaceId) =>
        set((state) => {
          const { [workspaceId]: removed, ...rest } = state.workspaceGrades;
          return { workspaceGrades: rest };
        }),
      
      // NEW: Grading state methods
      setGradingState: (isGrading, studentId, chatId, assignmentName, studentName) =>
        set({
          gradingState: {
            isGrading,
            studentId: studentId || null,
            chatId: chatId || null,
            assignmentName: assignmentName || null,
            studentName: studentName || null,
          }
        }),
      
      clearGradingState: () =>
        set({
          gradingState: {
            isGrading: false,
            studentId: null,
            chatId: null,
            assignmentName: null,
            studentName: null,
          }
        }),
      
      navigateToGradingChat: () => {
        const state = get();
        const { gradingState } = state;
        
        if (gradingState.chatId) {
          const currentWorkspaceId = getCurrentWorkspaceId();
          if (currentWorkspaceId) {
            // First, set the active chat in ChatStore using the workspace as context
            const chatStore = useChatStore.getState();
            chatStore.setActiveChat(gradingState.chatId, currentWorkspaceId);
            
            // Set the workspace selected chat in TopicStore
            const topicStore = useTopicStore.getState();
            topicStore.setWorkspaceSelectedChat(currentWorkspaceId, gradingState.chatId);
            
            // Navigate to workspace chat section (following WorkspaceContainer pattern)
            topicStore.setSelectedContext({
              id: currentWorkspaceId,
              name: "workspace", // This should match the workspace name from WorkspaceContainer
              type: "workspace",
              section: "workspace:chatroom" // Following the pattern from WorkspaceContainer
            });
            
            console.log('📍 Navigated to grading chat:', {
              workspaceId: currentWorkspaceId,
              chatId: gradingState.chatId,
              studentName: gradingState.studentName,
              assignmentName: gradingState.assignmentName
            });
          }
        }
      },

      // NEW: Pending grading request methods
      addPendingGradingRequest: (executionId, request) =>
        set((state) => {
          const newMap = new Map(state.pendingGradingRequests);
          newMap.set(executionId, request);
          return { pendingGradingRequests: newMap };
        }),

      getPendingGradingRequest: (executionId) => {
        return get().pendingGradingRequests.get(executionId);
      },

      removePendingGradingRequest: (executionId) =>
        set((state) => {
          const newMap = new Map(state.pendingGradingRequests);
          newMap.delete(executionId);
          return { pendingGradingRequests: newMap };
        }),

      handleGradingSynthesis: (executionId, result) => {
        const state = get();
        const pendingRequest = state.pendingGradingRequests.get(executionId);
        
        console.log('🔮 [AutoGrade-Synthesis] Processing grading synthesis:', {
          executionId,
          hasPendingRequest: !!pendingRequest,
          resultLength: result?.length || 0,
          resultPreview: result?.substring(0, 100) + '...',
          pendingRequestsCount: state.pendingGradingRequests.size,
          pendingRequestKeys: Array.from(state.pendingGradingRequests.keys())
        });
        
        if (!pendingRequest) {
          console.warn('🚨 [AutoGrade-Synthesis] No pending grading request found for execution ID:', executionId);
          console.warn('🚨 [AutoGrade-Synthesis] Available pending requests:', Array.from(state.pendingGradingRequests.keys()));
          return;
        }

        console.log('🔮 [AutoGrade-Synthesis] Found pending request for execution ID:', executionId);

        console.log('🔮 Processing grading synthesis for execution ID:', executionId);

        try {
          // Parse the synthesized result with improved regex patterns
          let aiGrade = '';
          let feedback = '';
          
          // Enhanced regex patterns for better parsing
          const gradeMatch = result.match(/(?:GRADE|Grade|SCORE|Score):\s*(\d+(?:\.\d+)?)/i);
          const feedbackMatch = result.match(/(?:FEEDBACK|Feedback):\s*([\s\S]*?)(?=\n\n(?:GRADE|Grade|SCORE|Score)|$)/i);
          
          if (gradeMatch) {
            aiGrade = gradeMatch[1];
          } else {
            // Fallback: try to find any number that could be a grade
            const numberMatch = result.match(/(\d+(?:\.\d+)?)\s*(?:\/|\s*out\s*of|\s*points?)/i);
            aiGrade = numberMatch ? numberMatch[1] : '0';
          }
          
          if (feedbackMatch) {
            feedback = feedbackMatch[1].trim();
          } else {
            // Use the entire response as feedback if no specific feedback section found
            feedback = result;
          }
          
          // Ensure grade is within valid range
          const numericGrade = parseFloat(aiGrade);
          if (isNaN(numericGrade) || numericGrade < 0) {
            aiGrade = '0';
          } else if (numericGrade > pendingRequest.maxGrade) {
            aiGrade = pendingRequest.maxGrade.toString();
          }
          
          const gradingResult = { aiGrade, feedback };
          
          console.log('🎯 Auto-grade result processed:', gradingResult);

          // Store the result in hierarchical structure
          const gradeInfo: UserGradeInfo = {
            aiGrade: gradingResult.aiGrade,
            currentGrade: pendingRequest.studentData.currentGrade ? parseFloat(pendingRequest.studentData.currentGrade) : null,
            feedback: gradingResult.feedback,
            timestamp: new Date().toISOString(),
            published: false,
          };

          console.log('🔍 [DEBUG] Storing grade info:', {
            workspaceId: pendingRequest.workspaceId,
            courseId: pendingRequest.courseId,
            studentId: pendingRequest.studentData.student.id,
            gradeInfo
          });

          state.setUserGradeInfo(pendingRequest.workspaceId, pendingRequest.courseId, pendingRequest.studentData.student.id, gradeInfo);

          // Also store in legacy format for backward compatibility
          state.setAutoGradeResult(pendingRequest.studentData.student.id, gradingResult);

          // Clear grading state
          state.clearGradingState();

          // Resolve the promise
          pendingRequest.resolve(gradingResult);

          console.log('=== AUTO GRADE SYNTHESIS COMPLETE ===');
          
        } catch (error) {
          console.error('❌ Error processing grading synthesis:', error);
          pendingRequest.reject(error instanceof Error ? error : new Error('Failed to process grading synthesis'));
        } finally {
          // Clean up pending request
          state.removePendingGradingRequest(executionId);
        }
      },

      // UPDATED: Auto-grade execution without IPC listeners
      executeAutoGrade: async (studentData, markingScheme, assignment, workspaceId, courseId, apiToken) => {
        return new Promise(async (resolve, reject) => {
          try {
            // DEBUG: Log workspace IDs to understand what's being passed
            const currentWorkspaceId = getCurrentWorkspaceId();
            const topicStoreContext = useTopicStore.getState().selectedContext;
            
            console.log('🔍 [DEBUG] Workspace ID Analysis:', {
              passedWorkspaceId: workspaceId,
              getCurrentWorkspaceId: currentWorkspaceId,
              topicStoreSelectedContext: topicStoreContext,
              topicStoreContextId: topicStoreContext?.id,
              topicStoreContextType: topicStoreContext?.type,
              topicStoreContextName: topicStoreContext?.name,
              areTheyEqual: workspaceId === currentWorkspaceId,
              studentData: {
                studentId: studentData.student?.id,
                studentName: studentData.student?.fullname
              },
              assignment: {
                id: assignment?.id,
                name: assignment?.name
              },
              courseId: courseId
            });

            // Use the passed workspaceId parameter instead of getCurrentWorkspaceId()
            const effectiveWorkspaceId = workspaceId || currentWorkspaceId;
            
            if (!effectiveWorkspaceId) {
              throw new Error('No workspace ID available for auto-grading');
            }

            console.log('✅ [DEBUG] Using effective workspace ID:', effectiveWorkspaceId);

            // Step 1: Download and read real student submission content
            let submissionContent = '';
            
            if (studentData.submission?.plugins) {
              const filePlugin = studentData.submission.plugins.find((p: { type: string }) => p.type === 'file');
              const submissionFiles = filePlugin?.fileareas?.find((fa: { area: string }) => fa.area === 'submission_files');
              
              if (submissionFiles?.files?.[0]) {
                const submissionFile = submissionFiles.files[0];
                
                if (!apiToken) {
                  throw new Error('API token not available for downloading submission');
                }
                
                try {
                  const result = await window.electron.fileSystem.downloadAndReadSubmission({
                    fileUrl: submissionFile.fileurl,
                    fileName: submissionFile.filename || 'submission.txt',
                    apiToken: apiToken
                  });
                  
                  if (result.success && result.content) {
                    submissionContent = result.content;
                  } else {
                    submissionContent = `Error downloading submission: ${result.error}`;
                  }
                  
                } catch (error: any) {
                  submissionContent = `Error: Could not download submission content - ${error.message}`;
                }
              } else {
                submissionContent = 'No submission content available';
              }
            } else {
              submissionContent = 'No submission available';
            }

            // Step 2: Create a chat in current workspace for auto-grading and set grading state
            const currentUser = getUserFromStore();
            const userToken = getUserTokenFromStore();
            let createdChatId: string | null = null;
            
            console.log('🔍 [DEBUG] Chat creation context:', {
              currentUser: currentUser?.id,
              effectiveWorkspaceId,
              userToken: !!userToken,
              chatName: `AutoGrade: ${assignment.name} - ${studentData.student.fullname}`
            });
            
            if (currentUser && effectiveWorkspaceId && userToken) {
              try {
                const chatName = `AutoGrade: ${assignment.name} - ${studentData.student.fullname}`;
                
                // Create new chat using electron API
                const newChatData = {
                  name: chatName,
                  created_at: new Date().toISOString(),
                  last_updated: new Date().toISOString(),
                  unread: 0,
                  workspace_id: effectiveWorkspaceId, // Use effective workspace ID
                  type: "workspace",
                  user_id: currentUser.id,
                };
                
                console.log('🔍 [DEBUG] Creating chat with data:', newChatData);
                
                const response = await window.electron.chat.create({
                  token: userToken,
                  request: newChatData
                });
                
                console.log('🔍 [DEBUG] Chat creation response:', response);
                
                if (response.data?.data?.[0]) {
                  const createdChat = response.data.data[0];
                  createdChatId = createdChat.id;
                  
                  console.log('✅ [DEBUG] Successfully created chat:', {
                    chatId: createdChatId,
                    chatName: createdChat.name,
                    workspaceId: createdChat.workspace_id
                  });
                  
                  // Set grading state to "grading" with chat information
                  get().setGradingState(
                    true, 
                    studentData.student.id, 
                    createdChatId || '', 
                    assignment.name, 
                    studentData.student.fullname
                  );
                  
                } else {
                  console.warn('⚠️ Failed to create chat for auto-grading:', response);
                }
              } catch (error) {
                console.error('❌ Error creating chat for auto-grading:', error);
                // Continue with auto-grading even if chat creation fails
              }
            } else {
              console.warn('⚠️ Cannot create chat: missing requirements:', {
                hasCurrentUser: !!currentUser,
                hasEffectiveWorkspaceId: !!effectiveWorkspaceId,
                hasUserToken: !!userToken
              });
            }
            
            // Step 3: Use AgentStore executeAgentTask for actual AI grading
            const maxGrade = assignment?.grade || 100;

            // Get MCP tools and KB settings early
            const { selectedMcpServerIds } = useMCPSettingsStore.getState();
            const { selectedKbIds } = useKBSettingsStore.getState();
            const { swarmLimits } = useAgentSettingsStore.getState();

            // Build knowledge base information for the prompt
            let knowledgeBaseInfo = '';
            if (selectedKbIds.length > 0) {
              knowledgeBaseInfo = `

**Knowledge Base Resources Available:**
- Workspace ID: ${effectiveWorkspaceId}
- Available Knowledge Bases: [${selectedKbIds.join(', ')}]
- You have access to institutional knowledge bases that may contain:
  - Course materials and references
  - Grading rubrics and examples
  - Academic standards and guidelines
  - Subject-specific resources
- Use the knowledge base tools to retrieve relevant information that can help with accurate assessment`;
            } else {
              knowledgeBaseInfo = `

**Knowledge Base Status:**
- Workspace ID: ${effectiveWorkspaceId}
- No knowledge bases currently selected for this workspace`;
            }

            // ✅ REFINED: Enhanced grading prompt with stricter output format requirements
            const gradingPrompt = `You are an expert academic grader with access to institutional knowledge bases and specialized grading tools. You are operating within workspace "${effectiveWorkspaceId}" and have access to comprehensive resources for thorough assessment.

**Context Information:**
- Workspace ID: ${effectiveWorkspaceId}
- Course ID: ${courseId}
- Institution: Academic Assessment System
- Grading Session: ${new Date().toISOString()}${knowledgeBaseInfo}

**Assignment Details:**
- Assignment: ${assignment.name}
- Student: ${studentData.student.fullname}
- Student ID: ${studentData.student.id}
- Maximum Grade: ${maxGrade}
- Course Context: ${courseId}

**Marking Scheme:**
${markingScheme.content}

**Student Submission:**
${submissionContent}

**Grading Instructions:**
1. **Use Available Resources**: Query the knowledge bases for relevant grading criteria, examples, or institutional standards that apply to this assignment type
2. **Comprehensive Analysis**: Carefully analyze the student's submission against the marking scheme and any additional institutional guidelines found in the knowledge bases
3. **Evidence-Based Assessment**: Reference specific elements from both the marking scheme and knowledge base resources in your evaluation
4. **Detailed Feedback**: Provide constructive, specific feedback that helps the student understand their performance
5. **Consistent Standards**: Ensure your grading aligns with institutional standards available in the knowledge base

**CRITICAL: Required Output Format (MUST BE EXACT):**
Your response MUST end with these two lines in exactly this format:

GRADE: [numerical grade out of ${maxGrade}]
FEEDBACK: [detailed feedback with specific references to marking criteria and knowledge base resources used]

**Quality Assurance:**
- Cross-reference your assessment with institutional standards from the knowledge base
- Ensure consistency with similar assignments if examples are available
- Provide actionable feedback for student improvement
- Justify your grade with specific evidence from the submission
- ALWAYS end with the exact GRADE: and FEEDBACK: format shown above

Begin your assessment by first consulting the available knowledge bases for relevant grading standards and examples, then proceed with the detailed evaluation. Remember to conclude with the required GRADE: and FEEDBACK: format.`;

            console.log('🤖 Executing agent task for auto-grading with enhanced knowledge base integration...');

            // Get the AgentStore instance
            const agentStore = useAgentStore.getState();

            // Get LLM configuration like Agent.ts does
            const {
              provider,
              modelId,
              openAIKey,
              deepSeekKey,
              oneasiaKey,
              ollamaBaseURL,
              temperature: configTemperature,
            } = useLLMConfigurationStore.getState();

            if (!provider || !modelId) {
              throw new Error('No model or provider selected for Agent Task.');
            }

            let allSelectedToolsFromMCPs: (OpenAI.Chat.Completions.ChatCompletionTool & { mcpServer?: string })[] = [];

            if (selectedMcpServerIds && selectedMcpServerIds.length > 0) {
              try {
                selectedMcpServerIds.forEach(serverId => {
                  const storedTools = getServiceTools(serverId);

                  if (storedTools && storedTools.length > 0) {
                    const toolsFromServer = storedTools
                      .filter(tool => {
                        const isValid = tool && typeof tool.name === 'string' && tool.inputSchema;
                        return isValid;
                      })
                      .map(tool => {
                        const formattedTool = {
                          type: "function" as const,
                          function: {
                            name: tool.name,
                            description: tool.description || "No description available.",
                            parameters: tool.inputSchema,
                          },
                          mcpServer: serverId
                        };
                        return formattedTool;
                      });
                    
                    allSelectedToolsFromMCPs.push(...toolsFromServer);
                  }
                });

                const uniqueToolsMap = new Map<string, OpenAI.Chat.Completions.ChatCompletionTool & { mcpServer?: string }>();
                allSelectedToolsFromMCPs.forEach(tool => {
                  if (tool.function && tool.function.name && !uniqueToolsMap.has(tool.function.name)) {
                    uniqueToolsMap.set(tool.function.name, tool);
                  }
                });
                allSelectedToolsFromMCPs = Array.from(uniqueToolsMap.values());
              } catch (error) {
                console.error("Error processing tools from MCPStore:", error);
              }
            }

            console.log('🔍 [DEBUG] Agent task configuration:', {
              effectiveWorkspaceId,
              createdChatId,
              toolsCount: allSelectedToolsFromMCPs.length,
              selectedKbIds: selectedKbIds.length > 0 ? selectedKbIds : "None",
              provider,
              modelId
            });

            // ✅ NEW: Create execution ID and store pending request
            const executionId = `autograde_${studentData.student.id}_${Date.now()}`;
            
            const pendingRequest: PendingGradingRequest = {
              studentData,
              markingScheme,
              assignment,
              workspaceId: effectiveWorkspaceId,
              courseId,
              maxGrade,
              executionId,
              resolve,
              reject
            };

            get().addPendingGradingRequest(executionId, pendingRequest);
            
            console.log('🎯 [AutoGrade-Store] Pending grading request added:', {
              executionId,
              studentId: studentData.student.id,
              assignmentName: assignment.name,
              totalPendingRequests: get().pendingGradingRequests.size
            });

            // Execute the agent task with proper configuration including tools
            const agentResult = await agentStore.executeAgentTask(
              gradingPrompt,
              {
                model: modelId,
                provider: provider,
                temperature: configTemperature || 0.3,
                apiKeys: {
                  openAI: openAIKey,
                  deepSeek: deepSeekKey,
                  oneasia: oneasiaKey,
                },
                ollamaConfig: {
                  baseUrl: ollamaBaseURL,
                },
                tools: allSelectedToolsFromMCPs,
                systemPrompt: `You are an expert academic grader with access to specialized tools for thorough assessment. Use available tools when they can help provide better grading analysis. ALWAYS end your response with the exact format: GRADE: [number] and FEEDBACK: [text].`,
                humanInTheLoop: false,
                threadId: executionId, // Use the same execution ID as thread ID
                executionId: executionId, // ✅ CRITICAL FIX: Pass executionId in options for workflow state
                swarmLimits: swarmLimits,
                knowledgeBases: selectedKbIds.length > 0 && effectiveWorkspaceId ? {
                  enabled: true,
                  selectedKbIds: selectedKbIds,
                  workspaceId: effectiveWorkspaceId,
                } : undefined,
              },
              createdChatId || undefined,
              effectiveWorkspaceId || undefined
            );

            console.log('🎯 [DEBUG] Agent task initiated:', {
              success: agentResult.success,
              hasResult: !!agentResult.result,
              error: agentResult.error,
              resultLength: agentResult.result?.length,
              executionId,
              pendingRequestAdded: true,
              totalPendingRequests: get().pendingGradingRequests.size
            });

            // ✅ NEW: Wait for synthesis via centralized IPCListeners
            if (agentResult.success) {
              console.log('🎯 Auto-grading agent task completed successfully. Waiting for synthesis result via centralized IPC listeners...');
              
              // Set timeout to prevent hanging
              const AUTOGRADE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
              
              setTimeout(() => {
                const request = get().getPendingGradingRequest(executionId);
                if (request) {
                  get().removePendingGradingRequest(executionId);
                  request.reject(new Error(`Auto-grading timeout after ${AUTOGRADE_TIMEOUT / 1000} seconds`));
                }
              }, AUTOGRADE_TIMEOUT);
              
            } else {
              // If agent task fails, clean up and throw error
              get().removePendingGradingRequest(executionId);
              throw new Error(`Auto-grading failed: ${agentResult.error || 'Unknown error occurred during agent task execution'}`);
            }
            
          } catch (error) {
            console.error('❌ Error in executeAutoGrade:', error);
            // Clear grading state on error
            get().clearGradingState();
            reject(error);
          }
        });
      },
      
      // Legacy methods (keep for backward compatibility)
      setAutoGradeResult: (studentId, result) =>
        set((state) => ({
          autoGradeResults: {
            ...state.autoGradeResults,
            [studentId]: {
              ...result,
              timestamp: new Date().toISOString()
            },
          },
        })),
      getAutoGradeResult: (studentId) => {
        return get().autoGradeResults[studentId];
      },
      clearAutoGradeResult: (studentId) =>
        set((state) => {
          const { [studentId]: removed, ...rest } = state.autoGradeResults;
          return { autoGradeResults: rest };
        }),
      setGradeSubmission: (key, submission) =>
        set((state) => ({
          gradeSubmissions: {
            ...state.gradeSubmissions,
            [key]: submission,
          },
        })),
      getGradeSubmission: (assignmentId, studentId) => {
        const key = `${assignmentId}-${studentId}`;
        return get().gradeSubmissions[key];
      },
      isGradePublished: (assignmentId, studentId) => {
        const submission = get().getGradeSubmission(assignmentId, studentId);
        return submission?.published || false;
      },
      refreshGradeStatus: (assignmentId, studentId, apiGrade, courseId) => {
        const key = `${assignmentId}-${studentId}`;
        if (apiGrade && apiGrade.grade > 0) {
          set((state) => ({
            gradeSubmissions: {
              ...state.gradeSubmissions,
              [key]: {
                studentId,
                assignmentId,
                courseId,
                grade: apiGrade.grade,
                feedback: apiGrade.feedback || '',
                timestamp: new Date(apiGrade.timemodified * 1000).toISOString(),
                published: true
              },
            },
          }));
        }
      },
      
      // UPDATED: Reset grade methods instead of delete
      resetUserGrade: (workspaceId, courseId, userId) =>
        set((state) => {
          if (state.workspaceGrades[workspaceId]?.[courseId]?.[userId]) {
            // Reset to initial state instead of deleting
            const resetInfo: UserGradeInfo = {
              aiGrade: '',
              currentGrade: null,
              feedback: '',
              timestamp: new Date().toISOString(),
              published: false,
            };
            
            return {
              workspaceGrades: {
                ...state.workspaceGrades,
                [workspaceId]: {
                  ...state.workspaceGrades[workspaceId],
                  [courseId]: {
                    ...state.workspaceGrades[workspaceId][courseId],
                    [userId]: resetInfo,
                  },
                },
              },
            };
          }
          return state;
        }),
      
      resetGradeSubmission: (assignmentId, studentId) =>
        set((state) => {
          const key = `${assignmentId}-${studentId}`;
          // Remove the submission entirely instead of resetting to avoid -1 values
          const { [key]: removed, ...rest } = state.gradeSubmissions;
          return {
            gradeSubmissions: rest,
          };
        }),
    }),
    {
      name: 'onlysaid-auto-grade-storage', 
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        workspaceGrades: state.workspaceGrades,
        autoGradeResults: state.autoGradeResults,
        gradeSubmissions: state.gradeSubmissions,
        gradingState: state.gradingState,
        // Note: pendingGradingRequests is not persisted as it's runtime state
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 Rehydrating AutoGrade store:', state);
        if (state?.workspaceGrades) {
          console.log('📊 Workspace grades loaded:', Object.keys(state.workspaceGrades).length, 'workspaces');
        }
        if (state?.gradingState?.isGrading) {
          console.log('🎯 Restored grading state:', state.gradingState);
        }
        // Initialize pendingGradingRequests as empty Map on rehydration
        if (state) {
          state.pendingGradingRequests = new Map();
        }
      },
    }
  )
);

// Export hooks for hierarchical structure
export const useExecuteAutoGrade = () => {
  return useAutoGradeStore((state) => state.executeAutoGrade);
};

// NEW: Hierarchical grade hooks
export const useUserGradeInfo = (workspaceId: string, courseId: string, userId: string): UserGradeInfo | undefined => {
  return useAutoGradeStore((state) => state.getUserGradeInfo(workspaceId, courseId, userId));
};

export const useSetUserGradeInfo = () => {
  return useAutoGradeStore((state) => state.setUserGradeInfo);
};

export const useUpdateUserCurrentGrade = () => {
  return useAutoGradeStore((state) => state.updateUserCurrentGrade);
};

export const useUpdateUserPublishedStatus = () => {
  return useAutoGradeStore((state) => state.updateUserPublishedStatus);
};

// NEW: Export grading synthesis handler
export const useHandleGradingSynthesis = () => {
  return useAutoGradeStore((state) => state.handleGradingSynthesis);
};

// Legacy hooks (keep for backward compatibility)
export const useAutoGradeResult = (studentId: string) => {
  return useAutoGradeStore((state) => state.getAutoGradeResult(studentId));
};

export const useGradeSubmission = (assignmentId: string, studentId: string) => {
  return useAutoGradeStore((state) => state.getGradeSubmission(assignmentId, studentId));
};

export const useIsGradePublished = (assignmentId: string, studentId: string) => {
  return useAutoGradeStore((state) => state.isGradePublished(assignmentId, studentId));
};

export const useRefreshGradeStatus = () => {
  return useAutoGradeStore((state) => state.refreshGradeStatus);
};

// UPDATED: Export hooks for grade reset
export const useResetUserGrade = () => {
  return useAutoGradeStore((state) => state.resetUserGrade);
};

export const useResetGradeSubmission = () => {
  return useAutoGradeStore((state) => state.resetGradeSubmission);
};

// Keep the old exports for backward compatibility but mark as deprecated
/** @deprecated Use useResetUserGrade instead */
export const useDeleteUserGrade = () => {
  return useAutoGradeStore((state) => state.resetUserGrade);
};

/** @deprecated Use useResetGradeSubmission instead */
export const useDeleteGradeSubmission = () => {
  return useAutoGradeStore((state) => state.resetGradeSubmission);
};

// NEW: Export grading state hooks
export const useGradingState = () => {
  return useAutoGradeStore((state) => state.gradingState);
};

export const useNavigateToGradingChat = () => {
  return useAutoGradeStore((state) => state.navigateToGradingChat);
};

export const useClearGradingState = () => {
  return useAutoGradeStore((state) => state.clearGradingState);
};

// Export types
export type { UserGradeInfo, GradingState };
