import { Client, EmbedBuilder, GatewayIntentBits, PermissionFlagsBits, REST, Routes } from 'discord.js';
import { prisma } from '~/utils/backend/prisma';
import { AuthType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'path';

export const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });
export const discordServerId = '1223649894191992914';
export const discordReleasesChannelId = '1229392327282397194';
export const discordRoleId = '1229887891442761748';

const changelog = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf-8');
const json = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

function parseMarkdown() {
    let CHANGELOG: string | null = null;

    if (changelog.includes(`# ${ json.version }`)) {
        CHANGELOG = changelog
            .split(`# ${ json.version }`)[1]
            .split(/^#\s.*/gm)[0];
        CHANGELOG = `## Update v${ json.version } has just been released!\n${ CHANGELOG }`;
    }

    return CHANGELOG;
}

export default defineNitroPlugin(async (app) => {
    app.hooks.hook('request', (event) => {
        event.context.radarVersion = json.version;
    });

    if (import.meta.dev) return;
    const config = useRuntimeConfig();

    const commands = [
        {
            name: 'verify',
            description: 'Verify yourself to access Vatsim Radar',
        },
        {
            name: 'release',
            description: 'Release latest changelog of Vatsim Radar',
            default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
        },
    ];

    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

    try {
        (async () => {
            try {
                console.log('Started refreshing application (/) commands.');

                await rest.put(Routes.applicationCommands(config.DISCORD_CLIEND_ID), { body: commands });

                console.log('Successfully reloaded application (/) commands.');
            }
            catch (e) {
                console.error(e);
            }
        })();

        discordClient.on('ready', () => {
            console.log(`Logged in as ${ discordClient.user?.tag }!`);
        });

        discordClient.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            if (interaction.commandName === 'verify') {
                const existingUser = await prisma.user.findFirst({
                    where: {
                        discordId: interaction.user.id,
                    },
                    select: {
                        vatsim: true,
                    },
                });

                if (existingUser) {
                    await interaction.reply({
                        content: 'You have already been authorized. Enjoy your stay and remember to report issues & suggestions in <#1228745951892607070>!',
                        ephemeral: true,
                    });

                    const user = await (await discordClient.guilds.fetch(discordServerId)).members.fetch(interaction.user.id);

                    if (user && existingUser.vatsim) {
                        await user.roles.add(discordRoleId);
                        await user.setNickname(`${ existingUser.vatsim.fullName } ${ existingUser.vatsim.id }`, 'Verification process');
                    }
                }
                else {
                    const state = randomUUID();
                    await prisma.auth.create({
                        data: {
                            state,
                            discordId: interaction.user.id,
                            type: AuthType.VATSIM,
                        },
                    });
                    const url = `${ config.DOMAIN }/auth/vatsim/redirect?state=${ encodeURIComponent(state) }`;
                    const embed = new EmbedBuilder()
                        .setURL(url)
                        .setTitle('To verify yourself and authorize on Vatsim Radar, please use this link');

                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                }
            }
            else if (interaction.commandName === 'release' && interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
                const release = await discordClient.channels.fetch(discordReleasesChannelId);
                if (release && 'send' in release) {
                    release.send({
                        content: parseMarkdown()!,
                    });
                    await interaction.reply({
                        content: 'OK',
                        ephemeral: true,
                    });
                }
            }
        });

        await discordClient.login(config.DISCORD_TOKEN);
    }
    catch (error) {
        console.error(error);
    }
});

declare module 'h3' {
    interface H3EventContext {
        radarVersion?: string;
    }
}
