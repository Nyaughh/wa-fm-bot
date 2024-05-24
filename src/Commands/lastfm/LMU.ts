

import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { v4 } from 'uuid'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('lmu', {
    aliases: ['lastfmuser'],
    category: 'lastfm',
    description: {
        content: 'LastFM User Info'
    }
})
export default class extends BaseCommand {

    override execute = async (M: Message, { args }: IParsedArgs): Promise<void> => {
        if (!args[0]) return void await M.reply('Please provide a username.')
            try { 
        const data = await this.client.lastfm.user.getInfo(args[0])
        const recent = await this.client.lastfm.user.getRecentTracks({ user: args[0], limit: 5 })
        const weekly = await this.client.lastfm.user.getWeeklyArtistChart({ user: args[0], limit: 5 })
            
        await M.reply(
            stripIndents`
                Username: ${data.name}
                Age: ${data.age}
                Country: ${data.country}
                Playcount: ${data.playcount}

                Recent Tracks:
                ${recent.tracks.map((track, index) => `${index + 1}. ${track.name} - ${track.artist.name}`).join('\n')}
                
                Top this week
                ${weekly.artists.map((artist, index) => `${index + 1}. ${artist.name}`).join('\n')}

                `
        )
    } catch(e) {
        console.log(e)
        return void await M.reply(`Invalid Username`)
    }
    }
}

