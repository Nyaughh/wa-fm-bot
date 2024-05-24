

import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { v4 } from 'uuid'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('Weekly Album Chart', {
    aliases: ['wac'],
    category: 'lastfm',
    description: {
        content: 'LastFM User Weekly Album Chart'
    }
})
export default class extends BaseCommand {

    override execute = async (M: Message, { args }: IParsedArgs): Promise<void> => {
        if (!args[0]) return void await M.reply('Please provide a username.')
            try { 
        const albumc = await this.client.lastfm.user.getWeeklyAlbumChart({ user: args[0],})
            
        await M.reply(
            stripIndents`  
                Weekly Album Chart:
                ${albumc.albums.map((album, index) => `${index + 1}. ${album.name} - ${album.artist.name} (${album.playcount} plays)`).join('\n')}`
        )
    } catch(e) {
        console.log(e)
        return void await M.reply(`Invalid Username`)
    }
    }
}

