import React from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  helperText?: string;
  required?: boolean;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, required = false, className = '', ...props }, ref) => {
    return (
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          ref={ref}
          {...props}
          className={`
            w-full px-3 py-2 text-sm
            border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-all
            ${error
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500'
            }
            ${className}
          `}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? `error-${label}` : helperText ? `helper-${label}` : undefined}
        />
        {error && (
          <p id={`error-${label}`} className="mt-1 text-xs text-red-600 font-medium">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`helper-${label}`} className="mt-1 text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string | number; label: string }>;
  error?: string | null;
  required?: boolean;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, options, error, required = false, className = '', ...props }, ref) => {
    return (
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          ref={ref}
          {...props}
          className={`
            w-full px-3 py-2 text-sm
            border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-all
            ${error
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500'
            }
            ${className}
          `}
          aria-label={label}
          aria-invalid={!!error}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | null;
  required?: boolean;
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, required = false, className = '', ...props }, ref) => {
    return (
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          ref={ref}
          {...props}
          className={`
            w-full px-3 py-2 text-sm
            border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-all
            resize-none
            ${error
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500'
            }
            ${className}
          `}
          aria-label={label}
          aria-invalid={!!error}
        />
        {error && (
          <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

TextAreaField.displayName = 'TextAreaField';
