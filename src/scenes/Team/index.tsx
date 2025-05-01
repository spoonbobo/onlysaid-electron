import { Box, IconButton, Tooltip } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import AddIcon from "@mui/icons-material/Add";
import { useTeamChoice } from "../../stores/Team/TeamChoice";
import { useMenuStore, MenuItems } from "../../stores/Menu/MenuStore";

function Team() {
  const { selectedTeam, setSelectedTeam } = useTeamChoice();
  const { selectedMenu, setSelectedMenu } = useMenuStore();

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
            borderBottom: selectedTeam === 0 ? "3px solid" : "3px solid transparent",
            borderColor: selectedTeam === 0 ? "primary.main" : "transparent",
            borderRadius: 0,
          }}
        >
          <IconButton
            color="primary"
            size="large"
            onClick={() => setSelectedTeam(0)}
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

export default Team;