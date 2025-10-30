import { query } from '@anthropic-ai/claude-agent-sdk';

async function testQuery() {
  console.log('Testing Claude Agent SDK query...\n');

  try {
    const response = await query({
      prompt: 'Say hello in exactly 5 words',
      options: {
        maxTurns: 1
      }
    });

    console.log('Response:', response);
    console.log('\nResponse type:', typeof response);
    console.log('Response keys:', Object.keys(response));

  } catch (error) {
    console.error('Error:', error);
  }
}

testQuery();
