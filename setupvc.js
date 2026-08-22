const { ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const EMOJI_WRONG = '<a:wrong1:1539239292394803311>';
const EMOJI_VERIFY = '<a:verify:1539238356003848344>';

module.exports = {
    async executeSetupVC(interaction, config) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: `${EMOJI_WRONG} Admin only!`, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            
            // 1. Create Category
            const category = await guild.channels.create({
                name: 'Luxy Voice Call',
                type: ChannelType.GuildCategory
            });

            // 2. Create Voice Channel "Click Me"
            const clickMeVC = await guild.channels.create({
                name: 'Click Me',
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect]
                    }
                ]
            });

            // 3. Create Text Channel "Edit Channel"
            const editChannel = await guild.channels.create({
                name: 'edit-channel',
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });

            // 4. Send Message with Buttons
            const embed = new EmbedBuilder()
                .setTitle('Voice Control Panel')
                .setDescription('⤷ Use the buttons below to manage your private voice channel.\n\n*⤷ Make sure you are in your voice channel to use these commands.*')
                .setColor('#7700ff');

            const untrustBtn = new ButtonBuilder()
                .setCustomId('untrust_user')
                .setLabel('Untrust User')
                .setStyle(ButtonStyle.Secondary);

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('lock_vc').setLabel('Lock').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('unlock_vc').setLabel('Unlock').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('trust_user').setLabel('Trust User').setStyle(ButtonStyle.Primary),
                untrustBtn
            );

            await editChannel.send({ embeds: [embed], components: [row1] });

            // 5. Save Config
            config.vcSetup = {
                categoryId: category.id,
                triggerId: clickMeVC.id,
                editChannelId: editChannel.id
            };
            
            const configPath = path.join(__dirname, 'data', 'vcconfig.json');
            fs.writeFileSync(configPath, JSON.stringify(config.vcSetup, null, 2));

            await interaction.editReply({ content: `<a:verify:1539238356003848344> Voice System Setup Completed!\nCategory: **Luxy Voice Call**\nTrigger: **Click Me**\nSettings: **edit-channel**` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `<a:wrong1:1539239292394803311> Failed to setup voice system: ${error.message}` });
        }
    }
};