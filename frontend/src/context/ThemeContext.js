// src/context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Light mode is temporarily disabled — theme is forced to dark.
  const [dark] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('light');
    }
  }, []);

  // No-op while light mode is disabled.
  const toggle = () => {};

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
