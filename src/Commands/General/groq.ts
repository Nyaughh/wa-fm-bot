import Groq from "groq-sdk";
import { BaseCommand } from '../../Structures/Command/BaseCommand';
import { Command } from '../../Structures/Command/Command';
import Message from '../../Structures/Message';
import { ChatCompletion, ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

// Initialize the Groq client with your API key.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Store conversation history for each group by their JID
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

    const commands = Array.from(this.handler.commands.values())


    const groupJid = M.from;
    const userJid = M.sender.jid;
    const username = M.sender.username || "unknown";
    const isGroup = !!M.group;
    const excludedCmds = ["eval", 'ban', 'unban', 'hi']
    const messages = groupConversationHistory[groupJid] || []
    if (messages.length > 50) {
      groupConversationHistory[groupJid] = messages.slice(-45)
    }
    // Initialize group conversation history
    if (!groupConversationHistory[groupJid]) {
      groupConversationHistory[groupJid] = [
        {
          role: "system",
          content: isGroup
            ? `You are a helpful assistant in a group chat named "${M.group?.title}".`
            : `You are a helpful assistant in a private chat. Provide personalized and direct responses.`,
        },
      ];

      groupConversationHistory[groupJid].push({
        role: "system",
        content: `
        You have access to the following commands: ${commands
          .filter(c => !excludedCmds.includes(c.id))
          .reduce((acc, c) => `${acc}\n${c.id},${c.options.aliases.join(', ')}: ${c.options.description.content}\n Usage:${this.client.config.prefix} ${c.options.description.usage} ?? <text>`, '')}
        
        You can use the command "execute" to execute a command. Only use this if you are use the user wants something done

        Eg: User: I want to know what my top artists are.
        You: execute({ command: "/topartists" })

        Eg: User: Give me the video for sumika lovers
        You: execute({ command: "/playvideo sumika lovers" })
        `,
      });
    }

    // Fetch user's recent songs if logged into LastFM
    let recentSongs = '';
    const user = await this.client.database.User.findOne({ jid: userJid }).lean();
    if (user?.lastfm) {
      try {
        const { tracks } = await this.client.lastfm.user.getRecentTracks({ user: user.lastfm, limit: 5 });
        recentSongs = tracks.map(track => `${track.name} by ${track.artist.name}`).join(', ');
      } catch (error) {
        console.error('Error fetching LastFM tracks:', error);
      }
    }

  

    // Add context about recent songs if available
    if (recentSongs) {
      groupConversationHistory[groupJid].push({
        role: "system",
        content: `${username}'s recently played songs: ${recentSongs}. Reference these in your response`,
      });
    }

    // Modify the user message to include the username for group chats
    const formattedUserMessage = isGroup
      ? `${username}: ${userMessage}`
      : userMessage;

    // Add the user's message to the conversation history
    groupConversationHistory[groupJid].push({
      role: "user",
      content: formattedUserMessage,
    });

    // Add quoted message if available
    if (M.quoted) {
      const text = M.quoted.message.extendedTextMessage ? M.quoted.message.extendedTextMessage.text : M.quoted.message.conversation
      if (text) {
        groupConversationHistory[groupJid].push({
          role: "system",
          content: `${M.quoted.sender.username || "Someone"} previously said: "${text}"`,
        });
    }
    }

    try {
      let response = await this.processGroqResponse(groupConversationHistory[groupJid], M);



      // Send the AI response back to the user
      await M.reply(response);
    } catch (error) {
      console.error('Error processing request:', error);
      await M.reply('Sorry, there was an error processing your request.');
    }
  };

  private async processGroqResponse(messages: { role: 'system' | 'user' | 'assistant' | 'tool', name?: string, tool_call_id?: string, content: string }[], M: Message): Promise<string> {
    const chatCompletion = await this.getGroqChatCompletion(messages as any)
    const response = chatCompletion.choices[0].message
    groupConversationHistory[M.from].push({ ...response, content: response.content || "" })
    console.log(response.tool_calls?.[0].function)
    if (response.tool_calls) {

      if (response.tool_calls[0].function.name === "execute") {
        const args = JSON.parse(response.tool_calls[0].function.arguments)
        const {command} = args
        const res = await this.executeCommands(command.replace('execute ', '').trim(), M)
        groupConversationHistory[M.from].push({
          role: "tool",
          name: response.tool_calls[0].function.name,
          content: res[0],
          tool_call_id: response.tool_calls[0].id,
        });
        return this.processGroqResponse(groupConversationHistory[M.from], M)

      } else {
        const res = await this.executeCommands(`${this.client.config.prefix}${response.tool_calls[0].function.name} ${JSON.parse(response.tool_calls[0].function.arguments).args}`, M)
        groupConversationHistory[M.from].push({
          role: "tool",
          name: response.tool_calls[0].function.name,
          content: res[0],
          tool_call_id: response.tool_calls[0].id,
        });
        return this.processGroqResponse(groupConversationHistory[M.from], M)
      }
    }

    return response.content || "I don't know what to say"
  }


  // Function to get chat completion from Groq AI.
  private async getGroqChatCompletion(messages: { role: 'system' | 'user' | 'assistant' | 'tool', name: string, tool_call_id?: string, content: string }[]) {
    return groq.chat.completions.create({
      messages: messages as ChatCompletionMessageParam[],
      model: "llama3-groq-70b-8192-tool-use-preview",
      tools: [
        {
          type: "function",
          function: {
            name: "execute",
            description: "Execute a command",
            parameters: {
              type: "object",
              properties: {
                command: {
                  type: "string",
                  description: "The command to execute"
                }
              },
              required: ["command"]
            }
          }
        }
      ]
    });
  }

  private async executeCommands(command: string, M: Message): Promise<string> {
    const args = this.handler.parseArgs(command)
    const commandInstance = this.handler.commands.get(args.cmd);
    if (!commandInstance) {
      return "Command not found";
    }
    await commandInstance.execute(M, args);
    return "Command exexued. The response has been sent to the user"
  }

}