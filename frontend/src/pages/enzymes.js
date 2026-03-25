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
              <Link
                to={`/family/${family.family_id}`}
                style={{
                  color: "#2c3e50",
                  textDecoration: "none",
                  borderBottom: "2px solid transparent",
                  transition: "border-color 0.2s"
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}
              >
                Family {family.family_id}
              </Link>
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

// Match type badge colors
const matchTypeBadge = {
  accession: { bg: '#dbeafe', color: '#1e40af', label: 'Accession match' },
  variant: { bg: '#fce7f3', color: '#9d174d', label: 'Variant match' },
  family: { bg: '#fef3c7', color: '#92400e', label: 'Family match' },
  enzyme_id: { bg: '#d1fae5', color: '#065f46', label: 'Enzyme ID match' },
};

// SearchResults Component
const SearchResults = ({ familyResults, enzymeResults, query, loading, expandedFamilies, onToggleFamily }) => {
  const totalCount = familyResults.length + enzymeResults.length;

  return (
    <div>
      <div style={{
        padding: "1rem",
        marginBottom: "1rem",
        backgroundColor: "#f0f9ff",
        border: "1px solid #bae6fd",
        borderRadius: "8px",
        color: "#0369a1"
      }}>
        {loading ? 'Searching...' : (
          <>
            Found {totalCount} result{totalCount !== 1 ? 's' : ''} for "{query}"
            {familyResults.length > 0 && enzymeResults.length > 0 && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                ({familyResults.length} {familyResults.length === 1 ? 'family' : 'families'}, {enzymeResults.length} {enzymeResults.length === 1 ? 'enzyme' : 'enzymes'})
              </span>
            )}
          </>
        )}
      </div>

      {!loading && totalCount === 0 ? (
        <div style={{
          padding: "2rem",
          textAlign: "center",
          color: "#666",
          backgroundColor: "#f8fafc",
          borderRadius: "8px"
        }}>
          No results found. Try a partial accession, enzyme ID, family number, or variant accession.
        </div>
      ) : !loading && (
        <>
          {/* Family results as FamilyCards */}
          {familyResults.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '0.75rem' }}>
                Families ({familyResults.length})
              </h3>
              {familyResults.map(family => (
                <FamilyCard
                  key={family.family_id}
                  family={family}
                  isExpanded={expandedFamilies.has(family.family_id)}
                  onToggle={() => onToggleFamily(family.family_id)}
                />
              ))}
            </div>
          )}

          {/* Enzyme results as rows */}
          {enzymeResults.length > 0 && (
            <div>
              {familyResults.length > 0 && (
                <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  Enzymes ({enzymeResults.length})
                </h3>
              )}
              <div style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                backgroundColor: "white",
                boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
                padding: "1rem"
              }}>
                {enzymeResults.map(enzyme => (
                  <div key={enzyme.enzyme_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <EnzymeRow
                        enzyme={enzyme}
                        isCentroid={enzyme.family_pid === null}
                      />
                    </div>
                    {enzyme.match_type && matchTypeBadge[enzyme.match_type] && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', minWidth: '120px' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          backgroundColor: matchTypeBadge[enzyme.match_type].bg,
                          color: matchTypeBadge[enzyme.match_type].color,
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>
                          {matchTypeBadge[enzyme.match_type].label}
                        </span>
                        {enzyme.matched_variant_accession && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                            via {enzyme.matched_variant_accession}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Main EnzymesPage Component
const EnzymesPage = () => {
  useScrollHeader();

  // State management
  const [view, setView] = useState('families'); // 'families' | 'search'
  const [families, setFamilies] = useState([]);
  const [expandedFamilies, setExpandedFamilies] = useState(new Set());
  const [searchFamilyResults, setSearchFamilyResults] = useState([]);
  const [searchEnzymeResults, setSearchEnzymeResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('variant_count');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const FAMILIES_INITIAL = 10;
  const FAMILIES_PER_PAGE = 50;

  // Load families and stats in parallel — families render as soon as they arrive
  useEffect(() => {
    setLoadingFamilies(true);
    setFamilies([]);
    setOffset(0);
    setHasMore(false);

    // Stats: fire and forget — updates when ready, doesn't block families
    fetch(`${config.apiUrl}/enzymes/stats/overview`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(err => console.error('Error loading stats:', err));

    // Families: show as soon as resolved
    fetch(`${config.apiUrl}/enzymes/families/summary?limit=${FAMILIES_INITIAL}&offset=0&sort=${sortBy}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setFamilies(data.data || []);
          setHasMore(data.pagination?.hasMore || false);
          setOffset(data.data?.length || 0);
        }
      })
      .catch(err => {
        console.error('Error loading families:', err);
        setError(err.toString());
      })
      .finally(() => setLoadingFamilies(false));
  }, [sortBy]);

  // Load more families
  const loadMoreFamilies = async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(`${config.apiUrl}/enzymes/families/summary?limit=${FAMILIES_PER_PAGE}&offset=${offset}&sort=${sortBy}`);
      if (res.ok) {
        const data = await res.json();
        setFamilies(prev => [...prev, ...(data.data || [])]);
        setHasMore(data.pagination?.hasMore || false);
        setOffset(prev => prev + (data.data?.length || 0));
      }
    } catch (err) {
      console.error('Error loading more families:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Debounced search using the unified search endpoint
  const searchTimerRef = React.useRef(null);

  const handleSearchInput = (query) => {
    setSearchQuery(query);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!query.trim()) {
      setView('families');
      setSearchFamilyResults([]);
      setSearchEnzymeResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      performSearch(query.trim());
    }, 300);
  };

  const [loadingSearch, setLoadingSearch] = useState(false);

  const performSearch = async (query) => {
    setView('search');
    setLoadingSearch(true);

    try {
      const res = await fetch(`${config.apiUrl}/enzymes/search?q=${encodeURIComponent(query)}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setSearchFamilyResults(data.families || []);
        setSearchEnzymeResults(data.enzymes || []);
      } else {
        setSearchFamilyResults([]);
        setSearchEnzymeResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchFamilyResults([]);
      setSearchEnzymeResults([]);
    } finally {
      setLoadingSearch(false);
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
        paddingTop: "2rem"
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
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search by accession, enzyme ID, family, or variant..."
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
        {loadingFamilies && view === 'families' ? (
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
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  onClick={loadMoreFamilies}
                  disabled={loadingMore}
                  style={{
                    padding: '0.75rem 2rem',
                    fontSize: '1rem',
                    color: loadingMore ? '#94a3b8' : '#2563eb',
                    backgroundColor: 'white',
                    border: `1px solid ${loadingMore ? '#e2e8f0' : '#2563eb'}`,
                    borderRadius: '6px',
                    cursor: loadingMore ? 'default' : 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loadingMore) {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loadingMore) {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.color = '#2563eb';
                    }
                  }}
                >
                  {loadingMore ? 'Loading...' : 'Read More'}
                </button>
              </div>
            )}
          </>
        ) : (
          <SearchResults
            familyResults={searchFamilyResults}
            enzymeResults={searchEnzymeResults}
            query={searchQuery}
            loading={loadingSearch}
            expandedFamilies={expandedFamilies}
            onToggleFamily={toggleFamily}
          />
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
