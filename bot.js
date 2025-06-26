const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cheerio = require("cheerio");

const bot = new TelegramBot("YOUR_BOT_TOKEN", { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text.trim();

  if (!url.startsWith("http")) {
    return bot.sendMessage(chatId, "Send a valid movie post URL.");
  }

  try {
    bot.sendMessage(chatId, "🔍 Processing...");

    // Step 1 ➜ Step 2
    const res1 = await axios.get(url);
    const $ = cheerio.load(res1.data);
    const step2 = $('a.d1').attr("href");

    // Step 2 ➜ Step 3
    const res2 = await axios.get(step2);
    const $2 = cheerio.load(res2.data);
    const step3 = $2(".dl a").first().attr("href"); // Pick 480p for example

    // Step 3 ➜ Step 4
    const res3 = await axios.get(step3);
    const $3 = cheerio.load(res3.data);
    const step4 = $3('a.button1[href*="gdflix"]').attr("href");

    // Step 4 ➜ Step 5 (redirect)
    const res4 = await axios.get(step4, { maxRedirects: 5 });
    const step5 = res4.request.res.responseUrl;

    // Step 5 ➜ Step 6
    const res5 = await axios.get(step5);
    const $5 = cheerio.load(res5.data);
    const step6 = $5('a.btn-danger[href*="instant"]').attr("href");

    // Step 6 ➜ Step 7
    const res6 = await axios.get(step6);
    const $6 = cheerio.load(res6.data);
    const js = res6.data;
    const finalUrlMatch = js.match(/getQueryParam'url';.*?return urlParams.get'url';/s);
    const finalUrl = new URL(step6).searchParams.get("url");

    if (finalUrl) {
      bot.sendMessage(chatId, `✅ Final Download Link:\n\n${finalUrl}`);
    } else {
      bot.sendMessage(chatId, "❌ Could not extract final download link.");
    }

  } catch (err) {
    console.error(err.message);
    bot.sendMessage(chatId, "❌ Error occurred while processing the link.");
  }
});
