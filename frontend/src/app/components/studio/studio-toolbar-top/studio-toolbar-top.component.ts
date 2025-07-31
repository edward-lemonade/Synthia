import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';

import { COLORS } from '@theme';

@Component({
	selector: 'app-studio-toolbar-top',
	imports: [MatIcon, MatToolbar],
	template: `
		<mat-toolbar class="toolbar">
			<div class="toolbar-section left-section">
				<button class="menu-btn">
					<mat-icon>menu</mat-icon>
				</button>
				<span>NoteFlyte</span>
			</div>

			<div class="toolbar-section center-section">
				<div class="title-container">
					<mat-icon class="title-icon">edit</mat-icon>
					<input class="title-input" placeholder="Untitled" type="text">
				</div>
			</div>

			<div class="toolbar-section right-section">
				<button class="toolbar-btn save-btn">
					<mat-icon>save</mat-icon>
					Save
				</button>
				<button class="toolbar-btn export-btn">
					<mat-icon>file_download</mat-icon>
					Export
				</button>
				<button class="toolbar-btn publish-btn">
					<mat-icon>cloud_upload</mat-icon>
					Publish
				</button>
				<button class="toolbar-btn share-btn">
					<mat-icon>people</mat-icon>
					Share
				</button>
			</div>
		</mat-toolbar>
	`,
	styles: `
		.toolbar {
			background: ${COLORS.APPBAR_BG};
			color: ${COLORS.APPBAR_TEXT};
			height: 40px;

			position: sticky;
			top: 0;
			z-index: 1000;

			width: 100%;
			box-sizing: border-box;
			padding-left: 8px;
			padding-right: 8px;

			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.toolbar-section {
			flex: 1;
			display: flex;
			align-items: center;
			height: 100%;
		}
		.left-section {
			justify-content: flex-start;
			gap: 8px;
		}
		.center-section {
			justify-content: center;
		}
		.right-section {
			justify-content: flex-end;
			gap: 8px;
		}

		.menu-btn {
			display: flex;
			align-items: center;
			cursor: pointer;
			border-radius: 8px;
			background: transparent;	
			border: none;
			color: #fff;
		}

		.title-container {
			display: flex;
			align-items: center;
			gap: 8px;
			width: 300px;
			height: 14px;
			padding: 8px 12px;
			border-radius: 8px;
			background: transparent;
			border: 1px solid transparent;
			transition: all 0.2s ease;
			cursor: text;
		}
		.title-container:hover {
			background: rgba(255, 255, 255, 0.1);
			border-color: rgba(255, 255, 255, 0.2);
		}
		.title-container:focus-within {
			background: rgba(255, 255, 255, 0.15);
			border-color: rgba(255, 255, 255, 0.3);
		}
		.title-icon {
			color: ${COLORS.APPBAR_TEXT};
			font-size: 16px;
			width: 16px;
			height: 16px;
			opacity: 0.7;
		}
		.title-input {
			flex: 1;
			background: transparent;
			border: none;
			outline: none;
			color: ${COLORS.APPBAR_TEXT};
			font-size: 14px;
			font-weight: 500;
		}
		.title-input::placeholder {
			color: ${COLORS.APPBAR_TEXT};
			opacity: 0.6;
		}

		.toolbar-btn {
			display: flex;
			align-items: center;
			gap: 4px;
			padding: 8px 12px;
			border: none;
			color: ${COLORS.APPBAR_BG};
			cursor: pointer;
			border-radius: 8px;
			transition: background-color 0.1s;
		}
		.toolbar-btn mat-icon {
			font-size: 14px;
			width: 14px;
			height: 14px;
		}
		.save-btn 		{ 
			background: transparent; 
			box-shadow: 0 0 0 2px ${COLORS.ACCENT_YELLOW} inset; 
			color: ${COLORS.ACCENT_YELLOW}; 
		}
		.save-btn:hover 	{ 
			background: ${COLORS.ACCENT_YELLOW} !important; 
			color: ${COLORS.APPBAR_BG} !important; 
		}
		.export-btn 	{ 
			background: transparent; 
			box-shadow: 0 0 0 2px ${COLORS.ACCENT_ORANGE} inset; 
			color: ${COLORS.ACCENT_ORANGE}; 
		}
		.export-btn:hover 	{ 
			background: ${COLORS.ACCENT_ORANGE} !important; 
			color: ${COLORS.APPBAR_BG} !important; 
		}
		.publish-btn 	{ background: ${COLORS.ACCENT_PINK}; }
		.publish-btn:hover 	{ background: ${COLORS.ACCENT_PINK_L} !important; }
		.share-btn 		{ background: ${COLORS.ACCENT_PURPLE}; }
		.share-btn:hover 	{ background: ${COLORS.ACCENT_PURPLE_L} !important; }
	
		
		
		
	`
})
export class StudioToolbarTopComponent {

}
