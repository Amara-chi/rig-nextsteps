import { useState } from 'react'
import Field, { TextInput } from './Field.jsx'

const EyeIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" />
  </svg>
)
const EyeOffIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-7-11-7a21.6 21.6 0 015.06-6.06M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 7 11 7a21.6 21.6 0 01-2.44 3.4M14.12 14.12a3 3 0 11-4.24-4.24" /><path d="M1 1l22 22" />
  </svg>
)

export default function PasswordField({ label, htmlFor, value, onChange, onKeyDown, autoComplete, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} htmlFor={htmlFor}>
      <div className="relative">
        <TextInput
          id={htmlFor}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className="pr-11.5!"
        />
        <button
          type="button"
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={() => setShow((s) => !s)}
          className="absolute right-1.25 top-1/2 -translate-y-1/2 w-8.5 h-8.5 rounded-lg flex items-center justify-center text-muted-label hover:text-ink-deep hover:bg-cream-deep [&_svg]:w-[19px] [&_svg]:h-[19px]"
        >
          {show ? EyeOffIcon : EyeIcon}
        </button>
      </div>
    </Field>
  )
}
