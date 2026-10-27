import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';

export default function LandingPage() {
  const { user } = useAuth();
  const { selectGroup, loadGroups } = useGroup();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signup');
  const [menuOpen, setMenuOpen] = useState(false);

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const onAuthenticated = async ({ groupId } = {}) => {
    const list = await loadGroups();
    if (groupId) selectGroup(groupId);
    else if (list?.[0]) selectGroup(list[0].id);
    navigate('/app');
  };

  return (
    <>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <Brand />
        <nav id="mainNav" className={`nav-links ${menuOpen ? 'mobile-open' : ''}`}>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
        </nav>
        <div className={`top-actions ${menuOpen ? '' : ''}`} id="topActions">
          {user ? (
            <Link className="btn btn-primary" to="/app">
              Open dashboard <span>↗</span>
            </Link>
          ) : (
            <>
              <button type="button" className="btn btn-quiet" onClick={() => openAuth('login')}>
                Log in
              </button>
              <button type="button" className="btn btn-primary" onClick={() => openAuth('signup')}>
                Get started <span>↗</span>
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          className="menu-button"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ☰
        </button>
      </header>

      <main>
        <section className="page active">
          <div className="hero wrap">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="pulse" /> YOUR PROGRESS, YOUR COMMUNITY
              </div>
              <h1>
                Small steps.
                <br />
                <span>Serious progress.</span>
              </h1>
              <p className="hero-text">
                Build consistency with people who keep you accountable. Track your work, celebrate streaks, and
                watch your progress grow — together.
              </p>
              <div className="hero-buttons">
                <button
                  type="button"
                  className="btn btn-primary btn-large"
                  onClick={() => (user ? navigate('/app') : openAuth('signup'))}
                >
                  {user ? 'Open dashboard' : 'Create your community'} <span>↗</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-large"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Explore the features ↓
                </button>
              </div>
              <div className="social-proof">
                <div className="avatar-stack">
                  <span>A</span>
                  <span>R</span>
                  <span>S</span>
                  <span>+</span>
                </div>
                <div>
                  <strong>Consistency is a team sport.</strong>
                  <small>Make progress visible. Keep each other going.</small>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="mock-window">
                <div className="mock-top">
                  <div className="window-dots">
                    <i />
                    <i />
                    <i />
                  </div>
                  <span>COMMUNITY OVERVIEW</span>
                  <span className="mock-live">
                    <b /> Live preview
                  </span>
                </div>
                <div className="mock-content">
                  <div className="mock-welcome">
                    <div>
                      <small>DASHBOARD PREVIEW</small>
                      <h3>You&apos;re building momentum ✨</h3>
                    </div>
                    <div className="mock-avatar">Y</div>
                  </div>
                  <div className="mock-stats">
                    <div className="mock-stat">
                      <span>Your points</span>
                      <strong className="blue-text">120</strong>
                      <small>↑ 18% this week</small>
                    </div>
                    <div className="mock-stat">
                      <span>Group streak</span>
                      <strong className="purple-text">8 days</strong>
                      <small>Keep it going</small>
                    </div>
                  </div>
                  <div className="mock-chart-card">
                    <div className="card-heading">
                      <div>
                        <strong>Weekly progress</strong>
                        <small>Points earned each day</small>
                      </div>
                      <span className="tiny-pill">This week</span>
                    </div>
                    <svg viewBox="0 0 460 155" className="chart" role="img" aria-label="Example progress chart">
                      <defs>
                        <linearGradient id="blueArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0" stopColor="#5487ff" stopOpacity=".35" />
                          <stop offset="1" stopColor="#5487ff" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <g stroke="#26344c" strokeDasharray="3 5">
                        <path d="M18 25H445" />
                        <path d="M18 60H445" />
                        <path d="M18 95H445" />
                        <path d="M18 130H445" />
                      </g>
                      <path
                        d="M18 112 C55 102,70 110,88 91 S140 78,160 96 S220 100,244 69 S292 38,315 65 S355 105,380 72 S420 52,445 35 L445 132 L18 132Z"
                        fill="url(#blueArea)"
                      />
                      <path
                        d="M18 112 C55 102,70 110,88 91 S140 78,160 96 S220 100,244 69 S292 38,315 65 S355 105,380 72 S420 52,445 35"
                        fill="none"
                        stroke="#6c95ff"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M18 123 C55 117,70 90,88 106 S140 112,160 109 S220 80,244 91 S292 95,315 82 S355 65,380 90 S420 83,445 70"
                        fill="none"
                        stroke="#bd76f6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="chart-legend">
                      <span>
                        <i className="legend-blue" />
                        You
                      </span>
                      <span>
                        <i className="legend-purple" />
                        Community average
                      </span>
                    </div>
                  </div>
                  <div className="mock-bottom">
                    <div className="mock-task">
                      <span className="task-icon">✦</span>
                      <div>
                        <strong>Today&apos;s focus</strong>
                        <small>Physics revision</small>
                      </div>
                      <span className="mock-check">✓</span>
                    </div>
                    <div className="mock-task">
                      <span className="task-icon purple-icon">◎</span>
                      <div>
                        <strong>Daily goal</strong>
                        <small>3 of 4 tasks</small>
                      </div>
                      <span className="goal-number">75%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="float-card float-one">
                <span className="float-icon">🔥</span>
                <div>
                  <strong>8 day streak!</strong>
                  <small>Consistency looks good on you.</small>
                </div>
              </div>
              <div className="float-card float-two">
                <span className="float-icon purple-icon">↗</span>
                <div>
                  <strong>+24 points</strong>
                  <small>Progress, not perfection.</small>
                </div>
              </div>
            </div>
          </div>

          <section id="features" className="section wrap">
            <div className="section-title">
              <div className="eyebrow">EVERYTHING IN ONE PLACE</div>
              <h2>
                Make showing up <span>your superpower.</span>
              </h2>
              <p>Simple tools to turn good intentions into a routine that lasts.</p>
            </div>
            <div className="feature-grid">
              <article className="feature-card">
                <div className="feature-icon icon-blue">▤</div>
                <h3>Track what matters</h3>
                <p>
                  Create the tasks that fit your goals — from school subjects to reading, coding, fitness, or
                  personal habits.
                </p>
              </article>
              <article className="feature-card">
                <div className="feature-icon icon-purple">⌁</div>
                <h3>See your progress</h3>
                <p>Daily points, cumulative graphs, streaks, and a calendar make your consistency easy to understand.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon icon-pink">♧</div>
                <h3>Grow as a community</h3>
                <p>
                  Create a private group and invite the people you trust. Your group&apos;s activity stays within
                  your community.
                </p>
              </article>
            </div>
          </section>

          <section id="how" className="how-section">
            <div className="wrap how-inner">
              <div>
                <div className="eyebrow">THREE SIMPLE STEPS</div>
                <h2>
                  Your next chapter starts <span>with today.</span>
                </h2>
              </div>
              <div className="steps">
                <div>
                  <b>01</b>
                  <section>
                    <h3>Create a group</h3>
                    <p>Give your community a name and set the goals. Groups stay private.</p>
                  </section>
                </div>
                <div>
                  <b>02</b>
                  <section>
                    <h3>Invite your people</h3>
                    <p>Share a secure invite code or link with friends or teammates.</p>
                  </section>
                </div>
                <div>
                  <b>03</b>
                  <section>
                    <h3>Show up consistently</h3>
                    <p>Complete tasks, earn points, and review your progress together.</p>
                  </section>
                </div>
              </div>
            </div>
          </section>

          <section className="final-cta wrap">
            <div>
              <div className="eyebrow">START SMALL. STAY CONSISTENT.</div>
              <h2>Make today count.</h2>
              <p>Your community is one good decision away.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={() => (user ? navigate('/app') : openAuth('signup'))}
            >
              {user ? 'Open dashboard ↗' : 'Get started for free ↗'}
            </button>
          </section>
        </section>
      </main>

      <footer id="siteFooter">
        <div className="wrap footer-inner">
          <Brand />
          <span>Built for the progress you make every day.</span>
          <span>© 2026 Consistify</span>
        </div>
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
        onAuthenticated={onAuthenticated}
      />
    </>
  );
}
