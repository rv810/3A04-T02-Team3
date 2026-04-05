import { useEffect, useRef, useState } from 'react'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export function useWebSocket(
  token: string | null,
  onMessage: (msg: { event: string; data: Record<string, unknown> }) => void,
): { status: ConnectionStatus } {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const onMessageRef = useRef(onMessage)
  const mountedRef = useRef(true)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backoff = useRef(1000)

  // Keep callback ref current without triggering reconnect
  useEffect(() => {
    onMessageRef.current = onMessage
  })

  useEffect(() => {
    mountedRef.current = true

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL
    if (!wsUrl) {
      console.warn('[useWebSocket] NEXT_PUBLIC_WS_URL is not set — skipping connection')
      return
    }
    if (!token) return

    function connect() {
      if (!mountedRef.current) return

      const ws = new WebSocket(`${wsUrl}/ws?token=${token}`)
      wsRef.current = ws
      setStatus('connecting')

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return }
        setStatus('connected')
        backoff.current = 1000 // reset on success
      }

      ws.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data)
          onMessageRef.current(parsed)
        } catch { /* ignore malformed messages */ }
      }

      ws.onclose = (e) => {
        wsRef.current = null
        if (!mountedRef.current) return
        setStatus('disconnected')

        // Don't reconnect on intentional close or auth failure
        if (e.code === 1000 || e.code === 1008) return

        // Schedule reconnect with exponential backoff
        const delay = Math.min(backoff.current, 30000)
        reconnectTimer.current = setTimeout(() => {
          backoff.current = Math.min(backoff.current * 2, 30000)
          connect()
        }, delay)
      }

      ws.onerror = () => {
        // onclose will fire after onerror — status update happens there
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect from cleanup close
        wsRef.current.close()
        wsRef.current = null
      }
      setStatus('disconnected')
    }
  }, [token])

  return { status }
}
