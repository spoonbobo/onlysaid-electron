import Chat from "./Chat";
import Settings from "./Settings";
import Default from "./default";
import HomePage from "./HomePage";
import FileExplorer from "./FileExplorer";
import AdminPanel from "./Admin";
import Portal from "./Portal";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { Box, Typography } from "@mui/material";
import Playground from "@/renderer/scenes/Main/Docs";
import Calendar from "@/renderer/scenes/Main/Calendar";
import Members from "@/renderer/scenes/Main/Workspace/Members/index";
import KnowledgeBase from "@/renderer/scenes/Main/Settings/KnowledgeBase";
import WorkspaceSettings from "@/renderer/scenes/Main/Workspace/Settings/index";
import WorkspaceInsights from "@/renderer/scenes/Main/Workspace/Insights/index";
import Avatar from "@/renderer/scenes/Main/Workspace/Avatar/index";
import MyPartner from "./Workspace/MyPartner";
import Docs from "./Docs";

function Main() {
  const { selectedContext } = useTopicStore();

  const contextTypeToRender = selectedContext?.type || "home";
  const contextSection = selectedContext?.section;
  const workspaceId = selectedContext?.id;

  const getWorkspaceComponent = (section: string) => {
    switch (section) {
      case "workspace:chatroom":
        return <Chat />;
      case "workspace:avatar":
        return <Avatar />;
      case "workspace:plans":
        return <Default section="Plans" />;
      case "workspace:exit":
        return <Default section="Exit Workspace" />;
      case "workspace:members":
        return <Members workspaceId={workspaceId || ""} />;
      case "workspace:knowledgeBase":
        return <KnowledgeBase />;
      case "workspace:workspaceSettings":
        return <WorkspaceSettings />;
      case "workspace:workspaceGeneralSettings":
        return <Default section="Workspace General Settings" />;
      case "workspace:insights":
        return <WorkspaceInsights />;
      case "workspace:learningPartner":
        return <MyPartner />;
      default:
        return <Default section={section} />;
    }
  };

  const getHomeComponent = (section?: string) => {
    switch (section) {
      case "homepage":
        return <HomePage />;
      case "friends":
        return <Default section="Friends" />;
      case "agents":
        return <Chat />;
      default:
        return <Default section={section} />;
    }
  };

  // Determine what to render
  let componentToRender: React.ReactNode;

  if (contextTypeToRender === "workspace") {
    componentToRender = getWorkspaceComponent(contextSection || "");
  } else if (contextTypeToRender === "calendar") {
    componentToRender = <Calendar />;
  } else if (contextTypeToRender === "home") {
    componentToRender = getHomeComponent(contextSection);
  } else {
    const menuComponents: Record<string, React.ReactNode> = {
      settings: <Settings />,
      playground: <Playground />,
      docs: <Docs />,
      file: <FileExplorer />,
      admin: <AdminPanel />,
      portal: <Portal />,
    };
    componentToRender = menuComponents[contextTypeToRender] || <Default section={contextTypeToRender} />;
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
