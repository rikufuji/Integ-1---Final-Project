const amqp = require("amqplib");

const QUEUE = "boardease.payments";
let consumeChannel = null;
let publishChannel = null;

async function initRabbitMQ(io) {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    consumeChannel = await conn.createChannel();
    publishChannel = await conn.createChannel();
    await consumeChannel.assertQueue(QUEUE, { durable: true });
    await publishChannel.assertQueue(QUEUE, { durable: true });

    consumeChannel.consume(QUEUE, (msg) => {
      if (!msg) return;
      const data = JSON.parse(msg.content.toString());
      io.emit("payment_notification", data);
      consumeChannel.ack(msg);
    });

    console.log("[RabbitMQ] Connected — queue: boardease.payments");
  } catch {
    console.log("[RabbitMQ] Not available — payment notifications disabled");
  }
}

async function publishPaymentEvent(data) {
  if (!publishChannel) return;
  publishChannel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(data)), { persistent: true });
}

module.exports = { initRabbitMQ, publishPaymentEvent };
