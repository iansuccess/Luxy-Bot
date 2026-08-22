const { ChannelType, PermissionsBitField } = require('discord.js');


module.exports = {
    async execute(interaction, BOT_OWNER_ID, isProcessing, purpleEmbed, purpleEmbed2) {
        if (interaction.user.id !== BOT_OWNER_ID) return interaction.reply({embeds:[purpleEmbed('<a:wrong1:1539239292394803311> No Permission','Only Bot Owner can use this!')],flags:64});
        if (isProcessing) return interaction.reply({embeds:[purpleEmbed('⏳ Please wait','Still processing previous request...')],flags:64});


        const name = interaction.options.getString('name');
        const amount = interaction.options.getInteger('amount');
        const type = interaction.options.getString('type');


        isProcessing = true;
        await interaction.deferReply();


        try {
            let created = 0, failed = 0;
            const channelType = type === 'text' ? ChannelType.GuildText : type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildCategory;


            for (let i=1; i<=amount; i++) {
                try {
                    await interaction.guild.channels.create({
                        name: `${name} ${i}`,
                        type: channelType,
                        reason: `Created by ${interaction.user.tag}`
                    });
                    created++;
                    if (i % 10 === 0) await new Promise(r=>setTimeout(r,600));
                } catch { failed++; }
            }


            return interaction.editReply({embeds:[purpleEmbed('<a:verify:1539238356003848344> Channels Created', 
                `Success: **${created}**\nFailed: **${failed}**\nType: **${type.toUpperCase()}**`)]});
        } catch (err) {
            return interaction.editReply({embeds:[purpleEmbed('<a:wrong1:1539239292394803311> Error','Failed to create channels!')]});
        } finally { isProcessing = false; }
    }
};