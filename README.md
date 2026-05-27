## PETadex.io [Under construction]

PETadex.io is an open‑source platform for exploring plastic‑degrading enzymes. The repository has two‑tiers

```
petadex.io/
├── backend/     - Node/Express API (PostgreSQL – fastaa table)
├── frontend/    - Gatsby static site (served by GitHub Pages)
├── .github/     - Workflows & AI helpers
└── docs/        - OpenAPI spec & misc assets
```

### Local quick start (development server)
#### clone & enter repo
 `git clone https://github.com/ababaian/petadex.io.git && cd petadex.io`

#### backend → http://localhost:3001
``` 
 cd backend && cp .env.example .env  # fill in DB creds
 npm ci && npm run dev
```

#### frontend → http://localhost:8000
```
 <!-- Do the following in new terminal  -->
 cd ../frontend && npm ci
 npm run develop
```

### Production architecture

The backend runs **serverless** on AWS Lambda behind API Gateway (no EC2/NGINX/PM2 — see issue #79 for the EC2→Lambda migration).

```
┌───────────────┐    HTTPS    ┌──────────────┐      ┌─────────────────────┐   5432   ┌───────────────┐
│  GitHub Pages │  petadex.net│  API Gateway │ ───► │  Lambda (in VPC)    │ ───────► │ PostgreSQL RDS│
│  (Gatsby)     │ ──────────► │  (HTTP API)  │      │  petadex-backend    │          │   petadex     │
└──────┬────────┘             └──────────────┘      │  Express via        │          └───────────────┘
       │                                            │  serverless-http    │
       │ atlas (large payload)                      └───────┬─────────────┘
       ▼                                                    │ invoke / read+write
┌──────────────────────────┐                        ┌───────▼──────────────┐
│ S3 (petadex bucket)      │ ◀── atlas/umap.json.gz │ MMseqs2 search Lambda │
│ public, gzipped, CORS    │                        │ + S3 results bucket   │
└──────────────────────────┘                        └───────────────────────┘
```

- **GitHub Pages** hosts the static site built from `/frontend`; `GATSBY_API_URL` points at the API Gateway endpoint.
- **API Gateway (HTTP API)** routes every path/method (`/{proxy+}`, `/`) to a single Lambda.
- **Lambda `petadex-backend`** runs the Express app via a serverless handler (`src/handler.js`); VPC-bound (`timeout: 29s`, `memorySize: 512`, DB pool `max: 2`, read-only DB user).
- **PostgreSQL RDS** stores enzyme sequences (`fastaa` table) and related datasets.
- **S3 (`petadex` bucket)** serves the large family-atlas UMAP payload as a gzipped static object (`atlas/umap.json.gz`) — it exceeds Lambda's 6 MB response limit, so it bypasses the API. Regenerate with `cd backend && npm run export-atlas`. Sequence search results also live in S3.

#### CI/CD overview

| Workflow                   | Path                | Purpose                                                                                          |
| -------------------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| **frontend-ci-deploy.yml** | `.github/workflows` | Builds Gatsby from `/frontend`, injects `GATSBY_API_URL`, deploys to GitHub Pages.               |
| **backend-ci-deploy.yml**  | `.github/workflows` | On push to `backend/**`: `npm ci` + `npm test`, then `npx serverless@3 deploy` to AWS Lambda.    |

All sensitive values (DB creds, API URL, AWS keys) live in **GitHub Secrets**.

### Contributing
PETadex community — feel free to open issues & PRs!

1. Fork & branch from `main`.
2. Run `npm run lint` in both sub‑projects.
3. Add or update unit tests (`backend/tests`, `frontend/src/__tests__`).
4. PR → CI must pass.


