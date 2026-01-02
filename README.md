# HBA-2025

Rails 7.2 application with modern frontend tooling.

## Stack

- **Rails**: 7.2.3
- **Ruby**: 3.2.2
- **Database**: PostgreSQL
- **Authentication**: Devise
- **JavaScript**: esbuild + React (for occasional components)
- **CSS**: Tailwind CSS
- **Package Manager**: Yarn

## Key Features

- No Turbo (traditional page loads)
- Devise authentication with User model
- React available for component usage (imported in application.js as needed)
- Tailwind for styling
- No test framework (can be added later)

## Setup

```bash
# Install dependencies
bundle install
yarn install

# Setup database
rails db:create db:migrate

# Run the app
bin/dev
```

## React Components

React components can be added to `app/javascript/components/` and imported in `app/javascript/application.js` as needed. React and ReactDOM are already installed.

Example:
```javascript
// app/javascript/application.js
import React from 'react'
import ReactDOM from 'react-dom/client'
import MyComponent from './components/MyComponent'

// Mount component when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('my-component-root')
  if (root) {
    ReactDOM.createRoot(root).render(<MyComponent />)
  }
})
```

## Database Configuration

Development and test databases use postgres/postgres credentials on localhost:5432.
Production uses environment variable HBA_2025_DATABASE_PASSWORD.
