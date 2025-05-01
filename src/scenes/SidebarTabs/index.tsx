import { Box, Tooltip, IconButton } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import AddIcon from "@mui/icons-material/Add";
import GroupIcon from "@mui/icons-material/Group";
import { useState } from "react";
import { useTopicStore, TopicContext } from "../../stores/Topic/TopicStore";
import { useWindowStore } from "../../stores/Topic/WindowStore";
import AddTeamDialog from "./AddTeamDialog";

function SidebarTabs() {
  const { selectedContext, contexts, setSelectedContext } = useTopicStore();
  const { updateActiveTabContext, addTab } = useWindowStore();
  const [showAddTeamDialog, setShowAddTeamDialog] = useState(false);

  // Find the home context or use the first context in the list
  const homeContext = contexts.find(context => context.name === "home" && context.type === "home") || contexts[0];

  // Get all team contexts from API in the future
  // For now, filter out any default team contexts since we want to leave it empty
  const teamContexts = contexts.filter(context =>
    context.type === "team" &&
    // Filter out any default team context
    !(context.name === "team" && context.type === "team")
  );

  // Handle navigation to a context
  const handleNavigate = (context: TopicContext) => {
    setSelectedContext(context);
    updateActiveTabContext(context);
  };

  // Handle add team button click
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
          borderRight: "1px solid #eee",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 2,
          gap: 2
        }}
      >
        {/* Home Icon */}
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

        {/* Team Icons - Will be populated from API in the future */}
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

        {/* Add Team Button */}
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

      {/* Add Team Dialog */}
      <AddTeamDialog
        open={showAddTeamDialog}
        onClose={() => setShowAddTeamDialog(false)}
      />
    </>
  );
}

export default SidebarTabs;
