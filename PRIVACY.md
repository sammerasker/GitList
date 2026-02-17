# Privacy Policy for GitLists

**Last Updated:** January 28, 2026

## Overview

GitLists is a browser extension that helps you manage your GitHub starred repositories and star lists. We are committed to protecting your privacy and being transparent about how the extension works.

## Data Collection

**GitLists does NOT collect, store, or transmit any personal data to external servers.**

### What Data is Accessed

GitLists only accesses:
- Your GitHub starred repositories (via GitHub API)
- Your GitHub star lists (via GitHub API and page scraping)
- Your GitHub username and basic profile information (for authentication)

### Where Data is Stored

All data is stored **locally in your browser** using:
- Chrome/Edge extension storage APIs
- No external databases or servers
- No cloud storage or third-party services

### Data Usage

The extension uses your GitHub data solely to:
- Display your starred repositories in the extension popup
- Show your star lists and their contents
- Provide search and filtering functionality
- Enable automatic syncing of your stars and lists

## Authentication

GitLists uses GitHub's official OAuth Device Flow for secure authentication:
- No passwords are stored or transmitted
- Only necessary permissions are requested
- You can revoke access at any time through GitHub settings
- Authentication tokens are stored locally and encrypted by your browser

## Third-Party Services

GitLists only communicates with:
- **GitHub API** (api.github.com) - to fetch your stars and profile data
- **GitHub.com** - to scrape star lists (when lists sync is enabled)

No other third-party services are used.

## Data Sharing

GitLists **never shares your data** with:
- Third-party analytics services
- Advertising networks
- Data brokers
- Any external parties

## Your Rights

You have full control over your data:

### View Your Data
All data is stored locally in your browser. You can view it through:
- Extension popup interface
- Browser developer tools (Extension storage)

### Delete Your Data
To remove all GitLists data:
1. Click "Disconnect" in the extension popup
2. Uninstall the extension
3. Optionally revoke access at [GitHub Settings > Applications](https://github.com/settings/applications)

### Revoke Access
To revoke GitHub access:
1. Visit [GitHub Settings > Applications](https://github.com/settings/applications)
2. Find "GitLists" in the authorized applications
3. Click "Revoke" to remove access

## Data Security

GitLists implements security best practices:
- Content Security Policy (CSP) to prevent code injection
- No eval() or unsafe code execution
- Secure token storage using browser APIs
- No logging of sensitive information

## Changes to Privacy Policy

We may update this privacy policy occasionally. Changes will be:
- Posted in this document with updated date
- Announced in extension release notes
- Never retroactively applied to reduce your privacy protections

## Contact

For privacy questions or concerns:
- Open an issue: [GitHub Issues](https://github.com/sammerasker/GitList/issues)
- Email: [Contact through GitHub profile](https://github.com/sammerasker)

## Compliance

This extension complies with:
- Chrome Web Store privacy requirements
- Microsoft Edge Add-ons privacy requirements
- GDPR principles (no personal data collection)
- GitHub API Terms of Service