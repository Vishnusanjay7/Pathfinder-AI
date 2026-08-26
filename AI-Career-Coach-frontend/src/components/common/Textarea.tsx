import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        {...props}
        className={`w-full bg-gray-800 border rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-50 resize-none ${error ? 'border-red-500' : 'border-gray-700 hover:border-gray-600'} ${className}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';
export default Textarea;
