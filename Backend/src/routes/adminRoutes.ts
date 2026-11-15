import { Router } from 'express';
import { 
    inviteAdmin, 
    getPendingInvitations, 
    resendInvitation, 
    revokeInvitation,
    createDoctor,
    deleteDoctor,
} from '../controllers/adminController.js';
import { authenticateUser, requireRole } from '../middleware/authMiddleware.js';
import { validateDoctorIdParam } from '../middleware/validate.js';

const router = Router();
router.param('doctorId', validateDoctorIdParam);

router.post('/invite', authenticateUser, requireRole('admin'), inviteAdmin);
router.get('/invitations', authenticateUser, requireRole('admin'), getPendingInvitations);
router.post('/invitations/resend', authenticateUser, requireRole('admin'), resendInvitation);
router.post('/invitations/revoke', authenticateUser, requireRole('admin'), revokeInvitation);
router.post('/doctors', authenticateUser, requireRole('admin'), createDoctor);
router.delete('/doctors/:doctorId', authenticateUser, requireRole('admin'), deleteDoctor);

export default router;
