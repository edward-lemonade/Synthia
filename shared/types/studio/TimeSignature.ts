export const TimeSigOptionsN = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
export const TimeSigOptionsD = [2,4,8,16];
export const DefaultTimeSignature = {N: 4, D: 4} as TimeSignature;

export interface TimeSignature {
	N: number,
	D: number,
}

export function isTimeSignature(obj: any): obj is TimeSignature {
	return obj && typeof obj.N === 'number' && typeof obj.D === 'number';
}