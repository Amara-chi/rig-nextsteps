import { createContext, useContext } from 'react'

// useToast()'s state must be a single instance shared app-wide — calling
// useToast() independently in each pane (a real bug caught while building
// People) creates invisible toast state nothing renders, since only the one
// <Toast> in App.jsx is actually on screen.
const ToastContext = createContext(null)

export function ToastProvider({ value, children }) {
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useAppToast() {
  return useContext(ToastContext).toast
}
