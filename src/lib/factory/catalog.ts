import type {
  Duration,
  FormatId,
  HookId,
  PersonaId,
  PlatformId,
} from "./types";

export type FormatDef = {
  id: FormatId;
  label: string;
  blurb: string;
  durations: Duration[];
};

export type HookDef = {
  id: HookId;
  label: string;
  lines: string[];
};

export type PersonaDef = {
  id: PersonaId;
  label: string;
  aside: string[];
  energy: string;
  camera: string;
};

export type PlatformDef = {
  id: PlatformId;
  label: string;
  short: string;
  aspect: string;
  captionTone: string;
  ctaLines: string[];
  durations: Duration[];
};

export const FORMATS: FormatDef[] = [
  {
    id: "problem-solution",
    label: "Problem → solution",
    blurb: "Name the annoyance, then show the fix in-hand.",
    durations: [15, 30, 45],
  },
  {
    id: "unboxing",
    label: "Unboxing",
    blurb: "Hands, packing, first use, first reaction.",
    durations: [15, 30],
  },
  {
    id: "day-in-life",
    label: "Day in the life",
    blurb: "Product as a repeating beat in a real day.",
    durations: [30, 45],
  },
  {
    id: "testimonial",
    label: "Testimonial",
    blurb: "Talking-head review with one proof moment.",
    durations: [15, 30, 45],
  },
  {
    id: "before-after",
    label: "Before / after",
    blurb: "Split the timeline. Make the delta obvious.",
    durations: [15, 30],
  },
  {
    id: "grwm",
    label: "Get ready with me",
    blurb: "Mirror, sink, sequence. Product is a step, not a pitch.",
    durations: [30, 45],
  },
  {
    id: "myth-bust",
    label: "Myth-bust",
    blurb: "Call out the category lie, then demonstrate.",
    durations: [15, 30],
  },
  {
    id: "listicle",
    label: "Listicle",
    blurb: "Three numbered reasons, stacked fast.",
    durations: [15, 30],
  },
  {
    id: "pov",
    label: "POV",
    blurb: "Camera as the viewer. Second person, close.",
    durations: [15, 30],
  },
  {
    id: "green-screen",
    label: "Green screen",
    blurb: "Talking head over the product page, reviews, or a myth.",
    durations: [15, 30],
  },
  {
    id: "walk-and-talk",
    label: "Walk and talk",
    blurb: "Moving through a hallway or street. Handheld, alive.",
    durations: [15, 30],
  },
  {
    id: "silent-text",
    label: "Sound-off",
    blurb: "Built for mute. Big text, texture, almost no speech.",
    durations: [15, 30],
  },
  {
    id: "street-interview",
    label: "Street interview",
    blurb: "Self as stranger. Ask, react, reveal the product.",
    durations: [15, 30],
  },
  {
    id: "howto",
    label: "How-to",
    blurb: "Teach the use. Then the reason it matters.",
    durations: [30, 45],
  },
  {
    id: "wish-i-knew",
    label: "Things I wish I knew",
    blurb: "Confessional list. Ends on the product as the lesson.",
    durations: [30, 45],
  },
  {
    id: "comparison",
    label: "This vs that",
    blurb: "Old way versus this. One clear winner, no pile-on.",
    durations: [15, 30],
  },
];

export const HOOKS: HookDef[] = [
  {
    id: "stop-scroll",
    label: "Stop scrolling",
    lines: [
      "Stop scrolling if {problem}.",
      "Stop scrolling if you still deal with {problem}.",
      "If {problem} is your whole personality after 11pm, stay.",
    ],
  },
  {
    id: "didnt-expect",
    label: "Didn't expect it",
    lines: [
      "I did not expect {name} to work. It did.",
      "I bought {name} as a joke. I am still using it.",
      "Nobody told me {name} would actually {outcome}.",
    ],
  },
  {
    id: "mistake",
    label: "The mistake",
    lines: [
      "I was using {category} completely wrong.",
      "The mistake was {objection}. Then I switched.",
      "I wasted a year on {objection} before {name}.",
    ],
  },
  {
    id: "unpopular",
    label: "Unpopular opinion",
    lines: [
      "Unpopular opinion: you can skip {category} that still does {objection}.",
      "Unpopular: {differentiator} matters more than the brand on the label.",
      "Hot take — {objection} is not a personality. {name} is the exit.",
    ],
  },
  {
    id: "three-things",
    label: "Three things",
    lines: [
      "Three things nobody tells you about {category}.",
      "Three reasons I stopped recommending the usual {category}.",
      "Three things I wish I knew before I bought {name}.",
    ],
  },
  {
    id: "pov",
    label: "POV",
    lines: [
      "POV: you finally {outcome}.",
      "POV: you stopped putting up with {problem}.",
      "POV: your {category} actually does the job.",
    ],
  },
  {
    id: "wait-actually",
    label: "Wait, actually",
    lines: [
      "Wait — {name} actually {claim}.",
      "Okay wait. {proof}.",
      "Hold on. {differentiator}. That is the whole ad.",
    ],
  },
  {
    id: "dont-buy",
    label: "Don't buy yet",
    lines: [
      "Don't buy another {category} until you see this.",
      "Don't checkout before you watch this 20 seconds.",
      "Please do not spend {price} on the wrong {category}.",
    ],
  },
  {
    id: "skeptical",
    label: "I was skeptical",
    lines: [
      "I was skeptical because {objection}.",
      "I did not think {price} {category} could do this.",
      "I almost skipped {name} because of {objection}.",
    ],
  },
  {
    id: "made-me",
    label: "Someone made me",
    lines: [
      "My {audience} made me try {name}.",
      "A friend sent me {name} and I ignored it. Then I didn't.",
      "I only tried {name} because I was tired of {problem}.",
    ],
  },
  {
    id: "what-price-gets",
    label: "What the price gets",
    lines: [
      "Here is what {price} actually gets you.",
      "{price}. Let me show you the part they crop out.",
      "If {name} is {price}, this is the honest receipt.",
    ],
  },
  {
    id: "if-you-struggle",
    label: "If you struggle",
    lines: [
      "If you struggle with {problem}, watch this.",
      "If {problem} is still winning, I need 20 seconds.",
      "For anyone still fighting {problem} — stay.",
    ],
  },
  {
    id: "switched",
    label: "Why I switched",
    lines: [
      "This is the reason I switched from {objection}.",
      "I switched because {differentiator}.",
      "The switch was not dramatic. The result was.",
    ],
  },
  {
    id: "nobody-talks",
    label: "Nobody talks about",
    lines: [
      "Tell me why nobody talks about {differentiator}.",
      "The part nobody puts in the ad: {mechanism}.",
      "Can we talk about {ingredient} for a second?",
    ],
  },
  {
    id: "day-n",
    label: "Day N",
    lines: [
      "Day 14 of using {name}.",
      "Week two on {name} and I am annoyed I waited.",
      "Day 30. Honest update on {name}.",
    ],
  },
  {
    id: "ranking",
    label: "Ranking",
    lines: [
      "Ranking every {category} I tried this year.",
      "I ranked {category}. {name} is not where I expected.",
      "End of year ranking: {category} edition.",
    ],
  },
  {
    id: "honest-review",
    label: "Honest review",
    lines: [
      "The honest review they will not post.",
      "Honest {name} review. No brand deck.",
      "If this was a bad product I would say so.",
    ],
  },
  {
    id: "before-checkout",
    label: "Before you checkout",
    lines: [
      "Watch this before you checkout.",
      "One thing to know before you buy {name}.",
      "Read the label with me before you spend {price}.",
    ],
  },
  {
    id: "almost-returned",
    label: "Almost returned it",
    lines: [
      "I almost returned it until {proof}.",
      "I had the return open. Then I noticed {claim}.",
      "Return window was ending. {name} had other plans.",
    ],
  },
  {
    id: "overheard",
    label: "Overheard",
    lines: [
      "I overheard someone say {name} actually {outcome}.",
      "Someone in line said skip {objection}. Get {name}.",
      "Not an ad. I overheard this and went home and checked.",
    ],
  },
  {
    id: "red-flag",
    label: "Red flag",
    lines: [
      "Red flag if your {category} still does {objection}.",
      "If the first ingredient is a vibe, that is a red flag.",
      "The red flag was {problem}. {name} is the correction.",
    ],
  },
  {
    id: "receipt",
    label: "Receipt",
    lines: [
      "Here is the receipt. {price}. {claim}.",
      "I kept the receipt because I did not believe {proof}.",
      "Receipt energy: {differentiator}. That is it.",
    ],
  },
  {
    id: "two-am",
    label: "2am version",
    lines: [
      "This is the 2am version of {name}. No lighting. No script.",
      "2am. {problem} is loud. {name} is what I reach for.",
      "If it works at 2am, it works on a Tuesday.",
    ],
  },
  {
    id: "my-people",
    label: "My people",
    lines: [
      "This is for my people who still deal with {problem}.",
      "If you are {audience}, this is the one I actually send.",
      "My people stopped recommending {objection}. Here is why.",
    ],
  },
  {
    id: "quiet-part",
    label: "Quiet part",
    lines: [
      "The quiet part: {differentiator}.",
      "They will not say this in the ad. {mechanism}.",
      "Quiet part out loud — {claim}.",
    ],
  },
  {
    id: "last-one",
    label: "Last one I buy",
    lines: [
      "This is the last {category} I am buying this year.",
      "I said that about three others. {name} actually stuck.",
      "Last one. Because {outcome}.",
    ],
  },
  {
    id: "camera-test",
    label: "Camera test",
    lines: [
      "Camera test. No filter. {name} in the real light.",
      "If it looks fake on camera I will say so.",
      "This is what {name} looks like on a phone, not a set.",
    ],
  },
  {
    id: "after-one-use",
    label: "After one use",
    lines: [
      "After one use of {name}: {outcome}.",
      "I do not do 30-day diaries. One use. Here is what changed.",
      "First use. {claim}. That is the review.",
    ],
  },
  {
    id: "grocery",
    label: "In the aisle",
    lines: [
      "I was in the aisle comparing {name} to {competitor}.",
      "Grocery-store decision. {price}. I picked {name}.",
      "This is the aisle test. Same shelf. Different outcome.",
    ],
  },
  {
    id: "not-sponsored",
    label: "Not sponsored",
    lines: [
      "Not sponsored. I bought {name} with my own {price}.",
      "If a brand paid me I would say so. They did not.",
      "Unpaid. That is why I can say {differentiator}.",
    ],
  },
  {
    id: "habit-break",
    label: "Habit break",
    lines: [
      "I broke the {objection} habit. {name} is the swap.",
      "The old habit was {problem}. New habit is {name}.",
      "You do not need a new personality. You need a swap.",
    ],
  },
];

export const PERSONAS: PersonaDef[] = [
  {
    id: "skeptic",
    label: "Skeptical first-timer",
    aside: [
      "I do not make videos like this.",
      "I was ready to hate it.",
      "I am the person who reads the one-star reviews first.",
    ],
    energy: "dry, unimpressed at first, then quietly convinced",
    camera: "static talking head, one eyebrow slightly up, no dance cuts",
  },
  {
    id: "convert",
    label: "Converted hater",
    aside: [
      "I used to roast this whole category.",
      "I told my friends it was a scam. I was wrong.",
      "I owe an apology to my past self.",
    ],
    energy: "confessional, a little embarrassed, then proud",
    camera: "close, slightly messy room, genuine laugh on the turn",
  },
  {
    id: "parent",
    label: "Busy parent",
    aside: [
      "I have a twelve-minute window after bedtime.",
      "If it takes a ritual, it is not surviving this house.",
      "I need things that work on a Wednesday.",
    ],
    energy: "tired-honest, practical, zero fluff",
    camera: "kitchen or hallway, real house noise is fine, keep it short",
  },
  {
    id: "maximalist",
    label: "Routine maximalist",
    aside: [
      "My shelf was already full.",
      "I track this stuff. I am annoying about it.",
      "It had to earn a slot, not a vibe.",
    ],
    energy: "precise, a little nerdy, still human",
    camera: "organized shelf, labeled, product placed with intent",
  },
  {
    id: "student",
    label: "Budget student",
    aside: [
      "I do not have money to waste on a pretty bottle.",
      "If it is {price} it has to replace something else.",
      "I compared this against the cheap version. Here is the difference.",
    ],
    energy: "price-first, blunt, still warm",
    camera: "desk or small apartment, natural window, no set design",
  },
  {
    id: "creator",
    label: "Creator friend",
    aside: [
      "I am showing you the real texture. No beauty filter.",
      "If you steal this angle, at least light it like this.",
      "I would not post this if I could not stand behind it.",
    ],
    energy: "direct-to-camera, craft-aware, still native",
    camera: "slightly better light than amateur, still handheld",
  },
];

export const PLATFORMS: PlatformDef[] = [
  {
    id: "tiktok",
    label: "TikTok",
    short: "TikTok",
    aspect: "9:16",
    captionTone: "lowercase-friendly, one thought, native CTA",
    ctaLines: [
      "Comment {cta-word} and I will send the link.",
      "Link is on my page. {cta}.",
      "Follow if you want the honest version of this category.",
    ],
    durations: [15, 30],
  },
  {
    id: "reels",
    label: "Instagram Reels",
    short: "Reels",
    aspect: "9:16",
    captionTone: "clean, saveable, light line breaks",
    ctaLines: [
      "Save this so you do not lose the name. {cta}.",
      "Link in bio. {cta}.",
      "Share this with the friend who still deals with {problem}.",
    ],
    durations: [15, 30],
  },
  {
    id: "shorts",
    label: "YouTube Shorts",
    short: "Shorts",
    aspect: "9:16",
    captionTone: "searchable, complete sentence, product name early",
    ctaLines: [
      "Tap the product link if you want {outcome}.",
      "Full routine is on my channel. {cta}.",
      "Name is {name}. Link under the video.",
    ],
    durations: [30, 45],
  },
  {
    id: "meta",
    label: "Meta feed",
    short: "Meta",
    aspect: "4:5",
    captionTone: "complete primary text, one proof, one CTA",
    ctaLines: [
      "Shop {name} — link below.",
      "{cta}. Shipping notes are on the product page.",
      "If {problem} is still the story, start here.",
    ],
    durations: [15, 30],
  },
  {
    id: "pinterest",
    label: "Pinterest",
    short: "Pin",
    aspect: "9:16",
    captionTone: "keyword-rich, how-to, saveable title energy",
    ctaLines: [
      "Save this {category} routine for later.",
      "{cta}. Pin the steps so you can recreate them.",
      "Search {name} after you save this.",
    ],
    durations: [15, 30],
  },
];

export const FORMAT_BY_ID = Object.fromEntries(
  FORMATS.map((item) => [item.id, item]),
) as Record<FormatId, FormatDef>;

export const HOOK_BY_ID = Object.fromEntries(
  HOOKS.map((item) => [item.id, item]),
) as Record<HookId, HookDef>;

export const PERSONA_BY_ID = Object.fromEntries(
  PERSONAS.map((item) => [item.id, item]),
) as Record<PersonaId, PersonaDef>;

export const PLATFORM_BY_ID = Object.fromEntries(
  PLATFORMS.map((item) => [item.id, item]),
) as Record<PlatformId, PlatformDef>;
