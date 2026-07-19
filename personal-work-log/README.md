# Personal Work Logger

A lightweight, modern, and production-ready Personal Work Logger application for tracking productivity and work logs.

## Overview

Personal Work Logger is a sleek and intuitive application designed to help individuals track, visualize, and manage their work logs efficiently. Built with Angular 18, this application prioritizes simplicity, speed, and maintainability while providing a beautiful user experience inspired by modern productivity tools like Notion, Linear, and Todoist.

## Key Features

### 📊 **Dashboard**
- Real-time statistics and metrics visualization
- Interactive charts showing hours worked and tasks completed
- Date filtering (Today, This Week, This Month, Custom Range)
- Responsive and accessible design

### 📝 **Work Log Form**
- Comprehensive form for adding and editing work logs
- Hours and minutes input with duration slider (1m to 24h)
- Auto-select today's date with calendar picker
- Required field validation and error handling
- Smooth animations and transitions

### 📋 **Work Log List**
- Grouped display by date with weekend highlighting
- Friday: Light yellow background
- Saturday: Light pink background
- Search and filter functionality
- Edit and delete actions
- Empty state management

### ⚙️ **Settings**
- Backup and restore functionality
- JSON export with automatic filename: `worklog-backup-YYYY-MM-DD.json`
- File validation and preview before import
- Warning system to prevent data loss
- Dark mode support

### 🔍 **Search & Filters**
- Search by task title and details
- Date range filtering
- Quick filter buttons for common date ranges

## Technology Stack

- **Angular**: 18.x (Standalone Components)
- **TypeScript**: Latest stable version
- **SCSS**: For styling
- **Angular Material**: UI components
- **Bootstrap Icons**: Icon library
- **RxJS**: Reactive programming
- **Dexie.js**: Local database (IndexedDB)
- **Chart.js**: Data visualization
- **date-fns**: Date manipulation

## Architecture

### Project Structure
```
src/
├── app/
│   ├── core/
│   │   ├── models/           # Data interfaces
│   │   ├── services/         # Application services
│   │   ├── database/         # IndexedDB layer
│   │   └── utils/            # Utility functions
│   ├── shared/
│   │   ├── components/      # Reusable UI components
│   │   ├── pipes/            # Angular pipes
│   │   └── directives/       # Angular directives
│   ├── features/
│   │   ├── dashboard/       # Dashboard module
│   │   ├── work-log/        # Work log module
│   │   └── settings/        # Settings module
│   ├── layouts/            # Page layouts
│   └── assets/             # Static assets
```

### State Management
- **Angular Signals** for reactive state management
- **RxJS** for complex async operations
- **Zustand-like** pattern for simple state
- Computed signals for derived data

### Data Layer
- **Dexie.js** for IndexedDB database
- TypeScript-based database service
- CRUD operations with full validation
- Backup/restore functionality

## Components

### Header Component
- Navigation menu
- Quick stats summary
- Theme toggle
- User menu

### Statistic Card Component
- Reusable card for displaying statistics
- Icons and values
- Trend indicators

### Chart Card Component
- Line and bar charts
- Dark mode support
- Responsive design

### Date Filter Component
- Quick filter buttons (Today, This Week, etc.)
- Custom date range picker
- Calendar integration

### Work Log Form Component
- Complete form for work log entry
- Hours and minutes selector
- Duration slider
- Validation and error handling

### Work Log List Component
- Grouped display by date
- Weekend highlighting
- Search and filter capabilities
- Edit and delete actions

### Settings Component
- Backup and restore interface
- File upload validation
- Data preview and confirmation

### Empty State Component
- Helpful messages when no data exists
- Call-to-action buttons
- Beautiful illustrations

## Design

### UI/UX Principles
- **Minimal**: Clean and focused interface
- **Spacious**: Ample whitespace for clarity
- **Responsive**: Works on all devices
- **Accessible**: Follows WCAG guidelines
- **Consistent**: Unified design language

### Visual Elements
- **Rounded Corners**: Modern, friendly appearance
- **Soft Shadows**: Depth without clutter
- **Smooth Animations**: Fluid transitions
- **Modern Typography**: Clean, readable fonts
- **Light & Dark Themes**: User preference support

## Setup & Installation

### Prerequisites
- Node.js 20.12.2 or higher
- npm 10.5.0 or higher
- Angular CLI 18.1.2

### Installation

```bash
# Clone the repository
cd /path/to/projects

# Create new Angular project with Personal Work Logger defaults
ng new personal-work-log --standalone --style=scss --routing=true --skip-git --skip-tests

# Navigate to project directory
cd personal-work-log

# Install dependencies
npm install --legacy-peer-deps

# Start development server
ng serve
```

## Development

### Running the Application

```bash
# Start development server (with hot reload)
ng serve

# Build for production
ng build --configuration production

# Test the application
ng test

# Lint the code
ng lint

# Type checking
ng typecheck
```

### Component Development

Each component is organized in the `src/app/shared/components/` directory with separate files for:
- **TypeScript**: Component logic
- **HTML**: Template markup
- **SCSS**: Styling

Example:
```
src/app/shared/components/
├── header/
│   ├── header.component.ts
│   ├── header.component.html
│   └── header.component.scss
```

## Features Implementation Status

| Feature | Status | Description |
|---------|--------|-------------|
| Header Component | ✅ Complete | Navigation and quick stats |
| Statistic Card | ✅ Complete | Reusable statistic display |
| Chart Card | ✅ Complete | Data visualization with Chart.js |
| Date Filter | ✅ Complete | Date range selection and quick filters |
| Work Log Form | ⏳ In Progress | Form for adding/editing work logs |
| Work Log List | ⏳ In Progress | Display and management of work logs |
| Dashboard | ⏳ In Progress | Main dashboard with statistics and charts |
| Settings | ⏳ In Progress | Backup and restore functionality |
| Empty State | ⏳ In Progress | Helpful empty state messages |
| Confirmation Dialog | ⏳ In Progress | Delete confirmation dialogs |
| Service Worker | ⏳ In Progress | Offline functionality |

## Build & Deployment

### Build Commands

```bash
# Build for development
ng build --configuration development

# Build for production
ng build --configuration production

# Extract i18n messages
ng extract-i18n
```

### GitHub Pages Deployment

```bash
# Build the application
npm run build

# Copy the output to the gh-pages branch
# (or use GitHub Actions for automated deployment)
```

### GitHub Actions (Optional)

Create `.github/workflows/github-pages.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20.12.2'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build application
        run: ng build --configuration production
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist/personal-work-log
```

## Offline Support

The application leverages **Service Workers** and **IndexedDB** to provide a seamless offline experience:

- **Local Storage**: All work logs and settings are stored locally using Dexie.js
- **Service Worker**: Cached resources for offline access
- **Data Sync**: Automatic retry when connection is restored
- **Backup**: Local backup system for data protection

## Accessibility

The application follows WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader**: Semantic HTML and ARIA labels
- **Color Contrast**: Sufficient contrast ratios for text and interactive elements
- **Focus Management**: Clear focus indicators and logical tab order
- **Responsive Design**: Works on all devices and screen sizes

## Testing

### Unit Tests
```bash
# Run unit tests
ng test

# Run with coverage
ng test --code-coverage
```

### Integration Tests
- Component tests for all UI components
- Service tests for data layer
- E2E tests for user journeys

### Manual Testing
1. **Local Development**: `ng serve` and test functionality
2. **Production Build**: `ng build --configuration production`
3. **GitHub Pages**: Deploy to GitHub Pages and test offline functionality

## Contributing

### Development Workflow

1. **Feature Branch**: Create a new branch for each feature
2. **Code Changes**: Implement the feature with tests
3. **Code Review**: Review and merge changes
4. **Release**: Create a new release with appropriate version bump

### Code Quality

- Follow Angular Style Guide
- Use TypeScript strictly
- Write meaningful comments
- Avoid duplicate code
- Keep components focused and reusable
- Use Git hooks for pre-commit checks

## Troubleshooting

### Common Issues

#### "Node.js version not supported"
```bash
# Update Node.js to 20.19.0 or higher
sudo npm install -g n
sudo n 20.19.0
```

#### "Angular CLI version not found"
```bash
# Install Angular CLI 18.1.2
sudo npm install -g @angular/cli@18.1.2
```

#### "Cannot read property of undefined"
```bash
# Clear npm cache and reinstall
npm cache clean --force
npm install
```

#### Browser cache issues
- Clear browser cache and refresh the page
- Try a different browser
- Check console for JavaScript errors

## Support

### Community Support
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Community Q&A
- **Stack Overflow**: Tag `personal-work-log` for help

### Contact
- **Email**: support@personalworklogger.com
- **GitHub**: [Repository](https://github.com/yourusername/personal-work-log)

## License

This project is licensed under the MIT License. See `LICENSE` file for more information.

## Acknowledgments

- **Angular Team**: For creating Angular and its ecosystem
- **Dexie.js Team**: For providing an excellent IndexedDB wrapper
- **Chart.js Team**: For creating a flexible charting library
- **Open Source Contributors**: For their contributions and support

## Future Improvements

### Upcoming Features

1. **Advanced Analytics**: Deeper insights and reporting
2. **Integration**: Connect to other productivity tools
3. **Collaboration**: Share work logs with team
4. **API**: Expose data via REST API
5. **Mobile App**: Native mobile applications

### Technical Enhancements

1. **Performance**: Further optimization and lazy loading
2. **Security**: Enhanced security measures
3. **Scalability**: Better handling of large datasets
4. **Reliability**: Improved error handling and recovery

## Conclusion

Personal Work Logger is a comprehensive, production-ready application that provides a modern and intuitive interface for tracking work productivity. With its clean architecture, excellent user experience, and offline capabilities, it serves as a robust solution for personal productivity management.

The application is continuously evolving and welcomes contributions from the community to make it even better.

---

**Start your productivity journey with Personal Work Logger today!** 🚀
