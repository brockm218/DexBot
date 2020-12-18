require('dotenv').config();
const Discord = require('discord.js');
const { ApiClient } = require('twitch');
const { RefreshableAuthProvider, StaticAuthProvider } = require('twitch-auth');
const { ChatClient } = require('twitch-chat-client');
const { PubSubClient } = require('twitch-pubsub-client');
const { promises: fs } = require('fs');

async function main() {
    const tokenData = JSON.parse(await fs.readFile('./tokens.json'));
    const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET;
    const twitchClientId = process.env.TWITCH_CLIENT_ID;
    const authProvider = new RefreshableAuthProvider(
        new StaticAuthProvider(twitchClientId, tokenData.accessToken), {
            clientSecret: twitchClientSecret,
            refreshToken: tokenData.refreshToken,
            expiry: tokenData.expiryTimestamp === null ? null : new Date(tokenData.expiryTimestamp),
            onRefresh: async ({
                accessToken,
                refreshToken,
                expiryDate
            }) => {
                const newTokenData = {
                    accessToken,
                    refreshToken,
                    expiryTimestamp: expiryDate === null ? null : expiryDate.getTime()
                };
                await fs.writeFile('./tokens.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
            }
        }
    );

    const chatChannels = ['twitchChannel1', 'twitchChannel2'];

    const chatClient = new ChatClient(authProvider, {
        channels: chatChannels
    });
    await chatClient.connect()
        .then(() => {
            console.log('Twitch Client Connected.');
        })
        .catch(console.error);

    const dClient = new Discord.Client();

    dClient.on('ready', () => {
        console.log('Discord Client Connected.');
    });
    await dClient.login(process.env.DISCORD_BOT_TOKEN);

    const apiClient = new ApiClient({
        authProvider
    });
    const pubSubClient = new PubSubClient();

    const UserId = await pubSubClient.registerUserListener(apiClient);
    const broadcasterId = apiClient.helix.users.getUserByName(chatChannels[0]);
    const logChannelId = '123456789012345678'; // Copy this from Developer Mode; Right-click the text channel > Copy ID
    const logChannel = await dClient.channels.fetch(logChannelId)
        .catch(console.error);

    const modListener = await pubSubClient.onModAction(UserId, broadcasterId, message => {
        if (message.action == 'timeout') {
            const [target, duration, reason] = message.args;
            const moderator = message.userName;
            console.log(`${target} was timed out for ${duration} seconds by ${message.userName} (Reason: ${reason})`);

            if (reason != null && reason !== '') {
                const embed = new Discord.MessageEmbed()
                    .setTitle('New Chat Event')
                    .setColor('0xff9600')
                    .setTimestamp()
                    .addField('Timeout', `${target} was timed out for ${duration} seconds by ${moderator}.`)
                    .addField('Reason', `${reason}`);

                logChannel.send(embed);
            } else {
                const embed = new Discord.MessageEmbed()
                    .setTitle('New Chat Event')
                    .setColor('0xff9600')
                    .setTimestamp()
                    .addField('Timeout', `${target} was timed out for ${duration} seconds by ${moderator}.`)
                    .addField('Reason', 'Reason not provided.');

                logChannel.send(embed);
            }
        }

        if (message.action == 'ban') {
            const [target, reason] = message.args;
            const moderator = message.userName;
            console.log(`${target} was banned by ${moderator} (Reason: ${reason})`);

            if (reason != null && reason !== '') {
                const embed = new Discord.MessageEmbed()
                    .setTitle('New Chat Event')
                    .setColor('0xff0000')
                    .setTimestamp()
                    .addField('Ban', `${target} was banned by ${moderator}.`)
                    .addField('Reason', `${reason}`);

                logChannel.send(embed);
            } else {
                const embed = new Discord.MessageEmbed()
                    .setTitle('New Chat Event')
                    .setColor('0xff0000')
                    .setTimestamp()
                    .addField('Ban', `${target} was banned by ${moderator}.`)
                    .addField('Reason', `Reason not provided.`);

                logChannel.send(embed);
            }
        }

        if (message.action == 'unban') {
            const target = message.args[0];
            const moderator = message.userName;
            console.log(`${target} was un-banned by ${moderator}.`);

            const embed = new Discord.MessageEmbed()
                .setTitle('**Spoodah** - New Chat Event')
                .setColor('0x00ff7f')
                .setTimestamp()
                .addField('Unban', `${target} was un-banned by ${moderator}.`);

            logChannel.send(embed);
        }

        if (message.action == 'untimeout') {
            const target = message.args[0];
            const moderator = message.userName;
            console.log(`${target} was un-banned by ${moderator}.`);

            const embed = new Discord.MessageEmbed()
                .setTitle('**Spoodah** - New Chat Event')
                .setColor('0x00ff7f')
                .setTimestamp()
                .addField('Unban', `${target} was un-banned by ${moderator}.`);

            logChannel.send(embed);
        }

        if (message.action == 'vip') {
            const target = message.args[0];
            const moderator = message.userName;
            console.log(`${target} was granted VIP by the broadcaster.`);

            const embed = new Discord.MessageEmbed()
                .setTitle('**Spoodah** - New Chat Event')
                .setColor('0xe281aa')
                .setTimestamp()
                .addField('VIP', `${target} was granted VIP by the broadcaster.`);

            logChannel.send(embed);
        }
    });

    chatClient.onMessage((channel, user, message, msg) => {
        if (msg.isCheer) {
            var bitsMsg = `PogChamp BITS DONATION!!! PogChamp Thank you so much @${user} for the ${msg.bits} bitties ! You're too kind! spoodLove`;
            console.log(channel, "-", bitsMsg);
            chatClient.action(channel, bitsMsg);
        }
        if (message.toLowerCase() === `!myd`) {
            if (msg.userInfo.isBroadcaster) {
                var dickMsg = `spoodWYA CRITICAL ERROR: User's dick is too gigantic and broke the scale. System reboot in progress... spoodDab`;
                console.log(channel, "-", dickMsg);
                chatClient.action(channel, dickMsg);
                return;
            } else {
                var dicksize = Math.floor((Math.random() * 10) + 1);
            }

            var dickMsg = `PogChamp @${msg.userInfo.displayName} has a dick size of ` + dicksize + ` inches. TwitchUnity`;
            console.log(channel, "-", dickMsg);
            chatClient.action(channel, dickMsg);
        }
    });

    const giftCounts = new Map();
    chatClient.onCommunitySub((channel, user, subInfo) => {
        const previousGiftCount = giftCounts.get(user) ?? 0;
        giftCounts.set(user, previousGiftCount + subInfo.count);
        var massGiftMsg = `spoodGLB GIFT SUB HYPE!! spoodGLB Thank you @${user} for gifting ${subInfo.count} subs to the squadron! spoodLove`;
        console.log(channel, "-", massGiftMsg);
        chatClient.action(channel, massGiftMsg);
    });

    chatClient.onSubGift((channel, recipient, subInfo) => {
        const user = subInfo.gifter;
        const previousGiftCount = giftCounts.get(user) ?? 0;
        if (previousGiftCount > 0) {
            giftCounts.set(user, previousGiftCount - 1);
        } else {
            var singleGiftMsg = `spoodGLB GIFT SUB HYPE!! spoodGLB Thank you ${user} for gifting a sub to ${recipient} spoodLove!`;
            console.log(channel, "-", singleGiftMsg);
            chatClient.action(channel, singleGiftMsg);
        }
    });

    chatClient.onSub((channel, user) => {
        var subMsg = `spoodHype NEW SUB!!! spoodHype @${user} just subscribed! Welcome to the party <3 spoodGLB`;
        console.log(channel, "-", subMsg);
        chatClient.action(channel, subMsg);
    });

    chatClient.onResub((channel, user, subInfo) => {
        var resubMsg = `spoodHype RESUB!!! spoodHype Welcome back @${user} for ${subInfo.months} months spoodGLB`;
        console.log(channel, "-", resubMsg);
        chatClient.action(channel, resubMsg);
    });
}

main();