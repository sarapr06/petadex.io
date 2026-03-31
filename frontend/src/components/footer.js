import * as React from "react"
import { Link } from "gatsby"

const Footer = () => {
  return (
    <footer role="contentinfo" className="ui-section-footer">
      <div className="ui-layout-container">
        <div className="ui-section-footer__layout ui-layout-flex">
          {/* COPYRIGHT */}
          <p className="ui-section-footer--copyright ui-text-note">
            <small>&copy; {new Date().getFullYear()} PETadex</small>
          </p>
          {/* MENU */}
          <nav role="navigation" className="ui-section-footer--nav ui-section-footer--menu ui-layout-flex">
            <Link to="/fastaa" role="link" aria-label="Database" className="ui-text-note">
              <small>Database</small>
            </Link>
            <a href="https://github.com/ababaian/petadex.io"  aria-label="GitHub" className="ui-text-note">
              <small>GitHub</small>
            </a>
            <a href="https://github.com/ababaian/petadex.io#contributing" aria-label="Contribute" className="ui-text-note">
              <small>Contribute</small>
            </a>
          </nav>
          {/* SOCIAL */}
          <nav role="navigation" className="ui-section-footer--nav ui-section-footer--social ui-layout-flex">
            <a href="https://github.com/ababaian/petadex.io" aria-label="GitHub">
              <svg viewBox="0 0 24 24" height="16" width="16" fill="none" stroke="#AEAEAE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" role="img" aria-label="GitHub">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export default Footer;
