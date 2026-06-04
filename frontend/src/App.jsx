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

// Send the stored JWT on every request so the API can authenticate the user.
const storedToken = localStorage.getItem('token');
if (storedToken) axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

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
  { name: 'Centennial Hall (The Hill)', lat: 34.0729, lng: -118.4538}
  
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

  // Food Data State
  const [foodItems, setFoodItems] = useState([]);
  const [foodData, setFoodData] = useState({
    name: '', description: '', date: '', cost: '', mealPeriod: 'Lunch',
    locationName: CAMPUS_LOCATIONS[0].name, rsvpCapacity: ''
  });

  // Comments State (story 11)
  const [comments, setComments] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentErrors, setCommentErrors] = useState({});

  // UI State
  const [editingId, setEditingId] = useState(null);
  const [mealFilter, setMealFilter] = useState('All');
  const [costFilter, setCostFilter] = useState('');

  const jumpToElement = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth'});
    }
  }

  /*
  const setAndJumpToMessage = (msg) => {
    setMessage(msg);
    jumpToElement("msg");
  }
  */

  //updates food opportunities and applies filters
  const fetchFood = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/food-opportunities', {
        params: {
          meal: mealFilter,
          maxCost: costFilter
        }
      });
      setFoodItems(response.data);
    } catch (error) { console.error("Error fetching food:", error); }
  };

  //updates user's schedule (saved opportunities)
  const fetchSaved = async () => {
    try {
        const response = await axios.get('http://localhost:5001/api/saved');
        setSavedItems(response.data);
    } catch (error) { console.error("Error fetching saved:", error); }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/comments');
      setComments(response.data);
    } catch (error) { console.error("Error fetching comments:", error); }
  };

  const handlePostComment = async (oppId) => {
    const text = commentDrafts[oppId] || '';
    if (text.trim() === '') {
      setCommentErrors({ ...commentErrors, [oppId]: 'Comment is empty' });
      return;
    }
    try {
      await axios.post('http://localhost:5001/api/comments', {
        opp_id: oppId,
        text
      });
      setCommentDrafts({ ...commentDrafts, [oppId]: '' });
      setCommentErrors({ ...commentErrors, [oppId]: '' });
      fetchComments();
    } catch (err) {
      setCommentErrors({ ...commentErrors, [oppId]: err.response?.data?.error || 'Failed to post comment' });
    }
  };

  useEffect(() => { if (token) { fetchFood(); fetchSaved(); fetchComments(); } }, [token, mealFilter, costFilter]);

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
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      localStorage.setItem('currentUser', user.username);
      localStorage.setItem('userRole', user.role);
      setMessage("Login successful!");
    } catch (error) { setMessage(error.response?.data?.error || 'Login failed'); }
  };

  const handleLogout = () => {
    setToken(''); setUserRole('');
    delete axios.defaults.headers.common['Authorization'];
    localStorage.clear();
    setMessage("Logged out.");
  };

  const handleSaveFood = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`http://localhost:5001/api/food-opportunities/${editingId}`, foodData);
      } else {
        await axios.post('http://localhost:5001/api/food-opportunities', foodData);
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
        fetchSaved();
      } catch (error) { setMessage("Failed to delete."); }
    }
  };

  {/*
    GenAI prompt: complete this handler function that is called when you click the "save to schedule" button.
    const handleSaveSchedule = async (opp_id) => {
    try {
        await axios.post('http://localhost:5001/api/saved', {
            //todo
        });
        setMessage('Saved to your schedule!');
        fetchSaved();
    } catch (err) {
        //todo
    }
    };

    GenAI response:
    const handleSaveSchedule = async (opp_id) => {
    try {
        await axios.post('http://localhost:5001/api/saved', {
            username: localStorage.getItem('currentUser'),
            opp_id: opp_id
        });
        setMessage('Saved to your schedule!');
        fetchSaved();
    } catch (err) {
        setMessage(err.response?.data?.error || 'Failed to save');
    }
    };

    Reflection: 
    the "username ..." line gets the current user so that the backend knows which user_id is saving the opportunity.
    the "opp_id" line sends the id of the opporutnity being saved. Together, the backend can use these to make a pair to add to the database.
    The error block uses chaining using ? to display the error message.
    Overall, these features are exactly what this function needed to be complete, so I used them.
    */}
  const handleSaveSchedule = async (opp_id) => {
    try {
        await axios.post('http://localhost:5001/api/saved', {
            opp_id: opp_id
        });
        setMessage('Saved to your schedule!');
        fetchSaved();
    } catch (err) {
        setMessage(err.response?.data?.error || 'Failed to save');
    }
  };

  {/*
    GenAI prompt: complete this handler function that is called when you click the "remove" button to remove an opporutnity from personal schedule. 
    const handleDeleteSchedule = async (opp_id) => {
    try {
        await axios.delete('http://localhost:5001/api/saved', {
            //todo
        });
        fetchSaved();
    } catch (err) {
        setMessage('Failed to remove');
    }
    };

    GenAI response:
    const handleDeleteSchedule = async (opp_id) => {
    try {
        await axios.delete('http://localhost:5001/api/saved', {
            data: { username: localStorage.getItem('currentUser'), opp_id: opp_id }
        });
        fetchSaved();
    } catch (err) {
        setMessage('Failed to remove');
    }
    };

    Reflection: 
    The AI added the request body to send to the bakcend for me, since I wasn't sure on the syntax for this.
    It sends two components - the user who is deleting the opportunity, and the id of the opportunity being deleted, since these make up the pair that must be removed from the table in the database.
    I still didn't understand why it has to be wrapped in "data: ", as the previous handle functions above that I was trying to go off of did not have this. Upon further research, I found that it is because delete requests are formatted a bit differently than post requests, which are what I was trying to go off of.
    */}
  const handleDeleteSchedule = async (opp_id) => {
    try {
        await axios.delete('http://localhost:5001/api/saved', {
            data: { opp_id: opp_id }
        });
        fetchSaved();
    } catch (err) {
        setMessage('Failed to remove');
    }
  };

  const handleRsvp = async (oppId) => {
    try {
      await axios.post('http://localhost:5001/api/rsvp', {
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
        data: { opp_id: oppId }
      });
      setMessage('RSVP cancelled.');
      fetchFood();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Cancel failed');
    }
  };

  const computeOffset = (index, loc) => {
    const randDirection = Math.floor(Math.random() * (4));
    let lat, lng;
    const offset = 0.00018;

    if(randDirection == 0) {
      lat = loc.lat + (index * offset);
      lng = loc.lng + (index * offset);
    }
    else if(randDirection == 1) {
      lat = loc.lat - (index * offset);
      lng = loc.lng + (index * offset);
    }
    else if(randDirection == 2) {
      lat = loc.lat + (index * offset);
      lng = loc.lng - (index * offset);
    }
    else if(randDirection == 3) {
      lat = loc.lat - (index * offset);
      lng = loc.lng - (index * offset);
    }

    return [lat, lng];
  }

  {/*
    GenAI prompt: write me a helper function applyOffset that can slightly offset the latitude and longitude coordinates at a particular map location.
    GenAI response:
    const getOffsetPosition = (items, currentItem, loc) => {
      const sameLocation = items.filter(i => i.location_name === currentItem.location_name);
      const index = sameLocation.findIndex(i => i.opp_id === currentItem.opp_id);
      const offset = 0.0002;
      return [
          loc.lat + (index * offset),
          loc.lng + (index * offset)
      ];
    };

    Reflection: This helper function uses a filter to get all the opportunities that are at the same location. Then, it increases the latitude and longitude by a small offset for each.
    The overall logic for this was solid, except I didn't like that the only option was to increase lat and lng, so after a while the pin would be quite far away from the actual building on the map.
    To work around this, I added a helper function getOffset (see above) that uses a random number generator to decide whether to increase or decrease the latitude and longitude. That way, the opportunities are better clustered around the actual building rather than stretching out linearly.
    I also experimentally decreased offset to 0.00018 because I found this to be the best separation.
    */}
  const offsetLocation = (items, currentItem, loc) => {
    const sameLocation = items.filter(i => i.location_name === currentItem.location_name);
    const index = sameLocation.findIndex(i => i.opp_id === currentItem.opp_id);
    
    const [lat, lng] = computeOffset(index, loc);
    return [lat, lng];
  }

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
              <h3 id="post_edit_foodopp">{editingId ? "Edit" : "Post"} Food Opportunity</h3>
              <form onSubmit={handleSaveFood}>
                <input type="text" placeholder="Name" value={foodData.name} required onChange={(e) => setFoodData({...foodData, name: e.target.value})} style={{ margin: '5px', padding: '8px', width: '40%' }} />
                <input type="number" min="0" step = "any" placeholder="Cost" value={foodData.cost} required onChange={(e) => setFoodData({...foodData, cost: e.target.value})} style={{ margin: '5px', padding: '8px', width: '40%' }} />
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
                {/* GenAI Prompt: we are having a glitch where when you edit a food opportunity, it disappears from the map. how can i fix this?
                  GenAI response: 
                  The issue is in the startEdit function. When you click edit, it sets editingId which causes a re-render, but the item disappears from the map because the location_name field isn't being matched correctly.
                  Look at this line in startEdit:
                  javascriptlocationName: item.location_name || CAMPUS_LOCATIONS[0].name
                  The problem is that when you save with handleSaveFood, the updated item might not have location_name returned correctly from the backend, so after saving fetchFood() gets data where location_name is null, and the map filter:
                  javascriptconst loc = CAMPUS_LOCATIONS.find(l => l.name === item.location_name);
                  return loc ? (...)  : null;
                  returns null and hides the marker.
                  The fix is to make the map show items even while being edited by excluding the editing item from the disappearing logic:
                  javascript{foodItems.map((item) => {
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
                  This way while editing, it uses the current foodData.locationName from the form instead of the stale data.

                  Reflection: 
                  I didn't realize that the item is disappearing from the map because clicking the edit button re-renders the map and hides the item that has been editing in this re-render.
                  The AI's proposed solution is to check whether the location is/has been edited through the const locationToUse. If an edit has been made, then this const is assigned to the location that is being used in the edit form. If not, then the original logic is preserved.
                  After thinking about it further, I decided that this is the best way to proceed since it is the simplest solution I could think of, as it preserves the original logic when edits have not been applied. Adding one new const is probably the minimal change that can be made to factor in the locations of food opportunities that have been edited.
                */}
                const isEditing = editingId === item.opp_id;
                const locationToUse = isEditing 
                  ? CAMPUS_LOCATIONS.find(l => l.name === foodData.locationName) 
                  : loc;
                const position = offsetLocation(foodItems, item, locationToUse);
                return locationToUse ? (
                  <Marker key={item.opp_id} position={position}>
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
                <p style={{ margin: '5px 0' }}>📅 {item.opp_date ? item.opp_date.split('T')[0] : 'No date'}</p>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>{item.opp_description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>{item.meal_period_name}</span>
                    <span style={{ color: '#27ae60' }}>${item.cost}</span>
                </div>
                {/* ownership check */}
                {localStorage.getItem('currentUser') === item.creator_username && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                    <button onClick={() => {startEdit(item); jumpToElement("post_edit_foodopp")}} style={{ flex: 1, width: '100%', backgroundColor: 'grey', color: 'white', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(item.opp_id)} style={{ flex: 1, color: 'white', width: '100%', backgroundColor: '#D32F2F', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
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
                        <button onClick={() => handleCancelRsvp(item.opp_id)} style={{ width: '100%', backgroundColor: '#e67e22', color: 'white', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel RSVP</button>
                      ) : (
                        <button onClick={() => handleRsvp(item.opp_id)} disabled={isFull} style={{ width: '100%', backgroundColor: isFull ? '#bbb' : '#2774AE', color: 'white', padding: '8px', border: 'none', borderRadius: '4px', cursor: isFull ? 'not-allowed' : 'pointer' }}>{isFull ? 'Full' : 'RSVP'}</button>
                      )}
                    </div>
                  );
                })()}

                {/*
                GenAI prompt: I want the "save to schedule" button to not be visible if the item is already saved. Instead, I want it to say "in schedule". Fill in this line for this:
                {savedItems.filter(saved => saved.opp_id === item.opp_id).length > 0 ? (
                    //todo
                  ) : (
                    <button onClick={() => handleSaveSchedule(item.opp_id)} style={{ marginTop: '10px', width: '100%', backgroundColor: '#15803D', color: 'white', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer'  }}>Save to Schedule</button>
                )}

                GenAI response: 
                {savedItems.filter(saved => saved.opp_id === item.opp_id).length > 0 ? (
                    <p style={{ marginTop: '10px', color: '#4CAF50', fontWeight: 'bold' }}>✓ In Schedule</p>
                ) : (
                    <button onClick={() => handleSaveSchedule(item.opp_id)} style={{ marginTop: '10px', width: '100%', backgroundColor: '#15803D', color: 'white', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save to Schedule</button>
                )}

                Reflection: The AI did a good job generating a nice looking "In schedule" message. I implemented the filter logic myself and just used AI to make sure the "in schedule" option looks pretty.
                
                */}
                {savedItems.filter(saved => saved.opp_id === item.opp_id).length > 0 ? (
                    <p style={{ marginTop: '10px', color: '#4CAF50', fontWeight: 'bold' }}>✓ In Schedule</p>
                  ) : (
                    <button onClick={() => handleSaveSchedule(item.opp_id)} style={{ marginTop: '10px', width: '100%', backgroundColor: '#15803D', color: 'white', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer'  }}>Save to Schedule</button>
                )}

                {/* Comments (story 11) */}
                <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '0.9rem' }}>Comments</p>
                  {comments.filter(c => c.opp_id === item.opp_id).length === 0 ? (
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#888' }}>No comments yet.</p>
                  ) : (
                    comments.filter(c => c.opp_id === item.opp_id).map(c => (
                      <p key={c.comment_id} style={{ margin: '4px 0', fontSize: '0.85rem' }}>
                        <strong>{c.username}:</strong> {c.comment_text}
                      </p>
                    ))
                  )}
                  <div style={{ display: 'flex', gap: '5px', marginTop: '6px' }}>
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentDrafts[item.opp_id] || ''}
                      onChange={(e) => setCommentDrafts({ ...commentDrafts, [item.opp_id]: e.target.value })}
                      style={{ flex: 1, padding: '6px', fontSize: '0.85rem' }}
                    />
                    <button onClick={() => handlePostComment(item.opp_id)} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>Post</button>
                  </div>
                  {commentErrors[item.opp_id] && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'red' }}>{commentErrors[item.opp_id]}</p>
                  )}
                </div>
              </div>
            ))}
          {/* Personal schedule (story 9) */}
          {/*
          GenAI prompt: Complete this schedule section that I have started. I want it to be a list view that includes the opportunity name, the meal period, and the cost, all in one line:
          </div>
            <div style={{ marginTop: '30px', background: 'white', padding: '20px', borderRadius: '8px' }}>
              <h3>My Schedule</h3>
              {savedItems.length === 0 ? (
                <p>No opportunities saved yet.</p>
              ) : (
                savedItems.map(item => (
                
          GenAI reponse: 
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

          Reflection:
          I implemented the schedule title and the conditional logic to display it myself. But I wasn't sure how to display the different attributes in a single line, so I used AI for that part.
          The AI's solution took care of the formatting for me, and it showed me how to separate each attribute. I liked this formatting and decided to use it.
          */}
          {/*
          GenAI prompt: (in continuation to the one above): How do I also add the date? I tried this and it gave me a weird broken formatting:
          <span><strong>{item.opp_name}</strong> — {item.meal_period_name} — ${item.cost} — {item.opp_date}</span>
          The date formatting looked something like this:
          2026-05-27T07:00:00.000Z

          GenAI response: 
          The weird format is because the database stores dates with a timestamp. Use .split('T')[0] to get just the date part:
          <span><strong>{item.opp_name}</strong> — {item.meal_period_name} — ${item.cost} — 📅 {item.opp_date ? item.opp_date.split('T')[0] : 'No date'}</span>

          Reflection:
          This is essentially just a technicality on how the database stores dates. The AI gave me a solution on how to get just the first part in React syntax, which I decided to use. It also included a calender emoji which I thought was cute so I used that too.
          */}
          
          </div>
            <div style={{ marginTop: '30px', background: 'white', padding: '20px', borderRadius: '8px' }}>
              <h3>My Schedule</h3>
              {savedItems.length === 0 ? (
                <p>No opportunities saved yet.</p>
              ) : (
                savedItems.map(item => (
                  <div key={item.opp_id} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><strong>{item.opp_name}</strong> — {item.meal_period_name} — ${item.cost} — 📅 {item.opp_date ? item.opp_date.split('T')[0] : 'No date'}</span>
                    <button onClick={() => handleDeleteSchedule(item.opp_id)} style={{ color: 'white', backgroundColor: '#D32F2F', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
                  </div>
                ))
              )}
            </div>
        </div>
      )}
      {message && <p style={{ marginTop: '20px' }} id="msg"><strong>{message}</strong></p>}
    </div>
  );
}

export default App;