import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('whoknows', {
    aliases: ['w'],
    category: 'LastFM',
    description: {
        content: 'Who knows this artist in this group'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const user = await this.client.database.User.findOne({ jid: M.sender.jid }).lean()
        if (!user?.lastfm) return void (await M.reply('Please login to your lastfm account using `login` command.'))
        const artist = await (async () => {
            let name = text.trim()
            if (!name) {
                const {
                    tracks: [{ artist }]
                } = await this.client.lastfm.user.getRecentTracks({ user: user.lastfm })
                name = artist.name
            }
            return name
        })()

        if (!artist) return void (await M.reply('Please provide an artist name.'))


          
        try {
            const { name: artistName, url } = await this.client.lastfm.artist.getInfo({ artist })

            const data = (await Promise.allSettled((await this.client.database.User.find({
                jid: { $in: M.group!.participants.map((p) => p) },
                lastfm: { $ne: null }
            }).lean()).map(async (u) => {
                const { stats } = await this.client.lastfm.artist.getInfo({ artist }, {
                    username: u.lastfm, sk: u.lastfm
                })
                const { name: username } = await this.client.lastfm.user.getInfo({ user: u.lastfm })
                return { username, plays: stats.userplaycount, jid: u.jid }
            }))).sort((a, b) => {
                if (a.status === 'fulfilled' && b.status === 'fulfilled') {
                    return (b.value as any).plays - (a.value as any).plays
                }
                return 0
            }).map((r) => r.status === 'fulfilled' ? r.value : null).filter((r): r  is { username: string, plays: number, jid: string } => r !== null)
            const waname = this.client.getContact(user.jid).username
            await M.reply(stripIndents`
                *${artistName}* in ${M.group!.title}

                ${data.map((d, i) => `${i + 1}. ${d.username} ${waname === 'user' ? '' : `(${waname})`}- ${d.plays} plays`).join('\n')}

            
                ${url}
            `, 'text', undefined, undefined)

        
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Couldn't find the artist`))
        }
    }
}
