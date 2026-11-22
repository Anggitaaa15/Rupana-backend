import { Request, Response } from "express";
import { db } from "../../config/db";
import { usersTable } from "../../config/schema";
import { and, eq, ne } from "drizzle-orm";
import { AuthRequest } from "../../middleware/auth.middleware";
import { updateProfileSchema } from "../../validations/profile.validation";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../service/cloudinary.service";

export class ProfileController {
  // GET PROFILE
  static getProfile = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const [user] = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          phone: usersTable.phone,
          address: usersTable.address,
          role: usersTable.role,
          profileImage: usersTable.profileImage,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Pengguna tidak ditemukan",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Berhasil mengambil profil",
        data: user,
      });
    } catch (error) {
      console.error("Get profile error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // UPDATE PROFILE
  static updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const validatedData = updateProfileSchema.safeParse(req.body);

      if (!validatedData.success) {
        return res.status(400).json({
          success: false,
          message: "Validasi gagal",
          errors: validatedData.error.flatten().fieldErrors,
        });
      }

      const { username, email, phone } = validatedData.data;

      // CHECK EMAIL
      if (email) {
        const [existingEmail] = await db
          .select()
          .from(usersTable)
          .where(and(eq(usersTable.email, email), ne(usersTable.id, userId)));

        if (existingEmail) {
          return res.status(409).json({
            success: false,
            message: "Email sudah digunakan",
          });
        }
      }

      const [updatedUser] = await db
        .update(usersTable)
        .set({
          username,
          email,
          phone,
        })
        .where(eq(usersTable.id, userId))
        .returning({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          phone: usersTable.phone,
          role: usersTable.role,
        });

      return res.status(200).json({
        success: true,
        message: "Profil berhasil diperbarui",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Update profile error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // UPLOAD PROFILE IMAGE
  static uploadProfileImage = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Foto profil wajib diunggah",
        });
      }

      // Ambil foto profil lama
      const [user] = await db
        .select({
          profileImagePublicId: usersTable.profileImagePublicId,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Pengguna tidak ditemukan",
        });
      }

      // Upload foto baru ke Cloudinary
      const uploadedImage = await uploadToCloudinary(
        req.file.buffer,
        "rupana",
      );

      // Simpan URL dan Public ID ke database
      const [updatedUser] = await db
        .update(usersTable)
        .set({
          profileImage: uploadedImage.secure_url,
          profileImagePublicId: uploadedImage.public_id,
        })
        .where(eq(usersTable.id, userId))
        .returning({
          id: usersTable.id,
          profileImage: usersTable.profileImage,
        });

      // Hapus foto lama jika sebelumnya sudah ada
      if (user.profileImagePublicId) {
        try {
          await deleteFromCloudinary(user.profileImagePublicId);
        } catch (error) {
          console.error("Gagal menghapus foto lama:", error);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Foto profil berhasil diperbarui",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Upload profile image error:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal mengunggah foto profil",
      });
    }
  };

  // DELETE PROFILE IMAGE
  static deleteProfileImage = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const [user] = await db
        .select({
          profileImagePublicId: usersTable.profileImagePublicId,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Pengguna tidak ditemukan",
        });
      }

      if (!user.profileImagePublicId) {
        return res.status(404).json({
          success: false,
          message: "Foto profil belum tersedia",
        });
      }

      // Hapus foto dari Cloudinary
      await deleteFromCloudinary(user.profileImagePublicId);

      // Kosongkan data foto di database
      await db
        .update(usersTable)
        .set({
          profileImage: null,
          profileImagePublicId: null,
        })
        .where(eq(usersTable.id, userId));

      return res.status(200).json({
        success: true,
        message: "Foto profil berhasil dihapus",
      });
    } catch (error) {
      console.error("Delete profile image error:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal menghapus foto profil",
      });
    }
  };
}
