const { ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, UserSelectMenuBuilder } = require('discord.js');

function containsLink(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return urlPattern.test(text);
}

module.exports = {
    async handleVoiceStateUpdate(oldState, newState, config) {
        if (!config.vcSetup || !config.vcSetup.categoryId) return;

        // 1. User joins "Click Me"
        if (newState.channelId === config.vcSetup.triggerId) {
            const guild = newState.guild;
            const category = guild.channels.cache.get(config.vcSetup.categoryId);
            if (!category) return;

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

        // 2. Delete empty channels
        if (oldState.channelId && oldState.channelId !== config.vcSetup.triggerId && oldState.channelId !== config.vcSetup.editChannelId) {
            const channel = oldState.guild.channels.cache.get(oldState.channelId);
            if (channel && channel.parentId === config.vcSetup.categoryId && channel.members.size === 0) {
                await channel.delete().catch(console.error);
            }
        }
    },

    async handleButtonInteraction(interaction, config) {
        try {
            const memberChannel = interaction.member?.voice?.channel;
            if (!memberChannel || memberChannel.parentId !== config.vcSetup.categoryId || memberChannel.id === config.vcSetup.triggerId) {
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

            // ✅ UNTRUST USER BUTTON
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

    async handleSelectMenuInteraction(interaction, config) {
        const memberChannel = interaction.member?.voice?.channel;
        if (!memberChannel || memberChannel.parentId !== config.vcSetup.categoryId) {
            return interaction.reply({ content: '<a:wrong1:1539239292394803311> You must be in your voice channel first.', ephemeral: true });
        }

        const selectedUser = interaction.users.first();
        if (!selectedUser) {
            return interaction.reply({ content: '<a:wrong1:1539239292394803311> No user selected.', ephemeral: true });
        }

        // --- TRUST USER ---
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

        // ✅ UNTRUST USER LOGIC
        if (interaction.customId === 'untrust_user_select') {
            const member = interaction.guild.members.cache.get(selectedUser.id);
            if (!member) {
                return interaction.reply({ content: '<a:wrong1:1539239292394803311> Could not find that user in this server.', ephemeral: true });
            }

            // Check if user is actually trusted (has Connect permission)
            const existingPerms = memberChannel.permissionOverwrites.cache.get(member.id);
            const isTrusted = existingPerms?.allow?.has(PermissionsBitField.Flags.Connect);

            if (!isTrusted) {
                return interaction.reply({
                    content: `<a:warning1:1539178794210828378> **This user is not trusted.** They already cannot join your VC.`,
                    ephemeral: true
                });
            }

            // Remove permission → untrust
            await memberChannel.permissionOverwrites.edit(member.id, { Connect: false });
            return interaction.reply({
                content: `<a:verify:1539238356003848344> **${member.user.tag}** has been removed from trusted users.`,
                ephemeral: true
            });
        }
    },

    async handleModalInteraction(interaction, config) {
        console.log('Modal:', interaction.customId);
    }
};