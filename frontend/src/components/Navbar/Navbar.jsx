import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import './Navbar.css';
import { Icon } from '../common/Icons';
import techLogo from '../../assets/images/tech.png'; 

export const Navbar = ({ currency, onToggleCurrency, theme = 'light', onToggleTheme }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem('token')));
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardPath = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').role === 'admin'
        ? '/admin/dashboard'
        : '/dashboard';
    } catch {
      return '/dashboard';
    }
  })();

  useEffect(() => {
    const syncAuth = () => setAuthenticated(Boolean(localStorage.getItem('token')));
    syncAuth();
    window.addEventListener('storage', syncAuth);
    window.addEventListener('campuscoin:auth-changed', syncAuth);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('campuscoin:auth-changed', syncAuth);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setMobileMenuOpen(false);
    try {
      await API.post('/auth/logout');
    } catch {
    
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthenticated(false);
    window.dispatchEvent(new Event('campuscoin:auth-changed'));
    toast.success('Logged out');
    setLoggingOut(false);
    if (location.pathname !== '/') navigate('/');
  };

  const handleNavClick = (event, to) => {
    setMobileMenuOpen(false);
    const hashIndex = to.indexOf('#');
    if (hashIndex === -1) {
      if (to === '/') {
        event.preventDefault();
        navigate('/', { replace: location.pathname === '/' });
        window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
      }
      return;
    }

    event.preventDefault();
    const targetId = to.slice(hashIndex + 1);
    const scrollToTarget = () => {
      requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    navigate(`/#${targetId}`, { replace: location.pathname === '/' });
    window.setTimeout(scrollToTarget, 0);
  };

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'About Us', to: '/#features' },
    { label: 'Portfolio', to: '/#services' },
    { label: 'Budget Simulator', to: '/#simulator' },
    { label: 'Contact Us', to: '/#get-started' },
  ];

  return (
    <header className="navbar-sticky">
      <div className="container navbar-container">
        <div className="navbar-brand-wrapper">
          <Link
            to="/"
            className="navbar-brand-link"
            onClick={(event) => handleNavClick(event, '/')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              textDecoration: 'none', 
              color: 'var(--text-primary, #0a0a0a)' 
            }}
          >
            <img 
              src={techLogo} 
              alt="Campus Coin Logo" 
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }} 
            />
            <span style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '-0.2px' }}>
              Campus Coin
            </span>
          </Link>
        </div>


        <nav className="navbar-desktop-nav" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <Link key={link.label} to={link.to} className="nav-link" onClick={(event) => handleNavClick(event, link.to)}>
              {link.label}
            </Link>
          ))}
        </nav>


        <div className="navbar-actions-wrapper">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
            <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>


          <button
            type="button"
            className="currency-toggle-btn"
            onClick={onToggleCurrency}
            title="Toggle display currency (PKR / USD)"
          >
            <Icon name="globe" size={15} />
            <span>{currency === 'PKR' ? 'PKR ₨' : 'USD $'}</span>
          </button>


          {authenticated ? (
            <button type="button" className="nav-link nav-login-link desktop-only nav-logout-btn" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Logging out…' : 'Log Out'}
            </button>
          ) : (
            <Link to="/login" className="nav-link nav-login-link desktop-only">
              Log In
            </Link>
          )}


          <Link to={authenticated ? dashboardPath : '/register'} className="btn btn-primary btn-sm nav-cta-btn">
            <span>{authenticated ? 'Dashboard' : 'Get Campus Coin'}</span>
            {!authenticated && <Icon name="arrowRight" size={14} />}
          </Link>


          <button
            type="button"
            className="navbar-icon-btn mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <Icon name={mobileMenuOpen ? 'x' : 'menu'} size={22} />
          </button>
        </div>
      </div>


      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <nav className="mobile-nav-list">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="mobile-nav-link"
                onClick={(event) => handleNavClick(event, link.to)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mobile-nav-actions">
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  className="currency-toggle-btn"
                  onClick={onToggleCurrency}
                  style={{ flex: 1, justifyContent: 'center' }}
                  title="Toggle display currency (PKR / USD)"
                >
                  <Icon name="globe" size={15} />
                  <span>{currency === 'PKR' ? 'PKR ₨' : 'USD $'}</span>
                </button>
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={onToggleTheme}
                  style={{ flex: 1, justifyContent: 'center' }}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
              {authenticated ? (
                <>
                  <button type="button" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout} disabled={loggingOut}>
                    <span>{loggingOut ? 'Logging out…' : 'Log Out'}</span>
                  </button>
                  <Link to={dashboardPath} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMobileMenuOpen(false)}>
                    <span>Dashboard</span>
                    <Icon name="arrowRight" size={15} />
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMobileMenuOpen(false)}>
                    <span>Log In</span>
                  </Link>
                  <Link to="/register" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMobileMenuOpen(false)}>
                    <span>Launch Student App</span>
                    <Icon name="arrowRight" size={15} />
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;