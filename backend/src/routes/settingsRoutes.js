import { Router } from 'express';
import { getSettings, resetSettings, updateSettings } from '../controllers/settingsController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { settingsUpload } from '../middleware/upload.js';

const router = Router();

router.get('/', getSettings);
// .any(): slide image fields are dynamic (slideImage_<i>/slideBg_<i>); fileFilter allowlists names
router.put('/', requireAuth, requireAdmin, settingsUpload.any(), updateSettings);
router.delete('/', requireAuth, requireAdmin, resetSettings);

export default router;
