import Client from "../Structures/Client"

export const updateProfilePicture = async (client: Client) => {
    const { tracks } = await client.lastfm.user.getRecentTracks({ user: 'Nyaughh', limit: 1 })
    const image = tracks[0].image.find((img) => img.size === 'extralarge') ??
                tracks[0].image.find((img) => img.size === 'large') ??
                tracks[0].image.find((img) => img.size === 'medium') ??
                tracks[0].image.find((img) => img.size === 'small')
    if (!image) return
    await client.updateProfilePicture(client.user?.id.split(':')[0].concat('@s.whatsapp.net')!, await client.util.fetchBuffer(image.url))
}