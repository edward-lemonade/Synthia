import { Key } from './Key';
import { TimeSignature } from './TimeSignature';

export interface Globals {
	bpm : number;
	key : Key;
	centOffset : number;
	timeSignature : TimeSignature;
	masterVolume : number;
}