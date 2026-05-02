import { useEffect, useState } from 'react';
import { api } from '../api';

const formatDateTime = (iso) =>
    new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

const formatCost = (cost) => {
    const n = Number(cost);
    return n === 0 ? 'Free' : `$${n.toFixed(2)}`;
};

export default function OpportunityList({ refreshKey }) {
    const [state, setState] = useState({ status: 'loading', items: [], error: '' });

    useEffect(() => {
        let cancelled = false;
        api.get('/opportunities')
            .then((res) => {
                if (cancelled) return;
                setState({
                    status: 'ready',
                    items: res.data.opportunities || [],
                    error: '',
                });
            })
            .catch((err) => {
                if (cancelled) return;
                setState({
                    status: 'error',
                    items: [],
                    error: err.response?.data?.error || 'Could not load opportunities',
                });
            });
        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    if (state.status === 'loading') {
        return <p className="muted">Loading opportunities...</p>;
    }
    if (state.status === 'error') {
        return <p className="error">{state.error}</p>;
    }
    if (state.items.length === 0) {
        return <p className="muted">No food opportunities posted yet. Be the first!</p>;
    }

    return (
        <ul className="opportunity-list">
            {state.items.map((o) => (
                <li key={o.id} className="opportunity-card">
                    <div className="card-header">
                        <h4>{o.title}</h4>
                        <span className="cost-badge">{formatCost(o.cost)}</span>
                    </div>
                    <p className="meta">
                        <span>{o.location}</span>
                        <span aria-hidden="true"> · </span>
                        <span>
                            {formatDateTime(o.start_time)} — {formatDateTime(o.end_time)}
                        </span>
                    </p>
                    {o.organization && (
                        <p>
                            <strong>Hosted by:</strong> {o.organization}
                        </p>
                    )}
                    {o.food_items && (
                        <p>
                            <strong>Served:</strong> {o.food_items}
                        </p>
                    )}
                    {o.description && <p className="description">{o.description}</p>}
                    <p className="poster">
                        Posted by {o.posted_by} ({o.posted_by_role})
                    </p>
                </li>
            ))}
        </ul>
    );
}
