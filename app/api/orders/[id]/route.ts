import { NextResponse } from 'next/server';
import { updateOrder } from '@/lib/airtable';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    const { status } = body;
    
    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    }
    
    const success = await updateOrder(id, { status });
    if (!success) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, orderId: id, status });
  } catch (error: any) {
    console.error("PATCH /api/orders/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
