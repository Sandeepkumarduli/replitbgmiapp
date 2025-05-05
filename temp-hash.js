import crypto from 'crypto';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${hash}.${salt}`;
}

console.log(hashPassword('admin123'));