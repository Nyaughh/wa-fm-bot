import { BaseCommand } from '../../Structures/Command/BaseCommand';
import { Command } from '../../Structures/Command/Command';
import Message from '../../Structures/Message';

@Command('changepfp', {
    aliases: ['pfp'],
    category: 'tools',
    description: {
        content: 'Change the group profile picture by quoting an image.'
    },
    group: true,
    admin: true
})
export default class extends BaseCommand {
    override execute = async (M: Message): Promise<void> => {
        const quotedMessage = M.quoted as Message | undefined;
        if (!quotedMessage || quotedMessage.type !== 'imageMessage') {
            return void await M.reply('Please quote an image to set as the group profile picture.');
        }

        try {
            const imageBuffer = await this.client.downloadMediaMessage(quotedMessage);
            await this.client.updateProfilePicture(M.from, imageBuffer);
            await M.reply('Group profile picture updated successfully.');
        } catch (error) {
            console.error('Error updating group profile picture:', error);
            await M.reply('An error occurred while updating the group profile picture.');
        }
    }
}
