# GitLink - Microsoft Edge Extension

GitLink is a Microsoft Edge extension that helps you browse and manage your GitHub starred repositories and star lists with intelligent bookmarking capabilities.

## Features

- 🌟 **Browse Starred Repositories**: View all your GitHub starred repos in a clean, organized interface
- 📋 **Star Lists Management**: Access and manage your GitHub star lists (experimental)
- 🔄 **Auto-Sync**: Automatically sync your stars and lists at configurable intervals
- 🔍 **Smart Search**: Quickly find repositories and lists with intelligent search
- 🔐 **Secure Authentication**: Uses GitHub's OAuth Device Flow for secure authentication
- ⚡ **Fast Performance**: Optimized for Microsoft Edge with efficient caching

## Installation

### From Microsoft Edge Add-ons Store
*Coming soon - extension will be available in the Microsoft Edge Add-ons store*

### Manual Installation (Developer Mode)

#### For End Users

1. **Download Extension**
   - Download from Microsoft Edge Add-ons (when available)
   - Or download release from [GitHub Releases](https://github.com/sammerasker/GitList/releases)

2. **Load in Microsoft Edge**
   - Open Microsoft Edge
   - Navigate to `edge://extensions/`
   - Enable "Developer mode" (toggle in the left sidebar)
   - Click "Load unpacked"
   - Select the downloaded extension folder

#### For Maintainers/Developers

1. **Clone and Setup Environment**
   ```bash
   git clone https://github.com/sammerasker/GitList.git
   cd GitList/Edge
   npm install
   ```

2. **Configure Build Environment (Maintainers Only)**
   ```bash
   # Copy the environment template
   cp .env.example .env
   
   # Edit .env and set your GitHub OAuth Client ID
   # Get a Client ID from: https://github.com/settings/developers
   ```
   
   Your `.env` file should look like:
   ```
   GITLINK_OAUTH_CLIENT_ID=your_github_oauth_client_id_here
   ```
   
   **Note**: End users do NOT need to create a `.env` file. The OAuth Client ID is injected at build time by maintainers.

3. **Build the Extension**
   ```bash
   npm run build
   ```

4. **Load in Microsoft Edge**
   - Open Microsoft Edge
   - Navigate to `edge://extensions/`
   - Enable "Developer mode" (toggle in the left sidebar)
   - Click "Load unpacked"
   - Select the `dist` folder

5. **Pin the Extension**
   - Click the Extensions button (puzzle piece icon) in the toolbar
   - Find "GitLink" and click the pin icon to keep it visible

## Usage

1. **Connect Your GitHub Account**
   - Click the GitLink icon in your Edge toolbar
   - Click "Connect GitHub"
   - Follow the OAuth flow to authorize the extension

2. **Browse Your Stars**
   - Your starred repositories will appear in the extension popup
   - Use the search bar to quickly find specific repos
   - Click on any repository to open it in a new tab

3. **Configure Settings**
   - Click the gear icon to access settings
   - Enable auto-refresh and set sync intervals
   - Enable experimental star lists sync

## Microsoft Edge Compatibility

This extension is specifically optimized for Microsoft Edge and requires:
- Microsoft Edge version 88.0.705.50 or later
- Manifest V3 support
- Modern JavaScript features (ES2020+)

## Development

### Building the Extension

```bash
# Install dependencies
npm install

# Build for production (maintainers only - requires .env)
npm run build

# Build with Edge-specific optimizations
npm run build:edge

# Development build with watch mode
npm run watch

# Create distribution package
npm run package
```

**Note for Maintainers**: Only allowlisted documentation files (README.md, LICENSE, PRIVACY.md, SECURITY.md, CONTRIBUTING.md) are committed to git. Other markdown files are ignored to keep the repository clean.

### Project Structure

```
src/
├── background/     # Service worker and background scripts
├── content/        # Content scripts for GitHub pages
├── popup/          # Extension popup UI
└── shared/         # Shared utilities and types
static/
├── images/         # Extension icons
└── manifest.json   # Edge extension manifest
```

## Privacy & Security

- **No Data Collection**: GitLink doesn't collect or store any personal data
- **Local Storage Only**: All data is stored locally in your browser
- **Secure Authentication**: Uses GitHub's official OAuth Device Flow
- **Minimal Permissions**: Only requests necessary permissions for GitHub API access

For detailed information:
- [Privacy Policy](../PRIVACY.md) - How we handle your data
- [Security Policy](../SECURITY.md) - Security practices and reporting vulnerabilities

## Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details on:
- Development setup
- Code standards
- Pull request process
- Community guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly in Microsoft Edge
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- **[GitLink for Chrome](https://github.com/sammerasker/GitList)** - Chrome version of this extension

## Support

If you encounter any issues:

1. Check the [Issues](https://github.com/sammerasker/GitList/issues) page
2. Ensure you're using a supported Edge version (88+)
3. Try disconnecting and reconnecting your GitHub account
4. Check the browser console for error messages

---

**Star this repository if you find it useful!** ⭐