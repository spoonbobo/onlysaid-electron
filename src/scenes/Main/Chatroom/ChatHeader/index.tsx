import { Box, Typography } from "@mui/material";

interface ChatHeaderProps {
    selectedGroup: string | undefined;
    selectedTopic: string | null;
}

function ChatHeader({ selectedGroup, selectedTopic }: ChatHeaderProps) {
    return (
        <Box sx={{
            px: 3,
            py: 0.5,
            minHeight: 36,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center"
        }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                {selectedGroup && selectedTopic
                    ? `# ${selectedGroup} / ${selectedTopic}`
                    : "# showcase"}
            </Typography>
        </Box>
    );
}

export default ChatHeader;
