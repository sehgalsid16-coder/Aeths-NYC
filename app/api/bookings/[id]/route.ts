import { NextResponse } from 'next/server';
import { getBookingById, updateBooking, createBookingHistory, deleteBooking } from '@/lib/airtable';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    
    const originalBooking = await getBookingById(id);
    if (!originalBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    const { action, notes, date, time, guests, status, reason } = body;
    const fieldsToUpdate: any = {};
    
    if (notes !== undefined) fieldsToUpdate.notes = notes;
    if (status !== undefined) fieldsToUpdate.status = status;
    
    if (action === 'reschedule') {
      if (!date || !time) {
        return NextResponse.json({ error: 'Reschedule requires date and time' }, { status: 400 });
      }
      fieldsToUpdate.date = date;
      fieldsToUpdate.time = time;
      if (guests !== undefined) fieldsToUpdate.guests = guests;
      fieldsToUpdate.status = 'confirmed';
      
      // Log to Booking_History
      await createBookingHistory({
        booking_id: id,
        action: 'rescheduled',
        original_date: originalBooking.date,
        original_time: originalBooking.time,
        new_date: date,
        new_time: time,
        reason: reason || 'Staff reschedule'
      });
    } else if (action === 'cancel' || status === 'cancelled') {
      fieldsToUpdate.status = 'cancelled';
      
      // Log to Booking_History
      await createBookingHistory({
        booking_id: id,
        action: 'cancelled',
        original_date: originalBooking.date,
        original_time: originalBooking.time,
        new_date: '',
        new_time: '',
        reason: reason || 'Staff cancellation'
      });
    }
    
    const success = await updateBooking(id, fieldsToUpdate);
    if (!success) {
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, booking: { ...originalBooking, ...fieldsToUpdate } });
  } catch (error: any) {
    console.error("PATCH /api/bookings/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || 'Staff deleted booking';

    const originalBooking = await getBookingById(id);
    if (!originalBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const success = await deleteBooking(id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
    }

    // Log deletion to Booking_History
    await createBookingHistory({
      booking_id: id,
      action: 'deleted',
      original_date: originalBooking.date,
      original_time: originalBooking.time,
      new_date: '',
      new_time: '',
      reason: reason
    });

    return NextResponse.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error: any) {
    console.error("DELETE /api/bookings/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
