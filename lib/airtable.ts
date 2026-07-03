import Airtable from 'airtable';
import fs from 'fs';
import path from 'path';

// Load credentials from environment
const apiKey = process.env.AIRTABLE_API_KEY || '';
const baseId = process.env.AIRTABLE_BASE_ID || '';

const isAirtableConfigured = apiKey.trim() !== '' && baseId.trim() !== '';

// Initialize Airtable base if configured
const base = isAirtableConfigured ? new Airtable({ apiKey }).base(baseId) : null;

// Local JSON file database fallback path
const dbFilePath = path.join(process.cwd(), 'db.json');

// Global in-memory state fallback for read-only environments
let inMemoryDb: any = null;

// Helper to generate the initial seed state
function getInitialDbState() {
  const seedDate = new Date();
  seedDate.setDate(seedDate.getDate() + 3);
  if (seedDate.getDay() === 0) seedDate.setDate(seedDate.getDate() + 2);
  if (seedDate.getDay() === 1) seedDate.setDate(seedDate.getDate() + 1);

  return {
    bookings: [
      {
        id: "AE-2026-F982",
        name: "Eleanor Sterling",
        phone: "(212) 555-0198",
        email: "eleanor.s@vogue.com",
        date: seedDate.toISOString().split('T')[0],
        time: "7:00 PM",
        guests: 2,
        seatType: "banquette",
        upgrades: ["upgrade-cellar"],
        occasion: "Date Night",
        dietary: "No shellfish, please.",
        status: "confirmed",
        notes: "Prefers quiet corner. Regular guest.",
        createdAt: new Date().toISOString()
      }
    ],
    orders: [
      {
        id: "ORD-2026-892182",
        name: "Eleanor Sterling",
        phone: "(212) 555-0198",
        email: "eleanor.s@vogue.com",
        fulfillment_type: "delivery",
        address: "Avenue of the Americas, Vogue Tower, NYC",
        items: "1x The Aether Caviar & Champagne Box",
        subtotal: 245,
        total: 260,
        instructions: "Please leave with front desk.",
        status: "pending",
        createdAt: new Date().toISOString()
      }
    ],
    booking_history: [],
    gift_vouchers: [
      {
        voucher_code: "ATH-GIFT-E91B",
        recipient: "Julian Vance",
        sender: "Eleanor Sterling",
        package_id: "gift-2",
        message: "An invitation to experience a symphony of micro-seasons at Aether NYC.",
        status: "active",
        createdAt: new Date().toISOString()
      }
    ]
  };
}

// Helper to load local database state
function loadLocalDb() {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  const activeDbPath = process.env.VERCEL ? path.join('/tmp', 'db.json') : dbFilePath;

  try {
    if (!fs.existsSync(activeDbPath)) {
      const initialState = getInitialDbState();
      fs.writeFileSync(activeDbPath, JSON.stringify(initialState, null, 2));
      inMemoryDb = initialState;
      return initialState;
    }
    
    const raw = fs.readFileSync(activeDbPath, 'utf8');
    inMemoryDb = JSON.parse(raw);
    
    // Defensive initialization of keys
    if (!inMemoryDb.bookings) inMemoryDb.bookings = [];
    if (!inMemoryDb.orders) inMemoryDb.orders = [];
    if (!inMemoryDb.booking_history) inMemoryDb.booking_history = [];
    if (!inMemoryDb.gift_vouchers) inMemoryDb.gift_vouchers = [];
    
    return inMemoryDb;
  } catch (e) {
    console.warn("Local db read/write failed, using in-memory fallback:", e);
    if (!inMemoryDb) {
      inMemoryDb = getInitialDbState();
    }
    // Ensure fallback also has keys
    if (inMemoryDb) {
      if (!inMemoryDb.bookings) inMemoryDb.bookings = [];
      if (!inMemoryDb.orders) inMemoryDb.orders = [];
      if (!inMemoryDb.booking_history) inMemoryDb.booking_history = [];
      if (!inMemoryDb.gift_vouchers) inMemoryDb.gift_vouchers = [];
    }
    return inMemoryDb;
  }
}

// Helper to write local database state
function saveLocalDb(data: any) {
  inMemoryDb = data;
  const activeDbPath = process.env.VERCEL ? path.join('/tmp', 'db.json') : dbFilePath;

  try {
    fs.writeFileSync(activeDbPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn("Local db write failed, changes kept in memory:", e);
  }
}

// Map Airtable record to Booking object
function mapRecordToBooking(record: any) {
  const f = record.fields;
  let upgradesArray: string[] = [];
  if (f.upgrades) {
    if (Array.isArray(f.upgrades)) {
      upgradesArray = f.upgrades;
    } else if (typeof f.upgrades === 'string') {
      try {
        upgradesArray = JSON.parse(f.upgrades);
      } catch {
        upgradesArray = f.upgrades.split(',').map((x: string) => x.trim());
      }
    }
  }
  return {
    id: f.id || '',
    name: f.name || '',
    phone: f.phone || '',
    email: f.email || '',
    date: f.date || '',
    time: f.time || '',
    guests: Number(f.guests) || 1,
    seatType: f.seat_type || '',
    upgrades: upgradesArray,
    occasion: f.occasion || '',
    dietary: f.dietary || '',
    status: f.status || 'confirmed',
    notes: f.notes || '',
    createdAt: f.created_at || record.createdTime || ''
  };
}

// Map Airtable record to Order object
function mapRecordToOrder(record: any) {
  const f = record.fields;
  return {
    id: f.order_id || '',
    name: f.name || '',
    phone: f.phone || '',
    email: f.email || '',
    fulfillment_type: f.fulfillment_type || 'pickup',
    address: f.address || '',
    items: f.items || '',
    subtotal: Number(f.subtotal) || 0,
    total: Number(f.total) || 0,
    instructions: f.instructions || '',
    status: f.status || 'pending',
    createdAt: f.created_at || record.createdTime || ''
  };
}

// Map Airtable record to Booking History object
function mapRecordToHistory(record: any) {
  const f = record.fields;
  return {
    booking_id: f.booking_id || '',
    action: f.action || '',
    original_date: f.original_date || '',
    original_time: f.original_time || '',
    new_date: f.new_date || '',
    new_time: f.new_time || '',
    reason: f.reason || '',
    timestamp: f.timestamp || record.createdTime || ''
  };
}

// Map Airtable record to Gift Voucher object
function mapRecordToVoucher(record: any) {
  const f = record.fields;
  return {
    voucher_code: f.voucher_code || '',
    recipient: f.recipient || '',
    sender: f.sender || '',
    package_id: f.package_id || '',
    message: f.message || '',
    status: f.status || 'active',
    createdAt: f.created_at || record.createdTime || ''
  };
}

// ==================== EXPORTED API FUNCTIONS ====================

// --- BOOKINGS ---
export async function getBookings(): Promise<any[]> {
  if (base) {
    try {
      const records = await base('Bookings').select({ sort: [{ field: 'created_at', direction: 'desc' }] }).all();
      return records.map(mapRecordToBooking);
    } catch (e) {
      console.error("Airtable getBookings error, using local fallback:", e);
    }
  }
  const db = loadLocalDb();
  return db.bookings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getBookingById(id: string): Promise<any | null> {
  if (base) {
    try {
      const records = await base('Bookings').select({
        filterByFormula: `{id} = '${id}'`,
        maxRecords: 1
      }).firstPage();
      if (records.length > 0) {
        return mapRecordToBooking(records[0]);
      }
      return null;
    } catch (e) {
      console.error("Airtable getBookingById error, using local fallback:", e);
    }
  }
  const db = loadLocalDb();
  return db.bookings.find((b: any) => b.id.toUpperCase() === id.toUpperCase()) || null;
}

export async function createBooking(booking: any): Promise<boolean> {
  if (base) {
    try {
      await base('Bookings').create([
        {
          fields: {
            id: booking.id,
            name: booking.name,
            phone: booking.phone,
            email: booking.email.toLowerCase(),
            date: booking.date, // format YYYY-MM-DD
            time: booking.time,
            guests: Number(booking.guests),
            seat_type: booking.seatType,
            upgrades: Array.isArray(booking.upgrades) ? booking.upgrades.join(', ') : booking.upgrades || '',
            occasion: booking.occasion || 'None',
            dietary: booking.dietary || '',
            status: booking.status || 'confirmed',
            notes: booking.notes || '',
            created_at: new Date().toISOString()
          }
        }
      ]);
      return true;
    } catch (e) {
      console.error("Airtable createBooking error, writing locally:", e);
    }
  }
  const db = loadLocalDb();
  db.bookings.push({
    ...booking,
    createdAt: new Date().toISOString()
  });
  saveLocalDb(db);
  return true;
}

export async function updateBooking(id: string, fields: any): Promise<boolean> {
  if (base) {
    try {
      const records = await base('Bookings').select({
        filterByFormula: `{id} = '${id}'`,
        maxRecords: 1
      }).firstPage();
      if (records.length > 0) {
        const airtableRecordId = records[0].id;
        const updateFields: any = {};
        if (fields.name !== undefined) updateFields.name = fields.name;
        if (fields.phone !== undefined) updateFields.phone = fields.phone;
        if (fields.email !== undefined) updateFields.email = fields.email;
        if (fields.date !== undefined) updateFields.date = fields.date;
        if (fields.time !== undefined) updateFields.time = fields.time;
        if (fields.guests !== undefined) updateFields.guests = Number(fields.guests);
        if (fields.seatType !== undefined) updateFields.seat_type = fields.seatType;
        if (fields.status !== undefined) updateFields.status = fields.status;
        if (fields.notes !== undefined) updateFields.notes = fields.notes;
        if (fields.upgrades !== undefined) {
          updateFields.upgrades = Array.isArray(fields.upgrades) ? fields.upgrades.join(', ') : fields.upgrades || '';
        }
        
        await base('Bookings').update([{ id: airtableRecordId, fields: updateFields }]);
        return true;
      }
    } catch (e) {
      console.error("Airtable updateBooking error, writing locally:", e);
    }
  }
  const db = loadLocalDb();
  const idx = db.bookings.findIndex((b: any) => b.id.toUpperCase() === id.toUpperCase());
  if (idx !== -1) {
    db.bookings[idx] = {
      ...db.bookings[idx],
      ...fields
    };
    saveLocalDb(db);
    return true;
  }
  return false;
}

export async function deleteBooking(id: string): Promise<boolean> {
  if (base) {
    try {
      const records = await base('Bookings').select({
        filterByFormula: `{id} = '${id}'`,
        maxRecords: 1
      }).firstPage();
      if (records.length > 0) {
        await base('Bookings').destroy(records[0].id);
        return true;
      }
    } catch (e) {
      console.error("Airtable deleteBooking error:", e);
    }
  }
  const db = loadLocalDb();
  db.bookings = db.bookings.filter((b: any) => b.id.toUpperCase() !== id.toUpperCase());
  saveLocalDb(db);
  return true;
}

export async function clearAllBookings(): Promise<boolean> {
  if (base) {
    try {
      const records = await base('Bookings').select().all();
      for (const rec of records) {
        await base('Bookings').destroy(rec.id);
      }
    } catch (e) {
      console.error("Airtable clearAllBookings error:", e);
    }
  }
  const db = loadLocalDb();
  db.bookings = [];
  saveLocalDb(db);
  return true;
}

// --- ORDERS ---
export async function getOrders(): Promise<any[]> {
  if (base) {
    try {
      const records = await base('Orders').select({ sort: [{ field: 'created_at', direction: 'desc' }] }).all();
      return records.map(mapRecordToOrder);
    } catch (e) {
      console.error("Airtable getOrders error, using local fallback:", e);
    }
  }
  const db = loadLocalDb();
  return db.orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createOrder(order: any): Promise<boolean> {
  if (base) {
    try {
      await base('Orders').create([
        {
          fields: {
            order_id: order.id,
            name: order.name,
            phone: order.phone,
            email: order.email.toLowerCase(),
            fulfillment_type: order.fulfillment_type,
            address: order.address || '',
            items: order.items, // String format summary
            subtotal: Number(order.subtotal),
            total: Number(order.total),
            instructions: order.instructions || '',
            status: order.status || 'pending',
            created_at: new Date().toISOString()
          }
        }
      ]);
      return true;
    } catch (e) {
      console.error("Airtable createOrder error, writing locally:", e);
    }
  }
  const db = loadLocalDb();
  db.orders.push({
    ...order,
    createdAt: new Date().toISOString()
  });
  saveLocalDb(db);
  return true;
}

export async function updateOrder(id: string, fields: any): Promise<boolean> {
  if (base) {
    try {
      const records = await base('Orders').select({
        filterByFormula: `{order_id} = '${id}'`,
        maxRecords: 1
      }).firstPage();
      if (records.length > 0) {
        const airtableRecordId = records[0].id;
        const updateFields: any = {};
        if (fields.status !== undefined) updateFields.status = fields.status;
        await base('Orders').update([{ id: airtableRecordId, fields: updateFields }]);
        return true;
      }
    } catch (e) {
      console.error("Airtable updateOrder error, writing locally:", e);
    }
  }
  const db = loadLocalDb();
  const idx = db.orders.findIndex((o: any) => o.id.toUpperCase() === id.toUpperCase());
  if (idx !== -1) {
    db.orders[idx] = {
      ...db.orders[idx],
      ...fields
    };
    saveLocalDb(db);
    return true;
  }
  return false;
}

// --- BOOKING HISTORY (AUDIT TRAIL) ---
export async function getBookingHistory(): Promise<any[]> {
  if (base) {
    try {
      const records = await base('Booking_History').select({ sort: [{ field: 'timestamp', direction: 'desc' }] }).all();
      return records.map(mapRecordToHistory);
    } catch (e) {
      console.error("Airtable getBookingHistory error, using local fallback:", e);
    }
  }
  const db = loadLocalDb();
  return db.booking_history.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function createBookingHistory(history: any): Promise<boolean> {
  if (base) {
    try {
      await base('Booking_History').create([
        {
          fields: {
            booking_id: history.booking_id,
            action: history.action,
            original_date: history.original_date || '',
            original_time: history.original_time || '',
            new_date: history.new_date || '',
            new_time: history.new_time || '',
            reason: history.reason || '',
            timestamp: new Date().toISOString()
          }
        }
      ]);
      return true;
    } catch (e) {
      console.error("Airtable createBookingHistory error, writing locally:", e);
    }
  }
  const db = loadLocalDb();
  db.booking_history.push({
    ...history,
    timestamp: new Date().toISOString()
  });
  saveLocalDb(db);
  return true;
}

// --- VOUCHERS / GIFT SECTION ---
export async function getVouchers(): Promise<any[]> {
  if (base) {
    try {
      const records = await base('Gift_Vouchers').select({ sort: [{ field: 'created_at', direction: 'desc' }] }).all();
      return records.map(mapRecordToVoucher);
    } catch (e) {
      console.error("Airtable getVouchers error, using local fallback:", e);
    }
  }
  const db = loadLocalDb();
  return db.gift_vouchers.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createVoucher(voucher: any): Promise<boolean> {
  if (base) {
    try {
      await base('Gift_Vouchers').create([
        {
          fields: {
            voucher_code: voucher.voucher_code,
            recipient: voucher.recipient,
            sender: voucher.sender,
            package_id: voucher.package_id,
            message: voucher.message || '',
            status: voucher.status || 'active',
            created_at: new Date().toISOString()
          }
        }
      ]);
      return true;
    } catch (e) {
      console.error("Airtable createVoucher error, writing locally:", e);
    }
  }
  const db = loadLocalDb();
  db.gift_vouchers.push({
    ...voucher,
    createdAt: new Date().toISOString()
  });
  saveLocalDb(db);
  return true;
}
