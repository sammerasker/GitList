# Contributing to GitLink Edge Extension

Thank you for your interest in contributing to GitLink for Microsoft Edge! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn
- Microsoft Edge 88.0.705.50 or higher (for testing)
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/gitlink-edge.git
   cd gitlink-edge
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run build
   ```

4. **Load in Microsoft Edge**
   - Open `edge://extensions/`
   - Enable "Developer mode" (toggle in left sidebar)
   - Click "Load unpacked" and select the `dist` folder

## Development Workflow

### Making Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Edit source files in the `src/` directory
   - Follow the existing code style and patterns
   - Consider Edge-specific optimizations

3. **Test Your Changes**
   ```bash
   # Build and test
   npm run build
   # Or use watch mode for development
   npm run watch
   # Create distribution package
   npm run package
   ```

4. **Test in Microsoft Edge**
   - Reload the extension in `edge://extensions/`
   - Test all functionality thoroughly
   - Check browser console for errors
   - Test on different Edge versions if possible

### Edge-Specific Considerations

- **Manifest V3**: Ensure compatibility with Edge's Manifest V3 implementation
- **API Differences**: Be aware of any Edge-specific API behaviors
- **Performance**: Optimize for Edge's JavaScript engine
- **UI/UX**: Follow Microsoft's design guidelines where applicable

### Code Style

- **TypeScript**: Use TypeScript for all new code
- **Formatting**: Follow existing indentation and style
- **Comments**: Add comments for complex logic
- **Error Handling**: Always handle errors gracefully
- **Edge Compatibility**: Ensure code works with Edge 88+

### Commit Guidelines

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 50 characters
- Add detailed description if needed

Example:
```
Add Edge-specific search optimization

- Implement Edge-optimized search filtering
- Add Edge keyboard shortcuts support
- Update UI for Edge design consistency
```

## Testing

### Manual Testing

1. **Authentication Flow**
   - Test GitHub OAuth connection in Edge
   - Verify token storage and retrieval
   - Test disconnect functionality

2. **Repository Sync**
   - Test initial sync of starred repositories
   - Verify auto-refresh functionality
   - Test manual refresh

3. **Edge-Specific Features**
   - Test Edge extension management integration
   - Verify Edge-specific UI elements
   - Test Edge keyboard shortcuts

4. **Cross-Version Testing**
   - Test on Edge 88+ (minimum supported)
   - Test on latest Edge stable
   - Test on Edge Dev/Canary if available

### Browser Console

Always check the browser console for:
- JavaScript errors
- Network request failures
- Extension-specific warnings
- Edge-specific console messages

## Pull Request Process

1. **Before Submitting**
   - Ensure your code builds without errors
   - Test thoroughly in Microsoft Edge
   - Update documentation if needed
   - Check that your changes don't break existing functionality
   - Verify Edge Add-ons store compatibility

2. **Pull Request Description**
   - Clearly describe what your changes do
   - Explain why the changes are needed
   - List any breaking changes
   - Include screenshots for UI changes
   - Note any Edge-specific considerations

3. **Review Process**
   - Maintainers will review your PR
   - Address any feedback or requested changes
   - Once approved, your PR will be merged

## Project Structure

```
src/
├── background/         # Service worker and background scripts
│   ├── auth.ts        # GitHub OAuth authentication
│   ├── githubApi.ts   # GitHub API interactions
│   ├── serviceWorker.ts # Main service worker (Edge-optimized)
│   └── syncer.ts      # Data synchronization logic
├── content/           # Content scripts
│   └── githubScraper.ts # GitHub page scraping
├── popup/             # Extension popup UI
│   ├── popup.html     # Popup HTML structure
│   ├── popup.css      # Popup styles
│   └── popup.ts       # Popup JavaScript logic
└── shared/            # Shared utilities
    ├── config.ts      # Configuration constants
    ├── constants.ts   # Application constants
    ├── types.ts       # TypeScript type definitions
    └── utils.ts       # Utility functions
```

## Common Issues

### Build Errors

- **TypeScript errors**: Check type definitions and imports
- **Missing dependencies**: Run `npm install`
- **Edge compatibility**: Ensure ES2020+ compatibility

### Extension Loading Issues

- **Manifest errors**: Validate Edge-specific manifest fields
- **Service worker errors**: Check background script console
- **Content script errors**: Check page console on GitHub
- **Edge version**: Ensure Edge 88+ is being used

### API Issues

- **Rate limiting**: Implement proper retry logic
- **Authentication**: Ensure OAuth flow works in Edge
- **Network errors**: Handle offline scenarios
- **Edge-specific APIs**: Check Edge extension API compatibility

## Getting Help

- **Issues**: Check existing [GitHub Issues](https://github.com/your-username/gitlink-edge/issues)
- **Discussions**: Start a discussion for questions
- **Documentation**: Refer to the main README.md
- **Edge Documentation**: Check Microsoft Edge extension docs

## Microsoft Edge Add-ons Store

When contributing features for store submission:

- Follow Microsoft Edge Add-ons policies
- Ensure manifest meets store requirements
- Test packaging with `npm run package`
- Consider store review guidelines

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow GitHub's community guidelines

## License

By contributing to GitLink for Edge, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to GitLink for Microsoft Edge! 🚀