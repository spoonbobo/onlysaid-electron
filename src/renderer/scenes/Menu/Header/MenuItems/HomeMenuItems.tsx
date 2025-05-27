import { MenuItem, ListSubheader, Divider, Tooltip, IconButton } from "@mui/material";
import { FormattedMessage } from "react-intl";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PeopleIcon from "@mui/icons-material/People";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";

type HomeMenuItemsProps = {
  handleClose: () => void;
  setSelectedCategory: (category: string) => void;
  setShowAddFriendDialog?: (show: boolean) => void;
  handleCreateChat?: () => void;
  selectedCategory: string | null;
};

function HomeMenuItems({
  handleClose,
  setSelectedCategory,
}: HomeMenuItemsProps) {
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);

  const handleCategoryClick = (category: string) => {
    try {
      setSelectedCategory(category);
      setSelectedContext({
        type: 'home',
        name: 'home',
        section: category
      });
      handleClose();
    } catch (error) {
      console.error("Error in handleCategoryClick:", error);
    }
  };

  return (
    <>
      <ListSubheader sx={{
        fontSize: 13,
        fontWeight: 700,
        color: "text.secondary",
        bgcolor: "background.paper",
        lineHeight: 2,
        px: 2
      }}>
        <FormattedMessage id="home.friends" />
      </ListSubheader>
      <MenuItem
        onClick={() => handleCategoryClick('friends')}
        sx={{ minHeight: 36, fontSize: 14 }}
      >
        <PeopleIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.home.friends" />
      </MenuItem>

      <Divider sx={{ my: 1 }} />

      <ListSubheader sx={{
        fontSize: 13,
        fontWeight: 700,
        color: "text.secondary",
        bgcolor: "background.paper",
        lineHeight: 2,
        px: 2
      }}>
        <FormattedMessage id="home.agents" />
      </ListSubheader>
      <MenuItem
        onClick={() => handleCategoryClick('agents')}
        sx={{ minHeight: 36, fontSize: 14 }}
      >
        <SmartToyIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.home.agents" />
      </MenuItem>
    </>
  );
}

// Export the function
export const renderCategoryActions = ({
  selectedCategory,
  setShowAddFriendDialog,
  handleCreateChat
}: Pick<HomeMenuItemsProps, 'selectedCategory' | 'setShowAddFriendDialog' | 'handleCreateChat'>) => {
  if (!selectedCategory) return null;

  switch (selectedCategory) {
    case 'friends':
      return (
        <Tooltip title={<FormattedMessage id="menu.home.addNewFriend" />}>
          <IconButton
            size="small"
            onClick={() => {
              setShowAddFriendDialog?.(true);
            }}
          >
            <PersonAddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    case 'agents':
      return (
        <Tooltip title={<FormattedMessage id="menu.home.newChat" />}>
          <IconButton
            size="small"
            onClick={handleCreateChat}
          >
            <SmartToyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    default:
      return null;
  }
};

export default HomeMenuItems;
