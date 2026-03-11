export interface LibraryConfig {
  /** Discriminator stored in DB (e.g. "toy", "tool") */
  libraryType: string;
  /** URL slug — route is /libraries/:slug */
  slug: string;
  /** Display name shown in nav + headings */
  label: string;
  /** Short name for compact nav links, e.g. "Toys" */
  shortLabel: string;
  /** Emoji shown in cards and headings */
  emoji: string;
  /** Short tagline shown under the heading */
  tagline: string;
  /** Hero description paragraph */
  description: string;
  /** Label for the "Post" button, e.g. "Post a Toy" */
  postLabel: string;
  /** Singular item noun, e.g. "toy" */
  itemLabel: string;
  /** Plural item noun, e.g. "toys" */
  itemLabelPlural: string;
  /** Empty-state text for browse tab */
  emptyBrowseText: string;
  /** Empty-state text for My Listings tab */
  emptyMineText: string;
  /** Search bar placeholder */
  searchPlaceholder: string;
  /** Browser tab title */
  pageTitle: string;
  /** Meta description */
  metaDescription: string;
  /** Tailwind colour token for the hub card accent (bg-* class string) */
  accentBg: string;
  /** Text colour for the hub card */
  accentText: string;
  /** Condition options */
  conditions: { value: string; label: string }[];
  /** Category options (first entry should be the "none" option) */
  categories: { value: string; label: string }[];
}

const DEFAULT_CONDITIONS: LibraryConfig['conditions'] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

export const LIBRARY_CONFIGS: LibraryConfig[] = [
  {
    libraryType: 'toy',
    slug: 'toys',
    label: 'Toy Library',
    shortLabel: 'Toys',
    emoji: '🧸',
    tagline: 'Swap and borrow toys',
    description: 'Give toys a second life — borrow from families nearby or share yours with the community.',
    postLabel: 'Post a Toy',
    itemLabel: 'toy',
    itemLabelPlural: 'toys',
    emptyBrowseText: 'No toys listed yet. Be the first to post one!',
    emptyMineText: 'You haven\'t posted any toys yet. Click "Post a Toy" to get started.',
    searchPlaceholder: 'Search toys...',
    pageTitle: 'Toy Library — Community Library',
    metaDescription: 'Browse and borrow toys from families in your local community.',
    accentBg: 'bg-purple-100',
    accentText: 'text-purple-700',
    conditions: DEFAULT_CONDITIONS,
    categories: [
      { value: '', label: 'All categories' },
      { value: 'books', label: '📚 Books' },
      { value: 'outdoor', label: '🌳 Outdoor' },
      { value: 'educational', label: '🎓 Educational' },
      { value: 'dolls', label: '🧸 Dolls' },
      { value: 'vehicles', label: '🚗 Vehicles' },
      { value: 'other', label: '🎁 Other' },
    ],
  },
  {
    libraryType: 'tool',
    slug: 'tools',
    label: 'Tools Library',
    shortLabel: 'Tools',
    emoji: '🔧',
    tagline: 'Borrow the tools you need',
    description: 'No need to buy — borrow drills, saws, ladders and more from neighbours.',
    postLabel: 'Post a Tool',
    itemLabel: 'tool',
    itemLabelPlural: 'tools',
    emptyBrowseText: 'No tools listed yet. Be the first to share one!',
    emptyMineText: 'You haven\'t posted any tools yet. Click "Post a Tool" to get started.',
    searchPlaceholder: 'Search tools...',
    pageTitle: 'Tools Library — Community Library',
    metaDescription: 'Borrow tools from your local community. Drills, saws, ladders and more.',
    accentBg: 'bg-slate-100',
    accentText: 'text-slate-700',
    conditions: DEFAULT_CONDITIONS,
    categories: [
      { value: '', label: 'All categories' },
      { value: 'power_tools', label: '⚡ Power Tools' },
      { value: 'hand_tools', label: '🔨 Hand Tools' },
      { value: 'garden', label: '🌿 Garden' },
      { value: 'plumbing', label: '🚿 Plumbing' },
      { value: 'electrical', label: '💡 Electrical' },
      { value: 'ladders', label: '🪜 Ladders & Access' },
      { value: 'other', label: '📦 Other' },
    ],
  },
  {
    libraryType: 'event',
    slug: 'events',
    label: 'Event Hire',
    shortLabel: 'Events',
    emoji: '🎉',
    tagline: 'Hire items for your next event',
    description: 'Tables, chairs, decorations, sound equipment — borrow what you need for your next gathering.',
    postLabel: 'Post an Item',
    itemLabel: 'item',
    itemLabelPlural: 'items',
    emptyBrowseText: 'No event items listed yet. Be the first to post one!',
    emptyMineText: 'You haven\'t posted any items yet. Click "Post an Item" to get started.',
    searchPlaceholder: 'Search event items...',
    pageTitle: 'Event Hire — Community Library',
    metaDescription: 'Hire tables, chairs, decorations and more for your next community event.',
    accentBg: 'bg-teal-100',
    accentText: 'text-teal-700',
    conditions: DEFAULT_CONDITIONS,
    categories: [
      { value: '', label: 'All categories' },
      { value: 'furniture', label: '🪑 Furniture' },
      { value: 'decorations', label: '🎊 Decorations' },
      { value: 'audio_visual', label: '🔊 Audio / Visual' },
      { value: 'kitchen', label: '🍽️ Kitchen & Catering' },
      { value: 'outdoor', label: '⛺ Outdoor & Marquees' },
      { value: 'other', label: '📦 Other' },
    ],
  },
  {
    libraryType: 'game',
    slug: 'games',
    label: 'Games Library',
    shortLabel: 'Games',
    emoji: '🎮',
    tagline: 'Borrow board games & more',
    description: 'Try before you buy — borrow board games, card games, puzzles and video games from the community.',
    postLabel: 'Post a Game',
    itemLabel: 'game',
    itemLabelPlural: 'games',
    emptyBrowseText: 'No games listed yet. Be the first to share one!',
    emptyMineText: 'You haven\'t posted any games yet. Click "Post a Game" to get started.',
    searchPlaceholder: 'Search games...',
    pageTitle: 'Games Library — Community Library',
    metaDescription: 'Borrow board games, card games, puzzles and video games from your community.',
    accentBg: 'bg-green-100',
    accentText: 'text-green-700',
    conditions: DEFAULT_CONDITIONS,
    categories: [
      { value: '', label: 'All categories' },
      { value: 'board_games', label: '♟️ Board Games' },
      { value: 'card_games', label: '🃏 Card Games' },
      { value: 'puzzles', label: '🧩 Puzzles' },
      { value: 'video_games', label: '🕹️ Video Games' },
      { value: 'outdoor_games', label: '🌿 Outdoor Games' },
      { value: 'other', label: '📦 Other' },
    ],
  },
];

/** Look up a library config by slug or libraryType */
export function getLibraryConfig(slugOrType: string): LibraryConfig | undefined {
  return LIBRARY_CONFIGS.find(
    (c) => c.slug === slugOrType || c.libraryType === slugOrType
  );
}
