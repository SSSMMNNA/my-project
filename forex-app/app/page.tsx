'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { OHLCBar, Timeframe, IndicatorSeries, AnalysisResult } from '@/lib/types'
import { computeAllIndicators } from '@/lib/indicators'
import { generateAnalysis } from '@/lib/analysis'
import { TimeframeBar } from '@/components/TimeframeBar'
import { AnalysisPanel } from '@/components/AnalysisPanel'
import { NewsPanel } from '@/components/NewsPanel'
import { RiskCalculator } from '@/components/RiskCalculator'

const ForexChart = dynamic(
  () => import('@/components/ForexChart').then(m => m.ForexChart),
  { ssr: false, loading: () => <div className="w-full h-[300px] lg:h-[520px] bg-bg-secondary animate-pulse rounded" /> }
)

type MobileTab = 'chart' | 'analysis' | 'news' | 'risk'

const MOBILE_TABS: { value: MobileTab; label: string }[] = [
  { value: 'chart', label: 'チャート指標' },
  { value: 'analysis', label: '分析' },
  { value: 'news', label: 'ニュース' },
  { value: 'risk', label: 'リスク計算' },
]

const EMPTY_INDICATORS: IndicatorSeries = {
  sma20: [],
  sma50: [],
  ema200: [],
  bbUpper: [],
  bbMiddle: [],
  bbLower: [],
  rsi: [],
  macdLine: [],
  macdSignal: [],
  macdHist: [],
  supports: [],
  resistances: [],
  channelUpper: [],
  channelLower: [],
}

export default function Home() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h')
  const [ohlcData, setOhlcData] = useState<OHLCBar[]>([])
  const [indicators, setIndicators] = useState<IndicatorSeries>(EMPTY_INDICATORS)
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({})
  const [activeTab, setActiveTab] = useState<MobileTab>('chart')
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (tf: Timeframe) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/forex?timeframe=${tf}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const bars: OHLCBar[] = json.data
      setOhlcData(bars)
      setIsMock(!!json.mock)
      setLastUpdated(new Date())

      if (bars.length > 0) {
        const ind = computeAllIndicators(bars)
        setIndicators(ind)

        const newAnalyses: Record<string, AnalysisResult> = {}
        for (const atf of ['1h', '4h', '1d'] as const) {
          if (atf === tf) {
            newAnalyses[atf] = generateAnalysis(bars, atf, ind)
          } else {
            try {
              const r = await fetch(`/api/forex?timeframe=${atf}`)
              const j = await r.json()
              const b: OHLCBar[] = j.data
              if (b.length > 0) {
                newAnalyses[atf] = generateAnalysis(b, atf)
              }
            } catch {
              newAnalyses[atf] = generateAnalysis(bars, atf, ind)
            }
          }
        }
        setAnalyses(newAnalyses)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データ取得エラー')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(selectedTimeframe)
  }, [selectedTimeframe, fetchData])

  const currentPrice = ohlcData.length > 0 ? ohlcData[ohlcData.length - 1].close : 0
  const firstPrice = ohlcData.length > 0 ? ohlcData[0].close : 0
  const priceChange = currentPrice - firstPrice
  const priceChangePct = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0
  const isPositive = priceChange >= 0

  function formatTime(d: Date): string {
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const quickStats = analyses['1h']
    ? {
        rsi: analyses['1h'].rsiValue.toFixed(1),
        trend: analyses['1h'].trend,
        bb: analyses['1h'].bbPosition,
        bias: analyses['1h'].bias,
      }
    : null

  const trendLabels: Record<string, string> = { bullish: '上昇', bearish: '下降', neutral: '中立' }
  const trendColors: Record<string, string> = { bullish: 'text-accent-green', bearish: 'text-accent-red', neutral: 'text-text-secondary' }
  const bbLabels: Record<string, string> = { upper: '上限', middle: '中間', lower: '下限', inside: '中圏' }
  const biasColors: Record<string, string> = { buy: 'text-accent-green', sell: 'text-accent-red', wait: 'text-accent-yellow' }
  const biasLabels: Record<string, string> = { buy: 'BUY', sell: 'SELL', wait: 'WAIT' }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="bg-bg-secondary border-b border-border px-4 py-2 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-text-primary font-bold text-base sm:text-lg tracking-wide">
            USD/JPY 分析
          </h1>
          {isMock && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/30 font-medium">
              MOCK
            </span>
          )}
          {!isMock && !loading && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent-green/20 text-accent-green border border-accent-green/30 font-medium">
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {currentPrice > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-text-primary font-mono text-lg sm:text-2xl font-bold">
                {currentPrice.toFixed(3)}
              </span>
              <div className="text-right">
                <div className={`text-xs font-mono font-medium ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(3)}
                </div>
                <div className={`text-xs font-mono ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
                  {isPositive ? '+' : ''}{priceChangePct.toFixed(2)}%
                </div>
              </div>
            </div>
          )}
          {loading && (
            <div className="h-4 w-24 bg-bg-hover rounded animate-pulse" />
          )}
          {lastUpdated && (
            <div className="text-text-muted text-xs hidden sm:block">
              更新: {formatTime(lastUpdated)}
            </div>
          )}
          <button
            onClick={() => fetchData(selectedTimeframe)}
            disabled={loading}
            className="text-text-secondary hover:text-text-primary text-xs px-2 py-1 rounded bg-bg-panel border border-border hover:border-accent-blue transition-colors disabled:opacity-50"
          >
            {loading ? '...' : '更新'}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-accent-red/10 border-b border-accent-red/30 px-4 py-2 text-accent-red text-xs">
          ⚠ {error}
        </div>
      )}

      <div className="hidden lg:flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TimeframeBar selected={selectedTimeframe} onChange={setSelectedTimeframe} />

          <div className="flex-1 overflow-hidden">
            {ohlcData.length > 0 ? (
              <ForexChart bars={ohlcData} indicators={indicators} timeframe={selectedTimeframe} />
            ) : loading ? (
              <div className="w-full h-[520px] bg-bg-secondary animate-pulse" />
            ) : (
              <div className="w-full h-[520px] flex items-center justify-center text-text-muted">
                データなし
              </div>
            )}
          </div>

          {quickStats && (
            <div className="bg-bg-secondary border-t border-border px-4 py-2 flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">RSI(14):</span>
                <span className={`font-mono font-medium ${
                  parseFloat(quickStats.rsi) >= 70 ? 'text-accent-red' :
                  parseFloat(quickStats.rsi) <= 30 ? 'text-accent-green' :
                  'text-text-primary'
                }`}>{quickStats.rsi}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">トレンド:</span>
                <span className={`font-medium ${trendColors[quickStats.trend]}`}>
                  {trendLabels[quickStats.trend]}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">BB位置:</span>
                <span className="text-text-secondary">{bbLabels[quickStats.bb]}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">バイアス:</span>
                <span className={`font-bold ${biasColors[quickStats.bias]}`}>
                  {biasLabels[quickStats.bias]}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 xl:w-96 flex flex-col border-l border-border overflow-y-auto bg-bg-primary gap-0">
          <div className="p-3 space-y-3">
            <AnalysisPanel analyses={analyses} loading={loading} />
            <NewsPanel />
            <RiskCalculator currentPrice={currentPrice} />
          </div>
        </div>
      </div>

      <div className="lg:hidden flex flex-col flex-1">
        <TimeframeBar selected={selectedTimeframe} onChange={setSelectedTimeframe} />

        <div className="w-full">
          {ohlcData.length > 0 ? (
            <ForexChart bars={ohlcData} indicators={indicators} timeframe={selectedTimeframe} />
          ) : loading ? (
            <div className="w-full h-[300px] bg-bg-secondary animate-pulse" />
          ) : (
            <div className="w-full h-[300px] flex items-center justify-center text-text-muted text-sm">
              データなし
            </div>
          )}
        </div>

        <div className="flex border-b border-border bg-bg-secondary sticky top-[57px] z-10">
          {MOBILE_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.value
                  ? 'text-accent-blue border-b-2 border-accent-blue bg-accent-blue/5'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-3 overflow-y-auto">
          {activeTab === 'chart' && quickStats && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-bg-panel border border-border rounded p-3">
                  <div className="text-text-muted text-xs mb-1">RSI (14)</div>
                  <div className={`font-mono text-lg font-bold ${
                    parseFloat(quickStats.rsi) >= 70 ? 'text-accent-red' :
                    parseFloat(quickStats.rsi) <= 30 ? 'text-accent-green' :
                    'text-text-primary'
                  }`}>{quickStats.rsi}</div>
                </div>
                <div className="bg-bg-panel border border-border rounded p-3">
                  <div className="text-text-muted text-xs mb-1">バイアス</div>
                  <div className={`font-bold text-lg ${biasColors[quickStats.bias]}`}>
                    {biasLabels[quickStats.bias]}
                  </div>
                </div>
                <div className="bg-bg-panel border border-border rounded p-3">
                  <div className="text-text-muted text-xs mb-1">トレンド</div>
                  <div className={`font-medium ${trendColors[quickStats.trend]}`}>
                    {trendLabels[quickStats.trend]}
                  </div>
                </div>
                <div className="bg-bg-panel border border-border rounded p-3">
                  <div className="text-text-muted text-xs mb-1">BB位置</div>
                  <div className="text-text-secondary">{bbLabels[quickStats.bb]}</div>
                </div>
              </div>
              {analyses['1h'] && (
                <div className="bg-bg-panel border border-border rounded p-3">
                  <div className="text-text-muted text-xs mb-2">サポート / レジスタンス</div>
                  <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap">
                    {analyses['1h'].keyLevelsText}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <AnalysisPanel analyses={analyses} loading={loading} />
          )}

          {activeTab === 'news' && (
            <NewsPanel />
          )}

          {activeTab === 'risk' && (
            <RiskCalculator currentPrice={currentPrice} />
          )}
        </div>
      </div>
    </div>
  )
}
