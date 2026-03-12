'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import NewsCard from '@/components/NewsCard'

const SPORT_FILTERS = ['All', 'NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'UFC', 'Boxing', 'Other']

export default function HomePage() {
  const router = useRouter()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => { fetchNews() }, [])

  async function fetchNews() {
    setLoading(true)
    try {
      const res = await fetch('/api/news')
      const data = await res.json()
      setArticles(data.articles || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleDebate(topic: string) {
    router.push(`/debate?topic=${encodeURIComponent(topic)}`)
  }

  const filtered = filter === 'All' ? articles : articles.filter((a: any) => a.sport === filter)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <Navbar />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 56, letterSpacing: 3, color: '#f8f9fa', marginBottom: 8 }}>TODAY IN SPORTS</h1>
        <p style={{ color: '#9ca3af', marginBottom: 24 }}>Live sports news updated daily</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {SPORT_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${filter === s ? '#e63946' : 'rgba(255,255,255,0.08)'}`, background: filter === s ? 'rgba(230,57,70,0.15)' : 'transparent', color: filter === s ? '#e63946' : '#9ca3af', cursor: 'pointer', fontFamily: 'var(--font-condensed)', fontSize: 13, fontWeight: 700 }}>{s}</button>
          ))}
          <button onClick={fetchNews} style={{ marginLeft: 'auto', padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>↻ Refresh</button>
        </div>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 160, borderRadius: 12, background: '#16161f', border: '1px solid rgba(255,255,255,0.08)' }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {filtered.map((article: any) => (
              <NewsCard key={article.id} article={article} onDebate={handleDebate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}