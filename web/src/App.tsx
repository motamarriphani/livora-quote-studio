import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { SignIn, useClerk, useUser } from '@clerk/clerk-react';
import { Authenticated, AuthLoading, Unauthenticated, useConvexConnectionState, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { seedCatalog } from './lib/defaults';
import { initials } from './lib/format';
import { MenuCtx } from './ui';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Builder } from './pages/Builder';
import { SamplePreview } from './pages/Preview';
import { RateCard, Specifications, DefaultTerms } from './pages/Catalog';
import { Trash } from './pages/Trash';

export function App() {
  return (
    <>
      <AuthLoading><div className="boot">Loading…</div></AuthLoading>
      <Unauthenticated><Login /></Unauthenticated>
      <Authenticated><Onboarded /></Authenticated>
    </>
  );
}

function Login() {
  return (
    <div className="login-overlay">
      <div className="login-wrap">
        <div className="login-brand">
          <div className="brand-mark">L</div>
          <div>
            <div className="brand-name light">LIVORA <span>Interiors</span></div>
            <div className="brand-sub">Quote Studio</div>
          </div>
        </div>
        <SignIn routing="hash" appearance={{ variables: { colorPrimary: '#a05a2c', borderRadius: '10px' } }} />
      </div>
    </div>
  );
}

/** First login creates the company + seeds the catalog; every later login just finds it. */
function Onboarded() {
  const ensureCompany = useMutation(api.company.ensureCompany);
  const [state, setState] = useState<'pending' | 'ready' | 'error'>('pending');
  useEffect(() => {
    let live = true;
    ensureCompany({ name: 'LIVORA Interiors', slug: 'livora', seed: seedCatalog() })
      .then(() => live && setState('ready'))
      .catch((e) => { console.error(e); if (live) setState('error'); });
    return () => { live = false; };
  }, [ensureCompany]);
  if (state === 'pending') return <div className="boot">Opening your workspace…</div>;
  if (state === 'error') {
    return (
      <div className="boot">
        <div>Couldn’t open your workspace. Check your connection.</div>
        <button className="btn primary" onClick={() => location.reload()}>Try again</button>
      </div>
    );
  }
  return <Shell />;
}

function Shell() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  return (
    <MenuCtx.Provider value={() => setOpen(true)}>
    <div id="shell" className={open ? 'side-open' : ''}>
      <Sidebar />
      <div id="sideBackdrop" onClick={() => setOpen(false)} />
      <main id="main">
        <ConnectionBanner />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/quotes/:id" element={<Builder />} />
          <Route path="/quotes/:id/preview" element={<Builder preview />} />
          <Route path="/sample" element={<SamplePreview />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/catalog/rates" element={<RateCard />} />
          <Route path="/catalog/specifications" element={<Specifications />} />
          <Route path="/catalog/terms" element={<DefaultTerms />} />
          <Route path="/trash" element={<Trash />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
    </MenuCtx.Provider>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { pathname } = useLocation();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.primaryEmailAddress?.emailAddress || 'Designer';
  // "Quotes" stays highlighted inside a quote (but not on the blank new-quote screen).
  const inQuote = pathname.startsWith('/quotes/') && !pathname.startsWith('/quotes/new');
  const item = (to: string, icon: string, label: string) => (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => 'side-item' + (isActive || (to === '/' && inQuote) ? ' active' : '')}>
      <span className="side-ico">{icon}</span>{label}
    </NavLink>
  );
  return (
    <aside id="sidebar">
      <div className="side-brand">
        <div className="brand-mark">L</div>
        <div>
          <div className="brand-name">LIVORA <span>Interiors</span></div>
          <div className="brand-sub">Quote Studio</div>
        </div>
      </div>
      <button className="btn primary side-new" onClick={() => navigate('/quotes/new')}>＋ New quote</button>
      <nav className="side-nav">
        {item('/', '📋', 'Quotes')}
        {item('/clients', '👥', 'Clients')}
        <div className="side-label">Catalog</div>
        {item('/catalog/rates', '📏', 'Rate card')}
        {item('/catalog/specifications', '🧱', 'Specifications')}
        {item('/catalog/terms', '📜', 'Default terms')}
        <div className="side-label">More</div>
        {item('/sample', '🧪', 'Sample quote')}
        {item('/trash', '🗑', 'Deleted quotes')}
      </nav>
      <div className="side-profile">
        <div className="profile-avatar">
          {user?.imageUrl ? <img src={user.imageUrl} alt="" /> : initials(name)}
        </div>
        <div className="profile-meta">
          <div className="profile-name">{name}</div>
          <div className="profile-email">{user?.primaryEmailAddress?.emailAddress}</div>
        </div>
        <button className="icon-btn" title="Sign out" aria-label="Sign out" onClick={() => signOut()}>⎋</button>
      </div>
    </aside>
  );
}

/** Online-only app: say so plainly when the connection drops. */
function ConnectionBanner() {
  const { isWebSocketConnected, hasEverConnected } = useConvexConnectionState();
  if (isWebSocketConnected || !hasEverConnected) return null;
  return (
    <div className="sync-banner" role="status">
      <b>No connection — reconnecting…</b>
      Changes you make now are sent as soon as the connection is back. Keep this page open until it reconnects.
    </div>
  );
}
