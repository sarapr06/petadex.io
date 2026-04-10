import * as React from "react"
import SiteHeader from "./SiteHeader"
import Footer from "./footer"

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main role="main" className="flex flex-col flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default Layout
