const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const ms = require('ms');
const detection = require('./detection.js');
const fs = require('fs');
const path = require('path');


const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'jail.json');


if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);


let jailedUsers = new Map();
if (fs.existsSync(dataFile)) {
    try {
        jailedUsers = new Map(Object.entries(JSON.parse(fs.readFileSync(dataFile, 'utf-8'))));
    } catch (e) {
        console.error('Error loading jail data', e);
    }
}


function saveJailData() {
    try {
        fs.writeFileSync(dataFile, JSON.stringify(Object.fromEntries(jailedUsers), null, 2));
    } catch (e) {
        console.error('Error saving jail data', e);
    }
}


module.exports = {
    async executeJail(interaction, config) {
        const target = interaction.options.getMember('target');
        const jailChannel = interaction.options.getChannel('channel');
        const durationStr = interaction.options.getString('duration');


        if (!target) return interaction.reply({ content: `<a:wrong1:1539239292394803311> Target not found.`, ephemeral: true });


        // Bypass All check
        if (detection.isWhitelisted(target, 'bypassAll', config)) {
            return interaction.reply({ content: `<a:wrong1:1539239292394803311> This user cannot be jailed.`, ephemeral: true });
        }


        const isOwner = interaction.guild.ownerId === interaction.user.id;
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);


        if (!isOwner && !isAdmin) {
            return interaction.reply({ content: `<a:wrong1:1539239292394803311> Access Denied.`, ephemeral: true });
        }


        let duration = 0;
        if (durationStr) {
            try {
                duration = ms(durationStr);
            } catch (e) {
                return interaction.reply({ content: `<a:wrong1:1539239292394803311> Invalid duration format.`, ephemeral: true });
            }
        }


        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        if (!isOwner && duration > oneMonth) {
            return interaction.reply({ content: `<a:wrong1:1539239292394803311> Maximum jail duration for Administrators is 1 month.`, ephemeral: true });
        }


        // Jail role setup
        let jailRole = interaction.guild.roles.cache.find(r => r.name === 'Jailed');
        if (!jailRole) {
            jailRole = await interaction.guild.roles.create({
                name: 'Jailed',
                color: '#7700ff',
                permissions: [],
                reason: '⤷ Auto-created for jail system'
            });
            // Update channel overwrites for the jail role if needed
        }


        // Store original roles
        const originalRoles = target.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.id);
        jailedUsers.set(target.id, originalRoles);
        saveJailData();


        try {
            await target.roles.set([jailRole.id]);
            
            const embed = new EmbedBuilder()
                .setColor('#7700ff')
                .setTitle(`<a:DurinJail:1539242919842676907> User Jailed`)
                .setDescription(`⤷ **Target:** ${target.user.tag}\n⤷ **Duration:** ${durationStr || 'Permanent'}`)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });


            if (duration > 0) {
                setTimeout(async () => {
                    await this.releaseUser(target, interaction.guild);
                }, duration);
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `<a:wrong1:1539239292394803311> Failed to jail user.`, ephemeral: true });
        }
    },


    async executeUnjail(interaction) {
        const target = interaction.options.getMember('target');
        if (!target) return interaction.reply({ content: `<a:wrong1:1539239292394803311> Target not found.`, ephemeral: true });


        await this.releaseUser(target, interaction.guild);
        
        const embed = new EmbedBuilder()
            .setColor('#7700ff')
            .setTitle(`<a:DurinJail:1539242919842676907> ⤷ User Unjailed`)
            .setDescription(`⤷ **Target:** ${target.user.tag}`)
            .setTimestamp();


        await interaction.reply({ embeds: [embed] });
    },


    async releaseUser(member, guild) {
    // Siguraduhing sariwa ang impormasyon
    const freshMember = await guild.members.fetch(member.id, { force: true }).catch(() => member);
    
    if (jailedUsers.has(freshMember.id)) {
        // Kunin ang mga dating role IDs
        const roleIds = jailedUsers.get(freshMember.id);
        
        // ✅ SIGURADUHIN NA TALAGANG UMIKTO LAHAT NG EXISTING ROLES LANG
        const validRoles = roleIds.filter(id => guild.roles.cache.has(id));

        try {
            // ✅ IBALIK LAHAT NG TOTOONG ROLES
            await freshMember.roles.set(validRoles);
        } catch (err) {
            console.error('Error restoring roles:', err);
            // ✅ KUNG MAY ERROR — TANGGALIN MUNA ANG JAIL ROLE BILANG PANGALANG PARAAN
            const jailRole = guild.roles.cache.find(r => r.name === 'Jailed');
            if (jailRole) await freshMember.roles.remove(jailRole);
        }

        jailedUsers.delete(freshMember.id);
        saveJailData();
    } else {
        // Kung wala sa listahan — tanggalin lang ang Jail role
        const jailRole = guild.roles.cache.find(r => r.name === 'Jailed');
        if (jailRole) await freshMember.roles.remove(jailRole).catch(console.error);
    }
}
};
