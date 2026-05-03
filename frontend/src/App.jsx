import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer'); 
  const [message, setMessage] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');
  const [foodItems, setFoodItems] = useState([]);
  const [foodData, setFoodData] = useState({ name: '', description: '', date: '', cost: '', mealPeriod: 'Lunch' });

  const fetchFood = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/food-opportunities');
      setFoodItems(response.data);
    } catch (error) {
      console.error("Error fetching food:", error);
    }
  };

  useEffect(() => {
    if (token) fetchFood();
  }, [token]);

  // FIXED: Explicitly wipes all input states
  const clearForm = () => {
    setUsername('');
    setPassword('');
    setRole('customer');
    setFoodData({ name: '', description: '', date: '', cost: '', mealPeriod: 'Lunch' });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5001/api/signup', { username, password, role });
      setMessage(response.data.message + " You can now login.");
      clearForm(); // Clear after signup
    } catch (error) {
      setMessage(error.response?.data?.error || 'Signup failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5001/api/login', { username, password });
      const { token, user } = response.data;
      setToken(token);
      setUserRole(user.role);
      localStorage.setItem('token', token);
      localStorage.setItem('currentUser', user.username);
      localStorage.setItem('userRole', user.role);
      setMessage("Login successful!");
      clearForm(); // Clear after login so credentials don't stay in state
    } catch (error) {
      setMessage(error.response?.data?.error || 'Login failed');
    }
  };

  // FIXED: Added clearForm() here to wipe the UI for the next user
  const handleLogout = () => {
    setToken('');
    setUserRole('');
    setFoodItems([]);
    localStorage.clear();
    clearForm(); 
    setMessage("Logged out successfully.");
  };

  const handleAddFood = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5001/api/food-opportunities', {
        ...foodData,
        username: localStorage.getItem('currentUser')
      });
      setMessage(response.data.message);
      setFoodData({ name: '', description: '', date: '', cost: '', mealPeriod: 'Lunch' });
      fetchFood();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to add food');
    }
  };

  return (
    <div style={{ padding: '30px', textAlign: 'center', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <h1>UCLA Food App</h1>
      
      {!token ? (
        <div style={{ border: '1px solid #ccc', padding: '20px', backgroundColor: 'white', borderRadius: '8px', maxWidth: '400px', margin: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h2>Sign Up / Login</h2>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ display: 'block', margin: '10px auto', padding: '10px', width: '85%' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ display: 'block', margin: '10px auto', padding: '10px', width: '85%' }} />
          <div style={{ margin: '10px' }}>
            <label>Register as: </label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '8px' }}>
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>
          <button onClick={handleSignup} style={{ margin: '5px', padding: '10px 20px', cursor: 'pointer' }}>Sign Up</button>
          <button onClick={handleLogin} style={{ margin: '5px', padding: '10px 20px', backgroundColor: '#0073e6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Login</button>
        </div>
      ) : (
        <div style={{ maxWidth: '900px', margin: 'auto' }}>
          <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <span>Welcome, <strong>{localStorage.getItem('currentUser')}</strong> ({userRole})</span>
            <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
          </div>

          {userRole === 'vendor' && (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <h3>Post a New Food Opportunity</h3>
              <form onSubmit={handleAddFood}>
                <input type="text" placeholder="Food Name" value={foodData.name} required onChange={(e) => setFoodData({...foodData, name: e.target.value})} style={{ margin: '5px', padding: '8px', width: '40%' }} />
                <input type="number" placeholder="Cost ($)" value={foodData.cost} required onChange={(e) => setFoodData({...foodData, cost: e.target.value})} style={{ margin: '5px', padding: '8px', width: '40%' }} />
                <textarea placeholder="Description" value={foodData.description} onChange={(e) => setFoodData({...foodData, description: e.target.value})} style={{ display: 'block', margin: '10px auto', padding: '8px', width: '85%', height: '50px' }} />
                <input type="date" value={foodData.date} required onChange={(e) => setFoodData({...foodData, date: e.target.value})} style={{ margin: '5px', padding: '8px' }} />
                <select value={foodData.mealPeriod} onChange={(e) => setFoodData({...foodData, mealPeriod: e.target.value})} style={{ margin: '5px', padding: '8px' }}>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
                <button type="submit" style={{ backgroundColor: '#4CAF50', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', display: 'block', margin: '10px auto', cursor: 'pointer' }}>Post Food</button>
              </form>
            </div>
          )}

          <div style={{ textAlign: 'left' }}>
            <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #0073e6', display: 'inline-block' }}>Available Food</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {foodItems.map((item) => (
                <div key={item.opp_id} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#0073e6' }}>{item.opp_name}</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem', minHeight: '40px' }}>{item.opp_description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#2c3e50' }}>
                    <span style={{ background: '#e1f5fe', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem' }}>{item.meal_period_name}</span>
                    <span style={{ color: '#27ae60' }}>${item.cost}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '10px' }}>Date: {new Date(item.opp_date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {message && <p style={{ color: message.toLowerCase().includes('failed') ? 'red' : 'green', marginTop: '20px' }}><strong>{message}</strong></p>}
    </div>
  );
}

export default App;