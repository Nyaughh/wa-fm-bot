import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'
import { searchSong, getSongLyrics } from '../../Helpers/genius'

@Command('lyrics', {
    aliases: ['l'],
    category: 'LastFM',
    description: {
        content: 'Fetches lyrics for the current or last song listened to by the LastFM user'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text, flags, args, raw, cmd }: IParsedArgs): Promise<void> => {
        const romaji = 'r' in flags
        text = text.replace(/--r/g, '').trim()

        if ('songid' in flags) {
            const songId = flags.songid
            const { lyrics, romaji: romajiLyrics, info } = await getSongLyrics(parseInt(songId))
            if (!lyrics || !info) return void (await M.reply('No lyrics found.'))
            return void (await M.reply(stripIndents`
                Lyrics for *${info.title}* by *${info.artist.name}*
                ${romajiLyrics ? `\n*Romanized Lyrics:*\n${romajiLyrics}\n` : ''}
                ${romajiLyrics ? '\n*Original Lyrics:*\n\n' : ''}
                ${lyrics}
            `))
        }
        let song = text.trim()
        try {
            if (!song) {
                const data = await this.client.database.User.findOne({ jid: M.sender.jid }).lean()
                if (!data?.lastfm)
                    return void (await M.reply(
                        'Please provide a song name or login wih LastFM to fetch lyrics for the current song.'
                    ))

                const { tracks } = await this.client.lastfm.user.getRecentTracks({ user: data.lastfm, limit: 1 })
                const mostRecentTrack = tracks[0]
                if (!mostRecentTrack) return void (await M.reply('No recent tracks found.'))

                const query = `${mostRecentTrack.artist.name} ${mostRecentTrack.name} ${romaji ? 'Romanized' : ''}`
                const results = await searchSong(query)

                if (!results.length) return void (await M.reply('No results found.'))

                return this.execute(M, {
                    flags: { songid: results[0].id.toString(), ...flags },
                    text: query,
                    args,
                    raw,
                    cmd
                })
            }

            const results = await searchSong(song)

            if (!results.length) return void (await M.reply('No results found.'))

            await M.replyWithButtons(
                stripIndents`
                Lyrics Search Results for *${song}*
             `,
                'text',
                undefined,
                undefined,
                undefined,
                undefined,
                {
                    headerText: `WA FM`,
                    footerText: 'Powered by Genius',
                    buttonText: 'Results',
                    sections: [
                        {
                            title: `**${results.length}** Results found`,
                            rows: results.map((result, i) => {
                                const romajiFlag = result.fullTitle.toLowerCase().includes('romanized')
                                    ? ''
                                    : romaji
                                    ? '--r'
                                    : ''
                                return {
                                    title: `${i + 1}. ${result.fullTitle}`,
                                    id: `${this.client.config.prefix}lyrics --songid=${result.id} ${romajiFlag}`
                                }
                            })
                        }
                    ]
                }
            )
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Error fetching lyrics.`))
        }
    }
}
