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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headers = await getAuthHeaders();
    if (!headers) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function PUT(
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

    const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headers = await getAuthHeaders();
    if (!headers) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
      method: 'DELETE',
      headers
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Failed to delete invoice' }, { status: 500 });
  }
}
