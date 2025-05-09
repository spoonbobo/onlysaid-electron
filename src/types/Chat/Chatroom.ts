export interface IChatRoom {
    id: string;
    created_at: string;
    last_updated: string;
    name: string;
    unread: number;
    active_users: string[];
    type: string;
}

export interface ICreateChatRequest {
    created_at: string;
    last_updated: string;
    name: string;
    unread: number;
    active_users: string[];
}

export interface ICreateChatArgs {
    token: string;
    request: ICreateChatRequest;
}

export interface IGetChatArgs {
    token: string;
    userId: string;
    type: string;
}

export interface IUpdateChatArgs {
    token: string;
    request: IChatRoom;
}
