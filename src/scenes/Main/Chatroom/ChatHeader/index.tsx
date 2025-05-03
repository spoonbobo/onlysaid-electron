import { Box, Typography } from "@mui/material";

interface ChatHeaderProps {
  selectedGroup: string | undefined;
  selectedTopic: string | null;
}

function ChatHeader({ selectedGroup, selectedTopic }: ChatHeaderProps) {
  return (
    <Box sx={{
      px: 2,
      py: 1.5,
      height: "auto", // TODO: replace with static design system
      borderBottom: 1,
      borderColor: "divider",
      display: "flex",
      alignItems: "center"
    }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
        {selectedGroup && selectedTopic
          ? `# ${selectedGroup} / ${selectedTopic}`
          : "# NULL"}
      </Typography>
    </Box>
  );
}

export default ChatHeader;
