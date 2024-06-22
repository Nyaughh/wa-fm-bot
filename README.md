# WhatsApp Last.fm Song Tracking Bot

## Table of Contents

-   [Introduction](#introduction)
-   [Features](#features)
-   [Installation](#installation)
-   [Usage](#usage)
-   [Support](#support)
-   [Acknowledgements](#acknowledgements)

## Introduction

The WhatsApp Last.fm Song Tracking Bot is a TypeScript-based bot that allows users to track their listening habits on Last.fm via WhatsApp. By sending simple commands, users can get information about their currently playing track, recent tracks, top artists, and more directly through WhatsApp.

## Features

-   Track currently playing song
-   Get recent tracks
-   Display top artists
-   Integration with Last.fm API
-   Simple WhatsApp commands
-   Support for Spotify and YouTube links

## Installation

### Prerequisites

-   Node.js v14 or higher
-   npm or yarn
-   MongoDB
-   A Last.fm API key
-   A Spotify API key and secret
-   A YouTube API key
-   A WhatsApp account

### Steps

1. Clone the repository:
    ```bash
    git clone https://github.com/Nyaughh/wa-fm-bot
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

-   `!help` - Display the help message with a list of all commands.
-   `!hi` - Greet the bot.
-   `!sponsor` - Get information about sponsoring the bot.

### LastFM Commands

-   `!lfu` - Last.fm account details.
-   `!login` - Log in to your Last.fm account.
-   `!play` - Play any song by the name and get the youtube url with an mp3 file.
-   `!artist [artist name]` - Get information about a specific artist.
-   `!fma` - Get a youtube URL of your current song.
-   `!fmall` - Get the list of all the users with their current and last listened songs.
-   `!fmp3` - Get mp3 of your current song.
-   `!fmspotify` - Get your top Spotify tracks.
-   `!grid` - Generate a grid of your top albums.
-   `!logout` - Log out from your Last.fm account.
-   `!members` - Get a list of group members logged in.
-   `!recents` - Get your recent tracks.
-   `!time` - Get the amount of time spent listening.
-   `!wac` - Get your weekly album chart.
-   `!whoknowsas [artist name]` - Get the top listeners for a specific artist.
-   `!whoknows [artist]` - Get the top listeners for a specific artist.
-   `!whoknowscurrenttrack` - Get the top listeners for the currently playing track.

Example usage:

```text
User: !fms
Bot: "User" is currently listening to: "Spotify Song URL".
```

<!-- ## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started. -->

### Issues

If you find a bug or have a feature request, please open an issue [here](https://github.com/Nyaughh/wa-fm-bot/issues).

<!-- ## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details. -->

## Support

If you like this project, consider supporting us. Here are some ways you can help:

-   Starring the repository
-   [GitHub Sponsors](https://github.com/sponsors/Nyaughh)

## Acknowledgements

-   [Baileys](https://github.com/whiskeysockets/baileys) - For the WhatsApp Web API.
-   [Last.fm API](https://www.last.fm/api) - For song tracking and information.
-   [LastFM-Typed](https://npmjs.com/package/lastfm-typed) - For Strongly typed Last.fm API SDK.
-   [Spotify Web API](https://developer.spotify.com/documentation/web-api/) - For Spotify song links.
-   [YouTube Data API](https://developers.google.com/youtube/v3) - For YouTube song links.
