import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default marker icons in React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Coordinate mapping for User Story 8
const CAMPUS_LOCATIONS = [
  { name: 'Ackerman Union', lat: 34.0704, lng: -118.4441 },
  { name: 'Bruin Plaza', lat: 34.0708, lng: -118.4450 },
  { name: 'Powell Library', lat: 34.0716, lng: -118.4421 },
  { name: 'Royce Hall', lat: 34.0729, lng: -118.4421 },
  { name: 'Wooden Center', lat: 34.0710, lng: -118.4463 },
  { name: 'Sproul Hall (The Hill)', lat: 34.0720, lng: -118.4500 },
  { name: 'Hedrick Hall (The Hill)', lat: 34.0732, lng: -118.4523 },
  { name: 'Rieber Hall (The Hill)', lat: 34.0715, lng: -118.4515 },
  { name: 'Olympic Hall (The Hill)', lat: 34.0705, lng: -118.4530 },
  { name: 'Centennial Hall (The Hill)', lat: 34.0702, lng: -118.4525 }
];

function App() {
  // Auth State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer'); 
  const [message, setMessage] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');
  const [savedItems, setSavedItems] = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);

  // Food Data State
  const [foodItems, setFoodItems] = useState([]);
  const [foodData, setFoodData] = useState({
    name: '', description: '', date: '', cost: '', mealPeriod: 'Lunch',
    locationName: CAMPUS_LOCATIONS[0].name, rsvpCapacity: ''
  });
  
  // UI State
  const [editingId, setEditingId] = useState(null);
  const [mealFilter, setMealFilter] = useState('All');
  const [costFilter, setCostFilter] = useState('');

  const fetchFood = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/food-opportunities', {
        params: {
          meal: mealFilter,
          maxCost: costFilter,
          username: localStorage.getItem('currentUser') || undefined
        }
      });
      setFoodItems(response.data);
    } catch (error) { console.error("Error fetching food:", error); }
  };

    //user's saved opportunities
  const fetchSaved = async () => {
    try {
        const response = await axios.get('http://localhost:5001/api/saved', {
            params: { username: localStorage.getItem('currentUser') }
        });
        setSavedItems(response.data);
    } catch (error) { console.error("Error fetching saved:", error); }
  };

  useEffect(() => { if (token) { fetchFood(); fetchSaved(); } }, [token, mealFilter, costFilter]);

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5001/api/signup', { username, password, role });
      setMessage("User created! You can now login.");
      setUsername(''); setPassword('');
    } catch (error) { setMessage(error.response?.data?.error || 'Signup failed'); }
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
    } catch (error) { setMessage(error.response?.data?.error || 'Login failed'); }
  };

  const handleLogout = () => {
    setToken(''); setUserRole('');
    localStorage.clear();
    setMessage("Logged out.");
  };

  const handleSaveFood = async (e) => {
    e.preventDefault();
    const currentUsername = localStorage.getItem('currentUser');
    try {
      if (editingId) {
        await axios.put(`http://localhost:5001/api/food-opportunities/${editingId}`, foodData);
      } else {
        await axios.post('http://localhost:5001/api/food-opportunities', { ...foodData, username: currentUsername });
      }
      setEditingId(null);
      setFoodData({ name: '', description: '', date: '', cost: '', mealPeriod: 'Lunch', locationName: CAMPUS_LOCATIONS[0].name, rsvpCapacity: '' });
      fetchFood();
      setMessage("Saved successfully!");
    } catch (error) { setMessage('Operation failed'); }
  };

  const startEdit = (item) => {
    setEditingId(item.opp_id);
    setFoodData({
      name: item.opp_name,
      description: item.opp_description,
      date: item.opp_date.split('T')[0],
      cost: item.cost,
      mealPeriod: item.meal_period_name,
      locationName: item.location_name || CAMPUS_LOCATIONS[0].name,
      rsvpCapacity: item.rsvp_capacity ?? ''
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this listing?")) {
      try {
        await axios.delete(`http://localhost:5001/api/food-opportunities/${id}`);
        fetchFood();
      } catch (error) { setMessage("Failed to delete."); }
    }
  };

  const handleRsvp = async (oppId) => {
    try {
      await axios.post('http://localhost:5001/api/rsvp', {
        username: localStorage.getItem('currentUser'),
        opp_id: oppId
      });
      setMessage('RSVP confirmed!');
      fetchFood();
    } catch (err) {
      setMessage(err.response?.data?.error || 'RSVP failed');
    }
  };

  const handleCancelRsvp = async (oppId) => {
    try {
      await axios.delete('http://localhost:5001/api/rsvp', {
        data: { username: localStorage.getItem('currentUser'), opp_id: oppId }
      });
      setMessage('RSVP cancelled.');
      fetchFood();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Cancel failed');
    }
  };



  return (
    <div style={{ padding: '30px', textAlign: 'center', fontFamily: 'Arial', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <h1><span style={{ color: '#2774AE' }}>Bruin</span><span style={{ color: '#FFD100' }}>Eats</span></h1>
      
      {!token ? (
        <div style={{ border: '1px solid #ccc', padding: '20px', backgroundColor: 'white', borderRadius: '8px', maxWidth: '400px', margin: 'auto' }}>
          <h2 style={{ color: 'black' }}>Sign Up / Login</h2>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ display: 'block', margin: '10px auto', padding: '10px', width: '85%' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ display: 'block', margin: '10px auto', padding: '10px', width: '85%' }} />
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '8px', marginBottom: '10px' }}>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
          </select>
          <br/>
          <button onClick={handleSignup} style={{ margin: '5px', padding: '10px' }}>Sign Up</button>
          <button onClick={handleLogin} style={{ margin: '5px', padding: '10px', backgroundColor: '#0073e6', color: 'white' }}>Login</button>
        </div>
      ) : (
        <div style={{ maxWidth: '900px', margin: 'auto' }}>
          <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Welcome, <strong>{localStorage.getItem('currentUser')}</strong> ({userRole})</span>
            <button onClick={handleLogout} style={{ backgroundColor: '#f44336', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px' }}>Logout</button>
          </div>

          {userRole === 'vendor' && (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <h3>{editingId ? "Edit" : "Post"} Food Opportunity</h3>
              <form onSubmit={handleSaveFood}>
                <input type="text" placeholder="Name" value={foodData.name} required onChange={(e) => setFoodData({...foodData, name: e.target.value})} style={{ margin: '5px', padding: '8px', width: '40%' }} />
                <input type="number" placeholder="Cost" value={foodData.cost} required onChange={(e) => setFoodData({...foodData, cost: e.target.value})} style={{ margin: '5px', padding: '8px', width: '40%' }} />
                <select value={foodData.locationName} onChange={(e) => setFoodData({...foodData, locationName: e.target.value})} style={{ margin: '5px', padding: '8px', width: '85%' }}>
                    {CAMPUS_LOCATIONS.map(loc => <option key={loc.name} value={loc.name}>{loc.name}</option>)}
                </select>
                <textarea placeholder="Description" value={foodData.description} onChange={(e) => setFoodData({...foodData, description: e.target.value})} style={{ display: 'block', margin: '10px auto', width: '85%', height: '60px', padding: '8px' }} />
                <input type="date" value={foodData.date} required onChange={(e) => setFoodData({...foodData, date: e.target.value})} style={{ margin: '5px', padding: '8px' }} />
                <select value={foodData.mealPeriod} onChange={(e) => setFoodData({...foodData, mealPeriod: e.target.value})} style={{ padding: '8px' }}>
                  <option value="Breakfast">Breakfast</option><option value="Lunch">Lunch</option><option value="Dinner">Dinner</option>
                </select>
                <input type="number" min="1" placeholder="RSVP capacity (leave blank for unlimited)" value={foodData.rsvpCapacity} onChange={(e) => setFoodData({...foodData, rsvpCapacity: e.target.value})} style={{ display: 'block', margin: '10px auto', padding: '8px', width: '85%' }} />
                <div style={{ marginTop: '15px' }}>
                    <button type="submit" style={{ backgroundColor: '#4CAF50', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px' }}>{editingId ? "Update Post" : "Post Food"}</button>
                    {editingId && <button type="button" onClick={() => setEditingId(null)} style={{ marginLeft: '10px' }}>Cancel</button>}
                </div>
              </form>
            </div>
          )}

          {/* Map Section */}
          <div style={{ height: '400px', width: '100%', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc' }}>
            <MapContainer center={[34.0705, -118.4450]} zoom={14.5} minZoom={14.25} style={{ height: '100%', width: '100%' }}>              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {foodItems.map((item) => {
                const loc = CAMPUS_LOCATIONS.find(l => l.name === item.location_name);
                const isEditing = editingId === item.opp_id;
                const locationToUse = isEditing 
                  ? CAMPUS_LOCATIONS.find(l => l.name === foodData.locationName) 
                  : loc;
                return locationToUse ? (
                  <Marker key={item.opp_id} position={[locationToUse.lat, locationToUse.lng]}>
                    <Popup><strong>{item.opp_name}</strong><br />{item.meal_period_name} - ${item.cost}</Popup>
                  </Marker>
                ) : null;
              })}
            </MapContainer>
          </div>

          {/* Filters Section */}
          <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <label>Meal: <select value={mealFilter} onChange={(e) => setMealFilter(e.target.value)}><option value="All">All</option><option value="Breakfast">Breakfast</option><option value="Lunch">Lunch</option><option value="Dinner">Dinner</option></select></label>
            <label>Max $: <input type="number" value={costFilter} onChange={(e) => setCostFilter(e.target.value)} style={{ width: '60px' }}/></label>
          </div>

          {/* Listings Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {foodItems.map((item) => (
              <div key={item.opp_id} style={{ background: 'white', padding: '15px', borderRadius: '8px', textAlign: 'left', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#0073e6', margin: '0' }}>{item.opp_name}</h3>
                <p style={{ margin: '5px 0' }}>📍 {item.location_name}</p>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>{item.opp_description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>{item.meal_period_name}</span>
                    <span style={{ color: '#27ae60' }}>${item.cost}</span>
                </div>
                {/* ownership check */}
                {localStorage.getItem('currentUser') === item.creator_username && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                    <button onClick={() => startEdit(item)} style={{ flex: 1 }}>Edit</button>
                    <button onClick={() => handleDelete(item.opp_id)} style={{ flex: 1, color: 'red' }}>Delete</button>
                  </div>
                )}
                {/* RSVP block (story 10) */}
                {(() => {
                  const cap = item.rsvp_capacity;
                  const count = item.rsvp_count || 0;
                  const seatsLeft = cap === null || cap === undefined ? null : cap - count;
                  const isFull = seatsLeft !== null && seatsLeft <= 0;
                  return (
                    <div style={{ marginTop: '10px' }}>
                      <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#555' }}>
                        {cap === null || cap === undefined
                          ? `${count} RSVPed`
                          : `${count} / ${cap} RSVPed${isFull ? ' — Full' : ` (${seatsLeft} left)`}`}
                      </p>
                      {item.user_has_rsvped ? (
                        <button onClick={() => handleCancelRsvp(item.opp_id)} style={{ width: '100%', backgroundColor: '#e67e22', color: 'white', padding: '8px', border: 'none', borderRadius: '4px' }}>Cancel RSVP</button>
                      ) : (
                        <button onClick={() => handleRsvp(item.opp_id)} disabled={isFull} style={{ width: '100%', backgroundColor: isFull ? '#bbb' : '#2774AE', color: 'white', padding: '8px', border: 'none', borderRadius: '4px', cursor: isFull ? 'not-allowed' : 'pointer' }}>{isFull ? 'Full' : 'RSVP'}</button>
                      )}
                    </div>
                  );
                })()}
                <button onClick={async () => {
                  try {
                      await axios.post('http://localhost:5001/api/saved', {
                          username: localStorage.getItem('currentUser'),
                          opp_id: item.opp_id
                      });
                      setMessage('Saved to your schedule!');
                      fetchSaved();
                  } catch (err) {
                      setMessage(err.response?.data?.error || 'Failed to save');
                  }
                }} style={{ marginTop: '10px', width: '100%' }}>Save to Schedule</button>
              </div>
            ))}
          </div>
            <div style={{ marginTop: '30px', background: 'white', padding: '20px', borderRadius: '8px' }}>
              <h3>My Schedule</h3>
              {savedItems.length === 0 ? (
                <p>No opportunities saved yet.</p>
              ) : (
                savedItems.map(item => (
                  <div key={item.opp_id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                    <strong>{item.opp_name}</strong> — {item.meal_period_name} — ${item.cost}
                  </div>
                ))
              )}
            </div>
        </div>
      )}
      {message && <p style={{ marginTop: '20px' }}><strong>{message}</strong></p>}
    </div>
  );
}

export default App;