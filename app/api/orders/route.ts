import { NextResponse } from 'next/server';
import { getOrders, createOrder } from '@/lib/airtable';

export async function GET(request: Request) {
  try {
    const orders = await getOrders();
    return NextResponse.json(orders);
  } catch (error: any) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, phone, email, type, address, items, subtotal, total, instructions } = body;
    
    if (!id || !name || !phone || !email || !type || !items || subtotal === undefined || total === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Format items object to readable string for Airtable
    let itemsStr = '';
    if (typeof items === 'object') {
      itemsStr = Object.keys(items)
        .map(name => `${items[name]}x ${name}`)
        .join(', ');
    } else {
      itemsStr = String(items);
    }
    
    const newOrder = {
      id,
      name,
      phone,
      email,
      fulfillment_type: type,
      address: address || '',
      items: itemsStr,
      subtotal,
      total,
      instructions: instructions || '',
      status: 'pending'
    };
    
    await createOrder(newOrder);
    return NextResponse.json({ success: true, order: newOrder });
  } catch (error: any) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
