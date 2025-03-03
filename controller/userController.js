const Contract = require("../models/contract"); // Import your Contract model
const jwt = require("jsonwebtoken");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const moment = require("moment");
const Hmoment = require("moment-hijri");
const nodemailer = require("nodemailer");
const request = require("request");
const fs = require("fs");
const path = require("path");

const API_URL = "http://localhost:3000";

const convertToArabicNumerals = (num) => {
  const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/\d/g, (digit) => arabicNumbers[digit]);
};

const authCheck = (req, res) => {
  const token = req.cookies.token; // Read token from cookies

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    );
    res
      .status(200)
      .json({ success: true, message: "Authenticated", user: decoded });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// Login Controller with Hardcoded Credentials
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if credentials match the hardcoded values
    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET || "default_secret",
      {
        expiresIn: "7d", // Token expires in 7 days
      }
    );

    // Set HTTP-Only cookie
    res.cookie("token", token, {
      httpOnly: true, // Secure cookie (prevents access from JavaScript)
      secure: process.env.NODE_ENV === "production", // Set secure flag in production
      sameSite: "strict", // Prevent CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Respond with token
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getContractById = async (req, res) => {
  try {
    const { id } = req.params; // Get contract ID from URL

    // Find the contract by ID
    const contract = await Contract.findById(id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    res.status(200).json({
      success: true,
      data: contract,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contract",
      error: error.message,
    });
  }
};

// Get all contracts
const getAllContracts = async (req, res) => {
  try {
    const contracts = await Contract.find(); // Fetch all contracts from the database
    res.status(200).json({
      success: true,
      data: contracts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contracts",
      error: error.message,
    });
  }
};

// Create a new contract
const createContract = async (req, res) => {
  try {
    const { guardian, contractEditor, student, payment } = req.body; // Destructure data from request body
    // ✅ Normalize `hasSiblingsInIthraa` to false if it's empty
    student.hasSiblingsInIthraa =
      student.hasSiblingsInIthraa === "true" ? true : false;

    // Create a new contract document
    const newContract = new Contract({
      guardian,
      contractEditor,
      student,
      payment,
    });

    await newContract.save(); // Save the contract to the database
    res.status(201).json({
      success: true,
      message: "Contract created successfully",
      data: newContract,
    });
  } catch (error) {
    console.error("Error creating contract:", error); // Add this line to log the error in the terminal
    res.status(500).json({
      success: false,
      message: "Failed to create contract",
      error: error.message,
    });
  }
};
// Controller to get contracts without querying, returning only required fields
const getContractDetails = async (req, res) => {
  try {
    // Fetch contracts and select only the required fields
    const contracts = await Contract.find(
      {},
      {
        "guardian.name": 1,
        "guardian.idNumber": 1,
        "guardian.relationship": 1,
        "guardian.absherMobileNumber": 1,
        "guardian.additionalMobileNumber": 1,
        "guardian.residentialAddress": 1,
        "contractEditor.name": 1,
        "contractEditor.idNumber": 1,
        "student.name": 1,
        "student.idNumber": 1,
      }
    );

    // Return the results
    res.status(200).json({
      success: true,
      data: contracts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contract details",
      error: error.message,
    });
  }
};

const deleteContract = async (req, res) => {
  try {
    const { id } = req.params; // Get contract ID from request parameters

    // Find and delete the contract by ID
    const deletedContract = await Contract.findByIdAndDelete(id);

    if (!deletedContract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contract deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete contract",
      error: error.message,
    });
  }
};

const editContract = async (req, res) => {
  try {
    const { id } = req.params; // Get contract ID from request parameters
    const updateData = req.body; // Get updated contract data from request body

    // ✅ Normalize `hasSiblingsInIthraa` to false if it's empty
    if (
      updateData.student &&
      updateData.student.hasSiblingsInIthraa !== undefined
    ) {
      updateData.student.hasSiblingsInIthraa =
        updateData.student.hasSiblingsInIthraa === "true" ? true : false;
    }

    // Find and update the contract by ID
    const updatedContract = await Contract.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedContract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contract updated successfully",
      data: updatedContract,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update contract",
      error: error.message,
    });
  }
};

// Function to replace placeholders in the Word template
const replaceWordFields = (contract) => {
  // Load the Word template
  const templatePath = path.join(__dirname, "../files/boysContract.docx");
  console.log("Loading Word template from path:", templatePath);

  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  let doc = new Docxtemplater(zip, {
    delimiters: {
      start: "{%",
      end: "%}",
    },
  });

  // ✅ 1. Extract raw document XML content
  let docText = doc.getZip().files["word/document.xml"].asText();

  // ✅ 2. Conditional replacement: Only change "الطالب" → "الطالبة" if school is "girls"
  if (contract.student.requiredSchool === "girls") {
    docText = docText.replace(/الطالب(?!ـ\/ـة)/g, "الطالبة");
  }

  // ✅ 3. Save the modified text back into the document
  zip.file("word/document.xml", docText);
  doc = new Docxtemplater(zip, {
    delimiters: {
      start: "{%",
      end: "%}",
    },
  });

  // Get current Gregorian and Hijri dates
  const currentDate = moment();
  const currentDateH = Hmoment();

  // Extract Hijri components
  const hijri = {
    Hyear: currentDateH.iYear(), // Hijri year
    Hmonth: currentDateH.iMonth() + 1, // Hijri month (zero-indexed, so +1)
    Hday: currentDateH.iDate(), // Hijri day
  };

  // Extract Gregorian components
  const gregorian = {
    dayName: currentDate.format("dddd"), // Day name (e.g., Monday)
    Myear: currentDate.format("YYYY"), // Gregorian year
    Mmonth: currentDate.format("M"), // Gregorian month
    Mday: currentDate.format("D"), // Gregorian day
  };

  // Convert birth date to Gregorian & Hijri formats
  const birthDateGregorian = moment(contract.student.birthDate);
  const birthDateHijri = Hmoment(contract.student.birthDate);

  // Extract Hijri components
  const birthDateHijriFormatted = {
    Hyear: birthDateHijri.iYear(),
    Hmonth: birthDateHijri.iMonth() + 1, // Hijri month is zero-indexed
    Hday: birthDateHijri.iDate(),
  };

  // Extract Gregorian components
  const birthDateGregorianFormatted = {
    Myear: birthDateGregorian.format("YYYY"),
    Mmonth: birthDateGregorian.format("M"),
    Mday: birthDateGregorian.format("D"),
  };

  // Define a mapping for stage names
  const stageMapping = {
    Kindergarten: "رياض الأطفال",
    Elementary: "الابتدائية",
    Middle: "المتوسطة",
    High: "الثانوية",
  };

  const studentStage = contract.student.requiredStage;
  const studentStageArabic = stageMapping[studentStage] || studentStage;
  const studentGrade = contract.student.requiredGrade
    .replace("الصف ", "")
    .trim();

  console.log("studentStage ::::::: ", studentStage);
  const wantsTransportation = contract.payment.transportation.required;
  console.log("wantsTransportation ::::::: ", wantsTransportation);

  let transportationPath = contract.payment.transportation.path;
  const paymentType = contract.payment.paymentType || "N/A"; // Default to "N/A" if undefined

  // School Money Based on Stage
  let SchoolMoneyRequired = 0;
  if (studentStage === "Elementary") {
    SchoolMoneyRequired = 24100;
  } else if (studentStage === "Middle") {
    SchoolMoneyRequired = 25100;
  } else if (studentStage === "High") {
    SchoolMoneyRequired = 26100;
  }

  let TotalSchoolMoneyRequired;
  // Transportation Money Based on Path
  let TransportaionMoneyRequired = 0;
  if (transportationPath === "One path") {
    TransportaionMoneyRequired = 3450;
    transportationPath = "مسار واحد";
    TotalSchoolMoneyRequired = SchoolMoneyRequired + 3000 + 450;
  } else if (transportationPath === "Two paths") {
    TransportaionMoneyRequired = 5750;
    transportationPath = "مسارين";
    TotalSchoolMoneyRequired = SchoolMoneyRequired + 5000 + 750;
  }

  const idIssueDateGregorian = moment(contract.student.idIssueDate);
  const idIssueDateHijri = Hmoment(contract.student.idIssueDate);
  // Extract Hijri components for ID issue date
  const idIssueDateHijriFormatted = {
    Hyear: idIssueDateHijri.iYear(),
    Hmonth: idIssueDateHijri.iMonth() + 1, // Hijri months are zero-based, so add +1
    Hday: idIssueDateHijri.iDate(),
  };

  // Extract Gregorian components for ID issue date (if needed)
  const idIssueDateGregorianFormatted = {
    Myear: idIssueDateGregorian.format("YYYY"),
    Mmonth: idIssueDateGregorian.format("M"),
    Mday: idIssueDateGregorian.format("D"),
  };

  // Mapping the contract fields to the Word placeholders
  const placeholders = {
    isAnnual: paymentType === "Annual",
    isQuarterly: paymentType === "Quarterly",

    SchoolMoneyRequired: SchoolMoneyRequired || "0", // ✅ Fix for school fees
    TotalSchoolMoneyRequired: TotalSchoolMoneyRequired,
    TransportaionMoneyRequired: TransportaionMoneyRequired || "0",

    // Student Information
    student_name: contract.student.name,
    student_nationality: contract.student.nationality,
    student_birth_place: contract.student.birthPlace,

    // Birth Date (Gregorian)
    birthDate_G_Mday: birthDateGregorianFormatted.Mday,
    birthDate_G_Mmonth: birthDateGregorianFormatted.Mmonth,
    birthDate_G_Myear: birthDateGregorianFormatted.Myear,

    // Birth Date (Hijri)
    birthDate_H_Hday: birthDateHijriFormatted.Hday,
    birthDate_H_Hmonth: birthDateHijriFormatted.Hmonth,
    birthDate_H_Hyear: birthDateHijriFormatted.Hyear,

    previousSchoolName: contract.student.previousSchoolName || "............",
    previousSchoolCity: contract.student.previousSchoolCity || "............",
    previousSchoolType: contract.student.previousSchoolType || "............",

    student_id_number: contract.student.idNumber,
    student_id_issue_date: contract.student.idIssueDate
      .toISOString()
      .split("T")[0],
    student_id_issue_place: contract.student.idIssuePlace,
    student_previously_enrolled: contract.student.previouslyEnrolled
      ? "Yes"
      : "No",

    student_required_school: contract.student.requiredSchool,
    student_required_stage: studentStageArabic,
    schoolSexType:
      contract.student.requiredSchool === "girls" ? "بنات" : "بنين",

    // Conditional flags for stages
    isElementary: studentStage == "Elementary",
    isMiddle: studentStage == "Middle",
    isHigh: studentStage == "High",

    student_required_grade: studentGrade,
    student_has_siblings_in_ithraa: contract.student.hasSiblingsInIthraa
      ? "Yes"
      : "No",
    hasPayment: !!studentStage,
    wantsTransportation: !!wantsTransportation,

    // Check if there are contact persons
    hasContactPersons: contract.guardian.contactPersons.length > 0,

    // Prepare contact persons array for looping
    contactPersons: contract.guardian.contactPersons.map((person) => ({
      name: person.name,
      relationship: person.relationship,
      mobileNumber: person.mobileNumber,
    })),

    // Guardian Information
    guardian_name: contract.guardian.name,
    guardian_id_number: contract.guardian.idNumber,
    guardian_relationship: contract.guardian.relationship,
    guardian_absher_mobile: contract.guardian.absherMobileNumber,
    guardian_additional_mobile:
      contract.guardian.additionalMobileNumber || "............",
    guardian_residential_address: contract.guardian.residentialAddress,
    guardian_profession: contract.guardian.profession,
    guardian_work_address: contract.guardian.workAddress,
    guardian_work_phone: contract.guardian.workPhoneNumber || "............",
    guardian_extension: contract.guardian.extension || "............",

    // Contract Editor Information
    editor_name: contract.contractEditor.name,
    editor_id_number: contract.contractEditor.idNumber,
    editor_relationship: contract.contractEditor.relationship,
    editor_absher_mobile: contract.contractEditor.absherMobileNumber,
    editor_additional_mobile: contract.contractEditor.additionalMobileNumber,
    editor_residential_address: contract.contractEditor.residentialAddress,
    editor_profession: contract.contractEditor.profession,
    editor_work_address: contract.contractEditor.workAddress,
    editor_work_phone:
      contract.contractEditor.workPhoneNumber || "............",
    editor_extension: contract.contractEditor.extension || "............",

    // Payment Information
    payment_type: contract.payment.paymentType,
    payment_transportation_required: wantsTransportation ? "Yes" : "No",
    payment_transportation_neighborhood:
      contract.payment.transportation.neighborhood || "............",
    payment_transportation_path: transportationPath, // Use the updated value

    // Contact Persons
    siblings: contract.student.siblings.map((sibling) => ({
      name: sibling.name,
      stage: stageMapping[sibling.stage] || sibling.stage, // Convert stage to Arabic
      grade: sibling.grade.replace("الصف ", "").trim(),
    })),

    // Siblings Information (assuming 2 siblings max for simplicity)
    hasSiblings: contract.student.siblings.length > 0,

    siblings: contract.student.siblings.map((sibling) => ({
      name: sibling.name,
      stage: stageMapping[sibling.stage] || sibling.stage, // Convert stage to Arabic
      grade: sibling.grade,
    })),

    // ID Issue Date (Hijri)
    idIssueDate_H_Hday: convertToArabicNumerals(idIssueDateHijriFormatted.Hday),
    idIssueDate_H_Hmonth: convertToArabicNumerals(
      idIssueDateHijriFormatted.Hmonth
    ),
    idIssueDate_H_Hyear: convertToArabicNumerals(
      idIssueDateHijriFormatted.Hyear
    ),

    // ID Issue Date (Gregorian) - If needed
    idIssueDate_M_Mday: convertToArabicNumerals(
      idIssueDateGregorianFormatted.Mday
    ),
    idIssueDate_M_Mmonth: convertToArabicNumerals(
      idIssueDateGregorianFormatted.Mmonth
    ),
    idIssueDate_M_Myear: convertToArabicNumerals(
      idIssueDateGregorianFormatted.Myear
    ),

    // Dates
    idIssueDate_dayName: convertToArabicNumerals(gregorian.dayName),
    idIssueDate_Hday: convertToArabicNumerals(hijri.Hday),
    idIssueDate_Hmonth: convertToArabicNumerals(hijri.Hmonth),
    idIssueDate_Hyear: convertToArabicNumerals(hijri.Hyear),
    idIssueDate_Mday: convertToArabicNumerals(gregorian.Mday),
    idIssueDate_Mmonth: convertToArabicNumerals(gregorian.Mmonth),
    idIssueDate_Myear: convertToArabicNumerals(gregorian.Myear),
  };

  console.log("Placeholder data to be injected:", placeholders);
  console.log(
    "Placeholders: SSSTRIGIFY",
    JSON.stringify(placeholders, null, 2)
  );

  // Replace placeholders in the document
  doc.render(placeholders); // ✅ Correct

  // Generate the final document buffer
  const buffer = doc.getZip().generate({ type: "nodebuffer" });
  return buffer;
};

const printContract = async (req, res) => {
  try {
    // printedType: pdf or docx
    const printedType = req.query.type || "docx";
    const { id } = req.params;
    console.log("Received request to generate contract for ID:", id);

    const contract = await Contract.findById(id);
    console.log("Fetched contract from DB:", contract);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    console.log("Starting placeholder replacement process...");
    const contractFile = replaceWordFields(contract);
    console.log("Generated contract buffer length:", contractFile.length);

    const fs = require("fs");
    const path = require("path");

    if (printedType === "pdf") {
      const docxConverter = require("docx-pdf");

      const docxPath = path.resolve(__dirname, "../files/contract.docx");
      const pdfPath = path.resolve(__dirname, "./temp/contract.pdf");

      // Save the generated DOCX file
      fs.writeFileSync(docxPath, contractFile);

      // Convert DOCX to PDF
      docxConverter(docxPath, pdfPath, function (err) {
        if (err) {
          console.log("Conversion Error:", err);
          return res.status(500).json({
            success: false,
            message: "Error converting contract to PDF",
          });
        }

        console.log("Sending the generated PDF file to the client...");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="contract.pdf"'
        );
        return res.sendFile(pdfPath);
      });
    } else {
      console.log("Sending the generated DOCX file to the client...");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="contract.docx"'
      );
      return res.send(contractFile);
    }
  } catch (error) {
    console.error("Error in printContract:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate contract",
      error: error.message,
    });
  }
};

const sendEmail = async (req, res) => {
  try {
    const { name, email, subject, message, contractId } = req.body;

    if (!email || !message || !contractId) {
      return res.status(400).json({
        error: "Email, message, and contract ID are required.",
      });
    }

    // Get contract file from request
    const contractFile = req.file;
    if (!contractFile) {
      return res.status(400).json({ error: "Contract file is missing." });
    }

    // Determine the correct file type (PDF or DOCX)
    let fileExtension = contractFile.originalname.split(".").pop(); // Get the file extension
    let filename = `contract.${fileExtension}`; // Dynamically set filename

    console.log(`📄 Attaching contract file as: ${filename}`);

    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject || "Contract Details",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
          <h2 style="color: #4CAF50;">📄 Contract Details</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-left: 4px solid #4CAF50;">
            ${message}
          </p>
          <p style="color: #888;">Please review the attached contract document.</p>
          <hr style="border: 0; height: 1px; background: #ddd; margin-top: 20px;">
          <p style="font-size: 12px; color: #888;">This email was sent automatically. Please do not reply.</p>
        </div>
      `,
      attachments: [
        {
          filename: filename, // ✅ Dynamically use correct file type
          content: contractFile.buffer,
          encoding: "base64",
        },
      ],
    };

    let info = await transporter.sendMail(mailOptions);
    res.status(200).json({
      success: true,
      message: "✅ Email sent successfully with contract!",
      info,
    });
  } catch (error) {
    console.error("❌ Error in sendEmail:", error);
    res.status(500).json({
      error: "Failed to send email",
      details: error.message,
    });
  }
};

// 🔹 Function to Upload Contract to UltraMsg
const uploadToUltraMsg = async (filePath) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      url: `https://api.ultramsg.com/instance106944/media/upload`,
      headers: { "content-type": "multipart/form-data" },
      formData: {
        token: process.env.ULTRAMSG_TOKEN,
        file: fs.createReadStream(filePath),
      },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error("❌ UltraMsg Upload Request Error:", error);
        return reject("Failed to upload file to UltraMsg.");
      }

      console.log("📄 UltraMsg Raw Response:", body); // ✅ Log response

      try {
        const responseBody = JSON.parse(body);
        if (responseBody.success) {
          console.log("✅ Uploaded to UltraMsg:", responseBody.success);
          resolve(responseBody.success); // ✅ Use responseBody.success instead of responseBody.url
        } else {
          reject(`❌ UltraMsg Upload Failed: ${JSON.stringify(responseBody)}`);
        }
      } catch (err) {
        reject("❌ Error parsing UltraMsg response.");
      }
    });
  });
};

// 🔹 Function to Delete Contract from UltraMsg
const deleteFromUltraMsg = async (fileUrl) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      url: `https://api.ultramsg.com/instance106944/media/delete`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      form: {
        token: process.env.ULTRAMSG_TOKEN,
        url: fileUrl, // ✅ File URL to delete
      },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error("❌ Error deleting file from UltraMsg:", error);
        return reject("Failed to delete file from UltraMsg.");
      }

      console.log("✅ UltraMsg File Deleted:", body);
      resolve(true);
    });
  });
};

// 🔹 Function to Delete Contract from Local Server
const deleteFromServer = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log("✅ Contract deleted from server:", filePath);
  } else {
    console.log("⚠️ Contract file not found on server:", filePath);
  }
};

// 🔹 Function to Send WhatsApp Contract via UltraMsg
const sendWhatsAppContract = async (req, res) => {
  try {
    const { whatsapp, contractId, name } = req.body;
    const contractFile = req.file;

    if (!whatsapp || !whatsapp.startsWith("+")) {
      return res.status(400).json({ error: "❌ رقم واتساب غير صالح." });
    }

    if (!contractFile) {
      return res.status(400).json({ error: "❌ لم يتم تحميل ملف العقد." });
    }

    // ✅ Move file to 'uploads' directory
    const filePath = `./uploads/${contractFile.filename}.docx`;
    fs.renameSync(contractFile.path, filePath);

    // ✅ Upload contract to UltraMsg
    console.log("📤 Uploading contract to UltraMsg...");
    const ultraMsgFileUrl = await uploadToUltraMsg(filePath);
    console.log("✅ UltraMsg File URL:", ultraMsgFileUrl);

    // ✅ Send contract via WhatsApp
    const options = {
      method: "POST",
      url: "https://api.ultramsg.com/instance106944/messages/document",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      form: {
        token: process.env.ULTRAMSG_TOKEN,
        to: whatsapp,
        filename: `contract_${contractId}.docx`,
        document: ultraMsgFileUrl, // ✅ Use UltraMsg File URL
        caption: `📄 Hello ${name}, this is your contract. Please review it.`,
      },
    };

    const sendWhatsApp = await new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        if (error) {
          console.error("❌ Error sending WhatsApp contract:", error);
          reject("Failed to send contract via WhatsApp");
        } else {
          console.log("✅ WhatsApp contract sent:", body);
          resolve(true);
        }
      });
    });

    if (sendWhatsApp) {
      // ✅ Delete the contract only if sending was successful
      console.log("🗑️ Deleting contract...");
      deleteFromServer(filePath); // ✅ Delete from local server
      await deleteFromUltraMsg(ultraMsgFileUrl); // ✅ Delete from UltraMsg

      res
        .status(200)
        .json({ success: true, message: "✅ العقد أُرسل بنجاح وتم حذفه!" });
    }
  } catch (error) {
    console.error("❌ Error processing WhatsApp contract:", error);
    res.status(500).json({
      error: "❌ فشل في إرسال العقد عبر واتساب",
      details: error.message,
    });
  }
};

module.exports = {
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
};
