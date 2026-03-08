import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';

// Data Layer Abstraction
class CsvDataService {
  async fetchSalesData() {
    return new Promise((resolve, reject) => {
      const results = [];
      const csvPath = path.join(process.cwd(), 'public', 'data', 'sales_data.csv');

      if (!fs.existsSync(csvPath)) {
        return reject(new Error('Sales data file not found at ' + csvPath));
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
    return new SupabaseDataService();
  }
  return new CsvDataService();
};

export async function GET() {
  try {
    const dataService = getDataService();
    const data = await dataService.fetchSalesData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Data Fetch Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
