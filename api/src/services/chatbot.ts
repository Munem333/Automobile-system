import { prisma } from '../lib/prisma';

const BOT_NAME = 'AutoHub Assistant';

type BotIntent = {
  keywords: string[];
  reply: string;
};

const INTENTS: BotIntent[] = [
  {
    keywords: ['hello', 'hi', 'hey', 'assalam', 'salam', 'help', 'start'],
    reply: 'Hello! I can help you with cars, parts, service bookings, delivery, and order tracking. What would you like to know?',
  },
  {
    keywords: ['car', 'cars', 'vehicle', 'suv', 'sedan', 'toyota', 'hyundai', 'nissan', 'buy car', 'new car'],
    reply: 'Browse our car catalog at autohub.bd/cars — Toyota, Hyundai, and Nissan models with transparent BDT pricing. Would you like a specific brand or model?',
  },
  {
    keywords: ['price', 'cost', 'how much', 'budget', 'afford', 'emi', 'loan'],
    reply: 'Car prices are listed in BDT (৳) on each product page. We carry models from around ৳16 lakh to ৳72 lakh. Tell me a model name and I can point you to it.',
  },
  {
    keywords: ['part', 'parts', 'accessory', 'accessories', 'brake', 'engine', 'oil', 'filter', 'tire', 'wheel'],
    reply: 'Shop genuine parts at autohub.bd/parts — filter by category (Engine, Brakes, Electronics, etc.) or search by part number. Share your car model if you need compatibility help.',
  },
  {
    keywords: ['service', 'appointment', 'book', 'maintenance', 'repair', 'workshop', 'servicing'],
    reply: 'Book a service appointment at autohub.bd/service — we have centers in Dhaka, Chittagong, and Sylhet. Free inspection is available this month.',
  },
  {
    keywords: ['delivery', 'shipping', 'deliver', 'how long', 'when will', 'arrive'],
    reply: 'Parts: 2–3 business days in Dhaka, 5–7 days outside Dhaka. Cars require a scheduled handover appointment after payment confirmation.',
  },
  {
    keywords: ['payment', 'pay', 'bkash', 'nagad', 'card', 'cod', 'cash'],
    reply: 'We accept bKash, Nagad, SSLCommerz (cards/mobile banking), and Cash on Delivery for parts under ৳50,000.',
  },
  {
    keywords: ['track', 'order status', 'order number', 'where is my', 'my order'],
    reply: 'Track your order at autohub.bd/support#track — enter your order number and the phone or email used at checkout.',
  },
  {
    keywords: ['return', 'refund', 'exchange', 'warranty'],
    reply: 'Parts carry a manufacturer warranty. For returns or exchanges, contact us within 7 days of delivery with your order number at care@autohub.bd.',
  },
  {
    keywords: ['contact', 'phone', 'call', 'email', 'whatsapp', 'reach'],
    reply: 'Reach us at 09612-345678, care@autohub.bd, or use WhatsApp from the Support page. Our team is available Sat–Thu, 9 AM–6 PM.',
  },
  {
    keywords: ['human', 'agent', 'person', 'representative', 'talk to someone', 'real person', 'support agent'],
    reply: 'I\'ll connect you with a support agent. Please share your name and mobile number using the form below, and someone will join this chat shortly.',
  },
  {
    keywords: ['hour', 'open', 'timing', 'available', 'closed'],
    reply: 'We\'re open Saturday–Thursday, 9:00 AM – 6:00 PM (BST). Live agents respond during business hours; I\'m available anytime.',
  },
  {
    keywords: ['thank', 'thanks', 'dhonnobad'],
    reply: 'You\'re welcome! Is there anything else I can help you with?',
  },
  {
    keywords: ['bye', 'goodbye', 'see you'],
    reply: 'Goodbye! Drive safe. Come back anytime — I\'m always here to help.',
  },
];

function normalize(text: string) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchIntent(message: string): string | null {
  const text = normalize(message);
  if (!text) return null;

  for (const intent of INTENTS) {
    if (intent.keywords.some((kw) => text.includes(kw))) {
      return intent.reply;
    }
  }
  return null;
}

async function matchFaq(message: string): Promise<string | null> {
  const text = normalize(message);
  const faqs = await prisma.faqItem.findMany({
    select: { question: true, answer: true },
    take: 50,
  });

  for (const faq of faqs) {
    const q = normalize(faq.question);
    const words = q.split(' ').filter((w) => w.length > 3);
    const hits = words.filter((w) => text.includes(w)).length;
    if (hits >= 2 || text.includes(q.slice(0, 20))) {
      return faq.answer;
    }
  }
  return null;
}

export async function getChatbotResponse(message: string): Promise<string> {
  const intent = matchIntent(message);
  if (intent) return intent;

  const faq = await matchFaq(message);
  if (faq) return faq;

  return 'I\'m not sure I understood that. You can ask about cars, parts, service booking, delivery, payments, or order tracking. Type "talk to agent" to reach our support team.';
}

export async function createBotWelcomeMessage(sessionId: string) {
  return prisma.chatMessage.create({
    data: {
      sessionId,
      senderType: 'SYSTEM',
      senderName: BOT_NAME,
      content: 'Hello! I\'m the AutoHub Assistant. Ask me about cars, parts, service bookings, delivery, or orders — or tap a quick reply below.',
    },
  });
}

export async function createBotReply(sessionId: string, content: string) {
  return prisma.chatMessage.create({
    data: {
      sessionId,
      senderType: 'SYSTEM',
      senderName: BOT_NAME,
      content,
    },
  });
}

export async function sessionHasAgentReply(sessionId: string): Promise<boolean> {
  const agentMsg = await prisma.chatMessage.findFirst({
    where: { sessionId, senderType: 'AGENT' },
  });
  return !!agentMsg;
}

export async function shouldBotReply(sessionId: string): Promise<boolean> {
  if (await sessionHasAgentReply(sessionId)) return false;

  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) return false;

  // Guest provided contact info for human handoff
  if (!session.userId && session.guestPhone && session.guestName !== 'Visitor') {
    return false;
  }

  return true;
}

export { BOT_NAME };
