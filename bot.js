require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');

const TOKEN = process.env.BOT_TOKEN;
const URL = process.env.RENDER_EXTERNAL_URL; // e.g. https://your-bot.onrender.com

const bot = new TelegramBot(TOKEN, { webHook: { port: process.env.PORT || 3000 } });
bot.setWebHook(`${URL}/bot${TOKEN}`);

const app = express();
app.use(express.json());
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get('/', (req, res) => res.send('Bot is running'));

// STEP-WISE SCRAPER FUNCTION
async function extractFinalDownloadLink(startUrl) {
  try {
    // Step 1: Initial page (like filmyfly.loan)
    const res1 = await axios.get(startUrl);
    const $1 = cheerio.load(res1.data);
    const nextUrl = $1('.dlbtn a').attr('href');

    if (!nextUrl) throw new Error('No linkmake.in found');

    // Step 2: Linkmake.in page
    const res2 = await axios.get(nextUrl);
    const $2 = cheerio.load(res2.data);
    const filesdlUrl = $2('.dlink a').eq(0).attr('href');

    if (!filesdlUrl) throw new Error('No filesdl link found');

    // Step 3: filesdl.in cloud page → get "Login To Download - GDFLIX"
    const res3 = await axios.get(filesdlUrl);
    const $3 = cheerio.load(res3.data);
    const gdflixLink = $3('a.button1[href*="gdflix"]').attr('href');

    if (!gdflixLink) throw new Error('No GDFLIX link found');

    // Step 4: Redirection page to gdflix.dad
    const res4 = await axios.get(gdflixLink);
    const redirectScript = res4.data.match(/location\.replace'([^']+)/);
    if (!redirectScript) throw new Error('No redirect URL from GDFLIX');

    const gdflixFinal = redirectScript[1];

    // Step 5: gdflix.dad page → get "Instant DL [10GBPS]" button
    const res5 = await axios.get(gdflixFinal);
    const $5 = cheerio.load(res5.data);
    const instantDL = $5('a.btn-danger[href*="instant"]').attr('href');

    if (!instantDL) throw new Error('No instant.busycdn link');

    // Step 6: Instant page → extract download URL from final script
    const res6 = await axios.get(instantDL);
    const $6 = cheerio.load(res6.data);
    const finalScript = res6.data.match(/getQueryParam'url';[\s\S]*?href = downloadUrl;/);
    const finalUrlMatch = res6.data.match(/oneclick-dl\.pages\.dev\/\?url=([^'"]+)/);
    if (finalUrlMatch) {
      return `https://oneclick-dl.pages.dev/?url=${finalUrlMatch[1]}`;
    }

    return '✅ Reached final page but could not extract final URL';
  } catch (e) {
    console.error(e);
    return `❌ Error: ${e.message}`;
  }
}

// BOT LOGIC
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `👋 Send me a movie post link to extract final download link.`);
});

bot.on('message', async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;

  if (!text.startsWith('http')) return;

  bot.sendMessage(chatId, '🔍 Scraping download link, please wait...');

  const finalLink = await extractFinalDownloadLink(text);
  bot.sendMessage(chatId, `🎯 Final Download Link:\n${finalLink}`);
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running...');
});
