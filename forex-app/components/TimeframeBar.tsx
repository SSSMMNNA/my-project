'use client'

import type { Timeframe } from '@/lib/types'

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m', label: '1分' },
  { value: '5m', label: '5分' },
  { value: '15m', label: '15分' },
  { value: '1h', label: '1時間' },
  { value: '4h', label: '4時間' },
  { value: '1d', label: '日足' },
]

interface TimeframeBarProps {
  selected: Timeframe
  onChange: (tf: Timeframe) => void
}

export function TimeframeBar({ selected, onChange }: TimeframeBarProps) {
  return (
    <div className="flex items-center gap-1 p-2 bg-bg-secondary border-b border-border">
      <span className="text-text-muted text-xs mr-2 hidden sm:block">時間足:</span>
      {TIMEFRAMES.map(tf => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`
            px-2 py-1 rounded text-xs font-medium transition-colors
            sm:px-3 sm:py-1.5 sm:text-sm
            ${selected === tf.value
              ? 'bg-accent-blue text-white'
              : 'bg-bg-panel text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }
          `}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}
