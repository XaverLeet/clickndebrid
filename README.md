# clickndebrid

Node.js [Click'n'Load](https://jdownloader.org/knowledge/wiki/glossary/cnl2) server with automatic [real-debrid.com](https://real-debrid.com) conversion. 

`clickndebrid` acts as a proxy server listening on port 9666, waiting for crypted [Click'n'Load](https://jdownloader.org/knowledge/wiki/glossary/cnl2) POST request. It then tries to convert the received links to an unrestricted real-debrid.com link if possible using their [API](https://api.real-debrid.com). Finally it submits the (hopefully) converted links to your custom download manager, preferably [PyLoad](https://pyload.net).

## Usage

### manual
```bash
git clone https://github.com/XaverLeet/clickndebrid.git
cd clickndebrid
npm install
npm start
```

### locally using Docker
```bash
docker build -t clickndebrid .
docker run --rm -p 127.0.0.1:9666:9666 -e REALDEBRID_TOKEN=X245A4XAIBGVM -e CNL_URL=http://192.168.1.1:9666 clickndebrid
```

### docker-compose (prefered)

Edit the environment variables in the `docker-compose.yml` file.

```bash
docker compose build
docker compose up -d
```

## Environment Variables
- `REALDEBRID_TOKEN`: You secret API token issued at http://real-debrid.com/apitoken after logged in. Example: HYG6INDYBRFSD4YTKE3QRSGYK4921A6OLHIIFFWITBZNNAANC67Q
- `CNL_URL`: URL of the Click'n'Load server, preferably [PyLoad](https://pyload.net), including the Click'n'Load port 9666. Example: http://192.168.1.1:9666 (without a trailing slash!).
- `REDIS_URL`: URL of a [Redis](https://redis.io) server used for caching