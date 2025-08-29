import { computed, Signal, signal, WritableSignal } from "@angular/core";
import { v4 as uuid } from "uuid";
import { ArrayScaffold, ObjectScaffold, PropScaffold, Scaffold } from "./state.scaffolds";
import { ArrayMutator, Mutator } from "./state.mutators";
import { Author, BaseFileRef, isAuthor, isTimeSignature, TimeSignature } from "@shared/types";

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object
		? DeepPartial<T[P]>
		: T[P];
};

export enum NodeType { Prop, Object, Array };

// ===============================================================================================
// Node

interface Node<T> {
	_id: string; // UUID
	_this: Node<T>;
	_type: NodeType;
	snapshot: () => T;
}

interface PropNode<T> extends Node<T> {
	_type: NodeType.Prop
	_set: (value: T) => void; // signal "set"
	_update: (updateFn: (value: T) => T) => void; // signal "update"
	_parent?: ObjectStateNode<any>;
	set: (value: T, actionId?: string) => void;
	update: (updateFn: (obj: T) => T, actionId?: string) => void;
}
interface ObjectNode<T extends Record<string, any>> extends Node<T> {
	_type: NodeType.Object;
}
interface ArrayNode<T extends Record<string, any>> extends Node<T[]> { // ArrayNode() is obsolete, use ArrayNode.get() instead
	_type: NodeType.Array;
	_ids: WritableSignal<string[]>; // id
	_items: Map<string, ObjectStateNode<T>>;
	get: (index: number) => ObjectStateNode<T> | undefined;
	getById: (id: string) => ObjectStateNode<T> | undefined;
	getAll: () => ObjectStateNode<T>[];
	set: (obj: ObjectStateNode<T>[], actionId?: string) => void;
	update: (updateFn: (obj: ObjectStateNode<T>[]) => ObjectStateNode<T>[], actionId?: string) => void;
	push: (obj: ObjectStateNode<T>, actionId?: string) => void;
	insertValue: (value: Partial<T>, index?: number, actionId?: string) => ObjectStateNode<T>;
	move: (fromIndex: number, toIndex: number, actionId?: string) => void;
	getIndex: (id: string) => number;
	remove: (index: string|number, actionId?: string) => ObjectStateNode<T>;
} 

// ===============================================================================================
// StateNode

export type PropStateNode<T> = PropNode<T> & WritableSignal<T>
export type ObjectStateNode<T extends Record<string, any>> = ObjectNode<T> & {[K in keyof T]: StateNode<T[K]>}
export type ArrayStateNode<T extends Record<string, any>> = ArrayNode<T> & Signal<ObjectStateNode<T>[]>

// for type safety, not guaranteed accuracy since Node type is not automated, but specified manually in state.scaffolds.ts
export type Prop = string | number | boolean | Date | TimeSignature | Author | BaseFileRef[] | Array<Prop>;
export type StateNode<T> = (
	[T] extends [Prop] ? 										PropStateNode<T> : 
	[T] extends [Array<infer U extends Record<string,any>>] ? 	ArrayStateNode<U> :
	[T] extends [object] ? 										ObjectStateNode<T> : 
	never
);

// ===============================================================================================
// Factory

export function propStateNode<T>(value: T, parent: ObjectStateNode<any>, mutator?: Mutator<T>): PropStateNode<T> {
	const s = signal(value) as PropStateNode<T>;

	s._id = uuid();
	s._this = s;
	s._type = NodeType.Prop;
	s._parent = parent;
	s.snapshot = s; 	// s.snapshot() returns s()

	s._set = s.set.bind(s);
	s._update = s.update.bind(s);
	s.set = (value: T, actionId = uuid()) => mutator ? mutator(value, s, actionId as string) : ((value: any)=>{});
	s.update = (updateFn: (value: T) => T, actionId = uuid()) => mutator ? mutator(updateFn(s()), s, actionId as string) : ((value: any)=>{});

	s._set(value);
	return s;
}
export function objectStateNode<T extends Record<string,any>>(
	scaffold: ObjectScaffold<T>, 
	overrides?: DeepPartial<T>
): ObjectStateNode<T> {
	const s = {} as any;
	
	s._id = uuid();
	s._this = s;
	s._type = NodeType.Object;
	s.snapshot = () => {
		const result: any = {};
		for (const k in s) {
			if ((typeof s[k] === 'function' || typeof s[k] === 'object') && !k.startsWith('_') && !k.startsWith('snapshot')) {
				const node = s[k];
				result[k] = node?.snapshot ? node.snapshot() : node();
			}
		}
		return result;
	};

	const scaffoldObj = scaffold as any;
	for (const k in scaffoldObj) {
		if (k === '_type') continue;
		
		const childScaffold = scaffoldObj[k] as Scaffold<any>;
		const childType = childScaffold._type;
		
		if (childType === NodeType.Prop) {
			const propScaffold = childScaffold as PropScaffold<any>;
			const value = (overrides?.[k]) ?? propScaffold.value;
			s[k] = propStateNode(value, s, propScaffold.mutator);
		} else if (childType === NodeType.Object) {
			const objScaffold = childScaffold as ObjectScaffold<any>;
			const childOverrides = overrides?.[k];
			s[k] = objectStateNode(objScaffold, childOverrides);
		} else if (childType === NodeType.Array) {
			const arrayScaffold = childScaffold as ArrayScaffold<T[keyof T]>;
			const childOverrides = overrides?.[k];

			if (childOverrides) {
				const childOverrides = overrides?.[k];
				const objs: ObjectStateNode<T[keyof T]>[] = childOverrides 
					? childOverrides.map((el: Partial<T[keyof T]>) => 
						objectStateNode(arrayScaffold.scaffold(el) as ObjectScaffold<T[keyof T]>, el)
					)
					: arrayScaffold.value;

				s[k] = arrayStateNode<T[keyof T]>(objs, arrayScaffold.mutator, arrayScaffold.scaffold);
			} else {
				s[k] = arrayStateNode<T[keyof T]>([], arrayScaffold.mutator, arrayScaffold.scaffold);
			}
		}
	}

	return s as ObjectStateNode<T>;
}
export function arrayStateNode<T extends Record<string, any>>(
	value: ObjectStateNode<T>[], 
	mutator: ArrayMutator<T>,
	scaffold: (el: Partial<T>) => ObjectScaffold<T>,
): ArrayStateNode<T> {
	const idsSignal = signal<string[]>([]);
	const itemsMap = new Map<string, ObjectStateNode<T>>();

	const initialIds: string[] = [];
	value.forEach((item) => {
		const itemNode = item;
		initialIds.push(itemNode._id);
		itemsMap.set(itemNode._id, itemNode);
	});
	idsSignal.set(initialIds);

	// Create computed signal that displays ObjectNode<T>[] in the right order
	const s = computed(() => {
		return idsSignal().map(id => itemsMap.get(id)! as ObjectStateNode<T>);
	}) as ArrayStateNode<T>;

	s._id = uuid();
	s._this = s;
	s._type = NodeType.Array;
	s._ids = idsSignal as WritableSignal<string[]>;
	s._items = itemsMap;

	s.snapshot = () => {
		return idsSignal().map(id => {
			const node = itemsMap.get(id);
			return node!.snapshot();
		});
	};

	s.get = (index: number) => {
		const id = idsSignal()[index];
		return id ? itemsMap.get(id) : undefined;
	};
	s.getById = (id: string) => {
		return id ? itemsMap.get(id) : undefined;
	};
	s.getAll = () => {
		return s._ids().map(id => s._items.get(id)!);
	}

	s.set = (obj: ObjectStateNode<T>[], actionId = uuid()) => mutator(obj, s, actionId);
	s.update = (updateFn: (obj: ObjectStateNode<T>[]) => ObjectStateNode<T>[], actionId = uuid()) => mutator(updateFn(s()), s, actionId);
	s.push = (obj: ObjectStateNode<T>, actionId = uuid()) => {s.update((arr) => [...arr, obj], actionId)};	
	s.insertValue = (value: Partial<T>, index = s().length, actionId = uuid()) => {
		const obj = objectStateNode(scaffold(value), value);
		console.log(value, scaffold(value), scaffold)
		s.update((arr) => {
			const newArr = [...arr];
			newArr.splice(index, 0, obj);
			return newArr;
		}, actionId);
		return obj;
	};
	s.move = (fromIndex: number, toIndex: number, actionId = uuid()) => {
		s.update(arr => {
			const newArr = [...arr];
			const [item] = newArr.splice(fromIndex, 1);
			newArr.splice(toIndex, 0, item);
			return newArr;
		}, actionId);
	};
	s.getIndex = (id: string): number => {
		return s._ids().indexOf(id);
	};
	s.remove = (key: string | number, actionId = uuid()): ObjectStateNode<T> => {
		const index = typeof key === 'string' ? s.getIndex(key) : key;
		
		const id = s._ids()[index];
		s.update((arr) => {
			const newArr = [...arr];
			newArr.splice(index, 1);
			return newArr;
		}, actionId);
		return s._items.get(id)!;
	};
	return s;
}
