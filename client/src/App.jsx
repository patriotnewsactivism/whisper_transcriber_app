import React, { useState } from 'react'
import { pipeline } from '@xenova/transformers'

function toSRT(segs){
  const fmt = t => {
    const ms = Math.floor(t*1000), h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000), ms2=ms%1000
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms2).padStart(3,'0')}`
  }
  return segs.map((s,i)=>`${i+1}\n${fmt(s.start)} --> ${fmt(s.end)}\n${s.text.trim()}\n`).join('\n')
}
function toVTT(segs){
  const fmt = t => {
    const ms = Math.floor(t*1000), h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000), ms2=ms%1000
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms2).padStart(3,'0')}`
  }
  return 'WEBVTT\n\n' + segs.map(s=>`${fmt(s.start)} --> ${fmt(s.end)}\n${s.text.trim()}\n`).join('\n')
}
function download(name, text){
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [log, setLog] = useState([])
  const [modelId, setModelId] = useState('Xenova/whisper-small.en') // free & light
  const [text, setText] = useState('')
  const [segs, setSegs] = useState([])

  async function transcribe(){
    if (!file) return
    setStatus('loading model…'); setLog([]); setText(''); setSegs([])

    // Load once; it will cache in the browser
    const asr = await pipeline('automatic-speech-recognition', modelId, {
      quantized: true
    })

    setStatus('preparing audio…')
    const audio = await file.arrayBuffer()

    setStatus('transcribing…')
    const out = await asr(audio, {
      // chunking makes long files work reliably
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      callback_function: (x) => {
        if (x?.chunks?.length) {
          setLog(prev => [...prev, `chunks: ${x.chunks.length}`])
        }
      }
    })

    // out has either .text or .chunks with timestamps
    const chunks = out.chunks?.map(c => ({
      start: c.timestamp[0] ?? 0,
      end:   c.timestamp[1] ?? 0,
      text:  c.text || ''
    })) || []

    setText(out.text || chunks.map(c=>c.text).join(' '))
    setSegs(chunks)
    setStatus('done')
  }

  const baseName = file ? file.name.replace(/\.[^/.]+$/, '') : 'transcript'
  const srt = segs.length ? toSRT(segs) : ''
  const vtt = segs.length ? toVTT(segs) : ''

  return (
    <div style={{maxWidth:900, margin:'40px auto', fontFamily:'system-ui'}}>
      <h1>Whisper (Browser-only, free)</h1>

      <div style={{display:'grid', gap:12, gridTemplateColumns:'2fr 2fr 1fr'}}>
        <div>
          <label>Model</label>
          <select value={modelId} onChange={e=>setModelId(e.target.value)} style={{display:'block', width:'100%'}}>
            <option value="Xenova/whisper-small.en">whisper-small.en (fast/accurate)</option>
            <option value="Xenova/whisper-base.en">whisper-base.en (fastest)</option>
            <option value="Xenova/whisper-medium.en">whisper-medium.en (better, slower)</option>
          </select>
        </div>
        <div>
          <label>File</label>
          <input type="file" accept="audio/*,video/*"
                 onChange={e=>setFile(e.target.files?.[0] || null)}
                 style={{display:'block', width:'100%'}} />
        </div>
        <div style={{alignSelf:'end'}}>
          <button onClick={transcribe} disabled={!file || status==='loading model…'}>Submit</button>
        </div>
      </div>

      <div style={{marginTop:8}}>Status: <b>{status}</b></div>
      <pre style={{marginTop:8, background:'#111', color:'#b2f5ea', padding:12, height:120, overflow:'auto'}}>
        {log.map((l,i)=><div key={i}>{l}</div>)}
      </pre>

      {status==='done' && (
        <div style={{marginTop:16}}>
          <div style={{display:'flex', gap:12, flexWrap:'wrap', marginBottom:8}}>
            <button onClick={()=>download(`${baseName}.txt`, text)}>Download .txt</button>
            <button onClick={()=>download(`${baseName}.srt`, srt)} disabled={!srt}>Download .srt</button>
            <button onClick={()=>download(`${baseName}.vtt`, vtt)} disabled={!vtt}>Download .vtt</button>
            <button onClick={async()=>{await navigator.clipboard.writeText(text)}}>Copy</button>
          </div>
          <h3>Transcript preview</h3>
          <textarea value={text} readOnly style={{width:'100%', minHeight:260, padding:10, fontFamily:'ui-monospace'}}/>
        </div>
      )}
    </div>
  )
}