import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  // Helper to clear the input fields
  const clearForm = () => {
    setUsername('');
    setPassword('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5001/api/signup', { username, password });
      setMessage(response.data.message);
      clearForm(); // Form clears after successful signup
    } catch (error) {
      setMessage(error.response?.data?.error || 'Signup failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5001/api/login', { username, password });
      const receivedToken = response.data.token;
      setToken(receivedToken);
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('currentUser', username); // Store name to show in welcome message
      setMessage("Login successful!");
      // We don't necessarily need to clearForm here since the form disappears, 
      // but it's good practice.
    } catch (error) {
      setMessage(error.response?.data?.error || 'Login failed');
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    clearForm(); // This fixes the issue you noticed!
    setMessage("Logged out.");
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>UCLA Food App</h1>
      
      {!token ? (
        <>
          <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px', borderRadius: '8px' }}>
            <h2>Sign Up / Login</h2>
            <input 
              type="text" placeholder="Username" value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={{ display: 'block', margin: '10px auto', padding: '10px', width: '200px' }}
            />
            <input 
              type="password" placeholder="Password" value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={{ display: 'block', margin: '10px auto', padding: '10px', width: '200px' }}
            />
            <button onClick={handleSignup} style={{ margin: '5px', padding: '10px 20px' }}>Sign Up</button>
            <button onClick={handleLogin} style={{ margin: '5px', padding: '10px 20px', backgroundColor: '#0073e6', color: 'white', border: 'none', borderRadius: '4px' }}>Login</button>
          </div>
        </>
      ) : (
        <div style={{ border: '1px solid #4CAF50', padding: '20px', borderRadius: '8px' }}>
          <h2>Welcome, {localStorage.getItem('currentUser')}!</h2>
          <p>You are successfully authenticated.</p>
          <button onClick={handleLogout} style={{ padding: '10px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}>Logout</button>
        </div>
      )}

      {message && <p style={{ color: message.includes('failed') || message.includes('taken') ? 'red' : 'green' }}>
        <strong>{message}</strong>
      </p>}
    </div>
  );
}

export default App;