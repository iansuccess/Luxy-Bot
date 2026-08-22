const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const BOT_OWNER_ID = '1531611262159687820';

module.exports = {
    name: 'role',
    description: 'Give or remove a role — restricted command',

    async execute(message) {
        // ✅ CHECK PERMISSIONS — Who can use this?
        const isServerOwner = message.author.id === message.guild.ownerId;
        const isBotOwner = message.author.id === BOT_OWNER_ID;
        const hasAdminPerm = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        // ❌ If NOT authorized — do NOTHING, no output at all
        if (!isServerOwner && !isBotOwner && !hasAdminPerm) {
            return;
        }

        // ✅ Get mentioned user and role
        const targetMember = message.mentions.members.first();
        const roleToGive = message.mentions.roles.first();

        // ❌ If missing user or role — silently return
        if (!targetMember || !roleToGive) {
            return;
        }

        // ❌ RESTRICTED: Cannot give/remove role that has ADMINISTRATOR permission
        if (roleToGive.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return;
        }

        // ❌ Cannot manage role HIGHER THAN or EQUAL TO your own highest role
        if (message.member.roles.highest.comparePositionTo(roleToGive) <= 0) {
            return;
        }

        // ❌ Cannot manage role HIGHER THAN bot's highest role
        if (message.guild.members.me.roles.highest.comparePositionTo(roleToGive) <= 0) {
            return;
        }

        // ✅ Check if user ALREADY HAS the role
        const hasRole = targetMember.roles.cache.has(roleToGive.id);

        // ✅ Format time — HH:MM AM/PM
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const hour12 = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const timeString = `${hour12}:${minutes} ${ampm}`;

        try {
            if (hasRole) {
                // 🔄 REMOVE ROLE — kung meron na
                await targetMember.roles.remove(roleToGive);

                const removeEmbed = new EmbedBuilder()
                    .setColor('#7700ff')
                    .setDescription(
                        `<a:verify:1539238356003848344> Role Removed\n\n` +
                        `⤷ Role Name: ${roleToGive}\n` +
                        `⤷ Executor By: ${message.author}\n` +
                        `⤷ Time: ${timeString}`
                    );

                await message.channel.send({ embeds: [removeEmbed] });

            } else {
                // ✅ ADD ROLE — kung wala pa
                await targetMember.roles.add(roleToGive);

                const successEmbed = new EmbedBuilder()
                    .setColor('#7700ff')
                    .setDescription(
                        `<a:verify:1539238356003848344> Role Granted\n\n` +
                        `⤷ Role Name: ${roleToGive}\n` +
                        `⤷ Given By: ${message.author}\n` +
                        `⤷ Time: ${timeString}`
                    );

                await message.channel.send({ embeds: [successEmbed] });
            }

        } catch (err) {
            console.error('[ROLE COMMAND] Error:', err.message);
            return;
        }
    }
};