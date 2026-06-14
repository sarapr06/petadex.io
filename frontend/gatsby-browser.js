import React from 'react'
import { ThemeProvider } from './src/context/ThemeContext'
import Layout from './src/components/layout'
import './src/styles/global.css';

export const wrapRootElement = ({ element }) => (
  <ThemeProvider>{element}</ThemeProvider>
)

export const wrapPageElement = ({ element, props }) => (
  <Layout {...props}>{element}</Layout>
)

/** Recover from stale webpack chunks after `gatsby develop` restarts. */
export const onClientEntry = () => {
  const reloadOnChunkError = (/** @type {unknown} */ reason) => {
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : ""
    if (/Loading chunk .+ failed/i.test(message)) {
      const key = "gatsby-chunk-reload"
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1")
        window.location.reload()
      }
    }
  }

  window.addEventListener("unhandledrejection", event => {
    reloadOnChunkError(event.reason)
  })
}
