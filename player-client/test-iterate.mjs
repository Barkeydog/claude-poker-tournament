import { query } from '@anthropic-ai/claude-agent-sdk';

async function testIteration() {
  console.log('Testing Claude Agent SDK iteration...\n');

  try {
    const q = await query({
      prompt: 'Respond with exactly: {"action": "call", "commentary": "Testing"}',
      options: {
        maxTurns: 1
      }
    });

    console.log('Iterating messages...\n');

    for await (const message of q.sdkMessages) {
      console.log('Message type:', message.constructor.name);
      console.log('Message:', JSON.stringify(message, null, 2));
      console.log('---');
    }

    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testIteration();
