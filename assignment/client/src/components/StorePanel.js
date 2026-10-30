import { useState } from 'react';
import { api, useStore } from '../Store';
import { money } from '../data/placeholders';

export default function StorePanel() {
  const store = useStore();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(work) {
    setBusy(true); setError('');
    try { await work(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function authenticate(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    await run(async () => {
      if (register) await api('/auth/register', { method: 'POST', body: JSON.stringify(fields) });
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: fields.email, password: fields.password }) });
      sessionStorage.setItem('bookstore-token', result.data.token);
      store.setUser(result.data.user); await store.refreshCart(); store.setPanel('cart');
    });
  }
  if (!store.panel) return null;
  return <section className="store-panel container" aria-label={store.panel === 'account' ? 'Account' : 'Shopping cart'}>
    <button type="button" onClick={() => { store.setPanel(''); setError(''); }} className="btn btn-outline-accent">Close</button>
    {error && <p role="alert">{error}</p>}
    {store.panel === 'account' ? <>
      <h2>{store.user ? `Hello, ${store.user.name}` : register ? 'Create account' : 'Sign in'}</h2>
      {store.user ? <button disabled={busy} onClick={() => run(async () => {
        await api('/auth/logout', { method: 'POST' }); sessionStorage.removeItem('bookstore-token'); store.setUser(null); store.setPanel('');
      })}>Sign out</button> : <>
        <form onSubmit={authenticate}>
          {register && <label>Name<input name="name" required autoComplete="name" /></label>}
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          <label>Password<input name="password" type="password" required minLength={register ? 8 : 1} autoComplete={register ? 'new-password' : 'current-password'} /></label>
          <button disabled={busy} type="submit">{busy ? 'Please wait…' : register ? 'Register' : 'Sign in'}</button>
        </form>
        <button type="button" onClick={() => setRegister(value => !value)}>{register ? 'Already have an account? Sign in' : 'Create account'}</button>
      </>}
    </> : <>
      <h2>Shopping cart</h2>
      {!store.user ? <button onClick={() => store.setPanel('account')}>Sign in to view your cart</button> : <>
        {!store.cart.items.length && <p>Your cart is empty.</p>}
        {store.cart.items.map((item, index) => <div className="cart-row" key={item.book?._id || index}>
          <span>{item.book?.title || 'Book no longer available'} — {money(item.lineTotal)}{!item.available && ' — Unavailable'}</span>
          {item.book && <>
            <label>Quantity<input type="number" min="1" step="1" value={item.quantity} disabled={busy} onChange={event => {
              const quantity = Number(event.target.value);
              if (!Number.isSafeInteger(quantity) || quantity < 1) return;
              run(async () => { await api(`/cart/items/${item.book._id}`, { method: 'PUT', body: JSON.stringify({ quantity }) }); await store.refreshCart(); });
            }} /></label>
            <button disabled={busy} onClick={() => run(async () => { await api(`/cart/items/${item.book._id}`, { method: 'DELETE' }); await store.refreshCart(); })}>Remove</button>
          </>}
        </div>)}
        <p>Subtotal: {money(store.cart.subtotal)}</p>
      </>}
    </>}
  </section>;
}
