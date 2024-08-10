import Groq from "groq-sdk";
import { BaseCommand } from '../../Structures/Command/BaseCommand';
import { Command } from '../../Structures/Command/Command';
import Message from '../../Structures/Message';
import { IParsedArgs } from '../../typings/Command';
import { stripIndents } from 'common-tags';

// Initialize the Groq client with your API key.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Store conversation history for each user by their JID
const conversationHistory: { [jid: string]: { role: 'system' | 'user' | 'assistant', content: string }[] } = {};

@Command('recommendations', {
  aliases: ['rec'],
  category: 'LastFM',
  description: {
    content: 'Get AI-generated recommendations based on user listening history.',
  },
})
export default class extends BaseCommand {
  override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
    let user = text.trim();
    if (M.mentioned.length > 0) {
      const data = await this.client.database.User.findOne({ jid: M.mentioned[0] }).lean();
      if (!data?.lastfm) return void (await M.reply('The mentioned user has not logged in to their LastFM account.'));
      user = data.lastfm;
    }
    if (!user) {
      const data = await this.client.database.User.findOne({ jid: M.sender.jid }).lean();
      if (!data?.lastfm) return void (await M.reply('Please provide a username or login to your LastFM account using the `login` command.'));
      user = data.lastfm;
    }

    try {
      // Fetch user data from LastFM
      const [topTracks, topArtists] = await Promise.all([
        this.client.lastfm.user.getTopTracks({ user: user, limit: 200}),
        this.client.lastfm.user.getTopArtists({ user: user, limit: 200 }),

      ]);

      // Prepare the prompt for AI based on user's listening history
      const userJid = M.sender.jid;
      const username = M.sender.username || "unknown";
      const historyPrompt = stripIndents`
        You are a helpful assistant giving recommendations to ${username}. Here is their listening history. Recommend similar artists and tracks. Do not mention artists they already know. State atleast 10. Give new ones if they ask again. The user cannot talk to you so end the message after you have given recommendations. End the conversation there. They can use the command again to get new sets of recommendations.
        
        Top Tracks:
        ${topTracks.tracks.map(track => `${track.name} by ${track.artist} - ${track.playcount} plays`).join(', ')}

        Top Artists:
        ${topArtists.artists.map(artist => `${artist.name} - ${artist.playcount} plays`).join(', ')}
      `;

      // Initialize conversation history for the user if not present
      if (!conversationHistory[userJid]) {
        conversationHistory[userJid] = [
          {
            role: "system",
            content: "You are a recommendation assistant providing personalized music recommendations based on the user's listening history.",
          },
        ];
      }

      // Add the prompt to the conversation history
      conversationHistory[userJid].push({
        role: "user",
        content: historyPrompt,
      });

      // Get a recommendation from the AI
      const chatCompletion = await this.getGroqChatCompletion(conversationHistory[userJid]);
      const response = chatCompletion.choices[0]?.message?.content || "I'm not sure how to respond to that.";
      conversationHistory[userJid].push({
        role: "assistant",
        content: response,
      });

      // Send the AI response back to the user
      await M.reply(response);

    } catch (error) {
      console.error('Error fetching recommendations:', error);
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
