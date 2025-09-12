import { Injectable, signal } from '@angular/core';
import type { Patch } from 'immer';

import { Author } from '@shared/types';

import { AppAuthService } from '@src/app/services/app-auth.service';
import { StateService } from '../state/state.service';

export interface Command {
	actionId: string;
	forward: () => void;
	reverse: () => void;
}

function invertCommand(command: Command): Command {
	return {
		actionId: command.actionId,
		forward: command.reverse,
		reverse: command.forward,
	}
}

@Injectable()
export class HistoryService {
	private static _instance: HistoryService;
	static get instance(): HistoryService { return HistoryService._instance; }

	constructor(private auth: AppAuthService) {
		HistoryService._instance = this;
	}

	get stateService() { return StateService.instance; }
	
	// ==============================================================================================
	// Fields

	private undoStack: Command[] = [];
	private redoStack: Command[] = [];
	private changes: Command[] = []; // edits yet to be saved in backend
	private maxHistory = 200; // for undoStack and redoStack

	public isPending = signal<boolean>(this.changes.length != 0);

	// ==============================================================================================
	// Methods

	public recordCommand(
		actionId: string,
		forward: () => void,
		reverse: () => void,
	) {
		const command: Command = {actionId, forward, reverse}

		const lastCommand = this.undoStack[this.undoStack.length - 1];
		if (lastCommand && lastCommand.actionId === actionId) {
			const combinedCommand: Command = {
				actionId,
				forward: () => {lastCommand.forward(); command.forward()},  
				reverse: () => {command.reverse(); lastCommand.reverse()} 
			};

			this.undoStack[this.undoStack.length - 1] = combinedCommand;
		} else {
			this.undoStack.push(command);
			this.changes.push(command);
		}

		this.redoStack.length = 0;
		if (this.undoStack.length > this.maxHistory) { this.undoStack.shift(); }

		this.changes.push(command);
		this.isPending.set(this.changes.length != 0);
	}

	public undo(): boolean {
		if (this.undoStack.length === 0) return false;
	
		const command = this.undoStack.pop()!;
		command.reverse();
		
		this.redoStack.push(command);
		this.changes.push(invertCommand(command));
		this.isPending.set(this.changes.length != 0);

		return true;
	}

	public redo(): boolean {
		if (this.redoStack.length === 0) return false;
	
		const command = this.redoStack.pop()!;
		command.forward();

		this.undoStack.push(command);
		this.changes.push(command);
		this.isPending.set(this.changes.length != 0);

		return true;
	}

	getPendingCommandsAndClear(): Command[] {
		const out = this.changes.slice();
		this.changes.length = 0;
		this.isPending.set(false);
		return out;
	}

	fillPendingCommands(entries: Command[]) { // for restoring if save fails
		this.changes = entries.concat(this.changes);
		this.isPending.set(this.changes.length != 0);
	}
}