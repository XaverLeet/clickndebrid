# ClicknDebrid

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-23.x-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-lightgrey)](https://expressjs.com/)
[![Redis](https://img.shields.io/badge/Redis-Optional-red)](https://redis.io/)

A modern Node.js [Click'n'Load](https://jdownloader.org/knowledge/wiki/glossary/cnl2) proxy server that converts links via debrid services and forwards them to download managers. ClicknDebrid sits between file hosting sites and your download manager, automatically processing links through premium debrid services to unlock faster downloads without captchas or speed limits.

## Features

- **Click'n'Load Integration**: Intercepts CNL2 requests for link processing
- **Debrid Service Support**: Converts links using Real-Debrid API
- **Admin Dashboard**: Modern web interface for package management
- **Responsive Design**: Dark-themed UI with Tailwind CSS
- **Flexible Storage**: Redis or in-memory caching

## Key Benefits

- **Automatic Processing**: No manual copy-pasting of links between services
- **Premium Features**: Get full download speeds without site restrictions
- **Centralized Management**: View all packages and their processing status in the admin UI
- **Self-Hosted**: Complete control over your data and downloads
- **Extensible**: Support for multiple debrid services (currently Real-Debrid, more planned)

## Prerequisites

- Node.js 23.x
- npm 10.x or higher
- Redis (optional, for production use)

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/XaverLeet/clickndebrid.git

# Navigate to the project directory
cd clickndebrid

# Install dependencies
npm install

# Start the application
npm start
```

### Using Docker

#### Single Container

```bash
# Build the image
docker build -t clickndebrid .

# Run the container
docker run --rm -p 127.0.0.1:9666:9666 \
  -e CND_REALDEBRID_APITOKEN=YOUR_API_TOKEN \
  -e CND_DESTINATION_URL=http://192.168.1.1:9666 \
  -e CND_PORT=9666 \
  clickndebrid
```

#### Docker Compose (Recommended)

```bash
# Start with docker-compose
docker compose up -d
```

Find a docker-compose.yml example in the `docker-compose.yml` file.

```docker-compose.yml
services:
  app:
    build:
      dockerfile: Dockerfile
    restart: unless-stopped
    user: 1000:1000
    ports:
      - 127.0.0.1:9666:9666
    environment:
      - "CND_DEBRIDSERVICE=realdebrid"
      - "CND_REALDEBRID_APITOKEN="
      # Click'n'Load Destination (e.g. PyLoad)
      - "CND_DESTINATION_URL=http://localhost:9666"
      - "CND_PORT=9666"
      # Redis Configuration
      - "CND_REDIS_ENABLED=true"
      - "CND_REDIS_URL=redis://redis:6379"
      - "CND_REDIS_USERNAME="
      - "CND_REDIS_PASSWORD="
      - "CND_REDIS_TTL=360000"
      # Logger Configuration
      - "CND_LOG_LEVEL=info"
  redis:
    image: redis:alpine
    restart: unless-stopped
    volumes:
      - ./redis:/data
```

## Configuration

### Environment Variables

| Variable                  | Description                              | Default                     |
| ------------------------- | ---------------------------------------- | --------------------------- |
| `NODE_ENV`                | Node.js environment                      | `development`               |
| `CND_DEBRIDSERVICE`       | Debrid service to use (e.g., realdebrid) | `realdebrid`                |
| `CND_REALDEBRID_APITOKEN` | Real-Debrid API token                    | _Required_                  |
| `CND_DESTINATION_URL`     | URL of the Click'n'Load server           | _Required_                  |
| `CND_PORT`                | Port for the server                      | `9666`                      |
| `CND_REDIS_ENABLED`       | Enable Redis cache                       | `false`                     |
| `CND_REDIS_URL`           | Redis server URL                         | `redis://localhost:6379`    |
| `CND_LOG_LEVEL`           | Logging level (debug, info, warn, error) | `info`                      |
| `CND_ADMIN_USERNAME`      | Admin username                           | _Required for admin access_ |
| `CND_ADMIN_PASSWORD`      | Admin password                           | _Required for admin access_ |

### Configuration Methods

1. **Environment Variables**: Set directly in your environment
2. **Dotenv File**: Create a `.env` file based on `.env.example`
3. **Docker Environment**: Pass as environment variables to Docker

## Usage & How It Works

1. **Interception**: When a user clicks a Click'n'Load button on a website, instead of sending the encrypted package to the default CNL port (9666), it's sent to ClicknDebrid running on the same port.

2. **Decryption**: ClicknDebrid decrypts the Click'n'Load package to extract the original links.

3. **Link Conversion**: The extracted links are sent to configured debrid service (e.g., Real-Debrid) which returns unrestricted links with direct access to the files. This converts premium-only links into direct download links accessible at full speed.

4. **Forwarding**: ClicknDebrid forwards these unrestricted links to your configured download manager (e.g., PyLoad, JDownloader, etc.).

5. **Storage**: Package information and processing results are stored in Redis (or memory cache if Redis is disabled) for management via the admin interface.

## Admin Interface

Access the admin interface at `/admin` to:

- View all packages
- Process packages on demand
- Delete packages
- View processing results

## Development

```bash
# Start development server with hot reloading
npm run dev

# Build the production version
npm run build

# Run tests
npm test

# Format code
npm run format

# Run linter
npm run lint
```

## Architecture

See [Architecture Documentation](./docs/architecture.md) for details on the project structure and components.

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes using conventional commits: `git commit -m "feat: add amazing feature"`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
