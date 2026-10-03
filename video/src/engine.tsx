import React from "react";
import { AbsoluteFill, Html5Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { EventSpec, WeddingFunction } from "@invite/shared/schema";
import { getTemplate, type Palette } from "@invite/shared/templates";
import { Divider, Icon } from "./art/art";
import { Enter, SceneFade, type EntranceKind } from "./components/anim";
import { CONTENT_WIDTH, FitLine, FontGate, Paragraph, SAFE_X, SAFE_Y, WidthContext, type TextStyle } from "./components/text";
import { birthdayLine, displayTime, label, wordingLines } from "./i18n";
import { buildTimeline, HEIGHT, type Scene, type Timeline } from "./timeline";

export interface ThemeStyles {
  headline: TextStyle;
  name: TextStyle;
  body: TextStyle;
  label: TextStyle;
  value: TextStyle;
  accent: TextStyle;
  small: TextStyle;
}

export interface Theme {
  /** Static art behind everything (driven by the global frame). */
  Background: React.FC<{ p: Palette; spec: EventSpec; timeline: Timeline }>;
  /** Art drawn above the text (garlands, confetti...). Keep it out of the text area. */
  Overlay?: React.FC<{ p: Palette; spec: EventSpec; timeline: Timeline }>;
  styles: (p: Palette, spec: EventSpec) => ThemeStyles;
  entrance: EntranceKind;
  divider: (p: Palette) => React.ReactNode;
  /** Art shown above the names (rings, cake...). */
  namesDecor?: (p: Palette, spec: EventSpec) => React.ReactNode;
  /** Art shown above the blessing line on the intro scene (only when the spec has a blessing line). */
  blessingDecor?: (p: Palette, spec: EventSpec) => React.ReactNode;
  /** Art shown above the date, time and venue on the details scene (a kalash...). */
  detailsDecor?: (p: Palette, spec: EventSpec) => React.ReactNode;
  /** Tighter details scene for templates with a small text area (gap between rows in px, default 44; largest value size, default 84). */
  detailsGap?: number;
  detailsValueMax?: number;
  /** Baraat scene (wedding templates that opt in via timeline.ts): hero art above the function name... */
  celebrationHero?: (p: Palette, spec: EventSpec) => React.ReactNode;
  /** ...and secondary art placed absolutely around the text (dhol, shehnai...). */
  celebrationExtras?: (p: Palette, spec: EventSpec) => React.ReactNode;
  /** Extra vertical margin inside the safe area (px) when art occupies the top/bottom. */
  contentTop?: number;
  contentBottom?: number;
  nameMax?: number;
  iconColor?: (p: Palette) => string;
  /** Optional panel behind text for contrast on busy art. */
  panel?: (p: Palette) => React.CSSProperties | undefined;
}

export function resolvePalette(spec: EventSpec): Palette {
  return spec.palette ?? getTemplate(spec.templateId)!.defaultPalette;
}

const PANEL_PAD = 44;

const Content: React.FC<{ theme: Theme; p: Palette; children: React.ReactNode; gap?: number }> = ({ theme, p, children, gap = 34 }) => {
  const top = SAFE_Y + (theme.contentTop ?? 0);
  const bottom = SAFE_Y + (theme.contentBottom ?? 0);
  const panel = theme.panel?.(p);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE_X,
        right: SAFE_X,
        top,
        bottom,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap,
      }}
    >
      {panel ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap, padding: `56px ${PANEL_PAD}px`, borderRadius: 36, width: "100%", boxSizing: "border-box", ...panel }}>
          <WidthContext.Provider value={CONTENT_WIDTH - PANEL_PAD * 2}>{children}</WidthContext.Provider>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

/** Height available for content, used to size paragraphs. */
function contentHeight(theme: Theme): number {
  return HEIGHT - SAFE_Y * 2 - (theme.contentTop ?? 0) - (theme.contentBottom ?? 0);
}

// ------------------------------------------------------------------ scenes

const IntroScene: React.FC<{ spec: EventSpec; theme: Theme; s: ThemeStyles; p: Palette }> = ({ spec, theme, s, p }) => {
  const h = wordingLines(spec, "headline");
  return (
    <Content theme={theme} p={p}>
      {spec.blessingLine && theme.blessingDecor && <Enter kind="pop">{theme.blessingDecor(p, spec)}</Enter>}
      {spec.blessingLine && (
        <Enter kind="fade">
          <FitLine text={spec.blessingLine} style={s.accent} max={56} min={30} />
        </Enter>
      )}
      <Enter delay={8} kind={theme.entrance}>
        <FitLine text={h.main} style={s.headline} max={150} min={60} maxLines={2} />
      </Enter>
      {h.secondary && (
        <Enter delay={18} kind={theme.entrance}>
          <FitLine text={h.secondary} style={s.headline} max={120} min={50} maxLines={2} />
        </Enter>
      )}
      <Enter delay={26} kind="fade">
        {theme.divider(p)}
      </Enter>
    </Content>
  );
};

const NamesScene: React.FC<{ spec: EventSpec; theme: Theme; s: ThemeStyles; p: Palette }> = ({ spec, theme, s, p }) => {
  const max = theme.nameMax ?? 190;
  if (spec.eventType === "birthday") {
    const ageLine = birthdayLine(spec.age, spec);
    return (
      <Content theme={theme} p={p} gap={28}>
        {theme.namesDecor && <Enter kind="pop">{theme.namesDecor(p, spec)}</Enter>}
        <Enter delay={10} kind={theme.entrance}>
          <FitLine text={spec.personName} style={s.name} max={max} min={70} maxLines={2} />
        </Enter>
        {ageLine && (
          <Enter delay={22} kind="rise">
            <FitLine text={ageLine} style={s.accent} max={84} min={40} />
          </Enter>
        )}
      </Content>
    );
  }
  const joiner = spec.language === "hi" ? "संग" : "&";
  return (
    <Content theme={theme} p={p} gap={14}>
      {theme.namesDecor && <Enter kind="pop">{theme.namesDecor(p, spec)}</Enter>}
      <Enter delay={8} kind={theme.entrance}>
        <FitLine text={spec.groomName} style={s.name} max={max} min={70} maxLines={2} />
        {spec.groomFamily && <FitLine text={spec.groomFamily} style={s.small} max={40} min={26} />}
      </Enter>
      <Enter delay={20} kind="pop">
        <FitLine text={joiner} style={s.accent} max={110} min={60} />
      </Enter>
      <Enter delay={30} kind={theme.entrance}>
        <FitLine text={spec.brideName} style={s.name} max={max} min={70} maxLines={2} />
        {spec.brideFamily && <FitLine text={spec.brideFamily} style={s.small} max={40} min={26} />}
      </Enter>
    </Content>
  );
};

const InvitationScene: React.FC<{ spec: EventSpec; theme: Theme; s: ThemeStyles; p: Palette }> = ({ spec, theme, s, p }) => {
  const inv = wordingLines(spec, "invitation");
  const h = contentHeight(theme);
  return (
    <Content theme={theme} p={p} gap={40}>
      <Enter kind={theme.entrance}>
        <Paragraph text={inv.main} style={s.body} max={88} min={38} height={inv.secondary ? h * 0.32 : h * 0.5} />
      </Enter>
      {inv.secondary && (
        <>
          <Enter delay={12} kind="fade">
            {theme.divider(p)}
          </Enter>
          <Enter delay={20} kind={theme.entrance}>
            <Paragraph text={inv.secondary} style={s.body} max={64} min={34} height={h * 0.3} />
          </Enter>
        </>
      )}
    </Content>
  );
};

const DetailRow: React.FC<{ icon: "calendar" | "clock" | "pin"; title: string; value: string; extra?: string; s: ThemeStyles; color: string; delay: number; kind: EntranceKind; valueMax?: number }> = ({
  icon,
  title,
  value,
  extra,
  s,
  color,
  delay,
  kind,
  valueMax = 84,
}) => (
  <Enter delay={delay} kind={kind} style={{ gap: 6 }}>
    <Icon kind={icon} color={color} size={60} />
    <FitLine text={title} style={s.label} max={40} min={24} />
    <FitLine text={value} style={s.value} max={valueMax} min={38} />
    {extra && <Paragraph text={extra} style={s.small} max={44} min={26} height={120} />}
  </Enter>
);

const DetailsScene: React.FC<{ spec: EventSpec; theme: Theme; s: ThemeStyles; p: Palette }> = ({ spec, theme, s, p }) => {
  const color = theme.iconColor?.(p) ?? p.primary;
  return (
    <Content theme={theme} p={p} gap={theme.detailsGap ?? 44}>
      {theme.detailsDecor && <Enter kind="pop">{theme.detailsDecor(p, spec)}</Enter>}
      <DetailRow icon="calendar" title={label(spec, "date")} value={spec.displayDate} s={s} color={color} delay={0} kind={theme.entrance} valueMax={theme.detailsValueMax} />
      <DetailRow icon="clock" title={label(spec, "time")} value={displayTime(spec.time, spec)} s={s} color={color} delay={12} kind={theme.entrance} valueMax={theme.detailsValueMax} />
      <DetailRow icon="pin" title={label(spec, "venue")} value={spec.venueName} extra={spec.venueAddress} s={s} color={color} delay={24} kind={theme.entrance} valueMax={theme.detailsValueMax} />
    </Content>
  );
};

function functionVenue(spec: EventSpec, f: WeddingFunction): string {
  return f.venueName || spec.venueName;
}

const FunctionsListScene: React.FC<{ spec: EventSpec & { eventType: "wedding" }; theme: Theme; s: ThemeStyles; p: Palette }> = ({ spec, theme, s, p }) => {
  const fns = spec.functions ?? [];
  // A framed template (small content area) with a long list gets tighter rows so the list stays inside the frame.
  const compact = fns.length * 190 + 130 > contentHeight(theme);
  return (
    <Content theme={theme} p={p} gap={compact ? 14 : 30}>
      <Enter kind="fade">
        <FitLine text={label(spec, "functions")} style={s.headline} max={compact ? 72 : 90} min={44} />
      </Enter>
      {fns.map((f, i) => (
        <Enter key={i} delay={10 + i * 10} kind={theme.entrance} style={{ gap: 2 }}>
          <FitLine text={f.name} style={s.accent} max={compact ? 52 : 64} min={32} />
          <FitLine text={[f.displayDate, displayTime(f.time, spec)].filter(Boolean).join("  ·  ")} style={s.value} max={compact ? 38 : 44} min={26} />
          <FitLine text={functionVenue(spec, f)} style={s.small} max={compact ? 32 : 36} min={22} />
        </Enter>
      ))}
    </Content>
  );
};

const FunctionScene: React.FC<{ spec: EventSpec & { eventType: "wedding" }; index: number; theme: Theme; s: ThemeStyles; p: Palette }> = ({ spec, index, theme, s, p }) => {
  const f = (spec.functions ?? [])[index];
  if (!f) return null;
  const color = theme.iconColor?.(p) ?? p.primary;
  return (
    <Content theme={theme} p={p} gap={36}>
      <Enter kind={theme.entrance}>
        <FitLine text={f.name} style={s.name} max={150} min={60} />
      </Enter>
      <Enter delay={8} kind="fade">
        {theme.divider(p)}
      </Enter>
      <DetailRow icon="calendar" title={label(spec, "date")} value={f.displayDate} s={s} color={color} delay={14} kind={theme.entrance} valueMax={64} />
      {f.time && <DetailRow icon="clock" title={label(spec, "time")} value={displayTime(f.time, spec)} s={s} color={color} delay={22} kind={theme.entrance} valueMax={64} />}
      <DetailRow icon="pin" title={label(spec, "venue")} value={functionVenue(spec, f)} extra={f.venueName ? f.venueAddress : undefined} s={s} color={color} delay={30} kind={theme.entrance} valueMax={60} />
    </Content>
  );
};

const CelebrationScene: React.FC<{ spec: EventSpec & { eventType: "wedding" }; index: number; theme: Theme; s: ThemeStyles; p: Palette }> = ({ spec, index, theme, s, p }) => {
  const f = (spec.functions ?? [])[index];
  if (!f) return null;
  return (
    <>
      {theme.celebrationExtras?.(p, spec)}
      <Content theme={theme} p={p} gap={26}>
        {theme.celebrationHero && <Enter kind="pop">{theme.celebrationHero(p, spec)}</Enter>}
        <Enter delay={10} kind={theme.entrance}>
          <FitLine text={f.name} style={s.name} max={130} min={60} />
        </Enter>
        <Enter delay={18} kind="fade">
          {theme.divider(p)}
        </Enter>
        <Enter delay={24} kind={theme.entrance} style={{ gap: 6 }}>
          <FitLine text={[f.displayDate, displayTime(f.time, spec)].filter(Boolean).join("  ·  ")} style={s.value} max={50} min={28} />
          <FitLine text={functionVenue(spec, f)} style={s.small} max={40} min={24} />
        </Enter>
      </Content>
    </>
  );
};

const PhotoScene: React.FC<{ spec: EventSpec; index: number; duration: number; theme: Theme; p: Palette }> = ({ spec, index, duration, theme, p }) => {
  const frame = useCurrentFrame();
  const src = (spec.photos ?? [])[index];
  if (!src) return null;
  const zoom = interpolate(frame, [0, duration], [1.0, 1.08]);
  const w = CONTENT_WIDTH * 0.92;
  const h = Math.min(w * 1.3, contentHeight(theme) * 0.85);
  return (
    <Content theme={theme} p={p}>
      <Enter kind="pop">
        <div style={{ width: w, height: h, borderRadius: 28, overflow: "hidden", border: `10px solid ${p.primary}`, boxShadow: "0 30px 80px rgba(0,0,0,0.35)" }}>
          <Img src={src.startsWith("http") ? src : staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
        </div>
      </Enter>
    </Content>
  );
};

const ClosingScene: React.FC<{ spec: EventSpec; theme: Theme; s: ThemeStyles; p: Palette }> = ({ spec, theme, s, p }) => {
  const c = wordingLines(spec, "closing");
  const h = contentHeight(theme);
  const host = spec.eventType === "birthday" ? spec.hostedBy : undefined;
  return (
    <Content theme={theme} p={p} gap={34}>
      <Enter kind={theme.entrance}>
        <Paragraph text={c.main} style={s.headline} max={96} min={44} height={h * 0.26} />
      </Enter>
      {c.secondary && (
        <Enter delay={10} kind={theme.entrance}>
          <Paragraph text={c.secondary} style={s.headline} max={76} min={38} height={h * 0.2} />
        </Enter>
      )}
      <Enter delay={18} kind="fade">
        {theme.divider(p)}
      </Enter>
      {host && (
        <Enter delay={24} kind="rise" style={{ gap: 4 }}>
          <FitLine text={label(spec, "hostedBy")} style={s.label} max={36} min={24} />
          <FitLine text={host} style={s.value} max={60} min={32} />
        </Enter>
      )}
      {spec.rsvp && (
        <Enter delay={32} kind="rise" style={{ gap: 4 }}>
          <FitLine text={label(spec, "rsvp")} style={s.label} max={36} min={24} />
          <Paragraph text={spec.rsvp} style={s.value} max={50} min={28} height={140} />
        </Enter>
      )}
    </Content>
  );
};

// ------------------------------------------------------------------ composition

function renderScene(scene: Scene, spec: EventSpec, theme: Theme, s: ThemeStyles, p: Palette) {
  switch (scene.id) {
    case "intro":
      return <IntroScene spec={spec} theme={theme} s={s} p={p} />;
    case "names":
      return <NamesScene spec={spec} theme={theme} s={s} p={p} />;
    case "invitation":
      return <InvitationScene spec={spec} theme={theme} s={s} p={p} />;
    case "details":
      return <DetailsScene spec={spec} theme={theme} s={s} p={p} />;
    case "functions":
      return spec.eventType === "wedding" ? <FunctionsListScene spec={spec} theme={theme} s={s} p={p} /> : null;
    case "function":
      return spec.eventType === "wedding" ? <FunctionScene spec={spec} index={scene.index} theme={theme} s={s} p={p} /> : null;
    case "celebration":
      return spec.eventType === "wedding" ? <CelebrationScene spec={spec} index={scene.index} theme={theme} s={s} p={p} /> : null;
    case "photo":
      return <PhotoScene spec={spec} index={scene.index} duration={scene.duration} theme={theme} p={p} />;
    case "closing":
      return <ClosingScene spec={spec} theme={theme} s={s} p={p} />;
  }
}

export const InvitationVideo: React.FC<{ spec: EventSpec; theme: Theme }> = ({ spec, theme }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const timeline = buildTimeline(spec, fps);
  const p = resolvePalette(spec);
  const s = theme.styles(p, spec);
  const { Background, Overlay } = theme;
  return (
    <AbsoluteFill style={{ backgroundColor: p.background, overflow: "hidden" }}>
      <FontGate>
        <Background p={p} spec={spec} timeline={timeline} />
        {timeline.scenes.map((scene) => (
          <Sequence key={`${scene.id}-${scene.index}`} from={scene.from} durationInFrames={scene.duration} name={`${scene.id}${scene.index ? ` ${scene.index + 1}` : ""}`}>
            <SceneFade duration={scene.duration}>{renderScene(scene, spec, theme, s, p)}</SceneFade>
          </Sequence>
        ))}
        {Overlay && <Overlay p={p} spec={spec} timeline={timeline} />}
        {spec.audio && (
          <Html5Audio
            src={spec.audio.file.startsWith("http") ? spec.audio.file : staticFile(spec.audio.file)}
            volume={(f) =>
              interpolate(f, [0, fps, durationInFrames - fps * 2, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            }
          />
        )}
      </FontGate>
    </AbsoluteFill>
  );
};

/** Divider helper most themes reuse. */
export const simpleDivider = (variant: "dots" | "diamond" | "leaf") => (p: Palette) => <Divider color={p.primary} variant={variant} />;
