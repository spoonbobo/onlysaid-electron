export interface IChatMessage {
    id: string;
    created_at: string;
    sender: string;
    content: string;
    avatar: string;
    room_id: string;
    reactions?: string[];
    reply_to?: string;
    mentions?: string[];
    attachments?: string[];
}