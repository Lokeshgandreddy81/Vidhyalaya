# Git Branch & Release Workflow

This document defines the standardized Git workflow for the **Vidhyalaya** repository. Adhering to this workflow ensures development velocity, code stability, security validation, and safe production deployment.

---

## 1. Branch Taxonomy

The repository maintains exactly three permanent branches. All other branches are short-lived.

```mermaid
gitGraph
    commit id: "v1.0.0" tag: "v1.0.0"
    branch dev
    checkout dev
    commit id: "Feature A initial"
    branch feature-a
    checkout feature-a
    commit id: "Add logic"
    commit id: "Add UI"
    checkout dev
    merge feature-a id: "Merge feature-a"
    branch test
    checkout test
    merge dev id: "Staging deployment"
    commit id: "Fix bugs"
    checkout dev
    merge test id: "Backport fixes"
    checkout main
    merge test id: "Release v1.1.0" tag: "v1.1.0"
```

### Permanent Branches

1. **`main` (Production)**
   - **Purpose**: Stable, production-ready code.
   - **Protection**: 
     - Directly pushing to `main` is strictly prohibited.
     - Merges must occur only via Pull Requests from `test` or `hotfix/*` branches.
     - Requires passing automated build/test checks.
   - **State**: Must always represent what is currently deployed in production.

2. **`dev` (Development)**
   - **Purpose**: Primary integration branch for active development.
   - **State**: Stable enough for development team integration.
   - **Ingress**: Feature branches (`feature/*`) are merged into `dev` after review.

3. **`test` (Staging / QA)**
   - **Purpose**: Release candidate validation and quality assurance.
   - **State**: Staging environment state.
   - **Ingress**: Merges from `dev` when preparing for a release cycle, or `hotfix/*` for verification.
   - **Egress**: Merges into `main` after verification, and back-merges into `dev` to sync hotfixes/bug patches.

---

## 2. Workflows

### A. Feature Development Workflow

All new features, chores, or routine refactors must follow this workflow:

1. **Create Feature Branch**:
   Create a branch from `dev` (not `main`):
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```
2. **Commit Changes**:
   Follow conventional commits (e.g., `feat:`, `fix:`, `chore:`, `test:`).
3. **Open Pull Request**:
   Target the `dev` branch.
4. **Code Review & CI/CD**:
   Ensure all tests pass and a colleague reviews the PR.
5. **Merge**:
   Squash and merge the PR into `dev` on GitHub, then delete the feature branch.

### B. Testing & Staging Workflow

When a set of features is ready for QA/Staging:

1. **Sync `test` with `dev`**:
   Open a pull request from `dev` to `test`.
   ```bash
   git checkout test
   git pull origin test
   git merge origin/dev
   git push origin test
   ```
2. **Deploy to Staging**:
   Staging builds automatically deploy from the `test` branch.
3. **Verification**:
   Conduct automated test runs, end-to-end user tests, and manual verification on the staging site.
4. **Bug Fixing in Staging**:
   If bugs are found in staging:
   - Fix them directly on a local branch created from `test`.
   - Merge them back to `test` via PR.
   - **Crucial**: Back-port the fixes back to `dev` so development does not drift:
     ```bash
     git checkout dev
     git pull origin dev
     git merge test
     git push origin dev
     ```

### C. Release Workflow

Once the `test` branch is verified and approved for production release:

1. **Open Release PR**:
   Create a Pull Request from `test` into `main`.
2. **Review & Merge**:
   Merge the PR to `main`.
3. **Tag the Release**:
   Create a semantic tag from `main`:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.x.x -m "Release version 1.x.x - Summary of changes"
   git push origin v1.x.x
   ```
4. **Deploy**:
   Production deployment is automatically triggered by pushing to `main` or tags.

### D. Emergency Hotfix Workflow

If a critical vulnerability or bug is discovered in production:

1. **Create Hotfix Branch**:
   Create a branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug-fix
   ```
2. **Implement Fix**:
   Develop the fix, run tests locally, and commit.
3. **Targeted Testing**:
   Open a PR into `test` branch first to verify the fix in the staging environment.
4. **Deploy & Validate on Staging**:
   Deploy and verify the hotfix in staging.
5. **Promote to Production**:
   Merge the hotfix PR into `main` and tag:
   ```bash
   git checkout main
   git merge hotfix/critical-bug-fix
   git push origin main
   ```
6. **Backport to Development**:
   Merge the fix into `dev`:
   ```bash
   git checkout dev
   git merge main
   git push origin dev
   ```

---

## 3. Best Practices & Rules

- **No Force Pushes**: Never run `git push --force` on `main`, `dev`, or `test`.
- **Short-Lived Feature Branches**: Feature branches should not live longer than 2 weeks to prevent merge hell.
- **Pruning**: Delete local and remote feature branches immediately after they are merged.
- **Rebase Before PR**: Before opening a PR to `dev`, rebase your branch on `dev` to resolve conflicts early.
