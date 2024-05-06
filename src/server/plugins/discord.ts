import {
    ActionRowBuilder,
    Client,
    EmbedBuilder,
    GatewayIntentBits,
    PermissionFlagsBits,
    REST,
    Routes,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} from 'discord.js';
import { prisma } from '~/utils/backend/prisma';
import { AuthType, DiscordStrategy } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'path';
import { getDiscordName } from '~/utils/backend/discord';

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

    const config = useRuntimeConfig();

    const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
    const discordServerId = config.DISCORD_SERVER_ID;
    const discordReleasesChannelId = config.DISCORD_RELEASES_CHANNEL_ID;
    const discordRoleId = config.DISCORD_ROLE_ID;

    const commands = [
        {
            name: 'verify',
            description: 'Verify yourself to access Vatsim Radar',
        },
        {
            name: 'rename',
            description: 'Change your shown name',
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

        const verifyStrategy = new StringSelectMenuBuilder()
            .setCustomId('verify')
            .setPlaceholder('Please choose channel name strategy')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Full name')
                    .setDescription('Displays your full name and CID')
                    .setValue('FULL_NAME'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('First name')
                    .setDescription('Displays first name and CID')
                    .setValue('FIRST_NAME'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('CID only')
                    .setDescription('Displays nothing but your Vatsim CID')
                    .setValue('CID_ONLY'),
            );

        const renameStrategy = new StringSelectMenuBuilder()
            .setCustomId('rename')
            .setPlaceholder('Please choose channel name strategy')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Full name')
                    .setDescription('Displays your full name and CID')
                    .setValue('FULL_NAME'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('First name')
                    .setDescription('Displays first name and CID')
                    .setValue('FIRST_NAME'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('CID only')
                    .setDescription('Displays nothing but your Vatsim CID')
                    .setValue('CID_ONLY'),
            );

        const verifyRow = new ActionRowBuilder().addComponents(verifyStrategy);
        const renameRow = new ActionRowBuilder().addComponents(renameStrategy);

        discordClient.on('interactionCreate', async (interaction): Promise<any> => {
            if (interaction.guildId !== discordServerId) return;

            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'rename') {
                    const existingUser = await prisma.user.findFirst({
                        where: {
                            discordId: interaction.user.id,
                        },
                        select: {
                            vatsim: true,
                        },
                    });

                    const user = await (await discordClient.guilds.fetch(discordServerId)).members.fetch(interaction.user.id);

                    if (!existingUser?.vatsim || !user) {
                        await interaction.reply({
                            content: 'You should `/verify` first to use this command',
                            ephemeral: true,
                        });
                    }
                    else {
                        //@ts-expect-error
                        const foundStrategy = DiscordStrategy[interaction.values[0]];

                        if (foundStrategy) {
                            await prisma.user.updateMany({
                                where: {
                                    discordId: interaction.user.id,
                                },
                                data: {
                                    discordStrategy: foundStrategy,
                                },
                            });

                            const name = getDiscordName(foundStrategy, existingUser.vatsim.id, existingUser.vatsim.fullName);

                            if (!user.permissions.has(PermissionFlagsBits.Administrator)) {
                                await user.setNickname(name, 'Rename trigger');
                            }
                            else {
                                console.log(name);
                            }

                            await interaction.reply({
                                content: `Done! You will now be known as ${ name }.`,
                                ephemeral: true,
                            });
                        }
                        else {
                            await interaction.reply({
                                content: 'Invalid value given',
                                ephemeral: true,
                            });
                        }
                    }
                }
                else if (interaction.customId === 'verify') {
                    const existingUser = await prisma.user.findFirst({
                        where: {
                            discordId: interaction.user.id,
                        },
                        select: {
                            vatsim: true,
                            discordStrategy: true,
                        },
                    });

                    if (existingUser) {
                        await interaction.reply({
                            content: 'You have already been authorized. Enjoy your stay and remember to report issues & suggestions on forums! If you want to rename yourself, please use `/rename` command.',
                            ephemeral: true,
                        });

                        const user = await (await discordClient.guilds.fetch(discordServerId)).members.fetch(interaction.user.id);

                        if (user && existingUser.vatsim) {
                            await user.roles.add(discordRoleId);
                            if (!user.permissions.has(PermissionFlagsBits.Administrator) && !existingUser.discordStrategy) {
                                await user.setNickname(`${ existingUser.vatsim.fullName } ${ existingUser.vatsim.id }`, 'Verification process');
                                await prisma.user.updateMany({
                                    where: {
                                        discordId: interaction.user.id,
                                    },
                                    data: {
                                        discordStrategy: DiscordStrategy.FULL_NAME,
                                    },
                                });
                            }
                        }
                    }
                    else {
                        const state = randomUUID();
                        //@ts-expect-error
                        const foundStrategy = DiscordStrategy[interaction.values[0]];

                        if (!foundStrategy) {
                            return await interaction.reply({
                                content: 'Invalid value given',
                                ephemeral: true,
                            });
                        }

                        await prisma.auth.create({
                            data: {
                                state,
                                discordId: interaction.user.id,
                                discordStrategy: foundStrategy,
                                type: AuthType.VATSIM,
                            },
                        });
                        const url = `${ config.public.DOMAIN }/auth/vatsim/redirect?state=${ encodeURIComponent(state) }`;
                        const embed = new EmbedBuilder()
                            .setURL(url)
                            .setTitle('To verify yourself and authorize on Vatsim Radar, please use this link');

                        await interaction.reply({
                            embeds: [embed],
                            ephemeral: true,
                        });
                    }
                }
            }

            if (!interaction.isChatInputCommand()) return;

            if (interaction.commandName === 'rename') {
                await interaction.reply({
                    //@ts-expect-error
                    components: [renameRow],
                    ephemeral: true,
                });
            }
            else if (interaction.commandName === 'verify') {
                await interaction.reply({
                    //@ts-expect-error
                    components: [verifyRow],
                    ephemeral: true,
                });
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
