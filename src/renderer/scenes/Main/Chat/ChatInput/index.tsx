import { useState, useCallback, useEffect } from "react";
import { Box, Typography, alpha, IconButton } from "@mui/material";
import { Theme } from "@mui/material/styles";
import MessageTextField from "@/renderer/components/Chat/MessageTextField";
import ActionButtons from "./ActionButtons";
import AttachmentPreview from "@/renderer/components/Attachments";
import FileDrop from "./FileDrop";
import { IChatMessage } from "@/../../types/Chat/Message";
import CloseIcon from '@mui/icons-material/Close';
import { IFile } from "@/../../types/File/File";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { getUserTokenFromStore } from "@/utils/user";
import { getCurrentWorkspace } from "@/utils/workspace";
import { toast } from "@/utils/toast";
import { useSocketStore } from "@/renderer/stores/Socket/SocketStore";

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSend: (message: Partial<IChatMessage>) => void;
  disabled?: boolean;
  replyingTo?: IChatMessage | null;
  onCancelReply?: () => void;
}

function ChatInput({
  input,
  setInput,
  handleSend,
  disabled = false,
  replyingTo = null,
  onCancelReply
}: ChatInputProps) {
  const [isSending, setIsSending] = useState(false);
  const { attachments, setAttachment, clearAttachments } = useCurrentTopicContext();
  const { modelName, provider, modelId } = useLLMConfigurationStore();

  // Add state to track processing operationIds
  const [processingOperationIds, setProcessingOperationIds] = useState<Record<string, string>>({});

  // Use socket store for file progress with logging
  const { fileProgress } = useSocketStore();

  // Enhanced progress tracking with smooth transitions
  useEffect(() => {
    Object.entries(fileProgress).forEach(([operationId, progress]) => {
      // If this is a staged operation (has stage property)
      if (progress.stage) {
        // Find which attachment might be associated with this
        Object.entries(attachments).forEach(([type, attachment]) => {
          if (attachment.operationId && !processingOperationIds[attachment.operationId]) {
            // Link the upload operationId to the processing operationId
            setProcessingOperationIds(prev => ({
              ...prev,
              [attachment.operationId]: operationId
            }));

            // Only switch if the processing has meaningful progress or upload is truly complete
            if (progress.progress > 0 || progress.stage === 'complete') {
              setAttachment(type, attachment.file, operationId, attachment.uploadedFile);
              console.log(`🔄 Switching progress tracking from ${attachment.operationId} to ${operationId}`);
            }
          }
        });
      }
    });
  }, [fileProgress, attachments, setAttachment]);

  const handleAttachment = async (type: string, value: string | File) => {
    if (value instanceof File) {
      handleFileDrop(type, value);
    }
  };

  const handleFileDrop = async (type: string, file: File, uploadedFile?: IFile) => {
    if (uploadedFile) {
      setAttachment(type, file, undefined, uploadedFile);
    } else {
      toast.info(`Uploading: ${file.name}`);

      const token = getUserTokenFromStore();
      const workspace = getCurrentWorkspace();

      if (!token || !workspace) {
        toast.error("Authentication token or workspace not found. Cannot upload file.");
        return;
      }

      try {
        const fileData = await readFileAsDataURL(file);
        const metadata = {
          targetPath: `chat-uploads/${file.name}`,
        };

        // ✅ Set attachment immediately with operationId (even before upload starts)
        const tempOperationId = `temp-${Date.now()}`;
        setAttachment(type, file, tempOperationId);

        const response = await window.electron.fileSystem.uploadFile({
          workspaceId: workspace.id,
          fileData,
          fileName: file.name,
          token,
          metadata
        });

        if (response.error) {
          toast.error(`Upload failed for ${file.name}: ${response.error}`);
          removeAttachment(type); // Remove the temp attachment
          return;
        }

        if (response.operationId) {
          // ✅ Update with real operation ID immediately
          setAttachment(type, file, response.operationId);
          console.log('🔄 Starting upload with operationId:', response.operationId);

          // Enhanced status monitoring
          const checkStatus = async () => {
            try {
              const status = await window.electron.fileSystem.getStatus(response.operationId);

              if (status?.status === 'completed' && status.result?.data) {
                // Don't immediately switch - wait for backend processing to start with meaningful progress
                const waitForProcessing = () => {
                  const processingOpId = processingOperationIds[response.operationId];
                  const processingProgress = processingOpId ? fileProgress[processingOpId] : null;

                  // Only complete when processing is truly done OR no processing stage exists
                  if (!processingOpId || (processingProgress && processingProgress.progress === 100 && processingProgress.stage === 'complete')) {
                    const uploadedFile: IFile = {
                      id: status.result.data.id,
                      workspace_id: workspace.id,
                      name: file.name,
                      size: file.size,
                      mime_type: file.type,
                      path: status.result.data.path || metadata.targetPath,
                      created_at: status.result.data.created_at || new Date().toISOString(),
                      metadata,
                      logicalPath: metadata.targetPath
                    };

                    setAttachment(type, file, undefined, uploadedFile);
                    toast.success(`Upload completed: ${file.name}`);
                  } else if (processingOpId && processingProgress && processingProgress.progress < 100) {
                    // Keep waiting for backend processing
                    setTimeout(waitForProcessing, 500);
                  } else {
                    // No processing stage or initial wait
                    setTimeout(waitForProcessing, 1000);
                  }
                };

                waitForProcessing();
                return;
              } else if (status?.status === 'failed') {
                const errorMsg = status.error || 'Unknown error';
                let userFriendlyError = errorMsg;
                if (errorMsg.includes('413') || errorMsg.includes('Payload Too Large')) {
                  userFriendlyError = `File "${file.name}" is too large. Please try a smaller file.`;
                } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
                  userFriendlyError = `Upload failed: Authentication error. Please try again.`;
                } else if (errorMsg.includes('500')) {
                  userFriendlyError = `Upload failed: Server error. Please try again later.`;
                }

                setAttachment(type, file, response.operationId, null, 'failed');
                toast.error(userFriendlyError);
                return;
              } else if (status?.status === 'processing' || status?.status === 'pending') {
                setTimeout(checkStatus, 1000);
              } else {
                console.warn('Stopping polling for unknown status:', status);
                return;
              }
            } catch (error) {
              console.error('Error checking upload status:', error);
              setAttachment(type, file, response.operationId, null, 'failed');
              toast.error(`Upload monitoring failed for ${file.name}: ${error}`);
            }
          };

          setTimeout(checkStatus, 500);
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}: ${error}`);
        removeAttachment(type); // Remove the temp attachment
      }
    }
  };

  const removeAttachment = (type: string) => {
    const newAttachments = { ...attachments };
    delete newAttachments[type];

    if (Object.keys(newAttachments).length === 0) {
      clearAttachments();
    } else {
      clearAttachments();
      setTimeout(() => {
        Object.entries(newAttachments).forEach(([t, att]) => {
          setAttachment(t, att.file || att, att.operationId, att.uploadedFile);
        });
      }, 0);
    }
  };

  const handleSendMessage = useCallback(async () => {
    if ((!input.trim() && !Object.keys(attachments).length) || disabled || isSending) return;

    try {
      setIsSending(true);

      const fileIds: string[] = [];
      for (const [type, attachment] of Object.entries(attachments)) {
        const uploadedFileData = attachment.uploadedFile;

        if (!uploadedFileData || !uploadedFileData.id) {
          toast.warning(`File is still uploading. Please wait for upload to complete.`);
          continue;
        }

        fileIds.push(uploadedFileData.id);
      }

      const message: Partial<IChatMessage> = {
        text: input.trim(),
        reply_to: replyingTo?.id,
        file_ids: fileIds.length > 0 ? JSON.stringify(fileIds) : undefined
      };

      handleSend(message);
      setInput('');
      clearAttachments();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [input, attachments, disabled, handleSend, isSending, replyingTo, setInput, clearAttachments]);

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  return (
    <Box
      sx={{
        px: 0.5,
        pt: 2,
        pb: 0.5,
        bgcolor: theme => alpha(theme.palette.background.default, 0.8),
        backdropFilter: "blur(8px)",
      }}
    >
      <FileDrop
        onDrop={handleFileDrop}
        sx={{
          width: "100%",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: (theme: Theme) => `0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
          "&:focus-within": {
            boxShadow: (theme: Theme) => `0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`
          }
        }}
      >
        <Box
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {replyingTo && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: theme => alpha(theme.palette.primary.light, 0.1),
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'flex-start',
                position: 'relative',
              }}
            >
              <Box sx={{ width: '90%', pr: 4 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Reply to {replyingTo.sender_object?.username || 'User'}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.85rem',
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {replyingTo.text}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={onCancelReply}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <AttachmentPreview
            attachments={attachments}
            uploadProgress={fileProgress}
            onRemove={removeAttachment}
          />

          <MessageTextField
            input={input}
            setInput={setInput}
            onSend={handleSendMessage}
            disabled={disabled}
          />
          <ActionButtons
            input={input}
            onSend={handleSendMessage}
            disabled={disabled}
            isSending={isSending}
            onAttachment={handleAttachment}
            hasAttachments={Object.keys(attachments).length > 0}
          />
        </Box>
      </FileDrop>
    </Box>
  );
}

export default ChatInput;
