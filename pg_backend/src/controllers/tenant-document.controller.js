import { v4 as uuidv4 } from 'uuid';
import { createTenantDocument, getTenantDocuments } from '../data/tenant-document.store.js';

const allowedDocumentTypes = new Set([
  'aadhaar',
  'voter_id',
  'license',
  'pan',
  'student_id',
  'employee_id',
  'other'
]);

export const getTenantDocumentsHandler = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const ownerAccountId = req.tenant?.ownerAccountId;

    if (!tenantId || !ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const documents = await getTenantDocuments(tenantId, ownerAccountId);
    return res.status(200).json(documents);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
  }
};

export const createTenantDocumentHandler = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const ownerAccountId = req.tenant?.ownerAccountId;

    if (!tenantId || !ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const documentType = String(req.body?.document_type || '').trim().toLowerCase();
    if (!documentType || !allowedDocumentTypes.has(documentType)) {
      return res.status(400).json({ message: 'document_type is invalid' });
    }

    const payload = {
      id: uuidv4(),
      tenant_id: tenantId,
      owner_account_id: ownerAccountId,
      document_type: documentType,
      provider: String(req.body?.provider || 'cloudinary'),
      public_id: String(req.body?.public_id || ''),
      secure_url: String(req.body?.secure_url || ''),
      resource_type: String(req.body?.resource_type || 'image'),
      file_name: String(req.body?.file_name || ''),
      status: 'pending',
      uploaded_at: new Date(),
      updated_at: null
    };

    const created = await createTenantDocument(payload);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add document', error: error.message });
  }
};
