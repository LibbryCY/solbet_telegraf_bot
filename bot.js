const TelegramBot = require("node-telegram-bot-api");
const { getPrice } = require("./utils");
require("dotenv").config();

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

let currentGames = [];

function startBettingRound(chatId) {
  bot.sendMessage(
    chatId,
    `🪙 Choose a token for betting game!  

        Example: solana, bitcoin, ethereum, etc.
        
        `
  );
  let tokenName = "";

  bot.once("message", async (reply) => {
    const rep = reply.text;
    tokenName = rep.toLowerCase();
    let price = await getPrice(rep);

    if (!price || !price[tokenName]) {
      const options = {
        reply_markup: {
          inline_keyboard: [[{ text: "📋 Menu", callback_data: "menu" }]],
        },
      };
      bot.sendMessage(
        chatId,
        "❌ Invalid token name. Please try again.",
        options
      );
      return;
    }

    const totalTokens = 0;
    const duration = 5 * 60 * 1000; // 5 min
    const endTime = Date.now() + duration;

    const timeLeftMs = endTime - Date.now();
    const timeLeftMin = Math.floor(timeLeftMs / 60000);
    const timeLeftSec = Math.floor((timeLeftMs % 60000) / 1000);

    const timeString =
      timeLeftMs > 0 ? `${timeLeftMin}m ${timeLeftSec}s` : `⏱️ Time is up!`;

    let newGame = {
      isActive: true,
      tokenName: tokenName,
      totalTokens: totalTokens,
      bets: [],
      endTime: endTime,
      timeRemaining: timeString,
    };

    currentGames.push(newGame);

    const text = `🔥 A new 5-minute betting round has started!
      📈 Token: ${tokenName.toUpperCase()}
      💰 Total tokens in pool: ${totalTokens} 
      ⏳ Time remaining: ${timeString}

      📥 To place a prediction, use:
      /bet [amount] [prediction]

      Example: /bet 0.5 145.23`;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ℹ️ Help", callback_data: "help" }],
          [{ text: "📊 Status", callback_data: "status" }],
          [{ text: "📋 Menu", callback_data: "menu" }],
        ],
      },
    };

    bot.sendMessage(chatId, text, options);

    setTimeout(
      () => finishGame(chatId, newGame, currentGames.length),
      duration
    );
  });
}

function finishGame(chatId, game, gameIndex) {
  game.isActive = false;
  console.log("Game finished:", game);
  // Determine the winner based on the bets and reset currentGame

  const resultText = `⏱️ Time is up! The betting round has ended.
      💰 Total SOL in pool: ${game.totalTokens} SOL

      🏆 The winner is: [winner's name] with a prediction of [winner's prediction]!

      Thank you for playing!
    `;

  currentGames = currentGames.filter((g, index) => index !== gameIndex);

  bot.sendMessage(chatId, resultText);
}

function showStatus(chatId) {
  if (currentGames.length === 0) {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📊 Status", callback_data: "status" }],
          [{ text: "📋 Menu", callback_data: "menu" }],
        ],
      },
    };
    bot.sendMessage(chatId, "📊 No active game at the moment.", options);
  } else {
    for (i = 0; i < currentGames.length; i++) {
      const currentGame = currentGames[i];
      if (currentGame.isActive) {
        const timeLeftMs = currentGame.endTime - Date.now();
        const timeLeftMin = Math.floor(timeLeftMs / 60000);
        const timeLeftSec = Math.floor((timeLeftMs % 60000) / 1000);

        const timeString =
          timeLeftMs > 0 ? `${timeLeftMin}m ${timeLeftSec}s` : ` Time is up!`;

        let text = `📊 Current Game Status:
    
          💰 Total tokens in pool: ${currentGame.totalTokens} 
          ⏳ Time remaining: ${timeString}\n`;
        for (let i = 0; i < currentGame.bets.length; i++) {
          text += `\nBet #${i + 1}: ${currentGame.bets[i].amount} ${
            currentGame.tokenName
          } on ${currentGame.bets[i].prediction} by ${
            currentGame.bets[i].user
          }`;
        }

        const options = {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📊 Status", callback_data: "status" }],
              [{ text: "📋 Menu", callback_data: "menu" }],
            ],
          },
        };

        bot.sendMessage(chatId, text, options);
      }
    }
  }
}

function showMenu(chatId) {
  const menuText = `📌 Available commands:

  /betstart – Start a new 5-minute betting round  
  /help – Show game instructions  
  /status – View current game status  
  /menu – Show this menu again

  🗳 When a game starts, a poll will be posted where you can vote on the future SOL price.  
  💰 To participate, vote in the poll (your vote is your prediction).  
  🏆 After 5 minutes, the bot will determine who was closest and award the winner!`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎯 Start Game", callback_data: "betstart" }],
        [{ text: "ℹ️ Help", callback_data: "help" }],
        [{ text: "📊 Status", callback_data: "status" }],
        [{ text: "📋 Menu", callback_data: "menu" }],
      ],
    },
  };

  bot.sendMessage(chatId, menuText, options);
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const options = {
    reply_markup: {
      inline_keyboard: [[{ text: "📋 Menu", callback_data: "menu" }]],
    },
  };

  bot.sendMessage(
    chatId,
    "🎲 Welcome to Solana Bet Bot! 🚀\n\nPlace your bets with $SOL or other SPL tokens in this group! Fast, fun, and fully on-chain.\n\n🔹 How to play?\n\n1. Send /bet [amount] [prediction]\n2. Wait for others to join\n3. The bot settles winners automatically!\n\n💰 Win big, pay fast – all powered by Solana!\n\nType /menu for options. Let's roll! 🎯",
    options
  );
});

bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  showMenu(chatId);
});

bot.onText(/\/bet /, (msg) => {});

bot.onText(/\/betstart/, (msg) => {
  const chatId = msg.chat.id;
  startBettingRound(chatId);
});

bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "betstart") {
    startBettingRound(chatId);
  } else if (data === "help") {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📊 Status", callback_data: "status" }],
          [{ text: "📋 Menu", callback_data: "menu" }],
        ],
      },
    };

    bot.sendMessage(
      chatId,
      "ℹ️ Use /betstart ( or Start Game button) to begin. A poll will appear.\n Predict the SOL price with /bet [amount] [prediction] and win!\n\n💡 Example: /bet 10 50.00\n\n💰 The closest prediction wins!\n\n",
      options
    );
  } else if (data === "status") {
    showStatus(chatId);
  } else if (data === "menu") {
    showMenu(chatId);
  } else {
    bot.sendMessage(chatId, "❓ Unknown command. Please use /menu.");
  }

  bot.answerCallbackQuery(query.id);
});
