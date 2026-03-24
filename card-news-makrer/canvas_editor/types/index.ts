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
  headline: string;        // max 30 chars
  body?: string;           // max 150 chars
  sub_text?: string;       // max 100 chars
  description?: string;    // max 300 chars
  quote?: string;          // max 200 chars
  bullet_points?: string[]; // each item max 100 chars
}

export type CardRole = 'cover' | 'content' | 'end';

export type ContentLayout = 'basic' | 'memo';

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
  content_layout?: ContentLayout; // only for 'content' role: 'basic' (default) or 'memo' (bullet list style)
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
  canvas_ratio?: '1:1' | '4:5' | '9:16'; // Default: '1:1'
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

// ============================================================================
// v2.2 — Create Flow Types
// ============================================================================

export type CreateStep = 'topic' | 'purpose' | 'design' | 'generating';

export interface TopicSuggestion {
  title: string;
  description: string;
  tags: string[];
}

export interface TopicSelection {
  source: 'ai-suggested' | 'user-input';
  title: string;
  description?: string;
  tags?: string[];
}

export type ContentPurpose = 'informational' | 'action-driven' | 'auto';

export interface CtaConfig {
  type: 'link' | 'follow' | 'comment' | 'custom';
  text: string;
  url?: string;
  description?: string;
}

export interface PurposeConfig {
  type: ContentPurpose;
  cta?: CtaConfig;
}

export interface CreateFlowState {
  currentStep: CreateStep;
  topic: TopicSelection | null;
  purpose: PurposeConfig | null;
  designTemplateId: string | null;
}

// ============================================================================
// v2.2 — Design Template Types
// ============================================================================

export interface DesignTemplateMarker {
  type: 'dot' | 'line';
  color: string;
  size: number;
  position: { top: number; left: number };
}

export interface DesignTemplateBrandArea {
  text: string;
  position: 'bottom-center';
  font_family: string;
  font_size: number;
  color: string;
}

export interface TemplateTextColors {
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
}

export interface TemplateConfig {
  background: { type: 'solid'; color: string } | { type: 'gradient'; colors: string[] };
  accent_color: string;
  text_colors: TemplateTextColors;
  typography: {
    headline_family: string;
    body_family: string;
    headline_weight: number;
    body_weight: number;
  };
  layout_defaults: {
    text_align: 'left' | 'center';
    padding: { x: number; y: number };
    marker?: DesignTemplateMarker;
    brand_area?: DesignTemplateBrandArea;
  };
  role_overrides: Partial<Record<CardRole, RoleLayoutOverride>>;
}

export interface RoleLayoutOverride {
  text_align?: 'left' | 'center';
  headline_size?: number;
  body_size?: number;
  sub_text_size?: number;
  headline_top?: number;
  body_top?: number;
  line_height?: number;
  has_background_box?: boolean;
  background_box_color?: string;
  has_image_area?: boolean;
  image_area_height?: number;
}

export interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  config: TemplateConfig;
}

// ============================================================================
// v2.2 — AI Generation Types
// ============================================================================

export interface GenerateCardNewsRequest {
  topic: TopicSelection;
  purpose: PurposeConfig;
  template_id: string;
  canvas_ratio?: '1:1' | '4:5' | '9:16';
}

export interface GenerateCardNewsResponse {
  spec: CardSpec;
  generation_meta: {
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
  };
}
