/**
 * ICBC Road Test Availability Monitor
 * Checks Vancouver claim centre (Kingsway) for March 27th slots.
 * Triggered every 5 minutes via cron-job.org (free) or Vercel Cron.
 */
import { NextResponse } from 'next/server';

const ICBC_BASE = 'https://onlinebusiness.icbc.com/deas-api/v1';
const TARGET_DATE = '2026-03-27';
const KINGSWAY_POS_ID = 275;
const EXAM_TYPE = '7-R-1';

const ICBC_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://onlinebusiness.icbc.com',
  Referer: 'https://onlinebusiness.icbc.com/webdeas-ui/login;type=driver',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/134.0.0.0 Safari/537.36',
};

async function icbcLogin(): Promise<string> {
  const res = await fetch(`${ICBC_BASE}/webLogin/webLogin`, {
    method: 'PUT',
    headers: ICBC_HEADERS,
    body: JSON.stringify({
      lastName: process.env.ICBC_LAST_NAME,
      licenceNumber: process.env.ICBC_LICENCE,
      keyword: process.env.ICBC_KEYWORD,
    }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const token = res.headers.get('Authorization');
  if (!token) throw new Error('No auth token returned from ICBC');
  return token;
}

async function checkAvailability(token: string) {
  const res = await fetch(`${ICBC_BASE}/web/getAvailableAppointments`, {
    method: 'POST',
    headers: { ...ICBC_HEADERS, Authorization: token },
    body: JSON.stringify({
      aPosID: KINGSWAY_POS_ID,
      examType: EXAM_TYPE,
      examDate: TARGET_DATE,
      prfDaysOfWeek: '[0,1,2,3,4,5,6]',
      prfPartsOfDay: '[0,1]',
      lastName: 'MERKUR',
      licenseNumber: '2057913',
    }),
  });
  if (!res.ok) throw new Error(`Availability check failed: ${res.status}`);
  const all = await res.json();
  return all.filter(
    (a: { appointmentDt?: { date?: string } }) => a?.appointmentDt?.date === TARGET_DATE
  );
}

async function sendSms(message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const auth = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;
  const to = process.env.NOTIFY_PHONE!;
  const creds = Buffer.from(`${sid}:${auth}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: from, To: to, Body: message }).toString(),
  });
  if (!res.ok) throw new Error(`Twilio error: ${await res.text()}`);
}

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ts = new Date().toISOString();
  try {
    const token = await icbcLogin();
    const slots = await checkAvailability(token);
    if (slots.length > 0) {
      const times = slots.map((s: { endTm?: string }) => s.endTm).join(', ');
      await sendSms(
        `ICBC: ${slots.length} slot(s) at Kingsway on Mar 27! Times: ${times}. ` +
          `Book NOW: https://onlinebusiness.icbc.com/webdeas-ui/booking`
      );
      return NextResponse.json({ status: 'SLOTS_FOUND', slots, ts });
    }
    return NextResponse.json({ status: 'no_slots', ts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[icbc-check]', msg);
    return NextResponse.json({ status: 'error', message: msg, ts }, { status: 500 });
  }
}
