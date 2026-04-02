import React, { useState } from "react";

// Taylor amino acid color scheme (background colors)
const aaColors = {
  A: "#ccff00", V: "#99ff00", I: "#66ff00", L: "#33ff00",
  M: "#00ff00", F: "#00ff66", Y: "#00ffcc", W: "#00ccff",
  H: "#0066ff", R: "#0000ff", K: "#6600ff", N: "#cc00ff",
  Q: "#ff00cc", E: "#ff0066", D: "#ff0000", S: "#ff3300",
  T: "#ff6600", G: "#ff9900", P: "#ffcc00", C: "#ffff00"
};

const nucleotideColors = {
  A: "#00ff00", T: "#ff0000", G: "#ffff00",
  C: "#0000ff", U: "#ff00ff"
};

// Responsive line wrapping
const wrapSequence = (seq) => {
  if (!seq || typeof seq !== 'string') return [];
  const lineLengths = { sm: 50, md: 60, lg: 80, xl: 100 };
  const lineLength = lineLengths.lg;
  return seq.match(new RegExp(`.{1,${lineLength}}`, "g")) || [];
};

export default function SequenceViewer({ nucleotideSequence, aminoAcidSequence }) {
  const [sequenceType, setSequenceType] = useState("amino-acid");

  const currentSequence = sequenceType === "nucleotide" ? nucleotideSequence : aminoAcidSequence;
  const colorScheme = sequenceType === "nucleotide" ? nucleotideColors : aaColors;
  console.log(currentSequence)
  const lines = wrapSequence(currentSequence);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Toggle Controls */}
      {nucleotideSequence !== null && aminoAcidSequence !== null &&
        <fieldset className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <legend className="sr-only">Sequence Type</legend>

          <label className="flex items-center cursor-pointer p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
            <input
              type="radio"
              value="amino-acid"
              checked={sequenceType === "amino-acid"}
              onChange={(e) => setSequenceType(e.target.value)}
              className="w-5 h-5 text-brand-500 focus:ring-brand-500 mr-3 rounded-full shadow-sm"
            />
            <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 group-hover:text-brand-600">
              Amino Acid
            </span>
          </label>

          <label className="flex items-center cursor-pointer p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group" >
            <input
              type="radio"
              value="nucleotide"
              checked={sequenceType === "nucleotide"}
              onChange={(e) => setSequenceType(e.target.value)}
              className="w-5 h-5 text-brand-500 focus:ring-brand-500 mr-3 rounded-full shadow-sm"
            />
            <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 group-hover:text-brand-600">
              Nucleotide
            </span>
          </label >
        </fieldset >
      }

      {/* Sequence Display - FULLY CONTAINED */}
      < div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden" >
        {
          lines.length > 0 ? (
            <div className="font-mono p-6 sm:p-8 w-full">
              {lines.map((line, idx) => (
                <div key={idx} className="mb-3 sm:mb-4 last:mb-0 flex flex-wrap gap-px">
                  {line.split("").map((char, i) => (
                    <span
                      key={i}
                      className="inline-block text-black/90 dark:text-white/90 px-0.5 sm:px-0.5 rounded font-medium leading-tight text-xs sm:text-sm min-w-[1.1em] text-center align-baseline shrink-0 basis-auto"
                      style={{
                        backgroundColor: colorScheme[char] || "#f3f4f6",
                        minHeight: "1.4em"
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 sm:p-16 text-center">
              <div className="w-16 h-16 bg-gray-200/50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 0v6m0-6H5m11 0v6m-6 0h6m-6-6V7m11 0v6m-6 0H9" />
                </svg>
              </div>
              <p className="text-lg sm:text-xl font-medium text-gray-500 dark:text-gray-400">
                {sequenceType === "nucleotide" ? "Nucleotide sequence not available" : "No sequence available"}
              </p>
              <p className="text-sm text-gray-400 mt-1">Please select a valid sequence</p>
            </div>
          )
        }
      </ div>

      {/* Sequence Info */}
      {
        currentSequence && (
          <div className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
            <p className="text-sm sm:text-base text-blue-800 dark:text-blue-200">
              Length: <span className="font-mono bg-blue-100/50 dark:bg-blue-900/50 px-2 py-1 rounded font-semibold">{currentSequence.length}</span> {sequenceType === 'nucleotide' ? 'bp' : 'aa'}
            </p>
          </div>
        )
      }
    </div >
  );
}
