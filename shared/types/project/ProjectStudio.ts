import { ProjectMetadata, ProjectStudioGlobals, ProjectStudioTracks } from ".";

export interface ProjectStudio { // inner project data, accessible only to authors
	metadata: ProjectMetadata;
	globals: ProjectStudioGlobals;
	tracks: ProjectStudioTracks;
	//automations: Automation[];
}