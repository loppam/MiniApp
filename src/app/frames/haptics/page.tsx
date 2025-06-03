"use client"

import { useEffect, useState } from "react"
import { sdk } from "@farcaster/frame-sdk"

export default function Page() {
  const [hasHaptics, setHasHaptics] = useState(false)

  useEffect(() => {
    const initApp = async () => {
      await sdk.actions.ready()
      const capabilities = await sdk.getCapabilities()
      console.log(`All capabilities: ${JSON.stringify(capabilities)}`)
      const hasImpactOccurred = capabilities.includes('haptics.impactOccurred')
      const hasNotificationOccurred = capabilities.includes('haptics.notificationOccurred')
      const hasSelectionChanged = capabilities.includes('haptics.selectionChanged')
      setHasHaptics(
        hasImpactOccurred &&
        hasNotificationOccurred &&
        hasSelectionChanged
      )
    }

    initApp()
  }, [])


  const impactOccurred = async (style: "light" | "medium" | "heavy" | "soft" | "rigid") => {
    await sdk.haptics.impactOccurred(style)
  }

  const notificationOccurred = async (style: 'success' | 'warning' | 'error') => {
    await sdk.haptics.notificationOccurred(style)
  }

  const selectionChanged = async () => {
    await sdk.haptics.selectionChanged()
  }

  if (!hasHaptics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Haptics SDK Demo</h1>
          <p className="text-gray-600 text-sm mb-4">Your device does not support haptics.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Haptics SDK Demo</h1>

        {/* Impact Occurred Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Impact Occurred</h2>
          <p className="text-gray-600 text-sm mb-4">Test different impact feedback types</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button onClick={() => impactOccurred('light')} className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors">
              Light
            </button>
            <button onClick={() => impactOccurred('medium')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
              Medium
            </button>
            <button onClick={() => impactOccurred('heavy')} className="bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors">
              Heavy
            </button>
            <button onClick={() => impactOccurred('soft')} className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg transition-colors">
              Soft
            </button>
            <button onClick={() => impactOccurred('rigid')} className="bg-purple-700 hover:bg-purple-800 text-white font-medium py-3 px-4 rounded-lg transition-colors">
              Rigid
            </button>
          </div>
        </div>

        {/* Notification Occurred Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Notification Occurred</h2>
          <p className="text-gray-600 text-sm mb-4">Test different notification feedback types</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button onClick={() => notificationOccurred('success')} className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
              <span className="text-lg">✓</span>
              Success
            </button>
            <button onClick={() => notificationOccurred('warning')} className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
              <span className="text-lg">⚠</span>
              Warning
            </button>
            <button onClick={() => notificationOccurred('error')} className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
              <span className="text-lg">✕</span>
              Error
            </button>
          </div>
        </div>

        {/* Selection Changed Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Selection Changed</h2>
          <p className="text-gray-600 text-sm mb-4">Test selection feedback (no parameters)</p>
          <button onClick={selectionChanged} className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 px-6 rounded-lg transition-colors w-full sm:w-auto">
            Trigger Selection Changed
          </button>
        </div>

        {/* Info Section */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Tap buttons to test haptic feedback on supported devices</p>
        </div>
      </div>
    </div>
  )
}
