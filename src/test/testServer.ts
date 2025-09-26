import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Ejemplos:
  http.get('/api/donations', () =>
    HttpResponse.json([{ id: 1, amount: 100 }])
  ),
  http.get('/api/castrations', () =>
    HttpResponse.json([{ id: 1, pet: 'Mishi' }])
  ),
];

export const server = setupServer(...handlers);