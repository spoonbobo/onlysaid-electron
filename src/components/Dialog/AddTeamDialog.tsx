import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography
} from "@mui/material";
import { useState } from "react";
import { useTopicStore, TopicContext } from "@/stores/Topic/TopicStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";
import { FormattedMessage } from "react-intl";

interface AddTeamDialogProps {
  open: boolean;
  onClose: () => void;
}

function AddTeamDialog({ open, onClose }: AddTeamDialogProps) {
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const { addContext, setSelectedContext } = useTopicStore();
  const { updateActiveTabContext } = useWindowStore();

  const handleCreateTeam = () => {
    // Validate
    if (!teamName.trim()) {
      setError("Team name is required");
      return;
    }

    // Create the new team context
    const newTeamContext: TopicContext = {
      name: teamName.trim().toLowerCase(),
      type: "team" as const
    };

    // Add to contexts
    addContext(newTeamContext);

    // Set as selected context
    setSelectedContext(newTeamContext);

    // Update active tab context
    updateActiveTabContext(newTeamContext);

    // Close the dialog
    setTeamName("");
    setError("");
    onClose();
  };

  const handleCancel = () => {
    setTeamName("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <FormattedMessage id="team.create.title" />
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <TextField
            autoFocus
            label={<FormattedMessage id="team.create.name" />}
            fullWidth
            value={teamName}
            onChange={(e) => {
              setTeamName(e.target.value);
              setError("");
            }}
            error={!!error}
            helperText={error}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage id="team.create.description" />
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>
          <FormattedMessage id="common.close" />
        </Button>
        <Button onClick={handleCreateTeam} variant="contained" color="primary">
          <FormattedMessage id="common.create" />
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddTeamDialog;
