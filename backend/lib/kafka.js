const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "boardease",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "boardease-messages" });

let kafkaReady = false;

async function initKafka(io) {
  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: "boardease.messages", fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        const data = JSON.parse(message.value.toString());
        io.to(data.room).emit("receive_message", data);
      },
    });
    kafkaReady = true;
    console.log("[Kafka] Connected — topic: boardease.messages");
  } catch {
    console.log("[Kafka] Not available — falling back to direct Socket.IO emit");
  }
}

async function publishMessage(data) {
  if (!kafkaReady) return false;
  await producer.send({
    topic: "boardease.messages",
    messages: [{ value: JSON.stringify(data) }],
  });
  return true;
}

module.exports = { initKafka, publishMessage };
