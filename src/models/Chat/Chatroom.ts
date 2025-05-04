export interface IChatRoom {
  id: string;
  created_at: string;
  last_updated: string;
  name: string;
  unread: number;
  active_users: string[];
}

export interface CreateChatroomArgs {
  token: string;
  created_at: string;
  last_updated: string;
  name: string;
  unread: number;
  active_users: string[];
}