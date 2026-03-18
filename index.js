require("dotenv").config();

const express = require("express");
const fs = require("fs");

const app = express();

const SHOP = "eskadastore54.myshopify.com";

let ACCESS_TOKEN = "";

// 🔥 TOKEN YÜKLE
try {
  const saved = require("./token.json");
  ACCESS_TOKEN = saved.access_token;
  console.log("TOKEN YÜKLENDİ ✅");
} catch {
  console.log("Token yok, ilk kurulum yapılacak...");
}

// 🔥 LANDING (SATIŞ SAYFASI)
app.get("/", (req, res) => {
  res.send(`
  <html>
    <head>
      <title>PriceBoost</title>
      <style>
        body { margin:0; font-family: Arial; background:#0f172a; color:white; }
        .wrap { max-width:900px; margin:auto; padding:60px 20px; }
        .card { background:#111827; border-radius:16px; padding:40px; }
        h1 { font-size:36px; }
        .btn { padding:14px 22px; border:none; border-radius:10px; cursor:pointer; font-size:16px; }
        .green { background:#22c55e; color:#022c22; font-weight:700; }
        .blue { background:#3b82f6; color:white; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <h1>🚀 PriceBoost</h1>
          <p>Tüm ürün fiyatlarını tek tıkla artır.</p>

          <br/>

          <a href="/auth"><button class="btn green">Install App</button></a>
          <a href="/panel"><button class="btn blue">Open Panel</button></a>
        </div>
      </div>
    </body>
  </html>
  `);
});

// 🔥 PANEL
app.get("/panel", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Panel</title>
        <style>
          body {
            font-family: Arial;
            background: #020617;
            color: white;
            text-align: center;
            padding-top: 100px;
          }
          button {
            padding: 15px 30px;
            margin: 10px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 16px;
          }
          .green { background: #22c55e; color:#022c22; }
          .blue { background: #3b82f6; }
        </style>
      </head>
      <body>

        <h1>🚀 Automation Panel</h1>

        <button class="blue" onclick="go('/products')">Ürünleri Gör</button>

        <button class="green" onclick="go('/increase-prices?p=10')">%10 Artır</button>
        <button class="green" onclick="go('/increase-prices?p=20')">%20 Artır</button>
        <button class="green" onclick="go('/increase-prices?p=50')">%50 Artır</button>

        <script>
          function go(url) {
            window.location.href = url;
          }
        </script>

      </body>
    </html>
  `);
});

// 🔥 AUTH
app.get("/auth", (req, res) => {
  const redirectUri = `${process.env.HOST}/auth/callback`;

  const installUrl =
    `https://${SHOP}/admin/oauth/authorize` +
    `?client_id=${process.env.SHOPIFY_API_KEY}` +
    `&scope=${process.env.SCOPES}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(installUrl);
});

// 🔥 CALLBACK
app.get("/auth/callback", async (req, res) => {
  const { code, shop } = req.query;

  if (!code || !shop) return res.send("Hata ❌");

  try {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    const data = await response.json();

    ACCESS_TOKEN = data.access_token;

    fs.writeFileSync(
      "token.json",
      JSON.stringify({ shop, access_token: data.access_token }, null, 2)
    );

    res.send(`<h1>Installed ✅</h1><a href="/panel">Panele git</a>`);
  } catch {
    res.send("Token error ❌");
  }
});

// 🔥 PRODUCTS
app.get("/products", async (req, res) => {
  const r = await fetch(
    `https://${SHOP}/admin/api/2024-01/products.json`,
    { headers: { "X-Shopify-Access-Token": ACCESS_TOKEN } }
  );
  const data = await r.json();

  res.send(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
});

// 🔥 PRICE UPDATE
app.get("/increase-prices", async (req, res) => {
  const percent = Number(req.query.p || 10);

  const r = await fetch(
    `https://${SHOP}/admin/api/2024-01/products.json`,
    { headers: { "X-Shopify-Access-Token": ACCESS_TOKEN } }
  );

  const { products } = await r.json();

  for (const p of products) {
    for (const v of p.variants) {
      const newPrice = (Number(v.price) * (1 + percent / 100)).toFixed(2);

      await fetch(
        `https://${SHOP}/admin/api/2024-01/variants/${v.id}.json`,
        {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": ACCESS_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ variant: { id: v.id, price: newPrice } }),
        }
      );
    }
  }

  res.send(`Fiyatlar %${percent} artırıldı ✅`);
});

app.listen(3000, () => {
  console.log("http://localhost:3000");
});