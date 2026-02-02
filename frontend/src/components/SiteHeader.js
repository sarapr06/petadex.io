import React, { useState } from "react";
import { Link } from "gatsby";

/**
 * Shared site header component with navigation
 * Used across all pages for consistent navigation
 */
const SiteHeader = () => {
  const [isHidden, setIsHidden] = useState(false);

  // Navigation items configuration
  const navItems = [
    { label: 'Sequence', path: '/fastaa', key: 'sequence' },
    { label: 'Enzymes', path: '/enzymes', key: 'enzymes' },
    { label: 'Search', path: '/search', key: 'search' },
    { label: 'Substrate', path: '/structure', key: 'structure' },
    { label: 'Metadata', path: '/metadata', key: 'metadata' }
  ];

  // Show all navigation items on all pages
  const visibleNavItems = navItems;

  return (
    <div style={{ position: 'relative' }}>
      {/* Hover zone to bring header back when hidden */}
      {isHidden && (
        <div
          onMouseEnter={() => setIsHidden(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '16px',
            zIndex: 1001,
            cursor: 'pointer'
          }}
        />
      )}
      <header
        role="banner"
        className="ui-section-header"
        style={{
          position: 'relative',
          transform: isHidden ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
      <div className="ui-layout-container">
        <div className="ui-section-header__layout ui-layout-flex">
          {/* LOGO */}
          <Link
            to="/"
            role="link"
            aria-label="PETadex Home"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <img
              src={require('../images/petadex-icon.png').default}
              alt="PETadex Logo"
              style={{ height: '48px', width: 'auto' }}
            />
          </Link>

          {/* NAVIGATION */}
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {visibleNavItems.map(item => (
              <Link
                key={item.key}
                to={item.path}
                style={{
                  textDecoration: 'none',
                  color: '#64748b',
                  fontWeight: '500',
                  fontSize: '0.95rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#2c3e50'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {/* Hide header button - hangs off the bottom */}
      <button
        onClick={() => setIsHidden(true)}
        aria-label="Hide header"
        style={{
          position: 'absolute',
          bottom: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: '1px solid #e2e8f0',
          background: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#94a3b8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'color 0.2s, border-color 0.2s',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#64748b';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#94a3b8';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }}
      >
        ▲
      </button>
    </header>
    </div>
  );
};

export default SiteHeader;
