import { useState } from 'react';
import { api, useApi } from '../../api';
import { money } from '../../data/placeholders';
import { dateTime, LoadState, Pager } from '../../components/ui';

const send = (path, method, body) => api(path, { method, body: JSON.stringify(body) });
const optionalNumber = value => (value === '' ? null : Number(value));
const optionalDate = value => (value ? new Date(value).toISOString() : null);
// datetime-local needs local time without a zone.
const localInput = value => (value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

function describe(coupon) {
  if (coupon.type === 'FIXED') return `${money(coupon.value)} off`;
  return `${coupon.value}% off${coupon.maxDiscount ? `, up to ${money(coupon.maxDiscount)}` : ''}`;
}

function period(coupon) {
  if (!coupon.startsAt && !coupon.expiresAt) return 'No time limit';
  return [coupon.startsAt && `From ${dateTime(coupon.startsAt)}`, coupon.expiresAt && `until ${dateTime(coupon.expiresAt)}`].filter(Boolean).join(' ');
}

export default function AdminCoupons() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [type, setType] = useState('PERCENT');
  const [error, setError] = useState('');
  const { data, pagination, loading, error: loadError, reload } = useApi(`/admin/coupons?page=${page}&limit=20`);

  async function run(work) {
    setError('');
    try { await work(); reload(); return true; } catch (err) { setError(err.message); return false; }
  }

  function edit(coupon) {
    setEditing(coupon);
    setType(coupon?.type || 'PERCENT');
  }

  async function save(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    const body = {
      type: form.get('type'),
      value: Number(form.get('value')),
      minSubtotal: Number(form.get('minSubtotal') || 0),
      maxDiscount: form.get('type') === 'PERCENT' ? optionalNumber(form.get('maxDiscount')) : null,
      usageLimit: optionalNumber(form.get('usageLimit')),
      startsAt: optionalDate(form.get('startsAt')),
      expiresAt: optionalDate(form.get('expiresAt')),
    };
    const saved = await run(() => (editing
      ? send(`/admin/coupons/${editing._id}`, 'PATCH', body)
      : send('/admin/coupons', 'POST', { ...body, code: form.get('code') })));
    if (saved) {
      edit(null);
      target.reset();
    }
  }

  return <>
    <h1>Discount codes</h1>
    {error && <p className="message error" role="alert">{error}</p>}
    <form className="stack payment-box" onSubmit={save} key={editing?._id || 'new'}>
      <h2>{editing ? `Edit ${editing.code}` : 'Create a code'}</h2>
      {!editing && <label>Code<input name="code" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_\-]+" title="Letters, numbers, hyphens and underscores" /></label>}
      <label>Discount type
        <select name="type" value={type} onChange={event => setType(event.target.value)}>
          <option value="PERCENT">Percentage</option>
          <option value="FIXED">Fixed amount</option>
        </select>
      </label>
      <label>{type === 'PERCENT' ? 'Percentage off' : 'Amount off in VND'}<input name="value" type="number" required min="1" max={type === 'PERCENT' ? 100 : undefined} step="1" defaultValue={editing?.value} /></label>
      {type === 'PERCENT' && <label>Largest discount in VND (optional)<input name="maxDiscount" type="number" min="1" step="1" defaultValue={editing?.maxDiscount ?? ''} /></label>}
      <label>Minimum subtotal in VND<input name="minSubtotal" type="number" min="0" step="1" defaultValue={editing?.minSubtotal ?? 0} /></label>
      <label>Total uses allowed (optional)<input name="usageLimit" type="number" min="1" step="1" defaultValue={editing?.usageLimit ?? ''} /></label>
      <label>Starts (optional)<input name="startsAt" type="datetime-local" defaultValue={localInput(editing?.startsAt)} /></label>
      <label>Ends (optional)<input name="expiresAt" type="datetime-local" defaultValue={localInput(editing?.expiresAt)} /></label>
      <p>Each customer can use a code once. Cancelling an order returns the use.</p>
      <div className="button-row">
        <button className="action" type="submit">{editing ? 'Save code' : 'Create code'}</button>
        {editing && <button className="action outline" type="button" onClick={() => edit(null)}>Close</button>}
      </div>
    </form>
    <LoadState loading={loading} error={loadError} reload={reload} empty={data && !data.length && 'No discount codes yet. Create the first one above.'}>
      <div className="table-responsive"><table className="table align-middle">
        <thead><tr><th scope="col">Code</th><th scope="col">Discount</th><th scope="col">Minimum</th><th scope="col">Used</th><th scope="col">Period</th><th scope="col">State</th><th scope="col">Actions</th></tr></thead>
        <tbody>{data?.map(coupon => <tr key={coupon._id}>
          <td>{coupon.code}</td>
          <td>{describe(coupon)}</td>
          <td>{money(coupon.minSubtotal)}</td>
          <td>{coupon.usedCount}{coupon.usageLimit ? ` of ${coupon.usageLimit}` : ''}</td>
          <td>{period(coupon)}</td>
          <td>{coupon.isActive ? 'On' : 'Off'}</td>
          <td className="button-row">
            <button type="button" className="action outline" onClick={() => edit(coupon)}>Edit</button>
            <button type="button" className="action outline" onClick={() => run(() => send(`/admin/coupons/${coupon._id}`, 'PATCH', { isActive: !coupon.isActive }))}>{coupon.isActive ? 'Turn off' : 'Turn on'}</button>
          </td>
        </tr>)}</tbody>
      </table></div>
      <Pager page={page} pages={pagination?.pages} onChange={setPage} />
    </LoadState>
  </>;
}
