export interface IChatroom {
    id: string;
    name: string;
    description: string;
}

export interface IChatroomSelection {
    [groupName: string]: string | null;
}