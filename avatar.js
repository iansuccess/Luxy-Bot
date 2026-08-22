const { EmbedBuilder } = require('discord.js');


module.exports = {
    async executeAvatar(interaction) {
        await interaction.deferReply({ ephemeral: false }).catch(console.error);
        const user = interaction.options.getUser('user') || interaction.user;
        let avatarURL = user.displayAvatarURL({ size: 4096, dynamic: true });


        if (interaction.guild) {
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (member && member.displayAvatarURL()) {
                avatarURL = member.displayAvatarURL({ size: 4096, dynamic: true });
            }
        }


        const embed = new EmbedBuilder()
            .setColor('#7700ff')
            .setTitle(`<a:member:1539239556438691960> USER AVATAR`)
            .setImage(avatarURL)
            .setFooter({ text: `⤷ Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] }).catch(console.error);
    },


    async executeBanner(interaction) {
        await interaction.deferReply({ ephemeral: false }).catch(console.error);
        const user = interaction.options.getUser('user') || interaction.user;
        const fetchedUser = await user.fetch().catch(() => null);
        
        if (!fetchedUser || !fetchedUser.bannerURL()) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#7700ff')
                    .setTitle(`<a:wrong1:1539239292394803311> No Banner`)
                    .setDescription('⤷ This user has no banner set!')]
            }).catch(console.error);
        }


        const bannerUrl = fetchedUser.bannerURL({ size: 4096, dynamic: true });


        const embed = new EmbedBuilder()
            .setColor('#7700ff')
            .setTitle(`<a:member:1539239556438691960> USER BANNER`)
            .setImage(bannerUrl)
            .setFooter({ text: `⤷ Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] }).catch(console.error);
    }
};