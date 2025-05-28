import { MenuItem, ListSubheader, Divider, Tooltip, IconButton, Badge, Box } from "@mui/material";
import { FormattedMessage } from "react-intl";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PeopleIcon from "@mui/icons-material/People";
import HomeIcon from "@mui/icons-material/Home";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";

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
  const { getHomeSectionNotificationCount } = useNotificationStore();

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

  // Get notification counts for each section
  const homepageCount = getHomeSectionNotificationCount('homepage');
  const friendsCount = getHomeSectionNotificationCount('friends');
  const agentsCount = getHomeSectionNotificationCount('agents');

  return (
    <>
      <MenuItem
        onClick={() => handleCategoryClick('homepage')}
        sx={{ minHeight: 36, fontSize: 14 }}
      >
        <HomeIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <FormattedMessage id="menu.home.homepage" />
          {homepageCount > 0 && (
            <Badge
              badgeContent={homepageCount}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  height: 16,
                  minWidth: 16
                }
              }}
            >
              <Box sx={{ width: 8 }} />
            </Badge>
          )}
        </Box>
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
        <FormattedMessage id="home.messaging" />
      </ListSubheader>
      <MenuItem
        onClick={() => handleCategoryClick('friends')}
        sx={{ minHeight: 36, fontSize: 14 }}
      >
        <PeopleIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <FormattedMessage id="menu.home.friends" />
          {friendsCount > 0 && (
            <Badge
              badgeContent={friendsCount}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  height: 16,
                  minWidth: 16
                }
              }}
            >
              <Box sx={{ width: 8 }} />
            </Badge>
          )}
        </Box>
      </MenuItem>
      <MenuItem
        onClick={() => handleCategoryClick('agents')}
        sx={{ minHeight: 36, fontSize: 14 }}
      >
        <SmartToyIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <FormattedMessage id="menu.home.agents" />
          {agentsCount > 0 && (
            <Badge
              badgeContent={agentsCount}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  height: 16,
                  minWidth: 16
                }
              }}
            >
              <Box sx={{ width: 8 }} />
            </Badge>
          )}
        </Box>
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
