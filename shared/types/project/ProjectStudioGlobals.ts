import { Key, TimeSignature } from '../studio';

export interface ProjectStudioGlobals {
	bpm : number;
	key : Key;
	centOffset : number;
	timeSignature : TimeSignature;
	masterVolume : number;
}