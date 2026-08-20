const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const readline = require('readline');
const { execFile } = require('child_process');
const fs = require('fs');

const OWNER_NAME = 'Jamil Ahmed';
const OWNER_NUMBER = '8801600513579';

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];

    if (!msg || !msg.message) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      '';

    console.log('TEXT:', text);
    
    const rawCommand = text.trim().split(/\s+/)[0].toLowerCase();

    const reactions = {
      '.song': '🎵',
      '.menu': '📋',
      '.ping': '🏓',
      '.uptime': '⏱️',
      '.owner': '👑',
      '.tagall': '👥',
      '.antilink': '🛡️',
      '.warn': '⚠️',
      '.warnings': '📊',
      '.resetwarn': '🔄',
      '.mute': '🔇',
      '.unmute': '🔊',
      '.kick': '🚪',
      '.promote': '👑',
      '.demote': '👤',
      '.admins': '👑',
      '.groupinfo': 'ℹ️',
      '.fb': '📥',
      '.ig': '📸',
      '.tt': '🎬'
    };

    if (reactions[rawCommand]) {
      try {
        await sock.sendMessage(msg.key.remoteJid, {
          react: {
            text: reactions[rawCommand],
            key: msg.key
          }
        });
      } catch (error) {
        console.log('Reaction error:', error.message);
      }
    }


    if (text.toLowerCase() === '.tagall') {
      const jid = msg.key.remoteJid;

      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, {
          text: '❌ এই command শুধু Group-এ ব্যবহার করা যাবে।'
        });
        return;
      }

      try {
        const metadata = await sock.groupMetadata(jid);
        const sender = msg.key.participant || msg.participant;

        const senderInfo = metadata.participants.find(
          p => p.id === sender
        );

        const isAdmin =
          senderInfo &&
          (senderInfo.admin === 'admin' ||
           senderInfo.admin === 'superadmin');

        if (!isAdmin) {
          await sock.sendMessage(jid, {
            text: '❌ এই command শুধু Group Admin ব্যবহার করতে পারবে।'
          });
          return;
        }

        const mentions = metadata.participants.map(
          p => p.id
        );

        const text = `📢 *GROUP TAG ALL*

${metadata.participants
  .map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`)
  .join('\n')}`;

        await sock.sendMessage(jid, {
          text,
          mentions
        });

      } catch (error) {
        console.log('Tagall error:', error.message);

        await sock.sendMessage(jid, {
          text: '❌ Members list নেওয়া যায়নি।'
        });
      }

      return;
    }

    if (text.toLowerCase() === '.uptime') {
      const totalSeconds = Math.floor(process.uptime());

      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      let uptime = '';

      if (days > 0) uptime += `${days}d `;
      if (hours > 0 || days > 0) uptime += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) uptime += `${minutes}m `;
      uptime += `${seconds}s`;

      await sock.sendMessage(msg.key.remoteJid, {
        text: `⏱️ *BOT UPTIME*\n\n🟢 ${uptime.trim()}`
      });

      return;
    }

    if (text.toLowerCase() === '.owner') {
      const ownerNumber = OWNER_NUMBER.replace(/[^0-9]/g, '');

      await sock.sendMessage(msg.key.remoteJid, {
        contacts: {
          displayName: OWNER_NAME,
          contacts: [{
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:${OWNER_NAME}
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}
END:VCARD`
          }]
        }
      });

      return;
    }

    if (text.toLowerCase() === '.goodnight') {
      if (!msg.key.remoteJid.endsWith('@g.us')) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ এই command শুধু গ্রুপে ব্যবহার করা যাবে।'
        });
        return;
      }

      await sock.sendMessage(msg.key.remoteJid, {
        text: `╭━━〔 🌙 GOOD NIGHT 〕━━┈⊷
┃
┃ 🌙 Good Night Everyone!
┃ ✨ সবাই সুন্দর ঘুম দাও।
┃ 💫 আগামীকাল নতুন একটা সুন্দর দিন
┃    শুরু হোক সবার জন্য।
┃
┃ 😴 Sleep Well • Stay Safe
┃ ❤️ Take Care Everyone
┃
╰━━━━━━━━━━━━━━━━┈⊷

🔒 এখন থেকে শুধু Admin-রা মেসেজ করতে পারবে।`
      });

      try {
        await sock.groupSettingUpdate(
          msg.key.remoteJid,
          'announcement'
        );
      } catch (error) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '⚠️ মেসেজ দেওয়া হয়েছে, কিন্তু Group Only Admin করা যায়নি। Bot-কে Admin করুন।'
        });
      }

      return;
    }

    if (text.toLowerCase() === '.goodmorning') {
      if (!msg.key.remoteJid.endsWith('@g.us')) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ এই command শুধু গ্রুপে ব্যবহার করা যাবে।'
        });
        return;
      }

      await sock.sendMessage(msg.key.remoteJid, {
        text: `╭━━〔 ☀️ GOOD MORNING 〕━━┈⊷
┃
┃ ☀️ Good Morning Everyone!
┃ 🌸 নতুন সকাল, নতুন আশা।
┃ ✨ আজকের দিনটা সবার সুন্দর কাটুক।
┃ 💫 হাসিখুশি থাকুন এবং ভালো থাকুন।
┃
┃ 🌻 Have a Wonderful Day!
┃ ❤️ Take Care Everyone
┃
╰━━━━━━━━━━━━━━━━┈⊷

🔓 এখন থেকে সবাই মেসেজ করতে পারবে।`
      });

      try {
        await sock.groupSettingUpdate(
          msg.key.remoteJid,
          'not_announcement'
        );
      } catch (error) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '⚠️ মেসেজ দেওয়া হয়েছে, কিন্তু Everyone mode চালু করা যায়নি। Bot-কে Admin করুন।'
        });
      }

      return;
    }

    if (text.toLowerCase() === '.ping') {
      const start = Date.now();

      await sock.sendMessage(msg.key.remoteJid, {
        text: `🏓 Pong!\n⚡ Response: ${Date.now() - start}ms`
      });

      return;
    }

    if (text.toLowerCase().startsWith('.menu')) {
      const totalSeconds = Math.floor(process.uptime());
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const runtime =
        `${days > 0 ? days + 'd ' : ''}` +
        `${hours}h ${minutes}m ${seconds}s`;

      const totalCommands = 39;

      const menuText = `
〔 *𝙹𝙰𝙼𝙸𝙻 𝙰𝙷𝙼𝙴𝙳* 〕
┃★╭──────────────
┃★│ Owner : ${OWNER_NAME}
┃★│ Mode : Public
┃★│ Country : Bangladesh
┃★│ Prefix : .
┃★│ Version : 1.5.0 Beta
┃★│ Runtime : ${runtime}
┃★│ Total Commands : ${totalCommands}
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 *MUSIC* 〕━━┈⊷
┃❖╭─────────────·๏
┃❖┃ 🎧 .song <name>
┃❖└───────────┈⊷
╰──────────────┈⊷

╭━━〔 *GROUP* 〕━━┈⊷
┃❖╭─────────────·๏
┃❖┃ 👥 .tagall
┃❖┃ 👑 .admins
┃❖┃ 📋 .groupinfo
┃❖┃ ❌ .kick @user
┃❖┃ 🌙 .goodnight
┃❖┃ ☀️ .goodmorning
┃❖┃ ⬆️ .promote @user
┃❖┃ ⬇️ .demote @user
┃❖┃ 🔇 .mute @user
┃❖┃ 🔊 .unmute @user
┃❖┃ 🕋 .namaztime
┃❖┃ 🔚 .namaztime end
┃❖└───────────┈⊷
╰──────────────┈⊷

╭━━〔 *PROTECTION* 〕━━┈⊷
┃❖╭─────────────·๏
┃❖┃ 🔗 .antilink on
┃❖┃ 🔗 .antilink off
┃❖┃ ⚠️ .warn @user
┃❖┃ 📊 .warnings @user
┃❖┃ ♻️ .resetwarn @user
┃❖└───────────┈⊷
╰──────────────┈⊷

╭━━〔 *ENTERTAINMENT* 〕━━┈⊷
┃❖╭─────────────·๏
┃❖┃ 🪄 .magic @user
┃❖┃ 🔮 .8ball @user
┃❖┃ 😂 .joke @user
┃❖┃ 🧠 .quiz @user
┃❖┃ 🧩 .riddle @user
┃❖┃ 😇 .truth @user
┃❖┃ 🎭 .dare @user
┃❖┃ ✨ .fortune @user
┃❖┃ 🌟 .compliment @user
┃❖┃ ⭐ .rate @user
┃❖┃ 🪙 .coin @user
┃❖┃ 🎲 .dice @user
┃❖┃ 🎰 .slot @user
┃❖┃ 🤣 .meme @user
┃❖┃ 🔥 .roast @user
┃❖└───────────┈⊷
╰──────────────┈⊷

╭━━〔 *MEDIA* 〕━━┈⊷
┃❖╭─────────────·๏
┃❖┃ 🖼️ .upscale
┃❖┃ 🖼️ .upscale1
┃❖┃ 🖼️ .vupscale
┃❖┃ ✨ .remini
┃❖┃ 🎬 .imgvideo
┃❖└───────────┈⊷
╰──────────────┈⊷

╭━━〔 *DOWNLOAD* 〕━━┈⊷
┃❖╭─────────────·๏
┃❖┃ 📘 .fb <link>
┃❖┃ 📸 .ig <link>
┃❖┃ 🎵 .tt <link>
┃❖└───────────┈⊷
╰──────────────┈⊷

╭━━〔 *MAIN* 〕━━┈⊷
┃❖╭─────────────·๏
┃❖┃ 🏓 .ping
┃❖┃ ⏱️ .uptime
┃❖┃ 👑 .owner
┃❖┃ 📖 .menu
┃❖┃ 🕌 .namaztest
┃❖┃ 🔒 .close
┃❖┃ 🔓 .open
┃❖└───────────┈⊷
╰──────────────┈⊷

╭━━〔 *SUPPORT* 〕━━┈⊷
┃❖╭─────────────·๏
┃❖┃ 👑 owner
┃❖┃ 🏓 ping
┃❖┃ 📖 menu
┃❖└───────────┈⊷
╰──────────────┈⊷

> *© ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ 𝙹𝙰𝙼𝙸𝙻 𝙰𝙷𝙼𝙴𝙳*`;

      await sock.sendMessage(msg.key.remoteJid, {
        image: { url: '/data/data/com.termux/files/home/song-bot/menu.jpg' },
        mimetype: 'image/jpeg',
        caption: menuText
      });

      return;
    }

    // Facebook / Instagram / TikTok video downloader
    const videoMatch = text.trim().match(/^\.(fb|ig|tt)\s+(.+)$/i);

    if (videoMatch) {
      const platform = videoMatch[1].toLowerCase();
      const url = videoMatch[2].trim();

      const names = {
        fb: 'Facebook',
        ig: 'Instagram',
        tt: 'TikTok'
      };

      const platformName = names[platform];

      if (!/^https?:\/\//i.test(url)) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: `❌ ${platformName} video-এর সঠিক link দিন।\n\nউদাহরণ:\n.${platform} https://example.com/video`
        });
        return;
      }

      const output = `/data/data/com.termux/files/home/song-bot/video_${Date.now()}.mp4`;

      await sock.sendMessage(msg.key.remoteJid, {
        text: `⏳ ${platformName} video download হচ্ছে... 📥`
      });

      execFile(
        'yt-dlp',
        [
          '--js-runtimes', 'deno',
          '--no-playlist',
          '-f', 'best',
          '-o', output,
          url
        ],
        async (error) => {
          if (error || !fs.existsSync(output)) {
            console.log(`${platformName} downloader error:`, error?.message);

            await sock.sendMessage(msg.key.remoteJid, {
              text: `❌ ${platformName} video download করা যায়নি।\n\nসম্ভবত ভিডিওটি private, restricted অথবা এই link বর্তমানে supported নয়।`
            });
            return;
          }

          try {
            await sock.sendMessage(msg.key.remoteJid, {
              video: { url: output },
              mimetype: 'video/mp4',
              caption: `🎬 ${platformName} Video\n\n🤖 Jamil Ahmed Bot`
            });

            console.log(`✅ ${platformName} video sent`);

            fs.unlinkSync(output);
          } catch (err) {
            console.log('❌ Video send error:', err.message);

            if (fs.existsSync(output)) {
              fs.unlinkSync(output);
            }
          }
        }
      );

      return;
    }

    // Video Upscaler
    if (text.toLowerCase() === '.vupscale') {
      const contextInfo =
        msg.message?.extendedTextMessage?.contextInfo;

      const quoted = contextInfo?.quotedMessage;

      if (!quoted?.videoMessage) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ একটি ভিডিওতে reply করে .vupscale লিখুন।'
        });
        return;
      }

      const input = `/data/data/com.termux/files/home/song-bot/vupscale_in_${Date.now()}.mp4`;
      const output = `/data/data/com.termux/files/home/song-bot/vupscale_out_${Date.now()}.mp4`;

      try {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '🎬 ভিডিও quality বাড়ানো হচ্ছে... ⏳'
        });

        const quotedKey = {
          remoteJid: msg.key.remoteJid,
          id: contextInfo?.stanzaId,
          participant: contextInfo?.participant
        };

        const buffer = await downloadMediaMessage(
          {
            key: quotedKey,
            message: quoted
          },
          'buffer',
          {},
          {
            logger: pino({ level: 'silent' }),
            reuploadRequest: sock.updateMediaMessage
          }
        );

        fs.writeFileSync(input, buffer);

        execFile(
          'ffmpeg',
          [
            '-y',
            '-i', input,
            '-vf', 'scale=iw*2:ih*2:flags=lanczos,unsharp=5:5:0.7:5:5:0.0',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '18',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            output
          ],
          async (error) => {
            try {
              if (error || !fs.existsSync(output)) {
                console.log('❌ Video upscale error:', error?.message);

                await sock.sendMessage(msg.key.remoteJid, {
                  text: '❌ ভিডিও upscale করা যায়নি।'
                });
                return;
              }

              await sock.sendMessage(msg.key.remoteJid, {
                video: { url: output },
                mimetype: 'video/mp4',
                caption: '✨ Video Upscaled Successfully!\n\n🤖 Jamil Ahmed Bot'
              });

              console.log('✅ Video upscale completed');
            } catch (err) {
              console.log('❌ Video send error:', err.message);
            } finally {
              if (fs.existsSync(input)) fs.unlinkSync(input);
              if (fs.existsSync(output)) fs.unlinkSync(output);
            }
          }
        );
      } catch (err) {
        console.log('❌ Video upscale error:', err.message);

        if (fs.existsSync(input)) fs.unlinkSync(input);
        if (fs.existsSync(output)) fs.unlinkSync(output);

        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ ভিডিও process করা যায়নি। আবার চেষ্টা করুন।'
        });
      }

      return;
    }

    // Image to Video
    if (text.toLowerCase().startsWith('.imgvideo')) {
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const quoted = contextInfo?.quotedMessage;

      if (!quoted?.imageMessage) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ একটি ছবিতে reply করে .imgvideo লিখুন।'
        });
        return;
      }

      const input = `/data/data/com.termux/files/home/song-bot/imgvideo_in_${Date.now()}.jpg`;
      const output = `/data/data/com.termux/files/home/song-bot/imgvideo_out_${Date.now()}.mp4`;

      try {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '🎬 ছবি থেকে ভিডিও তৈরি হচ্ছে... ⏳'
        });

        const quotedKey = {
          remoteJid: msg.key.remoteJid,
          id: contextInfo?.stanzaId,
          participant: contextInfo?.participant
        };

        const buffer = await downloadMediaMessage(
          {
            key: quotedKey,
            message: quoted
          },
          'buffer',
          {},
          {
            logger: pino({ level: 'silent' }),
            reuploadRequest: sock.updateMediaMessage
          }
        );

        fs.writeFileSync(input, buffer);

        execFile(
          'ffmpeg',
          [
            '-y',
            '-loop', '1',
            '-i', input,
            '-t', '15',
            '-vf',
            "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0015,1.08)':d=150:s=1280x720:fps=30",
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            output
          ],
          async (error) => {
            try {
              if (error || !fs.existsSync(output)) {
                console.log('❌ Image video error:', error?.message);

                await sock.sendMessage(msg.key.remoteJid, {
                  text: '❌ ভিডিও তৈরি করা যায়নি।'
                });
                return;
              }

              await sock.sendMessage(msg.key.remoteJid, {
                video: { url: output },
                mimetype: 'video/mp4',
                caption: '🎬 Image Video Created!\n\n🤖 Jamil Ahmed Bot'
              });
            } catch (err) {
              console.log('❌ Image video send error:', err.message);
            } finally {
              if (fs.existsSync(input)) fs.unlinkSync(input);
              if (fs.existsSync(output)) fs.unlinkSync(output);
            }
          }
        );
      } catch (err) {
        console.log('❌ Image video error:', err.message);

        if (fs.existsSync(input)) fs.unlinkSync(input);
        if (fs.existsSync(output)) fs.unlinkSync(output);

        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ ভিডিও তৈরি করা যায়নি।'
        });
      }

      return;
    }

    // Group Open / Close
    if (text.toLowerCase() === '.close' || text.toLowerCase() === '.open') {
      if (!msg.key.remoteJid.endsWith('@g.us')) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ এই command শুধু গ্রুপে ব্যবহার করা যাবে।'
        });
        return;
      }

      try {
        const metadata = await sock.groupMetadata(msg.key.remoteJid);
        const sender = msg.key.participant || msg.participant;
        const senderInfo = metadata.participants.find(p => p.id === sender);
        const isAdmin = senderInfo?.admin === 'admin' || senderInfo?.admin === 'superadmin';

        if (!isAdmin) {
          await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ শুধু গ্রুপ Admin এই command ব্যবহার করতে পারবেন।'
          });
          return;
        }

        const setting = text.toLowerCase() === '.close'
          ? 'announcement'
          : 'not_announcement';

        await sock.groupSettingUpdate(msg.key.remoteJid, setting);

        const isClose = text.toLowerCase() === '.close';

        await sock.sendMessage(msg.key.remoteJid, {
          text: isClose
            ? '🔒 *GROUP CLOSED* 🔒\n\n╭━━━〔 🔐 ADMIN MODE 〕━━━╮\n┃★│ Only Admins Can Send Messages\n┃★│ Group Chat Is Now Closed\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n🤖 *JAMIL AHMED BOT*'
            : '🔓 *GROUP OPENED* 🔓\n\n╭━━━〔 🔓 PUBLIC MODE 〕━━━╮\n┃★│ Everyone Can Send Messages\n┃★│ Group Chat Is Now Open\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n🤖 *JAMIL AHMED BOT*'
        });

        try {
          await sock.sendMessage(msg.key.remoteJid, {
            react: {
              text: isClose ? '🔒' : '🔓',
              key: msg.key
            }
          });
        } catch (reactionError) {
          console.log('⚠️ Reaction error:', reactionError.message);
        }

      } catch (err) {
        console.log('❌ Group open/close error:', err.message);

        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ Group setting পরিবর্তন করা যায়নি। Bot-কে Group Admin করুন।'
        });
      }

      return;
    }

    // Namaz Time
    if (text.toLowerCase() === '.namaztime' || text.toLowerCase() === '.namaztime end') {
      if (!msg.key.remoteJid.endsWith('@g.us')) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ This command can only be used in a group.'
        });
        return;
      }

      try {
        const metadata = await sock.groupMetadata(msg.key.remoteJid);
        const sender = msg.key.participant || msg.participant;
        const senderInfo = metadata.participants.find(p => p.id === sender);
        const isAdmin = senderInfo?.admin === 'admin' || senderInfo?.admin === 'superadmin';

        if (!isAdmin) {
          await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ *ADMIN ONLY*\\n\\nOnly group admins can use this command.'
          });
          return;
        }

        const isEnd = text.toLowerCase() === '.namaztime end';

        await sock.groupSettingUpdate(
          msg.key.remoteJid,
          isEnd ? 'not_announcement' : 'announcement'
        );

        const message = isEnd
          ? `🕋 *━━ NAMAZ TIME ENDED ━━* 🕌

╭━━━━━━━━━━━━━━━━━━╮
┃ 🤍 *ALHAMDULILLAH* 🤍 ┃
╰━━━━━━━━━━━━━━━━━━╯

🤲 May Allah accept your
   Salah and Dua. 🕋

🔓 *GROUP IS NOW OPEN*

🌙 May Allah bless us all.

╭━━━━━━━━━━━━━━━━━━╮
┃   ✨ *JAMIL AHMED*   ┃
╰━━━━━━━━━━━━━━━━━━╯`
          : `🕋 *━━━ NAMAZ TIME ━━━* 🕌

╭━━━━━━━━━━━━━━━━━━╮
┃  🕌 *PRAYER BREAK*  ┃
╰━━━━━━━━━━━━━━━━━━╯

🕋 *It's Time for Namaz*

🤲 Please take a short break
   and offer your Salah.

🔒 *GROUP TEMPORARILY CLOSED*

🌙 May Allah accept your
   Namaz and Dua. 🤲

╭━━━━━━━━━━━━━━━━━━╮
┃   ✨ *JAMIL AHMED*   ┃
╰━━━━━━━━━━━━━━━━━━╯`;

        await sock.sendMessage(msg.key.remoteJid, {
          text: message
        });

        try {
          await sock.sendMessage(msg.key.remoteJid, {
            react: {
              text: isEnd ? '🤍' : '🕌',
              key: msg.key
            }
          });
        } catch (reactionError) {
          console.log('⚠️ Namaz reaction error:', reactionError.message);
        }

      } catch (err) {
        console.log('❌ Namaz time error:', err.message);

        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ *NAMAZ TIME ERROR*\\n\\nPlease make sure the bot is a group admin.'
        });
      }

      return;
    }

    // Namaz Scheduler Test
    if (text.toLowerCase() === '.namaztest') {
      if (!msg.key.remoteJid.endsWith('@g.us')) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ This test can only be used in a group.'
        });
        return;
      }

      try {
        const metadata = await sock.groupMetadata(msg.key.remoteJid);
        const sender = msg.key.participant || msg.participant;
        const senderInfo = metadata.participants.find(p => p.id === sender);
        const isAdmin = senderInfo?.admin === 'admin' || senderInfo?.admin === 'superadmin';

        if (!isAdmin) {
          await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ *ADMIN ONLY*'
          });
          return;
        }

        await sock.sendMessage(msg.key.remoteJid, {
          text: '🧪 *NAMAZ AUTO TEST STARTED*\\n\\n⏱️ Group will close in 1 minute.\\n🔓 It will automatically open 1 minute later.'
        });

        setTimeout(async () => {
          try {
            await sock.groupSettingUpdate(msg.key.remoteJid, 'announcement');

            await sock.sendMessage(msg.key.remoteJid, {
              text: '🕋 *NAMAZ TEST — GROUP CLOSED* 🕌\\n\\n🔒 Test mode: Group is now closed.\\n\\n⏱️ Group will open automatically in 1 minute.\\n\\n✨ *JAMIL AHMED*'
            });

            await sock.sendMessage(msg.key.remoteJid, {
              react: {
                text: '🕌',
                key: msg.key
              }
            });

            setTimeout(async () => {
              try {
                await sock.groupSettingUpdate(msg.key.remoteJid, 'not_announcement');

                await sock.sendMessage(msg.key.remoteJid, {
                  text: '🕋 *NAMAZ TEST — GROUP OPENED* 🕌\\n\\n🔓 Test completed successfully.\\n\\n✨ *JAMIL AHMED*'
                });

                await sock.sendMessage(msg.key.remoteJid, {
                  react: {
                    text: '🤍',
                    key: msg.key
                  }
                });

              } catch (err) {
                console.log('❌ Test open error:', err.message);
              }
            }, 60 * 1000);

          } catch (err) {
            console.log('❌ Test close error:', err.message);
          }
        }, 60 * 1000);

      } catch (err) {
        console.log('❌ Namaz test error:', err.message);
      }

      return;
    }

    // Image Upscaler
    if (text.toLowerCase() === '.upscale') {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted?.imageMessage) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ একটি ছবিতে reply করে .upscale লিখুন।'
        });
        return;
      }

      const input = `/data/data/com.termux/files/home/song-bot/upscale_in_${Date.now()}.jpg`;
      const output = `/data/data/com.termux/files/home/song-bot/upscale_out_${Date.now()}.jpg`;

      try {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '⏳ ছবি upscale করা হচ্ছে... 🖼️'
        });

        const contextInfo =
          msg.message?.extendedTextMessage?.contextInfo;

        const quotedKey = {
          remoteJid: msg.key.remoteJid,
          id: contextInfo?.stanzaId,
          participant: contextInfo?.participant
        };

        const buffer = await downloadMediaMessage(
          {
            key: quotedKey,
            message: quoted
          },
          'buffer',
          {},
          {
            logger: pino({ level: 'silent' }),
            reuploadRequest: sock.updateMediaMessage
          }
        );

        fs.writeFileSync(input, buffer);

        execFile(
          'magick',
          [
            input,
            '-resize', '300%',
            '-filter', 'Lanczos',
            '-unsharp', '0x0.75',
            '-sampling-factor', '4:4:4',
            '-quality', '100',
            '-define', 'jpeg:preserve-settings',
            output
          ],
          async (error) => {
            try {
              if (error || !fs.existsSync(output)) {
                console.log('❌ ImageMagick upscale error:', error?.message);
                await sock.sendMessage(msg.key.remoteJid, {
                  text: '❌ ছবি upscale করা যায়নি।'
                });
                return;
              }

              await sock.sendMessage(msg.key.remoteJid, {
                image: { url: output },
                mimetype: 'image/jpeg',
                caption: '✨ Image Upscaled Successfully!\n\n🤖 Jamil Ahmed Bot'
              });
            } catch (err) {
              console.log('❌ Upscale send error:', err.message);
            } finally {
              if (fs.existsSync(input)) fs.unlinkSync(input);
              if (fs.existsSync(output)) fs.unlinkSync(output);
            }
          }
        );
      } catch (err) {
        console.log('❌ Upscale error:', err.message);

        if (fs.existsSync(input)) fs.unlinkSync(input);
        if (fs.existsSync(output)) fs.unlinkSync(output);

        await sock.sendMessage(jid, {
          text: '❌ ছবি upscale করা যায়নি। আবার চেষ্টা করুন।'
        });
      }

      return;
    }

    // 5x Image Upscaler
    if (text.toLowerCase() === '.upscale1') {
      const contextInfo =
        msg.message?.extendedTextMessage?.contextInfo;

      const quoted = contextInfo?.quotedMessage;

      if (!quoted?.imageMessage) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ একটি ছবিতে reply করে .upscale1 লিখুন।'
        });
        return;
      }

      const input = `/data/data/com.termux/files/home/song-bot/upscale5_in_${Date.now()}.jpg`;
      const output = `/data/data/com.termux/files/home/song-bot/upscale5_out_${Date.now()}.jpg`;

      try {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '⏳ 5× High Quality Upscale হচ্ছে... 🖼️✨'
        });

        const quotedKey = {
          remoteJid: msg.key.remoteJid,
          id: contextInfo?.stanzaId,
          participant: contextInfo?.participant
        };

        const buffer = await downloadMediaMessage(
          {
            key: quotedKey,
            message: quoted
          },
          'buffer',
          {},
          {
            logger: pino({ level: 'silent' }),
            reuploadRequest: sock.updateMediaMessage
          }
        );

        fs.writeFileSync(input, buffer);

        execFile(
          'magick',
          [
            input,
            '-resize', '500%',
            '-filter', 'Lanczos',
            '-unsharp', '0x0.75',
            '-sampling-factor', '4:4:4',
            '-quality', '100',
            output
          ],
          async (error) => {
            try {
              if (error || !fs.existsSync(output)) {
                console.log('❌ 5x upscale error:', error?.message);
                await sock.sendMessage(msg.key.remoteJid, {
                  text: '❌ 5× upscale করা যায়নি।'
                });
                return;
              }

              await sock.sendMessage(msg.key.remoteJid, {
                image: { url: output },
                mimetype: 'image/jpeg',
                caption: '✨ 5× High Quality Upscaled!\n\n🤖 Jamil Ahmed Bot'
              });
            } catch (err) {
              console.log('❌ 5x send error:', err.message);
            } finally {
              if (fs.existsSync(input)) fs.unlinkSync(input);
              if (fs.existsSync(output)) fs.unlinkSync(output);
            }
          }
        );
      } catch (err) {
        console.log('❌ 5x upscale error:', err.message);

        if (fs.existsSync(input)) fs.unlinkSync(input);
        if (fs.existsSync(output)) fs.unlinkSync(output);

        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ 5× upscale করা যায়নি। আবার চেষ্টা করুন।'
        });
      }

      return;
    }

    // Remini-style AI Enhancement
    if (text.toLowerCase() === '.remini') {
      const contextInfo =
        msg.message?.extendedTextMessage?.contextInfo;

      const quoted = contextInfo?.quotedMessage;

      if (!quoted?.imageMessage) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ একটি ছবিতে reply করে .remini লিখুন।'
        });
        return;
      }

      const input = `/data/data/com.termux/files/home/song-bot/remini_in_${Date.now()}.jpg`;
      const output = `/data/data/com.termux/files/home/song-bot/remini_out_${Date.now()}.jpg`;

      try {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '✨ Remini-style AI enhancement হচ্ছে... 🖼️⏳'
        });

        const quotedKey = {
          remoteJid: msg.key.remoteJid,
          id: contextInfo?.stanzaId,
          participant: contextInfo?.participant
        };

        const buffer = await downloadMediaMessage(
          {
            key: quotedKey,
            message: quoted
          },
          'buffer',
          {},
          {
            logger: pino({ level: 'silent' }),
            reuploadRequest: sock.updateMediaMessage
          }
        );

        fs.writeFileSync(input, buffer);

        execFile(
          'magick',
          [
            input,
            '-colorspace', 'sRGB',
            '-resize', '200%',
            '-filter', 'Lanczos',
            '-unsharp', '0x0.8',
            '-contrast-stretch', '0.5%x0.5%',
            '-quality', '100',
            '-sampling-factor', '4:4:4',
            output
          ],
          async (error) => {
            try {
              if (error || !fs.existsSync(output)) {
                console.log('❌ Remini enhancement error:', error?.message);
                await sock.sendMessage(msg.key.remoteJid, {
                  text: '❌ ছবি enhance করা যায়নি।'
                });
                return;
              }

              await sock.sendMessage(msg.key.remoteJid, {
                image: { url: output },
                mimetype: 'image/jpeg',
                caption: '✨ Remini-style Enhanced!\n\n🤖 Jamil Ahmed Bot'
              });
            } catch (err) {
              console.log('❌ Remini send error:', err.message);
            } finally {
              if (fs.existsSync(input)) fs.unlinkSync(input);
              if (fs.existsSync(output)) fs.unlinkSync(output);
            }
          }
        );
      } catch (err) {
        console.log('❌ Remini error:', err.message);

        if (fs.existsSync(input)) fs.unlinkSync(input);
        if (fs.existsSync(output)) fs.unlinkSync(output);

        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ ছবি enhance করা যায়নি। আবার চেষ্টা করুন।'
        });
      }

      return;
    }

    if (!text.toLowerCase().startsWith('.song ')) return;

    const query = text.slice(6).trim();

    if (!query) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ গানের নাম লিখুন। যেমন: .song Shape of You'
      });
      return;
    }

    try {
      await sock.sendMessage(msg.key.remoteJid, {
        react: {
          text: '🎵',
          key: msg.key
        }
      });
    } catch (e) {
      console.log('Reaction error:', e.message);
    }

    const songId = Date.now();
    const output =
      `/data/data/com.termux/files/home/song-bot/song_${songId}.mp3`;
    const thumb =
      `/data/data/com.termux/files/home/song-bot/thumb_${songId}.jpg`;

    execFile(
      'yt-dlp',
      [
        `ytsearch1:${query}`,
        '--js-runtimes', 'deno',
        '--extractor-args', 'youtube:player_client=android',
        '--print', '%(thumbnail)s',
        '--print', '%(title)s',
        '--print', '%(channel)s',
        '--print', '%(duration_string)s',
        '--print', '%(view_count)s',
        '--skip-download'
      ],
      async (infoError, stdout) => {
        if (!infoError && stdout.trim()) {
          const lines = stdout.trim().split('\n');
          const thumbnailUrl = lines[0] || '';
          const title = lines[1] || query;
          const channel = lines[2] || 'Unknown';
          const duration = lines[3] || 'Unknown';
          const views = lines[4]
            ? Number(lines[4]).toLocaleString()
            : 'Unknown';

          const shortTitle =
            title.length > 42
              ? title.slice(0, 42).trim() + '...'
              : title;

          const caption =
`🎧 *MUSIC PLAYER*

╭─ 🎵 *TRACK INFO*
│
│ 🎶 *Title*
│ ${title.length > 42 ? title.slice(0, 42).trim() + '...' : title}
│
│ 👤 *Channel*
│ ${channel}
│
│ ⏱️ *Duration*
│ ${duration}
│
│ 👁️ *Views*
│ ${views}
╰──────────────

╭─ 🎧 *AUDIO*
│
│ ⏳ Preparing audio...
│ 🎵 Please wait...
╰──────────────

✨ *JAMIL AHMED* ✨`;

          try {
            if (thumbnailUrl) {
              await sock.sendMessage(msg.key.remoteJid, {
                image: { url: thumbnailUrl },
                caption
              });
            } else {
              await sock.sendMessage(msg.key.remoteJid, {
                text: caption
              });
            }
          } catch (e) {
            console.log('Thumbnail message error:', e.message);
            await sock.sendMessage(msg.key.remoteJid, {
              text: caption
            });
          }
        }
      }
    );

    execFile(
      'yt-dlp',
      [
        `ytsearch1:${query}`,
        '--js-runtimes', 'deno',
        '--extractor-args', 'youtube:player_client=android',
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '128K',
        '-N', '4',
        '--retries', '2',
        '--fragment-retries', '2',
        '-o', output
      ],
      async (error) => {
        if (error || !fs.existsSync(output)) {
          console.log('yt-dlp error:', error?.message);

          await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ গানটি ডাউনলোড করা যায়নি।'
          });
          return;
        }

        try {
          await sock.sendMessage(msg.key.remoteJid, {
            audio: { url: output },
            mimetype: 'audio/mpeg'
          });

          console.log('✅ Audio sent');

          fs.unlinkSync(output);
        } catch (err) {
          console.log('❌ Send error:', err.message);

          if (fs.existsSync(output)) {
            fs.unlinkSync(output);
          }
        }
      }
    );



  });

  sock.ev.on('group-participants.update', async (update) => {
    try {
      const { id, participants, action } = update;

      if (!id || !participants || participants.length === 0) return;

      const metadata = await sock.groupMetadata(id);
      const groupName = metadata.subject || 'Our Group';

      for (const participant of participants) {
        const participantId =
          typeof participant === 'string'
            ? participant
            : participant.id;

        if (!participantId) continue;

        const number = participantId.split('@')[0];
        const mention = `@${number}`;

        if (action === 'add') {
          await sock.sendMessage(id, {
            text: `╭━━━〔 🌸 WELCOME 〕━━━╮

👋 Hey ${mention}!

🌷 *${groupName}* পরিবারে
তোমাকে জানাই আন্তরিক স্বাগতম। 💖

🤝 সবার সাথে ভালো ব্যবহার করো
😊 হাসিখুশি থাকো, সুন্দর সময় কাটাও
📜 Group Rules মেনে চলো

✨ আশা করি আমাদের সাথে
তোমার সময়টা সুন্দর হবে!

╰━━━━━━━━━━━━━━━━━━╯
💫 Enjoy The Group 💫`,
            mentions: [participantId]
          });
        }

        if (action === 'remove') {
          await sock.sendMessage(id, {
            text: `╭━━━〔 🥀 GOODBYE 〕━━━╮

👋 Goodbye ${mention}!

😔 আজ আমাদের পরিবার থেকে
একজন সদস্য বিদায় নিলেন।

🌸 তোমার সাথে কাটানো সময়
সবসময় মনে থাকবে।

💫 যেখানে থাকো, ভালো থেকো
🤍 নিজের যত্ন নিও

╰━━━━━━━━━━━━━━━━━━╯
🌷 Take Care & Stay Happy 🌷`,
            mentions: [participantId]
          });
        }
      }
    } catch (error) {
      console.log('Welcome/Goodbye error:', error.message);
    }
  });


  const settingsFile = './group_settings.json';

  let groupSettings = {};

  try {
    if (fs.existsSync(settingsFile)) {
      const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));

      for (const jid of Object.keys(saved)) {
        groupSettings[jid] = {
          antilink: saved[jid].antilink || false,
          muted: new Set(saved[jid].muted || []),
          warnings: saved[jid].warnings || {}
        };
      }

      console.log('💾 Group settings loaded');
    }
  } catch (error) {
    console.log('⚠️ Could not load group settings:', error.message);
  }

  function saveGroupSettings() {
    try {
      const data = {};

      for (const jid of Object.keys(groupSettings)) {
        data[jid] = {
          antilink: groupSettings[jid].antilink,
          muted: [...groupSettings[jid].muted],
          warnings: groupSettings[jid].warnings
        };
      }

      fs.writeFileSync(
        settingsFile,
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.log('⚠️ Could not save group settings:', error.message);
    }
  }

  function getGroupSettings(jid) {
    if (!groupSettings[jid]) {
      groupSettings[jid] = {
        antilink: false,
        muted: new Set(),
        warnings: {}
      };

      saveGroupSettings();
    }

    return groupSettings[jid];
  }

  setInterval(saveGroupSettings, 2000);

  async function isGroupAdmin(jid, userId) {
    const metadata = await sock.groupMetadata(jid);
    const member = metadata.participants.find(p => p.id === userId);

    return !!(
      member &&
      (member.admin === 'admin' || member.admin === 'superadmin')
    );
  }

  function getMentionedUser(msg) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    return ctx?.mentionedJid?.[0] || null;
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];

    if (!msg || !msg.message) return;

    const jid = msg.key.remoteJid;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      '';

    if (!jid.endsWith('@g.us')) return;

    const settings = getGroupSettings(jid);
    const sender = msg.key.participant || msg.key.remoteJid;

    try {
      /*
       * ANTI-LINK
       */
      if (
        settings.antilink &&
        /(https?:\/\/|www\.|t\.me\/|chat\.whatsapp\.com\/)/i.test(text)
      ) {
        const admin = await isGroupAdmin(jid, sender);

        if (!admin) {
          try {
            await sock.sendMessage(jid, {
              delete: msg.key
            });

            await sock.sendMessage(jid, {
              text: `🚫 @${sender.split('@')[0]} Link পাঠানো নিষিদ্ধ।`,
              mentions: [sender]
            });
          } catch (e) {
            console.log('Anti-link delete error:', e.message);
          }

          return;
        }
      }

      /*
       * MUTE
       */
      if (settings.muted.has(sender)) {
        const commandText = text.toLowerCase();

        if (
          !commandText.startsWith('.unmute') &&
          !commandText.startsWith('.menu')
        ) {
          try {
            await sock.sendMessage(jid, {
              delete: msg.key
            });
          } catch (e) {
            console.log('Mute delete error:', e.message);
          }

          return;
        }
      }

      /*
       * ADMIN CHECK
       */
      const adminCommands = [
        '.antilink',
        '.warn',
        '.warnings',
        '.resetwarn',
        '.mute',
        '.unmute',
        '.kick',
        '.promote',
        '.demote',
        '.admins',
        '.groupinfo'
      ];

      const command = text.trim().toLowerCase().split(/\s+/)[0];

      // ================================
      // ================================
      // 🎉 ENTERTAINMENT COMMANDS
      // ================================
      const funResults = {
        '.magic': [
          '🪄 আজকের magic বলছে: তোমার জন্য ভালো কিছু অপেক্ষা করছে! ✨',
          '🔮 আজ luck তোমার পক্ষেই আছে। 🍀',
          '✨ Magic says: আজ হাসির দিন! 😄',
          '⚡ তোমার আজকের secret power: Confidence!',
          '🌟 আজকের vibe: Positive & Lucky!'
        ],

        '.8ball': [
          '🔮 Absolutely YES! ✨',
          '🔮 Most likely! 😎',
          '🔮 Maybe... 🤔',
          '🔮 Not today! 😅',
          '🔮 Ask again later! 🪄'
        ],

        '.joke': [
          '😂 WiFi slow হলে সবাই suddenly engineer হয়ে যায়! 📶',
          '🤣 Battery 1% হলেই ফোনকে সবচেয়ে বেশি ভালোবাসা শুরু করি! 🔋',
          '😂 ঘুমানোর আগে ফোন রাখবো—এই কথাটাই সবচেয়ে বড় joke! 📱',
          '🤣 Exam tomorrow, brain today: Let’s sleep! 😴'
        ],

        '.quiz': [
          '🧠 বাংলাদেশের রাজধানী কোনটি?\nA) Sylhet\nB) Dhaka\nC) Chattogram\nD) Rajshahi',
          '🧠 পৃথিবীর সবচেয়ে বড় মহাসাগর কোনটি?\nA) Atlantic\nB) Indian\nC) Pacific\nD) Arctic',
          '🧠 5 × 5 = ?\nA) 15\nB) 20\nC) 25\nD) 30'
        ],

        '.riddle': [
          '🧩 যত শুকায়, তত ভিজে। সেটা কী? 🤔',
          '🧩 দাঁত আছে কিন্তু কামড়াতে পারে না। কী? 🤔',
          '🧩 চোখ আছে কিন্তু দেখতে পারে না। কী? 👀',
          '🧩 পা আছে কিন্তু হাঁটতে পারে না। কী? 🤔'
        ],

        '.truth': [
          '😇 শেষবার কখন পড়াশোনার বদলে ফোন চালিয়েছিলে?',
          '😄 তোমার সবচেয়ে বেশি ব্যবহৃত emoji কোনটা?',
          '🤭 Group-এ কার message সবচেয়ে বেশি পড়ো?',
          '😂 আজ কয় ঘণ্টা ফোন ব্যবহার করেছো?'
        ],

        '.dare': [
          '🎭 10 seconds-এর মধ্যে একটা funny status লেখো!',
          '😂 Group-এ শুধু ৩টা emoji দিয়ে নিজের mood বলো!',
          '🎉 একজন বন্ধুকে একটা genuine compliment দাও!',
          '😎 তোমার favourite song-এর নাম group-এ বলো!'
        ],

        '.fortune': [
          '🔮 সামনে তোমার জন্য ভালো একটা surprise আছে! ✨',
          '🌟 আজকের দিনটা positive energy-তে ভরা।',
          '🍀 তোমার luck meter আজ HIGH!',
          '💫 ছোট একটা সুযোগ বড় কিছুতে পরিণত হতে পারে।'
        ],

        '.compliment': [
          '🌟 তোমার vibe একদম awesome!',
          '✨ তোমার confidence সত্যিই সুন্দর!',
          '😎 তুমি group-এর positive energy!',
          '💫 তোমার presence আলাদা একটা vibe তৈরি করে!'
        ],

        '.rate': [
          '⭐ 87/100 — Pretty Awesome!',
          '⭐ 92/100 — Excellent! 🔥',
          '⭐ 76/100 — Not Bad!',
          '⭐ 99/100 — Legendary! 👑',
          '⭐ 84/100 — Very Nice! ✨'
        ],

        '.coin': [
          '🪙 HEADS!',
          '🪙 TAILS!'
        ],

        '.dice': [
          '🎲 You rolled: 1',
          '🎲 You rolled: 2',
          '🎲 You rolled: 3',
          '🎲 You rolled: 4',
          '🎲 You rolled: 5',
          '🎲 You rolled: 6'
        ],

        '.slot': [
          '🎰 🍒 | 🍋 | 🍒',
          '🎰 ⭐ | ⭐ | 🍒',
          '🎰 💎 | 💎 | 💎 — JACKPOT! 🎉',
          '🎰 🍊 | 🍒 | ⭐',
          '🎰 🔥 | ⭐ | 🔥'
        ],

        '.meme': [
          '😂 Me: আজ তাড়াতাড়ি ঘুমাবো.\nAlso me at 3 AM: 📱👀',
          '🤣 Internet slow: 😭\nInternet off: 💀',
          '😂 Exam tomorrow:\nBrain: Let’s clean the whole room first. 🧹'
        ],

        '.roast': [
          '🔥 তোমার WiFi-এর চেয়েও তোমার reply slow! 😂',
          '🤣 তোমাকে roast করতে গেলে আগে battery save করতে হবে! 🔋',
          '🔥 তোমার reply আসতে আসতে season change হয়ে যায়! 😂',
          '😂 তোমার luck আর mobile network—দুটোই মাঝে মাঝে disappear করে!'
        ]
      };

      const funReaction = {
        '.magic': '🪄',
        '.8ball': '🔮',
        '.joke': '😂',
        '.quiz': '🧠',
        '.riddle': '🧩',
        '.truth': '😇',
        '.dare': '🎭',
        '.fortune': '✨',
        '.compliment': '🌟',
        '.rate': '⭐',
        '.coin': '🪙',
        '.dice': '🎲',
        '.slot': '🎰',
        '.meme': '🤣',
        '.roast': '🔥'
      };

      // 🪄 SHORT MAGIC EMOJI ANIMATION
      if (command === '.magic') {
        const target = getMentionedUser(msg);

        if (!target) {
          await sock.sendMessage(jid, {
            text: '🪄 *Use:* `.magic @user` 😄'
          });
          return;
        }

        const mention = `@${target.split('@')[0]}`;

        const emojis = ['🪄', '👀', '😳', '💩', '🥴', '💥', '😂', '🤣'];

        for (const emoji of emojis) {
          await sock.sendMessage(jid, {
            text: `${emoji} ${mention}`,
            mentions: [target]
          });

          await new Promise(resolve => setTimeout(resolve, 350));
        }

        await sock.sendMessage(jid, {
          text:
`🪄 *MAGIC COMPLETE!* ✨

😂 *Oops... that magic went horribly funny!*

✨ *JAMIL AHMED* ✨`,
          mentions: [target]
        });

        return;
      }

      if (funResults[command]) {
        const list = funResults[command];
        const result = list[Math.floor(Math.random() * list.length)];

        const mentionedUser = getMentionedUser(msg);
        const mentionedText = mentionedUser
          ? `@${mentionedUser.split('@')[0]}`
          : '';

        try {
          await sock.sendMessage(jid, {
            react: {
              text: funReaction[command],
              key: msg.key
            }
          });
        } catch (e) {
          console.log('Entertainment reaction error:', e.message);
        }

        const targetLine = mentionedUser
          ? `👤 *For:* ${mentionedText}\n\n`
          : '';

        await sock.sendMessage(jid, {
          text:
`╭─〔 🎉 ENTERTAINMENT 〕─╮
│
│ ${targetLine}${result.replace(/\n/g, '\n│ ')}
│
╰──────────────────────╯

✨ *JAMIL AHMED* ✨`,
          mentions: mentionedUser ? [mentionedUser] : []
        });

        return;
      }

      if (funResults[command]) {
        const list = funResults[command];
        const result = list[Math.floor(Math.random() * list.length)];

        await sock.sendMessage(jid, {
          text:
`╭─〔 🎉 ENTERTAINMENT 〕─╮
│
│ ${result.replace(/\n/g, '\n│ ')}
│
╰──────────────────────╯

✨ *JAMIL AHMED* ✨`
        });

        return;
      }



      if (adminCommands.includes(command)) {
        const admin = await isGroupAdmin(jid, sender);

        if (!admin) {
          await sock.sendMessage(jid, {
            text: '❌ এই command শুধু Group Admin ব্যবহার করতে পারবে।'
          });
          return;
        }
      }

      /*
       * ANTILINK ON/OFF
       */
      if (command === '.antilink') {
        const arg = text.trim().split(/\s+/)[1]?.toLowerCase();

        if (arg === 'on') {
          settings.antilink = true;
          await sock.sendMessage(jid, {
            text: '🛡️ Anti-Link: ON\n\n🚫 সাধারণ members-এর link delete করা হবে।'
          });
        } else if (arg === 'off') {
          settings.antilink = false;
          await sock.sendMessage(jid, {
            text: '🛡️ Anti-Link: OFF'
          });
        } else {
          await sock.sendMessage(jid, {
            text: `🛡️ Anti-Link: ${settings.antilink ? 'ON' : 'OFF'}\n\nব্যবহার:\n.antilink on\n.antilink off`
          });
        }

        return;
      }

      /*
       * WARN
       */
      if (command === '.warn') {
        const target = getMentionedUser(msg);

        if (!target) {
          await sock.sendMessage(jid, {
            text: '⚠️ একজন member-কে mention করে ব্যবহার করুন:\n.warn @user'
          });
          return;
        }

        const count = (settings.warnings[target] || 0) + 1;
        settings.warnings[target] = count;

        await sock.sendMessage(jid, {
          text: `⚠️ Warning দেওয়া হয়েছে\n\n👤 @${target.split('@')[0]}\n📊 Warning: ${count}`,
          mentions: [target]
        });

        return;
      }

      /*
       * WARNINGS
       */
      if (command === '.warnings') {
        const target = getMentionedUser(msg);

        if (!target) {
          await sock.sendMessage(jid, {
            text: '⚠️ একজন member-কে mention করুন:\n.warnings @user'
          });
          return;
        }

        const count = settings.warnings[target] || 0;

        await sock.sendMessage(jid, {
          text: `📊 @${target.split('@')[0]} এর Warning: ${count}`,
          mentions: [target]
        });

        return;
      }

      /*
       * RESET WARNING
       */
      if (command === '.resetwarn') {
        const target = getMentionedUser(msg);

        if (!target) {
          await sock.sendMessage(jid, {
            text: '⚠️ একজন member-কে mention করুন:\n.resetwarn @user'
          });
          return;
        }

        settings.warnings[target] = 0;

        await sock.sendMessage(jid, {
          text: `✅ @${target.split('@')[0]} এর Warning reset করা হয়েছে।`,
          mentions: [target]
        });

        return;
      }

      /*
       * MUTE
       */
      if (command === '.mute') {
        const target = getMentionedUser(msg);

        if (!target) {
          await sock.sendMessage(jid, {
            text: '🔇 একজন member-কে mention করুন:\n.mute @user'
          });
          return;
        }

        settings.muted.add(target);

        await sock.sendMessage(jid, {
          text: `🔇 @${target.split('@')[0]} এখন muted।`,
          mentions: [target]
        });

        return;
      }

      /*
       * UNMUTE
       */
      if (command === '.unmute') {
        const target = getMentionedUser(msg);

        if (!target) {
          await sock.sendMessage(jid, {
            text: '🔊 একজন member-কে mention করুন:\n.unmute @user'
          });
          return;
        }

        settings.muted.delete(target);

        await sock.sendMessage(jid, {
          text: `🔊 @${target.split('@')[0]} এখন unmuted।`,
          mentions: [target]
        });

        return;
      }

      /*
       * KICK
       */
      if (command === '.kick') {
        const target = getMentionedUser(msg);

        if (!target) {
          await sock.sendMessage(jid, {
            text: '🚪 একজন member-কে mention করুন:\n.kick @user'
          });
          return;
        }

        await sock.groupParticipantsUpdate(
          jid,
          [target],
          'remove'
        );

        await sock.sendMessage(jid, {
          text: `🚪 @${target.split('@')[0]} group থেকে remove করা হয়েছে।`,
          mentions: [target]
        });

        return;
      }

      /*
       * PROMOTE
       */
      if (command === '.promote') {
        const target = getMentionedUser(msg);

        if (!target) {
          await sock.sendMessage(jid, {
            text: '👑 একজন member-কে mention করুন:\n.promote @user'
          });
          return;
        }

        await sock.groupParticipantsUpdate(
          jid,
          [target],
          'promote'
        );

        await sock.sendMessage(jid, {
          text: `╭━━━〔 👑 𝐍𝐄𝐖 𝐀𝐃𝐌𝐈𝐍 〕━━━╮

🎉 অভিনন্দন @${target.split('@')[0]}! 🥳

আজ থেকে তুমি আমাদের
🌟 *Group Administration Team*-এর
একজন সম্মানিত সদস্য। 👑

🛡️ Group-এর পরিবেশ সুন্দর রাখা
🤝 সবাইকে সম্মান করা
⚖️ নিয়ম-শৃঙ্খলা বজায় রাখা

— এগুলো তোমার নতুন দায়িত্ব। ✨

💫 তোমার নেতৃত্বে আমাদের
Group আরও সুন্দর ও সক্রিয় হোক! ❤️

╰━━━━━━━━━━━━━━━━━━━━╯
🏆 𝐂𝐨𝐧𝐠𝐫𝐚𝐭𝐮𝐥𝐚𝐭𝐢𝐨𝐧𝐬, 𝐀𝐝𝐦𝐢𝐧! 👑`,
          mentions: [target]
        });

        return;
      }

      /*
       * DEMOTE
       */
      if (command === '.demote') {
        const target = getMentionedUser(msg);

        if (!target) {
          await sock.sendMessage(jid, {
            text: '👤 একজন Admin-কে mention করুন:\n.demote @user'
          });
          return;
        }

        await sock.groupParticipantsUpdate(
          jid,
          [target],
          'demote'
        );

        await sock.sendMessage(jid, {
          text: `╭━━━〔 👤 𝐀𝐃𝐌𝐈𝐍 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 〕━━━╮

👋 @${target.split('@')[0]}-এর Admin
দায়িত্ব এখন থেকে শেষ করা হলো। 🌸

🤍 Group-এর জন্য দেওয়া সময়
ও সহযোগিতার জন্য ধন্যবাদ।

✨ সামনে থেকেও Group-এর
সাথে থেকো এবং ভালো থেকো।

╰━━━━━━━━━━━━━━━━━━━━╯
🌷 𝐓𝐡𝐚𝐧𝐤 𝐘𝐨𝐮 & 𝐑𝐞𝐬𝐩𝐞𝐜𝐭 🌷`,
          mentions: [target]
        });

        return;
      }

      /*
       * ADMINS
       */
      if (command === '.admins') {
        const metadata = await sock.groupMetadata(jid);

        const admins = metadata.participants.filter(
          p => p.admin === 'admin' || p.admin === 'superadmin'
        );

        const mentions = admins.map(p => p.id);

        const list = admins
          .map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`)
          .join('\n');

        await sock.sendMessage(jid, {
          text: `╭━━━〔 👑 GROUP ADMINS 〕━━━╮\n\n${list}\n\n╰━━━━━━━━━━━━━━━━━━╯`,
          mentions
        });

        return;
      }

      /*
       * GROUP INFO
       */
      if (command === '.groupinfo') {
        const metadata = await sock.groupMetadata(jid);

        const admins = metadata.participants.filter(
          p => p.admin === 'admin' || p.admin === 'superadmin'
        ).length;

        await sock.sendMessage(jid, {
          text: `╭━━━〔 ℹ️ GROUP INFO 〕━━━╮

👥 Name: ${metadata.subject}
👤 Members: ${metadata.participants.length}
👑 Admins: ${admins}
🛡️ Anti-Link: ${settings.antilink ? 'ON' : 'OFF'}
🔇 Muted: ${settings.muted.size}

╰━━━━━━━━━━━━━━━━━━╯`
        });

        return;
      }

    } catch (error) {
      console.log('Group Management Error:', error.message);
    }
  });

  sock.ev.on('connection.update', ({
    connection,
    lastDisconnect
  }) => {
    if (connection === 'open') {
      console.log('✅ WhatsApp Bot Connected!');

    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log('🔄 Reconnecting...');
        startBot();
      } else {
        console.log('❌ WhatsApp logged out.');
      }
    }
  });
}

startBot();
