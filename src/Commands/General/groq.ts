import Groq from "groq-sdk";
import { BaseCommand } from '../../Structures/Command/BaseCommand';
import { Command } from '../../Structures/Command/Command';
import Message from '../../Structures/Message';
import { ChatCompletion, ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import axios from "axios";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const groupConversationHistory: { [groupJid: string]: {  name?: string, tool_call_id?: string, role: 'system' | 'user' | 'assistant' | 'tool' , content: string }[] } = {};

@Command('chat', {
  aliases: ['/'],
  category: 'General',
  description: {
    content: 'Chat with the bot.',
  },
})
export default class extends BaseCommand {
  override execute = async (M: Message): Promise<void> => {
    const userMessage = M.content.split(' ').slice(1).join(' ');

    if (!userMessage) {
      await M.reply('Please provide a message to chat with.');
      return;
    }

    const groupJid = M.from;
    const userJid = M.sender.jid;
    const username = M.sender.username || "unknown"
    const isGroup = !!M.group;

    const messages = groupConversationHistory[groupJid] || []

    if (messages.length > 50) {
      groupConversationHistory[groupJid] = messages.slice(-45)
    }

    if (!groupConversationHistory[groupJid]) {
      groupConversationHistory[groupJid] = [
        {
          role: "system",
          content: isGroup
            ? `You are a helpful assistant in a group chat named "${M.group?.title}". The messages from the users would be in the following format:
            [USERNAME] (LastFM USERNAME): [MESSAGE]
            [QUOTED MESSAGE]
            You can use the LastFM API to get information about the user's recently played songs and give them recommendations.`
            : `You are a helpful assistant in a private chat. Provide personalized and direct responses.`,
        },
        {
          role: "system",
          content: `You have access to the following tools:
          - getlastfmRecs: Get the recommended songs from a LastFM user
          - getlastfmMix: Get a mix of songs from a LastFM user
          - getTopSongs: Get the top songs of a LastFM user
          - getTopAlbums: Get the top albums of a LastFM user
          - getLastFmUsernameFromPhone: Get the LastFM username associated with a WhatsApp phone number
          - getSimilarArtists: Get similar artists to a given artist
          - getArtistSongs: Get top songs of a given artist
          - getArtistInfo: Get the bio of a given artist
          
          You can use mutiple tools at once but only tools which doesn't rely on the response of other tools.
          For example: If a user ask you to give them info about an artist, you can use the getArtistInfo tool and the getArtistSongs tool to get the info and the songs of the artist.
          But if a user asks you to recomend songs to a phone number:
          First you need to get the LastFM username associated with the phone number
          After you get the result back, then only you can fetch the recommended songs from the user.`
    
        }
      ];
    }

    let recentSongs = '';
    let lastfmUsername = ''
    const user = await this.client.database.User.findOne({ jid: userJid }).lean();
    if (user?.lastfm) {
      try {
        const { tracks } = await this.client.lastfm.user.getRecentTracks({ user: user.lastfm });
        recentSongs = tracks.map(track => `${track.name} by ${track.artist.name}`).join(', ');
        const lfmuser = await this.client.lastfm.user.getInfo({ user: user.lastfm })
        lastfmUsername = lfmuser.name
      } catch (error) {
        console.error('Error fetching LastFM tracks:', error);
      }
    }
  
    if (recentSongs) {
      groupConversationHistory[groupJid].push({
        role: "system",
        content: `${username}'s recently played songs: ${recentSongs}. You can ask about these songs and give them recommendations.`
      });
    }

    let quoted = ''

    if (M.quoted) {
      const text = M.quoted.message.extendedTextMessage ? M.quoted.message.extendedTextMessage.text : M.quoted.message.conversation
      
      if (text) {
        quoted = `${M.quoted.sender.username}: ${text}`
      }
    }

    const formattedUserMessage = isGroup
      ? `${username}${lastfmUsername ? ` (Lastfm: ${lastfmUsername})` : ''}: ${userMessage} ${quoted ? '\n\n[QUOTED]: ' + quoted : ''}`
      : userMessage;

    groupConversationHistory[groupJid].push({
      role: "user",
      content: formattedUserMessage,
    });


    try {
      let response = await this.processGroqResponse(groupConversationHistory[groupJid], M);

      await M.reply(response);
    } catch (error) {
      console.error('Error processing request:', error);
      await M.reply('Sorry, there was an error processing your request.');
    }
  };

  private async processGroqResponse(messages: { role: 'system' | 'user' | 'assistant' | 'tool', name?: string, tool_call_id?: string, content: string }[], M: Message): Promise<string> {
    const chatCompletion = await this.getGroqChatCompletion(messages as any)
    const response = chatCompletion.choices[0].message
    console.log(response.tool_calls?.map(tool => tool.function.name))
    if (response.tool_calls) {
      for (const toolCall of response.tool_calls) {    
        let toolresponse = ''
      if (toolCall.function.name === "getlastfmRecs") {
        const { username, limit } = JSON.parse(toolCall.function.arguments)
        toolresponse = await this.getlastfmRecs(username, limit)
      } else if (toolCall.function.name === "getlastfmMix") {
        const { username, limit } = JSON.parse(toolCall.function.arguments)
        toolresponse = await this.getlastfmMix(username, limit)
      } else if (toolCall.function.name === "getTopSongs") {
        const { username, limit, period } = JSON.parse(toolCall.function.arguments)
        toolresponse = await this.getTopSongs(username, limit, period)
      } else if (toolCall.function.name === "getTopAlbums") {
        const { username, limit, period } = JSON.parse(toolCall.function.arguments)
        toolresponse = await this.getTopAlbums(username, limit, period)
      } else if (toolCall.function.name === "getLastFmUsernameFromPhone") {
        const { phone } = JSON.parse(toolCall.function.arguments)
        toolresponse = await this.getLastFmUsernameFromPhone(phone)    
      } else if (toolCall.function.name === "getSimilarArtists") {
        const { artist, limit } = JSON.parse(toolCall.function.arguments)
        toolresponse = await this.getSimilarArtists(artist, limit)
      } else if (toolCall.function.name === "getArtistSongs") {
        const { artist, limit } = JSON.parse(toolCall.function.arguments)
        toolresponse = await this.getArtistSongs(artist, limit)
      } else if (toolCall.function.name === "getArtistInfo") {
        const { artist } = JSON.parse(toolCall.function.arguments)
        toolresponse = await this.getArtistInfo(artist)
      }

      console.log(toolCall.function.name, toolresponse)

      groupConversationHistory[M.from].push({
        role: "tool",
        name: toolCall.function.name,
        tool_call_id: toolCall.id,
        content: toolresponse
      })

      return this.processGroqResponse(groupConversationHistory[M.from], M)

    }
  }

    groupConversationHistory[M.from].push({ ...response, content: response.content || "I don't know what to say" })
    return response.content || "I don't know what to say"
  }


  private async getGroqChatCompletion(messages: { role: 'system' | 'user' | 'assistant' | 'tool', name: string, tool_call_id?: string, content: string }[]) {
    return groq.chat.completions.create({
      messages: messages as ChatCompletionMessageParam[],
      model: "llama3-groq-70b-8192-tool-use-preview",
      temperature: 0.7,
      tools: [{
        type: "function",
        function: {
          name: "getlastfmRecs",
          description: "Get the recommended songs from a LastFM user",
          parameters: {
            type: "object",
            properties: {
              username: { type: "string", description: "The username of the LastFM user" },
              limit: { type: "number", description: "The number of songs to get" }
            },
            required: ["username"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getlastfmMix",
          description: "Get a mix of songs from a LastFM user",
          parameters: {
            type: "object",
            properties: {
              username: { type: "string", description: "The username of the LastFM user" },
              limit: { type: "number", description: "The number of songs to get" }
            },
            required: ["username"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getTopSongs",
          description: "Get the top songs of a LastFM user",
          parameters: {
            type: "object",
            properties: {
              username: { type: "string", description: "The username of the LastFM user" },
              limit: { type: "number", description: "The number of songs to get" },
              period: { type: "string", enum: ['overall', '7day', '1month', '3month', '6month', '12month'], description: "The time period for the top songs" }
            },
            required: ["username"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getTopAlbums",
          description: "Get the top albums of a LastFM user",
          parameters: {
            type: "object",
            properties: {
              username: { type: "string", description: "The username of the LastFM user" },
              limit: { type: "number", description: "The number of albums to get" },
              period: { type: "string", enum: ['overall', '7day', '1month', '3month', '6month', '12month'], description: "The time period for the top albums" }
            },
            required: ["username"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getLastFmUsernameFromPhone",
          description: "Get the LastFM username associated with a WhatsApp phone number",
          parameters: {
            type: "object",
            properties: {
              phone: { type: "string", description: "The WhatsApp phone number" }
            },
            required: ["phone"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getSimilarArtists",
          description: "Get similar artists to a given artist",
          parameters: {
            type: "object",
            properties: {
              artist: { type: "string", description: "The name of the artist" },
              limit: { type: "number", description: "The number of similar artists to get" }
            },
            required: ["artist"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getArtistSongs",
          description: "Get top songs of a given artist",
          parameters: {
            type: "object",
            properties: {
              artist: { type: "string", description: "The name of the artist" },
              limit: { type: "number", description: "The number of songs to get" }
            },
            required: ["artist"],
          }
        }
      }, {
        type: "function",
        function: {
          name: "getArtistInfo",
          description: "Get the bio of a given artist",
          parameters: {
            type: "object",
            properties: {
              artist: { type: "string", description: "The name of the artist" }
            },
            required: ["artist"],
          }
        }
      }]
    })
  }

  private async getlastfmRecs(username: string, limit = 5) {
     const link = `https://www.last.fm/player/station/user/${username}/recommended`
     const response = await axios.get<{
      playlist: Array<{
        _name: string
        url: string
        duration: number
        artists: Array<{
          _name: string
        }>
        playlinks: Array<{
          affiliate: string
          url: string
        }>
      }>
     }>(link, { responseType: 'json' })
    
     const songs = response.data.playlist.slice(0, limit).map((song, index) => {
      return `${index + 1}. ${song._name} - ${song.artists.map(artist => artist._name).join(', ')}\n${song.playlinks.map(playlink => playlink.url).join('\n')}`
     })
     return songs.join('\n')
  }

  private async getlastfmMix(username: string, limit = 5) {
    const link = `https://www.last.fm/player/station/user/${username}/mix`
    const response = await axios.get<{
      playlist: Array<{
        _name: string
        url: string
        duration: number
        artists: Array<{
          _name: string
        }>
        playlinks: Array<{
          affiliate: string
          url: string
        }>
      }>
    }>(link, { responseType: 'json' })
    
    return response.data.playlist.slice(0, limit).map((song, index) => {
      return `${index + 1}. ${song._name} - ${song.artists.map(artist => artist._name).join(', ')}\n${song.playlinks.map(playlink => playlink.url).join('\n')}`
    }).join('\n')
  }

  private async getTopSongs(username: string, limit = 5, period: 'overall' | '7day' | '1month' | '3month' | '6month' | '12month' = 'overall') {
    const { tracks } = await this.client.lastfm.user.getTopTracks({ user: username, limit, period })
    return tracks.map((track, index) => {
      return `${index + 1}. ${track.name} - ${track.artist.name}`
    }).join('\n')
  }

  private async getTopAlbums(username: string, limit = 5, period: 'overall' | '7day' | '1month' | '3month' | '6month' | '12month' = 'overall') {
    const { albums } = await this.client.lastfm.user.getTopAlbums({ user: username, limit, period })
    return albums.map((album, index) => {
      return `${index + 1}. ${album.name} - ${album.artist.name}`
    }).join('\n')
  }

  private async getLastFmUsernameFromPhone(phone: string) {
    const user = await this.client.database.User.findOne({ jid: phone.replace('@', '').replace('+', '').concat('@s.whatsapp.net') })
    if (!user?.lastfm) {
      return 'This user does not have a LastFM account associated with their WhatsApp account.'
    }
    const { name } = await this.client.lastfm.user.getInfo({ user: user.lastfm })
    return `${phone} is ${name}`
  }

  private async getSimilarArtists(artist: string, limit = 5) {
    const { artists } = await this.client.lastfm.artist.getSimilar({ artist, limit })
    return artists.map((artist, index) => {
      return `${index + 1}. ${artist.name}`
    }).join('\n')
  }

  private async getArtistSongs(artist: string, limit = 5) {
    const { tracks } = await this.client.lastfm.artist.getTopTracks({ artist, limit })
    return tracks.map((track, index) => {
      return `${index + 1}. ${track.name}`
    }).join('\n')
  }

  private async getArtistInfo(artist: string) {
    const { bio } = await this.client.lastfm.artist.getInfo({ artist })
    return bio?.content ?? 'This artist does not have a bio'
  }


}