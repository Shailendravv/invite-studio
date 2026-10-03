export const EVENT_TYPES = ["birthday", "engagement", "wedding"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Wedding ceremonies that have their own templates (still the "wedding" event type). */
export const CEREMONIES = ["haldi", "mehndi"] as const;
export type Ceremony = (typeof CEREMONIES)[number];

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface TemplateInfo {
  id: string;
  eventType: EventType;
  name: string;
  description: string;
  defaultPalette: Palette;
  /** Set for single-ceremony templates; they are only auto-picked for matching invitations. */
  ceremony?: Ceremony;
}

export const TEMPLATES = [
  {
    id: "bday-playful",
    eventType: "birthday",
    name: "Playful",
    description: "Balloons, confetti and bright colours",
    defaultPalette: { primary: "#ff5d8f", secondary: "#4cc9f0", accent: "#ffd23f", background: "#fff4e6", text: "#2b2d42" },
  },
  {
    id: "bday-elegant",
    eventType: "birthday",
    name: "Elegant",
    description: "Black and gold, minimal",
    defaultPalette: { primary: "#d4af37", secondary: "#8c7853", accent: "#f5e6c4", background: "#111111", text: "#f8f1e0" },
  },
  {
    id: "eng-traditional",
    eventType: "engagement",
    name: "Traditional",
    description: "Mandala, marigold, red and gold",
    defaultPalette: { primary: "#b3001b", secondary: "#f4a300", accent: "#ffd166", background: "#5c0010", text: "#fff3d6" },
  },
  {
    id: "eng-modern",
    eventType: "engagement",
    name: "Modern",
    description: "Soft pastels with a clean serif",
    defaultPalette: { primary: "#c9a7c7", secondary: "#a8d5ba", accent: "#b08968", background: "#fbf6f3", text: "#3d3a4b" },
  },
  {
    id: "wed-royal",
    eventType: "wedding",
    name: "Royal",
    description: "Maroon and gold, arches and diyas",
    defaultPalette: { primary: "#d4a017", secondary: "#7a0e1f", accent: "#ffcf70", background: "#3b0612", text: "#fbe8c0" },
  },
  {
    id: "wed-floral",
    eventType: "wedding",
    name: "Floral",
    description: "Soft florals, one scene per function",
    defaultPalette: { primary: "#d98b9a", secondary: "#8fb39a", accent: "#e8c07d", background: "#fff8f4", text: "#4a3b3c" },
  },
  {
    id: "eng-sapphire",
    eventType: "engagement",
    name: "Sapphire",
    description: "Deep blue and silver, light rays and a fine gold frame",
    defaultPalette: { primary: "#c8d3ee", secondary: "#4f6bd6", accent: "#e6c27a", background: "#0e1a40", text: "#eef2ff" },
  },
  {
    id: "eng-rosegold",
    eventType: "engagement",
    name: "Rose Gold",
    description: "Blush and rose gold with falling petals",
    defaultPalette: { primary: "#c98a7a", secondary: "#f3c9c4", accent: "#b76e79", background: "#fdf2ee", text: "#4a3033" },
  },
  {
    id: "wed-peacock",
    eventType: "wedding",
    name: "Peacock",
    description: "Teal and gold with a fan of peacock feathers",
    defaultPalette: { primary: "#d4af37", secondary: "#14919b", accent: "#7fe0d0", background: "#062a2e", text: "#f4ecd0" },
  },
  {
    id: "wed-midnight",
    eventType: "wedding",
    name: "Midnight",
    description: "Navy and champagne gold, one scene per function",
    defaultPalette: { primary: "#e6c98b", secondary: "#3a4a8c", accent: "#f7e7c1", background: "#0b1030", text: "#f3ecdc" },
  },
  {
    id: "haldi-marigold",
    eventType: "wedding",
    ceremony: "haldi",
    name: "Haldi Marigold",
    description: "Sunny yellow with marigold garlands",
    defaultPalette: { primary: "#f2a900", secondary: "#c2410c", accent: "#2f7d32", background: "#fff3b0", text: "#4a2c00" },
  },
  {
    id: "haldi-glow",
    eventType: "wedding",
    ceremony: "haldi",
    name: "Haldi Glow",
    description: "Turmeric gold, diya glow and drifting petals",
    defaultPalette: { primary: "#e6a400", secondary: "#c2570c", accent: "#7ea43a", background: "#fbd24a", text: "#3f2600" },
  },
  {
    id: "mehndi-henna",
    eventType: "wedding",
    ceremony: "mehndi",
    name: "Mehndi Henna",
    description: "Deep green with cream henna vines",
    defaultPalette: { primary: "#e3cf9a", secondary: "#8bc34a", accent: "#e8a34f", background: "#16301f", text: "#f3ead2" },
  },
  {
    id: "mehndi-paisley",
    eventType: "wedding",
    ceremony: "mehndi",
    name: "Mehndi Paisley",
    description: "Cream and terracotta with henna paisleys",
    defaultPalette: { primary: "#8b4a2b", secondary: "#c8743f", accent: "#b3541e", background: "#fbf1e1", text: "#3a2216" },
  },
] as const satisfies readonly TemplateInfo[];

export type TemplateId = (typeof TEMPLATES)[number]["id"];
export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id) as [TemplateId, ...TemplateId[]];

export function templatesFor(eventType: EventType): TemplateInfo[] {
  return TEMPLATES.filter((t) => t.eventType === eventType);
}

export function getTemplate(id: string): TemplateInfo | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
