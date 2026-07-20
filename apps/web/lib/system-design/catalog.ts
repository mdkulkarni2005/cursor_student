/**
 * Static system-design scenario catalog — lives in code (no table, no seed), referenced by slug.
 * Mirrors apps/web/lib/dsa/catalog: adding a scenario is a new entry here, nothing else.
 */
export type SystemDesignDifficulty = "easy" | "medium" | "hard";

export type SystemDesignScenario = {
  slug: string;
  title: string;
  difficulty: SystemDesignDifficulty;
  prompt: string;
  hints: string[];
};

export const SYSTEM_DESIGN_SCENARIOS: SystemDesignScenario[] = [
  {
    slug: "url-shortener",
    title: "Design a URL Shortener",
    difficulty: "easy",
    prompt:
      "Design a service like bit.ly: users submit a long URL and get back a short code; visiting the short URL redirects to the original. Expect very read-heavy traffic (far more redirects than new links created).",
    hints: ["How do you generate short codes without collisions?", "What gets cached, and why?"],
  },
  {
    slug: "rate-limiter",
    title: "Design a Rate Limiter",
    difficulty: "easy",
    prompt:
      "Design a service that limits each API client to N requests per minute, shared across multiple API server instances (not per-instance limits).",
    hints: ["Where does the shared counter state live?", "What happens if that store goes down?"],
  },
  {
    slug: "chat-app",
    title: "Design a Chat Application",
    difficulty: "medium",
    prompt:
      "Design the backend for a 1:1 and group chat app (like WhatsApp): users send messages that must be delivered in near real-time to online recipients, and stored for offline recipients to fetch later.",
    hints: ["How do online clients receive messages instantly?", "How are undelivered messages queued for offline users?"],
  },
  {
    slug: "news-feed",
    title: "Design a Social Media News Feed",
    difficulty: "medium",
    prompt:
      "Design the backend for a news feed (like Instagram/Twitter home feed): users follow other users, and see a reverse-chronological feed of recent posts from people they follow.",
    hints: ["Fan-out on write vs fan-out on read — which fits a user with millions of followers?", "What gets cached per user?"],
  },
  {
    slug: "parking-lot",
    title: "Design a Parking Lot System",
    difficulty: "easy",
    prompt:
      "Design a system for a multi-level parking garage: track available spots by vehicle size, assign a spot on entry, compute the fee on exit.",
    hints: ["Where does spot availability state live so concurrent entries don't double-book a spot?"],
  },
  {
    slug: "ecommerce-checkout",
    title: "Design an E-commerce Checkout & Inventory System",
    difficulty: "hard",
    prompt:
      "Design the checkout flow for an online store: users add items to a cart and pay; the system must never oversell an item even when many users check out concurrently for the last unit in stock.",
    hints: ["What prevents two users from both successfully buying the last item?", "What happens if payment succeeds but inventory update fails?"],
  },
];

export const SYSTEM_DESIGN_BY_SLUG: Record<string, SystemDesignScenario> = Object.fromEntries(
  SYSTEM_DESIGN_SCENARIOS.map((s) => [s.slug, s]),
);
