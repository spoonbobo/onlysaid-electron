import { Box } from "@mui/material";
import { useTopicStore } from "../../stores/Topic/TopicStore";
import { Tooltip, IconButton } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import AddIcon from "@mui/icons-material/Add";

function Tabs() {
  const { selectedContext, contexts, setSelectedContext } = useTopicStore();

  // Find the home context or use the first context in the list
  const homeContext = contexts.find(context => context.name === "home" && context.type === "home") || contexts[0];
  console.log("homeContext:", homeContext);

  return (
    <Box
      sx={{
        width: 72,
        height: "100vh",
        bgcolor: "background.paper",
        borderRight: "1px solid #eee",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 2,
        gap: 2,
      }}
    >
      <Tooltip title="Home" placement="right">
        <Box
          sx={{
            borderBottom: selectedContext?.name === homeContext.name && selectedContext?.type === homeContext.type
              ? "3px solid"
              : "3px solid transparent",
            borderColor: selectedContext?.name === homeContext.name && selectedContext?.type === homeContext.type
              ? "primary.main"
              : "transparent",
            borderRadius: 0,
          }}
        >
          <IconButton
            color="primary"
            size="large"
            onClick={() => setSelectedContext(homeContext)}
          >
            <HomeIcon />
          </IconButton>
        </Box>
      </Tooltip>
      <Tooltip title="Add" placement="right">
        <Box>
          <IconButton color="primary" size="large">
            <AddIcon />
          </IconButton>
        </Box>
      </Tooltip>
    </Box>
  );
}

export default Tabs;