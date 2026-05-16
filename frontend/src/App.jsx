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
    const [editing, setEditing] = useState(null);

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
        setEditing(null);
        setStatusMessage('Logged out.');
    };

    const handleSaved = (_opportunity, { isEdit } = {}) => {
        setRefreshKey((k) => k + 1);
        setEditing(null);
        setStatusMessage(isEdit ? 'Opportunity updated!' : 'Opportunity posted!');
    };

    const handleEdit = (opportunity) => {
        setEditing(opportunity);
        setStatusMessage('');
    };

    const handleCancelEdit = () => {
        setEditing(null);
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
                <main
                    className={`dashboard${user.role === 'vendor' ? '' : ' dashboard--single'}`}
                >
                    {user.role === 'vendor' && (
                        <section className="post-section">
                            <OpportunityForm
                                key={editing?.id ?? 'new'}
                                opportunity={editing}
                                onSaved={handleSaved}
                                onCancel={handleCancelEdit}
                            />
                        </section>
                    )}
                    <section className="browse-section">
                        <h2>All opportunities</h2>
                        <OpportunityList
                            refreshKey={refreshKey}
                            currentUserId={user.role === 'vendor' ? user.id : null}
                            editingId={editing?.id ?? null}
                            onEdit={handleEdit}
                        />
                    </section>
                </main>
            )}
        </div>
    );
}
