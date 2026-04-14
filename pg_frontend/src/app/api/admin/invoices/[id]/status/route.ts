import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_BASE_URL || 'http://localhost:4000';

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return null;
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headers = await getAuthHeaders();
    if (!headers) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = await params;

    const response = await fetch(`${BACKEND_URL}/api/invoices/${id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Failed to update invoice status' }, { status: 500 });
  }
}
