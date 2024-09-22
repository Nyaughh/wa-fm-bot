import { Client as GeniusClient } from 'genius-lyrics'
import { isHiragana, isJapanese, isKatakana, toRomaji, tokenize } from 'wanakana'
import { pinyin } from 'pinyin-pro'
// @ts-ignore
import aromanize from 'aromanize'

const ACCESS_TOKEN = 'nBUjGNJLO8tUwkrGVUm_rxaX6zkYwcAbtLoH-Ga_mJvzEq3IMV3j6RgFHRZtQMLY'
const client = new GeniusClient(ACCESS_TOKEN)

const characters = [
    ['（', '('],
    ['）', ')'],
    ['【', '['],
    ['】', ']'],
    ['。', '. '],
    ['；', '; '],
    ['：', ': '],
    ['？', '? '],
    ['！', '! '],
    ['、', ', '],
    ['，', ', '],
    ['‘', "'"],
    ['”', '"'],
    ['＇', "'"],
    ['〜', '~'],
    ['·', '•'],
    ['・', '•'],
    ['０', '0'],
    ['１', '1'],
    ['２', '2'],
    ['３', '3'],
    ['４', '4'],
    ['５', '5'],
    ['６', '6'],
    ['７', '7'],
    ['８', '8'],
    ['９', '9']
]

export const searchSong = async (query: string) => {
    try {
        const searches = await client.songs.search(query)
        return searches
    } catch (error) {
        return []
    }
}

export const getSongLyrics = async (songId: number, romaji = false) => {
    try {
        const song = await client.songs.get(songId)
        let lyrics = await song.lyrics()
        let romajiLyrics = ''
        if (romaji) {
            for (const [char, replace] of characters) {
                lyrics = lyrics.replace(new RegExp(char, 'g'), replace)
            }
            let words = tokenize(lyrics)
            const Chinese = /\p{Script=Han}/u
            const Korean = /\p{Script=Hangul}/u
            words = words.map((word) => {
                word = typeof word === 'string' ? word : word.value
                console.log(word, Chinese.test(word), Korean.test(word), toRomaji(word))
                if (isHiragana(word) || isKatakana(word)) return toRomaji(word)
                if (Chinese.test(word)) return pinyin(word)
                if (Korean.test(word)) return aromanize.romanize(word)
                return word
            })
            romajiLyrics = words.join('')
        }

        return {
            info: song,
            lyrics,
            romaji: romajiLyrics
        }
    } catch (error) {
        console.error('Error fetching song lyrics from Genius:', error)
        return { lyrics: '', romaji: '' }
    }
}
