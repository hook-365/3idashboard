'use client'

import { useState } from 'react'
// import { useRealtimeObservations } from '@/hooks/useRealtimeData' // TODO: implement this hook

interface Notification {
  id: string
  message: string
  type: 'observation' | 'stats' | 'connection'
  timestamp: Date
  isVisible: boolean
}

export default function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  // const { observations } = useRealtimeObservations() // TODO: implement this hook

  // TODO: Re-enable once useRealtimeObservations hook is implemented
  // useEffect(() => {
  //   if (observations.length > 0) {
  //     const latestObs = observations[0]
  //     const notification: Notification = {
  //       id: `obs-${latestObs.id}`,
  //       message: `New observation: ${latestObs.magnitude.toFixed(1)} magnitude from ${latestObs.observer}`,
  //       type: 'observation',
  //       timestamp: new Date(),
  //       isVisible: true
  //     }
  //
  //     setNotifications(prev => [notification, ...prev.slice(0, 4)])
  //
  //     // Auto-hide notification after 5 seconds
  //     setTimeout(() => {
  //       setNotifications(prev =>
  //         prev.map(n => n.id === notification.id ? { ...n, isVisible: false } : n)
  //       )
  //     }, 5000)
  //
  //     // Remove from array after animation
  //     setTimeout(() => {
  //       setNotifications(prev => prev.filter(n => n.id !== notification.id))
  //     }, 5500)
  //   }
  // }, [observations])

  const dismissNotification = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isVisible: false } : n)
    )
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 500)
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`pointer-events-auto bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg transition-all duration-500 transform max-w-sm ${
            notification.isVisible
              ? 'translate-x-0 opacity-100'
              : 'translate-x-full opacity-0'
          }`}
        >
          <div className="flex items-start gap-3">
            {notification.type === 'observation' && (
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 animate-pulse flex-shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-100 font-medium">
                {notification.message}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>

            <button
              onClick={() => dismissNotification(notification.id)}
              className="text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}