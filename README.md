
# WhatsApp Last.fm Song Tracking Bot

![WhatsApp Last.fm Bot](https://example.com/logo.png)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/travis/username/repo.svg)](https://travis-ci.org/username/repo)
[![GitHub Issues](https://img.shields.io/github/issues/username/repo.svg)](https://github.com/username/repo/issues)
[![Contributors](https://img.shields.io/github/contributors/username/repo.svg)](https://github.com/username/repo/graphs/contributors)

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Acknowledgements](#acknowledgements)

## Introduction

The WhatsApp Last.fm Song Tracking Bot is a TypeScript-based bot that allows users to track their listening habits on Last.fm via WhatsApp. By sending simple commands, users can get information about their currently playing track, recent tracks, top artists, and more directly through WhatsApp.

## Features

- Track currently playing song
- Get recent tracks
- Display top artists
- Integration with Last.fm API
- Simple WhatsApp commands
- Support for Spotify and YouTube links

## Installation

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- MongoDB
- A Last.fm API key
- A Spotify API key and secret
- A YouTube API key
- A WhatsApp account

### Steps

1. Clone the repository:
    ```bash
    git clone https://github.com/username/repo.git
    ```
2. Change to the project directory:
    ```bash
    cd repo
    ```
3. Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```
4. Create a `.env` file in the root directory and add your MongoDB URI, Last.fm API key and secret, Spotify client ID and secret, and YouTube API key:
    ```env
    MONGO_URI=your_mongo_uri
    LASTFM_API_KEY=your_lastfm_api_key
    LASTFM_API_SECRET=your_lastfm_api_secret
    SPOTIFY_CLIENT_ID=your_spotify_client_id
    SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
    YOUTUBE_API_KEY=your_youtube_api_key
    ```
5. Build the project:
    ```bash
    npm run build
    # or
    yarn build
    ```
6. Start the bot:
    ```bash
    npm start
    # or
    yarn start
    ```

## Usage

Once the bot is running, you can interact with it through WhatsApp using the following commands:

### General Commands
- `!help` - Display the help message with a list of all commands.
- `!hi` - Greet the bot.
- `!sponsor` - Get information about sponsoring the bot.
- `!sticker` - Request a sticker.

### LastFM Commands
- `!lfu` - Link your Last.fm username.
- `!login` - Log in to your Last.fm account.
- `!play` - Get the currently playing track.
- `!artist [artist name]` - Get information about a specific artist.
- `!fmcompat [user1] [user2]` - Check compatibility between two users.
- `!fm` - Get your Last.fm profile information.
- `!fma` - Get your Last.fm profile information in a different format.
- `!fmall` - Get a detailed summary of your Last.fm account.
- `!fmp3` - Get your top 3 tracks.
- `!fmspotify` - Get your top Spotify tracks.
- `!grid` - Generate a grid of your top artists.
- `!logout` - Log out from your Last.fm account.
- `!members` - Get a list of group members.
- `!recents` - Get your recent tracks.
- `!time` - Get the amount of time spent listening.
- `!wac` - Get your weekly artist chart.
- `!whoknowsas [artist name]` - Get the top listeners for a specific artist.
- `!whoknows [track name]` - Get the top listeners for a specific track.
- `!whoknowscurrenttrack` - Get the top listeners for the currently playing track.

Example usage:
```text
User: !play
Bot: You are currently listening to "Song Title" by "Artist Name".
```

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

### Issues

If you find a bug or have a feature request, please open an issue [here](https://github.com/username/repo/issues).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

If you like this project, consider supporting us. Here are some ways you can help:

- Starring the repository
- [Donating](https://example.com/donate) via our custom link

Or through any of the following platforms:

- [GitHub Sponsors](https://github.com/sponsors/username)
- [Patreon](https://patreon.com/username)
- [Open Collective](https://opencollective.com/username)
- [Ko-fi](https://ko-fi.com/username)

## Acknowledgements

- [WhatsApp Web.js](https://github.com/pedroslopez/whatsapp-web.js) - For WhatsApp integration.
- [Last.fm API](https://www.last.fm/api) - For song tracking and information.
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) - For Spotify song links.
- [YouTube Data API](https://developers.google.com/youtube/v3) - For YouTube song links.

