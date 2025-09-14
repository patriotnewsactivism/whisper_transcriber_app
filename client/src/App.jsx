
import React, { useState, useRef } from 'react'
const API = 'http://localhost:8000'
export default function App() {
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [filename, setFilename] = useState(null)
  const [log, setLog] = useState([])
  const [opts, setOpts] = useState({ model:'large-v3', device:'cuda', compute_type:'float16', language:'en' })
  const wsRef = useRef(null)
  async function upload(file) {
    const form = new FormData()
    form.append('file', file)
    Object.entries(opts).forEach(([k,v])=>form.append(k, v))
    const r = await fetch(`${API}/jobs`, { method:'POST', body: form })
    const { job_id, filename } = await r.json()
    setJobId(job_id); setFilename(filename); setStatus('queued')
    const ws = new WebSocket(`ws://localhost:8000/ws/jobs/${job_id}`)
    ws.onmessage = (e)=> setLog(p=>[...p, e.data]); wsRef.current = ws
    const t = setInterval(async ()=>{
      const s = await fetch(`${API}/jobs/${job_id}`).then(r=>r.json())
      setStatus(s.state); if (s.state==='done' || s.state==='error') clearInterval(t)
    }, 1000)
  }
  return (
    <div style={{maxWidth:800, margin:'40px auto', fontFamily:'system-ui'}}>
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
        <input type="file" accept="audio/*,video/*" onChange={e=>e.target.files && upload(e.target.files[0])}/>
        <div style={{marginTop:8}}>Status: <b>{status}</b></div>
      </div>
      <pre style={{marginTop:16, background:'#111', color:'#b2f5ea', padding:12, height:180, overflow:'auto'}}>
        {log.map((l,i)=><div key={i}>{l}</div>)}
      </pre>
      {status==='done' && jobId && filename && (
        <div style={{display:'flex', gap:12}}>
          <a href={`${API}/jobs/${jobId}/result?filename=${encodeURIComponent(filename)}&ext=txt`} download>Download .txt</a>
          <a href={`${API}/jobs/${jobId}/result?filename=${encodeURIComponent(filename)}&ext=srt`} download>Download .srt</a>
          <a href={`${API}/jobs/${jobId}/result?filename=${encodeURIComponent(filename)}&ext=vtt`} download>Download .vtt</a>
        </div>
      )}
      {status==='error' && <div style={{color:'crimson'}}>Job failed. Check logs above.</div>}
    </div>
  )
}
