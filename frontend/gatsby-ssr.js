import React from 'react'
import { ThemeProvider } from './src/context/ThemeContext'
import Layout from './src/components/layout'

export const onRenderBody = ({ setPreBodyComponents }) => {
  setPreBodyComponents([
    <script
      key="theme-init"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var saved = localStorage.getItem('theme');
            var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            var theme = saved || preferred;
            if (theme === 'dark') document.documentElement.classList.add('dark');
          })();
        `
      }}
    />
  ])
}

export const wrapRootElement = ({ element }) => (
  <ThemeProvider>{element}</ThemeProvider>
)

export const wrapPageElement = ({ element, props }) => (
  <Layout {...props}>{element}</Layout>
)
