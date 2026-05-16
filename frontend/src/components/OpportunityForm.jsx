import { useState } from 'react';
import { api } from '../api';

const blank = {
    title: '',
    organization: '',
    location: '',
    start_time: '',
    end_time: '',
    food_items: '',
    cost: '',
    description: '',
};

const toDatetimeLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromOpportunity = (o) => ({
    title: o.title ?? '',
    organization: o.organization ?? '',
    location: o.location ?? '',
    start_time: toDatetimeLocal(o.start_time),
    end_time: toDatetimeLocal(o.end_time),
    food_items: o.food_items ?? '',
    cost: o.cost === null || o.cost === undefined ? '' : String(o.cost),
    description: o.description ?? '',
});

export default function OpportunityForm({ opportunity, onSaved, onCancel }) {
    const isEdit = Boolean(opportunity);
    const [fields, setFields] = useState(() =>
        opportunity ? fromOpportunity(opportunity) : blank
    );
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
            const res = isEdit
                ? await api.put(`/opportunities/${opportunity.id}`, payload)
                : await api.post('/opportunities', payload);
            if (!isEdit) setFields(blank);
            onSaved?.(res.data.opportunity, { isEdit });
        } catch (err) {
            const fallback = isEdit
                ? 'Could not save changes'
                : 'Could not post opportunity';
            setError(err.response?.data?.error || fallback);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="opportunity-form" onSubmit={submit}>
            <h3>{isEdit ? 'Edit opportunity' : 'Post a food opportunity'}</h3>

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

            <div className="form-actions">
                <button type="submit" disabled={submitting}>
                    {submitting
                        ? isEdit ? 'Saving...' : 'Posting...'
                        : isEdit ? 'Save changes' : 'Post opportunity'}
                </button>
                {isEdit && (
                    <button
                        type="button"
                        className="secondary"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                )}
            </div>
            {error && <p className="error">{error}</p>}
        </form>
    );
}
