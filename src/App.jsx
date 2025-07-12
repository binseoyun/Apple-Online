import { useState } from 'react'
import Hello from './components/Hello.jsx'

function App() {
  const [name, setName] = useState('React 초보자')

  return (
    <div>
      <h1>React 기본 구조</h1>
      <Hello name={name} />
    </div>
  )
}

export default App
