import { User } from "../core";
import { ProjectFront, ProjectMetadata, ProjectReleased } from "../project";

export type RelevantProjectOrUser = {front?: ProjectFront, metadata?: ProjectMetadata, user?: User, _itemType?: string; _searchScore?: number; _id?: string};