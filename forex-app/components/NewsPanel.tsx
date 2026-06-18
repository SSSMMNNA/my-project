'use client'

import { useState, useEffect } from 'react'
import { getUpcomingEvents } from '@/lib/economicCalendar'
import type { EconomicEvent } from '@/lib/types'

export function NewsPanel() {
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    setEvents(getUpcomingEvents(15))
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  function formatCountdown(dateStr: string): string {
    const target = new Date(dateStr)
    const diff = target.getTime() - now.getTime()
    if (diff <= 0) return '開催中'
    const totalMinutes = Math.floor(diff / 60_000)
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60
    if (days > 0) return `${days}日${hours}時間後`
    if (hours > 0) return `${hours}時間${minutes}分後`
    return `${minutes}分後`
  }

  function formatJST(dateStr: string): string {
    const date = new Date(dateStr)
    const days = ['日', '月', '火', '水', '木', '金', '土']
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayOfWeek = days[date.getDay()]
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}/${day} (${dayOfWeek}) ${hours}:${minutes} JST`
  }

  function isWithin24h(dateStr: string): boolean {
    const target = new Date(dateStr)
    const diff = target.getTime() - now.getTime()
    return diff > 0 && diff < 86_400_000
  }

  const impactColor: Record<string, string> = {
    high: 'bg-accent-red/20 text-accent-red border-accent-red/40',
    medium: 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/40',
    low: 'bg-bg-hover text-text-muted border-border',
  }

  const impactLabel: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  }

  const currencyFlag: Record<string, string> = {
    USD: '🇺🇸',
    JPY: '🇯🇵',
    BOTH: '🌐',
  }

  return (
    <div className="bg-bg-panel border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <h2 className="text-text-primary font-semibold text-sm">経済イベント</h2>
        <span className="text-text-muted text-xs">直近{events.length}件</span>
      </div>

      <div className="overflow-y-auto max-h-[400px]">
        {events.length === 0 ? (
          <div className="p-4 text-text-muted text-xs text-center">イベントを読み込み中...</div>
        ) : (
          <div className="divide-y divide-border">
            {events.map(event => {
              const within24h = isWithin24h(event.datetimeJST)
              return (
                <div
                  key={event.id}
                  className={`p-3 transition-colors hover:bg-bg-hover ${
                    within24h ? 'border-l-2 border-accent-yellow bg-accent-yellow/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm">{currencyFlag[event.currency]}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${impactColor[event.impact]}`}>
                        {impactLabel[event.impact]}
                      </span>
                      {within24h && (
                        <span className="text-xs text-accent-yellow font-medium animate-pulse">
                          ⚡ {formatCountdown(event.datetimeJST)}
                        </span>
                      )}
                    </div>
                    <span className="text-text-muted text-xs whitespace-nowrap">
                      {!within24h && formatCountdown(event.datetimeJST)}
                    </span>
                  </div>

                  <div className="text-text-primary text-xs font-medium mb-0.5">{event.titleJA}</div>
                  <div className="text-text-muted text-xs mb-1">{formatJST(event.datetimeJST)}</div>

                  {(event.previous || event.forecast) && (
                    <div className="flex gap-3 text-xs mb-1">
                      {event.previous && (
                        <span className="text-text-muted">前回: <span className="text-text-secondary">{event.previous}</span></span>
                      )}
                      {event.forecast && (
                        <span className="text-text-muted">予想: <span className="text-accent-blue">{event.forecast}</span></span>
                      )}
                    </div>
                  )}

                  <p className="text-text-muted text-xs leading-relaxed">{event.description}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
