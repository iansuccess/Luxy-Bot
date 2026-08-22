const { EmbedBuilder } = require('discord.js');


// Map structure: guildId -> userId -> data
const serverStats = new Map();


function getStats(guildId, userId) {
    if (!serverStats.has(guildId)) serverStats.set(guildId, new Map());
    const guildMap = serverStats.get(guildId);
    if (!guildMap.has(userId)) guildMap.set(userId, { messages: 0, voiceMinutes: 0, lastVoiceJoin: null });
    return guildMap.get(userId);
}


module.exports = {
    trackMessage(message) {
        if (!message.author.bot && message.guild) {
            const stats = getStats(message.guild.id, message.author.id);
            stats.messages += 1;
        }
    },


    trackVoiceState(oldState, newState) {
        const userId = newState.id;
        const guildId = newState.guild.id;
        if (!userId) return;


        const stats = getStats(guildId, userId);


        // User joined a voice channel
        if (newState.channelId && !oldState.channelId) {
            stats.lastVoiceJoin = Date.now();
        } 
        // User left a voice channel
        else if (!newState.channelId && oldState.channelId && stats.lastVoiceJoin) {
            const minutes = Math.ceil((Date.now() - stats.lastVoiceJoin) / 60000);
            stats.voiceMinutes += minutes;
            stats.lastVoiceJoin = null;
        }
    },


    async executeStats(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const stats = getStats(interaction.guild.id, target.id);


        const embed = new EmbedBuilder()
            .setColor('#7700ff')
            .setTitle(`<a:stats:1539239048302960690> Stats: ${target.username}`)
            .setDescription(`⤷ Messages Sent: **${stats.messages}**\n⤷ Voice Minutes: **${stats.voiceMinutes} min**`)
            .setTimestamp();


        return interaction.reply({ embeds: [embed] });
    }
};