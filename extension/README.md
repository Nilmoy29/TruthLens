# TruthLens Browser Extension

A powerful browser extension that automatically analyzes web content for credibility, bias, and authenticity while tracking your content consumption patterns.

## Features

### 🔍 Automatic Content Analysis
- **Real-time Detection**: Automatically detects and analyzes articles, blog posts, and news content
- **Credibility Assessment**: Evaluates source reliability and fact-checking
- **Bias Detection**: Identifies political, cultural, and ideological bias in content
- **Content Categorization**: Automatically categorizes content by type and topic

### 📊 Consumption Analytics
- **Reading Time Tracking**: Monitors time spent on each article
- **Engagement Metrics**: Tracks scroll depth and user interaction
- **Source Analysis**: Identifies most-visited domains and content sources
- **Daily Trends**: Provides insights into daily reading habits

### 🎯 Smart Notifications
- **Bias Alerts**: Notifies when high-bias content is detected
- **Credibility Warnings**: Alerts for low-credibility sources
- **Engagement Insights**: Shows reading pattern analysis

### 🔗 Integration
- **Content Calendar Sync**: Automatically syncs consumption data with TruthLens dashboard
- **Analytics Dashboard**: View detailed analytics at `/analytics`
- **Historical Data**: Maintains local storage of analysis history

## Installation

1. Clone or download the TruthLens project
2. Navigate to `chrome://extensions/` in your browser
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `extension` folder
5. The TruthLens icon should appear in your browser toolbar

## Usage

### Automatic Mode
The extension automatically:
- Detects when you visit article pages
- Extracts content and metadata
- Analyzes credibility and bias
- Tracks reading engagement
- Logs consumption data

### Manual Analysis
Right-click on any page or selected text to:
- **Fact Check Selection**: Analyze selected text for accuracy
- **Bias Analysis (Selection)**: Check selected text for bias
- **Fact Check Page**: Analyze the entire page content
- **Bias Analysis (Page)**: Check the entire page for bias

### Analytics Dashboard
Visit the TruthLens web app at `http://localhost:3001/analytics` to view:
- Content consumption history
- Credibility and bias scores
- Source distribution
- Daily reading trends
- Engagement metrics

## Configuration

### API Endpoint
The extension connects to the TruthLens API running on `http://localhost:3001`. To change this:

1. Right-click the extension icon
2. Select "Options"
3. Update the API base URL
4. Save settings

### Content Detection Settings
The extension automatically detects:
- Articles with word count > 300
- News content
- Blog posts
- Academic papers
- Opinion pieces

### Privacy Settings
- All data is stored locally in browser storage
- Content analysis is performed via secure API calls
- No personal information is transmitted
- Data can be cleared from extension options

## Data Collection

### Automatic Data Points
- **Content Metadata**: Title, URL, domain, author, publish date
- **Reading Metrics**: Time spent, scroll depth, word count
- **Analysis Results**: Credibility scores, bias detection, fact-check results
- **Engagement Data**: Click patterns, reading completion rate

### Storage
- **Local Storage**: Recent analysis history (last 100 items)
- **Consumption Logs**: Reading data (last 500 entries)
- **API Sync**: Data automatically synced to TruthLens dashboard

## API Endpoints

The extension communicates with these TruthLens API endpoints:

- `POST /api/fact-check` - Content fact-checking
- `POST /api/bias-analysis` - Bias detection
- `POST /api/content-calendar/consumption` - Log consumption data
- `GET /api/content-calendar/consumption` - Retrieve analytics

## Technical Details

### Files Structure
```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for API calls
├── content.js            # Content script for page analysis
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── options.html          # Settings page
├── options.js            # Settings functionality
└── README.md             # This documentation
```

### Content Detection Algorithm
1. **Page Load Detection**: Monitors for page navigation and content changes
2. **Content Extraction**: Identifies main article content using heuristics
3. **Metadata Parsing**: Extracts title, author, date, and other metadata
4. **Engagement Tracking**: Monitors scroll, time, and interaction events
5. **Analysis Trigger**: Automatically analyzes after sufficient engagement

### Performance Optimization
- **Debounced Analysis**: Prevents excessive API calls
- **Content Caching**: Avoids re-analyzing same content
- **Background Processing**: Non-blocking analysis execution
- **Storage Limits**: Automatic cleanup of old data

## Troubleshooting

### Common Issues

**Extension not detecting content:**
- Ensure the page has sufficient text content (>300 words)
- Check that JavaScript is enabled
- Verify the page structure is standard HTML

**API connection errors:**
- Confirm TruthLens server is running on `http://localhost:3001`
- Check browser console for network errors
- Verify API endpoint configuration in options

**Missing analytics data:**
- Ensure you've browsed content with the extension active
- Check that automatic analysis is enabled
- Verify data sync with the analytics dashboard

### Debug Mode
To enable debug logging:
1. Open browser developer tools
2. Navigate to the Console tab
3. Look for TruthLens log messages
4. Check for any error messages or warnings

## Privacy & Security

- **Local Processing**: Content analysis metadata stays on your device
- **Secure Transmission**: All API calls use HTTPS in production
- **No Tracking**: Extension doesn't track personal browsing habits
- **Data Control**: Users can clear all stored data at any time

## Development

### Building from Source
```bash
# Clone the repository
git clone <repository-url>
cd truthlens

# Install dependencies
npm install

# Start development server
npm run dev

# Load extension in browser
# Navigate to chrome://extensions/
# Enable Developer mode
# Click "Load unpacked" and select the extension folder
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the browser console for error messages

---

**Note**: This extension requires the TruthLens web application to be running for full functionality. Make sure to start the development server with `npm run dev` before using the extension.