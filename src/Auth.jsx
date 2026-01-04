import { useState } from 'react'
import { supabase } from './supabaseClient.jsx'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('') // Changed from email to username
  const [password, setPassword] = useState('')

  // Helper function to make a fake email from the username
  const getEmail = (user) => {
    return `${user}@quizgame.com`
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    
    // We add the fake domain behind the scenes
    const { error } = await supabase.auth.signInWithPassword({ 
        email: getEmail(username), 
        password 
    })

    if (error) {
      alert(error.message)
    } else {
       // No alert needed, we will handle the "Success" state in the next step
       console.log("Logged in!")
    }
    setLoading(false)
  }

  const handleSignUp = async (event) => {
    event.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signUp({ 
        email: getEmail(username), 
        password 
    })

    if (error) {
      alert(error.message)
    } else {
      alert('Account created! You are now logged in.')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h2>Quiz Game Login</h2>
      <p>Enter a username and password to play</p>
      
      <form>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text" // Changed to text
            placeholder="Choose a Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: '10px', width: '100%' }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '10px', width: '100%' }}
          />
        </div>

        <button 
            onClick={handleLogin} 
            disabled={loading}
            style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          {loading ? 'Loading...' : 'Log In'}
        </button>

        <button 
            onClick={handleSignUp} 
            disabled={loading}
            style={{ padding: '10px 20px' }}
        >
          Sign Up
        </button>
      </form>
    </div>
  )
}