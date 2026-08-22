const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');


const configDataPath = path.join(__dirname, 'data', 'autojoin.json');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('autojoin')
        .setDescription('Set the role to automatically assign to new members')
        .setDefaultMemberPermissions(0)
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role to assign')
                .setRequired(true)),
    
    async execute(interaction, config) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: '<a:wrong1:1539239292394803311> Only the Server Owner can use this command.', ephemeral: true });
        }


        const role = interaction.options.getRole('role');
        config.autoJoinRole = role.id;
        
        try {
            fs.writeFileSync(configDataPath, JSON.stringify({ roleId: role.id }));
        } catch (e) {
            console.error('Error saving autojoin config', e);
        }


        await interaction.reply({ content: `<a:verify:1539238356003848344> Auto-join role set to ${role.name}`, ephemeral: false });
    }
};