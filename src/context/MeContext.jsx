import { createContext, useContext } from 'react'

const MeContext = createContext(null)

export function MeProvider({ me, children }) {
  return <MeContext.Provider value={me}>{children}</MeContext.Provider>
}

// Returns {id, full_name, role, email} for the signed-in staff member.
export function useMe() {
  return useContext(MeContext)
}
