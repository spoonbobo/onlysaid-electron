import { Box, Chip } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SettingsIcon from "@mui/icons-material/Settings";
import ChatIcon from "@mui/icons-material/Chat";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { useMemo } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";

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
        return undefined;
    };

    const sectionIcon = getSectionIcon();

    return (
        <Box key={menuKey} sx={{ mt: 2, px: 2 }}>
            {sectionName && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Chip
                        {...sectionIcon ? { icon: sectionIcon } : {}}
                        label={sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}
                        color="primary"
                        variant="outlined"
                        sx={{
                            fontWeight: 'bold',
                            textTransform: 'capitalize',
                            px: 1,
                            '& .MuiChip-label': { px: 1 }
                        }}
                    />
                </Box>
            )}
        </Box>
    );
}