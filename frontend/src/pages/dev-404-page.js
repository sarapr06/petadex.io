import * as React from "react"
import { Link } from "gatsby"
import Seo from "../components/seo"

/**
 * Development 404 shell (`/dev-404-page/`). Gatsby preloads this route during `gatsby develop`.
 * Production continues to use `404.js`.
 */
export default function Dev404Page({ location }) {
  const path = location?.pathname ?? ""
  return (
    <section className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 py-20">
      <h1 className="text-3xl font-bold text-foreground mb-2">Page not found (dev)</h1>
      <p className="text-muted-foreground mb-4">
        No match for{" "}
        <code className="font-mono text-sm bg-muted px-1 rounded">{path}</code>
      </p>
      <Link to="/" className="text-accent underline-offset-4 hover:underline">
        Back home
      </Link>
    </section>
  )
}

export const Head = () => <Seo title="Dev 404" />
