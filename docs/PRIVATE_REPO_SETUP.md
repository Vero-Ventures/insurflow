# Private Repository Setup Guide

## Issues Found After Moving to Private Repo

After transitioning InsurFlow to a private repository, several automated security and code quality tools require reconfiguration. This document outlines the issues and solutions.

---

## 🚨 Critical: GitHub Advanced Security Required

**Root Cause:** Code scanning features (CodeQL, Trivy SARIF upload, Dependency Review) require GitHub Advanced Security to be enabled for private repositories.

### Enable GitHub Advanced Security

1. Go to repository settings: https://github.com/Vero-Ventures/insurflow/settings/security_analysis
2. Under "Code security and analysis", enable:
   - ✅ **Dependency graph** (free for all repos)
   - ✅ **Dependabot alerts** (free for all repos)
   - ✅ **Dependabot security updates** (free for all repos)
   - ✅ **Code scanning** → "Set up" → Select "GitHub Actions"
   - ✅ **Secret scanning** (requires GitHub Advanced Security license)

**Note:** GitHub Advanced Security requires a paid license for private repositories. This provides:

- CodeQL code scanning
- Secret scanning
- Dependency review on pull requests
- Security overview and insights

### Alternative: Disable Security Scanning Workflows

If GitHub Advanced Security cannot be enabled immediately, you can temporarily disable these workflows to prevent PR check failures:

```bash
# Disable CodeQL
gh workflow disable codeql.yml

# Disable Security Scan (Trivy)
gh workflow disable security.yml
```

**Recommended:** Keep SonarCloud enabled as it works independently without GitHub Advanced Security.

---

## Errors and Solutions

### 1. CodeQL: "Advanced Security must be enabled"

**Error:**

```
##[error]Please verify that the necessary features are enabled:
Advanced Security must be enabled for this repository to use code scanning.
```

**Solution:** Enable GitHub Advanced Security (see above) or disable the CodeQL workflow.

**Workflow:** `.github/workflows/codeql.yml`

---

### 2. Trivy: "Resource not accessible by integration"

**Error:**

```
##[error]Resource not accessible by integration
```

**Root Cause:** The workflow needs explicit `security-events: write` permission to upload SARIF files.

**Solution:** GitHub Advanced Security must be enabled. The workflow already has correct permissions:

```yaml
permissions:
  contents: read
  security-events: write
```

**Workflow:** `.github/workflows/security.yml`

---

### 3. Dependency Review: "Not supported on this repository"

**Error:**

```
##[error]Dependency review is not supported on this repository.
Please ensure that Dependency graph is enabled along with GitHub Advanced Security.
```

**Solution:**

1. Enable Dependency graph (free)
2. Enable GitHub Advanced Security (paid for private repos)

Or remove the `dependency-review` job from `.github/workflows/security.yml` if not using Advanced Security.

---

## ✅ Working Services

These services are working correctly with private repositories:

### SonarCloud ✅

- **Status:** Working
- **Configuration:** Uses `SONAR_TOKEN` secret
- **Workflow:** `.github/workflows/sonarcloud.yml`
- **Note:** Has `continue-on-error: true` until baseline scan completes

### CI Pipeline ✅

- **Status:** Working
- **Workflow:** `.github/workflows/ci.yml`
- **Tests:** Lint, TypeScript, Unit tests, E2E tests, Build

### Dependabot ✅

- **Status:** Working
- **Note:** Dependabot updates work without Advanced Security, but Dependency Review on PRs requires it

### GitGuardian ✅

- **Status:** Working
- **Workflow:** `.github/workflows/ggshield.yml`
- **Note:** Secret scanning that works independently

### Chromatic ✅

- **Status:** Working
- **Workflow:** `.github/workflows/chromatic.yml`
- **Note:** Visual regression testing for Storybook

---

## Workflow Permissions Summary

All workflows have been configured with minimal necessary permissions following the principle of least privilege:

| Workflow         | Permissions                                                 | Notes                      |
| ---------------- | ----------------------------------------------------------- | -------------------------- |
| CI               | `contents: read`                                            | No write access needed     |
| CodeQL           | `actions: read`, `contents: read`, `security-events: write` | Requires Advanced Security |
| Security (Trivy) | `contents: read`, `security-events: write`                  | Requires Advanced Security |
| SonarCloud       | Default (inherits from `GITHUB_TOKEN`)                      | Works with private repos   |
| GitGuardian      | `contents: read`, `issues: write`, `pull-requests: write`   | Independent service        |

---

## Vercel Deployment

**Status:** To be verified

Vercel should automatically work with private repositories if the GitHub App has proper permissions:

1. Go to https://vercel.com/vero-ventures/insurflow/settings/git
2. Ensure the GitHub App connection shows "Connected" status
3. Test a deployment from a PR
4. Verify Preview URLs are generated correctly

**If deployment fails:**

- Check Vercel logs for authentication errors
- Verify GitHub App permissions at https://github.com/settings/installations
- Ensure Vercel has access to the private repository

---

## Recommended Action Plan

### Immediate (Required for CI to pass)

1. **Option A: Enable GitHub Advanced Security** (recommended)
   - Contact GitHub admin to enable license
   - Enable all code security features
   - Re-run failed workflows

2. **Option B: Disable Security Workflows** (temporary)
   ```bash
   gh workflow disable codeql.yml
   gh workflow disable security.yml
   ```

   - Update PR branch protection rules to not require these checks
   - Document that security scanning is disabled

### Short-term

1. ✅ SonarCloud is working - continue using for code quality
2. ✅ CI pipeline is working - all tests pass
3. ✅ GitGuardian is working - secret scanning active
4. Verify Vercel deployments work with private repo

### Long-term

1. Enable GitHub Advanced Security for comprehensive security coverage
2. Re-enable CodeQL and Trivy if they were disabled
3. Configure custom CodeQL queries for project-specific security patterns
4. Set up security policy and vulnerability disclosure process

---

## Testing Checklist

After making changes, verify:

- [ ] CI workflow passes on new PRs
- [ ] SonarCloud analysis completes successfully
- [ ] Vercel preview deployments are created
- [ ] Branch protection rules are satisfied
- [ ] Pre-commit hooks (Husky) still work locally
- [ ] GitHub Advanced Security enabled (if applicable)
- [ ] CodeQL scans complete without errors
- [ ] Trivy scans upload results to Security tab
- [ ] Dependabot alerts are visible in Security tab

---

## Additional Resources

- [GitHub Advanced Security Pricing](https://docs.github.com/en/billing/managing-billing-for-github-advanced-security/about-billing-for-github-advanced-security)
- [Enabling Code Scanning](https://docs.github.com/en/code-security/code-scanning/enabling-code-scanning/configuring-code-scanning-for-a-repository)
- [Managing Security Settings](https://docs.github.com/en/code-security/getting-started/securing-your-repository)
- [Workflow Permissions](https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs)

---

## Support

For issues or questions:

1. Check workflow run logs: `gh run list --limit 10`
2. View specific failure: `gh run view <run-id> --log-failed`
3. Review this document for known issues and solutions
4. Contact DevOps team if GitHub Advanced Security license is needed
