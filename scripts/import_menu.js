
import XLSX from 'xlsx';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MENU_PATH = join(__dirname, '../data/menu.json');
const EXCEL_PATH = join(__dirname, '../Zeszyt1.xlsx');

// Helper to capitalize first letter
const capitalize = (s) => {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
};

// Helper to normalize strings for comparison
const normalize = (s) => String(s).trim().toLowerCase();

async function importMenu() {
    console.log('Reading menu.json...');
    const menuRaw = fs.readFileSync(MENU_PATH, 'utf-8');
    const menuItems = JSON.parse(menuRaw);

    // Create a set of existing normalized names for duplicate checking
    const existingNames = new Set(menuItems.map(item => normalize(item.name)));

    // Find the max ID index to continue numbering
    let maxIdIndex = 0;
    menuItems.forEach(item => {
        if (item.id && item.id.startsWith('imported_')) {
            const num = parseInt(item.id.split('_')[1], 10);
            if (!isNaN(num) && num > maxIdIndex) {
                maxIdIndex = num;
            }
        }
    });
    console.log(`Current max ID index: ${maxIdIndex}`);

    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Read as JSON with headers
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Process rows
    let addedCount = 0;
    const errors = [];

    // Headers from inspection: 'nazwa', 'grupa towarowa', 'cena sprzedaży brutto', 'jednostka'

    for (const row of rows) {
        const rawName = row['nazwa'];
        if (!rawName) continue;

        const normalizedName = normalize(rawName);

        if (existingNames.has(normalizedName)) {
            // console.log(`Skipping duplicate: ${rawName}`);
            continue;
        }

        // It's a new item!
        maxIdIndex++;

        // Category mapping
        const rawCategory = row['grupa towarowa'] || '';
        const normCategory = normalize(rawCategory);
        let category = rawCategory; // Default to original

        if (normCategory === 'drugie dania' ||
            normCategory === 'dania na wage' ||
            normCategory === 'dania na wagę') {
            category = 'Dania';
        } else {
            // Check if we should capitalize the category if it seems to be a regular word
            category = capitalize(category);
        }

        // Portion mapping
        let portion = row['jednostka'] || '100g';
        if (portion === '100 gram') portion = '100g';

        const newItem = {
            id: `imported_${maxIdIndex}`,
            name: capitalize(rawName.trim()),
            description: "",
            price: parseFloat(row['cena sprzedaży brutto']) || 0,
            portion: portion,
            isVeg: false,
            isDaily: false,
            isSubDaily: false,
            category: category,
            image: "",
            // ommit dailyOrder/subDailyOrder for new generic items
        };

        menuItems.push(newItem);
        existingNames.add(normalizedName); // Add to set to prevent duplicates within the excel itself
        addedCount++;
    }

    console.log(`Processed. Added ${addedCount} new items.`);

    if (addedCount > 0) {
        console.log('Writing updated menu.json...');
        fs.writeFileSync(MENU_PATH, JSON.stringify(menuItems, null, 2), 'utf-8');
        console.log('Done.');
    } else {
        console.log('No new items to add.');
    }
}

importMenu().catch(err => console.error(err));
