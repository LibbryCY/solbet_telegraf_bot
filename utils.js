const CoinGecko = require("coingecko-api");
const CoinGeckoClient = new CoinGecko();

async function getPrice(tokenName) {
  if (!tokenName || typeof tokenName !== "string") {
    console.error("Token name is required");
    return;
  }
  try {
    const response = await CoinGeckoClient.simple.price({
      ids: [tokenName],
      vs_currencies: ["usd"],
    });
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

module.exports = { getPrice };
