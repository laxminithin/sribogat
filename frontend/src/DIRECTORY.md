# KissanBandi Directory Structure

## Overview
This document provides information about the project's directory structure and the purpose of each directory.

## Main Directories

### `/src`
The main source directory containing all application code.

#### `/components`
Reusable UI components used across the application.
- Each component should have its own directory
- Include any component-specific styles or utilities
- Components should be generic and reusable

#### `/layouts`
Layout components that provide structure to pages.
- `Layout.jsx` - Base layout with navbar and footer
- Other specialized layouts

#### `/pages`
Page components and page-specific components.
- Organized by feature/section
- Each page can have its own components directory

##### `/pages/admin`
Admin-specific pages and components.
- `components/` - Admin-specific reusable components
- Each admin feature has its own component file
- Follows consistent styling and layout patterns

#### `/routes`
Route configurations and route-related components.
- `AdminRoutes.jsx` - Admin section routing
- Other route configurations

#### `/utils`
Utility functions and helper methods.
- Reusable functions
- Constants
- Type definitions

#### `/hooks`
Custom React hooks.
- Shared logic between components
- Complex state management
- API interaction hooks

#### `/context`
React Context providers and related logic.
- Global state management
- Theme providers
- Authentication context

#### `/assets`
Static assets used in the application.
- Images
- Icons
- Other media files

#### `/styles`
Global styles and style utilities.
- Global CSS
- Tailwind configurations
- Style constants

## Best Practices
1. Keep components small and focused
2. Use appropriate directory for each file type
3. Follow naming conventions from .cursorrules
4. Document complex components and utilities
5. Maintain consistent file structure within directories 