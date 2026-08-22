const { EmbedBuilder } = require('discord.js');


module.exports = {
    async executeServerInfo(interaction) {
        await interaction.deferReply({ ephemeral: false }).catch(console.error);

        const { guild } = interaction;
        if (!guild) {
            return interaction.editReply({ content: 'This command can only be used in a server.' });
        }

        const owner = await guild.fetchOwner();
        const members = await guild.members.fetch();
        const botCount = members.filter(member => member.user.bot).size;
        const memberCount = guild.memberCount;

        const embed = new EmbedBuilder()
            .setColor('#7700ff')
            .setTitle(`<a:Diamond:1539187960837046312> SERVER INFORMATION`)
            .setThumbnail(guild.iconURL({ size: 4096, dynamic: true }))
            .addFields(
                { name: '⤷ Server Name', value: guild.name, inline: true },
                { name: '⤷ Owner', value: owner.user.tag, inline: true },
                { name: '⤷ Created At', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '⤷Members', value: `${memberCount}`, inline: true },
                { name: '⤷ Bots', value: `${botCount}`, inline: true }
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] }).catch(console.error);
    }
};
