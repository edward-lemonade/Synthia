export interface Key {
	display: string;
	tonic: string;
	type: string;
	acc: boolean;
}

export const Keys = {
	C: 		{ display: 'C', tonic: 'C', type: 'maj', acc: false } as Key,
	Dflat: 	{ display: 'D♭', tonic: 'D♭', type: 'maj', acc: true } as Key,
	D: 		{ display: 'D', tonic: 'D', type: 'maj', acc: false } as Key,
	Eflat: 	{ display: 'E♭', tonic: 'E♭', type: 'maj', acc: true } as Key,
	E: 		{ display: 'E', tonic: 'E', type: 'maj', acc: false } as Key,
	F: 		{ display: 'F', tonic: 'F', type: 'maj', acc: false } as Key,
	Gflat: 	{ display: 'G♭', tonic: 'G♭', type: 'maj', acc: true } as Key,
	G: 		{ display: 'G', tonic: 'G', type: 'maj', acc: false } as Key,
	Aflat: 	{ display: 'A♭', tonic: 'A♭', type: 'maj', acc: true } as Key,
	A: 		{ display: 'A', tonic: 'A', type: 'maj', acc: false } as Key,
	Bflat: 	{ display: 'B♭', tonic: 'B♭', type: 'maj', acc: true } as Key,
	B: 		{ display: 'B', tonic: 'B', type: 'maj', acc: false } as Key,

	C_m: 		{ display: 'Cm', tonic: 'C', type: 'min', acc: false } as Key,
	Csharp_m: 	{ display: 'C♯m', tonic: 'C♯', type: 'min', acc: true } as Key,
	D_m: 		{ display: 'Dm', tonic: 'D', type: 'min', acc: false } as Key,
	Eflat_m: 	{ display: 'E♭m', tonic: 'E♭', type: 'min', acc: true } as Key,
	E_m: 		{ display: 'Em', tonic: 'E', type: 'min', acc: false } as Key,
	F_m: 		{ display: 'Fm', tonic: 'F', type: 'min', acc: false } as Key,
	Fsharp_m: 	{ display: 'F♯m', tonic: 'F♯', type: 'min', acc: true } as Key,
	G_m: 		{ display: 'Gm', tonic: 'G', type: 'min', acc: false } as Key,
	Gsharp_m: 	{ display: 'G♯m', tonic: 'G♯', type: 'min', acc: true } as Key,
	A_m: 		{ display: 'Am', tonic: 'A', type: 'min', acc: false } as Key,
	Bflat_m: 	{ display: 'B♭m', tonic: 'B♭', type: 'min', acc: true } as Key,
	B_m: 		{ display: 'Bm', tonic: 'B', type: 'min', acc: false } as Key,
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



export interface TimeSignature {
	N: 1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16,
	D: 1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16,
}
export const TimeSigMaxN = 16;
export const TimeSigMaxD = 16;
export const TimeSigDefault = {N: 4, D: 4} as TimeSignature;