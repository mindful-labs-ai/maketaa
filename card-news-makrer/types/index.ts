/**
 * Unified Type Definitions for Canvas Editor
 * All types used across the application are defined here
 */

// ============================================================================
// Card Types
// ============================================================================

export interface CardSpecMeta {
  id: string;
  topic: string;
  angle?: string;
  target_persona?: string;
  created_at: string; // ISO 8601
  status: CardSpecStatus;
  sources?: string[];
}

export interface CardText {
  headline: string; // max 15 chars
  body?: string; // max 50 chars
  sub_text?: string;
}

export type CardRole =
  | 'cover'
  | 'empathy'
  | 'cause'
  | 'insight'
  | 'solution'
  | 'tip'
  | 'closing'
  | 'source'
  | 'cta';

export type CardLayout =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'split';

export type CardSpecStatus = 'draft' | 'review' | 'approved' | 'published';

export interface ColorPalette {
  primary?: string; // hex color
  secondary?: string;
  text?: string;
  background?: string;
}

export interface FontStyle {
  headline_family?: string;
  headline_size?: number;
  body_family?: string;
  body_size?: number;
}

export interface CardStyle {
  layout?: CardLayout;
  color_palette?: ColorPalette;
  font?: FontStyle;
}

export interface CardBackground {
  type: 'image' | 'gradient' | 'solid';
  src?: string | null;
  prompt?: string | null;
  overlay_opacity?: number; // 0-1
}

export interface Card {
  index: number;
  role: CardRole;
  text: CardText;
  style: CardStyle;
  background: CardBackground;
}

export interface SnsConfig {
  instagram?: {
    caption: string;
    hashtags?: string[];
  };
  threads?: {
    text: string;
  };
}

export interface CardSpec {
  meta: CardSpecMeta;
  cards: Card[];
  sns: SnsConfig;
}

// ============================================================================
// Database Record Types
// ============================================================================

export interface CardSpecRecord {
  id: string;
  owner_id: string;
  topic: string;
  status: CardSpecStatus;
  spec: CardSpec; // JSONB column
  created_at: string;
  updated_at: string;
}

export interface EditLog {
  id: number;
  spec_id: string;
  editor: string; // "human" | "system" | agent_id
  field_path: string; // e.g., "cards[2].text.headline"
  old_value: string | null;
  new_value: string;
  change_reason?: string;
  created_at: string;
}

export interface PublishReport {
  id: number;
  spec_id: string;
  platform: 'instagram' | 'threads';
  post_url?: string | null;
  post_id?: string | null;
  status: 'pending' | 'published' | 'failed';
  error_message?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Store Types
// ============================================================================

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type EditorMode = 'view' | 'edit' | 'approve';

// ============================================================================
// Component Props Types
// ============================================================================

export interface CardCanvasProps {
  card: Card;
  selectedTextIndex?: number;
  onTextClick?: (fieldName: string) => void;
}

export interface HeaderProps {
  specId: string;
}

export interface FooterProps {
  specId: string;
}

export interface CardListProps {
  // Can be extended with props as needed
}

export interface SortableCardItemProps {
  card: Card;
  isSelected: boolean;
  onClick: (index: number) => void;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface CardSpecResponse extends CardSpecRecord {}

// ============================================================================
// Form & Validation Types
// ============================================================================

export interface CardUpdatePayload {
  card: Partial<Card>;
  fieldPath: string;
  oldValue: string | null;
  newValue: string;
}

export interface StatusUpdatePayload {
  specId: string;
  status: CardSpecStatus;
}

export interface CardReorderPayload {
  specId: string;
  fromIndex: number;
  toIndex: number;
}
