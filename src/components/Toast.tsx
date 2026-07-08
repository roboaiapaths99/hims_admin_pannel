import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '../store/toast';
import type { ToastMessage } from '../store/toast';

const toastConfig = {
  success: {
    bgColor: 'bg-white border-l-4 border-teal-500 shadow-teal-100',
    iconColor: 'text-teal-500',
    icon: CheckCircle
  },
  error: {
    bgColor: 'bg-white border-l-4 border-red-500 shadow-red-100',
    iconColor: 'text-red-500',
    icon: AlertCircle
  },
  warning: {
    bgColor: 'bg-white border-l-4 border-amber-500 shadow-amber-100',
    iconColor: 'text-amber-500',
    icon: AlertTriangle
  },
  info: {
    bgColor: 'bg-white border-l-4 border-sky-500 shadow-sky-100',
    iconColor: 'text-sky-500',
    icon: Info
  }
};

export const ToastItem: React.FC<{ toast: ToastMessage }> = ({ toast }) => {
  const { removeToast } = useToastStore();
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start justify-between p-4 rounded-xl border border-slate-200/80 shadow-lg ${config.bgColor} w-80 animate-slide-in pointer-events-auto`}
      role="alert"
    >
      <div className="flex items-start space-x-3">
        <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div>
          <p className="text-xs font-semibold text-slate-800 leading-normal">{toast.message}</p>
        </div>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-slate-400 hover:text-slate-600 flex-shrink-0 ml-3 p-0.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
        aria-label="Close toast"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

export default ToastContainer;
