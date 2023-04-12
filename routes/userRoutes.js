import express from "express";
import {
  register,
  verify,
  login,
  logout,
  addTask,
  removeTask,
  updateTask,
  getMyProfile,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/verify").post(isAuthenticated, verify);
router.route("/logout").get(isAuthenticated, logout);

router.route("/me").get(isAuthenticated, getMyProfile);
router.route("/updateprofile").put(isAuthenticated, updateProfile);
router.route("/updatepassword").put(isAuthenticated, updatePassword);
router.route("/forgotpassword").post(forgotPassword);
router.route("/resetpassword").put(resetPassword);

router.route("/newTask").post(isAuthenticated, addTask);
router
  .route("/task/:taskId")
  .delete(isAuthenticated, removeTask)
  .put(isAuthenticated, updateTask);

export default router;
