const fs = require('fs');
const path = require('path');

const storagePath = path.join(__dirname, '..', 'data', 'server_storage.json');
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

function saveBase64ToFile(prefix, dataUri) {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return dataUri;
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return dataUri;
  const mime = match[1];
  const base64Data = match[2];
  let ext = mime.split('/')[1]?.split('+')[0] || 'bin';
  if (ext === 'jpeg') ext = 'jpg';
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
  return `/uploads/${fileName}`;
}

if (fs.existsSync(storagePath)) {
  const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));

  // Filter out any ghost Apollo references
  data.users = (data.users || []).filter(
    (u) =>
      u.name !== 'Apollo Super Specialty Care' &&
      u.email !== 'contact@apollohyderabad.org' &&
      u.id !== 'usr-hos-1791470500246'
  );

  for (const u of data.users) {
    if (u.avatarUrl && u.avatarUrl.startsWith('data:')) {
      u.avatarUrl = saveBase64ToFile('avatar-' + u.id, u.avatarUrl);
    }
    if (u.hospitalProfile && u.hospitalProfile.logoUrl && u.hospitalProfile.logoUrl.startsWith('data:')) {
      u.hospitalProfile.logoUrl = saveBase64ToFile('logo-' + u.id, u.hospitalProfile.logoUrl);
    }
    if (Array.isArray(u.uploadedDocuments)) {
      for (const doc of u.uploadedDocuments) {
        if (doc.dataUrl && doc.dataUrl.startsWith('data:')) {
          doc.url = saveBase64ToFile('doc-' + u.id + '-' + (doc.id || 'file'), doc.dataUrl);
          delete doc.dataUrl;
        }
        if (doc.url && doc.url.startsWith('data:')) {
          doc.url = saveBase64ToFile('doc-' + u.id + '-' + (doc.id || 'file'), doc.url);
        }
      }
    }
  }

  fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
  console.log('Migrated storage size:', fs.statSync(storagePath).size, 'bytes');
  console.log('Files in uploads:', fs.readdirSync(uploadsDir).length);
} else {
  console.log('No storage file found at', storagePath);
}
