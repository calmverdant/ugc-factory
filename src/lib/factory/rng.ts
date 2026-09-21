export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  if (arr.length === 0) {
    throw new Error("pick() from empty list");
  }
  return arr[Math.floor(rng() * arr.length)]!;
}

export function pickN<T>(rng: Rng, arr: readonly T[], n: number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy.slice(0, Math.min(n, copy.length));
}

export function comboKey(parts: {
  format: string;
  hook: string;
  persona: string;
  platform: string;
  duration: number;
}): string {
  return `${parts.format}|${parts.hook}|${parts.persona}|${parts.platform}|${parts.duration}`;
}
