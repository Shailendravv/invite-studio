import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { WeddingSpec } from "@invite/shared/schema";
import { Blobs, Divider, FallingPetals, Sparkles, Splatter } from "../art/art";
import { DiyaFlame, GaneshaBlessing, HaldiBowl, MandalaBorder, MarigoldStrand, Place, Rangoli, ToranSwing, type GarlandColors } from "../art/svg-motifs";
import { alpha, mix, readable } from "../color";
import { InvitationVideo, type Theme } from "../engine";
import { F } from "../fonts";
import { HEIGHT, WIDTH } from "../timeline";

const grow = (frame: number, end: number, start = 0) => interpolate(frame, [start, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// ------------------------------------------------------------------ haldi-marigold

const STRANDS = [135, 405, 675, 945];

const MarigoldBackground: Theme["Background"] = ({ p }) => {
  const garland: GarlandColors = {
    petal: p.primary,
    petal2: mix(p.primary, "#ffe14d", 0.6),
    center: mix(p.primary, "#ffffff", 0.5),
    ring: p.secondary,
    leaf: p.accent,
    leafDark: mix(p.accent, "#000000", 0.4),
    string: mix(p.secondary, "#3a1a00", 0.5),
  };
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${mix(p.background, "#ffffff", 0.35)}, ${p.background} 50%, ${mix(p.background, p.primary, 0.3)})` }}>
      <Blobs colors={[p.primary, mix(p.primary, "#ffe14d", 0.6), p.secondary]} seed="hm" opacity={0.22} />
      <FallingPetals colors={[p.primary, mix(p.primary, "#ffffff", 0.3), p.secondary]} count={20} seed="hmp" size={22} speed={0.8} opacity={0.55} />
      {STRANDS.map((cx, i) => (
        <Place key={cx} left={cx - 78} top={-4} width={156} height={520}>
          <MarigoldStrand colors={garland} delay={i * 8} phase={i * 1.3} />
        </Place>
      ))}
      <Place left={0} top={HEIGHT - 182} width={WIDTH} height={162}>
        <MandalaBorder color={mix(p.secondary, "#5a1818", 0.3)} delay={10} />
      </Place>
    </AbsoluteFill>
  );
};

const marigold: Theme = {
  entrance: "pop",
  contentTop: 370,
  contentBottom: 80,
  nameMax: 170,
  Background: MarigoldBackground,
  styles: (p) => {
    const text = readable(p.text, p.background);
    const deep = readable(p.secondary, p.background, 4.5);
    return {
      headline: { fontFamily: F.baloo, weight: 800, color: deep },
      name: { fontFamily: F.rozha, color: deep, lineHeight: 1.2 },
      body: { fontFamily: F.baloo, weight: 500, color: text, lineHeight: 1.45 },
      label: { fontFamily: F.baloo, weight: 700, color: deep, uppercase: true, letterSpacingEm: 0.14 },
      value: { fontFamily: F.baloo, weight: 700, color: text },
      accent: { fontFamily: F.parisienne, color: deep },
      small: { fontFamily: F.baloo, weight: 500, color: alpha(text, 0.85) },
    };
  },
  divider: (p) => <Divider color={readable(p.secondary, p.background, 3)} variant="leaf" />,
  namesDecor: (p) => (
    <div style={{ width: 250, height: 208 }}>
      <HaldiBowl color={mix(p.secondary, "#5a1818", 0.5)} paste={p.primary} petal={p.secondary} />
    </div>
  ),
  blessingDecor: (p) => <GaneshaBlessing color={mix(p.secondary, "#5a1818", 0.5)} fill={p.primary} glow={p.primary} />,
  iconColor: (p) => readable(p.secondary, p.background, 3),
};

export const HaldiMarigold: React.FC<{ spec: WeddingSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={marigold} />;

// ------------------------------------------------------------------ haldi-glow

const GlowBackground: Theme["Background"] = ({ p }) => {
  const frame = useCurrentFrame();
  const paste = [p.secondary, p.primary, mix(p.secondary, p.primary, 0.5)];
  const deep = mix(p.secondary, "#3a1a00", 0.5);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, ${mix(p.background, "#ffffff", 0.55)} 0%, ${p.background} 55%, ${mix(p.background, p.secondary, 0.5)} 100%)` }}>
      <Blobs colors={[p.primary, mix(p.primary, "#ffffff", 0.4)]} seed="hg" opacity={0.25} />
      <Place left={WIDTH / 2 - 700} top={HEIGHT * 0.5 - 700} width={1400} height={1400} opacity={0.16}>
        <Rangoli color={p.secondary} delay={6} />
      </Place>
      <Splatter corner="br" bloom={grow(frame, 85, 10)} colors={paste} seed="hgb" reach={360} />
      <FallingPetals colors={[p.primary, p.secondary, mix(p.accent, "#ffffff", 0.2)]} count={22} seed="hgp" size={22} speed={0.7} opacity={0.6} />
      <Sparkles color="#ffffff" count={18} seed="hgs" size={14} />
      <Place left={0} top={0} width={WIDTH} height={297}>
        <ToranSwing color={deep} />
      </Place>
    </AbsoluteFill>
  );
};

const glow: Theme = {
  entrance: "rise",
  contentTop: 90,
  contentBottom: 90,
  nameMax: 180,
  Background: GlowBackground,
  styles: (p) => {
    const text = readable(p.text, p.background);
    const deep = readable(p.secondary, p.background, 4.5);
    return {
      headline: { fontFamily: F.martel, weight: 800, color: deep },
      name: { fontFamily: F.parisienne, color: readable(mix(p.secondary, p.text, 0.35), p.background, 4.5), lineHeight: 1.3 },
      body: { fontFamily: F.martel, weight: 400, color: text, lineHeight: 1.55 },
      label: { fontFamily: F.martel, weight: 800, color: deep, uppercase: true, letterSpacingEm: 0.18 },
      value: { fontFamily: F.martel, weight: 700, color: text },
      accent: { fontFamily: F.parisienne, color: deep },
      small: { fontFamily: F.martel, weight: 400, color: alpha(text, 0.85) },
    };
  },
  divider: (p) => <Divider color={readable(p.secondary, p.background, 3)} variant="dots" />,
  namesDecor: (p) => (
    <div style={{ width: 200, height: 200 }}>
      <DiyaFlame color={mix(p.secondary, "#5a1818", 0.4)} flame={mix(p.primary, "#ff7a00", 0.5)} core="#fff1b0" />
    </div>
  ),
  blessingDecor: (p) => <GaneshaBlessing color={mix(p.secondary, "#5a1818", 0.4)} fill={p.primary} glow="#ffffff" />,
  iconColor: (p) => readable(p.secondary, p.background, 3),
};

export const HaldiGlow: React.FC<{ spec: WeddingSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={glow} />;
