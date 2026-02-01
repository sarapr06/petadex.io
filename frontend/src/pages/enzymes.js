// frontend/src/pages/enzymes.js

import React, { useState, useEffect } from "react";
import { Link } from "gatsby";
import "../styles/home.css";
import SiteHeader from "../components/SiteHeader";
import Seo from "../components/seo";
import config from "../config";
import { useScrollHeader } from "../hooks/useScrollHeader";

// EnzymeRow Component - Displays individual enzyme (centroid or variant)
const EnzymeRow = ({ enzyme, isCentroid }) => (
  <div style={{
    padding: "0.75rem 1rem",
    borderLeft: isCentroid ? "4px solid #f59e0b" : "4px solid #e2e8f0",
    backgroundColor: isCentroid ? "#fffbeb" : "white",
    marginBottom: "0.5rem",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "wrap"
  }}>
    <Link
      to={`/enzyme/${enzyme.enzyme_id}`}
      style={{
        fontFamily: "monospace",
        fontSize: "0.95rem",
        color: "#2c3e50",
        textDecoration: "none",
        borderBottom: "2px solid transparent",
        transition: "border-color 0.2s",
        fontWeight: isCentroid ? "600" : "normal"
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}
    >
      {enzyme.genbank_accession_id || `Enzyme ${enzyme.enzyme_id}`}
    </Link>

    {isCentroid ? (
      <span style={{
        padding: '0.2rem 0.5rem',
        backgroundColor: '#f59e0b',
        color: 'white',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: '700',
        letterSpacing: '0.5px'
      }}>
        CENTROID
      </span>
    ) : enzyme.family_pid !== null && (
      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
        {enzyme.family_pid}% identity
      </span>
    )}

    {enzyme.component !== null && (
      <span style={{
        padding: '0.2rem 0.5rem',
        backgroundColor: '#e0e7ff',
        color: '#4338ca',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '600'
      }}>
        Component {enzyme.component}
      </span>
    )}
  </div>
);

// FamilyCard Component - Displays family with expand/collapse
const FamilyCard = ({ family, isExpanded, onToggle }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadVariants = async () => {
    if (variants.length) return; // Already loaded

    setLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/enzymes/family/${family.family_id}?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setVariants(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Error loading variants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    onToggle();
    if (!isExpanded && variants.length === 0) {
      loadVariants();
    }
  };

  return (
    <div style={{
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      marginBottom: "1rem",
      backgroundColor: "white",
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
      overflow: "hidden"
    }}>
      {/* Family Header (Collapsed View) */}
      <div
        onClick={handleToggle}
        style={{
          padding: "1.25rem 1.5rem",
          cursor: "pointer",
          backgroundColor: isExpanded ? "#f8fafc" : "white",
          transition: "background-color 0.2s"
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = "#f8fafc";
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = "white";
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.25rem",
              color: "#2c3e50"
            }}>
              Family {family.family_id}
            </h3>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                fontFamily: "monospace",
                fontSize: "0.9rem",
                color: "#64748b"
              }}>
                {family.centroid_accession}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                <strong>{parseInt(family.variant_count).toLocaleString()}</strong> variants
              </span>
              {family.component_count > 0 && (
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  <strong>{family.component_count}</strong> component{family.component_count !== 1 ? 's' : ''}
                </span>
              )}
              {family.avg_identity && (
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  avg {family.avg_identity}% identity
                </span>
              )}
            </div>
          </div>
          <button
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              color: "#2563eb",
              backgroundColor: "white",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
              whiteSpace: "nowrap"
            }}
          >
            {isExpanded ? '▲ Collapse' : '▼ Expand Variants'}
          </button>
        </div>
      </div>

      {/* Expanded View - Variants List */}
      {isExpanded && (
        <div style={{
          padding: "1rem 1.5rem",
          backgroundColor: "#fafafa",
          borderTop: "1px solid #e2e8f0"
        }}>
          {loading ? (
            <div style={{ padding: "1rem", textAlign: "center", color: "#64748b" }}>
              Loading variants...
            </div>
          ) : variants.length > 0 ? (
            <>
              {variants.map(enzyme => (
                <EnzymeRow
                  key={enzyme.enzyme_id}
                  enzyme={enzyme}
                  isCentroid={enzyme.family_pid === null}
                />
              ))}
              {variants.length >= 50 && (
                <div style={{
                  padding: "0.75rem",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "0.85rem",
                  fontStyle: "italic"
                }}>
                  Showing first 50 variants
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: "1rem", textAlign: "center", color: "#64748b" }}>
              No variants found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// SearchResults Component
const SearchResults = ({ results, query }) => (
  <div>
    <div style={{
      padding: "1rem",
      marginBottom: "1rem",
      backgroundColor: "#f0f9ff",
      border: "1px solid #bae6fd",
      borderRadius: "8px",
      color: "#0369a1"
    }}>
      Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
    </div>

    {results.length === 0 ? (
      <div style={{
        padding: "2rem",
        textAlign: "center",
        color: "#666",
        backgroundColor: "#f8fafc",
        borderRadius: "8px"
      }}>
        No enzymes found matching your search
      </div>
    ) : (
      <div style={{
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        backgroundColor: "white",
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
        padding: "1rem"
      }}>
        {results.map(enzyme => (
          <EnzymeRow
            key={enzyme.enzyme_id}
            enzyme={enzyme}
            isCentroid={enzyme.family_pid === null}
          />
        ))}
      </div>
    )}
  </div>
);

// Main EnzymesPage Component
const EnzymesPage = () => {
  useScrollHeader();

  // State management
  const [view, setView] = useState('families'); // 'families' | 'search'
  const [families, setFamilies] = useState([]);
  const [expandedFamilies, setExpandedFamilies] = useState(new Set());
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('variant_count');

  // Load initial data (families and stats)
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Load statistics
        const statsRes = await fetch(`${config.apiUrl}/enzymes/stats/overview`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Load families summary
        const familiesRes = await fetch(`${config.apiUrl}/enzymes/families/summary?limit=100&sort=${sortBy}`);
        if (familiesRes.ok) {
          const familiesData = await familiesRes.json();
          setFamilies(familiesData.data || []);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sortBy]);

  // Smart search handler
  const handleSearch = async (query) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setView('families');
      setSearchResults([]);
      setSearchQuery('');
      return;
    }

    setSearchQuery(trimmedQuery);
    setView('search');
    setLoading(true);

    try {
      // Detect search type
      const isNumeric = /^\d+$/.test(trimmedQuery);
      const isFamilySearch = trimmedQuery.toLowerCase().includes('family');

      let endpoint;
      let fetchedData = [];

      if (isFamilySearch) {
        // "family 42" → extract number
        const familyId = trimmedQuery.match(/\d+/)?.[0];
        if (familyId) {
          endpoint = `/enzymes/family/${familyId}?limit=100`;
          const res = await fetch(`${config.apiUrl}${endpoint}`);
          if (res.ok) {
            const data = await res.json();
            fetchedData = Array.isArray(data) ? data : data.data || [];
          }
        }
      } else if (isNumeric) {
        // Could be enzyme ID or family ID - try enzyme ID first
        endpoint = `/enzymes/${trimmedQuery}`;
        const res = await fetch(`${config.apiUrl}${endpoint}`);

        if (res.ok) {
          const data = await res.json();
          fetchedData = [data];
        } else if (res.status === 404) {
          // Try as family ID if enzyme ID not found
          const familyRes = await fetch(`${config.apiUrl}/enzymes/family/${trimmedQuery}?limit=100`);
          if (familyRes.ok) {
            const familyData = await familyRes.json();
            fetchedData = Array.isArray(familyData) ? familyData : familyData.data || [];
          }
        }
      } else {
        // Accession search
        endpoint = `/enzymes/accession/${encodeURIComponent(trimmedQuery)}`;
        const res = await fetch(`${config.apiUrl}${endpoint}`);
        if (res.ok) {
          const data = await res.json();
          fetchedData = [data];
        }
      }

      setSearchResults(fetchedData);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle family expansion
  const toggleFamily = (familyId) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(familyId)) {
        newSet.delete(familyId);
      } else {
        newSet.add(familyId);
      }
      return newSet;
    });
  };

  return (
    <>
      <SiteHeader currentPage="enzymes" />

      <main style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        paddingTop: "10rem"
      }}>
        {/* Header Section */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{
            fontSize: "2.5rem",
            marginBottom: "0.5rem",
            color: "#2c3e50"
          }}>
            BLAST-NR Enzyme Database
          </h1>
          <p style={{
            color: "#666",
            fontSize: "1.1rem",
            marginBottom: "1.5rem"
          }}>
            Browse plastic-degrading enzyme families
          </p>

          {/* Statistics */}
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  Total Families
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50' }}>
                  {parseInt(stats.total_families).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  Total Enzymes
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50' }}>
                  {parseInt(stats.total_enzymes).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  Components
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50' }}>
                  {parseInt(stats.total_components).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  Variants
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50' }}>
                  {parseInt(stats.total_variants).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search: accession, family, or enzyme ID..."
              style={{
                width: "100%",
                padding: "0.75rem",
                fontSize: "1rem",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                outline: "none"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}
            />
          </div>

          {/* Sort Controls (only in families view) */}
          {view === 'families' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', color: '#64748b' }}>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "0.5rem",
                  fontSize: "0.9rem",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  backgroundColor: "white"
                }}
              >
                <option value="variant_count">Variant Count</option>
                <option value="component_count">Component Count</option>
                <option value="avg_identity">Average Identity</option>
                <option value="family">Family ID</option>
              </select>
            </div>
          )}
        </div>

        {/* Main Content */}
        {loading && view === 'families' ? (
          <div style={{
            padding: "2rem",
            textAlign: "center",
            color: "#666",
            fontStyle: "italic"
          }}>
            Loading families...
          </div>
        ) : error ? (
          <div style={{
            padding: "2rem",
            textAlign: "center",
            color: "#dc2626",
            backgroundColor: "#fef2f2",
            borderRadius: "8px",
            border: "1px solid #fecaca"
          }}>
            Error loading data: {error}
          </div>
        ) : view === 'families' ? (
          <>
            <div style={{
              marginBottom: "1rem",
              fontSize: "0.9rem",
              color: "#666"
            }}>
              Showing {families.length} families
            </div>
            {families.map(family => (
              <FamilyCard
                key={family.family_id}
                family={family}
                isExpanded={expandedFamilies.has(family.family_id)}
                onToggle={() => toggleFamily(family.family_id)}
              />
            ))}
          </>
        ) : (
          <SearchResults results={searchResults} query={searchQuery} />
        )}
      </main>
    </>
  );
};

export default EnzymesPage;

export const Head = () => (
  <Seo
    title="BLAST-NR Enzyme Database"
    description="Browse plastic-degrading enzyme families from BLAST-NR clustering"
  />
);
