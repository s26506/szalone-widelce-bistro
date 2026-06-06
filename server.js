import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

app.use(express.json({ limit: '50mb' }));
// --- SECURITY OPTION ---
// Uncomment to enable password protection
/*
// app.use(basicAuth({
//     users: { 'admin': 'bistro123' },
//     challenge: true
// }));
*/

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- API ROUTES ---

// Helper for reading/writing JSON files safely
const safeReadJSON = (filePath, defaultValue) => {
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.error(`Error reading ${filePath}:`, e);
            return defaultValue;
        }
    }
    return defaultValue;
};

const safeWriteJSON = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`Error writing to ${filePath}:`, e);
        return false;
    }
};

// 1. Planner API
const plannerPath = path.join(DATA_DIR, 'planner.json');

app.get('/api/planner', (req, res) => {
    const data = safeReadJSON(plannerPath, {});
    res.json(data);
});

app.post('/api/planner', (req, res) => {
    if (safeWriteJSON(plannerPath, req.body)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to write planner file. Check write permissions.' });
    }
});

// 2. Subscription Planner API
const subPlannerPath = path.join(DATA_DIR, 'subscription_planner.json');

app.get('/api/subscription-planner', (req, res) => {
    const data = safeReadJSON(subPlannerPath, {});
    res.json(data);
});

app.post('/api/subscription-planner', (req, res) => {
    if (safeWriteJSON(subPlannerPath, req.body)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to write subscription planner file. Check write permissions.' });
    }
});

// 2.5 Board Planner API
const boardPlannerPath = path.join(DATA_DIR, 'board_planner.json');
app.get('/api/board-planner', (req, res) => {
    const data = safeReadJSON(boardPlannerPath, {});
    res.json(data);
});
app.post('/api/board-planner', (req, res) => {
    if (safeWriteJSON(boardPlannerPath, req.body)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to write board planner file. Check write permissions.' });
    }
});

// 3. Menu API
const menuPath = path.join(DATA_DIR, 'menu.json');

app.get('/api/menu', (req, res) => {
    const data = safeReadJSON(menuPath, []);
    res.json(data);
});

const capitalizeName = (name) => {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
};

app.post('/api/menu', (req, res) => {
    try {
        const newItem = req.body;
        let items = safeReadJSON(menuPath, []);

        // Generate ID if missing
        if (!newItem.id) {
            newItem.id = 'manual_' + Date.now();
        }
        // Normalize defaults
        newItem.isDaily = !!newItem.isDaily;
        newItem.isSubDaily = !!newItem.isSubDaily;

        // Auto-capitalize name
        if (newItem.name) {
            newItem.name = capitalizeName(newItem.name);
        }

        items.push(newItem);
        if (safeWriteJSON(menuPath, items)) {
            res.json({ success: true, item: newItem });
        } else {
            res.status(500).json({ error: 'Failed to save item. Check write permissions.' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to save item' });
    }
});

app.put('/api/menu', (req, res) => {
    try {
        const updatedItem = req.body;
        if (!updatedItem.id) {
            return res.status(400).json({ error: 'Missing id' });
        }

        let items = safeReadJSON(menuPath, []);
        const index = items.findIndex(i => i.id === updatedItem.id);

        if (index !== -1) {
            items[index] = { ...items[index], ...updatedItem };
            // Ensure defaults
            items[index].isDaily = !!items[index].isDaily;
            items[index].isSubDaily = !!items[index].isSubDaily;

            // Auto-capitalize name on update
            if (items[index].name) {
                items[index].name = capitalizeName(items[index].name);
            }

            if (safeWriteJSON(menuPath, items)) {
                res.json({ success: true, item: items[index] });
            } else {
                res.status(500).json({ error: 'Failed to update item. Check write permissions.' });
            }
        } else {
            res.status(404).json({ error: 'Item not found' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to update item' });
    }
});

app.delete('/api/menu', (req, res) => {
    const id = req.query.id;
    if (!id) {
        return res.status(400).json({ error: 'Missing id' });
    }

    let items = safeReadJSON(menuPath, []);
    const initialLength = items.length;
    items = items.filter(i => i.id !== id);

    if (items.length !== initialLength) {
        if (safeWriteJSON(menuPath, items)) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to delete item. Check write permissions.' });
        }
    } else {
        res.status(404).json({ error: 'Item not found' });
    }
});

app.post('/api/menu/reorder', (req, res) => {
    try {
        const { mode, orderedIds } = req.body; // mode: 'daily' | 'subDaily'
        if (!mode || !orderedIds || !Array.isArray(orderedIds)) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        let items = safeReadJSON(menuPath, []);

        // Create a map for O(1) lookup
        const orderMap = new Map(orderedIds.map((id, index) => [id, index]));

        items = items.map(item => {
            if (orderMap.has(item.id)) {
                if (mode === 'daily') {
                    return { ...item, dailyOrder: orderMap.get(item.id) };
                } else if (mode === 'subDaily') {
                    return { ...item, subDailyOrder: orderMap.get(item.id) };
                }
            }
            return item;
        });

        if (safeWriteJSON(menuPath, items)) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to reorder items. Check write permissions.' });
        }
    } catch (e) {
        console.error('Reorder error:', e);
        res.status(500).json({ error: 'Failed to reorder' });
    }
});

// --- STATIC FILES ---
// Serve the built app from 'dist'
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing: return index.html for any unknown route
app.use((req, res) => {
    // Only return index.html for GET requests that accept HTML
    if (req.method === 'GET' && req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        res.status(404).send('Not found');
    }
});

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    // Only open browser if not in production/VPS (optional check)
    // open(`http://localhost:${PORT}`).catch(() => {}); 
});
