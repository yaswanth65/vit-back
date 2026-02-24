import { Author, User } from '../../database/models/index.js';
import { uploadToR2, deleteFromR2 } from '../../services/r2Services.js';
/**
 * GET AUTHOR PROFILE
 * Fetches User + Author details, prioritizes IDs, and includes metrics
 */
export const getAuthorProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    const profile = await User.findOne({
      where: { id: userId },
      // ADDED: 'profile_image' to the attributes list
      attributes: [
        'id',
        'prefix',
        'first_name',
        'last_name',
        'email',
        'profile_image',
      ],
      include: [
        {
          model: Author,
          as: 'authorProfile',
          attributes: [
            'phone',
            'institution',
            'department',
            'country',
            'orcid_id',
            'google_scholar_id',
            'saml_student_id',
            'total_publications',
            'total_citations',
            'h_index',
            'billing_name',
            'billing_address',
            'invoice_email',
            'tax_id',
          ],
        },
      ],
    });

    if (!profile) {
      return res.status(404).json({ message: 'Author profile not found' });
    }

    const profileData = profile.toJSON();
    const author = profileData.author_details || {};

    // Logic: Select one ID to display (Priority: ORCID > Google Scholar > SAML)
    const displayId =
      author.orcid_id ||
      author.google_scholar_id ||
      author.saml_student_id ||
      null;
    const idType = author.orcid_id
      ? 'ORCID'
      : author.google_scholar_id
        ? 'Google Scholar'
        : author.saml_student_id
          ? 'Student ID'
          : 'None';

    profileData.active_academic_id = displayId;
    profileData.active_academic_id_type = idType;

    // The profile_image is now part of profileData.
    // If it's null in DB, it will be null here.
    // If it exists, it will be { key: "...", url: "...", ... }

    res.json(profileData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * UPDATE AUTHOR PROFILE
 * Updates editable fields. Excludes: email and metrics.
 */
export const updateAuthorProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    const {
      prefix,
      first_name,
      last_name, // User table
      phone,
      institution,
      department,
      country,
      billing_name,
      billing_address,
      invoice_email,
      tax_id, // Author table
    } = req.body;

    // 1. Handle Profile Image Upload (if file exists in request)
    let profileImageData = undefined;

    if (req.file) {
      const user = await User.findByPk(userId);

      // If user already has an image, delete the old file from R2
      if (
        user.profile_image &&
        typeof user.profile_image === 'object' &&
        user.profile_image.key
      ) {
        await deleteFromR2(user.profile_image.key);
      }

      // Upload new image to 'profiles' folder
      profileImageData = await uploadToR2(req.file, 'profiles');
    }

    // 2. Update Base User Fields
    const userUpdatePayload = { prefix, first_name, last_name };
    if (profileImageData) {
      userUpdatePayload.profile_image = profileImageData; // Saving the JSON object
    }

    await User.update(userUpdatePayload, { where: { id: userId } });

    // 3. Update Author Specific Fields
    await Author.update(
      {
        phone,
        institution,
        department,
        country,
        billing_name,
        billing_address,
        invoice_email,
        tax_id,
      },
      { where: { user_id: userId } }
    );

    res.json({
      message: 'Profile updated successfully',
      profile_image: profileImageData || undefined,
    });
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ message: err.message });
  }
};

//dedicated endpoint to just delete profile image without affecting other profile details
export const deleteProfileImage = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findByPk(userId);

    if (user?.profile_image?.key) {
      // Delete from Cloudflare R2
      await deleteFromR2(user.profile_image.key);

      // Clear from Database
      user.profile_image = null;
      await user.save();
    }

    res.json({ message: 'Profile image removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET BILLING PROFILE
 * Fetches specific financial and institutional identity fields for invoicing
 */
export const getBillingProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    const billingInfo = await Author.findOne({
      where: { user_id: userId },
      attributes: [
        'billing_name',
        'institution',
        'country', // Used as Country/Region
        'billing_address',
        'invoice_email',
        'tax_id',
      ],
    });

    if (!billingInfo) {
      return res.status(404).json({ message: 'Billing profile not found' });
    }

    res.json(billingInfo);
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Error fetching billing details', error: err.message });
  }
};

/**
 * UPDATE BILLING PROFILE
 * Updates billing-related fields only
 */
export const updateBillingProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Extract only the billing-related fields from the request
    const {
      billing_name,
      institution,
      country,
      billing_address,
      invoice_email,
      tax_id,
    } = req.body;

    const [updated] = await Author.update(
      {
        billing_name,
        institution,
        country,
        billing_address,
        invoice_email,
        tax_id,
      },
      { where: { user_id: userId } }
    );

    if (updated === 0) {
      return res
        .status(404)
        .json({ message: 'Author record not found to update' });
    }

    res.json({ message: 'Billing profile updated successfully' });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: 'Error updating billing details', error: err.message });
  }
};

/**
 * SELF DEACTIVATE ACCOUNT
 * Allows an Author to deactivate their own account.
 * Once deactivated, the Author cannot log in to reactivate it.
 */
export const deactivateSelf = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { reason } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already deactivated (though they shouldn't be able to hit this if logged out)
    if (!user.is_active) {
      return res.status(400).json({ message: 'Account is already inactive' });
    }

    // Update status
    user.is_active = false;
    user.deactivated_at = new Date();
    user.deactivated_reason = reason || 'Self-deactivated by user';

    await user.save();

    // In a real-world scenario, you might want to invalidate their current tokens/session here
    
    res.json({
      message: 'Your account has been successfully deactivated. You will no longer have access to the platform unless reactivated by an administrator.',
    });
  } catch (err) {
    console.error('Self Deactivation Error:', err);
    res.status(500).json({ message: err.message });
  }
};

export default {
  getAuthorProfile,
  updateAuthorProfile,
  getBillingProfile,
  updateBillingProfile,
  deactivateSelf,
};
