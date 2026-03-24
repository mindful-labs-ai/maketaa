/**
 * Database Type Definitions for Supabase
 * Auto-generated types for database schema
 */

import type {
  CardSpec,
  CardSpecRecord,
  EditLog,
  PublishReport,
  CardSpecStatus,
} from '@/types';

export type Database = {
  public: {
    Tables: {
      card_specs: {
        Row: CardSpecRecord;
        Insert: Omit<CardSpecRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CardSpecRecord, 'id' | 'created_at' | 'updated_at'>>;
      };
      edit_logs: {
        Row: EditLog;
        Insert: Omit<EditLog, 'id' | 'created_at'>;
        Update: never;
      };
      publish_reports: {
        Row: PublishReport;
        Insert: Omit<PublishReport, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PublishReport, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
