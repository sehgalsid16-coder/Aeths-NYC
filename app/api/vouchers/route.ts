import { NextResponse } from 'next/server';
import { getVouchers, createVoucher } from '@/lib/airtable';

export async function GET(request: Request) {
  try {
    const vouchers = await getVouchers();
    return NextResponse.json(vouchers);
  } catch (error: any) {
    console.error("GET /api/vouchers error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { voucher_code, recipient, sender, package_id, message } = body;
    
    if (!voucher_code || !recipient || !sender || !package_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const newVoucher = {
      voucher_code,
      recipient,
      sender,
      package_id,
      message: message || '',
      status: 'active'
    };
    
    await createVoucher(newVoucher);
    return NextResponse.json({ success: true, voucher: newVoucher });
  } catch (error: any) {
    console.error("POST /api/vouchers error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
