const { EmbedBuilder, PermissionsBitField } = require('discord.js');


// 📌 Storage for settings, logs, and pending requests
const serverConfig = new Map();
const userMessageCache = new Map();
const pendingSetupRequests = new Map();


// ✅ Parehong Embed Style gaya sa index.js
function purpleEmbed(title, description = null) {
  const embed = new EmbedBuilder()
    .setColor('#7700ff')
    .setTitle(title)
    .setTimestamp()
    .setFooter({ text: 'Dr.Blaze | Protection System' });


  if (description) embed.setDescription(description);
  return embed;
}


module.exports = {
  // 📌 Handle slash commands
  async handleAntiNukeSlash(interaction) {
    const guildId = interaction.guild.id;
    const guild = interaction.guild;
    const member = interaction.member;
    const cmd = interaction.commandName;


    const hasPermission = member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                          member.permissions.has(PermissionsBitField.Flags.Administrator);


    if (!hasPermission) {
      return { embeds: [purpleEmbed('<a:wrong1:1539239292394803311> Access Denied', 'You need **Manage Server** or **Administrator** permission to use this command.')], ephemeral: true };
    }


    if (cmd === 'reset') {
      if (!serverConfig.has(guildId)) {
        return { embeds: [purpleEmbed('<a:wrong1:1539239292394803311> Nothing to Reset', 'No settings have been configured for this server.')] };
      }
      serverConfig.delete(guildId);
      pendingSetupRequests.delete(guildId);
      for (const [userId, logs] of userMessageCache) {
        if (logs.guildId === guildId) userMessageCache.delete(userId);
      }
      return { embeds: [purpleEmbed('🔄 System Reset', 'All settings and pending requests have been cleared.\n\nTo use protection again, run: `/setup`')] };
    }


    if (cmd === 'setup') {
      if (serverConfig.has(guildId)) {
        return { embeds: [purpleEmbed('⚠️ Already Configured', 'This server has already been set up.')] };
      }


      if (pendingSetupRequests.has(guildId)) {
        return { embeds: [purpleEmbed('⏳ Pending Approval', 'A setup request has already been sent to the server owner. Please wait for confirmation.')] };
      }


      const owner = await guild.fetchOwner().catch(() => null);
      if (!owner) {
        return { embeds: [purpleEmbed('❌ Error', 'Could not find or contact the server owner.')] };
      }


      pendingSetupRequests.set(guildId, {
        requestedBy: member.user.tag,
        requestedById: member.id,
        guildName: guild.name,
        timestamp: Date.now()
      });


      try {
        await owner.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#7700ff')
              .setTitle('⚠️ Anti-Nuke Setup Request')
              .setDescription(`**Server:** ${guild.name}\n**Requested by:** ${member.user.tag}\n\nDo you want to allow this user to enable the Anti-Nuke protection system?\n\nReply with **YES** to approve or **NO** to deny.`)
              .setTimestamp()
          ]
        });
      } catch {
        pendingSetupRequests.delete(guildId);
        return { embeds: [purpleEmbed('<a:wrong1:1539239292394803311> Could Not DM Owner', 'The server owner has DMs disabled. Please ask them to open DMs first.')] };
      }


      return { embeds: [purpleEmbed('📩 Request Sent', 'Setup request has been sent to the server owner. Please wait for approval.')] };
    }


    if (!serverConfig.has(guildId)) {
      return { embeds: [purpleEmbed('⚠️ Not Configured', 'Please run `/setup` first to activate features.')], ephemeral: true };
    }


    const config = serverConfig.get(guildId);


    if (cmd === 'antispam') {
      config.antiSpam = !config.antiSpam;
      serverConfig.set(guildId, config);
      return { embeds: [purpleEmbed('⚙️ Anti-Spam Updated', `Anti-Spam is now: **${config.antiSpam ? '✅ ENABLED' : '❌ DISABLED'}**`)] };
    }


    if (cmd === 'antilink') {
      config.antiLink = !config.antiLink;
      serverConfig.set(guildId, config);
      return { embeds: [purpleEmbed('⚙️ Anti-Link Updated', `Anti-Link is now: **${config.antiLink ? '✅ ENABLED' : '❌ DISABLED'}**`)] };
    }


    if (cmd === 'whitelist') {
      const sub = interaction.options.getSubcommand();
      const role = interaction.options.getRole('role');


      if (sub === 'list') {
        const roleList = config.whitelistRoles.length > 0
          ? config.whitelistRoles.map(id => `<@&${id}>`).join('\n')
          : 'No roles added yet.';
        return { embeds: [purpleEmbed('📋 Whitelisted Roles', roleList)] };
      }


      if (sub === 'add') {
        if (config.whitelistRoles.includes(role.id)) {
          return { embeds: [purpleEmbed('ℹ️ Already Added', 'This role is already in the whitelist.')] };
        }
        config.whitelistRoles.push(role.id);
        serverConfig.set(guildId, config);
        return { embeds: [purpleEmbed('<a:verify:1539238356003848344> Role Added', `**${role.name}** has been added to the whitelist.`)] };
      }


      if (sub === 'remove') {
        config.whitelistRoles = config.whitelistRoles.filter(id => id !== role.id);
        serverConfig.set(guildId, config);
        return { embeds: [purpleEmbed('<a:verify:1539238356003848344> Role Removed', `**${role.name}** has been removed from the whitelist.`)] };
      }
    }
  },


  // 📌 Handle owner replies in DMs
  async handleOwnerDM(message, client) {
    if (message.guild || message.author.bot) return;


    const response = message.content.trim().toUpperCase();
    let foundRequest = null;
    let guildIdFound = null;


    for (const [guildId, data] of pendingSetupRequests) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;


      if (guild.ownerId === message.author.id) {
        foundRequest = data;
        guildIdFound = guildId;
        break;
      }
    }


    if (!foundRequest) return;


    if (response === 'YES' || response === 'ACCEPT') {
      serverConfig.set(guildIdFound, {
        antiSpam: true,
        antiLink: true,
        whitelistRoles: [],
        maxSameMessages: 3,
        timeLimit: 4000
      });


      pendingSetupRequests.delete(guildIdFound);


      await message.author.send({
        embeds: [purpleEmbed('✅ Request Approved', 'Anti-Nuke system has been enabled.')]
      }).catch(() => {});


      const guild = client.guilds.cache.get(guildIdFound);
      if (guild) {
        const requester = guild.members.cache.get(foundRequest.requestedById);
        if (requester) {
          requester.send({
            embeds: [purpleEmbed('✅ Owner Accepted', 'Anti-Nuke is now active!')]
          }).catch(() => {});
        }
      }
    }
    else if (response === 'NO' || response === 'DENY') {
      pendingSetupRequests.delete(guildIdFound);


      await message.author.send({
        embeds: [purpleEmbed('❌ Request Denied', 'You have rejected the setup request.')]
      }).catch(() => {});


      const guild = client.guilds.cache.get(guildIdFound);
      if (guild) {
        const requester = guild.members.cache.get(foundRequest.requestedById);
        if (requester) {
          requester.send({
            embeds: [purpleEmbed('❌ Owner Rejected', 'The setup request was denied.')]
          }).catch(() => {});
        }
      }
    }
  },


  // 🛡️ Protection logic
  async runProtection(message) {
    if (message.author.bot || !message.guild) return;


    const guildId = message.guild.id;
    if (!serverConfig.has(guildId)) return;
    const config = serverConfig.get(guildId);


    const member = message.member;
    const isWhitelisted = member.roles.cache.some(role => config.whitelistRoles.includes(role.id));
    if (isWhitelisted) return; // ✅ Whitelisted = walang harang


    // 🚫 Anti-Link
    if (config.antiLink) {
      const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;
      if (inviteRegex.test(message.content)) {
        await message.delete().catch(() => {});
        const sent = await message.channel.send({
          embeds: [purpleEmbed('🚫 Link Detected', 'Sending Discord invite links is not allowed here.')]
        }).catch(() => {});
        if (sent) setTimeout(() => sent.delete().catch(() => {}), 4000);
        return;
      }
    }


    // 🚫 Anti-Spam
    if (config.antiSpam) {
      const now = Date.now();
      const cleanText = message.content.trim().toLowerCase();
      if (!cleanText) return;


      if (!userMessageCache.has(message.author.id)) {
        userMessageCache.set(message.author.id, { messages: [], triggered: false });
      }


      const userLog = userMessageCache.get(message.author.id);
      userLog.messages = userLog.messages.filter(item => now - item.time < config.timeLimit);
      userLog.messages.push({ text: cleanText, time: now });


      const sameCount = userLog.messages.filter(i => i.text === cleanText).length;


      if (userLog.triggered) return message.delete().catch(() => {});


      if (sameCount >= config.maxSameMessages) {
        userLog.triggered = true;
        await message.delete().catch(() => {});


        const warn = await message.channel.send({
          embeds: [purpleEmbed('⚠️ WARNING', 'Do not spam!')]
        }).catch(() => {});
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);


        setTimeout(() => {
          if (userMessageCache.has(message.author.id)) {
            userMessageCache.get(message.author.id).triggered = false;
            userMessageCache.get(message.author.id).messages = [];
          }
        }, 3000);
      }
    }
  },


  // ✅ Para magamit sa index.js
  getServerConfig(guildId) {
    return serverConfig.get(guildId);
  }
};