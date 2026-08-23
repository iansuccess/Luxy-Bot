const { ChannelType, PermissionsBitField, ActionRowBuilder, UserSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'data', 'vcconfig.json');

// ✅ Kunin ang config NG SERVER LANG NA ITO
function getServerConfig(guildId) {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return null;
        const allConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        return allConfig[guildId] || null;
    } catch (e) {
        return null;
    }
}

module.exports = {
    async handleVoiceStateUpdate(oldState, newState) {
        const guild = newState.guild || oldState.guild;
        if (!guild) return;

        // ✅ KUNIN ANG CONFIG NG SERVER NA ITO LANG
        const config = getServerConfig(guild.id);
        if (!config || !config.categoryId || !config.triggerId) return;

        const category = guild.channels.cache.get(config.categoryId);
        const triggerVC = guild.channels.cache.get(config.triggerId);
        if (!category || !triggerVC) {
            console.log(`[VC] Server ${guild.id}: Missing category or trigger channel`);
            return;
        }

        // ✅ User joins "Click Me" → Gumawa ng bagong channel
        if (newState.channelId === config.triggerId && oldState.channelId !== newState.channelId) {
            const channel = await guild.channels.create({
                name: `${newState.member.user.username}'s VC`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect]
                    },
                    {
                        id: newState.member.id,
                        allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers]
                    }
                ]
            });
            await newState.setChannel(channel);
        }

        // ✅ Burahin ang walang tao — HUWAG KASAMA ANG CLICK ME!
        if (oldState.channelId &&
            oldState.channelId !== config.triggerId &&
            oldState.channelId !== config.editChannelId) {

            const channel = guild.channels.cache.get(oldState.channelId);
            if (channel && channel.parentId === config.categoryId) {
                setTimeout(async () => {
                    // ✅ DOBLE SIGURADO: HUWAG BURAHIN ANG CLICK ME!
                    if (channel.members.size === 0 && channel.id !== config.triggerId) {
                        await channel.delete().catch(err => console.log('[VC] Delete skipped:', err.message));
                    }
                }, 5000); // ⏳ 5 segundong hintay
            }
        }
    },

    async handleButtonInteraction(interaction) {
        const config = getServerConfig(interaction.guild.id);
        if (!config) return interaction.reply({ content: 'Voice system not setup yet.', ephemeral: true });

        try {
            const memberChannel = interaction.member?.voice?.channel;
            if (!memberChannel || !config || memberChannel.parentId !== config.categoryId || memberChannel.id === config.triggerId) {
                return interaction.reply({ content: 'You must be in a managed voice channel to use these controls.', ephemeral: true });
            }

            if (interaction.customId === 'lock_vc') {
                await memberChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
                return interaction.reply({ content: '🔒 VC Locked.', ephemeral: true });
            }
            if (interaction.customId === 'unlock_vc') {
                await memberChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
                return interaction.reply({ content: '🔓 VC Unlocked.', ephemeral: true });
            }
            if (interaction.customId === 'trust_user') {
                const selectMenu = new UserSelectMenuBuilder()
                    .setCustomId('trust_user_select')
                    .setPlaceholder('Selected users will be trusted to join')
                    .setMinValues(1)
                    .setMaxValues(1);
                const row = new ActionRowBuilder().addComponents(selectMenu);
                return interaction.reply({
                    content: 'Please select the user you want to **trust** in this channel.',
                    components: [row],
                    ephemeral: true
                });
            }
            if (interaction.customId === 'untrust_user') {
                const selectMenu = new UserSelectMenuBuilder()
                    .setCustomId('untrust_user_select')
                    .setPlaceholder('Selected users will be removed from trusted list')
                    .setMinValues(1)
                    .setMaxValues(1);
                const row = new ActionRowBuilder().addComponents(selectMenu);
                return interaction.reply({
                    content: 'Please select the user you want to **untrust** in this channel.',
                    components: [row],
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('[VC ERROR] Button:', error);
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ content: '⚠️ An error occurred.', ephemeral: true });
            }
        }
    },

    async handleSelectMenuInteraction(interaction) {
        const config = getServerConfig(interaction.guild.id);
        if (!config) return interaction.reply({ content: '<a:wrong1:1539239292394803311> Voice system not setup yet.', ephemeral: true });

        const memberChannel = interaction.member?.voice?.channel;
        if (!memberChannel || memberChannel.parentId !== config.categoryId) {
            return interaction.reply({ content: '<a:wrong1:1539239292394803311> You must be in your voice channel first.', ephemeral: true });
        }
        const selectedUser = interaction.users.first();
        if (!selectedUser) {
            return interaction.reply({ content: '<a:wrong1:1539239292394803311> No user selected.', ephemeral: true });
        }

        if (interaction.customId === 'trust_user_select') {
            const member = interaction.guild.members.cache.get(selectedUser.id);
            if (!member) {
                return interaction.reply({ content: ' <a:wrong1:1539239292394803311> Could not find that user in this server.', ephemeral: true });
            }
            await memberChannel.permissionOverwrites.edit(member.id, { Connect: true });
            return interaction.reply({
                content: `<a:verify:1539238356003848344> **${member.user.tag}** can now join your VC!`,
                ephemeral: true
            });
        }

        if (interaction.customId === 'untrust_user_select') {
            const member = interaction.guild.members.cache.get(selectedUser.id);
            if (!member) {
                return interaction.reply({ content: '<a:wrong1:1539239292394803311> Could not find that user in this server.', ephemeral: true });
            }
            const existingPerms = memberChannel.permissionOverwrites.cache.get(member.id);
            const isTrusted = existingPerms?.allow?.has(PermissionsBitField.Flags.Connect);
            if (!isTrusted) {
                return interaction.reply({
                    content: `<a:warning1:1539178794210828378> **This user is not trusted.** They already cannot join your VC.`,
                    ephemeral: true
                });
            }
            await memberChannel.permissionOverwrites.edit(member.id, { Connect: false });
            return interaction.reply({
                content: `<a:verify:1539238356003848344> **${member.user.tag}** has been removed from trusted users.`,
                ephemeral: true
            });
        }
    }
};
