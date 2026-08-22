const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    async executeMessage(interaction, BOT_OWNER_ID, redEmbed, greenEmbed, purpleEmbed, config) {
        const userId = interaction.user.id;
        const targetChannel = interaction.options.getChannel('channel');

        // ✅ Permission Check — BY ROLE ID
        const isOwner = userId === BOT_OWNER_ID || userId === interaction.guild.ownerId;
        const userRoles = interaction.member.roles.cache;
        const isWhitelisted = 
            config.whitelist.bypassAll?.some(roleId => userRoles.has(roleId)) ||
            config.whitelist.messageCmd?.some(roleId => userRoles.has(roleId));
        
        if (!isOwner && !isWhitelisted) {
            return interaction.reply({
                embeds: [redEmbed('<a:wrong1:1539239292394803311> No Permission', 'You are not allowed to use this command!')],
                ephemeral: true
            });
        }

        // ✅ POP-UP BOX — Type your message here!
        const modal = new ModalBuilder()
            .setCustomId(`sendmsg_${targetChannel.id}`)
            .setTitle(`Message for #${targetChannel.name}`);

        const messageInput = new TextInputBuilder()
            .setCustomId('msg_text')
            .setLabel('Type your message')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Type your message here...\nPress ENTER for new lines!')
            .setRequired(true)
            .setMaxLength(4000);

        modal.addComponents(new ActionRowBuilder().addComponents(messageInput));

        await interaction.showModal(modal);
    },

    // ✅ AFTER SUBMIT — ONLY ONE MESSAGE WILL SHOW!
    async handleModalSubmit(interaction, BOT_OWNER_ID, redEmbed, greenEmbed, purpleEmbed, config) {
        if (!interaction.customId.startsWith('sendmsg_')) return false;

        const channelId = interaction.customId.replace('sendmsg_', '');
        const msgText = interaction.fields.getTextInputValue('msg_text');
        const targetChannel = interaction.guild.channels.cache.get(channelId);

        if (!targetChannel) {
            return interaction.reply({
                embeds: [redEmbed('<a:wrong1:1539239292394803311> Error', 'Target channel not found!')],
                ephemeral: true
            });
        }

        // ✅ SEND THE EMBED DIRECTLY TO CHANNEL — ONLY ONE MESSAGE!
        await targetChannel.send({
            embeds: [purpleEmbed('<a:YourMessage:1539358365896155247> NEW MESSAGE!', `\n\n\n${msgText}`)]
        });
        await targetChannel.send(`@everyone`);
        return false;
    }
};