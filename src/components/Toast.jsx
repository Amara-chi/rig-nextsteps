// Renders raw HTML exactly like the old toast(html) did (callers pass
// strings with a <b> tag for emphasis, e.g. 'Session open — <b>Step 2</b>.').
export default function Toast({ html, visible }) {
  return (
    <div
      className={`fixed bottom-[22px] left-1/2 -translate-x-1/2 bg-ink-deep text-white py-3 px-5 rounded-full font-bold text-[13px] shadow-toast transition-[.3s] z-[300] max-w-[92vw] text-center ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-[90px] opacity-0'
      }`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
