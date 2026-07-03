import { NextResponse } from 'next/server';
import { getBookingHistory } from '@/lib/airtable';

export async function GET() {
  try {
    const history = await getBookingHistory();
    return NextResponse.json(history);
  } catch (error: any) {
    console.error("GET /api/bookings/history error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
