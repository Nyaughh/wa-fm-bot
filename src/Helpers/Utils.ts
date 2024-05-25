import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import axios from 'axios'
import { format, promisify } from 'util'
import { randomBytes } from 'crypto'
import { tmpdir } from 'os'
import { writeFile, readFile, unlink } from 'fs/promises'
import { exec } from 'child_process'
import { jidDecode } from '@whiskeysockets/baileys'

export default class Util {
    public exec = promisify(exec)

    public format = format

    public sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    public fetch = async <T>(url: string): Promise<T> => (await axios.get<T>(url)).data

    public fetchBuffer = async (url: string): Promise<Buffer> =>
        (await axios.get<Buffer>(url, { responseType: 'arraybuffer' })).data

    public isTruthy = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined

    public switchIndex = <T>(array: T[], f: number, t: number): T[] => {
        // prettier-ignore
        [array[f], array[t]] = [array[t], array[f]]
        return array
    }

    public readdirRecursive = (directory: string): string[] => {
        const results: string[] = []

        const read = (path: string): void => {
            const files = readdirSync(path)

            for (const file of files) {
                const dir = join(path, file)
                if (statSync(dir).isDirectory()) read(dir)
                else results.push(dir)
            }
        }
        read(directory)
        return results
    }

    public getRandomInt = (min: number, max: number): number => {
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    public randomBool = (): boolean => this.getRandomInt(0, 1) === 1

    public getRandomFloat = (min: number, max: number): number => {
        return Math.random() * (max - min) + min
    }

    public getRandomItem = <T>(array: T[]): T => array[this.getRandomInt(0, array.length - 1)]

    public getRandomItems = <T>(array: T[], count: number): T[] => {
        return new Array(count).fill(0).map(() => this.getRandomItem(array))
    }

    public swap = <T>(array: T[], index1: number, index2: number): T[] => {
        //prettier-ignore
        [array[index1], array[index2]] = [array[index2], array[index1]]
        return array
    }

    public shuffle = <T>(array: T[]): T[] => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.getRandomInt(0, i)
            this.swap(array, i, j)
        }
        return array
    }

    public getSecureRandom = (length: number): string => randomBytes(length).toString('hex')

    public getRandomFilename = (ext = '', path = tmpdir()): string => {
        const filename = this.getSecureRandom(16)
        return join(path, `${filename}.${ext}`)
    }

    public getRandomString = (length: number): string => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        return new Array(length)
            .fill(0)
            .map(() => this.getRandomItem(chars.split('')))
            .join('')
    }

    public getUrls = (url: string): Set<string> => {
        const urls = new Set<string>()
        const regex = /(https?:\/\/[^\s]+)/g
        let match: RegExpExecArray | null
        while ((match = regex.exec(url)) !== null) {
            urls.add(match[1])
        }
        return urls
    }

    public convertGIFToMP4 = async (gif: Buffer): Promise<Buffer> => {
        const filename = this.getRandomFilename('gif')
        await writeFile(filename, gif)
        const output = filename.replace(/gif$/, 'mp4')
        await this.exec(
            `ffmpeg -f gif -i ${filename} -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${output}`
        )
        const buffer = await readFile(output)
        Promise.all([unlink(filename), unlink(output)])
        return buffer
    }

    public capitalize = (str: string): string => str.charAt(0).toUpperCase().concat(str.slice(1))

    public sanitizeJid = (jid: string): string => {
        const [a, b] = jid.split('@')
        return a.split(':').shift()?.concat('@', b) ?? jid
    }

    public sanitizeJids = (jid: string) => {
        // if jid has :, remove it and the part after it till there is an @
        // then join the two parts with
        // example: 123:1@w.net -> 123@w.net
        if (/:\d+@/gi.test(jid)) {
            const decoded = jidDecode(jid)
            if (decoded?.server && decoded.user) {
                return format('%s@%s', decoded.user, decoded.server)
            }
            return jid
        } else return jid
    }
}
