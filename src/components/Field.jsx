const inputClass = 'w-full py-3.5 px-3.75 border-[1.5px] border-line rounded-xl bg-cream text-[15px] transition-[.15s] outline-none focus:border-orange focus:bg-white focus:shadow-focus'

export default function Field({ label, htmlFor, className = '', children }) {
  return (
    <div className={`mt-4 ${className}`}>
      {label && <label htmlFor={htmlFor} className="block text-[12.5px] font-bold mb-1.5 text-ink-deep">{label}</label>}
      {children}
    </div>
  )
}

export function TextInput({ className = '', ...props }) {
  return <input className={`${inputClass} ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }) {
  return <select className={`${inputClass} ${className}`} {...props}>{children}</select>
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${inputClass} ${className}`} {...props} />
}
