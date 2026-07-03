import { NextResponse } from 'next/server';
import { getBookings, createBooking, clearAllBookings } from '@/lib/airtable';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');
    
    const bookings = await getBookings();
    
    // Lookup for single booking (landing page concierge)
    if (id && email) {
      const booking = bookings.find(
        (b) => b.id.toUpperCase() === id.toUpperCase() && b.email.toLowerCase() === email.toLowerCase()
      );
      if (booking) {
        return NextResponse.json(booking);
      }
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    // Otherwise return all bookings (admin panel)
    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { id, name, phone, email, date, time, guests, seatType, upgrades, occasion, dietary } = body;
    if (!id || !name || !phone || !email || !date || !time || !guests || !seatType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const newBooking = {
      id,
      name,
      phone,
      email,
      date,
      time,
      guests,
      seatType,
      upgrades: upgrades || [],
      occasion: occasion || 'None',
      dietary: dietary || '',
      status: 'confirmed',
      notes: ''
    };
    
    await createBooking(newBooking);
    return NextResponse.json({ success: true, booking: newBooking });
  } catch (error: any) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const success = await clearAllBookings();
    if (!success) {
      return NextResponse.json({ error: 'Failed to clear bookings' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'All bookings cleared successfully' });
  } catch (error: any) {
    console.error("DELETE /api/bookings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
