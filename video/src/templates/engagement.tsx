import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { EngagementSpec } from "@invite/shared/schema";
import { Blobs, Divider, FallingPetals, LineFrame, Mandala, Marigold, Rings, Sparkles, Toran } from "../art/art";
import { alpha, mix, readable } from "../color";
import { FloralBorder, GaneshaBlessing, LotusBloom, Place, Rangoli } from "../art/svg-motifs";
import { InvitationVideo, type Theme } from "../engine";
import { F } from "../fonts";
import { HEIGHT, WIDTH } from "../timeline";

// ------------------------------------------------------------------ eng-traditional

const TraditionalBackground: Theme["Background"] = ({ p }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, ${mix(p.background, p.primary, 0.55)}, ${p.background} 70%)` }}>
      <div style={{ position: "absolute", left: WIDTH / 2 - 800, top: HEIGHT * 0.56 - 800 }}>
        <Mandala size={1600} color={p.accent} accent={p.secondary} rotation={frame * 0.08} opacity={0.14} />
      </div>
      <Sparkles color={p.accent} count={22} seed="tr" size={16} area={{ top: 460, bottom: HEIGHT }} />
    </AbsoluteFill>
  );
};

const MarigoldBorder: Theme["Overlay"] = ({ p }) => (
  <svg style={{ position: "absolute", inset: 0 }} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
    {Array.from({ length: 14 }).map((_, i) => (
      <Marigold key={i} cx={(i + 0.5) * (WIDTH / 14)} cy={HEIGHT - 34} r={30} color={i % 2 ? p.secondary : "#ffd23f"} dark={mix(p.secondary, p.primary, 0.4)} />
    ))}
  </svg>
);

const traditional: Theme = {
  entrance: "rise",
  contentTop: 300,
  contentBottom: 40,
  nameMax: 170,
  Background: TraditionalBackground,
  Overlay: (props) => (
    <>
      <Toran strings={7} flower={props.p.secondary} flowerDark={mix(props.p.secondary, props.p.primary, 0.45)} />
      <MarigoldBorder {...props} />
    </>
  ),
  styles: (p) => {
    const text = readable(p.text, p.background);
    const goldGrad = `linear-gradient(180deg, ${mix(p.accent, "#ffffff", 0.5)} 0%, ${p.accent} 50%, ${p.secondary} 100%)`;
    return {
      headline: { fontFamily: F.rozha, color: p.accent, gradient: goldGrad, shadow: "0 4px 10px rgba(0,0,0,0.35)" },
      name: { fontFamily: F.rozha, color: p.accent, gradient: goldGrad, lineHeight: 1.2, shadow: "0 6px 14px rgba(0,0,0,0.4)" },
      body: { fontFamily: F.martel, weight: 400, color: text, lineHeight: 1.55 },
      label: { fontFamily: F.martel, weight: 800, color: readable(p.accent, p.background, 3), uppercase: true, letterSpacingEm: 0.18 },
      value: { fontFamily: F.martel, weight: 700, color: text },
      accent: { fontFamily: F.rozha, color: readable(p.secondary, p.background, 3) },
      small: { fontFamily: F.martel, weight: 400, color: alpha(text, 0.85) },
    };
  },
  divider: (p) => <Divider color={p.accent} variant="diamond" />,
  namesDecor: (p) => <Rings size={190} color={p.accent} gem="#ffffff" />,
  blessingDecor: (p) => <GaneshaBlessing color={p.accent} fill={p.secondary} glow={p.accent} />,
  iconColor: (p) => p.accent,
};

export const EngTraditional: React.FC<{ spec: EngagementSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={traditional} />;

// ------------------------------------------------------------------ eng-modern

const ModernBackground: Theme["Background"] = ({ p }) => {
  const frame = useCurrentFrame();
  const line = alpha(p.accent, 0.35);
  return (
    <AbsoluteFill style={{ backgroundColor: p.background }}>
      <Blobs colors={[p.primary, p.secondary, mix(p.primary, p.background, 0.4)]} seed="mo" opacity={0.45} />
      <svg style={{ position: "absolute", inset: 0 }} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <g transform={`rotate(${frame * 0.05} ${WIDTH / 2} ${HEIGHT / 2})`}>
          <circle cx={WIDTH / 2 - 120} cy={HEIGHT / 2} r={560} fill="none" stroke={line} strokeWidth={2} />
          <circle cx={WIDTH / 2 + 120} cy={HEIGHT / 2} r={560} fill="none" stroke={line} strokeWidth={2} />
        </g>
        <rect x={70} y={70} width={WIDTH - 140} height={HEIGHT - 140} fill="none" stroke={alpha(p.text, 0.18)} strokeWidth={2} />
      </svg>
    </AbsoluteFill>
  );
};

const modern: Theme = {
  entrance: "rise",
  contentTop: 20,
  contentBottom: 20,
  nameMax: 170,
  Background: ModernBackground,
  styles: (p) => {
    const text = readable(p.text, p.background);
    const acc = readable(p.accent, p.background, 3);
    return {
      headline: { fontFamily: F.playfair, weight: 500, italic: true, color: text },
      name: { fontFamily: F.playfair, weight: 500, color: text, letterSpacingEm: 0.02, lineHeight: 1.15 },
      body: { fontFamily: F.lato, weight: 300, color: text, lineHeight: 1.5 },
      label: { fontFamily: F.lato, weight: 700, color: acc, uppercase: true, letterSpacingEm: 0.32 },
      value: { fontFamily: F.playfair, weight: 500, color: text },
      accent: { fontFamily: F.playfair, weight: 500, italic: true, color: acc },
      small: { fontFamily: F.lato, weight: 400, color: alpha(text, 0.8) },
    };
  },
  divider: (p) => <Divider color={readable(p.accent, p.background, 3)} variant="dots" width={260} />,
  namesDecor: (p) => <Rings size={170} color={readable(p.accent, p.background, 3)} gem={p.background} />,
  iconColor: (p) => readable(p.accent, p.background, 3),
};

export const EngModern: React.FC<{ spec: EngagementSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={modern} />;

// ------------------------------------------------------------------ eng-sapphire

const SapphireBackground: Theme["Background"] = ({ p }) => {
  const frame = useCurrentFrame();
  const rays = `repeating-conic-gradient(from ${frame * 0.15}deg at 50% 40%, ${alpha(p.primary, 0.07)} 0deg 6deg, transparent 6deg 18deg)`;
  const fade = "radial-gradient(circle at 50% 40%, #000 8%, transparent 68%)";
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${mix(p.background, p.secondary, 0.5)}, ${p.background} 72%)` }}>
      <AbsoluteFill style={{ background: rays, WebkitMaskImage: fade, maskImage: fade }} />
      <Place left={WIDTH / 2 - 750} top={HEIGHT * 0.4 - 750} width={1500} height={1500} opacity={0.22}>
        <Rangoli color={p.primary} delay={4} />
      </Place>
      <Sparkles color={p.primary} count={30} seed="sa" size={14} />
    </AbsoluteFill>
  );
};

const SapphireFrame: Theme["Overlay"] = ({ p }) => {
  const frame = useCurrentFrame();
  return <LineFrame color={p.accent} progress={interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" })} />;
};

const sapphire: Theme = {
  entrance: "pop",
  contentTop: 20,
  contentBottom: 20,
  nameMax: 160,
  Background: SapphireBackground,
  Overlay: SapphireFrame,
  styles: (p) => {
    const text = readable(p.text, p.background);
    const silver = `linear-gradient(180deg, #ffffff 0%, ${p.primary} 55%, ${mix(p.primary, p.secondary, 0.5)} 100%)`;
    return {
      headline: { fontFamily: F.cinzel, weight: 500, color: p.primary, gradient: silver, uppercase: true, letterSpacingEm: 0.12 },
      name: { fontFamily: F.cormorant, weight: 700, color: p.primary, gradient: silver, uppercase: true, letterSpacingEm: 0.06, lineHeight: 1.15 },
      body: { fontFamily: F.lato, weight: 300, color: text, lineHeight: 1.55 },
      label: { fontFamily: F.cinzel, weight: 500, color: readable(p.accent, p.background, 3), uppercase: true, letterSpacingEm: 0.25 },
      value: { fontFamily: F.cormorant, weight: 700, color: text },
      accent: { fontFamily: F.greatVibes, color: readable(p.accent, p.background, 3) },
      small: { fontFamily: F.lato, weight: 400, color: alpha(text, 0.82) },
    };
  },
  divider: (p) => <Divider color={p.accent} variant="diamond" />,
  namesDecor: (p) => <Rings size={180} color={p.accent} gem={p.primary} />,
  iconColor: (p) => readable(p.accent, p.background, 3),
};

export const EngSapphire: React.FC<{ spec: EngagementSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={sapphire} />;

// ------------------------------------------------------------------ eng-rosegold

const RoseGoldBackground: Theme["Background"] = ({ p }) => {
  const gold = mix(p.primary, p.accent, 0.4);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${mix(p.background, "#ffffff", 0.4)}, ${p.background} 55%, ${mix(p.background, p.secondary, 0.45)})` }}>
      <Blobs colors={[p.secondary, p.primary, mix(p.secondary, p.accent, 0.5)]} seed="rg" opacity={0.35} />
      <FallingPetals colors={[p.secondary, p.primary, p.accent]} count={22} seed="rgp" size={24} speed={0.9} opacity={0.55} />
      <Place left={WIDTH / 2 - 350} top={50} width={700} height={583}>
        <LotusBloom color={gold} fill={p.secondary} />
      </Place>
      <Place left={0} top={HEIGHT - 205} width={WIDTH} height={162}>
        <FloralBorder color={gold} delay={20} />
      </Place>
    </AbsoluteFill>
  );
};

const roseGold: Theme = {
  entrance: "rise",
  contentTop: 470,
  contentBottom: 60,
  nameMax: 190,
  Background: RoseGoldBackground,
  styles: (p) => {
    const text = readable(p.text, p.background);
    const rose = readable(mix(p.primary, p.text, 0.4), p.background, 3.2);
    const roseGrad = `linear-gradient(180deg, ${mix(p.primary, "#ffffff", 0.2)} 0%, ${mix(p.primary, p.accent, 0.5)} 100%)`;
    return {
      headline: { fontFamily: F.playfair, weight: 500, italic: true, color: rose },
      name: { fontFamily: F.greatVibes, color: rose, gradient: roseGrad, lineHeight: 1.3 },
      body: { fontFamily: F.cormorant, weight: 500, color: text, lineHeight: 1.5 },
      label: { fontFamily: F.lato, weight: 700, color: readable(p.accent, p.background, 3), uppercase: true, letterSpacingEm: 0.3 },
      value: { fontFamily: F.playfair, weight: 500, color: text },
      accent: { fontFamily: F.parisienne, color: rose },
      small: { fontFamily: F.lato, weight: 400, color: alpha(text, 0.8) },
    };
  },
  divider: (p) => <Divider color={readable(p.accent, p.background, 3)} variant="leaf" />,
  namesDecor: (p) => <Rings size={170} color={mix(p.primary, p.accent, 0.4)} gem="#ffffff" />,
  iconColor: (p) => readable(p.accent, p.background, 3),
};

export const EngRoseGold: React.FC<{ spec: EngagementSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={roseGold} />;
