# Stremio Discord Rich Presence Pipeline

A robust Node.js implementation for syncing Stremio playback status to Discord Rich Presence. This tool focuses on cleaning messy torrent filenames into canonical titles and fetching accurate poster art using NLP and public APIs.

## Features

- Canonical Title Extraction: Uses regex and the Compromise NLP library to strip technical tags, release group metadata, and episode-specific names from filenames.
- Robust Sanitization: Automatically removes brackets, parentheses, technical jargon (1080p, x265, HEVC), and invisible characters.
- Episode Detection: Supports multiple patterns including SxE, SxxExx, and Anime-style hyphenated episode numbering.
- Poster Art Integration: Prioritizes Stremio metadata for posters and falls back to a two-stage TVMaze API search (Single Search and General Search) for missing covers.
- Intelligent Caching: Maintains a local cache.json file with fuzzy matching support to reduce API overhead and ensure consistent presence even for slightly different filenames.
- Differential Updates: Only updates Discord Presence when a change in title, state, or poster is detected to respect rate limits.

## Upcoming Enhancements
- Enahnced Title Extraction for unconventional titles
- Better Movie Support

## Prerequisites

- Node.js (v16 or higher recommended)
- Stremio with the Local HTTPS/HTTP server enabled (usually port 11470)
- Discord Desktop Client

## Installation

1. Clone the repository to your local machine.
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a .env file in the root directory with the following variables:

- CLIENT_ID: Your Discord Application Client ID.
- STREMIO_ENDPOINT: The URL to your Stremio stats.json (default: http://127.0.0.1:11470/stats.json).

Example .env:
```env
CLIENT_ID=3846067607497881711
STREMIO_ENDPOINT=http://127.0.0.1:11470/stats.json
```

## Usage

Start the RPC script:
```bash
node index.js
```

The script will automatically connect to Discord and begin polling your local Stremio instance every 15 seconds.

## Technical Details

### Sanitization Pipeline

The pipeline follows these steps:
1. Normalizes separators (dots, underscores) to spaces.
2. Identifies the first episode marker (e.g., S01E01 or - 01).
3. Discards everything after the marker to isolate the Series/Movie title.
4. Scrubs technical tags and release group info.
5. Performs NLP normalization to finalize the canonical title.

### Caching Strategy

The system uses the string-similarity library to perform fuzzy matching against the cache. If a new filename is 90% similar to an existing cached entry, it reuses the previously sanitized title and fetched poster URL to avoid redundant processing and API calls.

### Poster Fetching Logic

1. Checks active Stremio stream metadata for an internal poster URL.
2. Queries TVMaze Single Search API for an exact match.
3. Falls back to TVMaze General Search and selects the top result if Single Search fails.
4. Reverts to a default Stremio asset if no poster is found.
