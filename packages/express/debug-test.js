const express = require('express');
const request = require('supertest');
const { z } = require('zod');
const { initTRPC } = require('@trpc/server');
const { studioExpress } = require('./dist');

// Set up environment like the failing test
process.env.NODE_ENV = 'production';
process.env.TRPC_STUDIO_ENABLED = 'true';
delete process.env.TRPC_STUDIO_TOKEN;

console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  TRPC_STUDIO_ENABLED: process.env.TRPC_STUDIO_ENABLED,
  TRPC_STUDIO_TOKEN: process.env.TRPC_STUDIO_TOKEN,
});

// Create a simple router
const t = initTRPC.create();
const mockRouter = t.router({
  test: t.procedure
    .input(z.object({ value: z.string() }))
    .output(z.object({ result: z.string() }))
    .query(({ input }) => ({ result: input.value })),
});

// Create Express app
const app = express();
app.use(express.json());

const options = {
  router: mockRouter,
};

console.log('Options:', options);

app.use(studioExpress(options));

// Test the endpoint
async function test() {
  try {
    const response = await request(app).get('/trpc-studio');
    console.log('Response status:', response.status);
    console.log('Response text:', response.text.substring(0, 200) + '...');
  } catch (error) {
    console.error('Test error:', error);
  }
}

test();
