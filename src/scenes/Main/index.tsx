import Chat from "./Chat";
import Settings from "./Settings";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { Box, Typography } from "@mui/material";
import Playground from "@/components/Debug/Playground";
import Calendar from "@/scenes/Main/Calendar";
import Members from "@/scenes/Main/Workspace/Members";

function Main() {
  const { selectedContext } = useTopicStore();

  const contextTypeToRender = selectedContext?.type || "home";
  const contextSection = selectedContext?.section;
  const workspaceName = selectedContext?.name || "workspace";
  const workspaceId = selectedContext?.id;

  const getWorkspaceComponent = (section: string) => {
    switch (section) {
      case "workspace:chatroom":
        return <Chat />;
      case "workspace:calendar":
        return <Calendar />;
      case "workspace:plans":
        return <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Plans for {workspaceId}</Typography>
          <Typography>This feature is coming soon</Typography>
        </Box>;
      case "workspace:exit":
        return <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Exit {workspaceId}</Typography>
          <Typography>This feature is coming soon</Typography>
        </Box>;
      case "workspace:members":
        return <Members workspaceId={workspaceId || ""} />;
      default:
        return <Chat />;
    }
  };

  // Determine what to render
  let componentToRender: React.ReactNode;

  if (contextTypeToRender === "workspace") {
    if (contextSection) {
      componentToRender = getWorkspaceComponent(contextSection);
    } else {
      componentToRender = <Chat />;
    }
  } else {
    const menuComponents: Record<string, React.ReactNode> = {
      home: <Chat />,
      settings: <Settings />,
      playground: <Playground />,
    };
    componentToRender = menuComponents[contextTypeToRender] || menuComponents.home;
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {componentToRender}
      </Box>
    </Box>
  );
}

export default Main;
