import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'

@Command('members', {
    aliases: ['mems'],
    category: 'LastFM',
    description: {
        content: 'LastFM Group Members Info'
    }
})

export default class extends BaseCommand {
    override execute = async (M: Message, {}: IParsedArgs): Promise<void> => {
        try {
            const users = await this.client.database.User.find({
                jid: { $in: M.group!.participants.map((p) => p) },
                lastfm: { $ne: null }
            }).lean();

            if (users.length === 0) {
                await M.reply('No members are logged in.')
                return;
            }

            const memberList = await Promise.all(users.map(async user => {
                const contact = this.client.getContact(user.jid);
                const username = contact?.username ?? 'Unknown';
                const lastfm = user.lastfm ?? 'Unknown';
                const { name } = await this.client.lastfm.user.getInfo({ user: lastfm });

                return `- ${username} (${name})`;
            }));

            await M.reply(`Members who are logged in:\n${memberList.join('\n')}`);
        } catch (error) {
            console.error('Error fetching members:', error);
            await M.reply('An error occurred while fetching the members.');
        }
    }
}