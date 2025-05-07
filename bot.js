const TelegramBot = require("node-telegram-bot-api");
const { getPrice } = require("./utils");
require("dotenv").config();

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

let currentGames = {};
let gameId = 0;
let awaitingTokenInput = {}; // chatId => true/false

function startBettingRound(chatId) {
  awaitingTokenInput[chatId] = true; // označi da čekamo token

  bot.sendMessage(
    chatId,
    `🪙 *Choose a token to bet on:*
Solana, Bitcoin, Ethereum, etc.

📌 _Type the token name below to continue..._`,
    { parse_mode: "Markdown" }
  );
  let tokenName = "";

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    if (!awaitingTokenInput[chatId]) return;

    const rep = msg.text.trim();
    const tokenName = rep.toLowerCase();
    const price = await getPrice(tokenName);

    if (!price || !price[tokenName]) {
      bot.sendMessage(chatId, "❌ Invalid token name. Please try again.", {
        reply_markup: {
          inline_keyboard: [[{ text: "📋 Menu", callback_data: "menu" }]],
        },
      });

      return;
    }

    awaitingTokenInput[chatId] = false;
    const totalTokens = 0;
    const duration = 5 * 60 * 1000;
    const endTime = Date.now() + duration;

    const newGame = {
      id: gameId++,
      isActive: true,
      tokenName,
      totalTokens,
      bets: [],
      endTime,
    };

    currentGames[newGame.id] = newGame;

    const timeString = `5m 0s`;

    const text = `🔥 A new 5-minute betting round has started!
  📈 Token: ${tokenName.toUpperCase()}
  💰 Total tokens in pool: ${totalTokens} 
  ⏳ Time remaining: ${timeString}
  
  📥 To place a prediction, use:
  /bet [gameId] [amount] [prediction] (long or short)
  
  Example: /bet ${newGame.id} 0.5 long`;

    bot.sendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ℹ️ Help", callback_data: "help" }],
          [{ text: "📊 Status", callback_data: "status" }],
          [{ text: "📋 Menu", callback_data: "menu" }],
        ],
      },
    });

    setTimeout(() => finishGame(chatId, newGame), duration);
  });
}

function finishGame(chatId, game) {
  game.isActive = false;
  console.log("Game finished:", game);
  // Determine the winner based on the bets and reset currentGame

  const resultText = `⏱️ Time is up! The betting round has ended.
      🔥 Game ID: ${game.id}
      📈 Token: ${game.tokenName.toUpperCase()}
      💰 Total tokens in pool: ${game.totalTokens} tokens

      🏆 Congratulations to all who went 📈 LONG — you predicted the price increase correctly!
      🏆 Congratulations to all who went 📉 SHORT — you predicted the price decrease correctly!

      Thank you for playing!
    `;

  delete currentGames[game.id];

  bot.sendMessage(chatId, resultText);
}

function showStatus(chatId) {
  console.log(Object.keys(currentGames).length);
  if (Object.keys(currentGames).length === 0) {
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
    for (const [gameId, currentGame] of Object.entries(currentGames)) {
      if (currentGame.isActive) {
        const timeLeftMs = currentGame.endTime - Date.now();
        const timeLeftMin = Math.floor(timeLeftMs / 60000);
        const timeLeftSec = Math.floor((timeLeftMs % 60000) / 1000);

        const timeString =
          timeLeftMs > 0 ? `${timeLeftMin}m ${timeLeftSec}s` : ` Time is up!`;

        let text = `📊 Current Game Status:
          🔥 Game ID: ${currentGame.id}
          📈 Token: ${currentGame.tokenName.toUpperCase()}
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

  🗳 When a game starts, a poll will be posted where you can vote on the future token price.  
  💰 To participate, vote in the poll (your vote is your prediction).  
  🏆 After 5 minutes, the bot will determine who was right and award the winners!`;

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

function placeBet(chatId, user, gameId, amount, prediction) {
  if (Object.keys(currentGames).length === 0) {
    bot.sendMessage(
      chatId,
      "❌ No active game with ID. Please start a new game."
    );
    return;
  }

  const game = currentGames[gameId];
  if (!game || !game.isActive) {
    bot.sendMessage(chatId, `❌ No active game with ID ${gameId}.`);
    return;
  }
  if (amount <= 0) {
    bot.sendMessage(chatId, "❌ Invalid bet amount. Must be greater than 0.");
    return;
  }

  if (prediction !== "long" && prediction !== "short") {
    bot.sendMessage(chatId, "❌ Invalid prediction. Use 'long' or 'short'.");
    return;
  }
  let bet = {
    user: user,
    amount: amount,
    prediction: prediction,
  };

  game.bets.push(bet);
  game.totalTokens += parseFloat(amount);

  bot.sendMessage(
    chatId,
    `✅ Bet placed! Amount: ${amount} ${game.tokenName}, Prediction: ${prediction} by ${user}.`
  );
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
    "🎲 Welcome to Solana Bet Bot! 🚀\n\nPlace your bets with $SOL in this group! Fast, fun, and fully on-chain.\n\n🔹 How to play?\n\n1. Send /bet [gameId] [amount] [prediction]\n2. Wait for others to join\n3. The bot settles winners automatically!\n\n💰 Win big, pay fast – all powered by Solana!\n\nType /menu for options. Let's roll! 🎯",
    options
  );
});

bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  showMenu(chatId);
});

bot.onText(/\/bet (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const user =
    msg.from.username ||
    `${msg.from.first_name} ${msg.from.last_name || ""}`.trim();

  const input = match[1].trim().split(" ");
  if (input.length !== 3) {
    return bot.sendMessage(
      chatId,
      "❌ Invalid format.\nUse /bet [gameId] [amount in SOL] [prediction]\nExample: /bet 1 0.5 short"
    );
  }
  placeBet(chatId, user, parseInt(input[0]), parseFloat(input[1]), input[2]);
});

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
      "ℹ️ Use /betstart ( or Start Game button) to begin. A poll will appear.\n Predict the token price with /bet [gameId] [amount] [prediction] and win!\n\n💡 Example: /bet 1 10 50.00\n\n💰 The closest prediction wins!\n\n",
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
