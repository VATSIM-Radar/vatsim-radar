import { Client, EmbedBuilder, GatewayIntentBits, PermissionFlagsBits, REST, Routes } from 'discord.js';
import { prisma } from '~/utils/backend/prisma';
import { AuthType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
//@ts-expect-error
import Changelog from '@@/CHANGELOG.md';

export const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });
export const discordServerId = '1223649894191992914';
export const discordReleasesChannelId = '1229892121549344789';
export const discordRoleId = '1229887891442761748';

function parseMarkdown() {
    const lines = Changelog.split('\n');
    let heading: {
        title: string,
        items: Array<string | {title: string, items: string[]}>
    } | null = null;
    let currentSubHeading: {
        title: string,
        items: string[]
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('## ')) {
            if (heading) break;
            // Found a second-level heading
            heading = {
                title: line.substring(3),
                items: [],
            };
        }
        else if (line.startsWith('### ')) {
            currentSubHeading = {
                title: line.substring(4),
                items: [],
            };

            if (currentSubHeading.title) {
                heading!.items.push(currentSubHeading);
            }
        }
        else if (line.startsWith('- ')) {
            if (currentSubHeading?.title) {
                currentSubHeading.items.push(line.substring(2));
            }
            else {
                heading!.items.push(line.substring(2));
            }
        }
    }

    return heading;
}

export default defineNitroPlugin(async (app) => {
    if (!import.meta.dev) return;
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
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(config.DISCORD_CLIEND_ID), { body: commands });

        console.log('Successfully reloaded application (/) commands.');

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
                });

                if (existingUser) {
                    await interaction.reply({
                        content: 'You have already been authorized. Enjoy your stay and remember to report issues & suggestions in <#1228745951892607070>!',
                        ephemeral: true,
                    });
                    if ('set' in interaction.member!.roles) interaction.member!.roles.set([discordRoleId]);
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
                        .setTitle('To authorize on Vatsim Radar, please use this link')
                        .setDescription('This is only temporal verification for beta of Vatsim Radar. Service will be open to public later on.');

                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                }
            }
            else if (interaction.commandName === 'release' && interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
                await interaction.reply({
                    content: 'test',
                    ephemeral: true,
                });

                console.log(JSON.stringify(parseMarkdown()));
            }
        });

        await discordClient.login(config.DISCORD_TOKEN);
    }
    catch (error) {
        console.error(error);
    }
});
