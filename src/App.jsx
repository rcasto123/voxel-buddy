// src/App.jsx
import { useEffect } from 'react'
import { useStore } from './store.js'
import { DesktopPet } from './layouts/DesktopPet.jsx'

// Future layouts imported here in later phases
const LAYOUTS = {
  'desktop-pet': DesktopPet,
}

export function App() {
  const { layoutMode, addNotification } = useStore()

  // Listen for notifications from Electron main process
  // window.buddy.onNotification returns a cleanup function to prevent listener leaks
  useEffect(() => {
    if (!window.buddy) return
    const cleanup = window.buddy.onNotification((notification) => {
      addNotification(notification)
    })
    return cleanup
  }, [addNotification])

  const Layout = LAYOUTS[layoutMode] ?? DesktopPet

  return <Layout />
}
