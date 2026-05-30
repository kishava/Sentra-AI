export type MarketAssetKind = "crypto" | "stock";

export type MarketAssetDef = {
  id: string;
  name: string;
  symbol: string;
  kind: MarketAssetKind;
  color: string;
  coingeckoId?: string;
  yahooSymbol?: string;
};

/** Popular crypto + mega-cap equities — compared on indexed 7d performance (base 100). */
export const MARKET_ASSETS: MarketAssetDef[] = [
  { id: "btc", name: "Bitcoin", symbol: "BTC", kind: "crypto", coingeckoId: "bitcoin", color: "#53f4ff" },
  { id: "eth", name: "Ethereum", symbol: "ETH", kind: "crypto", coingeckoId: "ethereum", color: "#a855f7" },
  { id: "sol", name: "Solana", symbol: "SOL", kind: "crypto", coingeckoId: "solana", color: "#4ade80" },
  { id: "bnb", name: "BNB", symbol: "BNB", kind: "crypto", coingeckoId: "binancecoin", color: "#fbbf24" },
  { id: "xrp", name: "XRP", symbol: "XRP", kind: "crypto", coingeckoId: "ripple", color: "#94a3b8" },
  { id: "aapl", name: "Apple", symbol: "AAPL", kind: "stock", yahooSymbol: "AAPL", color: "#60a5fa" },
  { id: "msft", name: "Microsoft", symbol: "MSFT", kind: "stock", yahooSymbol: "MSFT", color: "#818cf8" },
  { id: "nvda", name: "NVIDIA", symbol: "NVDA", kind: "stock", yahooSymbol: "NVDA", color: "#ff4fd8" },
  { id: "googl", name: "Alphabet", symbol: "GOOGL", kind: "stock", yahooSymbol: "GOOGL", color: "#fb7185" },
  { id: "amzn", name: "Amazon", symbol: "AMZN", kind: "stock", yahooSymbol: "AMZN", color: "#f97316" },
];
