import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setStatus('Saving your message…');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please try again.');
      setStatus(`Message saved. Reference: ${result.id}`);
      form.reset();
    } catch (error) {
      setStatus(error.message || 'We could not save your message. Please try again.');
    } finally { setBusy(false); }
  }
  return <main>
    <header><a className="brand" href="/">Fieldnote<span> / example</span></a><a href="/contact">Contact</a></header>
    <section className="intro"><p className="eyebrow">REACT FRONTEND + FORM API</p><h1>A place for your<br/>next conversation.</h1><p className="lede">A small contact page with a separate backend. Submit a sample message to see the complete request flow.</p>
      <div className="flow"><span>React form</span><span aria-hidden="true">→</span><span>Private API</span><span aria-hidden="true">→</span><span>Saved message</span></div>
      <p className="note">This is a demonstration. Use fictional details. Messages are stored on a persistent volume; no email is sent.</p>
    </section>
    <section className="card" aria-labelledby="contact-title"><p className="eyebrow">GET IN TOUCH</p><h2 id="contact-title">Send a sample message</h2><form onSubmit={submit}>
      <label>Name<input name="name" required maxLength="100" autoComplete="name" placeholder="Alex Example"/></label>
      <label>Email<input name="email" type="email" required maxLength="254" autoComplete="email" placeholder="alex@example.com"/></label>
      <label>Message<textarea name="message" required minLength="10" maxLength="2000" rows="4" placeholder="Tell us what you're working on."/></label>
      <label className="trap" aria-hidden="true">Leave empty<input name="website" tabIndex="-1" autoComplete="off"/></label>
      <button disabled={busy}>{busy ? 'Saving…' : 'Save message'}<span aria-hidden="true">↗</span></button>
      <p className="result" role="status">{status || 'The API validates each submission before saving it.'}</p>
    </form></section>
    <footer>Built with React. Deployed as two services on Railway.</footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
