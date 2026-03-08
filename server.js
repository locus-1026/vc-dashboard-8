import express from 'express';
import cors from 'cors';
import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());

// Data Layer Abstraction
class CsvDataService {
  async fetchSalesData() {
    return new Promise((resolve, reject) => {
      const results = [];
      const csvPath = join(__dirname, 'public', 'data', 'sales_data.csv');

      if (!fs.existsSync(csvPath)) {
        return reject(new Error('Sales data file not found'));
      }

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });
  }
}

class SupabaseDataService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  async fetchSalesData() {
    const { data, error } = await this.supabase
      .from('sales_data')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  }
}

// Service Factory
const getDataService = () => {
  if (process.env.DATA_SOURCE === 'supabase' && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    console.log('Using Supabase Data Service');
    return new SupabaseDataService();
  }
  console.log('Using CSV Data Service');
  return new CsvDataService();
};

const dataService = getDataService();

app.get('/api/sales', async (req, res) => {
  try {
    const data = await dataService.fetchSalesData();
    res.json(data);
  } catch (error) {
    console.error('Data Fetch Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
