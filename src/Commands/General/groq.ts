import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import { BaseCommand } from '../../Structures/Command/BaseCommand';
import { Command } from '../../Structures/Command/Command';
import Message from '../../Structures/Message';
import axios from "axios";
import { ContentBlock, ToolResultBlockParam, ToolUseBlockParam } from "@anthropic-ai/sdk/resources";
import { GoogleAuth } from 'google-auth-library';

const anthropic = new AnthropicVertex({
  googleAuth: new GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_AUTH_CREDENTIALS as string),
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  }),
});

const groupConversationHistory: { [groupJid: string]: { systemMessage: string, messages: any[] } } = {};
const frames = [
  '□□□□□',
  '■□□□□',
  '■■□□□',
  '■■■□□',
  '■■■■□',
  '■■■■■',
  '□■■■■',
  '□□■■■',
  '□□□■■',
  '□□□□■',
  '□□□□□',
];

@Command('chat', {
  aliases: ['/'],
  category: 'General',
  description: { content: 'Chat with the bot.' },
})
export default class extends BaseCommand {
  override execute = async (M: Message): Promise<void> => {
    const userMessage = M.content.split(' ').slice(1).join(' ');
    if (!userMessage) return void await M.reply('Please provide a message to chat with.');

    const groupJid = M.from;
    const { systemMessage, messages } = this.getOrCreateConversationHistory(groupJid, M);

    let recentSongs = '';
    let lastfmUsername = '';
    const user = await this.client.database.User.findOne({ jid: M.sender.jid }).lean();
    if (user?.lastfm) {
      try {
        const { tracks } = await this.client.lastfm.user.getRecentTracks({ user: user.lastfm, limit: 2 });
        recentSongs = tracks.map(track => `${track.name} by ${track.artist.name}`).join(', ');
        const lfmuser = await this.client.lastfm.user.getInfo({ user: user.lastfm });
        lastfmUsername = lfmuser.name;
      } catch (error) {
        console.error('Error fetching LastFM tracks:', error);
      }
    }

    if (recentSongs) {
      messages.push({
        role: "user",
        content: `${M.sender.username}'s recently played songs: ${recentSongs}. You can ask about these songs and give them recommendations.`
      });
    }

    const formattedUserMessage = this.formatUserMessage(M, userMessage, lastfmUsername);
    messages.push({ role: "user", content: formattedUserMessage });
    const thinkingMessage = await M.reply('Thinking:' + frames[0]);
    let frameIndex = 0;
    const spinner = setInterval(async () => {
      frameIndex = (frameIndex + 1) % frames.length;
      await this.client.sendMessage(M.from, { 
        text: 'Thinking... ' + frames[frameIndex],
        edit: thinkingMessage!.key  
      });  
    }, 1500)
    try {
      const response = await this.processAnthropicResponse(groupConversationHistory[groupJid], M);
      clearInterval(spinner);
      setTimeout(async () => {
        await this.client.sendMessage(M.from, {
          text: response,
          edit: thinkingMessage!.key
        });
      }, 1000);
    } catch (error) {
      console.error('Error processing request:', error);
      delete groupConversationHistory[groupJid];
      clearInterval(spinner);
      setTimeout(async () => {
        await this.client.sendMessage(M.from, {
          text: 'Sorry, there was an error processing your request.',
          edit: thinkingMessage!.key
        });
      }, 1000);
    }
  };

  private async processAnthropicResponse(messages: typeof groupConversationHistory[string], M: Message): Promise<string> {
    const combinedMessages = this.combineConsecutiveUserMessages(messages.messages);

    const message = await this.getAnthropicChatCompletion({
      systemMessage: messages.systemMessage,
      messages: combinedMessages
    });

    groupConversationHistory[M.from].messages.push({
      role: "assistant",
      content: message.content
    });

    const textContent = message.content.filter(content => content.type === 'text').map(content => content.text).join('').trim();
    const toolCalls = message.content.filter(content => content.type === 'tool_use').map(content => content);

    if (toolCalls.length > 0) {
      const results = await this.processToolCalls(toolCalls, M);
      if (results.length > 0) {
        groupConversationHistory[M.from].messages.push({
          role: "user",
          content: results
        });
        return await this.processAnthropicResponse(groupConversationHistory[M.from], M);
      }
    }

    return textContent || "I don't know what to say";
  }

  private combineConsecutiveUserMessages(messages: any[]): any[] {
    return messages.reduce((acc, curr) => {
      if (curr.role === 'user' && acc.length > 0 && acc[acc.length - 1].role === 'user') {
        const lastMessage = acc[acc.length - 1];
        if (typeof lastMessage.content === 'string' && typeof curr.content === 'string') {
          lastMessage.content += '\n' + curr.content;
        } else {
          acc.push(curr);
        }
      } else {
        acc.push(curr);
      }
      return acc;
    }, []);
  }

  private async getAnthropicChatCompletion(history: { systemMessage: string, messages: any[] }) {
    return anthropic.messages.create({
      messages: history.messages,
      model: "claude-3-5-sonnet@20240620",
      system: history.systemMessage,
      temperature: 0.7,
      max_tokens: 1024,
      tools: [
        {
          name: "getlastfmRecs",
          description: "Get the recommended songs from a LastFM user",
          input_schema: {
            type: "object",
            properties: {
              username: { type: "string", description: "The username of the LastFM user" },
              limit: { type: "number", description: "The number of songs to get" }
            },
            required: ["username"],
          }
        },
        {
          name: "getlastfmMix",
          description: "Get a mix of songs from a LastFM user",
          input_schema: {
            type: "object",
            properties: {
              username: { type: "string", description: "The username of the LastFM user" },
              limit: { type: "number", description: "The number of songs to get" }
            },
            required: ["username"],
          }
        },
        {
          name: "getTopSongs",
          description: "Get the top songs of a LastFM user",
          input_schema: {
            type: "object",
            properties: {
              username: { type: "string", description: "The username of the LastFM user" },
              limit: { type: "number", description: "The number of songs to get" },
              period: { type: "string", enum: ['overall', '7day', '1month', '3month', '6month', '12month'], description: "The time period for the top songs" }
            },
            required: ["username"],
          }
        },
        {
          name: "getTopAlbums",
          description: "Get the top albums of a LastFM user",
          input_schema: {
            type: "object",
            properties: {
              username: { type: "string", description: "The username of the LastFM user" },
              limit: { type: "number", description: "The number of albums to get" },
              period: { type: "string", enum: ['overall', '7day', '1month', '3month', '6month', '12month'], description: "The time period for the top albums" }
            },
            required: ["username"],
          }
        },
        {
          name: "getLastFmUsernameFromPhone",
          description: "Get the LastFM username associated with a WhatsApp phone number",
          input_schema: {
            type: "object",
            properties: {
              phone: { type: "string", description: "The WhatsApp phone number" }
            },
            required: ["phone"],
          }
        },
        {
          name: "getSimilarArtists",
          description: "Get similar artists to a given artist",
          input_schema: {
            type: "object",
            properties: {
              artist: { type: "string", description: "The name of the artist" },
              limit: { type: "number", description: "The number of similar artists to get" }
            },
            required: ["artist"],
          }
        },
        {
          name: "getArtistSongs",
          description: "Get top songs of a given artist",
          input_schema: {
            type: "object",
            properties: {
              artist: { type: "string", description: "The name of the artist" },
              limit: { type: "number", description: "The number of songs to get" }
            },
            required: ["artist"],
          }
        },
        {
          name: "getArtistInfo",
          description: "Get the bio of a given artist",
          input_schema: {
            type: "object",
            properties: {
              artist: { type: "string", description: "The name of the artist" }
            },
            required: ["artist"],
          }
        }
      ]
    });
  }

  private async processToolCalls(toolCalls: ToolUseBlockParam[], M: Message): Promise<ToolResultBlockParam[]> {
    const results = new Array<ToolResultBlockParam>();
    for (const toolCall of toolCalls) {
      let toolresponse = '';
      if (toolCall.name === "getlastfmRecs") {
        const { username, limit } = toolCall.input as { username: string, limit: number };
        toolresponse = await this.getlastfmRecs(username, limit);
      } else if (toolCall.name === "getlastfmMix") {
        const { username, limit } = toolCall.input as { username: string, limit: number };
        toolresponse = await this.getlastfmMix(username, limit);
      } else if (toolCall.name === "getTopSongs") {
        const { username, limit, period } = toolCall.input as { username: string, limit: number, period: string };
        toolresponse = await this.getTopSongs(username, limit, period as 'overall' | '7day' | '1month' | '3month' | '6month' | '12month');
      } else if (toolCall.name === "getTopAlbums") {
        const { username, limit, period } = toolCall.input as { username: string, limit: number, period: string };
        toolresponse = await this.getTopAlbums(username, limit, period as 'overall' | '7day' | '1month' | '3month' | '6month' | '12month');
      } else if (toolCall.name === "getLastFmUsernameFromPhone") {
        const { phone } = toolCall.input as { phone: string };
        toolresponse = await this.getLastFmUsernameFromPhone(phone);
      } else if (toolCall.name === "getSimilarArtists") {
        const { artist, limit } = toolCall.input as { artist: string, limit: number };
        toolresponse = await this.getSimilarArtists(artist, limit);
      } else if (toolCall.name === "getArtistSongs") {
        const { artist, limit } = toolCall.input as { artist: string, limit: number };
        toolresponse = await this.getArtistSongs(artist, limit);
      } else if (toolCall.name === "getArtistInfo") {
        const { artist } = toolCall.input as { artist: string };
        toolresponse = await this.getArtistInfo(artist);
      }

      if (!toolresponse) continue;

      results.push({
        type: "tool_result",
        tool_use_id: toolCall.id,
        content: toolresponse
      });
    }
    return results;
  }

  private async getlastfmRecs(username: string, limit = 5) {
    const link = `https://www.last.fm/player/station/user/${username}/recommended`;
    const response = await axios.get<{
      playlist: Array<{
        _name: string;
        url: string;
        duration: number;
        artists: Array<{ _name: string }>;
        playlinks: Array<{ affiliate: string; url: string }>;
      }>;
    }>(link, { responseType: 'json' });

    const songs = response.data.playlist.slice(0, limit).map((song, index) => {
      return `${index + 1}. ${song._name} - ${song.artists.map(artist => artist._name).join(', ')}\n${song.playlinks.map(playlink => playlink.url).join('\n')}`;
    });
    return songs.join('\n');
  }

  private async getlastfmMix(username: string, limit = 5) {
    const link = `https://www.last.fm/player/station/user/${username}/mix`;
    const response = await axios.get<{
      playlist: Array<{
        _name: string;
        url: string;
        duration: number;
        artists: Array<{ _name: string }>;
        playlinks: Array<{ affiliate: string; url: string }>;
      }>;
    }>(link, { responseType: 'json' });

    return response.data.playlist.slice(0, limit).map((song, index) => {
      return `${index + 1}. ${song._name} - ${song.artists.map(artist => artist._name).join(', ')}\n${song.playlinks.map(playlink => playlink.url).join('\n')}`;
    }).join('\n');
  }

  private async getTopSongs(username: string, limit = 5, period: 'overall' | '7day' | '1month' | '3month' | '6month' | '12month' = 'overall') {
    const { tracks } = await this.client.lastfm.user.getTopTracks({ user: username, limit, period });
    return tracks.map((track, index) => {
      return `${index + 1}. ${track.name} - ${track.artist.name}`;
    }).join('\n');
  }

  private async getTopAlbums(username: string, limit = 5, period: 'overall' | '7day' | '1month' | '3month' | '6month' | '12month' = 'overall') {
    const { albums } = await this.client.lastfm.user.getTopAlbums({ user: username, limit, period });
    return albums.map((album, index) => {
      return `${index + 1}. ${album.name} - ${album.artist.name}`;
    }).join('\n');
  }

  private async getLastFmUsernameFromPhone(phone: string) {
    const user = await this.client.database.User.findOne({ jid: phone.replace('@', '').replace('+', '').concat('@s.whatsapp.net') });
    if (!user?.lastfm) {
      return 'This user does not have a LastFM account associated with their WhatsApp account.';
    }
    const { name } = await this.client.lastfm.user.getInfo({ user: user.lastfm });
    return `${phone} is ${name}`;
  }

  private async getSimilarArtists(artist: string, limit = 5) {
    const { artists } = await this.client.lastfm.artist.getSimilar({ artist, limit });
    return artists.map((artist, index) => {
      return `${index + 1}. ${artist.name}`;
    }).join('\n');
  }

  private async getArtistSongs(artist: string, limit = 5) {
    const { tracks } = await this.client.lastfm.artist.getTopTracks({ artist, limit });
    return tracks.map((track, index) => {
      return `${index + 1}. ${track.name}`;
    }).join('\n');
  }

  private async getArtistInfo(artist: string) {
    const { bio } = await this.client.lastfm.artist.getInfo({ artist });
    return bio?.content ?? 'This artist does not have a bio';
  }

  private getOrCreateConversationHistory(groupJid: string, M: Message) {
    if (!groupConversationHistory[groupJid]) {
      groupConversationHistory[groupJid] = {
        systemMessage: this.generateSystemMessage(M),
        messages: []
      };
    }
    return groupConversationHistory[groupJid];
  }

  private generateSystemMessage(M: Message): string {
    const isGroup = !!M.group;
    const systemMessage = isGroup
      ? `You are a helpful assistant in a group chat named "${M.group?.title}". The messages from the users would be in the following format:
      [USERNAME] (LastFM USERNAME): [MESSAGE]
      [QUOTED MESSAGE]`
      : `You are a helpful assistant in a private chat. Provide personalized and direct responses.`;

    return systemMessage + `\nYou have access to the following tools:
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
      After you get the result back, then only you can fetch the recommended songs from the user.`;
  }

  private formatUserMessage(M: Message, userMessage: string, lastfmUsername: string): string {
    const isGroup = !!M.group;
    const username = M.sender.username || "unknown";

    let quoted = '';
    if (M.quoted) {
      const text = M.quoted.message.extendedTextMessage ? M.quoted.message.extendedTextMessage.text : M.quoted.message.conversation;
      if (text) {
        quoted = `${M.quoted.sender.username}: ${text}`;
      }
    }

    return isGroup
      ? `${username}${lastfmUsername ? ` (Lastfm: ${lastfmUsername})` : ''}: ${userMessage} ${quoted ? '\n\n[QUOTED]: ' + quoted.slice(0, 1000) : ''}`
      : userMessage;
  }
}