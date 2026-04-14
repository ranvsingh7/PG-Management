import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_BASE_URL || 'http://localhost:4000';

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return null;

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export async function GET(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const response = await fetch(`${BACKEND_URL}/api/pending-approvals?${searchParams.toString()}`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Failed to fetch pending approvals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();
    if (!headers) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/pending-approvals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Failed to create pending approval' }, { status: 500 });
  }
}
