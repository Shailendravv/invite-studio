import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { WeddingSpec } from "@invite/shared/schema";
import { Divider, Mandala, Sparkles } from "../art/art";
import { AmbiPaisley, GaneshaBlessing, LotusBloom, MehndiCorner, Place } from "../art/svg-motifs";
import { alpha, mix, readable } from "../color";
import { InvitationVideo, type Theme } from "../engine";
import { F } from "../fonts";
import { HEIGHT, WIDTH } from "../timeline";

const FaintMandala: React.FC<{ color: string; accent: string; opacity: number }> = ({ color, accent, opacity }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: WIDTH / 2 - 750, top: HEIGHT / 2 - 750 }}>
      <Mandala size={1500} color={color} accent={accent} rotation={frame * 0.05} opacity={opacity} />
    </div>
  );
};

// ------------------------------------------------------------------ mehndi-henna

const CORNER = 440;

const HennaBackground: Theme["Background"] = ({ p }) => {
  const corners = [
    { left: WIDTH - CORNER, top: 0, flipX: false, flipY: false, delay: 0 },
    { left: 0, top: 0, flipX: true, flipY: false, delay: 8 },
    { left: WIDTH - CORNER, top: HEIGHT - CORNER, flipX: false, flipY: true, delay: 16 },
    { left: 0, top: HEIGHT - CORNER, flipX: true, flipY: true, delay: 24 },
  ];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${mix(p.background, p.secondary, 0.22)}, ${p.background} 72%)` }}>
      <FaintMandala color={p.primary} accent={p.secondary} opacity={0.07} />
      <Sparkles color={p.accent} count={14} seed="mh" size={12} area={{ top: 200, bottom: HEIGHT - 200 }} />
      {corners.map((c) => (
        <Place key={`${c.left}-${c.top}`} left={c.left} top={c.top} width={CORNER} height={CORNER} flipX={c.flipX} flipY={c.flipY}>
          <MehndiCorner color={p.primary} accent={p.secondary} delay={c.delay} />
        </Place>
      ))}
    </AbsoluteFill>
  );
};

const henna: Theme = {
  entrance: "unfold",
  contentTop: 40,
  contentBottom: 40,
  nameMax: 180,
  Background: HennaBackground,
  styles: (p) => {
    const text = readable(p.text, p.background);
    const goldGrad = `linear-gradient(180deg, ${mix(p.primary, "#ffffff", 0.4)} 0%, ${p.primary} 60%, ${mix(p.primary, p.accent, 0.5)} 100%)`;
    return {
      headline: { fontFamily: F.rozha, color: p.primary, gradient: goldGrad },
      name: { fontFamily: F.greatVibes, color: p.primary, gradient: goldGrad, lineHeight: 1.3, shadow: "0 6px 14px rgba(0,0,0,0.35)" },
      body: { fontFamily: F.cormorant, weight: 600, color: text, lineHeight: 1.45 },
      label: { fontFamily: F.cinzel, weight: 500, color: readable(p.accent, p.background, 3), uppercase: true, letterSpacingEm: 0.22 },
      value: { fontFamily: F.cormorant, weight: 700, color: text },
      accent: { fontFamily: F.greatVibes, color: readable(p.accent, p.background, 3) },
      small: { fontFamily: F.cormorant, weight: 500, color: alpha(text, 0.85) },
    };
  },
  divider: (p) => <Divider color={p.primary} variant="leaf" />,
  namesDecor: (p) => (
    <div style={{ display: "flex", gap: 24 }}>
      <div style={{ width: 72, height: 96 }}>
        <AmbiPaisley color={p.primary} accent={p.secondary} />
      </div>
      <div style={{ width: 72, height: 96, transform: "scaleX(-1)" }}>
        <AmbiPaisley color={p.primary} accent={p.secondary} />
      </div>
    </div>
  ),
  blessingDecor: (p) => <GaneshaBlessing color={p.primary} fill={p.secondary} glow={p.accent} />,
  iconColor: (p) => readable(p.accent, p.background, 3),
};

export const MehndiHenna: React.FC<{ spec: WeddingSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={henna} />;

// ------------------------------------------------------------------ mehndi-paisley

const PaisleyBackground: Theme["Background"] = ({ p }) => {
  const tint = mix(p.secondary, p.accent, 0.5);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${mix(p.background, "#ffffff", 0.5)}, ${p.background} 80%)` }}>
      <FaintMandala color={p.primary} accent={p.secondary} opacity={0.07} />
      <Place left={-40} top={-50} width={270} height={360} rotate={135}>
        <AmbiPaisley color={p.primary} accent={tint} />
      </Place>
      <Place left={WIDTH - 230} top={HEIGHT - 310} width={270} height={360} rotate={-45}>
        <AmbiPaisley color={p.primary} accent={tint} delay={8} />
      </Place>
      <Place left={WIDTH - 170} top={-20} width={180} height={240} rotate={-135}>
        <AmbiPaisley color={p.primary} accent={tint} delay={22} />
      </Place>
      <Place left={-10} top={HEIGHT - 220} width={180} height={240} rotate={45}>
        <AmbiPaisley color={p.primary} accent={tint} delay={30} />
      </Place>
    </AbsoluteFill>
  );
};

const paisley: Theme = {
  entrance: "rise",
  contentTop: 120,
  contentBottom: 120,
  nameMax: 180,
  Background: PaisleyBackground,
  styles: (p) => {
    const text = readable(p.text, p.background);
    const brown = readable(p.primary, p.background, 4.5);
    return {
      headline: { fontFamily: F.playfair, weight: 700, color: brown, uppercase: true, letterSpacingEm: 0.08 },
      name: { fontFamily: F.parisienne, color: brown, lineHeight: 1.3 },
      body: { fontFamily: F.cormorant, weight: 600, italic: true, color: text, lineHeight: 1.45 },
      label: { fontFamily: F.lato, weight: 700, color: readable(p.secondary, p.background, 3.2), uppercase: true, letterSpacingEm: 0.28 },
      value: { fontFamily: F.playfair, weight: 600, color: text },
      accent: { fontFamily: F.parisienne, color: readable(p.accent, p.background, 3.2) },
      small: { fontFamily: F.lato, weight: 400, color: alpha(text, 0.85) },
    };
  },
  divider: (p) => <Divider color={readable(p.secondary, p.background, 3.2)} variant="diamond" />,
  namesDecor: (p) => (
    <div style={{ width: 210, height: 175 }}>
      <LotusBloom color={readable(p.primary, p.background, 3)} fill={p.secondary} />
    </div>
  ),
  blessingDecor: (p) => <GaneshaBlessing color={readable(p.primary, p.background, 3)} fill={p.secondary} glow={p.secondary} />,
  iconColor: (p) => readable(p.secondary, p.background, 3.2),
};

export const MehndiPaisley: React.FC<{ spec: WeddingSpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={paisley} />;
