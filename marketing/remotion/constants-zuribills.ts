// ─── Video Dimensions ───────────────────────────────────────────────────────
export const VIDEO_WIDTH_PX = 1920;
export const VIDEO_HEIGHT_PX = 1080;
export const VIDEO_FPS = 30;
export const TOTAL_DURATION_FRAMES = 450;

// ─── Brand Colors ───────────────────────────────────────────────────────────
export const TEAL = "#0EA5A4";
export const TEAL_LIGHT = "#14B8B7";
export const TEAL_DARK = "#0D9695";
export const DARK_BG = "#0b0b0b";
export const DARK_SURFACE = "#141414";
export const DARK_CARD = "#1e1e1e";
export const WHITE = "#ffffff";
export const WHITE_DIM = "rgba(255,255,255,0.6)";
export const WHITE_MUTED = "rgba(255,255,255,0.35)";
export const BORDER_SUBTLE = "rgba(255,255,255,0.08)";
export const SURFACE_LIGHT = "#f8fafc";
export const TEXT_PRIMARY = "#0f172a";
export const TEXT_MUTED = "#64748b";

// ─── Feature Accent Colors ─────────────────────────────────────────────────
export const ACCENT_CATALOG = "#10b981"; // emerald
export const ACCENT_AI = "#3b82f6"; // blue
export const ACCENT_PAYMENTS = "#f97316"; // orange
export const ACCENT_ANALYTICS = "#0EA5A4"; // teal

// ─── Invoice Status Colors ──────────────────────────────────────────────────
export const STATUS_PAID = "#22C55E";
export const STATUS_PENDING = "#F59E0B";
export const STATUS_OVERDUE = "#EF4444";

// ─── Scene Timing (frames) ──────────────────────────────────────────────────
// TransitionSeries overlaps transitions, so effective duration =
// sum(scenes) - sum(transitions). We size scenes so total = ~450 frames.
export const SCENE_INTRO_DURATION = 72;
export const SCENE_CATALOG_DURATION = 102;
export const SCENE_INVOICE_DURATION = 102;
export const SCENE_DASHBOARD_DURATION = 132;
export const SCENE_CTA_DURATION = 90;
export const TRANSITION_DURATION = 12;
// Effective: 72+102+102+132+90 - 4*12 = 498 - 48 = 450

// ─── Typing Animation ──────────────────────────────────────────────────────
export const CHAR_FRAMES = 2;
export const CURSOR_BLINK_FRAMES = 16;

// ─── Dashboard Layout ───────────────────────────────────────────────────────
export const SIDEBAR_WIDTH_PX = 220;
export const STATS_HEIGHT_PX = 100;
