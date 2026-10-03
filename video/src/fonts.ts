// All fonts come from Google Fonts via @remotion/google-fonts (open licences).
import { loadFont as loadBaloo2 } from "@remotion/google-fonts/Baloo2";
import { loadFont as loadCinzel } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadGreatVibes } from "@remotion/google-fonts/GreatVibes";
import { loadFont as loadLato } from "@remotion/google-fonts/Lato";
import { loadFont as loadMartel } from "@remotion/google-fonts/Martel";
import { loadFont as loadNotoSerifDeva } from "@remotion/google-fonts/NotoSerifDevanagari";
import { loadFont as loadParisienne } from "@remotion/google-fonts/Parisienne";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadRozha } from "@remotion/google-fonts/RozhaOne";
import { loadFont as loadTiro } from "@remotion/google-fonts/TiroDevanagariHindi";

const latin: ("latin" | "latin-ext")[] = ["latin", "latin-ext"];
const deva: ("devanagari" | "latin" | "latin-ext")[] = ["devanagari", "latin", "latin-ext"];

const baloo = loadBaloo2("normal", { weights: ["500", "700", "800"], subsets: deva });
const cinzel = loadCinzel("normal", { weights: ["500", "700"], subsets: latin });
const cormorant = loadCormorant("normal", { weights: ["500", "600", "700"], subsets: latin });
const cormorantItalic = loadCormorant("italic", { weights: ["500"], subsets: latin });
const fredoka = loadFredoka("normal", { weights: ["500", "600", "700"], subsets: latin });
const greatVibes = loadGreatVibes("normal", { weights: ["400"], subsets: latin });
const lato = loadLato("normal", { weights: ["300", "400", "700"], subsets: latin });
const martel = loadMartel("normal", { weights: ["400", "700", "800"], subsets: deva });
const notoDeva = loadNotoSerifDeva("normal", { weights: ["400", "600"], subsets: deva });
const parisienne = loadParisienne("normal", { weights: ["400"], subsets: latin });
const playfair = loadPlayfair("normal", { weights: ["500", "700"], subsets: latin });
const playfairItalic = loadPlayfair("italic", { weights: ["500"], subsets: latin });
const rozha = loadRozha("normal", { weights: ["400"], subsets: deva });
const tiro = loadTiro("normal", { weights: ["400"], subsets: deva });

const loaded = [baloo, cinzel, cormorant, cormorantItalic, fredoka, greatVibes, lato, martel, notoDeva, parisienne, playfair, playfairItalic, rozha, tiro];

export const fontsReady: Promise<unknown> = Promise.all(loaded.map((f) => f.waitUntilDone()));

// Use the family names Remotion registered (e.g. Baloo 2 is registered as "Baloo Two").
const q = (f: { fontFamily: string }) => `"${f.fontFamily}"`;

/** Font stacks: Latin face first, then a Devanagari face so Hindi text always renders. */
export const F = {
  baloo: `${q(baloo)}, sans-serif`,
  fredoka: `${q(fredoka)}, ${q(baloo)}, sans-serif`,
  cinzel: `${q(cinzel)}, ${q(rozha)}, serif`,
  cormorant: `${q(cormorant)}, ${q(tiro)}, serif`,
  greatVibes: `${q(greatVibes)}, ${q(tiro)}, cursive`,
  lato: `${q(lato)}, ${q(notoDeva)}, sans-serif`,
  martel: `${q(martel)}, serif`,
  notoSerifDeva: `${q(notoDeva)}, serif`,
  parisienne: `${q(parisienne)}, ${q(tiro)}, cursive`,
  playfair: `${q(playfair)}, ${q(notoDeva)}, serif`,
  rozha: `${q(rozha)}, serif`,
  tiro: `${q(tiro)}, serif`,
};
