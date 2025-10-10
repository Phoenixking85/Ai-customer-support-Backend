import { Router } from 'express';
import { uploadDocument, listDocuments, deleteDocument } from '../controllers/kb.controller';
import { DocumentService } from '../../../features/knowledgebase/document.service';
import { apiKeyAuth } from '../../../middleware/apiKeyAuth';

import { documentQuotaEnforcer } from '../../../middleware/documentQuotaEnforcer';
const router = Router();

const upload = DocumentService.getMulterConfig();

router.post(
  '/upload',
  apiKeyAuth,                             
  upload.single('file'), 
  documentQuotaEnforcer,     
  uploadDocument              
);

router.get('/list', apiKeyAuth, listDocuments);
router.delete('/delete/:id', apiKeyAuth, deleteDocument);

export { router as kbRoutes };
