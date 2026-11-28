---
inclusion: always
---

# Development Workflow

How all development and coding work is done on this project: branches, commits, secrets, and how code moves from a developer's machine to production. These rules apply to every change: code, docs, configuration and workflows.

The repository is on GitHub Free, so GitHub does not enforce branch protection. These rules are the only protection, and must be followed exactly.

## Branches

| Branch | Purpose | Who writes to it | Deploys to |
|---|---|---|---|
| `main` | Production | Pull request merged by the user | Production VM |
| `dev` | Integration of finished work | Commits, and merges from `feature/*` and `fix/*` | Nothing |
| `feature/<short-name>` | New work, for example `feature/player-directory` | Commits | Nothing |
| `fix/<short-name>` | Bug fixes, for example `fix/offer-expiry-time` | Commits | Nothing |

- `main` and `dev` are permanent. They are never deleted, renamed or rewritten.
- `feature/*` and `fix/*` branches are short-lived. They start from the latest `dev`, merge back into `dev`, and are deleted after the merge.
- Branch names are lower case, with words separated by hyphens.
- An urgent production fix still goes `fix/*` → `dev` → `main`. There is no shortcut into `main`.

### Staging (later)

There is no staging environment until the first version is launched. After launch, a permanent `staging` branch and a staging VM are added, and the flow becomes `dev` → `staging` → `main`, so nothing reaches production without being tested on staging first. From then on, `staging` follows the same rules as `main`: no direct commits, pushes or merges by the agent. This guide is updated when staging is added.

## Rules for the agent

1. **Never commit to `main`** (or `staging`, once it exists). Before every commit, check the current branch with `git branch --show-current`. If it is `main` or `staging`, stop, and move the work to `dev` or a new `feature/*` or `fix/*` branch first.
2. **Never push to `main`** (or `staging`). Pushes go only to `dev`, `feature/*` and `fix/*`.
3. **Never merge into `main`** (or `staging`), locally or on GitHub. Promotion is done by the user through a pull request. The agent may prepare the pull request description when asked.
4. **Work on a short-lived branch by default.** Use `feature/*` for new work and `fix/*` for bug fixes. Small, self-contained changes (for example a docs correction) may be committed on `dev` directly.
5. **Start from the latest `dev`:** `git fetch origin`, then create the branch from `origin/dev`.
6. **Merge into `dev` only after the checks pass** (lint, type check, tests and build, as listed in the implementation docs). Prefer a pull request; a local merge followed by `git push origin dev` is allowed when the user asks for it.
7. **No history rewriting on shared branches:** no force push, no `git reset --hard`, no rebase of `dev` or `main`. Rebasing your own unpushed `feature/*` or `fix/*` branch is fine.
8. **Commit only what was asked,** naming files explicitly in `git add`. Never commit secrets, `.env.*` files (except `.env.example`), database dumps or the `wp-db-export/` folder.
9. **Commit messages:** one line in the imperative ("Add player directory filters"), with more detail in the body if needed.
10. **Ask before deleting** a branch that has not been merged.

## Promotion through pull requests

1. `feature/*` or `fix/*` → `dev`: pull request, checks must pass.
2. `dev` → `main`: pull request opened and merged by the user. Merging deploys to production.

## Secrets and environment files

| Where | What | Stored in |
|---|---|---|
| GitHub Actions secrets | Deployment values only: VM host, SSH user and key, registry and Google Cloud identity settings | Repository secrets, prefixed per environment: `PROD_*` now, `STAGING_*` later |
| `.env.local` | Application secrets and settings for local development | The developer's machine |
| `.env.prod` | Application secrets and settings for production | The production VM only, readable by the deploy user |
| `.env.staging` | The same for staging, once it exists | The staging VM only |
| `.env.example` | Every variable name with an empty or dummy value, and a comment on what it is for | Committed to the repository |

- `.env.local`, `.env.prod` and `.env.staging` are git-ignored and never committed, copied into images, printed in logs or written to workflow output.
- A new variable is added to `.env.example` in the same commit as the code that needs it.
- GitHub Free has no environment-scoped secrets for private repositories, so the per-environment prefix keeps production and staging values apart.

## CI/CD with GitHub Actions and Docker Compose

| Workflow | Runs on | What it does |
|---|---|---|
| `ci.yml` | Every push to `dev`, `feature/*`, `fix/*`, and every pull request | Install, lint, type check, tests, build. No deployment. |
| `deploy-production.yml` | Push to `main` (that is, a merged pull request) | Checks, then build and deploy to the production VM |
| `deploy-staging.yml` | Added after launch: push to `staging` | The same steps for the staging VM |

**Deploy steps** (`01` design section 16.3):
1. Run the CI checks again on the merged code.
2. Build the `web`, `realtime` and `worker` Docker images, tagged with the commit SHA.
3. Push them to the container registry (Google Artifact Registry in `europe-west2`).
4. Connect to the VM over SSH, using the `PROD_*` secrets.
5. On the VM, with the production Compose file and `.env.prod`: `docker compose pull`, run the database migrations in a one-off `web` container, then `docker compose up -d`.
6. Check `/api/health`. If it fails, redeploy the previous image tag and alert.

- **Authentication to Google Cloud** uses Workload Identity Federation (OIDC), so no Google service-account key is stored in GitHub.
- **Production runs the image built from the merged commit,** never one rebuilt from other code.
- **The agent does not run deployments** and does not edit the deployment workflows unless the user asks.
