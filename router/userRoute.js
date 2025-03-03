const express = require("express");
const multer = require("multer");

const {
  getAllContracts,
  createContract,
  getContractDetails,
  loginUser,
  authCheck,
  deleteContract,
  editContract,
  getContractById,
  printContract,
  sendEmail,
  sendWhatsAppContract,
} = require("../controller/userController");

const router = express.Router();

// ✅ Use Memory Storage to avoid empty file issues
const storage = multer.memoryStorage();
const mailupload = multer({ storage });
const whatsAppupload = multer({ dest: "uploads/" });
// Define routes
router.get("/auth-check", authCheck);
router.post("/admin/loginforadmin", loginUser);
router.delete("/admin/delete/:id", deleteContract);
router.put("/admin/edit/:id", editContract);
router.get("/admin/print/:id", (req, res) => printContract(req, res));
router.get("/getAll", getAllContracts);
router.get("/admin/get/:id", getContractById);
router.post("/user/create", createContract);
router.get("/admin/ViewContarcts", getContractDetails);
router.post("/send-email", mailupload.single("contractFile"), sendEmail);
router.post(
  "/send-whatsapp",
  whatsAppupload.single("contractFile"),
  sendWhatsAppContract
);

module.exports = router;
