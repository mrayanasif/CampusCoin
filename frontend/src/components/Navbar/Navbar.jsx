import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import './Navbar.css';
import { Logo } from '../common/Logo';
import { Icon } from '../common/Icons';

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
      // Clear the local session even when the API is unavailable.
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
    if (hashIndex === -1) return;

    event.preventDefault();
    const targetId = to.slice(hashIndex + 1);
    const scrollToTarget = () => {
      requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(scrollToTarget, 0);
    } else {
      window.history.replaceState(null, '', `/#${targetId}`);
      scrollToTarget();
    }
  };

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'About Us', to: '/#features' },
    { label: 'Portfolio', to: '/#services' },
    { label: 'Sitemap', to: '/#faq' },
    { label: 'Contact Us', to: '/#get-started' },
  ];

  return (
    <header className="navbar-sticky">
      <div className="container navbar-container">
        {/* Left: Brand Logo */}
        <div className="navbar-brand-wrapper">
          <Link to="/" className="navbar-brand-link" onClick={() => setMobileMenuOpen(false)}>
            <Logo size="medium" />
          </Link>
        </div>

        {/* Center: Desktop Navigation Links (Unified, Clean Spacing) */}
        <nav className="navbar-desktop-nav" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <Link key={link.label} to={link.to} className="nav-link" onClick={(event) => handleNavClick(event, link.to)}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Theme Toggle, Currency Toggle, Auth, CTA & Mobile Hamburger */}
        <div className="navbar-actions-wrapper">
          {/* Theme Switcher Pill */}
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

          {/* Currency Switcher Pill */}
          <button
            type="button"
            className="currency-toggle-btn"
            onClick={onToggleCurrency}
            title="Toggle display currency (PKR / USD)"
          >
            <Icon name="globe" size={15} />
            <span>{currency === 'PKR' ? 'PKR ₨' : 'USD $'}</span>
          </button>

          {/* Login Link (Desktop) */}
          {authenticated ? (
            <button type="button" className="nav-link nav-login-link desktop-only nav-logout-btn" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Logging out…' : 'Log Out'}
            </button>
          ) : (
            <Link to="/login" className="nav-link nav-login-link desktop-only">
              Log In
            </Link>
          )}

          {/* Primary CTA */}
          <Link to={authenticated ? dashboardPath : '/register'} className="btn btn-primary btn-sm nav-cta-btn">
            <span>{authenticated ? 'Dashboard' : 'Get Campus Coin'}</span>
            {!authenticated && <Icon name="arrowRight" size={14} />}
          </Link>

          {/* Mobile Menu Hamburger Button */}
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

      {/* Mobile Menu Drawer */}
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
