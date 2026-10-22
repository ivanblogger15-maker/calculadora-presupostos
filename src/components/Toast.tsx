import { CheckCircleIcon } from './Icons';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div className="animate-toast-in flex items-center gap-2 rounded-full bg-slate-900/95 px-4 py-2.5 text-sm font-medium text-white shadow-xl shadow-slate-900/20 backdrop-blur">
        <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
        {message}
      </div>
    </div>
  );
}
