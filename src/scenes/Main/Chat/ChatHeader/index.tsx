import { Box, Typography, Stack } from "@mui/material";
import { useChatStore } from "@/stores/Chat/chatStore";
import { TopicContext } from "@/stores/Topic/TopicStore";
import { WindowTab } from "@/stores/Topic/WindowStore";
import { useIntl } from "react-intl";

interface ChatHeaderProps {
  selectedContext: TopicContext | null;
  selectedGroup: string | undefined;
  selectedTopic: string | null;
  parentTab?: WindowTab;
}

function ChatHeader({ selectedContext, selectedGroup, selectedTopic, parentTab }: ChatHeaderProps) {
  const headerKey = parentTab?.id || "no-parent";
  const intl = useIntl();
  const rooms = useChatStore(state => state.rooms);
  const chatRoom = rooms.find(room => room.id === selectedTopic);
  const chatName = chatRoom?.name || selectedTopic;

  return (
    <Box
      key={headerKey}
      sx={{
        px: 2,
        py: 1.5,
        height: "auto",
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "flex-start"
      }}
    >
      {selectedContext && selectedGroup && selectedTopic ? (
        <Stack direction="column" spacing={0.5}>
          {/* <Typography variant="caption" sx={{ color: "text.secondary" }}>
            # {intl.formatMessage({ id: "context.home", defaultMessage: "Home" })}
            / {intl.formatMessage({ id: `${selectedContext.type}.${selectedGroup}`, defaultMessage: selectedContext.type })}
          </Typography> */}
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {chatName}
          </Typography>
        </Stack>
      ) : (
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          # No chat selected
        </Typography>
      )}
    </Box>
  );
}

export default ChatHeader;
