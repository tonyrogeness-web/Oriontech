const payload = {
  token: "aura_secret_token_123456",
  account: "163086425",
  balance: 10000.0,
  equity: 10000.0,
  dailyProfit: 0.0,
  floatingPl: 0.0,
  totalProfit: 0.0,
  maxDrawdown: 0.0,
  status: "RUNNING",
  trades: [],
  history: []
};

async function test() {
  try {
    const res = await fetch("https://oriontech-mu.vercel.app/api/mt5/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

test();
