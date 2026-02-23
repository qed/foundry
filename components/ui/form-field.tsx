import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, error, required, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-accent-error ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-text-tertiary">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-accent-error">{error}</p>
      )}
    </div>
  )
}

interface FormErrorSummaryProps {
  errors: string[]
}

export function FormErrorSummary({ errors }: FormErrorSummaryProps) {
  if (errors.length === 0) return null
  return (
    <div className="p-3 rounded-lg bg-accent-error/10 border border-accent-error/20 mb-4">
      <p className="text-sm font-medium text-accent-error mb-1">
        Please fix the following:
      </p>
      <ul className="space-y-0.5">
        {errors.map((err, i) => (
          <li key={i} className="text-xs text-accent-error/80">
            {err}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export function ValidatedInput({ error, className, ...props }: ValidatedInputProps) {
  return (
    <input
      className={cn(
        'w-full px-3 py-2 rounded-lg bg-bg-tertiary border text-text-primary text-sm',
        'placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan/40',
        error ? 'border-accent-error' : 'border-border-default',
        className
      )}
      {...props}
    />
  )
}

interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export function ValidatedTextarea({ error, className, ...props }: ValidatedTextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 rounded-lg bg-bg-tertiary border text-text-primary text-sm',
        'placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan/40 resize-none',
        error ? 'border-accent-error' : 'border-border-default',
        className
      )}
      {...props}
    />
  )
}
