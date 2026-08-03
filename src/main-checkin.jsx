import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CheckinApp from './checkin/CheckinApp.jsx'
import './theme.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CheckinApp />
  </StrictMode>,
)
