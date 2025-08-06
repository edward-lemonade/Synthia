export interface Key {
	display: string;
	root: string;
	type: 'maj'|'min';
	acc: boolean;
	alignedIdx: number;
}

export const Keys = {
	C: 		{ display: 'C', root: 'C', type: 'maj', acc: false, alignedIdx: 0 } as Key,
	Dflat: 	{ display: 'D♭', root: 'D♭', type: 'maj', acc: true, alignedIdx: 0 } as Key,
	D: 		{ display: 'D', root: 'D', type: 'maj', acc: false, alignedIdx: 1 } as Key,
	Eflat: 	{ display: 'E♭', root: 'E♭', type: 'maj', acc: true, alignedIdx: 1 } as Key,
	E: 		{ display: 'E', root: 'E', type: 'maj', acc: false, alignedIdx: 2 } as Key,
	F: 		{ display: 'F', root: 'F', type: 'maj', acc: false, alignedIdx: 3 } as Key,
	Gflat: 	{ display: 'G♭', root: 'G♭', type: 'maj', acc: true, alignedIdx: 3 } as Key,
	G: 		{ display: 'G', root: 'G', type: 'maj', acc: false, alignedIdx: 4 } as Key,
	Aflat: 	{ display: 'A♭', root: 'A♭', type: 'maj', acc: true, alignedIdx: 4 } as Key,
	A: 		{ display: 'A', root: 'A', type: 'maj', acc: false, alignedIdx: 5 } as Key,
	Bflat: 	{ display: 'B♭', root: 'B♭', type: 'maj', acc: true, alignedIdx: 5 } as Key,
	B: 		{ display: 'B', root: 'B', type: 'maj', acc: false, alignedIdx: 6 } as Key,

	C_m: 		{ display: 'Cm', root: 'C', type: 'min', acc: false, alignedIdx: 0 } as Key,
	Csharp_m: 	{ display: 'C♯m', root: 'C♯', type: 'min', acc: true, alignedIdx: 0 } as Key,
	D_m: 		{ display: 'Dm', root: 'D', type: 'min', acc: false, alignedIdx: 1 } as Key,
	Eflat_m: 	{ display: 'E♭m', root: 'E♭', type: 'min', acc: true, alignedIdx: 1 } as Key,
	E_m: 		{ display: 'Em', root: 'E', type: 'min', acc: false, alignedIdx: 2 } as Key,
	F_m: 		{ display: 'Fm', root: 'F', type: 'min', acc: false, alignedIdx: 3 } as Key,
	Fsharp_m: 	{ display: 'F♯m', root: 'F♯', type: 'min', acc: true, alignedIdx: 3 } as Key,
	G_m: 		{ display: 'Gm', root: 'G', type: 'min', acc: false, alignedIdx: 4 } as Key,
	Gsharp_m: 	{ display: 'G♯m', root: 'G♯', type: 'min', acc: true, alignedIdx: 4 } as Key,
	A_m: 		{ display: 'Am', root: 'A', type: 'min', acc: false, alignedIdx: 5 } as Key,
	Bflat_m: 	{ display: 'B♭m', root: 'B♭', type: 'min', acc: true, alignedIdx: 5 } as Key,
	B_m: 		{ display: 'Bm', root: 'B', type: 'min', acc: false, alignedIdx: 6 } as Key,
} as const;

export const KeyListAligned = {
	"maj" : {
		"nat": [Keys.C, Keys.D, Keys.E, Keys.F, Keys.G, Keys.A, Keys.B],
		"acc": [Keys.Dflat, Keys.Eflat, null, Keys.Gflat, Keys.Aflat, Keys.Bflat],
	},
	"min" : {
		"nat": [Keys.C_m, Keys.D_m, Keys.E_m, Keys.F_m, Keys.G_m, Keys.A_m, Keys.B_m],
		"acc": [Keys.Csharp_m, Keys.Eflat_m, null, Keys.Fsharp_m, Keys.Gsharp_m, Keys.Bflat_m],
	}
}

export const DefaultKey = Keys.C;
