import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export type AlertType = 'error' | 'warning' | 'success' | 'info';

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const alertConfig = {
  error: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    titleColor: 'text-red-900',
    messageColor: 'text-red-800'
  },
  warning: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    titleColor: 'text-yellow-900',
    messageColor: 'text-yellow-800'
  },
  success: {
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    icon: CheckCircle,
    iconColor: 'text-green-500',
    titleColor: 'text-green-900',
    messageColor: 'text-green-800'
  },
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    icon: Info,
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-900',
    messageColor: 'text-blue-800'
  }
};

export const Alert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  onDismiss,
  className = ''
}) => {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} border-l-4 ${config.borderColor} p-4 rounded-md flex items-start space-x-3 ${className}`}>
      <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        {title && (
          <h4 className={`text-sm font-semibold ${config.titleColor}`}>
            {title}
          </h4>
        )}
        <p className={`${title ? 'mt-1' : ''} text-sm ${config.messageColor}`}>
          {message}
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`${config.iconColor} hover:opacity-75 flex-shrink-0`}
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default Alert;
