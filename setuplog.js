const { PermissionsBitField } = require('discord.js');

const fs = require('fs');
const path = require('path');
const configDataPath = path.join(__dirname, 'data', 'logconfig.json');

module.exports = {
    async executeSetupLog(interaction, config) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: `<a:wrong1:1539239292394803311> Only the Server Owner can use this!`, ephemeral: false });
        }

        const channel = interaction.options.getChannel('target');
        config.logsChannel = channel.id;

        try {
            fs.writeFileSync(configDataPath, JSON.stringify({ channelId: channel.id }));
        } catch (e) {
            console.error('Error saving log config', e);
        }

        await interaction.reply({ content: `<a:verify:1539238356003848344> Logging channel set to ${channel}.` });
    }
};