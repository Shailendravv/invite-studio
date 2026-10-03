import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { WeddingSpec } from "@invite/shared/schema";
import type { Palette } from "@invite/shared/templates";
import { Blobs, Divider, DiyaRow, FloralCorner, LineFrame, Mandala, Rings, Sparkles, StarBursts } from "../art/art";
import {
  BaaratHorse,
  Dhol,
  GaneshaBlessing,
  Jharokha,
  Jhummar,
  MandapPillar,
  PeacockFan,
  PeacockFeatherSvg,
  Place,
  PurnaKalash,
  RoyalChhatri,
  RoyalElephant,
  Shehnai,
  type FeatherColors,
} from "../art/svg-motifs";
import { alpha, mix, readable } from "../color";
import { InvitationVideo, type Theme } from "../engine";
import { F } from "../fonts";
import { HEIGHT, WIDTH } from "../timeline";

// ------------------------------------------------------------------ wed-royal

/** The jharokha frame (arch, Ganesha, pillars, plinth, diyas) sits this far below its natural position, leaving the top for the elephant and chhatri and the bottom clear. */
const ROYAL_DROP = 150;

const RoyalBackground: Theme["Background"] = ({ p }) => {
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${mix(p.background, p.secondary, 0.7)}, ${p.background} 72%)` }}>
      {/* faint repeating motifs */}
      <svg style={{ position: "absolute", inset: 0 }} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} opacity={0.07}>
        {Array.from({ length: 6 * 10 }).map((_, i) => {
          const x = (i % 6) * 200 + ((Math.floor(i / 6) % 2) * 100);
          const y = Math.floor(i / 6) * 200;
          return <path key={i} d={`M ${x} ${y - 30} Q ${x + 30} ${y} ${x} ${y + 30} Q ${x - 30} ${y} ${x} ${y - 30} Z`} fill={p.primary} />;
        })}
      </svg>
      {/* sparkles stay out of the text column inside the frame */}
      <Sparkles color={p.accent} count={26} seed="ry" size={14} avoid={{ left: 120, right: 960, top: 630 + ROYAL_DROP, bottom: 1590 + ROYAL_DROP }} />
      <StarBursts
        color={p.primary}
        stars={[
          { x: 1000, y: 470 + ROYAL_DROP, size: 84, delay: 60 },
          { x: 230, y: 672 + ROYAL_DROP, size: 70, delay: 70 },
          { x: 850, y: 672 + ROYAL_DROP, size: 70, delay: 76 },
          { x: 50, y: 960 + ROYAL_DROP, size: 70, delay: 82 },
          { x: 1030, y: 960 + ROYAL_DROP, size: 70, delay: 88 },
          { x: 50, y: 1390 + ROYAL_DROP, size: 66, delay: 94 },
          { x: 1030, y: 1390 + ROYAL_DROP, size: 66, delay: 100 },
        ]}
      />
      <Place left={-120} top={90 + ROYAL_DROP} width={1320} height={1650}>
        <Jharokha color={p.primary} fill={p.accent} glow={p.accent} pendant={false} />
      </Place>
      {/* Ganesha is the hero of the arch cap (he replaces the swinging pendant) and stays on every scene */}
      <Place left={WIDTH / 2 - 180} top={225 + ROYAL_DROP} width={360} height={420}>
        <GaneshaBlessing color={p.primary} fill={p.accent} glow={p.accent} height={420} delay={24} strength={2.6} />
      </Place>
      {/* mandap pillars stand on the plinth along both inner sides */}
      <Place left={-60} top={981 + ROYAL_DROP} width={260} height={650} opacity={0.6}>
        <MandapPillar color={p.primary} fill={p.accent} delay={40} />
      </Place>
      <Place left={WIDTH - 200} top={981 + ROYAL_DROP} width={260} height={650} opacity={0.6}>
        <MandapPillar color={p.primary} fill={p.accent} delay={46} />
      </Place>
      {/* small corner pieces */}
      <Place left={24} top={40} width={290} height={290} opacity={0.85}>
        <RoyalElephant color={p.primary} fill={p.accent} delay={70} />
      </Place>
      <Place left={WIDTH - 280} top={30} width={250} height={285} opacity={0.85}>
        <RoyalChhatri color={p.primary} fill={p.accent} delay={76} />
      </Place>
    </AbsoluteFill>
  );
};

/** The diyas stand inside the jharokha on its plinth line, so they fade in once the plinth has been drawn. */
const RoyalDiyas: Theme["Overlay"] = ({ p }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: interpolate(frame, [36, 56], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
      <DiyaRow y={1568 + ROYAL_DROP} x0={250} x1={830} size={0.8} body={mix(p.secondary, "#a0522d", 0.5)} rim={p.primary} />
    </AbsoluteFill>
  );
};

const SpinningMandala: React.FC<{ color: string; accent: string; size?: number }> = ({ color, accent, size = 170 }) => {
  const frame = useCurrentFrame();
  return <Mandala size={size} color={color} accent={accent} rotation={frame * 0.4} />;
};

const royal: Theme = {
  entrance: "unfold",
  // Text sits inside the jharokha frame (below the arch cusp, above the plinth).
  contentTop: 496 + ROYAL_DROP,
  contentBottom: 290 - ROYAL_DROP,
  nameMax: 150,
  panel: () => ({}),
  detailsGap: 12,
  detailsValueMax: 58,
  Background: RoyalBackground,
  Overlay: RoyalDiyas,
  styles: (p) => {
    const text = readable(p.text, p.background);
    const goldGrad = `linear-gradient(180deg, ${mix(p.accent, "#ffffff", 0.35)} 0%, ${p.primary} 60%, ${mix(p.primary, "#7a4a00", 0.4)} 100%)`;
    return {
      headline: { fontFamily: F.cinzel, weight: 700, color: p.primary, gradient: goldGrad, uppercase: true, letterSpacingEm: 0.08 },
      name: { fontFamily: F.greatVibes, color: p.primary, gradient: goldGrad, lineHeight: 1.3, shadow: "0 6px 16px rgba(0,0,0,0.45)" },
      body: { fontFamily: F.cormorant, weight: 500, italic: true, color: text, lineHeight: 1.45 },
      label: { fontFamily: F.cinzel, weight: 500, color: readable(p.primary, p.background, 3), uppercase: true, letterSpacingEm: 0.22 },
      value: { fontFamily: F.cormorant, weight: 700, color: text },
      accent: { fontFamily: F.greatVibes, color: readable(p.accent, p.background, 3) },
      small: { fontFamily: F.cormorant, weight: 500, color: alpha(text, 0.85) },
    };
  },
  divider: (p) => <Divider color={p.primary} variant="diamond" />,
  namesDecor: (p) => <SpinningMandala color={p.primary} accent={p.accent} size={120} />,
  detailsDecor: (p) => (
    <div style={{ width: 124, height: 165 }}>
      <PurnaKalash color={p.primary} fill={p.accent} />
    </div>
  ),
  celebrationHero: (p) => (
    <div style={{ width: 340, height: 340 }}>
      <BaaratHorse color={p.primary} fill={p.accent} accent={p.accent} />
    </div>
  ),
  celebrationExtras: (p) => (
    <>
      {/* dhol and shehnai flank the horse (below the text sit the diyas) */}
      <Place left={150} top={850 + ROYAL_DROP} width={150} height={94} opacity={0.85}>
        <Dhol color={p.primary} fill={p.accent} delay={24} />
      </Place>
      <Place left={WIDTH - 320} top={850 + ROYAL_DROP} width={170} height={85} rotate={-12} opacity={0.85}>
        <Shehnai color={p.primary} fill={p.accent} delay={36} />
      </Place>
    </>
  ),
  iconColor: (p) => p.primary,
};

export const WedRoyal: React.FC<{ spec: WeddingSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={royal} />;

// ------------------------------------------------------------------ wed-floral

const FloralBackground: Theme["Background"] = ({ p }) => {
  const frame = useCurrentFrame();
  const bloom = interpolate(frame, [0, 75], [0, 1], { extrapolateRight: "clamp" });
  const colors = { petal: p.primary, petal2: mix(p.primary, p.accent, 0.5), leaf: p.secondary, center: p.accent };
  return (
    <AbsoluteFill style={{ backgroundColor: p.background }}>
      <Blobs colors={[p.primary, p.secondary, p.accent]} seed="fl" opacity={0.18} />
      <FloralCorner corner="tl" bloom={bloom} colors={colors} scale={1.05} />
      <FloralCorner corner="br" bloom={bloom} colors={colors} scale={1.05} />
      <FloralCorner corner="tr" bloom={interpolate(frame, [20, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} colors={colors} scale={0.55} />
      <FloralCorner corner="bl" bloom={interpolate(frame, [20, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} colors={colors} scale={0.55} />
    </AbsoluteFill>
  );
};

const floral: Theme = {
  entrance: "rise",
  contentTop: 230,
  contentBottom: 230,
  nameMax: 190,
  Background: FloralBackground,
  styles: (p) => {
    const text = readable(p.text, p.background);
    const rose = readable(mix(p.primary, p.text, 0.35), p.background, 3.2);
    return {
      headline: { fontFamily: F.cormorant, weight: 600, color: text, uppercase: true, letterSpacingEm: 0.18 },
      name: { fontFamily: F.parisienne, color: rose, lineHeight: 1.3 },
      body: { fontFamily: F.cormorant, weight: 500, italic: true, color: text, lineHeight: 1.45 },
      label: { fontFamily: F.cormorant, weight: 700, color: readable(p.secondary, p.background, 3), uppercase: true, letterSpacingEm: 0.25 },
      value: { fontFamily: F.cormorant, weight: 600, color: text },
      accent: { fontFamily: F.parisienne, color: rose },
      small: { fontFamily: F.cormorant, weight: 500, color: alpha(text, 0.85) },
    };
  },
  divider: (p) => <Divider color={readable(p.secondary, p.background, 3)} variant="leaf" />,
  iconColor: (p) => readable(p.secondary, p.background, 3),
};

export const WedFloral: React.FC<{ spec: WeddingSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={floral} />;

// ------------------------------------------------------------------ wed-peacock

function featherColors(p: Palette): FeatherColors {
  return { stalk: p.primary, barb: mix(p.secondary, p.accent, 0.5), outer: p.secondary, mid: p.primary, eye: mix(p.secondary, "#1d4ed8", 0.45), core: p.accent };
}

const PeacockBackground: Theme["Background"] = ({ p }) => {
  const frame = useCurrentFrame();
  const open = interpolate(frame, [0, 70], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${mix(p.background, p.secondary, 0.5)}, ${p.background} 72%)` }}>
      <Sparkles color={p.accent} count={24} seed="pk" size={13} area={{ top: 420, bottom: HEIGHT }} />
      <PeacockFan cx={WIDTH / 2} cy={410} length={380} open={open} colors={featherColors(p)} base={p.background} />
      <Place left={0} top={HEIGHT - 330} width={150} height={300} rotate={26} origin="50% 95%" opacity={open}>
        <PeacockFeatherSvg colors={featherColors(p)} delay={30} />
      </Place>
      <Place left={WIDTH - 150} top={HEIGHT - 330} width={150} height={300} rotate={-26} origin="50% 95%" opacity={open}>
        <PeacockFeatherSvg colors={featherColors(p)} delay={36} />
      </Place>
    </AbsoluteFill>
  );
};

const peacock: Theme = {
  entrance: "drop",
  contentTop: 290,
  contentBottom: 130,
  nameMax: 180,
  Background: PeacockBackground,
  styles: (p) => {
    const text = readable(p.text, p.background);
    const goldGrad = `linear-gradient(180deg, ${mix(p.primary, "#ffffff", 0.45)} 0%, ${p.primary} 55%, ${mix(p.primary, "#6b4a00", 0.45)} 100%)`;
    return {
      headline: { fontFamily: F.playfair, weight: 700, color: p.primary, gradient: goldGrad, uppercase: true, letterSpacingEm: 0.1 },
      name: { fontFamily: F.parisienne, color: p.primary, gradient: goldGrad, lineHeight: 1.3, shadow: "0 6px 16px rgba(0,0,0,0.4)" },
      body: { fontFamily: F.cormorant, weight: 600, color: text, lineHeight: 1.45 },
      label: { fontFamily: F.lato, weight: 700, color: readable(p.accent, p.background, 3), uppercase: true, letterSpacingEm: 0.26 },
      value: { fontFamily: F.playfair, weight: 500, color: text },
      accent: { fontFamily: F.parisienne, color: readable(p.accent, p.background, 3) },
      small: { fontFamily: F.cormorant, weight: 500, color: alpha(text, 0.85) },
    };
  },
  divider: (p) => <Divider color={p.primary} variant="leaf" />,
  namesDecor: (p) => (
    <div style={{ width: 80, height: 160 }}>
      <PeacockFeatherSvg colors={featherColors(p)} />
    </div>
  ),
  blessingDecor: (p) => <GaneshaBlessing color={p.primary} fill={p.accent} glow={p.accent} />,
  iconColor: (p) => readable(p.accent, p.background, 3),
};

export const WedPeacock: React.FC<{ spec: WeddingSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={peacock} />;

// ------------------------------------------------------------------ wed-midnight

const MidnightBackground: Theme["Background"] = ({ p }) => {
  const frame = useCurrentFrame();
  const rays = `repeating-conic-gradient(from ${frame * 0.12}deg at 50% 36%, ${alpha(p.primary, 0.08)} 0deg 5deg, transparent 5deg 15deg)`;
  const fade = "radial-gradient(circle at 50% 36%, #000 5%, transparent 70%)";
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 36%, ${mix(p.background, p.secondary, 0.55)}, ${p.background} 75%)` }}>
      <AbsoluteFill style={{ background: rays, WebkitMaskImage: fade, maskImage: fade }} />
      <Sparkles color={p.accent} count={34} seed="mn" size={13} />
      <Place left={WIDTH / 2 - 170} top={0} width={340} height={510}>
        <Jhummar color={p.primary} crystal={p.accent} delay={10} />
      </Place>
    </AbsoluteFill>
  );
};

const MidnightFrame: Theme["Overlay"] = ({ p }) => {
  const frame = useCurrentFrame();
  return <LineFrame color={p.primary} progress={interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" })} />;
};

const midnight: Theme = {
  entrance: "fade",
  contentTop: 380,
  contentBottom: 20,
  nameMax: 190,
  Background: MidnightBackground,
  Overlay: MidnightFrame,
  styles: (p) => {
    const text = readable(p.text, p.background);
    const champagne = `linear-gradient(180deg, ${mix(p.accent, "#ffffff", 0.5)} 0%, ${p.primary} 60%, ${mix(p.primary, p.secondary, 0.35)} 100%)`;
    return {
      headline: { fontFamily: F.playfair, weight: 500, italic: true, color: p.primary, gradient: champagne },
      name: { fontFamily: F.greatVibes, color: p.primary, gradient: champagne, lineHeight: 1.3, shadow: "0 6px 16px rgba(0,0,0,0.45)" },
      body: { fontFamily: F.cormorant, weight: 500, italic: true, color: text, lineHeight: 1.45 },
      label: { fontFamily: F.lato, weight: 700, color: readable(p.primary, p.background, 3), uppercase: true, letterSpacingEm: 0.3 },
      value: { fontFamily: F.playfair, weight: 500, color: text },
      accent: { fontFamily: F.greatVibes, color: readable(p.accent, p.background, 3) },
      small: { fontFamily: F.lato, weight: 400, color: alpha(text, 0.82) },
    };
  },
  divider: (p) => <Divider color={p.primary} variant="diamond" />,
  namesDecor: (p) => <Rings size={170} color={p.primary} gem={p.accent} />,
  iconColor: (p) => p.primary,
};

export const WedMidnight: React.FC<{ spec: WeddingSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={midnight} />;
