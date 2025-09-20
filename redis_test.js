const redis = require("redis");

const client = redis.createClient({
  url: "redis://127.0.0.1:6379"
});

client.on("error", (err) => console.log("Redis Client Error", err));

async function testRedis() {
  await client.connect();

  await client.set("nodeTest", "Hello Redis!");
  const value = await client.get("nodeTest");
  console.log("Value from Redis:", value);

  await client.quit();
}

testRedis();
