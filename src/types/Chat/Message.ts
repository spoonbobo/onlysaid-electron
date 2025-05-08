import { IUser } from "@/types/User/User";
import { IFile } from "../File/File";

export interface IChatMessage {
    id: string;
    created_at: string;
    sender: string;
    room_id: string;
    reactions?: IReaction[];
    reply_to?: string;
    mentions?: string[];
    files?: IFile[];
    poll?: string;
    contact?: string;
    gif?: string;
    text: string;

    sender_object?: IUser;
}

export interface IReaction {
    id: string;
    created_at: string;
    reaction: string;
    message_id: string;
    user_id: string;
}

