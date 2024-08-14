import Groq from "groq-sdk";
import { BaseCommand } from '../../Structures/Command/BaseCommand';
import { Command } from '../../Structures/Command/Command';
import Message from '../../Structures/Message';
import { searchSong, getSongLyrics } from '../../Helpers/genius';

// Initialize the Groq client with your API key.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Store conversation history for each user by their JID
const conversationHistory: { [jid: string]: { role: 'system' | 'user' | 'assistant', content: string }[] } = {};

@Command('lai', {
  aliases: ['lyrics'],
  category: 'LastFM',
  description: {
    content: 'Chat with the bot to get song lyrics.',
  },
})
export default class extends BaseCommand {
  override execute = async (M: Message): Promise<void> => {
    const userMessage = M.content.split(' ').slice(1).join(' '); // Extract the message after the command

    if (!userMessage) {
      await M.reply('Please provide a song title to get lyrics.');
      return;
    }

    const userJid = M.sender.jid; // Use the sender's JID to manage their session
    const username = M.sender.username || "unknown"; // Fetch the sender's username, default to "unknown" if not available

    // Initialize conversation history for the user if not present
    if (!conversationHistory[userJid]) {
      conversationHistory[userJid] = [
        {
          role: "system",
          content: `You are a helpful assistant interacting with ${username}. Provide song lyrics when requested and answer any further questions.`,
        },
      ];
    }

    // Add the user's message to the conversation history
    conversationHistory[userJid].push({
      role: "user",
      content: userMessage,
    });

    try {
      // Search for the song using the user's message
      const results = await searchSong(userMessage);

      if (results.length > 0) {
        // Fetch the lyrics for the first result
        const { id, fullTitle } = results[0];
        const { lyrics, info } = await getSongLyrics(id);

        if (lyrics && info) {
          const lyricResponse = `Lyrics for *${info.title}* by *${info.artist.name}*:\n\n${lyrics}`;
          conversationHistory[userJid].push({
            role: "assistant",
            content: lyricResponse,
          });

          await M.reply(lyricResponse);

          // Continue the conversation if the user asks for more information
          const followUpCompletion = await this.getGroqChatCompletion(conversationHistory[userJid]);
          const followUpResponse = followUpCompletion.choices[0]?.message?.content || "Is there anything else you'd like to know?";
          conversationHistory[userJid].push({
            role: "assistant",
            content: followUpResponse,
          });

          await M.reply(followUpResponse);
          return;
        } else {
          await M.reply(`I couldn't find lyrics for "${userMessage}".`);
        }
      } else {
        await M.reply(`No results found for "${userMessage}".`);
      }
    } catch (error) {
      console.error('Error fetching chat completion:', error);
      await M.reply('Sorry, there was an error processing your request.');
    }
  };

  // Function to get chat completion from Groq AI.
  private async getGroqChatCompletion(messages: { role: 'system' | 'user' | 'assistant', content: string }[]) {
    return groq.chat.completions.create({
      messages: messages,
      model: "llama-3.1-70b-versatile",
    });
  }
}
