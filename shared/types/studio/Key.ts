export enum Key {
	C=0, Dflat, D, Eflat, E, F, Gflat, G, Aflat, A, Bflat, B, C_m, Csharp_m, D_m, Eflat_m, E_m, F_m, Fsharp_m, G_m, Gsharp_m, A_m, Bflat_m, B_m
}

export interface KeyInfo {
	display: string;
	root: string;
	type: 'maj'|'min';
	acc: boolean;
	alignedIdx: number;
}

export const KEY_INFO : Record<Key, KeyInfo> = {
	[Key.C]: 		{ display: 'C', root: 'C', type: 'maj', acc: false, alignedIdx: 0 } as KeyInfo,
	[Key.Dflat]: 	{ display: 'D♭', root: 'D♭', type: 'maj', acc: true, alignedIdx: 0 } as KeyInfo,
	[Key.D]: 		{ display: 'D', root: 'D', type: 'maj', acc: false, alignedIdx: 1 } as KeyInfo,
	[Key.Eflat]: 	{ display: 'E♭', root: 'E♭', type: 'maj', acc: true, alignedIdx: 1 } as KeyInfo,
	[Key.E]: 		{ display: 'E', root: 'E', type: 'maj', acc: false, alignedIdx: 2 } as KeyInfo,
	[Key.F]: 		{ display: 'F', root: 'F', type: 'maj', acc: false, alignedIdx: 3 } as KeyInfo,
	[Key.Gflat]: 	{ display: 'G♭', root: 'G♭', type: 'maj', acc: true, alignedIdx: 3 } as KeyInfo,
	[Key.G]: 		{ display: 'G', root: 'G', type: 'maj', acc: false, alignedIdx: 4 } as KeyInfo,
	[Key.Aflat]: 	{ display: 'A♭', root: 'A♭', type: 'maj', acc: true, alignedIdx: 4 } as KeyInfo,
	[Key.A]: 		{ display: 'A', root: 'A', type: 'maj', acc: false, alignedIdx: 5 } as KeyInfo,
	[Key.Bflat]: 	{ display: 'B♭', root: 'B♭', type: 'maj', acc: true, alignedIdx: 5 } as KeyInfo,
	[Key.B]: 		{ display: 'B', root: 'B', type: 'maj', acc: false, alignedIdx: 6 } as KeyInfo,

	[Key.C_m]: 		{ display: 'Cm', root: 'C', type: 'min', acc: false, alignedIdx: 0 } as KeyInfo,
	[Key.Csharp_m]: { display: 'C♯m', root: 'C♯', type: 'min', acc: true, alignedIdx: 0 } as KeyInfo,
	[Key.D_m]: 		{ display: 'Dm', root: 'D', type: 'min', acc: false, alignedIdx: 1 } as KeyInfo,
	[Key.Eflat_m]: 	{ display: 'E♭m', root: 'E♭', type: 'min', acc: true, alignedIdx: 1 } as KeyInfo,
	[Key.E_m]: 		{ display: 'Em', root: 'E', type: 'min', acc: false, alignedIdx: 2 } as KeyInfo,
	[Key.F_m]: 		{ display: 'Fm', root: 'F', type: 'min', acc: false, alignedIdx: 3 } as KeyInfo,
	[Key.Fsharp_m]: { display: 'F♯m', root: 'F♯', type: 'min', acc: true, alignedIdx: 3 } as KeyInfo,
	[Key.G_m]: 		{ display: 'Gm', root: 'G', type: 'min', acc: false, alignedIdx: 4 } as KeyInfo,
	[Key.Gsharp_m]: { display: 'G♯m', root: 'G♯', type: 'min', acc: true, alignedIdx: 4 } as KeyInfo,
	[Key.A_m]: 		{ display: 'Am', root: 'A', type: 'min', acc: false, alignedIdx: 5 } as KeyInfo,
	[Key.Bflat_m]: 	{ display: 'B♭m', root: 'B♭', type: 'min', acc: true, alignedIdx: 5 } as KeyInfo,
	[Key.B_m]: 		{ display: 'Bm', root: 'B', type: 'min', acc: false, alignedIdx: 6 } as KeyInfo,
} as const;

export const KeyListAligned = {
	"maj" : {
		"nat": [Key.C, Key.D, Key.E, Key.F, Key.G, Key.A, Key.B],
		"acc": [Key.Dflat, Key.Eflat, null, Key.Gflat, Key.Aflat, Key.Bflat],
	},
	"min" : {
		"nat": [Key.C_m, Key.D_m, Key.E_m, Key.F_m, Key.G_m, Key.A_m, Key.B_m],
		"acc": [Key.Csharp_m, Key.Eflat_m, null, Key.Fsharp_m, Key.Gsharp_m, Key.Bflat_m],
	}
}

export const DefaultKey = Key.C;