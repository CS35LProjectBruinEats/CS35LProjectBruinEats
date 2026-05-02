import { useState } from 'react';
import { api } from '../api';

const initial = {
    title: '',
    organization: '',
    location: '',
    start_time: '',
    end_time: '',
    food_items: '',
    cost: '',
    description: '',
};

export default function OpportunityForm({ onCreated }) {
    const [fields, setFields] = useState(initial);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const update = (key) => (e) =>
        setFields((f) => ({ ...f, [key]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const payload = {
                ...fields,
                cost: fields.cost === '' ? 0 : Number(fields.cost),
            };
            const res = await api.post('/opportunities', payload);
            setFields(initial);
            onCreated?.(res.data.opportunity);
        } catch (err) {
            setError(err.response?.data?.error || 'Could not post opportunity');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="opportunity-form" onSubmit={submit}>
            <h3>Post a food opportunity</h3>

            <label>
                Title*
                <input
                    type="text"
                    value={fields.title}
                    onChange={update('title')}
                    placeholder="Free pizza at Bruin Walk"
                    required
                />
            </label>

            <label>
                Organization (club / vendor)
                <input
                    type="text"
                    value={fields.organization}
                    onChange={update('organization')}
                    placeholder="e.g. ASUCLA, ACM, Bruin Cafe"
                />
            </label>

            <label>
                Location*
                <input
                    type="text"
                    value={fields.location}
                    onChange={update('location')}
                    placeholder="Bruin Walk, Powell Library, Kerckhoff..."
                    required
                />
            </label>

            <div className="row">
                <label>
                    Starts*
                    <input
                        type="datetime-local"
                        value={fields.start_time}
                        onChange={update('start_time')}
                        required
                    />
                </label>
                <label>
                    Ends*
                    <input
                        type="datetime-local"
                        value={fields.end_time}
                        onChange={update('end_time')}
                        required
                    />
                </label>
            </div>

            <label>
                What's being served
                <textarea
                    value={fields.food_items}
                    onChange={update('food_items')}
                    rows="2"
                    placeholder="Pizza, salad, drinks..."
                />
            </label>

            <label>
                Cost (USD, leave blank or 0 if free)
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fields.cost}
                    onChange={update('cost')}
                    placeholder="0"
                />
            </label>

            <label>
                Description
                <textarea
                    value={fields.description}
                    onChange={update('description')}
                    rows="3"
                    placeholder="Optional details — flyer info, RSVP rules, etc."
                />
            </label>

            <button type="submit" disabled={submitting}>
                {submitting ? 'Posting...' : 'Post opportunity'}
            </button>
            {error && <p className="error">{error}</p>}
        </form>
    );
}
