import Groq from "groq-sdk";
import { BaseCommand } from '../../Structures/Command/BaseCommand';
import { Command } from '../../Structures/Command/Command';
import Message from '../../Structures/Message';

// Initialize the Groq client with your API key.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Store conversation history for each user by their JID
const conversationHistory: { [jid: string]: { role: 'system' | 'user' | 'assistant', content: string }[] } = {};

@Command('chat', {
  aliases: ['talk'],
  category: 'General',
  description: {
    content: 'Chat with the bot.',
  },
})
export default class extends BaseCommand {
  override execute = async (M: Message): Promise<void> => {
    const userMessage = M.content.split(' ').slice(1).join(' '); // Extract the message after the command

    if (!userMessage) {
      await M.reply('Please provide a message to chat with.');
      return;
    }

    const userJid = M.sender.jid; // Use the sender's JID to manage their session
    const username = M.sender.username || "unknown"; // Fetch the sender's username, default to "unknown" if not available

    // Initialize conversation history for the user if not present
    if (!conversationHistory[userJid]) {
      conversationHistory[userJid] = [
        {
          role: "system",
          content: `You are a helpful assistant interacting with ${username}. Answer questions directly and provide useful information.`,
        },
      ];
    }

    // Add the user's message to the conversation history
    conversationHistory[userJid].push({
      role: "user",
      content: userMessage,
    });

    try {
      // Get a chat completion from the Groq AI, including the conversation history for the user
      const chatCompletion = await this.getGroqChatCompletion(conversationHistory[userJid]);

      // Extract the response and add it to the conversation history
      const response = chatCompletion.choices[0]?.message?.content || "I'm not sure how to respond to that.";
      conversationHistory[userJid].push({
        role: "assistant",
        content: response,
      });

      // Send the AI response back to the user
      await M.reply(response);
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
