// client/src/App.jsx (browser inference)
import React, { useState } from 'react'
import { pipeline } from '@xenova/transformers'   // runs in-browser (WebGPU/WebAssembly)

export default function App() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [text, setText] = useState('')

  async function submit() {
    if (!file) return
    setStatus('loading model…')
    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small.en')
    setStatus('transcribing…')
    const audio = await file.arrayBuffer()
    const out = await transcriber(audio, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: false })
    setText(out.text)
    setStatus('done')
  }

  return (
    <div style={{maxWidth:800, margin:'40px auto', fontFamily:'system-ui'}}>
      <h1>Whisper (Browser)</h1>
      <input type="file" accept="audio/*,video/*" onChange={e=>setFile(e.target.files?.[0])}/>
      <button onClick={submit}>Submit</button>
      <div>Status: <b>{status}</b></div>
      <pre style={{whiteSpace:'pre-wrap'}}>{text}</pre>
    </div>
  )
}
