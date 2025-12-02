import { useState } from 'react'
import './App.css'
import AvatarButton from './components/AvatarButton'
import AvatarModal from './components/AvatarModal'

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="app-container">
        <div className="home-content">
          <h1>Welcome to Our Support Website</h1>
          <p>Click the avatar button to get help from our AI Assistant</p>
        </div>
      </div>
      <AvatarButton onClick={() => setIsModalOpen(true)} />
      <AvatarModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

export default App
