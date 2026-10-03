import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { BirthdaySpec } from "@invite/shared/schema";
import { BalloonField, Blobs, Bunting, Cake, Confetti, Divider, LineFrame, Sparkles } from "../art/art";
import { alpha, mix, readable } from "../color";
import { InvitationVideo, type Theme } from "../engine";
import { F } from "../fonts";

// ------------------------------------------------------------------ bday-playful

const playful: Theme = {
  entrance: "pop",
  contentTop: 160,
  contentBottom: 20,
  nameMax: 200,
  Background: ({ p }) => (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, ${mix(p.background, "#ffffff", 0.5)}, ${p.background} 70%)` }}>
      <Blobs colors={[p.primary, p.secondary, p.accent]} seed="pl" opacity={0.35} />
      <BalloonField colors={[p.primary, p.secondary, p.accent, mix(p.primary, p.secondary, 0.5)]} count={10} />
      <Confetti colors={[p.primary, p.secondary, p.accent]} count={45} speed={0.8} />
    </AbsoluteFill>
  ),
  Overlay: ({ p }) => <Bunting colors={[p.primary, p.accent, p.secondary]} />,
  panel: (p) => ({ background: alpha(mix(p.background, "#ffffff", 0.7), 0.9), boxShadow: `0 20px 60px ${alpha(p.text, 0.15)}` }),
  styles: (p) => {
    const panelBg = mix(p.background, "#ffffff", 0.7);
    const text = readable(p.text, panelBg);
    const strong = readable(p.primary, panelBg, 3);
    const second = readable(p.secondary, panelBg, 3);
    return {
      headline: { fontFamily: F.fredoka, weight: 700, color: strong },
      name: { fontFamily: F.fredoka, weight: 700, color: strong, gradient: `linear-gradient(90deg, ${strong}, ${readable(mix(p.primary, p.secondary, 0.6), panelBg, 3)})`, lineHeight: 1.1 },
      body: { fontFamily: F.baloo, weight: 500, color: text },
      label: { fontFamily: F.baloo, weight: 800, color: second, uppercase: true, letterSpacingEm: 0.12 },
      value: { fontFamily: F.baloo, weight: 700, color: text },
      accent: { fontFamily: F.fredoka, weight: 600, color: second },
      small: { fontFamily: F.baloo, weight: 500, color: alpha(text, 0.85) },
    };
  },
  divider: (p) => <Divider color={p.secondary} variant="dots" />,
  namesDecor: (p) => <Cake size={240} colors={{ base: p.primary, icing: mix(p.background, "#ffffff", 0.6), flame: p.accent }} />,
  iconColor: (p) => readable(p.secondary, mix(p.background, "#ffffff", 0.7), 3),
};

export const BdayPlayful: React.FC<{ spec: BirthdaySpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={playful} />;

// ------------------------------------------------------------------ bday-elegant

const ElegantBackground: Theme["Background"] = ({ p }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 45], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${mix(p.background, p.secondary, 0.25)}, ${p.background} 75%)` }}>
      <Sparkles color={p.primary} count={30} seed="el" size={18} />
      <LineFrame color={p.primary} progress={progress} inset={46} />
    </AbsoluteFill>
  );
};

const gold = (p: { primary: string; accent: string; secondary: string }) => `linear-gradient(180deg, ${p.accent} 0%, ${p.primary} 55%, ${p.secondary} 100%)`;

const elegant: Theme = {
  entrance: "unfold",
  contentTop: 30,
  contentBottom: 30,
  nameMax: 210,
  Background: ElegantBackground,
  styles: (p) => {
    const text = readable(p.text, p.background);
    return {
      headline: { fontFamily: F.cinzel, weight: 500, color: p.primary, gradient: gold(p), uppercase: true, letterSpacingEm: 0.1 },
      name: { fontFamily: F.greatVibes, weight: 400, color: p.primary, gradient: gold(p), lineHeight: 1.3 },
      body: { fontFamily: F.cormorant, weight: 500, italic: true, color: text },
      label: { fontFamily: F.cinzel, weight: 500, color: readable(p.primary, p.background, 3), uppercase: true, letterSpacingEm: 0.25 },
      value: { fontFamily: F.cormorant, weight: 600, color: text },
      accent: { fontFamily: F.cormorant, weight: 500, italic: true, color: readable(p.primary, p.background, 3) },
      small: { fontFamily: F.cormorant, weight: 500, color: alpha(text, 0.85) },
    };
  },
  divider: (p) => <Divider color={p.primary} variant="diamond" />,
  namesDecor: (p, spec) =>
    spec.eventType === "birthday" && spec.age ? (
      <div style={{ fontFamily: F.cinzel, fontWeight: 500, fontSize: 280, lineHeight: 1, color: "transparent", WebkitTextStroke: `3px ${p.primary}` }}>{spec.age}</div>
    ) : (
      <Divider color={p.primary} variant="diamond" width={300} />
    ),
};

export const BdayElegant: React.FC<{ spec: BirthdaySpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={elegant} />;
