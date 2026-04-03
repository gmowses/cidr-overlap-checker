import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Languages, Plus, Trash2, AlertCircle, CheckCircle, Network, X } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'CIDR Overlap Checker',
    subtitle: 'Enter two or more CIDR blocks to check for overlaps. Visualize results and list overlapping addresses. Everything runs client-side.',
    addCidr: 'Add CIDR block',
    placeholder: 'e.g. 10.0.0.0/8',
    check: 'Check Overlaps',
    clear: 'Clear All',
    results: 'Results',
    noOverlaps: 'No overlaps detected.',
    overlapsFound: 'overlap(s) found',
    cidrInfo: 'CIDR Info',
    network: 'Network',
    broadcast: 'Broadcast',
    firstHost: 'First host',
    lastHost: 'Last host',
    totalHosts: 'Total hosts',
    usableHosts: 'Usable hosts',
    netmask: 'Netmask',
    overlap: 'Overlapping with',
    overlapRange: 'Overlap range',
    overlapHosts: 'Overlapping hosts',
    errorInvalid: 'Invalid CIDR notation',
    errorHost: 'Host bits must be zero (use network address)',
    errorMin: 'Enter at least 2 CIDR blocks to check overlaps.',
    builtBy: 'Built by',
    disclaimer: 'Only IPv4 is supported. Calculations are performed client-side.',
    pair: 'Pair',
    overlapDetail: 'Overlap Details',
    noResult: 'Add at least 2 CIDR blocks and click "Check Overlaps".',
    add: 'Add',
    remove: 'Remove',
  },
  pt: {
    title: 'Verificador de Sobreposicao CIDR',
    subtitle: 'Digite dois ou mais blocos CIDR para verificar sobreposicoes. Visualize os resultados e liste os enderecos sobrepostos. Tudo roda no navegador.',
    addCidr: 'Adicionar bloco CIDR',
    placeholder: 'ex: 10.0.0.0/8',
    check: 'Verificar Sobreposicoes',
    clear: 'Limpar Tudo',
    results: 'Resultados',
    noOverlaps: 'Nenhuma sobreposicao detectada.',
    overlapsFound: 'sobreposicao(oes) encontrada(s)',
    cidrInfo: 'Info CIDR',
    network: 'Rede',
    broadcast: 'Broadcast',
    firstHost: 'Primeiro host',
    lastHost: 'Ultimo host',
    totalHosts: 'Total de hosts',
    usableHosts: 'Hosts utilizaveis',
    netmask: 'Mascara',
    overlap: 'Sobreposicao com',
    overlapRange: 'Faixa sobreposicao',
    overlapHosts: 'Hosts sobrepostos',
    errorInvalid: 'Notacao CIDR invalida',
    errorHost: 'Bits de host devem ser zero (use o endereco de rede)',
    errorMin: 'Digite pelo menos 2 blocos CIDR para verificar sobreposicoes.',
    builtBy: 'Criado por',
    disclaimer: 'Apenas IPv4 suportado. Calculos sao feitos no navegador.',
    pair: 'Par',
    overlapDetail: 'Detalhes da Sobreposicao',
    noResult: 'Adicione pelo menos 2 blocos CIDR e clique em "Verificar Sobreposicoes".',
    add: 'Adicionar',
    remove: 'Remover',
  }
} as const

type Lang = keyof typeof translations

// ── CIDR Logic ────────────────────────────────────────────────────────────────
function ipToNum(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0
}

function numToIp(num: number): string {
  return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.')
}

function prefixToMask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
}

interface CidrInfo {
  cidr: string
  prefix: number
  networkNum: number
  broadcastNum: number
  network: string
  broadcast: string
  firstHost: string
  lastHost: string
  totalHosts: number
  usableHosts: number
  netmask: string
}

function parseCidr(cidr: string): CidrInfo | { error: string } {
  const match = cidr.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/)
  if (!match) return { error: 'invalid' }
  const [, ip, prefixStr] = match
  const prefix = parseInt(prefixStr, 10)
  if (prefix < 0 || prefix > 32) return { error: 'invalid' }
  const parts = ip.split('.').map(Number)
  if (parts.some(p => p > 255)) return { error: 'invalid' }
  const ipNum = ipToNum(ip)
  const mask = prefixToMask(prefix)
  const networkNum = (ipNum & mask) >>> 0
  if (networkNum !== ipNum) return { error: 'hostbits' }
  const broadcastNum = (networkNum | ~mask) >>> 0
  const totalHosts = broadcastNum - networkNum + 1
  const usableHosts = prefix >= 31 ? totalHosts : Math.max(0, totalHosts - 2)
  return {
    cidr,
    prefix,
    networkNum,
    broadcastNum,
    network: numToIp(networkNum),
    broadcast: numToIp(broadcastNum),
    firstHost: prefix >= 31 ? numToIp(networkNum) : numToIp(networkNum + 1),
    lastHost: prefix >= 31 ? numToIp(broadcastNum) : numToIp(broadcastNum - 1),
    totalHosts,
    usableHosts,
    netmask: numToIp(mask),
  }
}

interface OverlapResult {
  a: CidrInfo
  b: CidrInfo
  overlapStart: number
  overlapEnd: number
  overlapStartIp: string
  overlapEndIp: string
  overlapCount: number
}

function checkOverlap(a: CidrInfo, b: CidrInfo): OverlapResult | null {
  const start = Math.max(a.networkNum, b.networkNum)
  const end = Math.min(a.broadcastNum, b.broadcastNum)
  if (start > end) return null
  return {
    a, b,
    overlapStart: start,
    overlapEnd: end,
    overlapStartIp: numToIp(start),
    overlapEndIp: numToIp(end),
    overlapCount: end - start + 1,
  }
}

function fmtNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

const ACCENT = '#ef4444'

// ── Component ─────────────────────────────────────────────────────────────────
export default function CidrOverlapChecker() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('pt') ? 'pt' : 'en'))
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [inputs, setInputs] = useState<string[]>(['10.0.0.0/8', '10.10.0.0/16'])
  const [errors, setErrors] = useState<(string | null)[]>([null, null])
  const [results, setResults] = useState<{ infos: CidrInfo[]; overlaps: OverlapResult[] } | null>(null)

  const t = translations[lang]

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const setInput = (i: number, val: string) => {
    setInputs(arr => arr.map((v, idx) => idx === i ? val : v))
    setErrors(arr => arr.map((v, idx) => idx === i ? null : v))
  }

  const addInput = () => {
    setInputs(arr => [...arr, ''])
    setErrors(arr => [...arr, null])
  }

  const removeInput = (i: number) => {
    setInputs(arr => arr.filter((_, idx) => idx !== i))
    setErrors(arr => arr.filter((_, idx) => idx !== i))
  }

  const clearAll = () => {
    setInputs(['', ''])
    setErrors([null, null])
    setResults(null)
  }

  const handleCheck = useCallback(() => {
    const newErrors: (string | null)[] = inputs.map(v => {
      if (!v.trim()) return t.errorInvalid
      const r = parseCidr(v)
      if ('error' in r) return r.error === 'hostbits' ? t.errorHost : t.errorInvalid
      return null
    })
    setErrors(newErrors)
    if (newErrors.some(Boolean)) return

    const infos = inputs.map(v => parseCidr(v) as CidrInfo)
    const overlaps: OverlapResult[] = []
    for (let i = 0; i < infos.length; i++) {
      for (let j = i + 1; j < infos.length; j++) {
        const ov = checkOverlap(infos[i], infos[j])
        if (ov) overlaps.push(ov)
      }
    }
    setResults({ infos, overlaps })
  }, [inputs, t])

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: ACCENT }}>
              <Network size={18} className="text-white" />
            </div>
            <span className="font-semibold">CIDR Overlap</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/cidr-overlap-checker" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Panel */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <p className="text-sm font-medium">{t.addCidr}</p>

              <div className="space-y-2">
                {inputs.map((val, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-mono w-5 text-zinc-400 shrink-0">{i + 1}</span>
                      <input
                        type="text"
                        value={val}
                        onChange={e => setInput(i, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCheck()}
                        placeholder={t.placeholder}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 transition-colors bg-zinc-50 dark:bg-zinc-800 ${errors[i] ? 'border-red-400 dark:border-red-700' : 'border-zinc-200 dark:border-zinc-700'}`}
                        style={{ '--tw-ring-color': ACCENT } as React.CSSProperties}
                        spellCheck={false}
                        autoComplete="off"
                      />
                      {inputs.length > 2 && (
                        <button onClick={() => removeInput(i)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 text-zinc-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                      {inputs.length === 2 && (
                        <button onClick={() => setInput(i, '')} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {errors[i] && (
                      <p className="text-xs text-red-500 ml-7">{errors[i]}</p>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addInput}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 py-2 text-sm text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                <Plus size={14} /> {t.addCidr}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleCheck}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: ACCENT }}
                >
                  <Network size={15} />{t.check}
                </button>
                <button
                  onClick={clearAll}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {t.clear}
                </button>
              </div>

              <p className="text-[10px] text-zinc-400">{t.disclaimer}</p>
            </div>

            {/* Results Panel */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <h2 className="font-semibold">{t.results}</h2>

              {!results && (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-400 gap-3">
                  <Network size={32} className="opacity-30" />
                  <p className="text-sm text-center">{t.noResult}</p>
                </div>
              )}

              {results && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div
                    className="flex items-center gap-3 rounded-lg px-4 py-3"
                    style={results.overlaps.length > 0
                      ? { backgroundColor: `${ACCENT}15`, borderLeft: `3px solid ${ACCENT}` }
                      : { backgroundColor: '#22c55e15', borderLeft: '3px solid #22c55e' }
                    }
                  >
                    {results.overlaps.length > 0
                      ? <AlertCircle size={18} style={{ color: ACCENT }} className="shrink-0" />
                      : <CheckCircle size={18} style={{ color: '#22c55e' }} className="shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-semibold" style={{ color: results.overlaps.length > 0 ? ACCENT : '#22c55e' }}>
                        {results.overlaps.length > 0 ? `${results.overlaps.length} ${t.overlapsFound}` : t.noOverlaps}
                      </p>
                    </div>
                  </div>

                  {/* CIDR Table */}
                  <div className="space-y-2">
                    {results.infos.map((info, i) => (
                      <div key={i} className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3 text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm" style={{ color: ACCENT }}>{info.cidr}</span>
                          <span className="text-zinc-400">/{info.prefix}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-zinc-500 dark:text-zinc-400">
                          <span>{t.network}: <span className="text-zinc-700 dark:text-zinc-200">{info.network}</span></span>
                          <span>{t.broadcast}: <span className="text-zinc-700 dark:text-zinc-200">{info.broadcast}</span></span>
                          <span>{t.netmask}: <span className="text-zinc-700 dark:text-zinc-200">{info.netmask}</span></span>
                          <span>{t.usableHosts}: <span className="text-zinc-700 dark:text-zinc-200">{fmtNum(info.usableHosts)}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Overlap Details */}
                  {results.overlaps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{t.overlapDetail}</p>
                      {results.overlaps.map((ov, i) => (
                        <div key={i} className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-xs space-y-1">
                          <p className="font-semibold text-red-600 dark:text-red-400">{t.pair} {i + 1}: <span className="font-mono">{ov.a.cidr}</span> ∩ <span className="font-mono">{ov.b.cidr}</span></p>
                          <div className="font-mono text-red-500 dark:text-red-400 space-y-0.5">
                            <p>{t.overlapRange}: {ov.overlapStartIp} – {ov.overlapEndIp}</p>
                            <p>{t.overlapHosts}: {fmtNum(ov.overlapCount)}</p>
                          </div>
                          {/* Simple visual bar */}
                          <div className="mt-2 relative h-5 rounded overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                            {[ov.a, ov.b].map((info, bi) => {
                              const totalMin = Math.min(ov.a.networkNum, ov.b.networkNum)
                              const totalMax = Math.max(ov.a.broadcastNum, ov.b.broadcastNum)
                              const range = totalMax - totalMin || 1
                              const left = ((info.networkNum - totalMin) / range) * 100
                              const width = ((info.broadcastNum - info.networkNum) / range) * 100
                              return (
                                <div
                                  key={bi}
                                  className="absolute top-0 h-full rounded opacity-60"
                                  style={{
                                    left: `${left}%`,
                                    width: `${Math.max(width, 4)}%`,
                                    backgroundColor: bi === 0 ? '#3b82f6' : '#f97316',
                                    top: bi === 0 ? '0' : '50%',
                                    height: '50%',
                                  }}
                                />
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:underline transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
