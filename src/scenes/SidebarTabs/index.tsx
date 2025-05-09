import { Box, Tooltip, IconButton } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import AddIcon from "@mui/icons-material/Add";
import GroupIcon from "@mui/icons-material/Group";
import { useState, useEffect } from "react";
import { useTopicStore, TopicContext } from "../../stores/Topic/TopicStore";
import AddTeamDialog from "../../components/Dialog/AddTeamDialog";

function SidebarTabs() {
    const { selectedContext, contexts, setSelectedContext, selectedTopics } = useTopicStore();
    const [showAddTeamDialog, setShowAddTeamDialog] = useState(false);
    // Track last visited section per workspace
    const [workspaceLastSections, setWorkspaceLastSections] = useState<Record<string, string>>({});

    const homeContext = contexts.find(context => context.name === "home" && context.type === "home") || contexts[0];

    const WorkspaceContexts = contexts.filter(context =>
        context.type === "workspace" &&
        !(context.name === "workspace" && context.type === "workspace")
    );

    // Store the last visited section when context changes
    useEffect(() => {
        if (selectedContext?.type === "workspace" && selectedContext?.section) {
            // Only store if section is defined and is a string
            setWorkspaceLastSections(prev => ({
                ...prev,
                [selectedContext.name]: selectedContext.section as string
            }));
        }
    }, [selectedContext]);

    const handleNavigate = (context: TopicContext) => {
        if (selectedContext?.name === context.name && selectedContext?.type === context.type) {
            return;
        }

        // If this is a workspace context, check for the last visited section
        if (context.type === "workspace") {
            // First check if we have a stored last section for this specific workspace
            const lastWorkspaceSection = workspaceLastSections[context.name];

            // Use the remembered section, or context.section, or default to calendar
            const sectionToUse = lastWorkspaceSection || context.section || "workspace:calendar";

            // Create a context with the section information
            const contextWithSection = {
                ...context,
                section: sectionToUse
            };

            setSelectedContext(contextWithSection);
        } else {
            setSelectedContext(context);
        }
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

                {WorkspaceContexts.map(workspaceContext => (
                    <Tooltip key={`workspace-${workspaceContext.name}`} title={`Workspace: ${workspaceContext.name}`} placement="right">
                        <Box
                            sx={{
                                borderBottom: selectedContext?.name === workspaceContext.name && selectedContext?.type === workspaceContext.type
                                    ? "3px solid"
                                    : "3px solid transparent",
                                borderColor: selectedContext?.name === workspaceContext.name && selectedContext?.type === workspaceContext.type
                                    ? "primary.main"
                                    : "transparent",
                                borderRadius: 0,
                            }}
                        >
                            <IconButton
                                color="primary"
                                size="large"
                                onClick={() => handleNavigate(workspaceContext)}
                            >
                                <GroupIcon />
                            </IconButton>
                        </Box>
                    </Tooltip>
                ))}

                <Tooltip title="Add Workspace" placement="right">
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