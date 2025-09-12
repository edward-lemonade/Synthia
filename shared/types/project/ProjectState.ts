import { ProjectMetadata } from "./ProjectMetadata";
import { ProjectStudio } from "./ProjectStudio";

export interface ProjectState {
	metadata: ProjectMetadata,
	studio: ProjectStudio,
}