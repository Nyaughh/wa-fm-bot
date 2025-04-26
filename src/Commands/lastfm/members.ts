import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'

@Command('members', {
    aliases: ['mems'],
    category: 'Group',
    description: {
        content: 'LastFM Group Members Info',
        usage: '--all to show all users'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { flags = {} }: IParsedArgs): Promise<void> => {
        try {
            const showAll = 'all' in flags

            let users
            let headerText

            if (showAll) {
                // Get all users with LastFM accounts
                users = await this.client.database.User.find({
                    lastfm: { $ne: null }
                }).lean()
                headerText = '*All LastFM Users:*'
            } else {
                // Check if the message is from a group
                if (!M.group) {
                    return void M.reply('This command can only be used in groups! Use --all flag to see all users.')
                }

                // Get participants' JIDs from the group
                const participantJids = M.group.participants

                // Find users who have LastFM accounts in this group
                users = await this.client.database.User.find({
                    jid: { $in: participantJids },
                    lastfm: { $ne: null }
                }).lean()
                headerText = '*LastFM Members in this group:*'
            }

            if (users.length === 0) {
                return void M.reply(showAll ? 'No users have linked their LastFM accounts.' : 'No members in this group have linked their LastFM accounts.')
            }

            const memberList = await Promise.all(
                users.map(async (user, index) => {
                    try {
                        const contact = await this.client.getContact(user.jid)
                        const username = contact?.username || 'Unknown'
                        const lastfm = user.lastfm

                        // Get LastFM info with error handling
                        try {
                            const { name } = await this.client.lastfm.user.getInfo({ user: lastfm })
                            return `${index + 1}. ${username} (${name})`
                        } catch (error) {
                            return `${index + 1}. ${username} (${lastfm})`
                        }
                    } catch (error) {
                        return `${index + 1}. Unknown User (${user.lastfm})`
                    }
                })
            )

            await M.reply(`${headerText}\n\n${memberList.join('\n')}`)
        } catch (error) {
            console.error('Error in members command:', error)
            await M.reply('An error occurred while fetching the members. Please try again later.')
        }
    }
}
