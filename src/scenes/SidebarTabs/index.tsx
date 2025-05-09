import { Box, Tooltip, IconButton } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import AddIcon from "@mui/icons-material/Add";
import GroupIcon from "@mui/icons-material/Group";
import { useState } from "react";
import { useTopicStore, TopicContext } from "../../stores/Topic/TopicStore";
import AddTeamDialog from "../../components/Dialog/AddTeamDialog";

function SidebarTabs() {
    const { selectedContext, contexts, setSelectedContext } = useTopicStore();
    const [showAddTeamDialog, setShowAddTeamDialog] = useState(false);

    const homeContext = contexts.find(context => context.name === "home" && context.type === "home") || contexts[0];

    const teamContexts = contexts.filter(context =>
        context.type === "team" &&
        !(context.name === "team" && context.type === "team")
    );

    const handleNavigate = (context: TopicContext) => {
        if (selectedContext?.name === context.name && selectedContext?.type === context.type) {
            return;
        }

        setSelectedContext(context);
    };

    const handleAddTeam = () => {
        setShowAddTeamDialog(true);
    };

    return (
        <>
            <Box
                sx={{
                    width: 72,
                    height: "100%",
                    bgcolor: "background.paper",
                    borderRight: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    py: 2,
                    gap: 2
                }}
            >
                <Tooltip title="Home" placement="right">
                    <Box
                        sx={{
                            borderBottom: selectedContext?.name === "home" && selectedContext?.type === "home"
                                ? "3px solid"
                                : "3px solid transparent",
                            borderColor: selectedContext?.name === "home" && selectedContext?.type === "home"
                                ? "primary.main"
                                : "transparent",
                            borderRadius: 0,
                        }}
                    >
                        <IconButton
                            color="primary"
                            size="large"
                            onClick={() => handleNavigate(homeContext)}
                        >
                            <HomeIcon />
                        </IconButton>
                    </Box>
                </Tooltip>

                {teamContexts.map(teamContext => (
                    <Tooltip key={`team-${teamContext.name}`} title={`Team: ${teamContext.name}`} placement="right">
                        <Box
                            sx={{
                                borderBottom: selectedContext?.name === teamContext.name && selectedContext?.type === teamContext.type
                                    ? "3px solid"
                                    : "3px solid transparent",
                                borderColor: selectedContext?.name === teamContext.name && selectedContext?.type === teamContext.type
                                    ? "primary.main"
                                    : "transparent",
                                borderRadius: 0,
                            }}
                        >
                            <IconButton
                                color="primary"
                                size="large"
                                onClick={() => handleNavigate(teamContext)}
                            >
                                <GroupIcon />
                            </IconButton>
                        </Box>
                    </Tooltip>
                ))}

                <Tooltip title="Add Team" placement="right">
                    <Box>
                        <IconButton
                            color="primary"
                            size="large"
                            onClick={handleAddTeam}
                        >
                            <AddIcon />
                        </IconButton>
                    </Box>
                </Tooltip>
            </Box>

            <AddTeamDialog
                open={showAddTeamDialog}
                onClose={() => setShowAddTeamDialog(false)}
            />
        </>
    );
}

export default SidebarTabs;