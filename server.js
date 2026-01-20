import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// 1. Planner API
const plannerPath = path.join(DATA_DIR, 'planner.json');

app.get('/api/planner', (req, res) => {
    const data = safeReadJSON(plannerPath, {});
    res.json(data);
});

app.post('/api/planner', (req, res) => {
    safeWriteJSON(plannerPath, req.body);
    res.json({ success: true });
});

// 2. Subscription Planner API
const subPlannerPath = path.join(DATA_DIR, 'subscription_planner.json');

app.get('/api/subscription-planner', (req, res) => {
    const data = safeReadJSON(subPlannerPath, {});
    res.json(data);
});

app.post('/api/subscription-planner', (req, res) => {
    safeWriteJSON(subPlannerPath, req.body);
    res.json({ success: true });
});

// 3. Menu API
const menuPath = path.join(DATA_DIR, 'menu.json');

app.get('/api/menu', (req, res) => {
    const data = safeReadJSON(menuPath, []);
    res.json(data);
});

const capitalizeName = (name) => {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
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
        safeWriteJSON(menuPath, items);

        res.json({ success: true, item: newItem });
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

            safeWriteJSON(menuPath, items);
            res.json({ success: true, item: items[index] });
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
        safeWriteJSON(menuPath, items);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Item not found' });
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
