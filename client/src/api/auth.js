const BASE_URL = 'http://localhost/cutvault/api/auth.php';

export async function loginApi(credentials) {
  const res = await fetch(`${BASE_URL}?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data.data;
}

export async function signupApi(payload) {
  const { username = '', email = '', password = '' } = payload || {};

  // 1. Validate Username (Min 3 chars, no pure digits)
  const cleanUsername = username.trim();
  if (cleanUsername.length < 3 || /^\d+$/.test(cleanUsername)) {
    throw new Error('Username must be at least 3 characters and contain letters.');
  }

  // 2. Validate Email syntax and check dummy domains
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    throw new Error('Please enter a valid email address.');
  }

  const domain = email.trim().split('@')[1]?.toLowerCase();
  if (['123.com', 'test.com', 'example.com'].includes(domain)) {
    throw new Error('Registration using test email domains is prohibited.');
  }

  // 3. Validate Password complexity (Min 8 chars, 1 upper, 1 lower, 1 number)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new Error('Password must be at least 8 characters long and include an uppercase letter, lowercase letter, and a number.');
  }

  const res = await fetch(`${BASE_URL}?action=signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Signup failed');
  return data.data;
}

export async function logoutApi() {
  await fetch(`${BASE_URL}?action=logout`, { method: 'POST', credentials: 'include' });
}

export async function checkMeApi() {
  const res = await fetch(`${BASE_URL}?action=me`, { credentials: 'include' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}