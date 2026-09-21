// Types for cards-lite. The library ships as one ES5 file with a UMD tail (ADR 007), so this
// declares a single value and exports it with `export =`.

type Colour = string;
type Pin = Colour | 'auto';

declare namespace Cards {
	type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
	type Suit = 'h' | 'd' | 'c' | 's';
	type Spread = 'fan' | 'row' | 'cascade' | 'stack' | 'pile' | 'pair' | 'auto';
	type Preset =
		| 'royal-flush' | 'straight-flush' | 'four-of-a-kind' | 'full-house' | 'flush'
		| 'straight' | 'three-of-a-kind' | 'two-pair' | 'pair' | 'high-card'
		| 'blackjack' | 'double-down';

	/** Shared by card(), hand() and deck(). */
	interface Common {
		/** A string (a domain name is fine) or a number taken as a 32-bit unsigned integer. */
		seed?: number | string;
		brand?: string | string[];
		theme?: 'dark' | 'light';
		/** Governs pips, court and back — never the face, which is always paper (ADR 011). */
		style?: 'line' | 'flat';
		/** 2 standard · 1 drops the back's lattice, which `deck()` defaults to. */
		detail?: 1 | 2;
		weight?: number;
		heart?: Pin;
		diamond?: Pin;
		club?: Pin;
		spade?: Pin;
		gilt?: Pin;
		stock?: Pin;
		ink?: Pin;
		back?: Pin;
		/** false leaves the card unpainted. */
		face?: boolean;
		index?: 'both' | 'tl' | 'none';
		pips?: boolean;
		lattice?: 'auto' | 'trigon' | 'hex' | 'octagon' | 'none';
		/** Width; the height follows the viewBox. */
		size?: number;
		/** Decimals for coordinates; angles always carry two. */
		precision?: number;
		/** Extra entropy for ids — the same picture twice on one page. */
		salt?: string;
		/** false leaves a court's centre to a large pip instead of the rosette. Honoured by all three calls. */
		emblem?: boolean;
		/** role="img" with this label; without it the picture is aria-hidden. */
		title?: string;
	}

	interface CardOptions extends Common {
		/** 'QH', '10S', 'As' — rank and suit at once. */
		card?: string;
		rank?: Rank | number | 'auto';
		suit?: Suit | 'auto';
		facedown?: boolean;

	}

	interface HandOptions extends Common {
		/** 'AS KS QS JS 10S' or the same as an array. Wins over `preset` and `count`. */
		cards?: string | string[];
		/** A named hand. Data only: the library evaluates nothing (ADR 010). */
		preset?: Preset;
		count?: number;
		spread?: Spread;
		/** The fraction of each card left visible; clamped up to IDX/W when seeded. */
		reveal?: number | 'auto';
		step?: number | 'auto';
		arc?: number | 'auto';
		lean?: number | 'auto';
		/** Multiplier on every per-card wobble; 0 is machine-neat. */
		jitter?: number;
		facedown?: 'none' | 'all' | 'first' | 'last' | string | number[] | boolean;
		/** One-shot CSS deal; stopped by prefers-reduced-motion. */
		motion?: 'deal' | boolean;
		/** Period divisor; 0 turns motion off and returns the static bytes. */
		speed?: number;
		/** Framing. Read by hand() alone — card() and deck() draw into a fixed box. */
		fit?: 'tight' | 'square';
		pad?: number;
	}

	interface DeckOptions extends Common {
		/** The sheet has no slots to address: the per-slot forms of a hand do not apply. */
		facedown?: boolean | 'all';
	}

	interface Palette {
		heart: string;
		diamond: string;
		club: string;
		spade: string;
		gilt: string;
		stock: string;
		ink: string;
		back: string;
		panel: string;
		stroke: string[];
		background: string;
		halo: string;
	}

	interface Handle {
		el: Element;
		get(): HandOptions & CardOptions & DeckOptions;
		set(opts: HandOptions & CardOptions & DeckOptions): void;
		destroy(): void;
	}
}

declare const Cards: {
	/** Pure: one card as an SVG string. Runs in Node and in the browser. */
	card(opts?: Cards.CardOptions): string;
	/** Pure: a spread — the heart of the library. */
	hand(opts?: Cards.HandOptions): string;
	/** Pure: all 52 faces as one sheet. Its own output class, 48-51 KB raw. */
	deck(opts?: Cards.DeckOptions): string;
	palette(brand?: string | string[], opts?: { theme?: 'dark' | 'light' }): Cards.Palette;
	/** Browser only. Returns null when the selector matches nothing. */
	init(target: string | Element, opts?: Cards.HandOptions & Cards.CardOptions & Cards.DeckOptions & { draw?: 'hand' | 'card' | 'deck' }): Cards.Handle | null;
	/** The thirteen ranks, in order. */
	RANKS: Cards.Rank[];
	/** The four suits as one string, 'hdcs'. */
	SUITS: string;
	/** The index reach: the strip that must stay uncovered for a rank to read. */
	IDX: number;
};

export = Cards;
