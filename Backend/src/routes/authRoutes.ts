import { Router } from "express";
import { register, login, validateInvitationCode } from "../controllers/authController.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/validate-invitation-code", validateInvitationCode);

export default router;