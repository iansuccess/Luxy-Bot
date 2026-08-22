const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const emojis = require('./emojis.js');

const BOT_OWNER_ID = '1531611262159687820';
const BOT_ID = '1535479327234461756';

let isBotActing = false;
const pendingRequests = new Map();

module.exports = {
get isBotActing() { return isBotActing; },
set isBotActing(val) { isBotActing = val; },
pendingRequests,

clearLock(key) {
for (const [reqId, req] of pendingRequests) {
if (req.targetKey === key) pendingRequests.delete(reqId);
}
},

isWhitelisted(member, feature, config) {
if (!member) return false;
// Bot and Server Owner are always whitelisted
const botId = member.client?.user?.id || BOT_ID;
if (member.id === botId || member.id === BOT_OWNER_ID || (member.guild && member.id === member.guild.ownerId)) return true;

// Ensure we have a GuildMember for role checks
if (!member.roles) return false;

// Bypass All check
if (config?.whitelist?.bypassAll && member.roles.cache.some(role => config.whitelist.bypassAll.includes(role.id))) return true;

if (!config?.whitelist?.[feature]) return false;
return member.roles.cache.some(role => config.whitelist[feature].includes(role.id));
},

async clearMemberRoles(member, reason) {
if (!member || member.id === member.guild.ownerId) return;
try {
// Check hierarchy
if (member.guild.members.me.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
console.log(`[PROTECTION] Cannot clear roles of ${member.user.tag}: Bot role too low.`);
return;
}
await member.roles.set([], reason);
} catch (e) {
console.error(`[PROTECTION] Failed to clear roles for ${member.user.tag}:`, e);
}
},

async sendApprovalRequest(guild, title, description, onApprove, onCancel = null, executor = null) {
    const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const approveId = `approve_${requestId}`;
    const cancelId = `cancel_${requestId}`;

    const embed = new EmbedBuilder()
        .setColor('#ffcc00')
        .setTitle(title)
        .setDescription(`${description}\n\n${emojis.Warning} **RESTORE APPROVAL REQUEST**`)
        .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(approveId).setLabel('âo. Approve').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(cancelId).setLabel('â?O Restore').setStyle(ButtonStyle.Danger)
    );

    try {
        const owner = await guild.fetchOwner();
        const sentMsg = await owner.send({ embeds: [embed], components: [buttons] });

        pendingRequests.set(requestId, {
            active: true,
            message: sentMsg,
            guildId: guild.id,
            executor,
            onApprove,
            onCancel,
            approveId,
            cancelId
        });
    } catch (err) {
        console.error('â?O Failed to send approval DM to owner:', err.message);
    }
},

// --- GIVE ADMIN ROLE ---
async antiGiveAdminRole(member, role, executor, config, client) {
    console.log('antiGiveAdminRole RUNNING!');
    if (isBotActing) return;
    
    // Check if the role has Administrator permission
    if (!role.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    if (this.isWhitelisted(executor, 'bypassGiveAdmin', config)) return;

    console.log(`[PROTECTION] Administrator role given by ${executor.user.tag}. Clearing executor roles.`);

    // 1. Force removal of the admin role from the target (redundant but safe check)
    try {
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role, 'Unauthorized Administrator role assignment - Force Remove');
            console.log(`[PROTECTION] Role ${role.name} force removed from ${member.user.tag}`);
        }
    } catch (e) { console.log('Failed to force remove admin role from target:', e); }

    // 2. Clear roles of the executor
    await this.clearMemberRoles(executor, "Unauthorized Administrator role assignment");

    // 3. Optional: Send a notification to the log channel
    const logChannel = member.guild.channels.cache.get(config.logsChannel);
    if (logChannel) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('dYs« UNAUTHORIZED ADMIN ASSIGNMENT')
            .setDescription(`**Executor:** ${executor.user.tag} (${executor.id})\n**Target:** ${member.user.tag} (${member.id})\n**Role:** ${role.name}\n\n**Result:** Action rejected, role removed, and executor roles cleared.`)
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
},

// --- CHANNEL PROTECTIONS ---
async handleChannelDelete(channel, executor, config) {
if (isBotActing) return;
if (executor.id === channel.client.user.id) return;

// Exception: VC Manager
if (config.vcSetup && (channel.id === config.vcSetup.triggerId || channel.parentId === config.vcSetup.categoryId)) return;

if (this.isWhitelisted(executor, 'deleteChannel', config)) return;

console.log(`[PROTECTION] Channel delete detected by ${executor.user.tag}. Clearing roles.`);
await this.clearMemberRoles(executor, "Unauthorized channel deletion");

const channelData = { 
name: channel.name, 
type: channel.type, 
parent: channel.parentId, 
position: channel.position,
permissionOverwrites: channel.permissionOverwrites.cache.map(v => ({
id: v.id,
allow: v.allow.toArray(),
deny: v.deny.toArray(),
type: v.type
}))
};

await this.sendApprovalRequest(
channel.guild,
`âs ï,? CHANNEL DELETED: ${channel.name}`,
`**Executor:** ${executor.user.tag} (${executor.id})\n\nRoles have been cleared from the executor.`,
async () => { /* Approve = stay deleted */ },
async () => { 
try {
isBotActing = true;
await channel.guild.channels.create({
name: channelData.name,
type: channelData.type,
parent: channelData.parent,
position: channelData.position,
permissionOverwrites: channelData.permissionOverwrites
});
} finally {
isBotActing = false;
}
}
);
},

async handleChannelCreate(channel, executor, config) {
if (isBotActing) return;
if (executor.id === channel.client.user.id) return;

// Exception: VC Manager
if (config.vcSetup && channel.parentId === config.vcSetup.categoryId) return;

if (this.isWhitelisted(executor, 'createChannel', config)) return;

console.log(`[PROTECTION] Channel create detected by ${executor.user.tag}. Clearing roles.`);
await this.clearMemberRoles(executor, "Unauthorized channel creation");

await this.sendApprovalRequest(
channel.guild,
`âs ï,? CHANNEL CREATED: ${channel.name}`,
`**Executor:** ${executor.user.tag} (${executor.id})\n\nRoles have been cleared from the executor.`,
async () => { /* Approve = stay created */ },
async () => { 
try {
isBotActing = true;
await channel.delete("Unauthorized creation");
} finally {
isBotActing = false;
}
}
);
},
// --- ANTI KICK ---
async antiKick(member, executor, config, client) {
if (isBotActing) return;
if (!config.protectionEnabled.antiKick) return;
if (this.isWhitelisted(executor, 'kick', config)) return;
if (executor.id === BOT_OWNER_ID) return;
if (executor.id === member.guild.ownerId) return;

// Don't punish the bot itself if it was the one doing the kick
if (executor.id === client.user.id) return;

// Hierarchy check: Bot must be able to modify executor
if (member.guild.members.me.roles.highest.comparePositionTo(executor.roles.highest) <= 0) {
console.log(`[ANTI-KICK] Cannot punish ${executor.user.tag}: Bot role too low.`);
return;
}

console.log(`[ANTI-KICK] Unauthorized kick by ${executor.user.tag}. Clearing roles.`);

isBotActing = true;
// Clear roles
try {
await executor.roles.set([], "Unauthorized kick punishment");

const logChannel = member.guild.channels.cache.get(config.logsChannel);
if (logChannel) {
logChannel.send({
embeds: [
new EmbedBuilder()
.setColor("#ff0000")
.setTitle("âs ï,? Unauthorized Kick Detected")
.setDescription(`**Executor:** ${executor}\n**Target:** ${member.user.tag}\n**Action:** All roles removed from executor.`)
.setTimestamp()
]
});
}
} catch (e) {
console.error("Failed to clear roles of unauthorized kicker:", e);
}
isBotActing = false;
},
// --- ANTI LINK ---
async antiLink(message, config) {
if (message.author.bot) return;
if (!config.antiLink) return;
if (this.isWhitelisted(message.member, 'antiLink', config)) return;

const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;
if (inviteRegex.test(message.content)) {
try {
await message.delete();
console.log(`[ANTI-LINK] Deleted Discord invite link from ${message.author.tag}`);
} catch (e) {
console.error("Failed to delete link message:", e);
}
}
},

async handleRoleDelete(role, executor, config) {
if (isBotActing) return;
if (executor.id === role.client.user.id) return;

if (this.isWhitelisted(executor, 'deleteRole', config)) return;

console.log(`[PROTECTION] Role delete detected by ${executor.user.tag}. Clearing roles.`);
await this.clearMemberRoles(executor, "Unauthorized role deletion");

const roleData = {
name: role.name,
color: role.color,
hoist: role.hoist,
permissions: role.permissions.bitfield,
mentionable: role.mentionable,
position: role.position
};

await this.sendApprovalRequest(
role.guild,
`âs ï,? ROLE DELETED: ${role.name}`,
`**Executor:** ${executor.user.tag} (${executor.id})\n\nRoles have been cleared from the executor.`,
async () => { /* Approve */ },
async () => {
try {
isBotActing = true;
await role.guild.roles.create({
name: roleData.name,
color: roleData.color,
hoist: roleData.hoist,
permissions: roleData.permissions,
mentionable: roleData.mentionable,
reason: "Restoring deleted role"
});
} finally {
isBotActing = false;
}
},
executor
);
},

async handleRoleCreate(role, executor, config) {
if (isBotActing) return;
if (executor.id === role.client.user.id) return;

if (this.isWhitelisted(executor, 'createRole', config)) return;

console.log(`[PROTECTION] Role create detected by ${executor.user.tag}. Clearing roles and deleting role.`);

try {
isBotActing = true;
await role.delete("Unauthorized creation");
} catch (e) { console.error("Failed to delete unauthorized role:", e); }
finally { isBotActing = false; }

await this.clearMemberRoles(executor, "Unauthorized role creation");

await this.sendApprovalRequest(
role.guild,
`âs ï,? ROLE CREATED (AND DELETED): ${role.name}`,
`**Executor:** ${executor.user.tag} (${executor.id})\n\nRoles have been cleared from the executor and the new role was deleted.`,
async () => { /* Approve = stay deleted */ },
async () => {
try {
isBotActing = true;
await role.guild.roles.create({
name: role.name,
color: role.color,
hoist: role.hoist,
permissions: role.permissions.bitfield,
mentionable: role.mentionable
});
} finally {
isBotActing = false;
}
    // --- ANTI LINK (ALL EXCEPT DISCORD) ---
    async antiLinkAll(message, config) {
        if (message.author.bot) return;
        if (!config.antiLinkAll) return;
        if (this.isWhitelisted(message.member, 'antiLinkAll', config)) return;

        // Detect all links except discord invites
        const allLinksRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
        const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;
        
        if (allLinksRegex.test(message.content) && !inviteRegex.test(message.content)) {
            try {
                await message.delete();
                console.log(`[ANTI-LINK-ALL] Deleted non-invite link from ${message.author.tag}`);
            } catch (e) {
                console.error("Failed to delete link message:", e);
            }
        }
    },

    // --- ANTI DISCORD LINK ---
    async antiDiscordLink(message, config) {
        if (message.author.bot) return;
        if (!config.antiDiscordLink) return;
        if (this.isWhitelisted(message.member, 'antiDiscordLink', config)) return;

        const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;
        if (inviteRegex.test(message.content)) {
            try {
                await message.delete();
                console.log(`[ANTI-DISCORD-LINK] Deleted Discord invite link from ${message.author.tag}`);
            } catch (e) {
                console.error("Failed to delete link message:", e);
            }
        }
    },

},
executor
);
},

// --- REMOVE ADMIN ROLE ---
async antiRemoveAdminRole(member, role, executor, config, client) {
    if (isBotActing) return;
    if (!config.protectionEnabled.antiRemoveAdmin) return;
    if (this.isWhitelisted(executor, 'protection', config)) return;

    if (!role.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !role.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
        !role.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

    // 1. SAFE RESTORE
    try {
        isBotActing = true;
        await member.roles.add(role, 'Pending owner approval â?" restored immediately for safety');
        await new Promise(r => setTimeout(r, 1000));
    } catch (e) { console.log('Safe restore failed:', e); }
    finally { isBotActing = false; }

    const onApprove = async () => {
        try { 
            isBotActing = true;
            await member.roles.remove(role, 'Approved by Bot Owner â?" bot removed role'); 
        } catch (e) { console.log('Approve remove role error:', e); }
        finally { isBotActing = false; }
    };

    await this.sendApprovalRequest(
        member.guild,
        `âs ï,? REMOVE ADMIN ROLE REQUEST`,
        `**Executor:** ${executor.user.tag}\n**Target Member:** ${member.user.tag}\n**Role:** ${role.name}\n\nâo. Approve â+' Bot will remove this role permanently\nâ?O Cancel â+' Role stays restored, nothing happens`,
        onApprove,
        null,
        executor
    );
    
    // Auto-approve for this specific case
    await onApprove();
},
};





