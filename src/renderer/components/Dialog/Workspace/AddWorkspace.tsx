import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Avatar,
  IconButton,
  Tabs,
  Tab
} from "@mui/material";
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useState, useEffect, useRef } from "react";
import { useTopicStore, TopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { FormattedMessage } from "react-intl";
import { getUserFromStore } from "@/utils/user";
import { useIntl } from "react-intl";
import { IWorkspace } from "@/../../types/Workspace/Workspace";

interface AddWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
  onWorkspaceAdded?: (workspace?: IWorkspace) => Promise<void>;
}

function AddWorkspaceDialog({ open, onClose, onWorkspaceAdded }: AddWorkspaceDialogProps) {
  const intl = useIntl();
  const [tabValue, setTabValue] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [workspaceImage, setWorkspaceImage] = useState<string>("/workspace-icon.png");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { addContext, setSelectedContext } = useTopicStore();
  const { createWorkspace, joinWorkspaceByInviteCode } = useWorkspaceStore();

  const generateInviteCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  useEffect(() => {
    if (open) {
      setInviteCode(generateInviteCode());
      setWorkspaceImage("/workspace-icon.png");
      setJoinInviteCode("");
      setError("");
    }
  }, [open]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError("");
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileSize(file.size);

      if (file.size > 1048576) {
        setImageError("Image size exceeds 1MB limit");
        return;
      }

      setImageError("");
      setImageFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setWorkspaceImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      setError("Workspace name is required");
      return;
    }

    try {
      const currentUser = getUserFromStore();
      const userId = currentUser?.id || "";

      const newWorkspace = await createWorkspace({
        name: workspaceName.trim(),
        image: '/workspace-icon.png', // Default image, will be replaced if imageFile exists
        imageFile, // The actual file to upload
        invite_code: inviteCode,
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        users: [userId]
      });

      resetForm();
      onClose();

      if (onWorkspaceAdded) {
        setTimeout(() => {
          onWorkspaceAdded(newWorkspace);
        }, 200);
      }
    } catch (error: any) {
      setError(error.message || "Failed to create workspace");
    }
  };

  const handleJoinWorkspace = async () => {
    if (!joinInviteCode.trim()) {
      setError("Invite code is required");
      return;
    }

    try {
      const joinedWorkspace = await joinWorkspaceByInviteCode(joinInviteCode.trim());

      const workspaceContext: TopicContext = {
        name: (joinedWorkspace.name || 'Unnamed Workspace').toLowerCase(),
        type: "workspace" as const,
        id: joinedWorkspace.id
      };

      addContext(workspaceContext);
      setSelectedContext(workspaceContext);

      if (onWorkspaceAdded) {
        onWorkspaceAdded();
      }

      resetForm();
      onClose();
    } catch (error: any) {
      setError(error.message || "Failed to join workspace");
    }
  };

  const resetForm = () => {
    setWorkspaceName("");
    setInviteCode("");
    setJoinInviteCode("");
    setWorkspaceImage("/workspace-icon.png");
    setImageFile(null);
    setError("");
    setTabValue(0);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label={<FormattedMessage id="workspace.create.title" defaultMessage="Create Workspace" />} />
          <Tab label={<FormattedMessage id="workspace.join.title" defaultMessage="Join Workspace" />} />
        </Tabs>
      </DialogTitle>
      <DialogContent>
        {tabValue === 0 ? (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <input
                type="file"
                hidden
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageChange}
              />
              <Box
                sx={{
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onClick={handleImageClick}
              >
                <Avatar
                  src={workspaceImage}
                  alt="Workspace"
                  sx={{
                    width: 80,
                    height: 80
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -8,
                    right: -8
                  }}
                >
                  <PhotoCameraIcon fontSize="small" color="primary" />
                </Box>
              </Box>
              {imageError && (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                  {imageError}
                </Typography>
              )}
            </Box>
            <Box sx={{ mt: 1 }}>
              <TextField
                autoFocus
                label={<FormattedMessage id="workspace.create.name" defaultMessage="Workspace Name" />}
                fullWidth
                value={workspaceName}
                onChange={(e) => {
                  setWorkspaceName(e.target.value);
                  setError("");
                }}
                error={!!error}
                helperText={error}
                sx={{ mb: 2 }}
              />
              <TextField
                label={<FormattedMessage id="workspace.create.inviteCode" defaultMessage="Invite Code" />}
                fullWidth
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                sx={{ mb: 2 }}
                helperText={<FormattedMessage id="workspace.create.inviteCodeHelp" defaultMessage="6-character code for others to join this workspace" />}
              />
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage id="workspace.create.description" defaultMessage="Create a new workspace to organize your content and collaborate with others." />
              </Typography>
            </Box>
          </>
        ) : (
          <Box sx={{ mt: 3 }}>
            <TextField
              autoFocus
              label={<FormattedMessage id="workspace.join.inviteCode" defaultMessage="Workspace Invite Code" />}
              fullWidth
              value={joinInviteCode}
              onChange={(e) => {
                setJoinInviteCode(e.target.value.toUpperCase());
                setError("");
              }}
              error={!!error}
              helperText={error || <FormattedMessage id="workspace.join.inviteCodeHelp" defaultMessage="Enter the 6-character invite code provided by the workspace admin" />}
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage id="workspace.join.description" defaultMessage="Join an existing workspace by entering the invite code provided by the workspace administrator." />
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>
          <FormattedMessage id="common.close" />
        </Button>
        {tabValue === 0 ? (
          <Button onClick={handleCreateWorkspace} variant="contained" color="primary">
            <FormattedMessage id="common.create" />
          </Button>
        ) : (
          <Button onClick={handleJoinWorkspace} variant="contained" color="primary">
            <FormattedMessage id="common.join" />
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default AddWorkspaceDialog;
