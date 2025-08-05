export interface Key {
	display: string;
	tonic: string;
	type: 'maj'|'min';
	acc: boolean;
	alignedIdx: number;
}

export const Keys = {
	C: 		{ display: 'C', tonic: 'C', type: 'maj', acc: false, alignedIdx: 0 } as Key,
	Dflat: 	{ display: 'D♭', tonic: 'D♭', type: 'maj', acc: true, alignedIdx: 0 } as Key,
	D: 		{ display: 'D', tonic: 'D', type: 'maj', acc: false, alignedIdx: 1 } as Key,
	Eflat: 	{ display: 'E♭', tonic: 'E♭', type: 'maj', acc: true, alignedIdx: 1 } as Key,
	E: 		{ display: 'E', tonic: 'E', type: 'maj', acc: false, alignedIdx: 2 } as Key,
	F: 		{ display: 'F', tonic: 'F', type: 'maj', acc: false, alignedIdx: 3 } as Key,
	Gflat: 	{ display: 'G♭', tonic: 'G♭', type: 'maj', acc: true, alignedIdx: 3 } as Key,
	G: 		{ display: 'G', tonic: 'G', type: 'maj', acc: false, alignedIdx: 4 } as Key,
	Aflat: 	{ display: 'A♭', tonic: 'A♭', type: 'maj', acc: true, alignedIdx: 4 } as Key,
	A: 		{ display: 'A', tonic: 'A', type: 'maj', acc: false, alignedIdx: 5 } as Key,
	Bflat: 	{ display: 'B♭', tonic: 'B♭', type: 'maj', acc: true, alignedIdx: 5 } as Key,
	B: 		{ display: 'B', tonic: 'B', type: 'maj', acc: false, alignedIdx: 6 } as Key,

	C_m: 		{ display: 'Cm', tonic: 'C', type: 'min', acc: false, alignedIdx: 0 } as Key,
	Csharp_m: 	{ display: 'C♯m', tonic: 'C♯', type: 'min', acc: true, alignedIdx: 0 } as Key,
	D_m: 		{ display: 'Dm', tonic: 'D', type: 'min', acc: false, alignedIdx: 1 } as Key,
	Eflat_m: 	{ display: 'E♭m', tonic: 'E♭', type: 'min', acc: true, alignedIdx: 1 } as Key,
	E_m: 		{ display: 'Em', tonic: 'E', type: 'min', acc: false, alignedIdx: 2 } as Key,
	F_m: 		{ display: 'Fm', tonic: 'F', type: 'min', acc: false, alignedIdx: 3 } as Key,
	Fsharp_m: 	{ display: 'F♯m', tonic: 'F♯', type: 'min', acc: true, alignedIdx: 3 } as Key,
	G_m: 		{ display: 'Gm', tonic: 'G', type: 'min', acc: false, alignedIdx: 4 } as Key,
	Gsharp_m: 	{ display: 'G♯m', tonic: 'G♯', type: 'min', acc: true, alignedIdx: 4 } as Key,
	A_m: 		{ display: 'Am', tonic: 'A', type: 'min', acc: false, alignedIdx: 5 } as Key,
	Bflat_m: 	{ display: 'B♭m', tonic: 'B♭', type: 'min', acc: true, alignedIdx: 5 } as Key,
	B_m: 		{ display: 'Bm', tonic: 'B', type: 'min', acc: false, alignedIdx: 6 } as Key,
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
