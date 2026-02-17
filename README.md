# GitLists - Browser Extension for Chrome & Edge

![GitLink Banner](docs/screenshots/ImagePM.png)

<p align="center">
  <a href="https://microsoftedge.microsoft.com/addons/detail/oljdllmbnhclaijkeahbdkccachkifpa" target="_blank">
    <img src="docs/screenshots/English_Get it from Microsoft Edge.png" alt="Get it from Microsoft Edge" width="200" />
  </a>
</p>

GitLists is a modern browser extension that helps you browse and manage your GitHub starred repositories and star lists with intelligent bookmarking capabilities. Available for both Microsoft Edge and Google Chrome.

<p align="center">
  <img src="docs/screenshots/s1.png" width="30%" alt="Screenshot 1" />
  <img src="docs/screenshots/s2.png" width="30%" alt="Screenshot 2" />
  <img src="docs/screenshots/s3.png" width="30%" alt="Screenshot 3" />
</p>

## ✨ Features

### Core Features
- 🌟 **Browse Starred Repositories**: View all your GitHub starred repos in a clean, organized interface
- 📋 **Star Lists Management**: Access and manage your GitHub star lists (experimental)
- 🔄 **Smart Auto-Sync**: Automatically sync your stars and lists at configurable intervals (1-168 hours)
- 🔍 **Instant Search**: Quickly find repositories and lists with real-time filtering
- 🔐 **Secure Authentication**: Uses GitHub's OAuth Device Flow for secure authentication
- ⚡ **Fast Performance**: Optimized with efficient caching and background sync

### New Features (v1.0.1)
- 🌙 **Dark Mode**: Modern dark theme with #333333 background
  - Auto-detect system theme preference
  - Manual override (Light/Dark/Auto)
  - Smooth transitions and carefully crafted color palette
- 🗑️ **Smart Tab Management**: Auto-closes tabs created for list syncing
  - Tracks extension-created tabs vs. user tabs
  - Only closes tabs it creates
  - Keeps your existing GitHub tabs open
- ⚙️ **Enhanced Settings**: Improved settings panel with theme control
- 🎨 **Modern UI**: Refined interface with better dark mode support

## Installation

### From Microsoft Edge Add-ons Store (Recommended)

**✅ Now Available!** Install directly from the Microsoft Edge Add-ons store:

<p align="center">
  <a href="https://microsoftedge.microsoft.com/addons/detail/oljdllmbnhclaijkeahbdkccachkifpa" target="_blank">
    <img src="docs/screenshots/English_Get it from Microsoft Edge.png" alt="Get it from Microsoft Edge" width="200" />
  </a>
</p>

1. Click the download button above or visit the [Edge Add-ons store](https://microsoftedge.microsoft.com/addons/detail/oljdllmbnhclaijkeahbdkccachkifpa)
2. Click "Get" to install
3. The extension will be added to your Edge browser automatically
4. Click the GitLists icon in your toolbar to get started

### Browser Availability

**Microsoft Edge** is the primary supported browser for this extension:
- **Edge Add-ons Store**: ✅ Available now!
- **Manual Install**: Also available via GitHub Releases

**Google Chrome** version is also available:
- **Chrome Web Store**: Not available (requires paid developer account)
- **Manual Install**: Pre-built Chrome packages (marked "for Chrome") are provided with each GitHub Release
- **Source Code**: Will be shared publicly when the extension is published to official stores

**Note**: Both Edge and Chrome builds are provided as ready-to-install packages in [GitHub Releases](https://github.com/sammerasker/GitList/releases). Download the appropriate version for your browser.

### Manual Installation (For End Users)

**Step-by-step installation from GitHub Releases:**

1. **Download the Extension**
   - Visit [GitHub Releases](https://github.com/sammerasker/GitList/releases)
   - Download the latest `gitlink-edge-extension.zip` file
   - Extract the ZIP file to a permanent location on your computer

2. **Enable Developer Mode in Edge**
   - Open Microsoft Edge
   - Navigate to `edge://extensions/`
   - Toggle "Developer mode" ON (switch in the left sidebar)
   - This allows loading extensions from local files

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to the extracted folder
   - Select the folder that contains `manifest.json` (typically the `dist` folder inside the extracted files)
   - Click "Select Folder"

4. **Verify Installation**
   - The GitLink extension should now appear in your extensions list
   - Ensure it's enabled (toggle switch is ON)

5. **Pin the Extension**
   - Click the Extensions button (puzzle piece icon) in the Edge toolbar
   - Find "GitLink" in the list
   - Click the pin icon to keep it visible in your toolbar

### Manual Installation (For Maintainers/Developers)

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
   - Click the GitLists icon in your browser toolbar
   - Click "Connect GitHub"
   - Follow the OAuth flow to authorize the extension

2. **Browse Your Stars**
   - Your starred repositories will appear in the extension popup
   - Use the search bar to quickly find specific repos
   - Click on any repository to open it in a new tab

3. **Configure Settings**
   - Click the gear icon to access settings
   - **Auto-Refresh**: Enable/disable automatic syncing (default: 6 hours, range: 1-168 hours)
   - **Lists Sync**: Toggle GitHub star lists syncing (experimental)
   - **Theme**: Choose Light, Dark, or Auto (system) theme
   - **Private Repos**: Include private repositories (requires broader permissions)
   - **Session Token**: Use session-only token storage (requires re-auth after browser restart)

4. **Use Dark Mode**
   - Open Settings → Theme dropdown
   - Choose "Auto" to follow system theme
   - Choose "Light" or "Dark" to override
   - Changes apply immediately

## 🌙 Dark Mode

GitLists features a modern dark mode with carefully crafted colors:
- **Background**: #333333 (dark gray)
- **Auto-Detection**: Automatically follows your system theme preference
- **Manual Control**: Override with Light/Dark options in settings
- **Smooth Transitions**: Seamless switching between themes
- **Optimized Colors**: All UI elements properly styled for both light and dark modes

## 🗑️ Smart Tab Management

The extension intelligently manages browser tabs during list syncing:
- **Auto-Close**: Tabs created by the extension are automatically closed after sync
- **Preserve User Tabs**: Your existing GitHub tabs remain open
- **Background Operation**: Sync tabs open in the background (not active)
- **Error Handling**: Tabs are closed even if sync fails

This means you won't see random GitHub tabs accumulating in your browser!

## Browser Compatibility

### Microsoft Edge
- **Edge Add-ons Store**: ✅ Available now!
- **Manual Install**: Available via GitHub Releases
- **Minimum Version**: Edge 88+ (Chromium)
- **Recommended**: Latest stable version

### Google Chrome
- **Chrome Web Store**: Coming soon
- **Manual Install**: Pre-built Chrome packages available in [GitHub Releases](https://github.com/sammerasker/GitList/releases)
- **Minimum Version**: Chrome 88+
- **Recommended**: Latest stable version

**Note**: Both Edge and Chrome builds are provided as ready-to-install packages in GitHub Releases. Download the appropriate version for your browser.

## In-Extension Developer Mode (Advanced)

GitLink includes a hidden **Developer Mode** for advanced users and developers. This is separate from Edge's extension loading "Developer mode" toggle.

### What It Enables

When enabled, Developer Mode reveals:
- **Diagnostics Section**: Test buttons for manual sync operations
- **Test Refresh Button**: Manually trigger a sync and view console logs
- **Test Lists Scraping**: Test the lists scraping functionality on GitHub pages
- **OAuth Client ID Override**: Override the built-in GitHub OAuth Client ID for testing custom OAuth apps

### How to Enable

1. Open the GitLink extension popup
2. Click the Settings (gear) icon
3. Expand the "Advanced" section
4. Click the version label text (e.g., "GitLink v1.0.0") **7 times** within 5 seconds
5. A notification will confirm "Developer Mode enabled!"
6. The Diagnostics section will now be visible

### How to Disable

1. Open Settings → Advanced
2. Scroll to the Diagnostics section (now visible)
3. Click "Disable Developer Mode" button
4. The diagnostics section will be hidden again

**Note**: Developer Mode state is stored locally in your browser. If you uninstall and reinstall the extension, you'll need to re-enable it.

## Development

### Building the Extension

```bash
# Install dependencies
npm install

# Build for Chrome
npm run build:chrome

# Build for Edge
npm run build:edge

# Build for both browsers
npm run build:all

# Development build with source maps
npm run dev:chrome
npm run dev:edge

# Watch mode (auto-rebuild on changes)
npm run watch:chrome
npm run watch:edge

# Create distribution packages
npm run package
```

### Unified Build System

The project uses a unified build system that supports both Chrome and Edge from a single codebase:
- **Single Source**: All code in `src/` directory
- **Browser-Specific Manifests**: `static/manifest.chrome.json` and `static/manifest.edge.json`
- **Output Directories**: `dist-chrome/` and `dist-edge/`
- **Fast Compilation**: Uses ESBuild for rapid TypeScript compilation

**Note for Maintainers**: Requires `.env` file with `GITLINK_OAUTH_CLIENT_ID` for production builds.

### Project Structure

```
src/
├── background/     # Service worker and background scripts
│   ├── auth.ts         # OAuth authentication
│   ├── githubApi.ts    # GitHub API client
│   ├── serviceWorker.ts # Main service worker
│   └── syncer.ts       # Sync logic with smart tab management
├── content/        # Content scripts for GitHub pages
│   └── githubScraper.ts # DOM scraping for star lists
├── popup/          # Extension popup UI
│   ├── popup.html      # Popup structure
│   ├── popup.css       # Styles with dark mode support
│   └── popup.ts        # Popup logic
└── shared/         # Shared utilities and types
    ├── authConfig.ts   # OAuth configuration
    ├── config.ts       # Extension config
    ├── constants.ts    # Constants
    ├── types.ts        # TypeScript types
    └── utils.ts        # Utility functions
static/
├── images/         # Extension icons
├── manifest.chrome.json # Chrome manifest
└── manifest.edge.json   # Edge manifest
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

- **[GitLists for Chrome](https://github.com/sammerasker/GitList)** - Chrome version available via GitHub Releases

## Changelog

### v1.0.1 (Latest)
- ✨ Added dark mode with auto-detection and manual override
- 🗑️ Implemented smart tab management (auto-close extension-created tabs)
- ⚙️ Enhanced settings panel with theme control
- 🎨 Improved UI with better dark mode support
- 🐛 Fixed tab accumulation during list syncing

### v1.0.0
- 🎉 Initial release
- 🌟 Browse starred repositories
- 📋 Star lists management (experimental)
- 🔄 Auto-sync with configurable intervals
- 🔍 Smart search functionality
- 🔐 Secure OAuth authentication

## Troubleshooting

### Lists Sync Issues

**Problem**: Lists sync fails or shows 0 lists

**Solutions**:
- Ensure you're logged into GitHub in the same browser profile
- Visit your GitHub stars page manually first: `https://github.com/YOUR_USERNAME?tab=stars`
- Check that you have created star lists on GitHub
- Try disconnecting and reconnecting your GitHub account in the extension
- Check if lists sync is enabled in Settings

### Tabs Keep Opening

**Problem**: GitHub tabs keep opening during sync

**Solution**: This is expected behavior for list syncing. The extension now automatically closes tabs it creates after sync completes. If you want to prevent tabs from opening:
- Disable "Lists Sync" in Settings
- Only starred repositories will sync (via API, no tabs needed)

### Dark Mode Not Working

**Problem**: Dark mode doesn't apply or looks wrong

**Solutions**:
- Check Settings → Theme is set to "Dark" or "Auto"
- If using "Auto", check your system theme settings
- Try manually selecting "Dark" mode
- Reload the extension: `edge://extensions/` or `chrome://extensions/` → Reload button

### Extension Popup is Blank

**Problem**: Extension popup shows a blank screen after update

**Solutions**:
- Disable and re-enable the extension
- If that doesn't work, remove and reinstall the extension
- Clear browser cache and restart browser
- Check console for errors (right-click popup → Inspect)

### Viewing Service Worker Logs

For debugging or reporting issues:
1. Navigate to `edge://extensions/`
2. Find GitLink in the extensions list
3. Click "Details"
4. Scroll to "Inspect views"
5. Click "service worker" link to open DevTools
6. View console logs for detailed error messages

### Authentication Issues

**Problem**: "Could not connect to GitHub" or authentication fails

**Solutions**:
- Ensure you're connected to the internet
- Check if GitHub is accessible in your browser
- Try the OAuth flow again (disconnect and reconnect)
- Clear extension storage: Settings → Disconnect → Reconnect

### Performance Issues

**Problem**: Extension is slow or unresponsive

**Solutions**:
- Increase auto-refresh interval in Settings (e.g., from 6 to 24 hours)
- Disable lists sync if you have many lists (Settings → Lists Sync toggle)
- Check browser's Task Manager (`Shift+Esc`) for memory usage
- Restart browser
- Clear extension cache: Settings → Disconnect → Reconnect

### Sync Interval Issues

**Problem**: Extension syncs too frequently or not frequently enough

**Solutions**:
- Check Settings → Refresh Interval (default: 6 hours, range: 1-168 hours)
- Adjust to your preferred interval
- Disable auto-refresh and use manual "Sync Now" button if preferred
- Check Service Worker console for alarm logs

**Still having issues?** Check the [GitHub Issues](https://github.com/sammerasker/GitList/issues) page or open a new issue with:
- Browser and version
- Extension version (visible in browser extensions page)
- Console logs from service worker (see "Viewing Service Worker Logs" above)
- Steps to reproduce the issue

## Support

If you encounter any issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the [Issues](https://github.com/sammerasker/GitList/issues) page
3. Ensure you're using a supported browser version (latest stable recommended)
4. Try disconnecting and reconnecting your GitHub account
5. Check the service worker console for error messages

For feature requests or bug reports, please [open an issue](https://github.com/sammerasker/GitList/issues/new) on GitHub.

---

**Star this repository if you find it useful!** ⭐

**Enjoying GitLists?** Consider leaving a review on the [Edge Add-ons store](https://microsoftedge.microsoft.com/addons/detail/oljdllmbnhclaijkeahbdkccachkifpa)!