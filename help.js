const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Display bot features and usage information',
    async execute(message) {
        const { member, guild } = message;

        // Check if Server Owner or Admin
        const isServerOwner = member.id === guild.ownerId;
        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isServerOwner && !isAdmin) {
            return message.reply('⤷ Access Denied. Only Server Admins and Server Owners may use this command.');
        }

        const helpEmbed = new EmbedBuilder()
            .setColor('#7700ff')
            .setTitle('Bot Features & Help')
            .addFields(
                {
                    name: 'Detection Features',
                    value: 
`⤷ **Spammer Detection**
Automatically detects spammers and applies a 10-minute timeout as punishment.

⤷ **Anti-Link**
When enabled (TRUE), any user not on the whitelist will be blocked from sending Discord links.

⤷ **Anti-Nuke**
Protects the server from unauthorized actions.`
                },
                {
                    name: 'Anti-Nuke Protections',
                    value: 
`⤷ **Add Bot**
If an Admin adds a bot without authorization, their role will be revoked/cleared.

⤷ **Kick Member**
Non-whitelisted Admin who kicks a member → role revoked/cleared.

⤷ **Delete Channel**
Non-whitelisted Admin who deletes a channel → role revoked/cleared.

⤷ **Delete Role**
Non-whitelisted Admin who deletes a role → role revoked/cleared.`
                },
                {
                    name: 'Anti-Nuke Protections (Continued)',
                    value: 
`⤷ **Create Role**
Non-whitelisted Admin who creates a role → role revoked/cleared.

⤷ **Unauthorized Admin Permission Grant**
If an Admin grants Administrator to someone without authorization → their role will be revoked/cleared.

All detection measures are implemented to protect the server and maintain its security.`
                },
                {
                    name: 'Usage Note',
                    value: 
`For Admins to use these commands, they must first be whitelisted by the Server Owner.

Use the command:
/whitelist role
to whitelist authorized users accordingly.`
                }
            )
            .setTimestamp();

        return message.reply({ embeds: [helpEmbed] });
    }
};