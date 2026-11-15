export interface Toast {
	id: number;
	message: string;
}

export const toasts = $state<Toast[]>([]);
let nextId = 1;

export function notify(message: string): void {
	const id = nextId++;
	toasts.push({ id, message });
	setTimeout(() => {
		const i = toasts.findIndex((t) => t.id === id);
		if (i >= 0) toasts.splice(i, 1);
	}, 5000);
}

export function errorMessage(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}
