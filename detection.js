const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');



const BOT_OWNER_ID = '1531611262159687820';
const BOT_ID = '1535479327234461756';



let isBotActing = false;
const pendingRequests = new Map();



module.exports = {
    get isBotActing() { return isBotActing; },
    set isBotActing(val) { isBotActing = val; },
    pendingRequests,
    linkUsage: new Map(),



    async handleLinkDetection(message, config) {
        if (message.author.bot || !message.guild) return;



        const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;
        const allLinksRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;



        const isInvite = inviteRegex.test(message.content);
        const isOtherLink = allLinksRegex.test(message.content) && !isInvite;



        const shouldDelete = (isInvite && config.antiLink) || (isOtherLink && config.antiLinkAll);
        
        if (!shouldDelete) return;
        if (this.isWhitelisted(message.member, 'antiLink', config)) return;



        try {
            await message.delete();
            console.log(`[LINK-REMOVER] Deleted link from ${message.author.tag}`);
        } catch (e) {
            console.error("Failed to delete link message:", e?.message);
        }



        // Spam Protection
        const now = Date.now();
        const userData = this.linkUsage.get(message.author.id) || { count: 0, lastLinkTime: now };
        
        // Reset if more than 60 seconds passed since last link
        if (now - userData.lastLinkTime > 60000) {
            userData.count = 1;
        } else {
            userData.count++;
        }
        userData.lastLinkTime = now;
        this.linkUsage.set(message.author.id, userData);



        if (userData.count >= 3) {
            // Spam detected - Timeout for 10 minutes
            try {
                await message.member.timeout(10 * 60 * 1000, 'Link spamming');
                console.log(`[LINK-REMOVER] Timed out ${message.author.tag} for link spamming.`);
                this.linkUsage.delete(message.author.id); // Reset after timeout
            } catch (e) {
                console.error("Failed to timeout user:", e?.message);
            }
        }
    },



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
        if (!member.roles || !member.roles.cache) return false;



        // Bypass All check
        if (config?.whitelist?.bypassAll?.length && member.roles.cache.some(role => config.whitelist.bypassAll.includes(role.id))) return true;



        if (!feature || !config?.whitelist?.[feature]?.length) return false;
        return member.roles.cache.some(role => config.whitelist[feature].includes(role.id));
    },



    async clearMemberRoles(member, reason) {
        if (!member || !member.guild || member.id === member.guild.ownerId) return;
        try {
            if (!member.guild.members.me) return;
            if (member.guild.members.me.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
                console.log(`[PROTECTION] Cannot clear roles of ${member.user.tag}: Bot role too low.`);
                return;
            }
            await member.roles.set([], reason);
        } catch (e) {
            console.error(`[PROTECTION] Failed to clear roles for ${member.user?.tag || member.id}:`, e?.message || e);
        }
    },



    async sendApprovalRequest(guild, title, description, onApprove, onCancel = null, executor = null) {
        const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const approveId = `approve_${requestId}`;
        const cancelId = `cancel_${requestId}`;



        const embed = new EmbedBuilder()
            .setColor('#7700ff')
            .setTitle(title)
            .setDescription(`${description}\n\n⚠️ **APPROVAL REQUIRED**`)
            .setTimestamp();



        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(approveId).setLabel('<a:verify:1539238356003848344> Approve').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(cancelId).setLabel('<a:wrong1:1539239292394803311> Cancel / Restore').setStyle(ButtonStyle.Danger)
        );



        try {
            const owner = await guild.fetchOwner();
            const sentMsg = await owner.send({ embeds: [embed], components: [buttons] });



            pendingRequests.set(requestId, {
                active: true,
                message: sentMsg,
                guildId: guild.id,
                guildOwnerId: guild.ownerId, // ✅ DAGDAG KO NA ITO!
                executor,
                onApprove,
                onCancel,
                approveId,
                cancelId
            });
        } catch (err) {
            console.error('<a:wrong1:1539239292394803311> Failed to send approval DM to owner:', err.message);
        }
    },



    // --- GIVE ADMIN ROLE ---
    async antiGiveAdminRole(member, role, executor, config, client) {
        console.log('antiGiveAdminRole RUNNING!');
        if (isBotActing) return;
        if (!config?.protectionEnabled?.antiGiveAdmin) return;



        // Check if the role has Administrator permission
        if (!role.permissions.has(PermissionsBitField.Flags.Administrator)) return;



        // ✅ Check BOTH whitelist keys — bypassGiveAdmin OR protection
        if (this.isWhitelisted(executor, 'bypassGiveAdmin', config) || this.isWhitelisted(executor, 'protection', config)) {
            console.log(`[PROTECTION] ${executor.user.tag} is whitelisted — skipping protection.`);
            return;
        }



        console.log(`[PROTECTION] Administrator role given by ${executor.user.tag}. Removing role & clearing executor roles.`);



        // ==========================================
        // ✅ AUTO-APPROVE — TANGGALIN AGAD ANG ROLE SA BINIGYAN
        // ==========================================
        try {
            isBotActing = true;
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role, 'Unauthorized Administrator role assignment - Auto Remove');
                console.log(`[PROTECTION] <a:verify:1539238356003848344> Role ${role.name} force-removed from ${member.user.tag}`);
            }
        } catch (e) {
            console.log('[PROTECTION] ⚠️ Failed to remove admin role:', e?.message);
        } finally {
            isBotActing = false;
        }



        // ✅ Clear roles of the executor
        await this.clearMemberRoles(executor, "Unauthorized attempt to grant Administrator privileges");



        // ==========================================
        // ✅ PADALHAN KA NG DM — WALANG BUTTON
        // ==========================================
        try {
            const owner = await client.users.fetch(member.guild.ownerId);
            if (owner) {
                const alertEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('🚨 AUTO-REMOVED: Admin Role Given')
                    .setDescription(`**Nagbigay:** ${executor.user.tag} (${executor.id})\n**Binigyan:** ${member.user.tag} (${member.id})\n**Role:** ${role.name}\n\n<a:verify:1539238356003848344> **AUTO-REMOVED — Role taken back! Executor roles cleared!**`)
                    .setTimestamp();
                await owner.send({ embeds: [alertEmbed] });
            }
        } catch (dmErr) {
            console.log('[PROTECTION] ⚠️ Could not DM Owner:', dmErr.message);
        }



        // ✅ Send notification to log channel
        const logChannel = member.guild.channels.cache.get(config?.logsChannel);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor('#7700ff')
                .setTitle('🚨 UNAUTHORIZED ADMIN ASSIGNMENT — AUTO REMOVED')
                .setDescription(`**Executor:** ${executor.user.tag} (${executor.id})\n**Target:** ${member.user.tag} (${member.id})\n**Role Given:** ${role.name}\n\n<a:verify:1539238356003848344> **Action:** Role REMOVED from target. ALL roles CLEARED from executor.`)
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    },



    // --- CHANNEL PROTECTIONS ---
    async handleChannelDelete(channel, executor, config) {
        if (isBotActing) return;
        if (executor.id === channel.client.user.id) return;



        // Exception: VC Manager
        if (config?.vcSetup && (channel.id === config.vcSetup.triggerId || channel.parentId === config.vcSetup.categoryId)) return;
        if (config?.protectionEnabled?.antiDeleteChannel === false) return;



        if (this.isWhitelisted(executor, 'antiDeleteChannel', config) || this.isWhitelisted(executor, 'protection', config)) return;



        console.log(`[PROTECTION] Channel deleted by ${executor.user.tag}. Clearing roles.`);
        await this.clearMemberRoles(executor, "Unauthorized channel deletion");



        const channelData = { 
            name: channel.name, 
            type: channel.type, 
            parent: channel.parentId, 
            position: channel.position,
            permissionOverwrites: channel.permissionOverwrites?.cache?.map(v => ({
                id: v.id,
                allow: v.allow.toArray(),
                deny: v.deny.toArray(),
                type: v.type
            })) || []
        };



        await this.sendApprovalRequest(
            channel.guild,
            `⚠️ CHANNEL DELETED: ${channel.name}`,
            `**Executor:** ${executor.user.tag} (${executor.id})\n\nRoles cleared from executor.\n\n✅ Restore → Recreate this channel\n❌ Cancel → Keep deleted`,
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
            },
            null,
            executor
        );
    },



    async handleChannelCreate(channel, executor, config) {
        if (isBotActing) return;
        if (executor.id === channel.client.user.id) return;



        // Exception: VC Manager
        if (config?.vcSetup && channel.parentId === config.vcSetup.categoryId) return;
        if (config?.protectionEnabled?.antiCreateChannel === false) return;



        if (this.isWhitelisted(executor, 'antiCreateChannel', config) || this.isWhitelisted(executor, 'protection', config)) return;



        console.log(`[PROTECTION] Channel created by ${executor.user.tag}. Deleting channel & clearing roles.`);
        await this.clearMemberRoles(executor, "Unauthorized channel creation");



        await this.sendApprovalRequest(
            channel.guild,
            `⚠️ CHANNEL CREATED: ${channel.name}`,
            `**Executor:** ${executor.user.tag} (${executor.id})\n\nRoles cleared from executor.\n\n✅ Keep → Keep this channel\n❌ Delete → Remove it`,
            null,
            async () => {
                try {
                    isBotActing = true;
                    await channel.delete("Unauthorized channel creation — Rejected by Owner");
                } finally {
                    isBotActing = false;
                }
            },
            executor
        );
    },



    // --- ANTI KICK ---
    async antiKick(member, executor, config, client) {
        if (isBotActing) return;
        if (!config?.protectionEnabled?.antiKick) return;
        if (this.isWhitelisted(executor, 'kick', config) || this.isWhitelisted(executor, 'protection', config)) return;
        if (executor.id === BOT_OWNER_ID) return;
        if (executor.id === member.guild.ownerId) return;
        if (executor.id === client.user.id) return;



        // Hierarchy check
        if (member.guild.members.me.roles.highest.comparePositionTo(executor.roles.highest) <= 0) {
            console.log(`[ANTI-KICK] Cannot punish ${executor.user.tag}: Bot role too low.`);
            return;
        }



        console.log(`[ANTI-KICK] Unauthorized kick by ${executor.user.tag}. Clearing roles.`);



        isBotActing = true;
        try {
            await this.clearMemberRoles(executor, "Unauthorized member kick");



            const logChannel = member.guild.channels.cache.get(config?.logsChannel);
            if (logChannel) {
                logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#7700ff')
                            .setTitle("⚠️ UNAUTHORIZED KICK DETECTED")
                            .setDescription(`**Executor:** ${executor.user.tag}\n**Target:** ${member.user.tag}\n\n**Action:** ALL roles removed from executor.`)
                            .setTimestamp()
                    ]
                }).catch(() => {});
            }
        } catch (e) {
            console.error("Failed to clear roles of unauthorized kicker:", e?.message);
        }
        isBotActing = false;
    },



    // --- ANTI LINK (DISCORD INVITES ONLY) ---
    async antiLink(message, config) {
        if (message.author.bot) return;
        if (!config?.antiLink) return;
        if (this.isWhitelisted(message.member, 'antiLink', config)) return;



        const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;
        if (inviteRegex.test(message.content)) {
            try {
                await message.delete();
                console.log(`[ANTI-LINK] Deleted Discord invite from ${message.author.tag}`);
            } catch (e) {
                console.error("Failed to delete link message:", e?.message);
            }
        }
    },



    // --- ANTI LINK (ALL EXCEPT DISCORD) ---
    async antiLinkAll(message, config) {
        if (message.author.bot) return;
        if (!config?.antiLinkAll) return;
        if (this.isWhitelisted(message.member, 'antiLinkAll', config)) return;



        const allLinksRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
        const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;
        
        if (allLinksRegex.test(message.content) && !inviteRegex.test(message.content)) {
            try {
                await message.delete();
                console.log(`[ANTI-LINK-ALL] Deleted link from ${message.author.tag}`);
            } catch (e) {
                console.error("Failed to delete link:", e?.message);
            }
        }
    },



    // --- ANTI DISCORD LINK ---
    async antiDiscordLink(message, config) {
        if (message.author.bot) return;
        if (!config?.antiDiscordLink) return;
        if (this.isWhitelisted(message.member, 'antiDiscordLink', config)) return;



        const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;
        if (inviteRegex.test(message.content)) {
            try {
                await message.delete();
                console.log(`[ANTI-DISCORD-LINK] Deleted invite from ${message.author.tag}`);
            } catch (e) {
                console.error("Failed to delete link:", e?.message);
            }
        }
    },



    async handleRoleDelete(role, executor, config) {
        if (isBotActing) return;
        if (executor.id === role.client.user.id) return;
        if (config?.protectionEnabled?.antiDeleteRole === false) return;



        if (this.isWhitelisted(executor, 'antiDeleteRole', config) || this.isWhitelisted(executor, 'protection', config)) return;



        console.log(`[PROTECTION] Role deleted by ${executor.user.tag}. Clearing roles.`);
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
            `⚠️ ROLE DELETED: ${role.name}`,
            `**Executor:** ${executor.user.tag} (${executor.id})\n\nRoles cleared from executor.\n\n<a:verify:1539238356003848344> Restore → Recreate this role\n<a:wrong1:1539239292394803311> Cancel → Keep deleted`,
            async () => {
                try {
                    isBotActing = true;
                    await role.guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        hoist: roleData.hoist,
                        permissions: roleData.permissions,
                        mentionable: roleData.mentionable,
                        position: roleData.position,
                        reason: "Restored by Owner approval"
                    });
                } finally {
                    isBotActing = false;
                }
            },
            null,
            executor
        );
    },



    async handleRoleCreate(role, executor, config) {
        if (isBotActing) return;
        if (executor.id === role.client.user.id) return;
        if (config?.protectionEnabled?.antiCreateRole === false) return;



        if (this.isWhitelisted(executor, 'antiCreateRole', config) || this.isWhitelisted(executor, 'protection', config)) return;



        console.log(`[PROTECTION] Role created by ${executor.user.tag}. Deleting role & clearing roles.`);



        try {
            isBotActing = true;
            await role.delete("Unauthorized role creation");
        } catch (e) { 
            console.error("Failed to delete unauthorized role:", e?.message); 
        } finally { 
            isBotActing = false; 
        }



        await this.clearMemberRoles(executor, "Unauthorized role creation");



        await this.sendApprovalRequest(
            role.guild,
            `⚠️ ROLE CREATED & DELETED: ${role.name}`,
            `**Executor:** ${executor.user.tag} (${executor.id})\n\nRole deleted & executor roles cleared.\n\n<a:verify:1539238356003848344> Restore → Put it back\n<a:wrong1:1539239292394803311> Cancel → Keep deleted`,
            async () => {
                try {
                    isBotActing = true;
                    await role.guild.roles.create({
                        name: role.name,
                        color: role.color,
                        hoist: role.hoist,
                        permissions: role.permissions.bitfield,
                        mentionable: role.mentionable,
                        position: role.position,
                        reason: "Restored by Owner approval"
                    });
                } finally {
                    isBotActing = false;
                }
            },
            null,
            executor
        );
    },



    // --- REMOVE ADMIN ROLE ---
    async antiRemoveAdminRole(member, role, executor, config, client) {
        if (isBotActing) return;
        if (!config?.protectionEnabled?.antiRemoveAdmin) return;
        if (this.isWhitelisted(executor, 'protection', config)) return;



        if (!role.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !role.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
            !role.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;



        console.log(`[PROTECTION] Admin role removed by ${executor.user.tag} — KEEPING REMOVED & CLEARING`);



        // ==========================================
        // ✅ KEEP REMOVED — HUWAG IBALIK! TANGGALIN NA TALAGA!
        // ==========================================
        try {
            isBotActing = true;
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role, 'Protected Admin role — stays removed');
                console.log(`[PROTECTION] <a:verify:1539238356003848344> KEPT REMOVED — ${role.name} STAYS REMOVED from ${member.user.tag}`);
            } else {
                console.log(`[PROTECTION] <a:verify:1539238356003848344> Already removed — ${role.name} not found on ${member.user.tag}`);
            }
        } catch (e) { 
            console.log('[PROTECTION] ⚠️ Error:', e?.message); 
        } finally { 
            isBotActing = false; 
        }



        // ✅ Clear roles of the one who tried to remove
        await this.clearMemberRoles(executor, "Unauthorized attempt to remove protected Admin role");



        // ==========================================
        // ✅ PADALHAN KA NG DM — WALANG BUTTON
        // ==========================================
        try {
            const owner = await client.users.fetch(member.guild.ownerId);
            if (owner) {
                const alertEmbed = new EmbedBuilder()
                    .setColor('#7700ff')
                    .setTitle('⚠️ PROTECTED: Admin Role Removal Attempt')
                    .setDescription(`**Author:** ${executor.user.tag} (${executor.id})\n**Target:** ${member.user.tag} (${member.id})\n**Role:** ${role.name}\n\n<a:verify:1539238356003848344> **PROTECTED — Role STAYS REMOVED! Executor roles CLEARED!**`)
                    .setTimestamp();
                await owner.send({ embeds: [alertEmbed] });
            }
        } catch (dmErr) {
            console.log('[PROTECTION] ⚠️ Could not DM Owner:', dmErr.message);
        }
    }
};