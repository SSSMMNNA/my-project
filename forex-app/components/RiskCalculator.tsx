'use client'

import { useState, useEffect, useCallback } from 'react'

export function RiskCalculator({ currentPrice }: { currentPrice: number }) {
  const [entry, setEntry] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [balance, setBalance] = useState('1000000')
  const [riskPct, setRiskPct] = useState('1')
  const [direction, setDirection] = useState<'long' | 'short'>('long')

  useEffect(() => {
    if (currentPrice > 0) {
      setEntry(currentPrice.toFixed(3))
    }
  }, [currentPrice])

  const calculate = useCallback(() => {
    const entryNum = parseFloat(entry)
    const slNum = parseFloat(stopLoss)
    const tpNum = parseFloat(takeProfit)
    const balNum = parseFloat(balance)
    const riskNum = parseFloat(riskPct)

    if (!entryNum || !slNum || isNaN(entryNum) || isNaN(slNum) || isNaN(balNum) || isNaN(riskNum)) {
      return null
    }

    const pipsRisk = Math.abs(entryNum - slNum) * 100
    const pipsTarget = tpNum && !isNaN(tpNum) ? Math.abs(tpNum - entryNum) * 100 : null
    const rrRatio = pipsTarget && pipsRisk > 0 ? pipsTarget / pipsRisk : null
    const riskAmount = balNum * (riskNum / 100)
    const lotSize = pipsRisk > 0 ? riskAmount / (pipsRisk * 1000) : 0
    const profitAmount = pipsTarget ? lotSize * pipsTarget * 1000 : null

    return { pipsRisk, pipsTarget, rrRatio, riskAmount, lotSize, profitAmount }
  }, [entry, stopLoss, takeProfit, balance, riskPct])

  const result = calculate()
  const isSuboptimalRR = result?.rrRatio !== null && result?.rrRatio !== undefined && result.rrRatio < 1.5

  return (
    <div className="bg-bg-panel border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-border">
        <h2 className="text-text-primary font-semibold text-sm">リスク計算機</h2>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-1">
          <button
            onClick={() => setDirection('long')}
            className={`flex-1 py-1.5 text-xs rounded font-medium transition-colors ${
              direction === 'long'
                ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                : 'bg-bg-secondary text-text-secondary border border-border hover:border-accent-green/30'
            }`}
          >
            ▲ ロング
          </button>
          <button
            onClick={() => setDirection('short')}
            className={`flex-1 py-1.5 text-xs rounded font-medium transition-colors ${
              direction === 'short'
                ? 'bg-accent-red/20 text-accent-red border border-accent-red/40'
                : 'bg-bg-secondary text-text-secondary border border-border hover:border-accent-red/30'
            }`}
          >
            ▼ ショート
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-text-muted text-xs block mb-1">エントリー</label>
            <input
              type="number"
              value={entry}
              onChange={e => setEntry(e.target.value)}
              placeholder="158.000"
              step="0.001"
              className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue"
            />
          </div>
          <div>
            <label className="text-text-muted text-xs block mb-1">損切り (SL)</label>
            <input
              type="number"
              value={stopLoss}
              onChange={e => setStopLoss(e.target.value)}
              placeholder="157.500"
              step="0.001"
              className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-red"
            />
          </div>
          <div>
            <label className="text-text-muted text-xs block mb-1">利確 (TP)</label>
            <input
              type="number"
              value={takeProfit}
              onChange={e => setTakeProfit(e.target.value)}
              placeholder="159.000"
              step="0.001"
              className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-green"
            />
          </div>
          <div>
            <label className="text-text-muted text-xs block mb-1">口座残高 (円)</label>
            <input
              type="number"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              placeholder="1000000"
              className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue"
            />
          </div>
        </div>

        <div>
          <label className="text-text-muted text-xs block mb-1">リスク率: <span className="text-accent-yellow">{riskPct}%</span></label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={riskPct}
            onChange={e => setRiskPct(e.target.value)}
            className="w-full accent-accent-blue"
          />
          <div className="flex justify-between text-text-muted text-xs mt-0.5">
            <span>0.5%</span>
            <span>5%</span>
          </div>
        </div>

        {result && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-bg-secondary rounded p-2 border border-border">
                <div className="text-text-muted text-xs">リスク pips</div>
                <div className="text-accent-red font-mono text-sm font-medium">
                  {result.pipsRisk.toFixed(1)} pips
                </div>
              </div>
              {result.pipsTarget !== null && (
                <div className="bg-bg-secondary rounded p-2 border border-border">
                  <div className="text-text-muted text-xs">ターゲット pips</div>
                  <div className="text-accent-green font-mono text-sm font-medium">
                    {result.pipsTarget.toFixed(1)} pips
                  </div>
                </div>
              )}
            </div>

            {result.rrRatio !== null && (
              <div className={`rounded p-2 border ${isSuboptimalRR ? 'bg-accent-red/10 border-accent-red/30' : 'bg-accent-green/10 border-accent-green/30'}`}>
                <div className="text-text-muted text-xs">RR比率</div>
                <div className={`font-mono text-sm font-bold ${isSuboptimalRR ? 'text-accent-red' : 'text-accent-green'}`}>
                  1:{result.rrRatio.toFixed(2)}
                  {isSuboptimalRR && <span className="text-xs font-normal ml-1">⚠ RR不十分</span>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-bg-secondary rounded p-2 border border-border">
                <div className="text-text-muted text-xs">ロットサイズ</div>
                <div className="text-accent-blue font-mono text-sm font-medium">
                  {result.lotSize.toFixed(3)} lot
                </div>
              </div>
              <div className="bg-bg-secondary rounded p-2 border border-border">
                <div className="text-text-muted text-xs">リスク額</div>
                <div className="text-accent-red font-mono text-sm font-medium">
                  ¥{result.riskAmount.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            {result.profitAmount !== null && (
              <div className="bg-accent-green/10 rounded p-2 border border-accent-green/30">
                <div className="text-text-muted text-xs">期待利益</div>
                <div className="text-accent-green font-mono text-sm font-bold">
                  ¥{result.profitAmount.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}
                </div>
              </div>
            )}

            <div className="text-text-muted text-xs bg-bg-secondary rounded p-2 border border-border">
              <span className="font-medium">計算根拠:</span> USDJPY 1lot=10万通貨、1pip=0.01円、1lot×1pip≒1,000円
            </div>
          </div>
        )}

        {!result && (
          <div className="text-text-muted text-xs text-center py-2">
            エントリーと損切りを入力してください
          </div>
        )}
      </div>
    </div>
  )
}
