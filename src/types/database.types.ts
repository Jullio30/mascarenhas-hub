/* Tipos do banco do Mascarenhas Hub (espelham supabase/schema.sql e functions_rpc.sql). */

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

interface RpcDef<Args, Returns> {
  Args: Args;
  Returns: Returns;
}

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          code: string;
          host_player_id: string;
          status: string;
          current_game: string | null;
          game_config: Json;
          public_game_state: Json;
          round_number: number;
          round_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      room_players: {
        Row: {
          id: string;
          room_id: string;
          auth_user_id: string;
          nickname: string;
          avatar_id: string;
          is_ready: boolean;
          is_connected: boolean;
          match_score: number;
          session_score: number;
          crowns: number;
          joined_at: string;
          last_seen_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      catalog_items: {
        Row: { id: string; game: string; category: string | null; payload: Json };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      server_now: RpcDef<Record<string, never>, string>;
      create_room: RpcDef<{ p_nickname: string; p_avatar: string }, Json>;
      join_room: RpcDef<{ p_code: string; p_nickname: string; p_avatar: string }, Json>;
      get_room_state: RpcDef<{ p_room_id: string }, Json>;
      host_save_state: RpcDef<
        {
          p_room_id: string;
          p_public_state: Json;
          p_secret_payload: Json | null;
          p_status: string;
          p_current_game: string | null;
          p_round_number: number;
          p_round_ends_at: string | null;
        },
        null
      >;
      get_host_secret: RpcDef<{ p_room_id: string }, Json>;
      get_player_round_view: RpcDef<{ p_room_id: string }, Json>;
      get_my_round_secret: RpcDef<{ p_room_id: string }, Json>;
      claim_host_if_abandoned: RpcDef<{ p_room_id: string }, boolean>;
      transfer_host: RpcDef<{ p_room_id: string; p_new_host: string }, null>;
      kick_player: RpcDef<{ p_room_id: string; p_player_id: string }, null>;
      touch_player: RpcDef<{ p_room_id: string }, null>;
      record_submission: RpcDef<{ p_room_id: string; p_round_number: number; p_type: string; p_payload: Json }, null>;
      cleanup_expired_rooms: RpcDef<Record<string, never>, number>;
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
