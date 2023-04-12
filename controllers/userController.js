import { User } from "../models/userModel.js";
import { sendMail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";
import cloudinary from "cloudinary";
import fs from "fs";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const avatarPath = req.files.avatar.tempFilePath;

    let user = await User.findOne({ email });

    if (user) {
      return res.status(200).json({
        success: false,
        message: "User Already exists",
      });
    }

    const otp = Math.floor(Math.random() * 1000000);

    const myCloud = await cloudinary.v2.uploader.upload(avatarPath, {
        folder: "todoApp",
    });

    fs.rmSync("./tmp", { recursive: true });

    user = await User.create({
      name,
      email,
      password,
      avatar: {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      },
      otp,
      otp_expiry: new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000),
    });

    const subject = `Verification OTP for Your [ToDo App] Account`;

    const emailMessage = `Dear ${name},
We hope this email finds you well. As a part of our ongoing effort to ensure the security of your [ToDo App] account, we require you to verify your account through a one-time password (OTP).
    
To complete the verification process, please enter the following OTP code into the app: ${otp}. This code will expire in ${new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000)}. If you do not enter the code within this time frame, you will need to request a new OTP.
    
We take the privacy and security of your information seriously and appreciate your cooperation in helping us maintain the integrity of your account.
    
If you have any questions or concerns regarding the verification process, please do not hesitate to reach out to our support team.
    
Thank you for using [ToDo App] to help you stay on top of your tasks and for taking the time to verify your account.
    
Best regards,
[Nikunj]
The [ToDo App] Team`;

    await sendMail(email, subject, emailMessage);

    sendToken(res, user, 201, "We have sent a One-Time Password (OTP) to your registered email address. Please verify your account.");
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const login = async (req, res) => {
    try {
      const { email, password } = req.body;

      if(!email || !password) {
        return res.status(400).json({success: false, message: "Please enter both email and password"});
      }
  
      const user = await User.findOne({ email }).select("+password");
  
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const isMatch = await user.comparePassword(password);

      if(!isMatch) {
        return res
            .status(400)
            .json({ 
                success: false,
                message: "Invalid Email or password"
            });
      }
  
      sendToken(res, user, 200, "Login Successful");
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

export const verify = async(req, res) => {
    try {
        const otp = req.body.otp;

        const user = await User.findById(req.user._id);

        if(user.otp !== otp || user.otp_expiry < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid OTP or has been expired"});
        }

        user.verified = true;
        user.otp = null;
        user.otp_expiry = null;

        await user.save();

        sendToken(res, user, 200, "Account verified");
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

export const logout = async (req, res) => {
    try {
        res
            .status(200)
            .cookie("token", null, {
                expires: new Date(Date.now()),
            })
            .json({
                success: true,
                message: "Logged out successfully"
            });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const addTask = async (req, res) => {
    try {
        const { title, description } = req.body;

        const user = await User.findById(req.user._id);

        user.tasks.push({title, description, completed: false, createdAt: new Date(Date.now())});

        await user.save();

        res.status(200).json({
            success: true,
            message: "task added successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

export const removeTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        const user = await User.findById(req.user._id);

        user.tasks = user.tasks.filter((task) => task._id.toString() !== taskId.toString());

        await user.save();

        res.status(200).json({
            success: true,
            message: "task removed successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

export const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        const user = await User.findById(req.user._id);

        user.task = user.tasks.find((task) => task._id.toString() === taskId.toString());

        user.task.completed = !user.task.completed;

        await user.save();

        res.status(200).json({
            success: true,
            message: "task completed successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

export const getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        sendToken(res, user, 200, `Welcome Back ${user.name}`);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        const { name } = req.body;
        const avatarPath = req.files.tempFilePath;

        if(name) user.name = name;
        if(avatar) {
            await cloudinary.v2.uploader.destroy(user.avatar.public_id);

            const myCloud = await cloudinary.v2.uploader.upload(avatarPath, {
                folder: "todoApp",
            });
            
            fs.rmSync("./tmp", {recursive: true});

            user.avatar = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            }
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile Updated Successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+password');

        const { oldPassword, newPassword, confirmPassword } = req.body;

        if(!oldPassword || !newPassword || !confirmPassword) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: "Please enter all fields"
                });
        }
        
        const isMatch = await user.comparePassword(oldPassword);

        if(!isMatch || newPassword !== confirmPassword) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: "Invalid Old Password"
                });
        }

        user.password = newPassword;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password Updated Successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

export const forgotPassword = async(req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({email});

        if(!user) {
            return res.status(400).json({success: false, message: "Invalid Email"});
        }

        const otp = Math.floor(Math.random() * 1000000);

        user.resetPasswordOTP = otp;
        user.resetPasswordOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await user.save();

        const subject = `Reset Your Password for [ToDo App] Account`;

        await sendMail(email, subject, `Your OTP is ${otp}`);

        sendToken(res, user, 201, `OTP sent to ${user.email}`);

    } catch (error) {
        return res.status(500).json({success: false, message: error.message});
    }
}

export const resetPassword = async(req, res) => {
    try {
        const { otp, newPassword } = req.body;

        const user = await User.findOne({
            resetPasswordOTP: otp,
            resetPasswordOTPExpiry: { $gt: Date.now() },
        }).select("+password");

        if(!user) {
            return res.status(400).json({success: false, message: "Otp Invalid or has been Expired"});
        }

        user.resetPasswordOTP = null;
        user.resetPasswordOTPExpiry = null;
        user.password = newPassword;

        await user.save();

        res.status(200).json({ success: true, message: `Password Changed Successfully`});
    } catch (error) {
        return res.status(500).json({success: false, message: error.message});
    }
}
