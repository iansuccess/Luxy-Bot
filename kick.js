const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const detection = require('./detection.js');


module.exports = {
    async executeKick(interaction, config) {
        await interaction.deferReply({ ephemeral: false }).catch(console.error);


        try {
            const isOwner = interaction.guild.ownerId === interaction.user.id;
            const target = interaction.options.getMember('target');
            const reason = interaction.options.getString('reason') || 'No reason provided';


            if (!target) return interaction.editReply({ content: `<a:wrong1:1539239292394803311> Target not found.` });


            // Bypass All check
            if (detection.isWhitelisted(target, 'bypassAll', config)) {
                return interaction.editReply({ content: `<a:wrong1:1539239292394803311> This user cannot be kicked.` });
            }


            // Whitelist check
            if (!isOwner && !detection.isWhitelisted(interaction.member, 'kick', config)) {
                await interaction.editReply({ 
                    content: `<a:wrong1:1539239292394803311> You are not whitelisted to use this command. All your roles have been removed as a punishment.`
                });
                await detection.antiKick(interaction.member, interaction.member, config, interaction.client);
                return;
            }


            if (target.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply({ content: `<a:wrong1:1539239292394803311> You cannot kick a user with Administrator permissions.` });
            }


            // Check if bot has permission and hierarchy
            if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return interaction.editReply({ content: `<a:wrong1:1539239292394803311> I do not have the 'Kick Members' permission.` });
            }
            
            if (interaction.guild.members.me.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
                return interaction.editReply({ content: `<a:wrong1:1539239292394803311> I cannot kick this user because they have a higher or equal role than me.` });
            }


            await target.kick(reason);
            const embed = new EmbedBuilder()
                .setColor('#7700ff')
                .setTitle(`<a:Kick:1539240174368727124> User Kicked`)
                .setDescription(`⤷ **Target:** ${target.user.tag}\n⤷ **Reason:** ${reason}`)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const errorMessage = `<a:wrong1:1539239292394803311> Failed to kick the user: ${error.message}`;
            await interaction.editReply({ content: errorMessage });
        }
    }
};
