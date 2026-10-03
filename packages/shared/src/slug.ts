// Client folder slugs: lowercase ASCII words joined by "-".
// Devanagari is transliterated with a small phonetic table so Hindi names still
// produce readable folder names (e.g. "राहुल और प्रिया" -> "rahul-aur-priya").

const CONSONANTS: Record<string, string> = {
  क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "n",
  च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "n",
  ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n",
  त: "t", थ: "th", द: "d", ध: "dh", न: "n",
  प: "p", फ: "ph", ब: "b", भ: "bh", म: "m",
  य: "y", र: "r", ल: "l", व: "v", श: "sh", ष: "sh", स: "s", ह: "h",
  क़: "q", ख़: "kh", ग़: "g", ज़: "z", ड़: "r", ढ़: "rh", फ़: "f", ळ: "l",
};

const VOWELS: Record<string, string> = {
  अ: "a", आ: "aa", इ: "i", ई: "ee", उ: "u", ऊ: "oo", ऋ: "ri",
  ए: "e", ऐ: "ai", ओ: "o", औ: "au", ऍ: "e", ऑ: "o",
};

const MATRAS: Record<string, string> = {
  "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ri",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॅ": "e", "ॉ": "o",
};

const VIRAMA = "्";
const NUKTA = "़";
const SIGNS: Record<string, string> = { "ं": "n", "ँ": "n", "ः": "h" };
const DIGITS = "०१२३४५६७८९";

export function transliterateDevanagari(input: string): string {
  const chars = Array.from(input.normalize("NFC"));
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    let c = chars[i];
    if (chars[i + 1] === NUKTA) {
      c = (c + NUKTA).normalize("NFC");
      i++;
    }
    if (CONSONANTS[c] !== undefined) {
      out += CONSONANTS[c];
      const next = chars[i + 1];
      if (next === VIRAMA) {
        i++;
      } else if (next !== undefined && MATRAS[next] !== undefined) {
        out += MATRAS[next];
        i++;
      } else {
        // Inherent "a" is dropped at the end of a word (schwa deletion): राहुल -> rahul, not rahula.
        const atWordEnd = next === undefined || !/[ऀ-ॿ]/.test(next);
        if (!atWordEnd) out += "a";
      }
    } else if (VOWELS[c] !== undefined) {
      out += VOWELS[c];
    } else if (SIGNS[c] !== undefined) {
      out += SIGNS[c];
    } else if (MATRAS[c] !== undefined) {
      out += MATRAS[c];
    } else if (DIGITS.includes(c)) {
      out += String(DIGITS.indexOf(c));
    } else if (c === "।" || c === "॥") {
      out += " ";
    } else {
      out += c;
    }
  }
  return out;
}

/** "Rahul & Priya" -> "rahul-priya". Always returns something non-empty. */
export function slugify(input: string, fallback = "client"): string {
  const ascii = transliterateDevanagari(input)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/&|\band\b|\bweds\b|\bwith\b|\baur\b/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return ascii || fallback;
}
