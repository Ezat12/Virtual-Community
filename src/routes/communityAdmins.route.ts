import express from "express";
import { validateCommunityAdmin } from "../middleware/validateCommunityAdmin";
import { protectAuth } from "../middleware/auth/protectAuth";
import {
  addAdmin,
  deleteAdmin,
  getAllAdmins,
  updateCommunityAdmin,
} from "../controllers/communityAdmin.controller";
const router = express.Router();

router.route("/add-admin").post(protectAuth, validateCommunityAdmin, addAdmin);

router
  .route("/update-admin")
  .put(protectAuth, validateCommunityAdmin, updateCommunityAdmin);

router.route("/all-admin").get(protectAuth, getAllAdmins);

router.route("/delete-admin").delete(protectAuth, deleteAdmin);

export default router;
