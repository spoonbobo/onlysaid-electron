import HelpDialog from "@/components/Dialog/HelpDialog";
import { TopicContext } from "@/stores/Topic/TopicStore";
import { IntlShape } from "react-intl";

export interface HelpItemIds {
  titleId: string;
  textId: string;
}

export interface HelpItem {
  title: string;
  text: string;
}

export const generalHelpItemIds: HelpItemIds[] = [
  { titleId: "help.addingTabs", textId: "help.addingTabsDescription" },
  { titleId: "help.closingTabs", textId: "help.closingTabsDescription" },
  { titleId: "help.switchingTabs", textId: "help.switchingTabsDescription" },
  { titleId: "help.reorderingTabs", textId: "help.reorderingTabsDescription" },
  { titleId: "help.inbox", textId: "help.inboxDescription" },
];

export const homeHelpItemIds: HelpItemIds[] = [
  { titleId: "help.homeOverview", textId: "help.homeOverviewDescription" },
  { titleId: "help.personalTopics", textId: "help.personalTopicsDescription" },
  ...generalHelpItemIds.slice(0, 4),
];

export const teamHelpItemIds: HelpItemIds[] = [
  { titleId: "help.teamOverview", textId: "help.teamOverviewDescription" },
  { titleId: "help.teamCollaboration", textId: "help.teamCollaborationDescription" },
  { titleId: "help.switchingTeams", textId: "help.switchingTeamsDescription" },
];

export const settingsHelpItemIds: HelpItemIds[] = [
  { titleId: "help.settingsOverview", textId: "help.settingsOverviewDescription" },
  { titleId: "help.accountManagement", textId: "help.accountManagementDescription" },
  { titleId: "help.appearance", textId: "help.appearanceDescription" },
];

export const helpItemIdsByContextType: Record<string, HelpItemIds[]> = {
  home: homeHelpItemIds,
  team: teamHelpItemIds,
  settings: settingsHelpItemIds,
  general: generalHelpItemIds,
};

export const getHelpItemsForContext = (context: TopicContext | null, intl: IntlShape): HelpItem[] => {
  let itemIds: HelpItemIds[];
  if (!context || !context.type || !helpItemIdsByContextType[context.type]) {
    itemIds = generalHelpItemIds;
  } else {
    itemIds = helpItemIdsByContextType[context.type];
  }

  return itemIds.map(item => ({
    title: intl.formatMessage({ id: item.titleId }),
    text: intl.formatMessage({ id: item.textId }),
  }));
};

export const getHelpTitleForContext = (context: TopicContext | null, intl: IntlShape): string => {
  let titleId: string;
  if (!context || !context.type) {
    titleId = "help.generalHelp";
  } else {
    switch (context.type) {
      case 'home':
        titleId = "help.homeHelp";
        break;
      case 'team':
        titleId = "help.teamHelp";
        break;
      case 'settings':
        titleId = "help.settingsHelp";
        break;
      default:
        titleId = "help.generalHelp";
    }
  }
  return intl.formatMessage({ id: titleId });
}

export default HelpDialog;