type ToastHandler = (message: string) => void;

let handler: ToastHandler | null = null;

export function setToastHandler(next: ToastHandler | null) {
  handler = next;
}

export function showToast(message: string) {
  handler?.(message);
}