export interface Participant {
  _id: string;
  username: string;
  display_name?: string;
  timezone?: number;
  game?: {
    accounts: string[];
    preferences?: {
      account?: string | null;
      stash_page?: number | null;
      public_stash_pages?: number[];
      is_hardcore?: boolean;
      is_ladder?: boolean;
      notifications_chat?: boolean;
      notifications_market?: boolean;
      discord_market?: boolean;
      preferred_contact_method?: string;
    };
    beta_accounts?: string[];
  };
  created_at: string;
}

export interface Message {
  _id: string;
  sender_id: string;
  conversation_id: string;
  content: string;
  reader_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_id: string;
  updated_by_id?: string;
  sender?: Participant;
  conversation?: {
    _id: string;
    participant_ids: string[];
    created_at: string;
    updated_at: string;
    created_by_id: string;
  };
}

export interface Conversation {
  _id: string;
  participant_ids: string[];
  created_at: string;
  updated_at: string;
  created_by_id: string;
  unread_count: number;
  participants: Participant[];
  latest_message?: Message;
}

export interface ConversationListResponse {
  total: number;
  limit: number;
  skip: number;
  data: Conversation[];
}

export interface MessageListResponse {
  total: number;
  limit: number;
  skip: number;
  data: Message[];
}

