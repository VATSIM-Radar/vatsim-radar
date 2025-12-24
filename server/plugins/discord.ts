import type { ChatInputCommandInteraction } from 'discord.js';
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
import { AuthType, DiscordStrategy } from '#prisma';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'path';
import { getDiscordName } from '~/utils/backend/discord';
import type { UserPresetType } from '#prisma';

export const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const changelog = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf-8');
const json = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

function parseMarkdown() {
    let CHANGELOG: string | null = null;

    if (changelog.includes(`# [${ json.version }]`)) {
        CHANGELOG = changelog
            .split(`# [${ json.version }]`)[1]
            .split(/^#\s.*/gm)[0];
        CHANGELOG = `## Update v${ json.version } has just been released!\n${ CHANGELOG }`;
    }

    return CHANGELOG;
}

export default defineNitroPlugin(async app => {
    app.hooks.hook('request', event => {
        event.context.radarVersion = json.version;
    });

    const config = useRuntimeConfig();

    const discordServerId = config.DISCORD_SERVER_ID;
    const discordInternalServerId = config.DISCORD_INTERNAL_SERVER_ID;
    const discordReleasesChannelId = config.DISCORD_RELEASES_CHANNEL_ID;
    const discordRoleId = config.DISCORD_ROLE_ID;

    const commands = [
        {
            name: 'verify',
            description: 'Verify yourself to access VATSIM Radar',
        },
        {
            name: 'qa-verify',
            description: 'Verify for QA access to next website version',
        },
        {
            name: 'rename',
            description: 'Change your shown name',
        },
        {
            name: 'hidden-stats',
            description: 'View your Radar ID and stats (privately... you know, just in case)',
        },
        {
            name: 'next-hidden-stats',
            description: 'View your Radar Next (only QA/Patreon) ID and stats (privately... you know, just in case)',
        },
        {
            name: 'next-stats',
            description: 'Share with everyone your Radar Next (only QA/Patreon) ID and stats!',
        },
        {
            name: 'stats',
            description: 'Share with everyone your Radar ID and stats!',
        },
        {
            name: 'release',
            description: 'Release latest changelog of VATSIM Radar',
            default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
        },
    ];

    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

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
                .setDescription('Displays nothing but your VATSIM CID')
                .setValue('CID_ONLY'),
        );

    const verifyStatsStrategy = new StringSelectMenuBuilder()
        .setCustomId('verify')
        .setPlaceholder('You are not verified! Please choose channel name strategy')
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
                .setDescription('Displays nothing but your VATSIM CID')
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
                .setDescription('Displays nothing but your VATSIM CID')
                .setValue('CID_ONLY'),
        );

    const verifyRow = new ActionRowBuilder().addComponents(verifyStrategy);
    const verifyStatsRow = new ActionRowBuilder().addComponents(verifyStatsStrategy);
    const renameRow = new ActionRowBuilder().addComponents(renameStrategy);

    async function sendStats(interaction: ChatInputCommandInteraction, ephemeral: boolean, channel: string, isNext = false) {
        const existingUser = await prisma.user.findFirst({
            where: {
                discordId: interaction.user.id,
            },
            select: {
                id: true,
                vatsim: true,
                presets: true,
                lists: true,
            },
        });

        if (!existingUser) {
            if (isNext) {
                await interaction.reply({
                    content: 'You are not a Radar Next user',
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                // @ts-expect-error Type error from Discord
                    components: [verifyStatsRow],
                    ephemeral: true,
                });
            }
            return;
        }

        if (channel !== '1246152355850752020') {
            await interaction.reply({
                content: `Use me here: <#1246152355850752020>`,
                ephemeral: true,
            });

            return;
        }

        const presets: Record<UserPresetType, number> = {
            MAP_SETTINGS: 0,
            BOOKMARK: 0,
            DASHBOARD_BOOKMARK: 0,
            FILTER: 0,
        };

        for (const preset of existingUser.presets) {
            presets[preset.type]++;
        }

        const mapSettingsText = presets.MAP_SETTINGS ? `${ presets.MAP_SETTINGS }` : `zero. You could save at least one, you know`;
        const filtersText = presets.FILTER ? `\n- Filters saved: ${ presets.FILTER }. Good feature by the way!` : '';
        const bookmarksText = presets.BOOKMARK ? `\n- Bookmarks created: ${ presets.BOOKMARK }. At least some knows you could use them!` : '';

        const friendsCount = (existingUser.lists.find(x => x.type === 'FRIENDS')?.users as unknown[])?.length ?? 0;
        const lists = existingUser.lists.filter(x => x.type !== 'FRIENDS');
        const listsFriends = lists.reduce((acc, value) => acc + ((value.users as unknown[])?.length), 0);
        const otherListsText = (lists.length && listsFriends) ? `\n- Other lists created: ${ lists.length } with ${ listsFriends } folks inside of them` : '';

        await interaction.reply({
            content: `### <@${ interaction.user.id }> VATSIM Radar${ isNext ? ' Next' : '' } stats
                        
- ID: ${ existingUser.id }
- Map settings saved: ${ mapSettingsText }${ filtersText }${ bookmarksText }
- Friends saved: ${ friendsCount || `0. That's... not much` }${ otherListsText }${ isNext ? '\n\nBig thanks for being a part of Radar Next team!' : '' }`,
            ephemeral,
        });
    }

    try {
        (async () => {
            try {
                console.log('Started refreshing application (/) commands.');

                await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), { body: commands });

                console.log('Successfully reloaded application (/) commands.');
            }
            catch (e) {
                console.error(e);
            }
        })();

        discordClient.on('clientReady', () => {
            console.log(`Logged in as ${ discordClient.user?.tag }!`);
        });

        discordClient.on('interactionCreate', async (interaction): Promise<any> => {
            if (interaction.guildId === discordInternalServerId && interaction.isChatInputCommand() && interaction.commandName === 'qa-verify') {
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
                        content: 'You have already been authorized on Radar Next.',
                        ephemeral: true,
                    });
                    return;
                }

                const state = randomUUID();

                await prisma.auth.create({
                    data: {
                        state,
                        discordId: interaction.user.id,
                        type: AuthType.VATSIM,
                    },
                });
                const url = `${ config.public.DOMAIN }/api/auth/vatsim/redirect?state=${ encodeURIComponent(state) }`;
                const embed = new EmbedBuilder()
                    .setURL(url)
                    .setTitle('To verify yourself and authorize on Radar Next, please use this link');

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true,
                });
                return;
            }
            if (interaction.guildId === discordInternalServerId && interaction.isChatInputCommand() && (interaction.commandName === 'next-stats' || interaction.commandName === 'next-hidden-stats')) {
                await sendStats(interaction, interaction.commandName === 'next-hidden-stats', interaction.channelId!, true);
                return;
            }

            if (interaction.guildId !== discordServerId) return;

            if (config.public.IS_DOWN === 'true') {
                if ('reply' in interaction) {
                    await interaction.reply({
                        content: 'Vatsim Radar authorization server is down. Please follow dev corner for updates',
                        ephemeral: true,
                    });
                }

                return;
            }

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
                        const foundStrategy = DiscordStrategy[interaction.values[0] as DiscordStrategy];

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
                        return;
                    }
                    else {
                        const state = randomUUID();
                        const foundStrategy = DiscordStrategy[interaction.values[0] as DiscordStrategy];

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
                        const url = `${ config.public.DOMAIN }/api/auth/vatsim/redirect?state=${ encodeURIComponent(state) }`;
                        const embed = new EmbedBuilder()
                            .setURL(url)
                            .setTitle('To verify yourself and authorize on VATSIM Radar, please use this link');

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
                    // @ts-expect-error Type error from Discord
                    components: [renameRow],
                    ephemeral: true,
                });
            }
            else if (interaction.commandName === 'verify') {
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
                    await interaction.reply({
                        // @ts-expect-error Type error from Discord
                        components: [verifyRow],
                        ephemeral: true,
                    });
                }
            }
            else if (interaction.commandName === 'stats' || interaction.commandName === 'hidden-stats') {
                await sendStats(interaction, interaction.commandName === 'hidden-stats', interaction.channelId!);

                return;
            }
            else if (interaction.commandName === 'release' && interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
                const release = await discordClient.channels.fetch(discordReleasesChannelId);
                if (release && 'send' in release) {
                    await release.send({
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
