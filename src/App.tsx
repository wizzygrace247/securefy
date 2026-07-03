import { useState, useEffect } from 'react'

function App() {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    const ext = (window as any).chrome
    if (ext?.tabs?.query) {
      ext.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
        setUrl(tabs[0]?.url || 'No URL found')
      })
    } else {
      setUrl('No URL found')
    }
  }, [])

  return (
    <div style={{ padding: '1rem', minWidth: '300px' }}>
      <h2>Current Page URL</h2>
      <p style={{ wordBreak: 'break-all' }}>{url}</p>
    </div>
  )
}

export default App