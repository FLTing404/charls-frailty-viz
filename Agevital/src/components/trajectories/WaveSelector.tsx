import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGlobalStore, type Wave } from '@/lib/store/globalStore'
import { formatNumber, formatPercent, cn } from '@/lib/utils'
import { tProvince } from '@/lib/i18n/zh'
import type { ProvinceDatum } from '@/types/data'
import {
  analyzeAnomalies,
  fallbackAnalysis,
  type AIAnalysisResult,
  type AnalysisInput,
} from '@/lib/ai/anomalyAnalysis'
import { AI_PRESET_ENABLED, PRESET_ANALYSES } from '@/lib/ai/preGenerated'
import { sendChatMessage, getQuickSuggestions, type ChatMessage, type ChatContext } from '@/lib/ai/chatAgent'

const WAVES: Wave[] = [2011, 2013, 2015, 2018]
const PREV_WAVE: Partial<Record<Wave, Wave>> = { 2013: 2011, 2015: 2013, 2018: 2015 }

// ── Tiny markdown → HTML renderer ─────────────────────────────────────────────

function renderMarkdown(text: string): string {
  let html = text
  // Bold **...**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>')
  // Inline code `...`
  html = html.replace(/`([^`]+)`/g, '<code class="text-[9px] bg-ink/8 px-0.5 rounded font-mono">$1</code>')
  // Numbered lines
  html = html.replace(/^(\d+)[.)]\s+(.+)$/gm, '<div class="flex gap-1 mt-0.5"><span class="text-ink/40 font-mono text-[9px] shrink-0">$1.</span><span>$2</span></div>')
  // Bullet lines
  html = html.replace(/^[-·]\s+(.+)$/gm, '<div class="flex gap-1 mt-0.5"><span class="text-ink/30 shrink-0">·</span><span>$1</span></div>')
  // Double newline → paragraph break
  html = html.replace(/\n\n/g, '<div class="h-1"></div>')
  // Single newline → <br>
  html = html.replace(/\n(?!\s*<)/g, '<br/>')
  return html
}

interface WaveSelectorProps {
  sampleN: number; totalN: number; sampled?: boolean
  selectedProvince: string | null
  provinces: ProvinceDatum[]
  prevProvinces: ProvinceDatum[] | null
}

// ── Anomaly types / maths ─────────────────────────────────────────────────────

interface ProvinceChange { province: string; frailDelta: number; preFrailDelta: number; meanFIDelta: number; direction: 'up' | 'down' | 'flat' }
interface AnomalySnapshot { national: ProvinceChange; selected: ProvinceChange | null; topFrailRise: ProvinceChange[]; topFrailDrop: ProvinceChange[]; selectedIsUnusual: boolean; selectedSigma: number }

function computeNationalChange(cur: ProvinceDatum[], prev: ProvinceDatum[]): ProvinceChange {
  const ct = cur.reduce((s, p) => s + p.n, 0), pt = prev.reduce((s, p) => s + p.n, 0)
  const cF = cur.reduce((s, p) => s + p.frailRate * p.n, 0) / (ct || 1)
  const pF = prev.reduce((s, p) => s + p.frailRate * p.n, 0) / (pt || 1)
  const cPF = cur.reduce((s, p) => s + p.preFrailRate * p.n, 0) / (ct || 1)
  const pPF = prev.reduce((s, p) => s + p.preFrailRate * p.n, 0) / (pt || 1)
  const cFI = cur.reduce((s, p) => s + p.meanFI * p.n, 0) / (ct || 1)
  const pFI = prev.reduce((s, p) => s + p.meanFI * p.n, 0) / (pt || 1)
  return { province: '全国', frailDelta: (cF - pF) * 100, preFrailDelta: (cPF - pPF) * 100, meanFIDelta: cFI - pFI, direction: Math.abs((cF - pF) * 100) < 0.3 ? 'flat' : cF > pF ? 'up' : 'down' }
}

function computeProvinceChanges(cur: ProvinceDatum[], prev: ProvinceDatum[]): ProvinceChange[] {
  const pm = new Map(prev.map((p) => [p.province, p]))
  const r: ProvinceChange[] = []
  for (const cp of cur) { const pp = pm.get(cp.province); if (!pp) continue; const fd = (cp.frailRate - pp.frailRate) * 100; r.push({ province: cp.province, frailDelta: fd, preFrailDelta: (cp.preFrailRate - pp.preFrailRate) * 100, meanFIDelta: cp.meanFI - pp.meanFI, direction: Math.abs(fd) < 0.3 ? 'flat' : fd > 0 ? 'up' : 'down' }) }
  return r
}

function computeAnomalies(cur: ProvinceDatum[], prev: ProvinceDatum[] | null, sp: string | null): AnomalySnapshot | null {
  if (!prev?.length) return null
  const national = computeNationalChange(cur, prev)
  const all = computeProvinceChanges(cur, prev)
  const rise = all.filter((c) => c.frailDelta > 0).sort((a, b) => b.frailDelta - a.frailDelta)
  const drop = all.filter((c) => c.frailDelta < 0).sort((a, b) => a.frailDelta - b.frailDelta)
  let sel: ProvinceChange | null = null, unusual = false, sigma = 0
  if (sp) { sel = all.find((c) => c.province === sp) ?? null; if (sel && all.length > 1) { const ds = all.map((c) => c.frailDelta); const m = ds.reduce((s, v) => s + v, 0) / ds.length; const v = ds.reduce((s, v) => s + (v - m) ** 2, 0) / ds.length; const sd = Math.sqrt(v); if (sd > 0.001) { sigma = (sel.frailDelta - m) / sd; unusual = Math.abs(sigma) > 1.5 } } }
  return { national, selected: sel, topFrailRise: rise.slice(0, 1), topFrailDrop: drop.slice(0, 1), selectedIsUnusual: unusual, selectedSigma: sigma }
}

function buildAnalysisInput(year: Wave, prevYear: Wave, anomalies: AnomalySnapshot, provinces: ProvinceDatum[], prevProvinces: ProvinceDatum[], sp: string | null): AnalysisInput {
  const pm = new Map(prevProvinces.map((p) => [p.province, p]))
  const to = (c: ProvinceChange) => { const cp = provinces.find((p) => p.province === c.province); const pp = pm.get(c.province); return { province: c.province, provinceCn: tProvince(c.province), frailRate: cp?.frailRate ?? 0, prevFrailRate: pp?.frailRate ?? 0, frailDelta: c.frailDelta, preFrailDelta: c.preFrailDelta, meanFIDelta: c.meanFIDelta, direction: c.direction, n: cp?.n ?? 0, malePct: cp?.malePct ?? null, urbanPct: cp?.urbanPct ?? null } }
  const all = computeProvinceChanges(provinces, prevProvinces)
  const tn = provinces.reduce((s, p) => s + p.n, 0)
  return { year, prevYear, isProvinceView: !!sp, selectedProvinceCn: sp ? tProvince(sp) : null, national: { province: '全国', provinceCn: '全国', frailRate: provinces.reduce((s, p) => s + p.frailRate * p.n, 0) / (tn || 1), prevFrailRate: prevProvinces.reduce((s, p) => s + p.frailRate * p.n, 0) / (prevProvinces.reduce((s, p) => s + p.n, 0) || 1), frailDelta: anomalies.national.frailDelta, preFrailDelta: anomalies.national.preFrailDelta, meanFIDelta: anomalies.national.meanFIDelta, direction: anomalies.national.direction, n: tn, malePct: null, urbanPct: null }, provinces: all.map(to), topRise: anomalies.topFrailRise.map(to), topDrop: anomalies.topFrailDrop.map(to), selectedProvince: anomalies.selected ? to(anomalies.selected) : null, selectedSigma: anomalies.selectedSigma, selectedIsUnusual: anomalies.selectedIsUnusual, totalSampleN: tn }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Bar({ pct, tone }: { pct: number; tone: 'frail' | 'preFrail' | 'urban' }) {
  const c = tone === 'frail' ? 'bg-cinnabar' : tone === 'preFrail' ? 'bg-amber_ink' : 'bg-indigo_ink'
  return <div className="h-1 w-full overflow-hidden rounded-full bg-ink/8"><div className={`h-full rounded-full transition-all duration-700 ${c}`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} /></div>
}
function GenderBar({ malePct }: { malePct: number }) {
  const mc = Math.round((malePct / 100) * 16)
  return <div className="flex flex-wrap gap-0.5 leading-none">{Array.from({ length: mc }, (_, i) => <span key={`m-${i}`} className="text-[10px] font-black text-indigo_ink">♂</span>)}{Array.from({ length: 16 - mc }, (_, i) => <span key={`f-${i}`} className="text-[10px] font-black text-ink/20">♀</span>)}</div>
}
function StatsBlock({ frailRate, malePct, urbanPct, n, totalN }: { frailRate: number; malePct: number | null; urbanPct: number | null; n: number; totalN?: number }) {
  return <div className="space-y-0.5">
    <div><div className="mb-0 flex items-center justify-between"><span className="text-[7px] text-ink-stone">衰弱率</span><span className="font-serif text-[9px] tabular-nums text-ink">{formatPercent(frailRate, 1)}</span></div><Bar pct={frailRate * 100} tone="frail" /></div>
    <div className="border-t border-ink/5 pt-0.5"><div className="flex items-center justify-between"><span className="text-[7px] text-ink-stone">样本量</span><span className="font-serif text-[9px] tabular-nums text-ink">{totalN != null ? `${n.toLocaleString()} / ${totalN.toLocaleString()} 人` : `${n.toLocaleString()} 人`}</span></div></div>
    <div><div className="flex items-center justify-between"><span className="text-[7px] text-ink-stone">男性比</span><span className="font-serif text-[9px] tabular-nums text-ink">{malePct != null ? formatPercent(malePct, 1) : '—'}</span></div>{malePct != null && <GenderBar malePct={malePct * 100} />}</div>
    <div><div className="flex items-center justify-between"><span className="text-[7px] text-ink-stone">城镇比</span><span className="font-serif text-[9px] tabular-nums text-ink">{urbanPct != null ? formatPercent(urbanPct, 1) : '—'}</span></div>{urbanPct != null && <Bar pct={urbanPct * 100} tone="urban" />}</div>
  </div>
}

function DeltaBadge({ value, unit }: { value: number; unit?: string }) {
  const abs = Math.abs(value); const sign = value > 0 ? '+' : value < 0 ? '−' : ''; const cls = abs < 0.3 ? 'text-ink-stone' : value > 0 ? 'text-cinnabar' : 'text-bamboo'
  return <span className={`font-mono text-[9px] tabular-nums font-medium ${cls}`}>{sign}{abs.toFixed(1)}{unit ?? ''}</span>
}

function FrailtyChangeCard({ anomaly, prevYear, cnLabel }: { anomaly: ProvinceChange; prevYear: Wave; cnLabel: string }) {
  return <div className="rounded-[2px] border border-ink/10 bg-paper-alt/60 p-1">
    <div className="flex items-center justify-between"><span className="text-[7px] text-ink-stone">{cnLabel}变化</span><span className="text-[6px] text-ink-stone/60">vs {prevYear}</span></div>
    <div className="mt-0.5 flex items-baseline gap-1">
      <DeltaBadge value={anomaly.frailDelta} unit=" pp" />
      <span className="text-[7px] text-ink-stone">
        {Math.abs(anomaly.frailDelta) < 0.3 ? '基本持平' : anomaly.frailDelta > 0 ? `上升 ${anomaly.frailDelta.toFixed(1)} 个百分点` : `下降 ${Math.abs(anomaly.frailDelta).toFixed(1)} 个百分点`}
      </span>
    </div>
  </div>
}

// ── Discovery Panel (analysis tab) ────────────────────────────────────────────

function ProvincePill({ change, tone }: { change: ProvinceChange; tone: 'rise' | 'drop' }) {
  const bg = tone === 'rise' ? 'bg-cinnabar/6 border-cinnabar/20' : 'bg-bamboo/6 border-bamboo/20'
  return <div className={`flex items-center justify-between rounded-[2px] border px-1.5 py-0.5 ${bg}`}><div className="flex items-center gap-1 min-w-0"><span className="font-serif text-[8px] text-ink truncate">{tProvince(change.province)}</span><DeltaBadge value={change.frailDelta} unit=" pp" /></div>{Math.abs(change.preFrailDelta) > 0.5 && <span className="text-[7px] text-ink-stone/50 ml-1 shrink-0">前{change.preFrailDelta > 0 ? '+' : ''}{change.preFrailDelta.toFixed(0)}pp</span>}</div>
}

function DiscoveryPanel({ insights, anomalies, selectedProvince }: { insights: AIAnalysisResult | null; anomalies: AnomalySnapshot; selectedProvince: string | null }) {
  const { topFrailRise, topFrailDrop, selected, selectedIsUnusual, selectedSigma } = anomalies
  return <div className="space-y-1">
    {!selectedProvince ? <>{topFrailRise[0] && <div><p className="mb-0.5 text-[7px] tracking-wide text-cinnabar/70">衰弱率上升最快</p><ProvincePill change={topFrailRise[0]} tone="rise" /></div>}{topFrailDrop[0] && <div><p className="mb-0.5 text-[7px] tracking-wide text-bamboo/70">衰弱率下降最快</p><ProvincePill change={topFrailDrop[0]} tone="drop" /></div>}</> : selected ? <div><p className="mb-0.5 text-[7px] tracking-wide text-ink-stone">{selectedIsUnusual ? '⚠ 异常省份' : '省份变化'}</p><div className={`rounded-[2px] border px-1.5 py-1 ${selectedIsUnusual ? 'border-cinnabar/30 bg-cinnabar/5' : 'border-ink/10 bg-paper-alt/40'}`}><div className="flex items-center justify-between"><span className="font-serif text-[8px] font-medium text-ink">{tProvince(selectedProvince)}</span><DeltaBadge value={selected.frailDelta} unit=" pp" /></div><p className="mt-0.5 text-[7px] leading-snug text-ink-stone">{selectedIsUnusual ? `偏离全国均值 ${Math.abs(selectedSigma).toFixed(1)}σ，值得关注` : '变化处于全国正常波动范围'}{Math.abs(selected.meanFIDelta) > 0.005 && <span className="ml-1 text-ink-stone/50">FI {selected.meanFIDelta > 0 ? '+' : ''}{selected.meanFIDelta.toFixed(3)}</span>}</p></div></div> : null}
    {insights && <><div className="rounded-[2px] border border-indigo_ink/20 bg-indigo_ink/4 px-1.5 py-1"><p className="mb-0.5 text-[7px] tracking-wide text-indigo_ink font-medium">驱动因素假说</p><div className="text-[7px] leading-snug text-ink-stone discover-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(insights.driverHypothesis) }} /></div><div className="rounded-[2px] border border-ink/10 bg-paper-alt/40 px-1 py-0.5"><div className="text-[7px] leading-snug text-ink-stone discover-text"><span className="font-medium text-ink">下一步：</span><span dangerouslySetInnerHTML={{ __html: renderMarkdown(insights.attention) }} /></div></div><div className="text-[7px] leading-snug text-ink-stone/80 border-t border-ink/5 pt-1 discover-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(insights.nationalOverview) }} /></>}
  </div>
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

function ChatPanel({ context, onHeightChange }: { context: ChatContext; onHeightChange?: (h: number) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => getQuickSuggestions(context), [context])

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight }, [messages, loading])

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setError(null)
    const updated: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(updated)
    setLoading(true)
    try {
      const reply = await sendChatMessage(context, messages, trimmed)
      setMessages([...updated, { role: 'agent', content: reply }])
    } catch (e) {
      setError(String(e).slice(0, 120))
    } finally { setLoading(false) }
  }, [messages, loading, context])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input) }
  }

  return (
    <div className="flex h-full flex-col gap-1">
      <div ref={listRef} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {messages.length === 0 && (
          <div className="space-y-0.5">
            <p className="text-[7px] text-ink-stone/60">快速提问：</p>
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => handleSend(s)} disabled={loading}
                className="block w-full text-left rounded-[2px] border border-ink/10 bg-paper-alt/40 px-1 py-0.5 text-[8px] text-ink-stone hover:border-cinnabar/30 hover:bg-cinnabar/4 transition-colors"
              >{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i}
            className={cn('rounded-[2px] px-1.5 py-0.5 max-w-[95%] text-[8px] leading-snug text-ink-stone chat-msg', m.role === 'user' ? 'ml-auto border border-cinnabar/20 bg-cinnabar/5' : 'border border-ink/10 bg-paper-alt/60')}
            dangerouslySetInnerHTML={{ __html: m.role === 'agent' ? renderMarkdown(m.content) : m.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br/>') }}
          />
        ))}
        {loading && <div className="rounded-[2px] border border-ink/5 bg-paper-alt/40 px-1.5 py-0.5 max-w-[95%]"><p className="text-[7px] text-ink-stone/50 animate-pulse">分析中…</p></div>}
        {error && <p className="text-[7px] text-cinnabar/60 px-1">{error}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="询问数据、文献或分析建议…" rows={1}
          disabled={loading}
          className="min-w-0 flex-1 resize-none rounded-[2px] border border-ink/15 bg-paper-alt px-1 py-0.5 text-[9px] text-ink placeholder:text-ink-stone/40 focus:border-cinnabar/40 focus:outline-none disabled:opacity-50"
        />
        <button type="button" onClick={() => handleSend(input)} disabled={loading || !input.trim()}
          className="shrink-0 self-end rounded-[2px] border border-cinnabar/30 bg-cinnabar/8 px-1.5 py-0.5 text-[8px] text-cinnabar-deep hover:bg-cinnabar/15 disabled:opacity-30 transition-colors"
        >发送</button>
      </div>
    </div>
  )
}

// ── Right Panel Router ────────────────────────────────────────────────────────

type RightTab = 'analysis' | 'chat'

function RightPanel({
  tab, setTab, aiResult, aiLoading, aiError, anomalies, prevYear, selectedProvince, chatContext,
}: {
  tab: RightTab; setTab: (t: RightTab) => void
  aiResult: AIAnalysisResult | null; aiLoading: boolean; aiError: string | null
  anomalies: AnomalySnapshot; prevYear: Wave; selectedProvince: string | null
  chatContext: ChatContext
}) {
  return (
    <div className="flex h-full flex-col gap-1">
      <div className="flex items-center justify-between shrink-0">
        <span className="font-serif text-[9px] font-semibold tracking-wide text-ink">
          {tab === 'analysis' ? '发现面板' : '智能问答'}
        </span>
        <div className="flex gap-px rounded-[2px] border border-ink/15 p-px">
          {(['analysis', 'chat'] as RightTab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={cn('px-1.5 py-0.5 text-[8px] rounded-[1px] transition-colors', tab === t ? 'bg-cinnabar/10 text-cinnabar-deep font-medium' : 'text-ink-wash hover:text-ink')}
            >{t === 'analysis' ? '分析' : '问答'}</button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {tab === 'analysis' ? (
          <DiscoveryPanel insights={aiResult} anomalies={anomalies} selectedProvince={selectedProvince} />
        ) : (
          <ChatPanel context={chatContext} />
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function WaveSelector({ sampleN, totalN, sampled, selectedProvince, provinces, prevProvinces }: WaveSelectorProps) {
  const { year, set } = useGlobalStore()
  const sel = selectedProvince ? provinces.find((p) => p.province === selectedProvince) ?? null : null
  const anomalies = useMemo(() => computeAnomalies(provinces, prevProvinces, selectedProvince ?? null), [provinces, prevProvinces, selectedProvince])
  const prevYear = PREV_WAVE[year]
  const [tab, setTab] = useState<RightTab>('analysis')

  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    if (!anomalies || !prevYear || !prevProvinces) { setAiResult(null); setAiLoading(false); return }
    const presetKey = `${prevYear}_${year}_${selectedProvince ?? 'national'}`
    if (AI_PRESET_ENABLED) {
      const preset = PRESET_ANALYSES[presetKey]
      if (preset) { setAiResult(preset); setAiLoading(false); setAiError(null); return }
      setAiResult(fallbackAnalysis(buildAnalysisInput(year, prevYear, anomalies, provinces, prevProvinces, selectedProvince ?? null)))
      setAiLoading(false)
      return
    }
    let cancelled = false; setAiLoading(true); setAiError(null)
    const input = buildAnalysisInput(year, prevYear, anomalies, provinces, prevProvinces, selectedProvince ?? null)
    if (!cancelled) setAiResult(fallbackAnalysis(input))
    analyzeAnomalies(input).then((r) => { if (!cancelled) { setAiResult(r); setAiLoading(false) } }).catch((e) => { if (!cancelled) { setAiError(String(e).slice(0, 120)); setAiLoading(false) } })
    return () => { cancelled = true }
  }, [year, prevYear, anomalies, provinces, prevProvinces, selectedProvince])

  const chatContext: ChatContext = useMemo(() => {
    const pm = prevProvinces ? new Map(prevProvinces.map((p) => [p.province, p])) : new Map()
    const allChanges = prevProvinces ? computeProvinceChanges(provinces, prevProvinces) : []
    const rise = allChanges.filter((c) => c.frailDelta > 0).sort((a, b) => b.frailDelta - a.frailDelta)
    const drop = allChanges.filter((c) => c.frailDelta < 0).sort((a, b) => a.frailDelta - b.frailDelta)
    const tn = provinces.reduce((s, p) => s + p.n, 0)
    const curFrail = tn ? provinces.reduce((s, p) => s + p.frailRate * p.n, 0) / tn : 0
    const prevFrail = prevProvinces ? (prevProvinces.reduce((s, p) => s + p.n, 0) ? prevProvinces.reduce((s, p) => s + p.frailRate * p.n, 0) / prevProvinces.reduce((s, p) => s + p.n, 0) : 0) : 0
    return {
      year, prevYear: prevYear ?? null, selectedProvince, provinceCn: selectedProvince ? tProvince(selectedProvince) : null,
      nationalFrailRate: curFrail, prevNationalFrailRate: prevFrail,
      nationalFrailDelta: anomalies?.national.frailDelta ?? 0,
      nationalPreFrailDelta: anomalies?.national.preFrailDelta ?? 0,
      nationalFIDelta: anomalies?.national.meanFIDelta ?? 0,
      topRiseProvince: { name: rise[0] ? tProvince(rise[0].province) : '—', delta: rise[0]?.frailDelta ?? 0 },
      topDropProvince: { name: drop[0] ? tProvince(drop[0].province) : '—', delta: drop[0]?.frailDelta ?? 0 },
      totalSampleN: tn,
      allProvinceChanges: allChanges.map((c) => { const cp = provinces.find((p) => p.province === c.province); const pp = pm.get(c.province); return { name: tProvince(c.province), delta: c.frailDelta, frailRate: cp?.frailRate ?? 0, prevFrailRate: pp?.frailRate ?? 0, n: cp?.n ?? 0, region: cp?.region ?? 'Unknown' } }),
      hasDriverData: true,
    }
  }, [year, prevYear, provinces, prevProvinces, selectedProvince, anomalies])

  return (
    <div className="flex gap-1.5 p-1 min-h-0 h-full overflow-hidden">
      {/* ── Left 44% ─────────────────────────────────────────────────── */}
      <div className="w-[44%] shrink-0 flex-col gap-1.5 overflow-y-auto">
        <div>
          <p className="text-[8px] tracking-widest text-ink-stone">调查波次</p>
          <div className="mt-1 flex flex-wrap gap-0.5">
            {WAVES.map((w) => (
              <button key={w} type="button" onClick={() => set({ year: w })}
                className={`border px-1.5 py-0.5 text-[9px] tabular-nums transition-colors ${year === w ? 'border-cinnabar bg-cinnabar/10 text-cinnabar-deep' : 'border-ink/15 text-ink-wash hover:border-ink/30'}`}>{w}</button>
            ))}
          </div>
        </div>
        {anomalies && prevYear && (
          <div className="mt-1.5 border-t border-ink/10 pt-1">
            <FrailtyChangeCard anomaly={anomalies.selected ?? anomalies.national} prevYear={prevYear} cnLabel={selectedProvince ? tProvince(selectedProvince) : '全国'} />
          </div>
        )}
        <div className="mt-1.5 border-t border-ink/10 pt-1">
          {sel ? (
            <><p className="mb-1 font-serif text-[9px] font-semibold text-ink">{tProvince(sel.province)}</p><StatsBlock frailRate={sel.frailRate} malePct={sel.malePct} urbanPct={sel.urbanPct} n={sel.n} totalN={totalN} /></>
          ) : provinces.length > 0 ? (() => {
            const tn = provinces.reduce((s, p) => s + p.n, 0)
            const af = provinces.reduce((s, p) => s + p.frailRate * p.n, 0) / (tn || 1)
            const mp = provinces.filter((p) => p.malePct != null)
            const up = provinces.filter((p) => p.urbanPct != null)
            return <><p className="mb-1 font-serif text-[7px] tracking-widest text-ink-stone">全国</p><StatsBlock frailRate={af} malePct={mp.length ? mp.reduce((s, p) => s + p.malePct! * p.n, 0) / mp.reduce((s, p) => s + p.n, 0) : null} urbanPct={up.length ? up.reduce((s, p) => s + p.urbanPct! * p.n, 0) / up.reduce((s, p) => s + p.n, 0) : null} n={tn} /></>
          })() : <p className="text-[8px] text-ink-stone">加载中…</p>}
        </div>
      </div>

      {/* ── Right 56% ────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 border-l border-ink/10 pl-1.5 overflow-y-auto min-h-0">
        {anomalies && prevYear ? (
          <RightPanel tab={tab} setTab={setTab} aiResult={aiResult} aiLoading={aiLoading} aiError={aiError} anomalies={anomalies} prevYear={prevYear} selectedProvince={selectedProvince} chatContext={chatContext} />
        ) : (
          <div className="flex h-full items-center justify-center"><p className="text-[8px] text-ink-stone/50">{year === 2011 ? '首年无对比数据' : '加载中…'}</p></div>
        )}
      </div>
    </div>
  )
}
