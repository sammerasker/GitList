# Security Policy for GitLists

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability in GitLists, please help us protect our users by reporting it responsibly.

### How to Report

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead, please:
1. Email the maintainer through [GitHub profile contact](https://github.com/sammerasker)
2. Include "GitLists Security" in the subject line
3. Provide detailed information about the vulnerability
4. Allow reasonable time for response and fix

### What to Include

When reporting a security issue, please include:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if you have one)
- Your contact information for follow-up

### Response Timeline

We aim to:
- Acknowledge receipt within 48 hours
- Provide initial assessment within 1 week
- Release security fixes as soon as possible
- Credit reporters (if desired) in release notes

## Security Best Practices for Users

### Protect Your GitHub Token

**NEVER share your GitHub access token:**
- Don't post tokens in issues, forums, or chat
- Don't include tokens in screenshots
- Revoke access immediately if token is compromised

### Safe Installation

Only install GitLists from official sources:
- Chrome Web Store (when available)
- Microsoft Edge Add-ons (when available)
- Official GitHub repository releases

### Regular Security Maintenance

- Keep your browser updated
- Review extension permissions periodically
- Revoke unused application access in GitHub settings
- Monitor your GitHub account for unusual activity

## Security Features

GitLists implements multiple security layers:

### Code Security
- Content Security Policy (CSP) prevents code injection
- No eval() or unsafe code execution
- Input validation and sanitization
- Rate limiting for API requests

### Data Protection
- Local storage only (no external servers)
- Encrypted token storage via browser APIs
- No logging of sensitive information
- Automatic token redaction in error messages

### Network Security
- HTTPS-only communication
- GitHub API official endpoints only
- No third-party tracking or analytics
- Minimal required permissions

### Authentication Security
- OAuth Device Flow (no password handling)
- Least-privilege access scopes
- Session-only token option available
- Easy access revocation

## Known Security Considerations

### GitHub API Rate Limits
- Extension respects GitHub rate limits
- Implements exponential backoff
- Graceful degradation when limits hit

### Browser Extension Permissions
GitLists requests minimal permissions:
- `storage` - for local data storage
- `alarms` - for auto-refresh scheduling
- `tabs` - for opening GitHub links
- `https://api.github.com/*` - for GitHub API access
- `https://github.com/*` - for star lists scraping

### Content Script Security
- Runs only on GitHub.com pages
- No access to other websites
- Sandboxed execution environment
- No DOM manipulation of sensitive elements

## Security Updates

Security updates are prioritized and released as:
- Immediate patches for critical vulnerabilities
- Regular updates for moderate issues
- Coordinated disclosure for complex issues

## Compliance

GitLists follows security standards for:
- Chrome Web Store security requirements
- Microsoft Edge Add-ons security requirements
- GitHub API security best practices
- Browser extension security guidelines

## Security Audit

This extension has undergone security review for:
- Code injection vulnerabilities
- Data leakage risks
- Authentication security
- Network communication security
- Permission usage audit

Last security review: January 2026

## Contact

For security-related questions:
- Security issues: [Contact maintainer privately](https://github.com/sammerasker)
- General questions: [GitHub Issues](https://github.com/sammerasker/GitList/issues)

---

**Remember: When in doubt, don't share tokens or sensitive information publicly.**