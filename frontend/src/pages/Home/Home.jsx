import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/common/Icons';
import { CoinMark } from '../../components/common/Logo';
import Navbar from '../../components/Navbar/Navbar';
import { Footer } from '../../components/Footer/Footer';
import { useCurrency } from '../../context/CurrencyContext';
import campusFriendsImage from '../../assets/images/campus-friends.png';
import './Home.css';

const Hero = ({ currency = 'PKR' }) => {
  const [activePhoneTab, setActivePhoneTab] = useState('overview'); // 'overview' | 'expenses' | 'goals'

  // Dynamic currency formatted values
  const balance = currency === 'PKR' ? '₨ 38,450' : '$ 138.50';
  const allowanceAdded = currency === 'PKR' ? '+₨ 15,000' : '+$ 55.00';
  const foodSpend = currency === 'PKR' ? '₨ 420' : '$ 1.50';
  const bookSpend = currency === 'PKR' ? '₨ 2,800' : '$ 10.00';
  const gigIncome = currency === 'PKR' ? '+₨ 12,000' : '+$ 43.00';
  const streakSaved = currency === 'PKR' ? '₨ 5,400' : '$ 19.50';

  return (
    <section className="hero-section">
      {/* Background radial glow */}
      <div className="hero-glow-sphere" />

      <div className="container hero-content-wrapper">
        {/* Editorial Pill */}
        <div className="hero-badge-container">
          <span className="pill-badge pill-badge-lime animate-pulse-lime">
            <CoinMark size={16} />
            <span>STUDENT FINANCIAL COCKPIT</span>
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="hero-headline">
          FINANCIAL TECHNOLOGIES<br />
          <span className="hero-headline-highlight">FOR LIMITLESS OPPORTUNITIES</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-description">
          The student-first money cockpit designed to simplify monthly allowance tracking, crush hostel budgets, and accelerate real savings — 100% private, web-based, and without bank logins or app installs.
        </p>

        {/* Action Buttons */}
        <div className="hero-cta-group">
          <a href="#get-started" className="btn btn-primary btn-lg">
            <Icon name="arrowRight" size={18} />
            <span>Launch Web App</span>
          </a>
          <a href="#simulator" className="btn btn-secondary btn-lg">
            <Icon name="calculator" size={18} />
            <span>Interactive Simulator</span>
          </a>
        </div>
      </div>

      {/* Phone Mockup & Giant Background Typography */}
      <div className="hero-visual-container">
        {/* Giant Watermark Text (like SWAPSTER in reference) */}
        <div className="hero-watermark-text" aria-hidden="true">
          CAMPUS COIN
        </div>

        {/* Floating Badges */}
        <div className="floating-hero-badge left-badge desktop-only animate-float">
          <div className="floating-badge-icon">
            <Icon name="shieldCheck" size={18} color="#10B981" />
          </div>
          <div>
            <div className="floating-badge-title">Zero Bank Linking</div>
            <div className="floating-badge-subtitle">100% Manual & Student Safe</div>
          </div>
        </div>

        <div className="floating-hero-badge right-badge desktop-only animate-float" style={{ animationDelay: '1.8s' }}>
          <div className="floating-badge-icon" style={{ backgroundColor: 'var(--brand-lime-light)' }}>
            <CoinMark size={18} />
          </div>
          <div>
            <div className="floating-badge-title">Configured for {currency}</div>
            <div className="floating-badge-subtitle">Budget & Envelope Controls</div>
          </div>
        </div>

        {/* Phone Mockup Frame */}
        <div className="phone-mockup-wrapper">
          <div className="phone-device-bezel">
            {/* Dynamic Island / Speaker */}
            <div className="phone-dynamic-island">
              <div className="phone-camera-lens" />
            </div>

            {/* Simulated Phone Screen */}
            <div className="phone-screen-content">
              {/* Phone Header */}
              <div className="phone-top-bar">
                <div className="phone-student-profile">
                  <div className="phone-avatar">ZK</div>
                  <div>
                    <div className="phone-student-name">Zayan Khan</div>
                    <div className="phone-student-tag">FAST-NUCES '26 • CS</div>
                  </div>
                </div>
                <div className="phone-header-actions">
                  <div className="phone-status-pill">Fall '26</div>
                  <div className="phone-bell-icon">
                    <Icon name="bell" size={16} />
                    <span className="phone-bell-dot" />
                  </div>
                </div>
              </div>

              {/* Total Balance Card */}
              <div className="phone-balance-hero">
                <div className="phone-balance-label">Current Student Balance</div>
                <div className="phone-balance-value">{balance}</div>
                <div className="phone-balance-sub">
                  <span className="phone-badge-green">{allowanceAdded}</span>
                  <span style={{ color: '#94A3B8', fontSize: '11px' }}>Monthly allowance active</span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="phone-quick-actions">
                <button type="button" className="phone-action-btn" onClick={() => setActivePhoneTab('expenses')}>
                  <div className="phone-action-icon">
                    <Icon name="arrowUp" size={17} />
                  </div>
                  <span>Log Spend</span>
                </button>
                <button type="button" className="phone-action-btn" onClick={() => setActivePhoneTab('overview')}>
                  <div className="phone-action-icon">
                    <Icon name="arrowDown" size={17} />
                  </div>
                  <span>Add Cash</span>
                </button>
                <button type="button" className="phone-action-btn" onClick={() => setActivePhoneTab('goals')}>
                  <div className="phone-action-icon">
                    <Icon name="arrowLeftRight" size={17} />
                  </div>
                  <span>Split Bill</span>
                </button>
                <button type="button" className="phone-action-btn" onClick={() => setActivePhoneTab('overview')}>
                  <div className="phone-action-icon">
                    <Icon name="moreHorizontal" size={17} />
                  </div>
                  <span>Envelopes</span>
                </button>
              </div>

              {/* Mini Interactive Switcher Inside Phone */}
              <div className="phone-tab-pills">
                <button
                  type="button"
                  className={`phone-tab-pill ${activePhoneTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActivePhoneTab('overview')}
                >
                  Activity
                </button>
                <button
                  type="button"
                  className={`phone-tab-pill ${activePhoneTab === 'expenses' ? 'active' : ''}`}
                  onClick={() => setActivePhoneTab('expenses')}
                >
                  Budget Limits
                </button>
                <button
                  type="button"
                  className={`phone-tab-pill ${activePhoneTab === 'goals' ? 'active' : ''}`}
                  onClick={() => setActivePhoneTab('goals')}
                >
                  Savings Goal
                </button>
              </div>

              {/* Tab 1: Activity */}
              {activePhoneTab === 'overview' && (
                <div className="phone-items-list">
                  <div className="phone-list-item">
                    <div className="phone-item-avatar" style={{ backgroundColor: '#FFEDD5', color: '#EA580C' }}>
                      <Icon name="coffee" size={16} />
                    </div>
                    <div className="phone-item-info">
                      <div className="phone-item-title">Campus Cafe & Chai</div>
                      <div className="phone-item-meta">Cafeteria • 1:15 PM</div>
                    </div>
                    <div className="phone-item-amount negative">-{foodSpend}</div>
                  </div>

                  <div className="phone-list-item">
                    <div className="phone-item-avatar" style={{ backgroundColor: '#E0E7FF', color: '#4F46E5' }}>
                      <Icon name="book" size={16} />
                    </div>
                    <div className="phone-item-info">
                      <div className="phone-item-title">Data Structures Lab Print</div>
                      <div className="phone-item-meta">Academic Books & Prep</div>
                    </div>
                    <div className="phone-item-amount negative">-{bookSpend}</div>
                  </div>

                  <div className="phone-list-item">
                    <div className="phone-item-avatar" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
                      <Icon name="trendingUp" size={16} />
                    </div>
                    <div className="phone-item-info">
                      <div className="phone-item-title">Web Dev Tutoring Gig</div>
                      <div className="phone-item-meta">Side Income • Direct</div>
                    </div>
                    <div className="phone-item-amount positive">{gigIncome}</div>
                  </div>
                </div>
              )}

              {/* Tab 2: Budget Limits */}
              {activePhoneTab === 'expenses' && (
                <div className="phone-budget-breakdown">
                  <div className="phone-budget-bar-card">
                    <div className="phone-budget-header">
                      <span>Hostel & Mess Food</span>
                      <span className="phone-budget-percent">68% used</span>
                    </div>
                    <div className="phone-progress-track">
                      <div className="phone-progress-fill" style={{ width: '68%', backgroundColor: '#C7F36B' }} />
                    </div>
                    <div className="phone-budget-footer">
                      <span>Spent: {currency === 'PKR' ? '₨ 12,240' : '$ 44.00'}</span>
                      <span>Limit: {currency === 'PKR' ? '₨ 18,000' : '$ 65.00'}</span>
                    </div>
                  </div>

                  <div className="phone-budget-bar-card">
                    <div className="phone-budget-header">
                      <span>Transit & Metro</span>
                      <span className="phone-budget-percent">42% used</span>
                    </div>
                    <div className="phone-progress-track">
                      <div className="phone-progress-fill" style={{ width: '42%', backgroundColor: '#38BDF8' }} />
                    </div>
                    <div className="phone-budget-footer">
                      <span>Spent: {currency === 'PKR' ? '₨ 3,360' : '$ 12.00'}</span>
                      <span>Limit: {currency === 'PKR' ? '₨ 8,000' : '$ 28.50'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Goals */}
              {activePhoneTab === 'goals' && (
                <div className="phone-goal-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>Primary Semester Target</span>
                    <span style={{ fontSize: '11px', background: 'rgba(199, 243, 107, 0.2)', color: '#C7F36B', padding: '2px 8px', borderRadius: '12px' }}>On Track</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#FFF' }}>MacBook Air M2 Fund</div>
                  <div style={{ fontSize: '12px', color: '#C7F36B', margin: '4px 0 10px 0' }}>
                    {currency === 'PKR' ? '₨ 68,000 of ₨ 180,000 saved' : '$ 245 of $ 650 saved'}
                  </div>
                  <div className="phone-progress-track">
                    <div className="phone-progress-fill" style={{ width: '38%', backgroundColor: '#C7F36B' }} />
                  </div>
                </div>
              )}

              {/* Savings Streak Callout (modeled after Swapster's referral banner) */}
              <div className="phone-streak-banner">
                <div className="phone-streak-content">
                  <div className="phone-streak-title">
                    <span>14-Day Chai & Snack Discipline</span>
                  </div>
                  <p className="phone-streak-desc">
                    Streak intact! You've stashed approximately {streakSaved} this month towards your goal.
                  </p>
                </div>
                <div className="phone-streak-icon">
                  <Icon name="gift" size={18} color="#C7F36B" />
                </div>
              </div>

              {/* Simulated Phone Bottom Nav */}
              <div className="phone-bottom-nav">
                <button type="button" className="phone-nav-icon active">
                  <Icon name="home" size={20} color="#FFFFFF" />
                </button>
                <button type="button" className="phone-nav-icon">
                  <Icon name="barChart2" size={20} color="#64748B" />
                </button>
                <button type="button" className="phone-nav-icon">
                  <Icon name="wallet" size={20} color="#64748B" />
                </button>
                <button type="button" className="phone-nav-icon">
                  <Icon name="user" size={20} color="#64748B" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CampusToolsSection = () => (
  <section className="campus-tools-section" aria-labelledby="campus-tools-title">
    <div className="campus-tools-inner">
      <div className="campus-tools-copy">
        <div className="campus-tools-eyebrow">
          <Icon name="sparkles" size={16} />
          <span>Campus banking revolution</span>
        </div>
        <h2 id="campus-tools-title">
          Save time. Stay updated.
          <span>Do it all with free digital tools.</span>
        </h2>
        <p className="campus-tools-description">
          Safe, simple, and smart campus finance management — designed specifically for modern students.
        </p>
        <div className="campus-tools-actions">
          <a href="#features" className="campus-tools-cta">
            Explore Features <Icon name="arrowRight" size={18} />
          </a>
          <div className="campus-tools-community">
            <div className="campus-tools-avatars" aria-hidden="true">
              <span>AS</span><span>MK</span><span>ZA</span>
            </div>
            <span>Joined by 10k+ Students</span>
          </div>
        </div>
      </div>

      <div className="campus-tools-visual">
        <img src={campusFriendsImage} alt="University friends enjoying time together by the sea" data-scroll-parallax />
        <div className="campus-tools-float-card campus-tools-cashback">
          <span className="campus-tools-card-icon cashback-icon"><Icon name="trendingUp" size={18} /></span>
          <span>Student Cashback</span><strong>Up to 5% Back</strong>
        </div>
        <div className="campus-tools-float-card campus-tools-free">
          <span className="campus-tools-card-icon free-icon"><Icon name="check" size={18} /></span>
          <span>Account Maintenance</span><strong>100% Free Forever</strong>
        </div>
      </div>
    </div>
  </section>
);

const Stats = ({ currency = 'PKR' }) => {
  const statsData = [
    {
      value: '45K+',
      labelTop: 'Active Student',
      labelBottom: 'Users',
    },
    {
      value: currency === 'PKR' ? '₨ 180M+' : '$ 650K+',
      labelTop: 'Student Expenses',
      labelBottom: 'Tracked',
    },
    {
      value: '94%',
      labelTop: 'Semester Budget',
      labelBottom: 'Adherence Rate',
    },
    {
      value: '40+',
      labelTop: 'University',
      labelBottom: 'Campuses',
    },
  ];

  return (
    <section className="stats-section">
      <div className="container">
        {/* Pill Label */}
        <div className="section-pill-center">
          <span className="pill-badge pill-badge-emerald">
            <Icon name="barChart" size={15} />
            <span>Campus Coin in Numbers</span>
          </span>
        </div>

        {/* Section Heading */}
        <h2 className="stats-heading">
          Valued by a growing student community,<br />
          strengthened by every semester
        </h2>

        {/* 4-Column Stat Grid with dividers */}
        <div className="stats-grid">
          {statsData.map((stat, idx) => (
            <div
              key={stat.labelTop}
              className={`stat-card ${idx !== statsData.length - 1 ? 'has-divider' : ''}`}
            >
              <div className="stat-number">{stat.value}</div>
              <div className="stat-label">
                {stat.labelTop}<br />{stat.labelBottom}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SecurityFeatures = () => {
  return (
    <section className="features-section" id="features">
      <div className="container">
        {/* Section Header */}
        <div className="features-header-split">
          <h2 className="features-main-title">
            Partner you can trust on every semester step
          </h2>
          <div className="features-header-aside">
            <p className="features-aside-desc">
              Data privacy and student autonomy guide our architecture, protecting your allowance privacy and building lasting financial confidence without invasive bank connections.
            </p>
            <a href="#simulator" className="features-learn-more-link">
              <Icon name="arrowUpRight" size={16} />
              <span>LEARN MORE</span>
            </a>
          </div>
        </div>

        {/* 3-Column Bento Cards */}
        <div className="features-cards-grid">
          {/* Card 1: 100% Bank-Free Privacy */}
          <div className="feature-card card-hover-lift">
            <div className="feature-card-content">
              <div className="feature-icon-badge" style={{ backgroundColor: 'var(--brand-lime-light)' }}>
                <Icon name="shieldCheck" size={20} color="var(--pill-lime-text)" />
              </div>
              <h3 className="feature-card-title">Zero Bank Linking</h3>
              <p className="feature-card-desc">
                No bank credentials, no third-party data aggregators. Every transaction is manually controlled by you with zero risk of exposure or unauthorized account access.
              </p>
            </div>

            <div className="feature-graphic-container">
              <div className="abstract-glow-circle" />
              <div className="feature-badge-graphic">
                <div className="privacy-pill">
                  <Icon name="check" size={14} color="#10B981" />
                  <span>No Bank Login Required</span>
                </div>
                <div className="privacy-pill">
                  <Icon name="check" size={14} color="#10B981" />
                  <span>Zero Credentials Stored</span>
                </div>
                <div className="privacy-pill">
                  <Icon name="check" size={14} color="#10B981" />
                  <span>PKR & Cash Friendly</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Student-Grade Encryption */}
          <div className="feature-card card-hover-lift">
            <div className="feature-card-content">
              <div className="feature-icon-badge" style={{ backgroundColor: 'rgba(79, 70, 229, 0.15)' }}>
                <Icon name="shield" size={20} color="#818CF8" />
              </div>
              <h3 className="feature-card-title">Confidential & Scoped</h3>
              <p className="feature-card-desc">
                Every query and balance is strictly scoped to your unique student ID. Your personal finance records remain 100% private to you.
              </p>
            </div>

            {/* Abstract Security Matrix Visualization */}
            <div className="feature-matrix-container">
              <div className="security-matrix-grid">
                {[...Array(16)].map((_, i) => (
                  <div
                    key={i}
                    className={`matrix-dot ${i === 5 || i === 10 ? 'matrix-dot-lime' : ''} ${i === 6 ? 'matrix-dot-emerald' : ''}`}
                  />
                ))}
              </div>
              <div className="matrix-status-text">
                <span className="live-indicator-dot" />
                <span>End-to-End Scoped User Sessions</span>
              </div>
            </div>
          </div>

          {/* Card 3: Semester Guardrails */}
          <div className="feature-card card-hover-lift">
            <div className="feature-card-content">
              <div className="feature-icon-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                <Icon name="sparkles" size={20} color="#F59E0B" />
              </div>
              <h3 className="feature-card-title">Semester Guardrails</h3>
              <p className="feature-card-desc">
                Engineered specifically for student cashflows: hostel mess fee deadlines, mid-term allowances, exam book budgets, and daily chai expenses.
              </p>
            </div>

            <div className="feature-emblem-container">
              <div className="feature-emblem-card">
                <CoinMark size={54} glow />
                <div className="emblem-label">PKR Engine Active</div>
                <div className="emblem-sub">Allowance & Budget Rules</div>
              </div>
            </div>
          </div>
        </div>

        {/* Campus Partner Institutions Strip */}
        <div className="campus-partners-strip">
          <p className="campus-partners-title">
            Already trusted by students across <span style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>top universities & campuses</span>
          </p>
          <div className="campus-badges-row">
            <div className="campus-badge-item">
              <span className="campus-abbr">NUST</span>
              <span className="campus-name">Islamabad</span>
            </div>
            <div className="campus-badge-item">
              <span className="campus-abbr">FAST</span>
              <span className="campus-name">NUCES</span>
            </div>
            <div className="campus-badge-item">
              <span className="campus-abbr">LINCOLIN</span>
              <span className="campus-name">MALAYSIA</span>
            </div>
            <div className="campus-badge-item">
              <span className="campus-abbr">IBA</span>
              <span className="campus-name">Karachi</span>
            </div>
            <div className="campus-badge-item">
              <span className="campus-abbr">MIDDLESEX</span>
              <span className="campus-name">Dubai</span>
            </div>
            <div className="campus-badge-item">
              <span className="campus-abbr">SZABIST</span>
              <span className="campus-name">Karachi</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ServicesBento = ({ currency = 'PKR' }) => {
  return (
    <section className="services-section" id="services">
      <div className="container">
        {/* Section Header */}
        <div className="services-header-center">
          <h2 className="services-main-title">Campus Coin Services</h2>
          <p className="services-subtitle">
            Shaping a stress-free semester without the anxiety of running broke before month-end — traditional cash and digital allowances united in one cockpit.
          </p>
        </div>

        {/* 2 Big Showcase Cards */}
        <div className="services-grid">
          {/* Left: Student Wallet & Ledger (Dark Bento) */}
          <div className="service-card-dark card-hover-lift">
            <div className="dark-card-visual-top">
              {/* Mini App UI preview card */}
              <div className="mini-cockpit-window">
                <div className="mini-window-bar">
                  <div className="mini-dots">
                    <span className="dot dot-red" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                  </div>
                  <span className="mini-title">campuscoin_ledger.app</span>
                </div>
                <div className="mini-window-body">
                  <div className="mini-balance-row">
                    <span className="mini-balance-title">Cash-in-Hand + Digital</span>
                    <span className="mini-balance-amount">{currency === 'PKR' ? '₨ 24,650' : '$ 88.50'}</span>
                  </div>
                  <div className="mini-tags-row">
                    <span className="mini-tag">Daily Budget: {currency === 'PKR' ? '₨ 1,200' : '$ 4.50'}</span>
                    <span className="mini-tag tag-lime">Safe to Spend</span>
                  </div>
                  <div className="mini-bar-visual">
                    <div className="mini-bar-fill" style={{ width: '45%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="dark-card-content-bottom">
              <span className="card-micro-tag">CORE LEDGER</span>
              <h3 className="dark-card-title">Student Wallet & Ledger</h3>
              <p className="dark-card-desc">
                A full-scale manual financial cockpit in your pocket. Record cash spent on campus, track your digital payments, and see your real burn rate in seconds.
              </p>
            </div>
          </div>

          {/* Right: Virtual Budget Envelopes (Light Bento with tilted envelope cards) */}
          <div className="service-card-light card-hover-lift">
            <div className="light-card-visual-top">
              {/* Layered Envelope Mockups (modeled after Swapster's stacked Visa/Mastercard) */}
              <div className="envelope-stack-container">
                {/* Underneath Card: Campus Mess & Food */}
                <div className="envelope-card envelope-underneath">
                  <div className="envelope-header">
                    <div className="envelope-chip" />
                    <span className="envelope-type">CAMPUS FOOD</span>
                  </div>
                  <div className="envelope-balance">
                    {currency === 'PKR' ? '₨ 14,000 / ₨ 18,000' : '$ 50 / $ 65'}
                  </div>
                  <div className="envelope-footer">
                    <span>Active Envelope</span>
                    <span className="envelope-dots">•••• 4242</span>
                  </div>
                </div>

                {/* Overlapping Dark Card: Transport & Fun */}
                <div className="envelope-card envelope-foreground">
                  <div className="envelope-header">
                    <div className="envelope-chip chip-white" />
                    <span className="envelope-type" style={{ color: '#C7F36B' }}>SEMESTER SAVINGS</span>
                  </div>
                  <div className="envelope-balance" style={{ color: '#FFFFFF' }}>
                    {currency === 'PKR' ? '₨ 28,500 Saved' : '$ 102.50 Saved'}
                  </div>
                  <div className="envelope-footer">
                    <span style={{ color: '#94A3B8' }}>Locked Cushion</span>
                    <span className="envelope-dots" style={{ color: '#C7F36B' }}>•••• 8888</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="light-card-content-bottom">
              <span className="card-micro-tag">BUDGET ENVELOPES</span>
              <h3 className="light-card-title">Virtual Student Budgets</h3>
              <p className="light-card-desc">
                Assign money before you spend it. Set realistic envelopes for Hostel Mess, City Commute, Books & Notes, and Weekend Outings with automatic overspend alerts.
              </p>
            </div>
          </div>
        </div>

        {/* Section Punchline */}
        <div className="services-punchline">
          <h3 className="punchline-text">
            One platform to control it all with smarter tools for modern student life
          </h3>
        </div>
      </div>
    </section>
  );
};

const InteractiveCalculator = ({ currency = 'PKR' }) => {
  // Allowance base slider value (in PKR)
  const [allowancePKR, setAllowancePKR] = useState(35000);
  const [livingType, setLivingType] = useState('hostel'); // 'hostel' | 'dayscholar'
  const [strategy, setStrategy] = useState('balanced'); // 'balanced' | 'aggressiveSaver' | 'chill'

  // Conversion rate for display if USD selected
  const rate = currency === 'PKR' ? 1 : 1 / 278;
  const currentAllowance = Math.round(allowancePKR * rate);

  // Strategy allocation percentages
  const allocations = {
    balanced: {
      food: livingType === 'hostel' ? 0.40 : 0.28,
      transit: livingType === 'hostel' ? 0.12 : 0.26,
      academic: 0.15,
      fun: 0.15,
      savings: 0.18,
    },
    aggressiveSaver: {
      food: livingType === 'hostel' ? 0.38 : 0.24,
      transit: livingType === 'hostel' ? 0.10 : 0.22,
      academic: 0.12,
      fun: 0.08,
      savings: 0.32,
    },
    chill: {
      food: livingType === 'hostel' ? 0.45 : 0.32,
      transit: livingType === 'hostel' ? 0.15 : 0.25,
      academic: 0.15,
      fun: 0.20,
      savings: 0.05,
    },
  }[strategy];

  const formatAmount = (portion) => {
    const val = Math.round(currentAllowance * portion);
    return currency === 'PKR' ? `₨ ${val.toLocaleString()}` : `$ ${val.toLocaleString()}`;
  };

  const formatTotal = (val) => {
    return currency === 'PKR' ? `₨ ${val.toLocaleString()}` : `$ ${val.toLocaleString()}`;
  };

  return (
    <section className="calculator-section" id="simulator">
      <div className="container">
        {/* Section Header */}
        <div className="section-pill-center">
          <span className="pill-badge pill-badge-lime">
            <Icon name="calculator" size={15} />
            <span>Interactive Tool</span>
          </span>
        </div>

        <h2 className="calculator-main-title">
          Live Student Allowance & Budget Simulator
        </h2>
        <p className="calculator-subtitle">
          Test your monthly cashflow before the semester starts. Dial in your allowance, select your university routine, and see your optimal envelope breakdown.
        </p>

        {/* Main Interactive Widget */}
        <div className="calculator-card-wrapper card-hover-lift">
          <div className="calculator-grid">
            {/* Left Controls Column */}
            <div className="calculator-controls-panel">
              {/* Allowance Slider */}
              <div className="control-group">
                <div className="control-label-row">
                  <span className="control-label">Monthly Allowance</span>
                  <span className="control-value-highlight">
                    {formatTotal(currentAllowance)}
                  </span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="100000"
                  step="2500"
                  value={allowancePKR}
                  onChange={(e) => setAllowancePKR(Number(e.target.value))}
                  className="allowance-slider"
                />
                <div className="slider-ticks-row">
                  <span>{currency === 'PKR' ? '₨ 10K' : '$ 36'}</span>
                  <span>{currency === 'PKR' ? '₨ 50K' : '$ 180'}</span>
                  <span>{currency === 'PKR' ? '₨ 100K' : '$ 360'}</span>
                </div>
              </div>

              {/* Living Situation Buttons */}
              <div className="control-group">
                <label className="control-label">University Living Setup</label>
                <div className="pill-toggle-group">
                  <button
                    type="button"
                    className={`toggle-option-btn ${livingType === 'hostel' ? 'active' : ''}`}
                    onClick={() => setLivingType('hostel')}
                  >
                    <span>🏢 Hostel Boarder</span>
                  </button>
                  <button
                    type="button"
                    className={`toggle-option-btn ${livingType === 'dayscholar' ? 'active' : ''}`}
                    onClick={() => setLivingType('dayscholar')}
                  >
                    <span>🚗 Day Scholar (Commuter)</span>
                  </button>
                </div>
              </div>

              {/* Saving Strategy */}
              <div className="control-group">
                <label className="control-label">Semester Money Strategy</label>
                <div className="strategy-options-grid">
                  <button
                    type="button"
                    className={`strategy-btn ${strategy === 'balanced' ? 'selected' : ''}`}
                    onClick={() => setStrategy('balanced')}
                  >
                    <div className="strategy-btn-title">Balanced Life</div>
                    <div className="strategy-btn-sub">Healthy balance of chai, food & saving</div>
                  </button>
                  <button
                    type="button"
                    className={`strategy-btn ${strategy === 'aggressiveSaver' ? 'selected' : ''}`}
                    onClick={() => setStrategy('aggressiveSaver')}
                  >
                    <div className="strategy-btn-title">Laptop / Goal Hunter</div>
                    <div className="strategy-btn-sub">30%+ stashed into your fund</div>
                  </button>
                  <button
                    type="button"
                    className={`strategy-btn ${strategy === 'chill' ? 'selected' : ''}`}
                    onClick={() => setStrategy('chill')}
                  >
                    <div className="strategy-btn-title">Exam Survival</div>
                    <div className="strategy-btn-sub">High snacks & group hangouts</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Results & Allocation Visualizer */}
            <div className="calculator-results-panel">
              <div className="results-header">
                <div className="results-badge">
                  <CoinMark size={18} />
                  <span>Optimal Semester Distribution</span>
                </div>
                <div className="results-projected-savings">
                  <span className="savings-label">Projected Semester Savings:</span>
                  <span className="savings-val">
                    {formatTotal(Math.round(currentAllowance * allocations.savings * 4))}
                  </span>
                </div>
              </div>

              {/* Stacked Multi-Color Progress Bar */}
              <div className="distribution-stacked-bar">
                <div
                  className="bar-slice slice-food"
                  style={{ width: `${allocations.food * 100}%` }}
                  title={`Food & Mess: ${Math.round(allocations.food * 100)}%`}
                />
                <div
                  className="bar-slice slice-transit"
                  style={{ width: `${allocations.transit * 100}%` }}
                  title={`Transit: ${Math.round(allocations.transit * 100)}%`}
                />
                <div
                  className="bar-slice slice-academic"
                  style={{ width: `${allocations.academic * 100}%` }}
                  title={`Academics: ${Math.round(allocations.academic * 100)}%`}
                />
                <div
                  className="bar-slice slice-fun"
                  style={{ width: `${allocations.fun * 100}%` }}
                  title={`Campus Fun: ${Math.round(allocations.fun * 100)}%`}
                />
                <div
                  className="bar-slice slice-savings"
                  style={{ width: `${allocations.savings * 100}%` }}
                  title={`Savings Cushion: ${Math.round(allocations.savings * 100)}%`}
                />
              </div>

              {/* Envelope Breakdown Rows */}
              <div className="allocation-rows-list">
                <div className="allocation-row">
                  <div className="allocation-info">
                    <span className="legend-indicator dot-food" />
                    <div>
                      <div className="allocation-name">Campus Mess, Cafeteria & Chai</div>
                      <div className="allocation-sub">{(allocations.food * 100).toFixed(0)}% of monthly budget</div>
                    </div>
                  </div>
                  <div className="allocation-val">{formatAmount(allocations.food)}</div>
                </div>

                <div className="allocation-row">
                  <div className="allocation-info">
                    <span className="legend-indicator dot-transit" />
                    <div>
                      <div className="allocation-name">Transit, Speedo, Van & Fuel</div>
                      <div className="allocation-sub">{(allocations.transit * 100).toFixed(0)}% of monthly budget</div>
                    </div>
                  </div>
                  <div className="allocation-val">{formatAmount(allocations.transit)}</div>
                </div>

                <div className="allocation-row">
                  <div className="allocation-info">
                    <span className="legend-indicator dot-academic" />
                    <div>
                      <div className="allocation-name">Books, Stationery & Project Prints</div>
                      <div className="allocation-sub">{(allocations.academic * 100).toFixed(0)}% of monthly budget</div>
                    </div>
                  </div>
                  <div className="allocation-val">{formatAmount(allocations.academic)}</div>
                </div>

                <div className="allocation-row">
                  <div className="allocation-info">
                    <span className="legend-indicator dot-fun" />
                    <div>
                      <div className="allocation-name">Weekend Outings & Campus Hangouts</div>
                      <div className="allocation-sub">{(allocations.fun * 100).toFixed(0)}% of monthly budget</div>
                    </div>
                  </div>
                  <div className="allocation-val">{formatAmount(allocations.fun)}</div>
                </div>

                <div className="allocation-row highlight-savings-row">
                  <div className="allocation-info">
                    <span className="legend-indicator dot-savings" />
                    <div>
                      <div className="allocation-name font-semibold" style={{ color: 'var(--ink-primary)' }}>
                        Emergency & Semester Savings Cushion
                      </div>
                      <div className="allocation-sub">{(allocations.savings * 100).toFixed(0)}% untouched reserve</div>
                    </div>
                  </div>
                  <div className="allocation-val font-bold" style={{ color: 'var(--status-emerald)' }}>
                    {formatAmount(allocations.savings)}
                  </div>
                </div>
              </div>

              {/* Student Insight Tip */}
              <div className="calculator-tip-box">
                <Icon name="sparkles" size={17} color="#2D4A13" />
                <p>
                  <strong>Pro Student Tip:</strong> Setting aside {formatAmount(allocations.savings)} each month protects you from mid-semester broke emergencies and ensures you finish the term ahead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SocietiesSection = ({ currency = 'PKR' }) => {
  return (
    <section className="clubs-section" id="clubs">
      <div className="container">
        {/* Section Pill */}
        <div className="section-pill-center">
          <span className="pill-badge pill-badge-emerald">
            <Icon name="briefcase" size={15} />
            <span>Campus Organizations & Clubs</span>
          </span>
        </div>

        {/* Heading */}
        <div className="clubs-header-center">
          <h2 className="clubs-main-title">
            Keep it all organized with Campus Coin Clubs
          </h2>
          <p className="clubs-subtitle">
            The full toolkit university societies, hackathon committees, and hostel councils need to manage event budgets, ticket collections, and reimbursements with transparent clarity.
          </p>
          <div style={{ marginTop: '24px' }}>
            <a href="#get-started" className="btn btn-primary">
              <span>Explore Club Solutions</span>
              <Icon name="arrowRight" size={15} />
            </a>
          </div>
        </div>

        {/* 3-Column Bento Showcase (modeled after Swapster's Business UI Grid) */}
        <div className="clubs-showcase-grid">
          {/* Card 1: Active Society Budget */}
          <div className="club-ui-card card-hover-lift">
            <div className="club-card-label">ACTIVE EVENT LEDGER</div>
            <div className="club-project-name">ACM National Hackathon</div>

            <div className="club-card-label" style={{ marginTop: '14px' }}>Allocated Categories</div>
            <div className="club-pills-row">
              <span className="club-category-pill pill-orange">Catering & Chai</span>
              <span className="club-category-pill pill-blue">Shields & Swag</span>
              <span className="club-category-pill pill-emerald">Venue Sound</span>
            </div>

            <div className="club-progress-info">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Allocated Budget</span>
                <span style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>
                  {currency === 'PKR' ? '₨ 350,000' : '$ 1,250'}
                </span>
              </div>
              <div className="mini-progress-track">
                <div className="mini-progress-bar" style={{ width: '64%' }} />
              </div>
            </div>
          </div>

          {/* Card 2: Developer & Society Export Flow (Middle API Showcase) */}
          <div className="club-api-card card-hover-lift">
            <h3 className="api-card-title">Simple Export & Ledger API</h3>
            <p className="api-card-desc">
              Generate transparent audit PDFs, CSV ledgers, and committee expense summaries with a single click.
            </p>

            {/* Code Box */}
            <div className="api-code-terminal">
              <div className="terminal-dots">
                <span className="t-dot dot-red" />
                <span className="t-dot dot-yellow" />
                <span className="t-dot dot-green" />
              </div>
              <pre className="terminal-code">
                <code>
                  <span className="code-keyword">const</span> club = <span className="code-keyword">new</span> <span className="code-func">CampusCoinClub</span>({'{'}<br />
                  &nbsp;&nbsp;society: <span className="code-str">'NUST ACM'</span>,<br />
                  &nbsp;&nbsp;term: <span className="code-str">'Fall 2026'</span>,<br />
                  &nbsp;&nbsp;currency: <span className="code-str">'{currency}'</span><br />
                  {'}'});<br />
                  <span className="code-comment">// Transparent member verification</span>
                </code>
              </pre>
            </div>
          </div>

          {/* Card 3: Society Treasury Status */}
          <div className="club-ui-card card-hover-lift">
            <div className="club-treasury-header">
              <div className="club-avatar-circle">DC</div>
              <div>
                <div className="club-society-name">LUMS Debating Club</div>
                <div className="club-society-url">treasury.lums-debsoc.org</div>
              </div>
            </div>

            <div className="club-card-label">AUDIT STATUS</div>
            <div className="club-status-row">
              <span className="status-badge-text">Committee Approved</span>
              <span className="status-dot-green" />
            </div>

            <div style={{ marginTop: 'auto' }}>
              <button type="button" className="club-action-btn">
                <span>Generate Audit Sheet</span>
                <Icon name="arrowUpRight" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const GrowthEarnSection = ({ currency = 'PKR' }) => {
  return (
    <section className="growth-section">
      <div className="container">
        {/* Section Header */}
        <div className="features-header-split">
          <h2 className="features-main-title">
            Grow your semester cushion powered by Campus Coin
          </h2>
          <div className="features-header-aside">
            <p className="features-aside-desc">
              Transform small daily choices into lasting savings with automated habit insights and friendly envelope tools crafted specifically for student life.
            </p>
            <a href="#simulator" className="features-learn-more-link">
              <Icon name="arrowUpRight" size={16} />
              <span>EXPLORE SAVINGS TOOLS</span>
            </a>
          </div>
        </div>

        {/* 4 Cards Grid (2x2) */}
        <div className="growth-grid">
          {/* Card 1: Goal Envelopes with live goal cards */}
          <div className="growth-card card-hover-lift">
            <div className="growth-card-visual">
              {/* Ticker / Goal Cards (modeled after BTC, AAPL, ETH ticker row in Swapster) */}
              <div className="goal-tickers-row">
                <div className="goal-mini-card">
                  <div className="goal-mini-header">
                    <span className="goal-chip chip-blue">M</span>
                    <span className="goal-name">MacBook</span>
                  </div>
                  <div className="goal-mini-amount">
                    {currency === 'PKR' ? '₨ 78,500' : '$ 280'}
                  </div>
                  <div className="goal-status-positive">+14% pace</div>
                </div>

                <div className="goal-mini-card featured-goal">
                  <div className="goal-mini-header">
                    <span className="goal-chip chip-lime">E</span>
                    <span className="goal-name">Emergency</span>
                  </div>
                  <div className="goal-mini-amount">
                    {currency === 'PKR' ? '₨ 25,000' : '$ 90'}
                  </div>
                  <div className="goal-status-positive">Fund Ready</div>
                  {/* Trajectory SVG line */}
                  <svg className="goal-trajectory-curve" viewBox="0 0 100 35" fill="none">
                    <path d="M 0 30 Q 30 25 50 15 T 100 5" stroke="#C7F36B" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="goal-mini-card">
                  <div className="goal-mini-header">
                    <span className="goal-chip chip-orange">T</span>
                    <span className="goal-name">Trip</span>
                  </div>
                  <div className="goal-mini-amount">
                    {currency === 'PKR' ? '₨ 18,200' : '$ 65'}
                  </div>
                  <div className="goal-status-positive">+65% done</div>
                </div>
              </div>
            </div>

            <div className="growth-card-text">
              <h3 className="growth-card-title">Goal-Driven Envelopes</h3>
              <p className="growth-card-desc">
                Set tangible semester milestones. Whether it's upgrading your laptop, gym dues, or graduation road trips, watch your funds build week by week.
              </p>
            </div>
          </div>

          {/* Card 2: Roommate & Mess Splitter */}
          <div className="growth-card card-hover-lift">
            <div className="growth-card-visual" style={{ justifyContent: 'center' }}>
              <div className="mock-bill-split-box">
                <div className="split-box-header">
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>Hostel Grocery & Chai Run</span>
                  <span className="split-pill">Split 4 Ways</span>
                </div>
                <div className="split-people-row">
                  <div className="split-person">
                    <span className="person-avatar">Z</span>
                    <span className="person-share">{currency === 'PKR' ? '₨ 650' : '$ 2.30'}</span>
                  </div>
                  <div className="split-person">
                    <span className="person-avatar">A</span>
                    <span className="person-share">{currency === 'PKR' ? '₨ 650' : '$ 2.30'}</span>
                  </div>
                  <div className="split-person">
                    <span className="person-avatar">H</span>
                    <span className="person-share">{currency === 'PKR' ? '₨ 650' : '$ 2.30'}</span>
                  </div>
                  <div className="split-person">
                    <span className="person-avatar">B</span>
                    <span className="person-share">{currency === 'PKR' ? '₨ 650' : '$ 2.30'}</span>
                  </div>
                </div>
                <div className="split-status-bar">
                  <span className="split-check-icon">✓</span>
                  <span>Zero awkward reminders needed</span>
                </div>
              </div>
            </div>

            <div className="growth-card-text">
              <h3 className="growth-card-title">Roommate & Mess Splitter</h3>
              <p className="growth-card-desc">
                Share grocery bills, electricity contributions, and late-night pizza orders fairly. Export clean receipts directly to WhatsApp.
              </p>
            </div>
          </div>

          {/* Card 3: Micro-Savings Vault */}
          <div className="growth-card card-hover-lift">
            <div className="growth-card-visual" style={{ justifyContent: 'center' }}>
              <div className="mock-vault-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Icon name="piggyBank" size={18} color="#10B981" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-primary)' }}>Chai Round-Up Stash</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '4px' }}>
                  {currency === 'PKR' ? '₨ 4,350 Stashed' : '$ 15.60 Stashed'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Saved without affecting your daily lifestyle
                </div>
              </div>
            </div>

            <div className="growth-card-text">
              <h3 className="growth-card-title">Micro-Savings Vault</h3>
              <p className="growth-card-desc">
                Keep the change. Automatically round up or allocate small ₨ 50 to ₨ 100 pocket increments into a protected emergency stash.
              </p>
            </div>
          </div>

          {/* Card 4: Intelligent Habit Insights */}
          <div className="growth-card card-hover-lift">
            <div className="growth-card-visual" style={{ justifyContent: 'center' }}>
              <div className="mock-insight-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="insight-badge">Positive Pattern</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>AI Rule Insight</span>
                </div>
                <p style={{ fontSize: '13px', color: '#1E293B', lineHeight: 1.45, marginBottom: '8px' }}>
                  "You cooked or ate mess food 5 out of 7 days this week — saving approx {currency === 'PKR' ? '₨ 3,200' : '$ 11.50'} compared to ordering delivery!"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#15803D' }}>
                  <Icon name="check" size={14} color="#15803D" />
                  <span>Streak verified & logged</span>
                </div>
              </div>
            </div>

            <div className="growth-card-text">
              <h3 className="growth-card-title">Intelligent Habit Insights</h3>
              <p className="growth-card-desc">
                Non-judgmental, actionable spending observations. We highlight your wins and gently flag where your allowance might be slipping away.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  const reviews = [
    {
      initials: 'HK',
      name: 'Hamza Khan',
      campus: 'FAST-NUCES Islamabad',
      role: 'CS Junior • 3rd Year',
      highlight: true,
      text: 'Before Campus Coin, my ₨ 30,000 monthly allowance vanished by day 18, and I’d survive on chai and Maggi noodles. The envelope limits and daily burn rate keep me disciplined without feeling restrictive.',
    },
    {
      initials: 'AM',
      name: 'Ayesha Malik',
      campus: 'LUMS Lahore',
      role: 'BSc Accounting & Finance',
      highlight: false,
      text: 'I hated all other finance apps because they demanded my online banking credentials. Campus Coin gives me 100% manual control over cash spent on campus and cards. Saved ₨ 42,000 last semester!',
    },
    {
      initials: 'BS',
      name: 'Bilal Siddiqui',
      campus: 'NUST H-12',
      role: 'Mechanical Eng • Hostelite',
      highlight: false,
      text: 'Splitting mess dues, water dispenser cans, and late-night snacks with 3 hostel roommates used to be chaos. Campus Coin’s roommate splitter makes it seamless. Best student app on campus.',
    },
  ];

  return (
    <section className="testimonials-section" id="stories">
      <div className="container">
        {/* Pill */}
        <div className="section-pill-center">
          <span className="pill-badge pill-badge-emerald">
            <Icon name="userCheck" size={15} />
            <span>Trusted by Verified Students</span>
          </span>
        </div>

        {/* Heading */}
        <h2 className="testimonials-heading">
          Real Stories, Real Experience<br />
          with Campus Coin
        </h2>

        {/* 3 Review Cards */}
        <div className="testimonials-grid">
          {reviews.map((rev) => (
            <div
              key={rev.name}
              className={`testimonial-card card-hover-lift ${rev.highlight ? 'card-featured' : ''}`}
            >
              <div className="testimonial-header">
                <div className={`testimonial-avatar ${rev.highlight ? 'avatar-lime' : ''}`}>
                  {rev.initials}
                </div>
                <div>
                  <div className="testimonial-name">{rev.name}</div>
                  <div className="testimonial-campus">{rev.campus} • {rev.role}</div>
                </div>
              </div>
              <p className="testimonial-body">
                "{rev.text}"
              </p>
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="star-icon">★</span>
                ))}
                <span className="verified-badge">
                  <Icon name="check" size={12} color="#10B981" />
                  Verified Student
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Faq = () => {
  const [openIndex, setOpenIndex] = useState(0); // first open by default

  const faqs = [
    {
      q: 'Why Campus Coin instead of generic commercial finance apps?',
      a: 'Most finance apps are designed for salaried adults with corporate credit cards and bank syncs. Campus Coin is built specifically around student cashflows: monthly allowances, hostel mess fees, semester book costs, cash-in-hand transactions, and roommate bill splits. Zero corporate jargon, zero judgment.',
    },
    {
      q: 'Does Campus Coin require connecting to my bank account?',
      a: 'No, absolutely not. In accordance with our privacy-first architecture, Campus Coin does not connect to bank accounts or process financial transactions. You maintain 100% manual control over your income, cash, and expenses without ever sharing sensitive banking logins.',
    },
    {
      q: 'Is PKR supported natively in Campus Coin?',
      a: 'Yes! PKR (₨) is our native, first-class configurable currency designed for universities in Pakistan. You can log expenses down to the exact rupee and paisa, with optional multi-currency switching for international students.',
    },
    {
      q: 'Is Campus Coin completely free for university students?',
      a: 'Yes! The core Campus Coin cockpit, allowance tracking, budget envelopes, habit insights, and export tools are 100% free for verified university students and campus societies.',
    },
    {
      q: 'How does the Roommate & Mess Bill Splitter work?',
      a: 'You can enter a shared bill (e.g. hostel groceries, water cans, weekend dinner, or uber rides), select the number of roommates or friends, and Campus Coin computes everyone’s exact share and generates a clean summary you can copy straight to WhatsApp.',
    },
    {
      q: 'Can I export my transactions for monthly or semester budget reports?',
      a: 'Yes. You can export complete CSV spreadsheets or clean PDF summaries showing your monthly category breakdowns, savings rate, and daily burn velocity whenever you need.',
    },
  ];

  const toggleAccordion = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="faq-section" id="faq">
      <div className="container">
        <div className="faq-layout-split">
          {/* Left Column: Heading & Contact info */}
          <div className="faq-left-col">
            <h2 className="faq-title">Frequently Asked Questions</h2>
            <p className="faq-desc">
              Have questions about how Campus Coin fits into your semester? Check out our quick answers or reach out to our campus student ambassadors.
            </p>
            <div style={{ marginTop: '20px' }}>
              <a href="#contact" className="faq-contact-link">
                <span>Talk with a campus lead</span>
                <Icon name="arrowUpRight" size={15} />
              </a>
            </div>
          </div>

          {/* Right Column: Interactive Accordion */}
          <div className="faq-accordion-list">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={faq.q}
                  className={`faq-item ${isOpen ? 'is-open' : ''}`}
                >
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => toggleAccordion(idx)}
                    aria-expanded={isOpen}
                  >
                    <span className="faq-question-text">{faq.q}</span>
                    <span className={`faq-icon-arrow ${isOpen ? 'rotate-180' : ''}`}>
                      <Icon name="chevronDown" size={19} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="faq-answer-content">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const CtaBanner = () => {
  return (
    <section className="cta-banner-section" id="get-started">
      <div className="container">
        <div className="cta-banner-card">
          {/* Subtle background coin glow */}
          <div className="cta-glow-spot" />

          <div className="cta-content-inner">
            <div className="cta-pill-badge">
              <CoinMark size={18} />
              <span>Free Student Access</span>
            </div>

            <h2 className="cta-headline">
              Make your money make sense.<br />
              <span style={{ color: '#C7F36B' }}>Build your semester pattern today.</span>
            </h2>

            <p className="cta-desc">
              Join over 45,000 university students taking the stress out of monthly allowances, hostel budgets, and campus life. No credit cards or bank logins required.
            </p>

            <div className="cta-buttons-row">
              <a href="#register" className="btn btn-lime btn-lg">
                <span>Start Free on Campus</span>
                <Icon name="arrowRight" size={17} />
              </a>
              <a href="#simulator" className="btn btn-secondary btn-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <Icon name="calculator" size={17} />
                <span>Simulate My Budget</span>
              </a>
            </div>

            <div className="cta-guarantees-row">
              <div className="cta-guarantee-item">
                <Icon name="check" size={15} color="#C7F36B" />
                <span>Zero Bank Links</span>
              </div>
              <div className="cta-guarantee-item">
                <Icon name="check" size={15} color="#C7F36B" />
                <span>PKR Native</span>
              </div>
              <div className="cta-guarantee-item">
                <Icon name="check" size={15} color="#C7F36B" />
                <span>100% Free for Students</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const Home = () => {
  const homeRef = useRef(null);
  const { currency, toggleCurrency } = useCurrency();
  const [theme, setTheme] = useState(() => {
    const preferences = JSON.parse(localStorage.getItem('student_preferences') || '{}');
    return preferences.darkMode ? 'dark' : 'light';
  });

  useEffect(() => {
    const home = homeRef.current;
    if (!home || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const sections = [...home.querySelectorAll('section')];
    const animatedChildren = [
      '.hero-content-wrapper', '.hero-visual-container', '.campus-tools-copy', '.campus-tools-visual',
      '.stats-heading', '.stats-grid > *', '.features-header-split', '.features-cards-grid > *',
      '.services-header-center', '.services-grid > *', '.calculator-grid > *', '.clubs-showcase-grid > *',
      '.growth-grid > *', '.testimonials-grid > *', '.faq-layout-split > *', '.cta-banner-card',
    ].join(',');

    home.classList.add('scroll-effects-ready');
    sections.forEach((section) => {
      section.classList.add('scroll-effect-section');
      section.querySelectorAll(animatedChildren).forEach((item, index) => {
        item.classList.add('scroll-effect-item');
        item.style.setProperty('--scroll-item-delay', `${Math.min(index * 75, 375)}ms`);
      });
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in-view');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -7% 0px' });
    sections.forEach((section) => observer.observe(section));

    const parallaxImages = [...home.querySelectorAll('[data-scroll-parallax]')];
    let frame = 0;
    const updateParallax = () => {
      frame = 0;
      parallaxImages.forEach((image) => {
        const rect = image.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height) - 0.5;
        image.style.setProperty('--scroll-parallax-y', `${Math.round(progress * 34)}px`);
      });
    };
    const requestParallaxUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateParallax);
    };
    window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
    window.addEventListener('resize', requestParallaxUpdate);
    requestParallaxUpdate();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestParallaxUpdate);
      window.removeEventListener('resize', requestParallaxUpdate);
      home.classList.remove('scroll-effects-ready');
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.body.classList.toggle('dark-mode', nextTheme === 'dark');
    const preferences = JSON.parse(localStorage.getItem('student_preferences') || '{}');
    localStorage.setItem('student_preferences', JSON.stringify({ ...preferences, darkMode: nextTheme === 'dark' }));
  };

  return (
    <>
      <main className="home-page" ref={homeRef}>
        <Navbar
          currency={currency}
          onToggleCurrency={toggleCurrency}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <Hero currency={currency} />
        <CampusToolsSection />
        <Stats currency={currency} />
        <SecurityFeatures />
        <ServicesBento currency={currency} />
        <InteractiveCalculator currency={currency} />
        <SocietiesSection currency={currency} />
        <GrowthEarnSection currency={currency} />
        <Testimonials />
        <Faq />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
};

export default Home;
