import { ParticipantAction } from '@whiskeysockets/baileys'
import Client from '../Structures/Client'

export class EventHandler {
    private readonly greetings = [
        '{x} has joined the party!',
        'A wild {x} appeared!',
        '{x} hopped into the group!',
        '{x} has arrived!',
        'Welcome to the group, {x}. Hope you brought pizza.',
        "{x} has arrived. Let's have a beer!",
        '{x} has arrived. May I suggest a nice cold one?',
        "Well, {x}, it's about time you arrived!",
        'Um, {x} has arrived. I wonder if they brought their own cup of tea?',
        'Very funny {x}, I expected you to be here a while.',
        'Good to see you, {x}.',
        "It's a pleasure to see you {x}."
    ]

    private readonly farewells = [
        '{x} has left the party.',
        '{x} has left the group.',
        '{x} has left the group. I hope you enjoyed your stay.',
        "Well {x}, it's about time you left.",
        'Bye {x}.',
        "It's been nice meeting you {x}.",
        'Take care {x}.',
        'Later {x}.',
        'Catch you later {x}.',
        'Au Revoir {x}.',
        'Till next time {x}.',
        'We will meet again {x}.',
        "I'm looking forward to seeing you {x}.",
        'I hope you brought a souvenir {x}.'
    ]

    private readonly demotions = [
        "{x}, you're fired!",
        "Adminship isn't for you {x}.",
        "{x} you had a good run, but you're no longer an admin.",
        "Well, I don't know how to tell you this, but {x} has been demoted.",
        '{x} has been demoted. I hope you enjoyed your admin run.'
    ]

    private readonly promotions = [
        "{x}, you're an admin!",
        "Welcome {x}, you're an admin!",
        "{x} you're an admin! I hope you take care of us",
        "Well, you're an admin now {x}.",
        "Looks like you're an admin now {x}."
    ]

    constructor(private client: Client) {}

    private readonly map = {
        add: this.greetings,
        remove: this.farewells,
        demote: this.demotions,
        promote: this.promotions
    }

    private handle = async (event: {
        id: string
        participants: string[]
        action: ParticipantAction
    }): Promise<void> => {
        const { events, bot } = await this.client.database.getGroup(event.id)
        if (bot && bot !== this.client.config.session) return
        if (!events) return
        const texts = this.map[event.action]
        if (!texts) return
        for (const user of event.participants) {
            const text = texts[Math.floor(Math.random() * texts.length)]
            await this.client.sendMessage(event.id, {
                text: text.replace('{x}', `@${user.split('@')[0]}`),
                mentions: [user]
            })
        }
    }

    public load = () => this.client.on('group-participants.update', this.handle)
}
