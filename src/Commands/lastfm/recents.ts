

import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { v4 } from 'uuid'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('recents', {
    aliases: ['r'],
    category: 'lastfm',
    description: {
        content: 'LastFM User recent songs'
    }
})
export default class extends BaseCommand {

    override execute = async (M: Message, { args }: IParsedArgs): Promise<void> => {
        if (!args[0]) return void await M.reply('Please provide a username.')
            try { 
        const recent = await this.client.lastfm.user.getRecentTracks({ user: args[0] })
            
        await M.reply(
            stripIndents`
             
                Recent Tracks:
                ${recent.tracks.map((track, index) => `${index + 1}. ${track.name} - ${track.artist.name}`).join('\n')}
                
   

                `
        )
    } catch(e) {
        console.log(e)
        return void await M.reply(`Invalid Username`)
    }
    }
}

