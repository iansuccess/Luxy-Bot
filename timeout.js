const { EmbedBuilder, PermissionsBitField } = require('discord.js');


const detection = require('./detection.js');


module.exports = {
    async executeTimeout(interaction, config) {
        const target = interaction.options.getMember('target');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || '⤷ No reason provided';


        if (!target) return interaction.reply({ content: `<a:wrong1:1539239292394803311> Target not found.`, ephemeral: true });


        // Bypass All check
        if (detection.isWhitelisted(target, 'bypassAll', config)) {
            return interaction.reply({ content: `<a:wrong1:1539239292394803311> This user cannot be timed out.`, ephemeral: true });
        }


        // Permission check: Owner and Admins only
        const isOwner = interaction.guild.ownerId === interaction.user.id;
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);


        if (!isOwner && !isAdmin) {
            return interaction.reply({ content: `<a:wrong1:1539239292394803311> Only the Server Owner and Administrators can use this command.`, ephemeral: true });
        }


        // Target check: Cannot timeout Admins
        if (target.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: `<a:wrong1:1539239292394803311> You cannot timeout a user with Administrator permissions.`, ephemeral: true });
        }


        try {
            await target.timeout(duration * 60 * 1000, reason);
            const embed = new EmbedBuilder()
                .setColor('#7700ff')
                .setTitle(`<a:timeoutt:1539251333314387988> User Timed Out`)
                .setDescription(`⤷ **Target:** ${target.user.tag}\n⤷ **Duration:** ${duration} minutes\n⤷ **Reason:** ${reason}`)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `<a:wrong1:1539239292394803311> Failed to timeout the user.`, ephemeral: true });
        }
    },


    async executeUntimeout(interaction, config) {
        const target = interaction.options.getMember('target');


        if (!target) return interaction.reply({ content: `<a:wrong1:1539239292394803311> Target not found.`, ephemeral: true });


        const isOwner = interaction.guild.ownerId === interaction.user.id;
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);


        if (!isOwner && !isAdmin) {
            return interaction.reply({ content: `<a:wrong1:1539239292394803311> Only the Server Owner and Administrators can use this command.`, ephemeral: false });
        }


        try {
            await target.timeout(null);
            const embed = new EmbedBuilder()
                .setColor('#7700ff')
                .setTitle(`<a:verify:1539238356003848344> Timeout Removed`)
                .setDescription(`⤷ **Target:** ${target.user.tag}`)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `<a:wrong1:1539239292394803311> Failed to remove timeout.`, ephemeral: true });
        }
    }
};