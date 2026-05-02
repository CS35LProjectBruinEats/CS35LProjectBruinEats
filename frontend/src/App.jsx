import { useEffect, useState } from 'react';
import AuthForm from './components/AuthForm';
import OpportunityForm from './components/OpportunityForm';
import OpportunityList from './components/OpportunityList';
import './App.css';

const loadStoredUser = () => {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export default function App() {
    const [user, setUser] = useState(loadStoredUser);
    const [refreshKey, setRefreshKey] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');

    const handleAuthSuccess = ({ token, user: nextUser, message }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(nextUser));
        setUser(nextUser);
        setStatusMessage(message || '');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setStatusMessage('Logged out.');
    };

    const handleOpportunityCreated = () => {
        setRefreshKey((k) => k + 1);
        setStatusMessage('Opportunity posted!');
    };

    useEffect(() => {
        if (!statusMessage) return undefined;
        const t = setTimeout(() => setStatusMessage(''), 3000);
        return () => clearTimeout(t);
    }, [statusMessage]);

    return (
        <div className="app">
            <header className="app-header">
                <h1>UCLA Food Opportunities</h1>
                {user && (
                    <div className="user-bar">
                        <span>
                            Hi, <strong>{user.username}</strong>{' '}
                            <em className="role-tag">{user.role}</em>
                        </span>
                        <button type="button" onClick={handleLogout}>
                            Log out
                        </button>
                    </div>
                )}
            </header>

            {statusMessage && <p className="status">{statusMessage}</p>}

            {!user ? (
                <AuthForm onAuthSuccess={handleAuthSuccess} />
            ) : (
                <main className="dashboard">
                    <section className="post-section">
                        <OpportunityForm onCreated={handleOpportunityCreated} />
                    </section>
                    <section className="browse-section">
                        <h2>All opportunities</h2>
                        <OpportunityList refreshKey={refreshKey} />
                    </section>
                </main>
            )}
        </div>
    );
}
