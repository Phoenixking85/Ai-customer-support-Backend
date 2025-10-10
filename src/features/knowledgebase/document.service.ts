import AWS from 'aws-sdk';
import multer from 'multer';
import { DocumentRepository } from './document.repo';
import { CreateDocumentData } from './document.model';
import { config } from '../../config/env';
import { Helpers } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export class DocumentService {
  private s3: AWS.S3;

  constructor(private documentRepo: DocumentRepository) {
    this.s3 = new AWS.S3({
  endpoint: process.env.AWS_ENDPOINT,          
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,  
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, 
  region: process.env.AWS_REGION,              
  s3ForcePathStyle: false,                     
});


  }

  async uploadDocument(
    tenantId: string,
    file: Express.Multer.File
  ): Promise<{ document: any; uploadUrl: string }> {
    this.validateFile(file);
    const filename = `${tenantId}/${Date.now()}_${Helpers.sanitizeFilename(file.originalname)}`;

    try {
      const uploadResult = await this.s3
        .upload({
          Bucket: config.backblaze.bucketName,
          Key: filename,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'private',
        })
        .promise();

      const documentData: CreateDocumentData = {
        tenant_id: tenantId,
        filename,
        original_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        b2_url: uploadResult.Location,
      };

      const document = await this.documentRepo.create(documentData);

      logger.info('Document uploaded', {
        documentId: document.id,
        tenantId,
        filename: file.originalname,
        size: file.size,
      });

      return { document, uploadUrl: uploadResult.Location };
    } catch (error: any) {
      logger.error('Document upload failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async getDocuments(tenantId: string) {
    return this.documentRepo.findByTenant(tenantId);
  }

  async deleteDocument(tenantId: string, documentId: string): Promise<boolean> {
    const document = await this.documentRepo.findById(documentId);
    if (!document || document.tenant_id !== tenantId) {
      throw new Error('Document not found or unauthorized');
    }

    try {
      await this.s3
        .deleteObject({
          Bucket: config.backblaze.bucketName,
          Key: document.filename,
        })
        .promise();

      const deleted = await this.documentRepo.delete(documentId);

      logger.info('Document deleted', {
        documentId,
        tenantId,
        filename: document.original_name,
      });

      return deleted;
    } catch (error: any) {
      logger.error('Document deletion failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async downloadDocument(documentId: string): Promise<Buffer> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) throw new Error('Document not found');

    try {
      const result = await this.s3
        .getObject({
          Bucket: config.backblaze.bucketName,
          Key: document.filename,
        })
        .promise();

      return result.Body as Buffer;
    } catch (error: any) {
      logger.error('Document download failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  private validateFile(file: Express.Multer.File) {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];
    if (!allowed.includes(file.mimetype)) {
      throw new Error('Unsupported file type');
    }
  }

  static getMulterConfig(): multer.Multer {
    return multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: config.plans.premium.documentSizeLimit },
      fileFilter: (req, file, cb) => {
        const allowed = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'text/plain',
        ];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Unsupported file type'));
      },
    });
  }
}
