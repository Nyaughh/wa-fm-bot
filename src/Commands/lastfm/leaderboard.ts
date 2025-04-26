import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'

@Command('leaderboard', {
    aliases: ['lb'],
    category: 'Stats',
    description: {
        content: 'LastFM Group Members Top Scrobbles'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, {}: IParsedArgs): Promise<void> => {
        try {
            let users = await this.client.database.User.find({
                jid: { $in: M.group!.participants.map((p) => p) },
                lastfm: { $ne: null }
            }).lean()
            users = users.filter((user) => user.lastfm !== null)
            if (users.length === 0) {
                await M.reply('No members are logged in.')
                return
            }

            let totalScrobbles = 0

            const memberList = (
                await Promise.all(
                    users.map(async (user) => {
                        const contact = this.client.getContact(user.jid)
                        const username = contact?.username ?? 'Unknown'
                        const lastfm = user.lastfm ?? 'Unknown'
                        const userInfo = await this.client.lastfm.user.getInfo({ user: lastfm }).catch(() => null)
                        if (!userInfo) return null

                        const playcount = userInfo.playcount ?? 0
                        totalScrobbles += playcount

                        return {
                            username,
                            lastfm: userInfo.name,
                            playcount
                        }
                    })
                )
            ).filter((member) => member !== null) as { username: string; lastfm: string; playcount: number }[]

            // Sort members by playcount in descending order
            memberList.sort((a, b) => b.playcount - a.playcount)

            // Format the member list with numbering
            const formattedMemberList = memberList.map(
                (member, index) => `${index + 1}. ${member.username} (${member.lastfm}): ${member.playcount} scrobbles`
            )

            await M.reply(
                `Scrobbling Leaderboard in ${M.group?.title}:\n\n${formattedMemberList.join(
                    '\n'
                )}\n\nTotal Scrobbles: ${totalScrobbles}`
            )
        } catch (error) {
            console.error('Error fetching members:', error)
            await M.reply('An error occurred while fetching the members.')
        }
    }
}
