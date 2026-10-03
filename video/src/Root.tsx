import React from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { z } from "zod";
import { BirthdaySpecSchema, EngagementSpecSchema, WeddingSpecSchema, type EventSpec } from "@invite/shared/schema";
import {
  bdayElegantSample,
  bdayPlayfulSample,
  engModernSample,
  engRoseGoldSample,
  engSapphireSample,
  engTraditionalSample,
  haldiGlowSample,
  haldiMarigoldSample,
  mehndiHennaSample,
  mehndiPaisleySample,
  wedFloralSample,
  wedMidnightSample,
  wedPeacockSample,
  wedRoyalSample,
} from "./samples";
import { BdayElegant, BdayPlayful } from "./templates/birthday";
import { EngModern, EngRoseGold, EngSapphire, EngTraditional } from "./templates/engagement";
import { HaldiGlow, HaldiMarigold } from "./templates/haldi";
import { MehndiHenna, MehndiPaisley } from "./templates/mehndi";
import { WedFloral, WedMidnight, WedPeacock, WedRoyal } from "./templates/wedding";
import { buildTimeline, FPS, HEIGHT, WIDTH } from "./timeline";

// Props are wrapped as { spec } on purpose: Remotion shallow-merges defaultProps
// with inputProps, so a flat spec would inherit optional fields (blessing line,
// RSVP...) from the sample. With a wrapper the real spec replaces the sample whole.
const props = <T extends z.ZodType>(spec: T) => z.object({ spec });

// Duration follows the content and, when present, the audio length.
const metadata: CalculateMetadataFunction<any> = ({ props: p }) => ({
  durationInFrames: buildTimeline((p as { spec: EventSpec }).spec, FPS).durationInFrames,
});

const common = { fps: FPS, width: WIDTH, height: HEIGHT, durationInFrames: 900, calculateMetadata: metadata } as const;

export const Root: React.FC = () => (
  <>
    <Composition id="bday-playful" component={BdayPlayful} schema={props(BirthdaySpecSchema)} defaultProps={{ spec: bdayPlayfulSample }} {...common} />
    <Composition id="bday-elegant" component={BdayElegant} schema={props(BirthdaySpecSchema)} defaultProps={{ spec: bdayElegantSample }} {...common} />
    <Composition id="eng-traditional" component={EngTraditional} schema={props(EngagementSpecSchema)} defaultProps={{ spec: engTraditionalSample }} {...common} />
    <Composition id="eng-modern" component={EngModern} schema={props(EngagementSpecSchema)} defaultProps={{ spec: engModernSample }} {...common} />
    <Composition id="wed-royal" component={WedRoyal} schema={props(WeddingSpecSchema)} defaultProps={{ spec: wedRoyalSample }} {...common} />
    <Composition id="wed-floral" component={WedFloral} schema={props(WeddingSpecSchema)} defaultProps={{ spec: wedFloralSample }} {...common} />
    <Composition id="eng-sapphire" component={EngSapphire} schema={props(EngagementSpecSchema)} defaultProps={{ spec: engSapphireSample }} {...common} />
    <Composition id="eng-rosegold" component={EngRoseGold} schema={props(EngagementSpecSchema)} defaultProps={{ spec: engRoseGoldSample }} {...common} />
    <Composition id="wed-peacock" component={WedPeacock} schema={props(WeddingSpecSchema)} defaultProps={{ spec: wedPeacockSample }} {...common} />
    <Composition id="wed-midnight" component={WedMidnight} schema={props(WeddingSpecSchema)} defaultProps={{ spec: wedMidnightSample }} {...common} />
    <Composition id="haldi-marigold" component={HaldiMarigold} schema={props(WeddingSpecSchema)} defaultProps={{ spec: haldiMarigoldSample }} {...common} />
    <Composition id="haldi-glow" component={HaldiGlow} schema={props(WeddingSpecSchema)} defaultProps={{ spec: haldiGlowSample }} {...common} />
    <Composition id="mehndi-henna" component={MehndiHenna} schema={props(WeddingSpecSchema)} defaultProps={{ spec: mehndiHennaSample }} {...common} />
    <Composition id="mehndi-paisley" component={MehndiPaisley} schema={props(WeddingSpecSchema)} defaultProps={{ spec: mehndiPaisleySample }} {...common} />
  </>
);
