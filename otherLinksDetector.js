const linkRegexes = {
    gif: /(tenor\.com\/view\/|giphy\.com\/gifs\/|imgur\.com\/[a-zA-Z0-9]+\.gif)/i,
    spotify: /(open\.spotify\.com\/track\/|open\.spotify\.com\/album\/|open\.spotify\.com\/playlist\/)/i,
    youtube: /(youtube\.com\/watch\?v=|youtu\.be\/)/i,
    facebook: /(facebook\.com\/|fb\.me\/)/i,
    instagram: /(instagram\.com\/p\/|instagram\.com\/reel\/)/i
};

module.exports = {
    detectOtherLinks(content) {
        const detectedLinks = [];
        for (const [type, regex] of Object.entries(linkRegexes)) {
            if (regex.test(content)) {
                detectedLinks.push(type);
            }
        }
        return detectedLinks;
    }
};
