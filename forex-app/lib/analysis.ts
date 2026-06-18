import type { OHLCBar, IndicatorSeries, AnalysisResult } from './types'
import { computeAllIndicators } from './indicators'

const TF_LABELS: Record<string, string> = {
  '1m': '1分足',
  '5m': '5分足',
  '15m': '15分足',
  '1h': '1時間足',
  '4h': '4時間足',
  '1d': '日足',
}

export function generateAnalysis(
  bars: OHLCBar[],
  timeframe: string,
  ind?: IndicatorSeries
): AnalysisResult {
  const indicators = ind ?? computeAllIndicators(bars)
  const lastBar = bars[bars.length - 1]
  const price = lastBar.close

  const lastSma20 = indicators.sma20[indicators.sma20.length - 1]?.value
  const lastSma50 = indicators.sma50[indicators.sma50.length - 1]?.value
  const lastEma200 = indicators.ema200[indicators.ema200.length - 1]?.value

  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (lastSma20 && lastSma50) {
    if (price > lastSma20 && lastSma20 > lastSma50) trend = 'bullish'
    else if (price < lastSma20 && lastSma20 < lastSma50) trend = 'bearish'
  }

  const rsiValue = indicators.rsi[indicators.rsi.length - 1]?.value ?? 50

  const bbU = indicators.bbUpper[indicators.bbUpper.length - 1]?.value
  const bbL = indicators.bbLower[indicators.bbLower.length - 1]?.value
  let bbPosition: 'upper' | 'middle' | 'lower' | 'inside' = 'inside'
  if (bbU && bbL) {
    const range = bbU - bbL
    if (price >= bbU - range * 0.1) bbPosition = 'upper'
    else if (price <= bbL + range * 0.1) bbPosition = 'lower'
    else bbPosition = 'inside'
  }

  const currentSupports = indicators.supports.filter(s => s < price).sort((a, b) => b - a)
  const currentResistances = indicators.resistances.filter(r => r > price).sort((a, b) => a - b)
  const nearestSupport = currentSupports[0] ?? price * 0.995
  const nearestResistance = currentResistances[0] ?? price * 1.005

  let bias: 'buy' | 'sell' | 'wait' = 'wait'
  if (trend === 'bullish' && rsiValue < 65 && bbPosition !== 'upper') bias = 'buy'
  else if (trend === 'bearish' && rsiValue > 35 && bbPosition !== 'lower') bias = 'sell'

  const tfLabel = TF_LABELS[timeframe] ?? timeframe

  const trendText = (() => {
    const ema200txt = lastEma200
      ? price > lastEma200
        ? `EMA200(${lastEma200.toFixed(2)})の上で推移中。`
        : `EMA200(${lastEma200.toFixed(2)})の下で推移中。`
      : ''

    if (trend === 'bullish') {
      return `【${tfLabel}】上昇トレンド継続中。価格はSMA20(${lastSma20?.toFixed(2)})・SMA50(${lastSma50?.toFixed(2)})を上抜けており、強気の配列。${ema200txt}`
    } else if (trend === 'bearish') {
      return `【${tfLabel}】下降トレンド継続中。価格はSMA20(${lastSma20?.toFixed(2)})・SMA50(${lastSma50?.toFixed(2)})を下回っており、弱気の配列。${ema200txt}`
    } else {
      return `【${tfLabel}】方向感に欠けるレンジ相場。SMA20・SMA50が絡み合っており、明確なトレンドは未形成。${ema200txt}`
    }
  })()

  const momentumText = (() => {
    const rsiStr = rsiValue.toFixed(1)
    let rsiCommentary = ''
    if (rsiValue >= 70) rsiCommentary = `RSI(${rsiStr})は買われ過ぎゾーン。短期的な調整リスクに注意。`
    else if (rsiValue <= 30) rsiCommentary = `RSI(${rsiStr})は売られ過ぎゾーン。反発の可能性を検討。`
    else if (rsiValue >= 55) rsiCommentary = `RSI(${rsiStr})は強め。上昇モメンタム継続。`
    else if (rsiValue <= 45) rsiCommentary = `RSI(${rsiStr})は弱め。下落圧力が継続。`
    else rsiCommentary = `RSI(${rsiStr})は中立ゾーン。トレンドの方向を見極める段階。`

    let bbCommentary = ''
    if (bbPosition === 'upper') bbCommentary = 'ボリンジャーバンド上限付近。過熱感あり、押し目に注意。'
    else if (bbPosition === 'lower') bbCommentary = 'ボリンジャーバンド下限付近。売られ過ぎ感、反発に注意。'
    else bbCommentary = 'BBバンド内で推移中。'

    return `${rsiCommentary} ${bbCommentary}`
  })()

  const keyLevelsText = (() => {
    const supStr = currentSupports.slice(0, 3).map(s => s.toFixed(2)).join(' / ') || '—'
    const resStr = currentResistances.slice(0, 3).map(r => r.toFixed(2)).join(' / ') || '—'
    return `▼ レジスタンス: ${resStr}\n▲ サポート: ${supStr}`
  })()

  const setupText = (() => {
    if (bias === 'buy') {
      return `ロング優先。${nearestSupport.toFixed(2)}付近のサポートからの押し目買いを検討。レジスタンス${nearestResistance.toFixed(2)}突破で追い買いシナリオ。`
    } else if (bias === 'sell') {
      return `ショート優先。${nearestResistance.toFixed(2)}付近のレジスタンスからの戻り売りを検討。サポート${nearestSupport.toFixed(2)}割れで追い売りシナリオ。`
    } else {
      return `現時点では積極的なエントリーは控え、方向性が明確になるまで待機を推奨。${nearestSupport.toFixed(2)}～${nearestResistance.toFixed(2)}のレンジを監視。`
    }
  })()

  const riskText = (() => {
    const spread = (nearestResistance - nearestSupport).toFixed(2)
    const rrNum = (nearestResistance - price) / (price - nearestSupport)
    const rr = isFinite(rrNum) ? rrNum.toFixed(1) : 'N/A'
    const note = bias === 'wait'
      ? '明確なシグナルが出るまでポジションを持たない。'
      : `損切りはエントリー根拠が崩れた際に即実行。RR比約${rr}:1を維持。レンジ幅${spread}円。`
    return note
  })()

  return {
    timeframe,
    trend,
    bias,
    rsiValue,
    bbPosition,
    trendText,
    momentumText,
    keyLevelsText,
    setupText,
    riskText,
    nearestSupport,
    nearestResistance,
  }
}
