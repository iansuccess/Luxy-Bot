const { EmbedBuilder } = require('discord.js');


const ARROW = '⤷';


function redEmbed(title, description = null) {
  const embed = new EmbedBuilder()
    .setColor('#7700ff')
    .setTitle(title)
    .setTimestamp()
    .setFooter({ text: 'Ms. Luxy' });


  if (description) embed.setDescription(description);
  return embed;
}


module.exports = {
  async handleInfoSlash(interaction) {
    const cmd = interaction.commandName;


    if (cmd === 'profile') {
      const target = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild.members.cache.get(target.id);


      const embed = new EmbedBuilder()
        .setColor('#7700ff')
        .setTitle(`<a:member:1539239556438691960> PROFILE: ${target.tag}`)
        .setThumbnail(target.displayAvatarURL({ size: 512, dynamic: true }))
        .addFields(
          { name: `${ARROW} User ID`, value: target.id, inline: true },
          { name: `${ARROW} Account Created`, value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: false },
          { name: `${ARROW} Joined Server`, value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : `${ARROW} Not available`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: ` ${ARROW} $$  | Information` });


      return { embeds: [embed] };
    }


    if (cmd === 'avatar') {
      const user = interaction.options.getUser('user') || interaction.user;
      const embed = redEmbed(`${ARROW} USER AVATAR`)
        .setImage(user.displayAvatarURL({ size: 4096, dynamic: true }));
      return { embeds: [embed] };
    }


    if (cmd === 'serverinfo') {
      const guild = interaction.guild;
      const owner = await guild.fetchOwner();
      return { embeds: [redEmbed(`${ARROW} SERVER INFORMATION`,
        `**${ARROW} Server Name:** ${guild.name}\n` +
        `**${ARROW} Owner:** ${owner.user.username}\n` +
        `**${ARROW} Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n` +
        `**${ARROW} Total Members:** ${guild.memberCount}`)] };
    }
  }
};