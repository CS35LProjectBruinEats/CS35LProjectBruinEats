import { useState } from 'react';
import { api } from '../api';

export default function AuthForm({ onAuthSuccess }) {
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const path = mode === 'signup' ? '/signup' : '/login';
            const body = mode === 'signup'
                ? { username, password, role }
                : { username, password };
            const res = await api.post(path, body);
            onAuthSuccess(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'signup' ? 'login' : 'signup');
        setError('');
        setPassword('');
    };

    return (
        <div className="auth-card">
            <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
            <form onSubmit={submit}>
                <label>
                    Username
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        required
                    />
                </label>
                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        required
                    />
                </label>
                {mode === 'signup' && (
                    <fieldset className="role-select">
                        <legend>I am a...</legend>
                        <label className="role-option">
                            <input
                                type="radio"
                                name="role"
                                value="student"
                                checked={role === 'student'}
                                onChange={(e) => setRole(e.target.value)}
                            />
                            <span>UCLA student</span>
                        </label>
                        <label className="role-option">
                            <input
                                type="radio"
                                name="role"
                                value="vendor"
                                checked={role === 'vendor'}
                                onChange={(e) => setRole(e.target.value)}
                            />
                            <span>Food vendor / club</span>
                        </label>
                    </fieldset>
                )}
                <button type="submit" disabled={submitting}>
                    {submitting
                        ? 'Working...'
                        : mode === 'signup' ? 'Sign up' : 'Log in'}
                </button>
            </form>
            <p className="mode-toggle">
                {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
                <button type="button" className="link" onClick={switchMode}>
                    {mode === 'signup' ? 'Log in' : 'Sign up'}
                </button>
            </p>
            {error && <p className="error">{error}</p>}
        </div>
    );
}
