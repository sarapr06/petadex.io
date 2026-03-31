import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "gatsby";
import Seo from "../components/seo";
import config from "../config";
import { useScrollHeader } from "../hooks/useScrollHeader";
import { generateCSV, downloadCSV } from "../utils/csvDownload";
import ActivityLineChart, { mediaColors, mediaLabels } from "../components/ActivityLineChart";
import {
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const allSubstrates = ["BHET12.5", "BHET25", "BHET50"];

const timepointColors = {
  "all": "#6b7280",
  24: "#10b981",
  48: "#3b82f6",
  72: "#8b5cf6",
  96: "#f59e0b",
  120: "#ef4444",
};

const plotModes = {
  intensity: { label: "Raw Intensity", description: "Average pixel intensity at each timepoint" },
  activity: { label: "Activity", description: "Peak intensity minus subsequent minimum (degradation signal)" },
};

const benchmarkEnzymes = {
  "WP_054022242.1": "IsPETase",
  "WP_054022242.1_M1": "Fast-PETase",
};

const diamondPoints = (cx, cy, r) =>
  `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;

// --- Custom Scatter Tooltip ---
const ScatterTooltipContent = ({ active, payload, xKey, yKey, plotMode }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const isActivityMode = plotMode === "activity";
  const valueLabel = isActivityMode ? "Activity" : "Intensity";

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "0.75rem 1rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      fontSize: "0.825rem",
      maxWidth: "300px",
    }}>
      <div style={{ fontWeight: "700", color: "#1f2937", marginBottom: "0.3rem", fontFamily: "monospace" }}>
        {data.gene}
      </div>
      {data.nickname && (
        <div style={{ color: "#6b7280", marginBottom: "0.3rem", fontSize: "0.75rem" }}>
          {data.nickname}
        </div>
      )}
      <div style={{ color: mediaColors[xKey], marginBottom: "0.15rem" }}>
        {mediaLabels[xKey]} {valueLabel}: <strong>{data.x?.toFixed(2)}</strong>
      </div>
      <div style={{ color: mediaColors[yKey], marginBottom: isActivityMode ? "0.3rem" : "0" }}>
        {mediaLabels[yKey]} {valueLabel}: <strong>{data.y?.toFixed(2)}</strong>
      </div>
      {isActivityMode && data.xActivity && (
        <div style={{ fontSize: "0.7rem", color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: "0.3rem", marginTop: "0.3rem" }}>
          <div>{mediaLabels[xKey]}: peak@{data.xActivity.peak_timepoint}h → min@{data.xActivity.min_timepoint}h</div>
          <div>{mediaLabels[yKey]}: peak@{data.yActivity.peak_timepoint}h → min@{data.yActivity.min_timepoint}h</div>
        </div>
      )}
      <div style={{ color: "#9ca3af", marginTop: "0.3rem", fontSize: "0.7rem", fontStyle: "italic" }}>
        Click to jump to gene card
      </div>
    </div>
  );
};

// --- VS Hero Banner ---
const SubstrateHero = ({ heroStats, activeSubstrates }) => {
  const substrates = [...activeSubstrates];
  const isVsMode = substrates.length === 2;

  if (substrates.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "stretch",
      marginBottom: "2rem",
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid #e5e7eb",
      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      position: "relative",
    }}>
      {substrates.map((substrate, i) => {
        const stats = heroStats[substrate];
        const color = mediaColors[substrate];

        return (
          <React.Fragment key={substrate}>
            {/* VS divider */}
            {isVsMode && i === 1 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "0",
                position: "relative",
                zIndex: 2,
              }}>
                <div style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  backgroundColor: "#1f2937",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "900",
                  fontSize: "0.9rem",
                  letterSpacing: "0.08em",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                  position: "absolute",
                }}>
                  VS
                </div>
              </div>
            )}

            {/* Non-VS divider for 3+ substrates */}
            {!isVsMode && i > 0 && (
              <div style={{ width: "1px", backgroundColor: "#e5e7eb" }} />
            )}

            <div style={{
              flex: "1",
              padding: "1.75rem 2rem",
              background: `linear-gradient(135deg, ${color}0A 0%, ${color}18 100%)`,
              borderLeft: `4px solid ${color}`,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1.25rem",
              }}>
                <div style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}66`,
                }} />
                <span style={{
                  fontSize: "1.3rem",
                  fontWeight: "800",
                  color: "#1f2937",
                }}>
                  {mediaLabels[substrate]}
                </span>
              </div>

              <div style={{
                display: "flex",
                gap: "2rem",
              }}>
                <div>
                  <div style={{
                    fontSize: "0.65rem", fontWeight: "700", color: "#9ca3af",
                    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem"
                  }}>Genes Tested</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: "800", color }}>
                    {stats?.geneCount || 0}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: "0.65rem", fontWeight: "700", color: "#9ca3af",
                    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem"
                  }}>Mean Activity</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: "800", color }}>
                    {stats?.meanActivity?.toFixed(4) || "—"}
                  </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// --- Plot Mode Toggle ---
const PlotModeToggle = ({ plotMode, onModeChange }) => (
  <div style={{
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1.5rem",
    alignItems: "center",
  }}>
    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#6b7280" }}>
      Plot Mode:
    </span>
    {Object.entries(plotModes).map(([mode, { label, description }]) => {
      const isActive = plotMode === mode;
      return (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          title={description}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: isActive ? "2px solid #1f2937" : "2px solid #d1d5db",
            backgroundColor: isActive ? "#1f2937" : "transparent",
            color: isActive ? "#fff" : "#4b5563",
            fontWeight: "600",
            fontSize: "0.8rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "#f3f4f6";
              e.currentTarget.style.borderColor = "#9ca3af";
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.borderColor = "#d1d5db";
            }
          }}
        >
          {label}
        </button>
      );
    })}
    <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "0.5rem", fontStyle: "italic" }}>
      {plotModes[plotMode].description}
    </span>
  </div>
);

// --- Timepoint Toggle Chips ---
const TimepointToggle = ({ availableTimepoints, activeTimepoint, onSelect }) => {
  if (availableTimepoints.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      gap: "0.5rem",
      marginBottom: "2rem",
      flexWrap: "wrap",
      alignItems: "center",
    }}>
      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#6b7280" }}>
        Timepoint:
      </span>
      {/* "All" option for averaged data */}
      <button
        onClick={() => onSelect(null)}
        style={{
          padding: "0.4rem 0.9rem",
          borderRadius: "16px",
          border: `2px solid ${timepointColors["all"]}`,
          backgroundColor: activeTimepoint === null ? timepointColors["all"] : "transparent",
          color: activeTimepoint === null ? "#fff" : timepointColors["all"],
          fontWeight: "600",
          fontSize: "0.75rem",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={e => {
          if (activeTimepoint !== null) {
            e.currentTarget.style.backgroundColor = `${timepointColors["all"]}15`;
          }
        }}
        onMouseLeave={e => {
          if (activeTimepoint !== null) {
            e.currentTarget.style.backgroundColor = "transparent";
          }
        }}
      >
        All (avg)
      </button>
      {availableTimepoints.map(tp => {
        const isActive = activeTimepoint === tp;
        const color = timepointColors[tp] || "#6b7280";
        return (
          <button
            key={tp}
            onClick={() => onSelect(tp)}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "16px",
              border: `2px solid ${color}`,
              backgroundColor: isActive ? color : "transparent",
              color: isActive ? "#fff" : color,
              fontWeight: "600",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = `${color}15`;
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {tp}h
          </button>
        );
      })}
    </div>
  );
};

// --- Substrate Toggle Chips ---
const SubstrateToggle = ({ activeSubstrates, onToggle }) => (
  <div style={{
    display: "flex",
    gap: "0.75rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
    alignItems: "center",
  }}>
    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#6b7280" }}>
      Substrates:
    </span>
    {allSubstrates.map(substrate => {
      const isActive = activeSubstrates.has(substrate);
      const color = mediaColors[substrate];
      return (
        <button
          key={substrate}
          onClick={() => onToggle(substrate)}
          style={{
            padding: "0.45rem 1.1rem",
            borderRadius: "20px",
            border: `2px solid ${color}`,
            backgroundColor: isActive ? color : "transparent",
            color: isActive ? "#fff" : color,
            fontWeight: "700",
            fontSize: "0.8rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
          onMouseEnter={e => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = `${color}15`;
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <span style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: isActive ? "#fff" : color,
            display: "inline-block",
          }} />
          {mediaLabels[substrate]}
        </button>
      );
    })}
  </div>
);

// --- Scatter Plot: Substrate Preference ---
const SubstrateScatter = ({
  scatterData, activeSubstrates,
  scatterXAxis, scatterYAxis,
  onXAxisChange, onYAxisChange,
  onDotClick, highlightedGene,
  activeTimepoint, plotMode,
}) => {
  const isActivityMode = plotMode === "activity";
  const axisLabel = isActivityMode ? "Activity" : "Avg Intensity";
  const substrates = [...activeSubstrates];

  const diagonalData = useMemo(() => {
    if (scatterData.length === 0) return [];
    const allVals = scatterData.flatMap(d => [d.x, d.y]).filter(v => v != null && !isNaN(v));
    if (allVals.length === 0) return [];
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const pad = (max - min) * 0.05 || 0.01;
    return [
      { x: min - pad, y: min - pad },
      { x: max + pad, y: max + pad },
    ];
  }, [scatterData]);

  return (
    <div
      id="substrate-scatter"
      style={{
      backgroundColor: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "1.5rem",
      marginBottom: "2rem",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      position: "relative",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "1rem",
        flexWrap: "wrap",
        gap: "1rem",
      }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#1f2937", margin: 0 }}>
            Substrate Preference
            {isActivityMode && (
              <span style={{
                marginLeft: "0.75rem",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#059669",
                backgroundColor: "#d1fae5",
                padding: "0.2rem 0.6rem",
                borderRadius: "12px",
              }}>
                Activity Mode
              </span>
            )}
            {!isActivityMode && activeTimepoint !== null && (
              <span style={{
                marginLeft: "0.75rem",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: timepointColors[activeTimepoint] || "#6b7280",
                backgroundColor: `${timepointColors[activeTimepoint] || "#6b7280"}15`,
                padding: "0.2rem 0.6rem",
                borderRadius: "12px",
              }}>
                @ {activeTimepoint}h
              </span>
            )}
          </h2>
          <p style={{ fontSize: "0.825rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
            {isActivityMode
              ? "Each dot is one gene. Activity = peak intensity minus subsequent minimum"
              : `Each dot is one gene. Dots above the diagonal prefer the Y-axis substrate${activeTimepoint === null ? " (averaged across all timepoints)" : ""}`
            }
          </p>
        </div>

        {substrates.length > 2 && (
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.8rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              X:
              <select
                value={scatterXAxis}
                onChange={e => onXAxisChange(e.target.value)}
                style={{
                  padding: "0.3rem 0.5rem", borderRadius: "6px",
                  border: `2px solid ${mediaColors[scatterXAxis]}`,
                  fontSize: "0.8rem", fontWeight: "600",
                  color: mediaColors[scatterXAxis],
                }}
              >
                {substrates.map(s => (
                  <option key={s} value={s}>{mediaLabels[s]}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: "0.8rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              Y:
              <select
                value={scatterYAxis}
                onChange={e => onYAxisChange(e.target.value)}
                style={{
                  padding: "0.3rem 0.5rem", borderRadius: "6px",
                  border: `2px solid ${mediaColors[scatterYAxis]}`,
                  fontSize: "0.8rem", fontWeight: "600",
                  color: mediaColors[scatterYAxis],
                }}
              >
                {substrates.map(s => (
                  <option key={s} value={s}>{mediaLabels[s]}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            type="number"
            dataKey="x"
            name={mediaLabels[scatterXAxis]}
            label={{
              value: `${axisLabel} — ${mediaLabels[scatterXAxis]}`,
              position: "insideBottom",
              offset: -5,
              style: { fontWeight: "700", fontSize: "0.8rem", fill: mediaColors[scatterXAxis] },
            }}
            tick={{ fontSize: 11 }}
            stroke="#d1d5db"
          />
          <YAxis
            type="number"
            dataKey="y"
            name={mediaLabels[scatterYAxis]}
            label={{
              value: `${axisLabel} — ${mediaLabels[scatterYAxis]}`,
              angle: -90,
              position: "center",
              dx: -30,
              style: { fontWeight: "700", fontSize: "0.8rem", fill: mediaColors[scatterYAxis] },
            }}
            tick={{ fontSize: 11 }}
            stroke="#d1d5db"
          />
          <ZAxis range={[50, 50]} />
          <Tooltip content={<ScatterTooltipContent xKey={scatterXAxis} yKey={scatterYAxis} plotMode={plotMode} />} />

          {/* Diagonal "equal preference" line */}
          <Scatter
            data={diagonalData}
            fill="none"
            line={{ stroke: "#9ca3af", strokeDasharray: "6 4", strokeWidth: 1.5 }}
            shape={() => null}
            legendType="none"
            isAnimationActive={false}
          />

          {/* Gene dots */}
          <Scatter
            data={scatterData}
            isAnimationActive={true}
            animationDuration={800}
            onClick={(data) => {
              if (data?.gene) onDotClick(data.gene);
            }}
            cursor="pointer"
            shape={(props) => {
              const { cx, cy, payload } = props;
              const prefersX = payload.x > payload.y;
              const color = prefersX ? mediaColors[scatterXAxis] : mediaColors[scatterYAxis];
              const isHighlighted = highlightedGene && payload.gene === highlightedGene;
              const benchmarkLabel = benchmarkEnzymes[payload.accession];

              const pulseRing = (
                <>
                  <circle cx={cx} cy={cy} r={14} fill="none" stroke={color} strokeWidth={2}>
                    <animate attributeName="r" from="8" to="18" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                </>
              );

              const label = benchmarkLabel ? (
                <text x={cx + 14} y={cy + 4} fontSize="11" fontWeight="700" fill="#1f2937">
                  {benchmarkLabel}
                </text>
              ) : null;

              if (benchmarkLabel && isHighlighted) {
                return (
                  <g>
                    {pulseRing}
                    <polygon points={diamondPoints(cx, cy, 9)} fill={color} stroke="#fff" strokeWidth={2.5} />
                    {label}
                  </g>
                );
              }

              if (benchmarkLabel) {
                return (
                  <g>
                    <polygon points={diamondPoints(cx, cy, 8)} fill={color} stroke="#1f2937" strokeWidth={2} />
                    {label}
                  </g>
                );
              }

              if (isHighlighted) {
                return (
                  <g>
                    {pulseRing}
                    <circle cx={cx} cy={cy} r={7} fill={color} stroke="#fff" strokeWidth={2.5} />
                  </g>
                );
              }

              return (
                <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.65}
                  stroke={color} strokeWidth={1.5} strokeOpacity={0.9} />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Highlighted gene info card */}
      {highlightedGene && (() => {
        const gene = scatterData.find(d => d.gene === highlightedGene);
        if (!gene) return null;
        const valueLabel = isActivityMode ? "Activity" : "Intensity";
        return (
          <div style={{
            position: "absolute",
            top: "4.5rem",
            right: "2rem",
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            fontSize: "0.825rem",
            maxWidth: "280px",
            zIndex: 10,
            opacity: 0,
            animation: "highlightFadeIn 0.3s ease forwards",
          }}>
            <style>{`@keyframes highlightFadeIn { to { opacity: 1; } }`}</style>
            <div style={{ fontWeight: "700", color: "#1f2937", marginBottom: "0.3rem", fontFamily: "monospace" }}>
              {gene.gene}
            </div>
            {gene.nickname && (
              <div style={{ color: "#6b7280", marginBottom: "0.3rem", fontSize: "0.75rem" }}>
                {gene.nickname}
              </div>
            )}
            <div style={{ color: mediaColors[scatterXAxis], marginBottom: "0.15rem" }}>
              {mediaLabels[scatterXAxis]} {valueLabel}: <strong>{gene.x?.toFixed(2)}</strong>
            </div>
            <div style={{ color: mediaColors[scatterYAxis] }}>
              {mediaLabels[scatterYAxis]} {valueLabel}: <strong>{gene.y?.toFixed(2)}</strong>
            </div>
            {isActivityMode && gene.xActivity && (
              <div style={{ fontSize: "0.7rem", color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: "0.3rem", marginTop: "0.3rem" }}>
                <div>{mediaLabels[scatterXAxis]}: peak@{gene.xActivity.peak_timepoint}h → min@{gene.xActivity.min_timepoint}h</div>
                <div>{mediaLabels[scatterYAxis]}: peak@{gene.yActivity.peak_timepoint}h → min@{gene.yActivity.min_timepoint}h</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Legend */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "1.5rem",
        marginTop: "0.5rem",
        fontSize: "0.8rem",
        color: "#6b7280",
        flexWrap: "wrap",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{
            width: "10px", height: "10px", borderRadius: "50%",
            backgroundColor: mediaColors[scatterXAxis], display: "inline-block",
          }} />
          Prefers {mediaLabels[scatterXAxis]}
        </span>
        <span style={{ color: "#e5e7eb" }}>|</span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{
            width: "10px", height: "10px", borderRadius: "50%",
            backgroundColor: mediaColors[scatterYAxis], display: "inline-block",
          }} />
          Prefers {mediaLabels[scatterYAxis]}
        </span>
        <span style={{ color: "#e5e7eb" }}>|</span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{
            width: "20px", height: "0",
            borderTop: "2px dashed #9ca3af",
            display: "inline-block",
          }} />
          Equal preference
        </span>
        <span style={{ color: "#e5e7eb" }}>|</span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: "inline-block" }}>
            <polygon points="6,1 11,6 6,11 1,6" fill="#1f2937" stroke="#1f2937" strokeWidth="1" />
          </svg>
          Benchmark
        </span>
      </div>
    </div>
  );
};

// --- Gene Substrate Card ---
const GeneSubstrateCard = ({ gene, geneData, isExpanded, onToggle, onScrollToScatter, activityData, isSelected, onSelectionChange }) => {
  const { nickname, accession, mediaData } = geneData;
  const mediaTypes = Object.keys(mediaData);
  // Flatten mediaData to the flat-array format ActivityLineChart expects
  const flatChartData = Object.entries(mediaData).flatMap(([media, points]) =>
    points.map(p => ({ timepoint_hours: p.timepoint, media, average_readout: p.average_readout, stddev_readout: p.stddev_readout }))
  );

  return (
    <div
      id={`gene-${gene}`}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        marginBottom: "0.75rem",
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "1rem 1.25rem",
          backgroundColor: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap", flex: "1" }}>
          {/* Selection checkbox */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange(gene);
            }}
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "4px",
              border: `2px solid ${isSelected ? "#059669" : "#d1d5db"}`,
              backgroundColor: isSelected ? "#059669" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
          >
            {isSelected && (
              <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <div>
            <span style={{
              fontSize: "0.7rem", fontWeight: "700", color: "#9ca3af",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>Gene ID</span>
            <div style={{
              fontSize: "1.1rem", fontWeight: "700", color: "#1f2937", fontFamily: "monospace",
            }}>{gene}</div>
          </div>

          {nickname && (
            <div>
              <span style={{
                fontSize: "0.7rem", fontWeight: "700", color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>Nickname</span>
              <div style={{ fontSize: "1.1rem", color: "#4b5563" }}>{nickname}</div>
            </div>
          )}

          {accession && (
            <div>
              <span style={{
                fontSize: "0.7rem", fontWeight: "700", color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>Accession</span>
              <div style={{ fontSize: "1.1rem", color: "#4b5563", fontFamily: "monospace" }}>{accession}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            {benchmarkEnzymes[accession] && (
              <span style={{
                padding: "0.2rem 0.55rem",
                backgroundColor: "#1f2937",
                color: "white",
                borderRadius: "4px",
                fontSize: "0.7rem",
                fontWeight: "700",
              }}>Benchmark</span>
            )}
            {mediaTypes.map(media => (
              <span key={media} style={{
                padding: "0.2rem 0.55rem",
                backgroundColor: mediaColors[media] || "#059669",
                color: "white",
                borderRadius: "4px",
                fontSize: "0.7rem",
                fontWeight: "700",
              }}>{media}</span>
            ))}
          </div>
        </div>

        <svg
          style={{
            width: "20px", height: "20px",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0, marginLeft: "1rem",
          }}
          fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: "0 1.25rem 1.25rem 1.25rem" }}>
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>

            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              {accession && (
                <Link
                  to={`/sequence/${accession}`}
                  style={{
                    color: "#2563eb", textDecoration: "none",
                    borderBottom: "2px solid transparent",
                    fontSize: "0.9rem", fontWeight: "500",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#2563eb"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                >
                  View sequence details for {accession} &rarr;
                </Link>
              )}
              <button
                onClick={onScrollToScatter}
                style={{
                  color: "#6b7280", background: "none", border: "none",
                  cursor: "pointer", fontSize: "0.9rem", fontWeight: "500",
                  padding: 0, borderBottom: "2px solid transparent",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#6b7280"; e.currentTarget.style.color = "#1f2937"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "#6b7280"; }}
              >
                &larr; Back to scatter plot
              </button>
            </div>

            {/* Chart */}
            {flatChartData.length > 0 && (
              <div style={{
                backgroundColor: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "6px",
                padding: "1rem",
              }}>
                <div style={{
                  fontSize: "0.875rem", fontWeight: "600",
                  color: "#065f46", marginBottom: "0.75rem",
                }}>
                  Activity Over Time
                </div>

                <ActivityLineChart data={flatChartData} />

                {/* Per-media stats */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "1rem", backgroundColor: "#dcfce7",
                  borderRadius: "4px", padding: "0.75rem",
                }}>
                  {mediaTypes.map(media => {
                    const points = mediaData[media];
                    const values = points.map(p => p.average_readout);
                    const avg = values.reduce((s, v) => s + v, 0) / values.length;
                    const max = Math.max(...values);
                    const min = Math.min(...values);
                    // Calculate pooled standard deviation
                    const stddevs = points.map(p => p.stddev_readout || 0).filter(s => s > 0);
                    const avgStddev = stddevs.length > 0
                      ? Math.sqrt(stddevs.reduce((sum, s) => sum + s * s, 0) / stddevs.length)
                      : 0;
                    // Get activity data for this media
                    const activity = activityData?.[media];

                    return (
                      <div key={media} style={{
                        backgroundColor: "white", borderRadius: "4px",
                        padding: "0.75rem",
                        border: `2px solid ${mediaColors[media] || "#059669"}`,
                      }}>
                        <div style={{
                          fontSize: "0.75rem", fontWeight: "600",
                          color: "#065f46", marginBottom: "0.5rem",
                        }}>{media}</div>

                        {/* Activity metric - prominent display */}
                        {activity && activity.activity !== null && (
                          <div style={{
                            backgroundColor: "#f0fdf4",
                            border: "1px solid #86efac",
                            borderRadius: "4px",
                            padding: "0.5rem",
                            marginBottom: "0.5rem",
                          }}>
                            <div style={{ fontSize: "0.65rem", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Activity (Peak → Min)
                            </div>
                            <div style={{ fontSize: "1.1rem", fontWeight: "800", color: mediaColors[media] || "#059669" }}>
                              {activity.activity.toFixed(2)}
                            </div>
                            <div style={{ fontSize: "0.65rem", color: "#6b7280", marginTop: "0.2rem" }}>
                              {activity.peak_value.toFixed(2)} @ {activity.peak_timepoint}h → {activity.min_value.toFixed(2)} @ {activity.min_timepoint}h
                            </div>
                            {activity.flag && (
                              <div style={{
                                fontSize: "0.6rem",
                                color: "#f59e0b",
                                marginTop: "0.2rem",
                                fontStyle: "italic",
                              }}>
                                {activity.flag.replace(/_/g, " ")}
                              </div>
                            )}
                          </div>
                        )}
                        {activity && activity.activity === null && (
                          <div style={{
                            backgroundColor: "#fef3c7",
                            border: "1px solid #fcd34d",
                            borderRadius: "4px",
                            padding: "0.5rem",
                            marginBottom: "0.5rem",
                            fontSize: "0.7rem",
                            color: "#92400e",
                          }}>
                            Activity: N/A ({activity.flag?.replace(/_/g, " ") || "insufficient data"})
                          </div>
                        )}

                        {/* Intensity stats */}
                        <div style={{ fontSize: "0.7rem", color: "#6b7280", marginBottom: "0.15rem" }}>
                          Avg Intensity: <strong style={{ color: "#059669" }}>{avg.toFixed(2)}</strong>
                          {avgStddev > 0 && <span> ± {avgStddev.toFixed(2)}</span>}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#6b7280", marginBottom: "0.15rem" }}>
                          Max: <strong style={{ color: "#059669" }}>{max.toFixed(2)}</strong>
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                          Min: <strong style={{ color: "#059669" }}>{min.toFixed(2)}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Download Controls ---
const DownloadControls = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDownloadIntensity,
  onDownloadActivity,
  disabled,
}) => (
  <div style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.25rem",
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  }}>
    {/* Selection controls */}
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <span style={{ fontSize: "0.875rem", color: "#4b5563", fontWeight: "500" }}>
        {selectedCount} of {totalCount} genes selected
      </span>
      <button
        onClick={onSelectAll}
        disabled={disabled || selectedCount === totalCount}
        style={{
          padding: "0.35rem 0.75rem",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          backgroundColor: selectedCount === totalCount ? "#f3f4f6" : "#fff",
          color: selectedCount === totalCount ? "#9ca3af" : "#374151",
          fontSize: "0.8rem",
          fontWeight: "500",
          cursor: selectedCount === totalCount || disabled ? "default" : "pointer",
          transition: "all 0.15s ease",
        }}
      >
        Select All
      </button>
      <button
        onClick={onDeselectAll}
        disabled={disabled || selectedCount === 0}
        style={{
          padding: "0.35rem 0.75rem",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          backgroundColor: selectedCount === 0 ? "#f3f4f6" : "#fff",
          color: selectedCount === 0 ? "#9ca3af" : "#374151",
          fontSize: "0.8rem",
          fontWeight: "500",
          cursor: selectedCount === 0 || disabled ? "default" : "pointer",
          transition: "all 0.15s ease",
        }}
      >
        Deselect All
      </button>
    </div>

    {/* Download buttons */}
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Download:</span>
      <button
        onClick={onDownloadIntensity}
        disabled={disabled || selectedCount === 0}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          border: "2px solid #059669",
          backgroundColor: selectedCount === 0 || disabled ? "#f3f4f6" : "#059669",
          color: selectedCount === 0 || disabled ? "#9ca3af" : "#fff",
          fontSize: "0.8rem",
          fontWeight: "600",
          cursor: selectedCount === 0 || disabled ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          transition: "all 0.15s ease",
        }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Intensity CSV
      </button>
      <button
        onClick={onDownloadActivity}
        disabled={disabled || selectedCount === 0}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          border: "2px solid #7c3aed",
          backgroundColor: selectedCount === 0 || disabled ? "#f3f4f6" : "#7c3aed",
          color: selectedCount === 0 || disabled ? "#9ca3af" : "#fff",
          fontSize: "0.8rem",
          fontWeight: "600",
          cursor: selectedCount === 0 || disabled ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          transition: "all 0.15s ease",
        }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Activity CSV
      </button>
    </div>
  </div>
);

// --- Main Page ---
const SubstratePage = () => {
  useScrollHeader();
  const [rawData, setRawData] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGenes, setExpandedGenes] = useState(new Set());
  const [activeSubstrates, setActiveSubstrates] = useState(new Set(["BHET12.5", "BHET25"]));
  const [scatterXAxis, setScatterXAxis] = useState("BHET12.5");
  const [scatterYAxis, setScatterYAxis] = useState("BHET25");
  const [highlightedGene, setHighlightedGene] = useState(null);
  const [activeTimepoint, setActiveTimepoint] = useState(null); // null = "All (avg)"
  const [plotMode, setPlotMode] = useState("intensity"); // "intensity" or "activity"
  const [selectedGenes, setSelectedGenes] = useState(new Set());

  const activeMediaString = useMemo(
    () => [...activeSubstrates].sort().join(","),
    [activeSubstrates]
  );

  // Fetch data when active substrates change
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${config.apiUrl}/plate-data/comparison?media=${activeMediaString}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const { timeseries, activity } = await res.json();

        if (!cancelled) {
          setRawData(timeseries);
          setActivityData(activity);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.toString());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeMediaString]);

  // Ensure scatter axes stay valid when substrates change
  useEffect(() => {
    const subs = [...activeSubstrates];
    if (subs.length >= 2) {
      if (!activeSubstrates.has(scatterXAxis)) setScatterXAxis(subs[0]);
      if (!activeSubstrates.has(scatterYAxis)) setScatterYAxis(subs[subs.length - 1]);
    }
  }, [activeSubstrates, scatterXAxis, scatterYAxis]);

  // Extract available timepoints from raw data
  const availableTimepoints = useMemo(() => {
    const tps = new Set(rawData.map(r => r.timepoint_hours));
    return [...tps].sort((a, b) => a - b);
  }, [rawData]);

  // Group raw data by gene
  const geneGroups = useMemo(() => {
    const groups = {};
    rawData.forEach(row => {
      if (!groups[row.gene]) {
        groups[row.gene] = {
          nickname: row.nickname,
          accession: row.accession,
          mediaData: {},
        };
      }
      if (!groups[row.gene].mediaData[row.media]) {
        groups[row.gene].mediaData[row.media] = [];
      }
      groups[row.gene].mediaData[row.media].push({
        timepoint: row.timepoint_hours,
        average_readout: parseFloat(row.average_readout),
        stddev_readout: row.stddev_readout ? parseFloat(row.stddev_readout) : 0,
        sample_count: parseInt(row.sample_count),
      });
    });
    return groups;
  }, [rawData]);

  // Index activity data by gene -> media for quick lookup
  const activityByGeneMedia = useMemo(() => {
    const index = {};
    activityData.forEach(row => {
      if (!index[row.gene]) index[row.gene] = {};
      index[row.gene][row.media] = {
        activity: row.activity,
        peak_value: row.peak_value,
        peak_timepoint: row.peak_timepoint,
        min_value: row.min_value,
        min_timepoint: row.min_timepoint,
        flag: row.flag,
        timepoint_count: row.timepoint_count,
      };
    });
    return index;
  }, [activityData]);

  // Initialize all genes as selected when geneGroups changes
  useEffect(() => {
    const allGenes = Object.keys(geneGroups);
    setSelectedGenes(new Set(allGenes));
  }, [geneGroups]);

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    setSelectedGenes(new Set(Object.keys(geneGroups)));
  }, [geneGroups]);

  const handleDeselectAll = useCallback(() => {
    setSelectedGenes(new Set());
  }, []);

  const handleToggleGeneSelection = useCallback((gene) => {
    setSelectedGenes(prev => {
      const next = new Set(prev);
      if (next.has(gene)) {
        next.delete(gene);
      } else {
        next.add(gene);
      }
      return next;
    });
  }, []);

  // CSV generation functions
  const generateIntensityCSV = useCallback(() => {
    const headers = [
      'gene_id',
      'nickname',
      'accession',
      'source',
      'substrate',
      'timepoint_hours',
      'average_intensity',
      'stddev_intensity',
      'sample_count',
    ];

    const rows = rawData
      .filter(row => selectedGenes.has(row.gene))
      .map(row => [
        row.gene,
        row.nickname || '',
        row.accession || '',
        row.source || '',
        row.media,
        row.timepoint_hours,
        row.average_readout,
        row.stddev_readout || '',
        row.sample_count,
      ]);

    return { headers, rows };
  }, [rawData, selectedGenes]);

  const generateActivityCSV = useCallback(() => {
    const headers = [
      'gene_id',
      'nickname',
      'accession',
      'source',
      'substrate',
      'activity',
      'peak_value',
      'peak_timepoint_hours',
      'min_value',
      'min_timepoint_hours',
      'flag',
      'timepoint_count',
    ];

    const rows = activityData
      .filter(row => selectedGenes.has(row.gene))
      .map(row => [
        row.gene,
        row.nickname || '',
        row.accession || '',
        row.source || '',
        row.media,
        row.activity !== null ? row.activity : '',
        row.peak_value !== null ? row.peak_value : '',
        row.peak_timepoint !== null ? row.peak_timepoint : '',
        row.min_value !== null ? row.min_value : '',
        row.min_timepoint !== null ? row.min_timepoint : '',
        row.flag || '',
        row.timepoint_count,
      ]);

    return { headers, rows };
  }, [activityData, selectedGenes]);

  const handleDownloadIntensity = useCallback(() => {
    const { headers, rows } = generateIntensityCSV();
    if (rows.length === 0) {
      alert('No genes selected for download.');
      return;
    }
    const csv = generateCSV(headers, rows);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `petadex_intensity_${timestamp}`);
  }, [generateIntensityCSV]);

  const handleDownloadActivity = useCallback(() => {
    const { headers, rows } = generateActivityCSV();
    if (rows.length === 0) {
      alert('No genes selected for download.');
      return;
    }
    const csv = generateCSV(headers, rows);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `petadex_activity_${timestamp}`);
  }, [generateActivityCSV]);

  // Compute hero stats per substrate
  const heroStats = useMemo(() => {
    const stats = {};
    [...activeSubstrates].forEach(substrate => {
      const rows = rawData.filter(r => r.media === substrate);
      if (rows.length === 0) {
        stats[substrate] = { geneCount: 0, meanActivity: 0, topGene: null, peakTimepoint: null };
        return;
      }

      const genes = new Set(rows.map(r => r.gene));
      const meanActivity = rows.reduce((sum, r) => sum + parseFloat(r.average_readout), 0) / rows.length;

      // Top gene: highest mean readout across timepoints
      const geneAvgs = {};
      rows.forEach(r => {
        if (!geneAvgs[r.gene]) geneAvgs[r.gene] = { sum: 0, count: 0 };
        geneAvgs[r.gene].sum += parseFloat(r.average_readout);
        geneAvgs[r.gene].count += 1;
      });
      let topGene = null;
      let topAvg = -Infinity;
      Object.entries(geneAvgs).forEach(([gene, { sum, count }]) => {
        const avg = sum / count;
        if (avg > topAvg) { topAvg = avg; topGene = gene; }
      });

      // Peak timepoint: highest mean readout across all genes
      const tpAvgs = {};
      rows.forEach(r => {
        const tp = r.timepoint_hours;
        if (!tpAvgs[tp]) tpAvgs[tp] = { sum: 0, count: 0 };
        tpAvgs[tp].sum += parseFloat(r.average_readout);
        tpAvgs[tp].count += 1;
      });
      let peakTimepoint = null;
      let peakAvg = -Infinity;
      Object.entries(tpAvgs).forEach(([tp, { sum, count }]) => {
        const avg = sum / count;
        if (avg > peakAvg) { peakAvg = avg; peakTimepoint = parseFloat(tp); }
      });

      stats[substrate] = { geneCount: genes.size, meanActivity, topGene, peakTimepoint };
    });
    return stats;
  }, [rawData, activeSubstrates]);

  // Compute scatter data: per-gene value for each axis substrate
  // If plotMode is "activity", use activity values; otherwise use intensity values
  // If activeTimepoint is null, average across all timepoints; otherwise use specific timepoint
  const scatterData = useMemo(() => {
    if (plotMode === "activity") {
      // Activity mode: use peak - min values
      return Object.entries(geneGroups)
        .map(([gene, data]) => {
          const xActivity = activityByGeneMedia[gene]?.[scatterXAxis];
          const yActivity = activityByGeneMedia[gene]?.[scatterYAxis];

          // Skip if no activity data or activity is null (peak at end)
          if (!xActivity || !yActivity) return null;
          if (xActivity.activity === null || yActivity.activity === null) return null;

          return {
            gene,
            nickname: data.nickname,
            accession: data.accession,
            x: xActivity.activity,
            y: yActivity.activity,
            xActivity,
            yActivity,
          };
        })
        .filter(Boolean);
    }

    // Intensity mode: use raw readout values
    return Object.entries(geneGroups)
      .map(([gene, data]) => {
        const xMedia = data.mediaData[scatterXAxis];
        const yMedia = data.mediaData[scatterYAxis];
        if (!xMedia || !yMedia) return null;

        let xVal, yVal;

        if (activeTimepoint === null) {
          // Average across all timepoints
          xVal = xMedia.reduce((s, p) => s + p.average_readout, 0) / xMedia.length;
          yVal = yMedia.reduce((s, p) => s + p.average_readout, 0) / yMedia.length;
        } else {
          // Use specific timepoint
          const xPoint = xMedia.find(p => p.timepoint === activeTimepoint);
          const yPoint = yMedia.find(p => p.timepoint === activeTimepoint);
          if (!xPoint || !yPoint) return null;
          xVal = xPoint.average_readout;
          yVal = yPoint.average_readout;
        }

        if (isNaN(xVal) || isNaN(yVal)) return null;

        return { gene, nickname: data.nickname, accession: data.accession, x: xVal, y: yVal };
      })
      .filter(Boolean);
  }, [geneGroups, activityByGeneMedia, scatterXAxis, scatterYAxis, activeTimepoint, plotMode]);

  const toggleSubstrate = (substrate) => {
    setActiveSubstrates(prev => {
      const next = new Set(prev);
      if (next.has(substrate)) {
        if (next.size <= 1) return prev;
        next.delete(substrate);
      } else {
        next.add(substrate);
      }
      return next;
    });
  };

  const toggleGene = (gene) => {
    setExpandedGenes(prev => {
      const next = new Set(prev);
      if (next.has(gene)) next.delete(gene);
      else next.add(gene);
      return next;
    });
  };

  const handleScatterDotClick = (gene) => {
    setExpandedGenes(prev => new Set([...prev, gene]));
    setTimeout(() => {
      const el = document.getElementById(`gene-${gene}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleScrollToScatter = (gene) => {
    setHighlightedGene(gene);
    const el = document.getElementById("substrate-scatter");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedGene(null), 3000);
  };

  const geneEntries = Object.entries(geneGroups);

  return (
    <>

      <section style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        paddingTop: "2rem",
      }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{
            fontSize: "2.5rem",
            marginBottom: "0.5rem",
            color: "#2c3e50",
          }}>
            Substrate Activity Comparison
          </h1>
          <p style={{
            color: "#666",
            fontSize: "1.1rem",
            marginBottom: "1.5rem",
          }}>
            Compare enzyme activity across BHET substrates at different concentrations
          </p>
        </div>

        {/* Substrate Toggle Chips */}
        <SubstrateToggle
          activeSubstrates={activeSubstrates}
          onToggle={toggleSubstrate}
        />

        {/* Plot Mode Toggle */}
        <PlotModeToggle
          plotMode={plotMode}
          onModeChange={setPlotMode}
        />

        {/* Timepoint Toggle Chips (only in intensity mode) */}
        {plotMode === "intensity" && (
          <TimepointToggle
            availableTimepoints={availableTimepoints}
            activeTimepoint={activeTimepoint}
            onSelect={setActiveTimepoint}
          />
        )}

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#666", fontStyle: "italic" }}>
            Loading substrate data...
          </div>
        ) : error ? (
          <div style={{
            padding: "2rem", textAlign: "center", color: "#dc2626",
            backgroundColor: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca",
          }}>
            Error loading data: {error}
          </div>
        ) : geneEntries.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
            No substrate data available.
          </div>
        ) : (
          <>
            {/* VS Hero Banner */}
            <SubstrateHero heroStats={heroStats} activeSubstrates={activeSubstrates} />

            {/* Scatter Plot (only when 2+ substrates active) */}
            {activeSubstrates.size >= 2 && scatterXAxis !== scatterYAxis && (
              <SubstrateScatter
                scatterData={scatterData}
                activeSubstrates={activeSubstrates}
                scatterXAxis={scatterXAxis}
                scatterYAxis={scatterYAxis}
                onXAxisChange={setScatterXAxis}
                onYAxisChange={setScatterYAxis}
                onDotClick={handleScatterDotClick}
                highlightedGene={highlightedGene}
                activeTimepoint={activeTimepoint}
                plotMode={plotMode}
              />
            )}

            {/* Download Controls */}
            <DownloadControls
              selectedCount={selectedGenes.size}
              totalCount={geneEntries.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onDownloadIntensity={handleDownloadIntensity}
              onDownloadActivity={handleDownloadActivity}
              disabled={loading}
            />

            {/* Gene Cards */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "1rem",
            }}>
              <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                Showing {geneEntries.length} {geneEntries.length === 1 ? "gene" : "genes"} with substrate data
              </div>
              {scatterData.length > 0 && (
                <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                  {scatterData.length} genes have {plotMode === "activity" ? "activity" : "data"} for both selected substrates
                  {plotMode === "intensity" && activeTimepoint !== null && ` at ${activeTimepoint}h`}
                </div>
              )}
            </div>

            {geneEntries.map(([gene, geneData]) => (
              <GeneSubstrateCard
                key={gene}
                gene={gene}
                geneData={geneData}
                isExpanded={expandedGenes.has(gene)}
                onToggle={() => toggleGene(gene)}
                onScrollToScatter={() => handleScrollToScatter(gene)}
                activityData={activityByGeneMedia[gene]}
                isSelected={selectedGenes.has(gene)}
                onSelectionChange={handleToggleGeneSelection}
              />
            ))}
          </>
        )}
      </section>
    </>
  );
};

export default SubstratePage;

export const Head = () => (
  <Seo
    title="Substrate Activity Comparison"
    description="Compare enzyme activity on BHET substrates at different concentrations for plastic-degrading enzymes"
  />
);
