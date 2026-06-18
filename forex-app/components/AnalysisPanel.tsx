'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/lib/types'

interface AnalysisPanelProps {
  analyses: Record<string, AnalysisResult>
  loading: boolean
}

const TAB_LABELS: Record<string, string> = {
  '1h': '1時間',
  '4h': '4時間',
  '1d': '日足',
}

function SkeletonLine({ width = 'w-full' }: { width?: string }) {
  return <div className={`h-3 bg-bg-hover rounded animate-pulse ${width}`} />
}

export function AnalysisPanel({ analyses, loading }: AnalysisPanelProps) {
  const [tab, setTab] = useState<'1h' | '4h' | '1d'>('1h')

  const analysis = analyses[tab]

  const trendColor = {
    bullish: 'text-accent-green bg-accent-green/10 border-accent-green/30',
    bearish: 'text-accent-red bg-accent-red/10 border-accent-red/30',
    neutral: 'text-text-secondary bg-bg-hover border-border',
  }

  const trendLabel = {
    bullish: '▲ 上昇',
    bearish: '▼ 下降',
    neutral: '→ 中立',
  }

  const biasColor = {
    buy: 'text-accent-green bg-accent-green/10 border-accent-green/30',
    sell: 'text-accent-red bg-accent-red/10 border-accent-red/30',
    wait: 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/30',
  }

  const biasLabel = {
    buy: '▲ ロング優先',
    sell: '▼ ショート優先',
    wait: '→ 待機',
  }

  return (
    <div className="bg-bg-panel border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-border">
        <h2 className="text-text-primary font-semibold text-sm">テクニカル分析</h2>
      </div>

      <div className="flex border-b border-border">
        {(['1h', '4h', '1d'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? 'text-accent-blue border-b-2 border-accent-blue bg-accent-blue/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {loading || !analysis ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-bg-hover rounded animate-pulse" />
              <div className="h-6 w-24 bg-bg-hover rounded animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <SkeletonLine />
              <SkeletonLine width="w-4/5" />
              <SkeletonLine width="w-3/4" />
            </div>
            <div className="space-y-1.5">
              <SkeletonLine width="w-5/6" />
              <SkeletonLine width="w-2/3" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded border text-xs font-medium ${trendColor[analysis.trend]}`}>
                {trendLabel[analysis.trend]}
              </span>
              <span className={`px-2 py-0.5 rounded border text-xs font-medium ${biasColor[analysis.bias]}`}>
                {biasLabel[analysis.bias]}
              </span>
            </div>

            <div>
              <div className="text-text-muted text-xs mb-1 font-medium uppercase tracking-wide">トレンド</div>
              <p className="text-text-secondary text-xs leading-relaxed">{analysis.trendText}</p>
            </div>

            <div>
              <div className="text-text-muted text-xs mb-1 font-medium uppercase tracking-wide">モメンタム</div>
              <p className="text-text-secondary text-xs leading-relaxed">{analysis.momentumText}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-text-muted text-xs">RSI</span>
                <div className="flex-1 h-1.5 bg-bg-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      analysis.rsiValue >= 70
                        ? 'bg-accent-red'
                        : analysis.rsiValue <= 30
                        ? 'bg-accent-green'
                        : 'bg-accent-blue'
                    }`}
                    style={{ width: `${Math.min(100, analysis.rsiValue)}%` }}
                  />
                </div>
                <span className={`text-xs font-mono ${
                  analysis.rsiValue >= 70 ? 'text-accent-red' : analysis.rsiValue <= 30 ? 'text-accent-green' : 'text-text-primary'
                }`}>
                  {analysis.rsiValue.toFixed(1)}
                </span>
              </div>
            </div>

            <div>
              <div className="text-text-muted text-xs mb-1 font-medium uppercase tracking-wide">重要レベル</div>
              <pre className="text-xs font-mono leading-relaxed text-text-secondary whitespace-pre-wrap">
                {analysis.keyLevelsText}
              </pre>
            </div>

            <div>
              <div className="text-text-muted text-xs mb-1 font-medium uppercase tracking-wide">トレード設定</div>
              <p className="text-text-secondary text-xs leading-relaxed">{analysis.setupText}</p>
            </div>

            <div className="bg-bg-secondary rounded p-2.5 border border-border">
              <div className="text-text-muted text-xs mb-1 font-medium uppercase tracking-wide">リスク管理</div>
              <p className="text-text-secondary text-xs leading-relaxed">{analysis.riskText}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-bg-secondary rounded p-2 border border-border">
                <div className="text-text-muted text-xs">サポート</div>
                <div className="text-accent-green font-mono text-sm font-medium">
                  {analysis.nearestSupport.toFixed(2)}
                </div>
              </div>
              <div className="bg-bg-secondary rounded p-2 border border-border">
                <div className="text-text-muted text-xs">レジスタンス</div>
                <div className="text-accent-red font-mono text-sm font-medium">
                  {analysis.nearestResistance.toFixed(2)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
