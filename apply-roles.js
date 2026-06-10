import { Client, GatewayIntentBits } from 'discord.js';

const cids = ``.split('\n');

const ids = ``;

console.log(cids.map(x => `'${ x }'`).join(',\n'));

const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

discordClient.on('clientReady', () => {
    console.log(`Logged in as ${ discordClient.user?.tag }!`);
});

await discordClient.login('');

for (const id of ids.split('\n')) {
    try {
        const user = await (await discordClient.guilds.fetch('1223649894191992914')).members.fetch(id);
        console.log(user);
        if (!user?.roles) continue;
        await user.roles.add('1510647710686908588');
    }
    catch (e) {
        console.error(e);
    }
}
