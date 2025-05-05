import { IUser } from "@/models/User/User";

export interface IChatMessage {
  id: string;
  created_at: string;
  sender: string;
  avatar: string;
  room_id: string;
  reactions?: string[];
  reply_to?: string;
  mentions?: string[];
  image?: string;
  video?: string;
  audio?: string;
  poll?: string;
  contact?: string;
  gif?: string;
  text: string;

  sender_object?: IUser;
}