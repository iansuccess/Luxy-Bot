const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;

module.exports = {
    async removeDiscordInviteLinks(message, config) {
        if (message.author.bot) return false;
        if (!config?.antiDiscordLink) return false;
        
        // Assuming isWhitelisted is needed or passed
        // For now, I will assume it's passed or handled differently,
        // Actually, let's just make it a function that takes the message and check if it's an invite link.
        
        if (inviteRegex.test(message.content)) {
            try {
                await message.delete();
                console.log(`[ANTI-DISCORD-LINK] Deleted Discord invite link from ${message.author.tag}`);
                return true;
            } catch (e) {
                console.error("Failed to delete link message:", e?.message);
                return false;
            }
        }
        return false;
    }
};
