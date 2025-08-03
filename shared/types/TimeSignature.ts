export interface TimeSignature {
	N: 1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16,
	D: 1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16,
}
export const TimeSigMaxN = 16;
export const TimeSigMaxD = 16;
export const TimeSigDefault = {N: 4, D: 4} as TimeSignature;