// Shared background/card wrapper for #login and #set-password — identical
// in the old CSS (same selector list, same .login-card), just different
// content inside.
export default function AuthShell({ children }) {
  return (
    <div className="min-h-dvh grid place-items-center p-6 relative overflow-hidden before:content-[''] before:absolute before:left-[-30vw] before:right-[-30vw] before:bottom-[-40vh] before:h-[66vh] before:bg-orange before:rounded-[999px_999px_0_0] before:opacity-5">
      <div className="w-[min(400px,100%)] bg-white border border-line rounded-3xl shadow-card py-8.5 px-7.5 relative">
        <div className="flex items-center gap-2.5">
          <img className="h-8 w-auto block" src="/images/logo.png" alt="Rig Church Lagos" />
          <span className="font-mono text-[9.5px] font-semibold tracking-[.1em] uppercase text-orange">Next Steps</span>
        </div>
        {children}
      </div>
    </div>
  )
}
