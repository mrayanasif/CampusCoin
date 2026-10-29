import React from 'react';
import './Footer.css';
import { Logo } from '../common/Logo';
import { Icon } from '../common/Icons';

export const Footer = () => {
  return (
    <footer className="footer-wrapper">
      <div className="container">
        {/* Main 4-Column Grid */}
        <div className="footer-grid">
          {/* Col 1: Brand Info & Socials */}
          <div className="footer-col brand-col">
            <div className="footer-logo-wrap">
              <Logo size="large" showSubtitle />
            </div>
            <p className="footer-mission-text">
              The student-first money cockpit designed to track allowances, crush monthly budgets, and build healthy spending habits without the bank-bro jargon.
            </p>
            <div className="footer-socials-row">
              <a href="#" className="footer-social-btn" aria-label="Telegram Student Channel">
                <Icon name="send" size={16} />
              </a>
              <a href="#" className="footer-social-btn" aria-label="Twitter / X">
                <Icon name="twitter" size={16} />
              </a>
              <a href="#" className="footer-social-btn" aria-label="Instagram">
                <Icon name="instagram" size={16} />
              </a>
              <a href="#" className="footer-social-btn" aria-label="GitHub Repository">
                <Icon name="github" size={16} />
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Platform</h4>
            <ul className="footer-links-list">
              <li><a href="#features">Zero-Bank Features</a></li>
              <li><a href="#services">Student Wallet & Ledger</a></li>
              <li><a href="#simulator">Allowance Simulator</a></li>
              <li><a href="#clubs">Campus Clubs & Events</a></li>
              <li><a href="#stories">Student Reviews</a></li>
            </ul>
          </div>

          {/* Col 3: Campus Network */}
          <div className="footer-col">
            <h4 className="footer-col-title">Campus Network</h4>
            <ul className="footer-contact-list">
              <li className="footer-contact-item">
                <Icon name="mail" size={15} />
                <span>support@campuscoin.org</span>
              </li>
              <li className="footer-contact-item">
                <Icon name="send" size={15} />
                <span>@CampusCoinStudentBot</span>
              </li>
              <li className="footer-contact-item">
                <Icon name="mapPin" size={15} />
                <span> DHA Campus, Karachi</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Quick Launch CTAs */}
          <div className="footer-col">
            <h4 className="footer-col-title">Launch Cockpit</h4>
            <div className="footer-cta-stack">
              <a href="#get-started" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                <Icon name="arrowRight" size={16} />
                <span>Open Web Platform</span>
              </a>
              <a href="#simulator" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                <Icon name="calculator" size={16} />
                <span>Interactive Calculator</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Sub-Footer Bar */}
        <div className="footer-bottom-bar">
          <div className="footer-legal-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Student Data Guarantee</a>
            <a href="#">Campus Code of Conduct</a>
            <a href="#">Phase 1 Architecture Plan</a>
          </div>
          <div className="footer-copyright">
            © 2026 Campus Coin. Configured for PKR. Built for students, by students.
          </div>
        </div>
      </div>
    </footer>
  );
};
