# ClicknDebrid Architecture

## Overview

ClicknDebrid is a Node.js application that acts as a Click'n'Load proxy server. It intercepts Click'n'Load requests, processes the links through debrid services (like Real-Debrid or AllDebrid), and forwards the unrestricted links to download managers such as PyLoad. The application features a modern admin interface for managing packages and monitoring processing status.

## System Architecture

The application follows a modular TypeScript-based Node.js architecture with the following components:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Web Browser    │────▶│  Express Server │────▶│  Debrid APIs    │
│  (Frontend)     │◀────│  (Backend)      │◀────│                 │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 │
                        ┌────────▼────────┐     ┌─────────────────┐
                        │                 │     │                 │
                        │  Redis/Memory   │────▶│  Download       │
                        │  Cache          │     │  Manager        │
                        │                 │     │  (PyLoad etc.)  │
                        └─────────────────┘     └─────────────────┘
```

### Key Components

1. **Frontend**: EJS templates with Tailwind CSS for styling and minimal vanilla JavaScript
2. **Backend**: Express.js server with TypeScript providing RESTful API endpoints
3. **Caching Layer**: Configurable Redis or in-memory caching for storing package data
4. **Debrid Integration**: Modular services for communicating with various debrid APIs
5. **Logging System**: Winston-based structured logging with configurable log levels

## Core Modules

### 1. Click'n'Load Processing

The CNL processing system handles the decryption and processing of Click'n'Load requests.

#### Key Files:

- `/src/services/cnlService.ts`: Handles Click'n'Load protocol processing
- `/src/services/cryptoService.ts`: Provides cryptographic operations for decryption
- `/src/routes/root.ts`: Handles inbound Click'n'Load requests

### 2. Package Management

The package management system handles the storage, retrieval, and processing of link packages.

#### Key Files:

- `/src/routes/api/v1/packages.ts`: API endpoints for package operations
- `/src/services/debridService.ts`: Coordinates debrid service processing
- `/src/views/pages/admin/packages.ejs`: Admin UI for package management

#### Package Data Structure:

```typescript
interface Package {
  id: string; // Unique package identifier
  name: string; // Package name
  timestamp: string; // Creation timestamp (ISO format)
  crypted: string; // Encrypted Click'n'Load data
  jk: string; // Decryption key
  links?: string[]; // Decrypted links (if processed)
  service?: string; // Debrid service used (if processed)
  files?: DebridFile[]; // Resulting files (if processed)
}

interface DebridFile {
  name: string; // File name
  size: number; // File size in bytes
  url: string; // Download URL
  expires?: number; // Expiration timestamp
}
```

### 3. Debrid Service Integration

This module handles the integration with various debrid services using a pluggable architecture.

#### Key Files:

- `/src/services/debridService.ts`: Main service handling debrid operations
- `/src/services/debrids/realDebrid.ts`: Real-Debrid implementation

### 4. Caching System

The caching system provides a unified interface for storing and retrieving data.

#### Key Files:

- `/src/services/cache/cacheFactory.ts`: Factory for creating appropriate cache instances
- `/src/services/cache/redisCache.ts`: Redis implementation
- `/src/services/cache/memoryCache.ts`: In-memory implementation
- `/src/services/redis/redisClient.ts`: Redis client singleton implementation

### 5. Admin Interface

The admin interface provides a web-based UI for managing packages and monitoring system status.

#### Key Files:

- `/src/routes/admin.ts`: Admin route handlers
- `/src/views/pages/admin/`: Admin interface templates
- `/src/public/js/admin.js`: Admin interface client-side logic

## Request Flow

The typical flow of a request through the system:

1. **Interception**: Click'n'Load request received at the proxy endpoint
2. **Decryption**: CNL service decrypts the package data
3. **Storage**: Package stored in cache (Redis or memory)
4. **Processing**: Links sent to debrid service for unrestriction
5. **Forwarding**: Unrestricted links forwarded to configured download manager
6. **Monitoring**: Package status accessible via admin interface

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│  Client     │────▶│  CNL        │────▶│  Debrid     │────▶│  Download   │
│  Request    │     │  Service    │     │  Service    │     │  Manager    │
│             │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                         │                    │
                         ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │             │     │             │
                    │  Cache      │     │  Admin      │
                    │  Service    │     │  Interface  │
                    │             │     │             │
                    └─────────────┘     └─────────────┘
```

## Deployment Architecture

The application supports multiple deployment strategies:

### Single Container Deployment

```
┌─────────────────────────────────────┐
│  Docker Container                   │
│                                     │
│  ┌─────────────┐  ┌─────────────┐   │
│  │             │  │             │   │
│  │  Node.js    │  │  Memory     │   │
│  │  App        │  │  Cache      │   │
│  │             │  │             │   │
│  └─────────────┘  └─────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Multi-Container Deployment

```
┌─────────────────┐  ┌─────────────────┐
│  App Container  │  │  Redis Container│
│                 │  │                 │
│  ┌─────────────┐│  │┌─────────────┐  │
│  │             ││  ││             │  │
│  │  Node.js    ││◀─┼▶│  Redis     │  │
│  │  App        ││  ││  Server     │  │
│  │             ││  ││             │  │
│  └─────────────┘│  │└─────────────┘  │
│                 │  │                 │
└─────────────────┘  └─────────────────┘
```

## Security Considerations

1. **Authentication**: Admin interface is protected with username/password authentication
2. **Environment Variables**: Sensitive configuration stored in environment variables
3. **Input Validation**: All external inputs are validated and sanitized
4. **HTTPS**: Production deployments should be configured behind HTTPS
