import { Router } from 'express';
import { callNextPatient, getAdminQueue, getAdminPatientLogs, getDoctors, getPatientStatus, joinQueue, cancelQueue, getQueueHistory, startSession, completeSession, skipCurrentPatient, closeCurrentPatient, updateDoctorAvailability } from '../controllers/queueController.js';
import { authenticateUser, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/doctors', getDoctors);
router.get('/queue/admin/:doctorId', authenticateUser, requireRole('admin'), getAdminQueue);
router.get('/queue/admin-history/:doctorId', authenticateUser, requireRole('admin'), getAdminPatientLogs);
router.post('/queue/join', authenticateUser,joinQueue);
router.patch('/admin/call-next/:doctorId', authenticateUser, requireRole('admin'), callNextPatient);
router.get('/queue/patient-status', authenticateUser, getPatientStatus);
router.patch('/queue/cancel', authenticateUser, cancelQueue);
router.get('/queue/history', authenticateUser, getQueueHistory);
router.patch('/admin/start-session/:queueId', authenticateUser, requireRole('admin'), startSession);
router.patch('/admin/complete-session/:queueId', authenticateUser, requireRole('admin'), completeSession);
router.patch('/admin/skip/:doctorId', authenticateUser, requireRole('admin'), skipCurrentPatient);
router.patch('/admin/close/:doctorId', authenticateUser, requireRole('admin'), closeCurrentPatient);
router.patch('/admin/doctor-availability/:doctorId', authenticateUser, requireRole('admin'), updateDoctorAvailability);

export default router;