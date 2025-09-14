// client/src/App.jsx
import React, { useState, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const wsUrl = (base) => base.replace(/^http/, 'ws')

export default function App() {
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [filename, setFilename] = useState(null)
  const [log, setLog] = useState([])
  const [file, setFile] = useState(null)
  const [transcript, setTranscript] = useState('') // <- preview text
  const [opts, setOpts] = useState({ model:'large-v3', device:'cuda', compute_type:'float16', language:'en' })
  const wsRef = useRef(null)

 async function submit(file) {
  const fd = new FormData()
  fd.append("file", file)
  // OpenAI params:
  fd.append("model", "gpt-4o-mini-transcribe") // Whisper-optimized model
  // Optional: language hint for English-only audio
  // fd.append("language", "en")

  const res = await fetch("/api/transcribe", { method: "POST", body: fd })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() // { text: "..." }
  setTranscript(data.text || "")
}

    setStatus('uploading')
    let job_id, fname
    try {
      const res = await fetch(`${API}/jobs`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const js = await res.json()
      job_id = js.job_id; fname = js.filename
    } catch (e) {
      setStatus('error'); setLog(p=>[...p, `create_job failed: ${e}`]); return
    }
    setJobId(job_id); setFilename(fname); setStatus('queued')

    // progress via WS
    const ws = new WebSocket(`${wsUrl(API)}/ws/jobs/${job_id}`)
    ws.onmessage = (e)=> setLog(p=>[...p, e.data])
    ws.onerror = ()=> setLog(p=>[...p, 'websocket error'])
    wsRef.current = ws

    // poll status
    const t = setInterval(async ()=>{
      try {
        const s = await fetch(`${API}/jobs/${job_id}`).then(r=>r.json())
        setStatus(s.state || 'unknown')
        if (s.state === 'done') {
          clearInterval(t)
          // auto fetch preview text
          try {
            const txt = await fetchResult('txt', true)
            setTranscript(txt)
          } catch {}
        }
        if (s.state === 'error') clearInterval(t)
      } catch (e) {
        setLog(p=>[...p, `poll failed: ${e}`])
      }
    }, 1000)
  }

  // Fetch result and optionally download it
  async function fetchResult(ext, returnText = false) {
    if (!jobId || !filename) return ''
    const url = `${API}/jobs/${jobId}/result?filename=${encodeURIComponent(filename)}&ext=${ext}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`result ${ext} not ready`)
    const blob = await res.blob()
    if (returnText) {
      if (ext === 'txt' || ext === 'vtt' || ext === 'srt') {
        return await blob.text()
      }
      return ''
    }
    // trigger browser download
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${filename.replace(/\.[^/.]+$/, '')}.${ext}`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(a.href)
    return ''
  }

  async function copyTranscript() {
    if (!transcript) return
    await navigator.clipboard.writeText(transcript)
    setLog(p=>[...p, 'copied transcript to clipboard'])
  }

  return (
    <div style={{maxWidth:900, margin:'40px auto', fontFamily:'system-ui'}}>
      <h1>Whisper Transcriber</h1>

      <div style={{display:'grid', gap:12, gridTemplateColumns:'repeat(4, 1fr)'}}>
        <div><label>Model</label><select value={opts.model} onChange={e=>setOpts({...opts, model:e.target.value})}>
          <option>large-v3</option><option>large-v2</option><option>medium.en</option></select></div>
        <div><label>Device</label><select value={opts.device} onChange={e=>setOpts({...opts, device:e.target.value})}>
          <option>cuda</option><option>cpu</option></select></div>
        <div><label>Compute</label><select value={opts.compute_type} onChange={e=>setOpts({...opts, compute_type:e.target.value})}>
          <option>float16</option><option>int8_float16</option><option>int8</option></select></div>
        <div><label>Language</label><select value={opts.language} onChange={e=>setOpts({...opts, language:e.target.value})}>
          <option>en</option></select></div>
      </div>

      <div style={{marginTop:16, padding:16, border:'1px dashed #999'}}>
        <input type="file" accept="audio/*,video/*" onChange={e=>setFile(e.target.files?.[0])}/>
        <button style={{marginLeft:12}} onClick={start}>Submit</button>
        <div style={{marginTop:8}}>Status: <b>{status}</b></div>
      </div>

      <pre style={{marginTop:16, background:'#111', color:'#b2f5ea', padding:12, height:160, overflow:'auto'}}>
        {log.map((l,i)=><div key={i}>{l}</div>)}
      </pre>

      {/* Preview + Downloads */}
      {status==='done' && (
        <div style={{marginTop:16}}>
          <div style={{display:'flex', gap:12, flexWrap:'wrap', marginBottom:8}}>
            <button onClick={()=>fetchResult('txt')}>Download .txt</button>
            <button onClick={()=>fetchResult('srt')}>Download .srt</button>
            <button onClick={()=>fetchResult('vtt')}>Download .vtt</button>
            <button onClick={copyTranscript} disabled={!transcript}>Copy to Clipboard</button>
          </div>

          <h3>Transcript preview</h3>
          <textarea
            value={transcript}
            readOnly
            style={{width:'100%', minHeight:240, padding:10, fontFamily:'ui-monospace, Menlo, Consolas'}}
            placeholder="Transcript preview will appear here once ready."
          />
        </div>
      )}

      {status==='error' && <div style={{color:'crimson'}}>Job failed. Check logs above.</div>}
    </div>
  )
}
