import { Box, Chip } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SettingsIcon from "@mui/icons-material/Settings";
import ChatIcon from "@mui/icons-material/Chat";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { useMemo } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import WorkspaceChatMenu from "./Chat";

export default function WorkspaceMenu() {
    const { selectedContext } = useCurrentTopicContext();

    const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
    const menuKey = `${contextId}`;
    const section = selectedContext?.section || '';

    const sectionName = useMemo(() => {
        if (!section) return "";
        const parts = section.split(':');
        return parts.length > 1 ? parts[1] : section;
    }, [section]);

    const getSectionIcon = () => {
        if (section.includes('calendar')) return <CalendarMonthIcon fontSize="small" />;
        if (section.includes('plans')) return <SettingsIcon fontSize="small" />;
        if (section.includes('chat')) return <ChatIcon fontSize="small" />;
        if (section.includes('exit')) return <ExitToAppIcon fontSize="small" />;
        return null;
    };

    const sectionIcon = getSectionIcon();

    return (
        <Box key={menuKey} sx={{ mt: 2, px: 2 }}>


            {section.includes('chat') && <WorkspaceChatMenu />}
        </Box>
    );
}