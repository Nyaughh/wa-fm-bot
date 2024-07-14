import { Client as GeniusClient } from 'genius-lyrics';

const ACCESS_TOKEN = 'nBUjGNJLO8tUwkrGVUm_rxaX6zkYwcAbtLoH-Ga_mJvzEq3IMV3j6RgFHRZtQMLY';
const client = new GeniusClient(ACCESS_TOKEN);

export const searchSong = async (query: string) => {
  try {
    const searches = await client.songs.search(query);
    return searches;
  } catch (error) {
    console.error('Error fetching data from Genius API:', error);
    return [];
  }
};

export const getSongLyrics = async (songId: number) => {
  try {
    const song = await client.songs.get(songId);
    return song.lyrics();
  } catch (error) {
    console.error('Error fetching song lyrics from Genius:', error);
    return 'Error fetching lyrics';
  }
};
