import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/planner', (req, res, next) => {
            const plannerPath = path.resolve(__dirname, 'data/planner.json');
            handlePlannerRequest(req, res, next, plannerPath);
          });

          server.middlewares.use('/api/subscription-planner', (req, res, next) => {
            const plannerPath = path.resolve(__dirname, 'data/subscription_planner.json');
            handlePlannerRequest(req, res, next, plannerPath);
          });

          // Menu API
          server.middlewares.use('/api/menu', (req, res, next) => {
            const menuPath = path.resolve(__dirname, 'data/menu.json');

            if (req.method === 'GET') {
              if (fs.existsSync(menuPath)) {
                const data = fs.readFileSync(menuPath, 'utf8');
                res.setHeader('Content-Type', 'application/json');
                res.end(data);
              } else {
                res.setHeader('Content-Type', 'application/json');
                res.end('[]');
              }
              return;
            }

            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', () => {
                try {
                  const newItem = JSON.parse(body);
                  let items = [];
                  if (fs.existsSync(menuPath)) {
                    items = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
                  }
                  // Generate ID if missing (simple fallback)
                  if (!newItem.id) {
                    newItem.id = 'manual_' + Date.now();
                  }
                  // Normalize defaults
                  newItem.isDaily = !!newItem.isDaily;
                  newItem.isSubDaily = !!newItem.isSubDaily;

                  items.push(newItem);
                  fs.writeFileSync(menuPath, JSON.stringify(items, null, 2));

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, item: newItem }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Failed to save item' }));
                }
              });
              return;
            }

            if (req.method === 'DELETE') {
              const url = new URL(req.url, `http://${req.headers.host}`);
              const id = url.searchParams.get('id');
              if (!id) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing id' }));
                return;
              }

              if (fs.existsSync(menuPath)) {
                let items = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
                const initialLength = items.length;
                items = items.filter(i => i.id !== id);

                if (items.length !== initialLength) {
                  fs.writeFileSync(menuPath, JSON.stringify(items, null, 2));
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true }));
                } else {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Item not found' }));
                }
              } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'File not found' }));
              }
              return;
            }

            if (req.method === 'PUT') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', () => {
                try {
                  const updatedItem = JSON.parse(body);
                  if (!updatedItem.id) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Missing id' }));
                    return;
                  }

                  if (fs.existsSync(menuPath)) {
                    let items = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
                    const index = items.findIndex(i => i.id === updatedItem.id);

                    if (index !== -1) {
                      // Merge existing with updates
                      items[index] = { ...items[index], ...updatedItem };
                      // Ensure defaults
                      items[index].isDaily = !!items[index].isDaily;
                      items[index].isSubDaily = !!items[index].isSubDaily;

                      fs.writeFileSync(menuPath, JSON.stringify(items, null, 2));
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ success: true, item: items[index] }));
                    } else {
                      res.statusCode = 404;
                      res.end(JSON.stringify({ error: 'Item not found' }));
                    }
                  } else {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ error: 'File not found' }));
                  }
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Failed to update item' }));
                }
              });
              return;
            }

            next();
          });

          function handlePlannerRequest(req, res, next, plannerPath) {
            if (req.method === 'GET') {
              if (fs.existsSync(plannerPath)) {
                const data = fs.readFileSync(plannerPath, 'utf-8');
                res.setHeader('Content-Type', 'application/json');
                res.end(data);
              } else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({}));
              }
              return;
            }

            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', () => {
                // Ensure directory exists
                const dir = path.dirname(plannerPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                fs.writeFileSync(plannerPath, body);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              });
              return;
            }

            next();
          }
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
