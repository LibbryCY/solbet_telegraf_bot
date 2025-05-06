const TelegramBot = require("node-telegram-bot-api");

// Zameniti sa tokenom koji ti je dao BotFather
const token = "7186386818:AAFQie514Fs-73wInZGPyGwUA3_xNj1A7Mc";
const bot = new TelegramBot(token, { polling: true });

let currentGame = {
  isActive: false,
  totalSol: 0,
  bets: [],
  endTime: null,
  timeRemaining: null,
};

function startBettingRound(chatId) {
  const totalSol = 0; // inicijalno nema uloga
  const duration = 5 * 60 * 1000; // 5 minuta u ms
  const endTime = Date.now() + duration;

  const updateMessage = () => {
    const timeLeftMs = endTime - Date.now();
    const timeLeftMin = Math.floor(timeLeftMs / 60000);
    const timeLeftSec = Math.floor((timeLeftMs % 60000) / 1000);

    const timeString =
      timeLeftMs > 0 ? `${timeLeftMin}m ${timeLeftSec}s` : `⏱️ Time is up!`;

    currentGame = {
      isActive: true,
      totalSol: totalSol,
      bets: [],
      endTime: endTime,
      timeRemaining: timeString,
    };

    const text = `🔥 A new 5-minute betting round has started!

      💰 Total SOL in pool: ${totalSol} SOL
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
  };

  updateMessage();

  setTimeout(() => {
    currentGame.isActive = false;

    // Determine the winner based on the bets and reset currentGame

    const resultText = `⏱️ Time is up! The betting round has ended.
      💰 Total SOL in pool: ${currentGame.totalSol} SOL

      🏆 The winner is: [winner's name] with a prediction of [winner's prediction]!

      Thank you for playing!
    `;

    bot.sendMessage(chatId, resultText);
  }, duration);
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

bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "betstart") {
    startBettingRound(chatId);
  } else if (data === "help") {
    bot.sendMessage(
      chatId,
      "ℹ️ Use /betstart ( or Start Game button) to begin. A poll will appear.\n Predict the SOL price with /bet [amount] [prediction] and win!\n\n💡 Example: /bet 10 50.00\n\n💰 The closest prediction wins!\n\n"
    );
  } else if (data === "status") {
    if (currentGame.isActive) {
      const timeLeftMs = currentGame.endTime - Date.now();
      const timeLeftMin = Math.floor(timeLeftMs / 60000);
      const timeLeftSec = Math.floor((timeLeftMs % 60000) / 1000);

      const timeString =
        timeLeftMs > 0 ? `${timeLeftMin}m ${timeLeftSec}s` : `⏱️ Time is up!`;

      const text = `📊 Current Game Status:

      💰 Total SOL in pool: ${currentGame.totalSol} SOL
      ⏳ Time remaining: ${timeString}\n`;
      for (let i = 0; i < currentGame.bets.length; i++) {
        text += `\nBet #${i + 1}: ${currentGame.bets[i].amount} SOL on ${
          currentGame.bets[i].prediction
        } by ${currentGame.bets[i].user}`;
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
    } else bot.sendMessage(chatId, "📊 No active game at the moment.");
  } else if (data === "menu") {
    showMenu(chatId);
  } else {
    bot.sendMessage(chatId, "❓ Unknown command. Please use /menu.");
  }

  bot.answerCallbackQuery(query.id);
});
