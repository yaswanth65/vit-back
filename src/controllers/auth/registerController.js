import sequelize from '../../config/database.js';
import {
  User,
  Author,
  AuthenticationMeta,
} from '../../database/models/index.js';
import academicService from '../../services/auth/academicService.js';
import registrationService from '../../services/auth/registerationService.js';
import tokenService from '../../services/auth/tokenService.js';
import bcrypt from 'bcrypt';


/**
 * Step 1: Password Setting & OTP Generation
 * Receives: email, password
 */
const registerStepOne = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email format
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    if (existingUser)
      return res.status(400).json({ message: 'Email already registered.' });

    const passwordHash = await bcrypt.hash(password, 12);

    await sequelize.transaction(async (t) => {
      const newUser = await User.create(
        {
          email: email.toLowerCase().trim(),
          first_name: 'User',
          last_name: 'Profile',
          role: 'Author',
          is_active: false,
        },
        { transaction: t }
      );

      await AuthenticationMeta.create(
        {
          user_id: newUser.id,
          password_hash: passwordHash,
          registration_step: '2',
          is_registration_verified: false,
        },
        { transaction: t }
      );
    });

    await registrationService.requestRegistrationOTP(email);

    res.json({
      message: 'OTP sent',
      email: email.toLowerCase().trim(),
    });

  } catch (error) {
    console.error('Registration Step 1 Error:', error);
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
};

// Helper function (add once at top of controller file if not already present)
const encodeProfileForRedirect = (profile) => {
  try {
    return encodeURIComponent(
      Buffer.from(JSON.stringify(profile)).toString('base64')
    );
  } catch (err) {
    console.error('Encoding error:', err);
    return null;
  }
};

/**
 * Step 2: Verify 6-Digit OTP
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    // Call the service function we refined above
    await registrationService.verifyRegistrationOTP(email, otp);

    res.status(200).json({
      message: 'Email verified. Proceed to final step.',
    });
  } catch (error) {
    // Return 400 for logic errors (invalid/expired OTP)
    // and 500 for unexpected server issues
    res.status(400).json({ message: error.message });
  }
};

/**
 * Step 3: Finalize (Profile + Metrics)
 */
const finalizeRegistration = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      email,
      prefix,
      first_name,
      last_name,
      institution,
      department,
      interests,
      academicProfile,
    } = req.body;

    // Validate required fields
    if (!first_name || first_name.trim().length < 2) {
      await t.rollback();
      return res.status(400).json({
        message: 'First name is required (minimum 2 characters)',
      });
    }

    if (!last_name || last_name.trim().length < 2) {
      await t.rollback();
      return res.status(400).json({
        message: 'Last name is required (minimum 2 characters)',
      });
    }

    if (!institution || institution.trim().length < 2) {
      await t.rollback();
      return res.status(400).json({
        message: 'Institution is required',
      });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const authMeta = await AuthenticationMeta.findOne({
      where: { user_id: user.id },
      transaction: t,
    });

    if (!authMeta?.is_registration_verified) {
      await t.rollback();
      return res.status(403).json({
        message: 'OTP verification required',
      });
    }

    // =====================
    // Update USER
    // =====================

    await user.update(
      {
        prefix: prefix || null,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        is_active: true,
      },
      { transaction: t }
    );

    // =====================
    // Create AUTHOR
    // =====================

    const provider = academicProfile?.provider;
    const providerId = academicProfile?.id;

    await Author.create(
      {
        user_id: user.id,

        orcid_id: provider === 'orcid' ? providerId : null,

        google_scholar_id:
          provider === 'google_scholar' ? providerId : null,

        saml_student_id:
          provider === 'saml' ? providerId : null,

        institution: institution.trim() || academicProfile?.institution,

        department: department?.trim() || academicProfile?.department || 'Not specified',

        country: academicProfile?.country || 'Not specified',

        research_interests: Array.isArray(interests) ? interests : [],

        h_index: academicProfile?.metrics?.h_index || 0,

        total_citations:
          academicProfile?.metrics?.total_citations || 0,

        total_publications:
          academicProfile?.metrics?.total_publications || 0,
      },
      { transaction: t }
    );

    // =====================
    // Update AUTH META
    // =====================

    await authMeta.update(
      {
        registration_step: 'completed',
      },
      { transaction: t }
    );

    // =====================
    // Generate tokens
    // =====================
    const { accessToken, refreshToken, refreshExpires } = await tokenService.generateAuthTokens(user);
    const hashedRefreshToken = await tokenService.hashRefreshToken(refreshToken);

    await authMeta.update(
      {
        current_refresh_token: hashedRefreshToken,
      },
      { transaction: t }
    );

    await t.commit();

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: 'Registration complete',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        prefix: user.prefix || null,
        status: user.is_active ? 'active' : 'inactive',
      },
    });

  } catch (error) {
    await t.rollback();
    console.error('Finalize Registration Error:', error);

    res.status(500).json({
      message: error.message || 'Registration failed',
    });
  }
};

/**
 * Resend OTP with Cooldown Mechanic
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Reuses the same service logic with isResend=true to enforce cooldown
    await registrationService.requestRegistrationOTP(email, true);

    res.json({ message: 'A new verification code has been sent.' });
  } catch (error) {
    const status = error.message.includes('wait') ? 429 : 400;
    res.status(status).json({ message: error.message });
  }
};

// export const orcidCallback = async (req, res) => {
//   try {
//     const { orcid, accessToken } = req.user;

//     // Duplicate check
//     const existingAuth = await AuthenticationMeta.findOne({
//       where: { orcid_id: orcid },
//     });

//     if (existingAuth) {
//       return res.status(409).json({
//         success: false,
//         error: 'account_exists',
//         provider: 'orcid',
//       });
//     }

//     // Fetch normalized academic profile
//     const academicData = await academicService.processAcademicProfile(
//       orcid,
//       accessToken
//     );

//     if (academicData.isProfilePrivate) {
//       return res.status(404).json({
//         success: false,
//         error: 'profile_private',
//         provider: 'orcid',
//       });
//     }

//     // Return normalized object directly
//     return res.status(200).json({
//       success: true,
//       data: academicData,
//     });

//   } catch (error) {
//     console.error('ORCID Callback Error:', error);

//     return res.status(500).json({
//       success: false,
//       error: 'academic_fetch_failed',
//     });
//   }
// };

// export const googleScholarCallback = async (req, res) => {
//   try {
//     const { profile } = req.user;

//     const email = profile.emails?.[0]?.value;
//     const displayName = profile.displayName;

//     if (!email) {
//       return res.status(400).json({
//         success: false,
//         error: 'email_not_provided',
//       });
//     }

//     // Duplicate check
//     const existingUser = await User.findOne({ where: { email } });

//     if (existingUser) {
//       return res.status(409).json({
//         success: false,
//         error: 'account_exists',
//         provider: 'google_scholar',
//       });
//     }

//     // Fetch normalized academic data
//     const academicData =
//       await academicService.processGoogleScholarProfile(
//         displayName,
//         email
//       );

//     if (academicData.isProfilePrivate) {
//       return res.status(404).json({
//         success: false,
//         error: 'profile_not_found',
//         provider: 'google_scholar',
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: academicData,
//       email,
//     });

//   } catch (error) {
//     console.error('Google Scholar Callback Error:', error);

//     return res.status(500).json({
//       success: false,
//       error: 'scholar_fetch_failed',
//     });
//   }
// };

// export const ssoCallback = async (req, res) => {
//   try {
//     const ssoProfile = req.user;

//     const email =
//       ssoProfile.email ||
//       ssoProfile.mail ||
//       ssoProfile.nameID;

//     if (!email) {
//       return res.status(400).json({
//         success: false,
//         error: 'email_not_provided',
//       });
//     }

//     // Duplicate check
//     const existingUser = await User.findOne({
//       where: { email },
//     });

//     if (existingUser) {
//       return res.status(409).json({
//         success: false,
//         error: 'account_exists',
//         provider: 'saml',
//       });
//     }

//     // Fetch normalized academic profile
//     const academicData =
//       await academicService.processSSOProfile(ssoProfile);

//     if (academicData.isProfilePrivate) {
//       return res.status(404).json({
//         success: false,
//         error: 'profile_not_found',
//         provider: 'saml',
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: academicData,
//       email,
//     });

//   } catch (error) {
//     console.error('SSO Callback Error:', error);

//     return res.status(500).json({
//       success: false,
//       error: 'sso_verification_failed',
//     });
//   }
// };

export const orcidCallback = async (req, res) => {
  try {
    const { orcid, accessToken } = req.user;

    // ================================
    // Duplicate check (UNCHANGED LOGIC)
    // ================================
    const existingAuth = await AuthenticationMeta.findOne({
      where: { orcid_id: orcid },
    });

    if (existingAuth) {
      // Redirect instead of JSON
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=account_exists&provider=orcid`
      );
    }

    // ================================
    // Fetch normalized academic profile (UNCHANGED)
    // ================================
    const academicData = await academicService.processAcademicProfile(
      orcid,
      accessToken
    );

    // ================================
    // Handle private profile (UNCHANGED LOGIC, REDIRECT ADDED)
    // ================================
    if (academicData.isProfilePrivate) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?error=profile_private&provider=orcid`
      );
    }

    // ================================
    // NEW: Encode academic profile safely
    // ================================
    const encodedProfile = encodeProfileForRedirect(academicData);

    if (!encodedProfile) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?error=encoding_failed`
      );
    }

    // ================================
    // NEW: Redirect to frontend OAuth success handler
    // ================================
    return res.redirect(
      `${process.env.FRONTEND_URL}/oauth-success?data=${encodedProfile}`
    );

  } catch (error) {
    console.error('ORCID Callback Error:', error);

    return res.redirect(
      `${process.env.FRONTEND_URL}/register?error=academic_fetch_failed`
    );
  }
};

export const googleScholarCallback = async (req, res) => {
  try {
    const { profile } = req.user;

    const email = profile.emails?.[0]?.value;
    const displayName = profile.displayName;

    // ================================
    // Email validation
    // ================================
    if (!email) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?error=email_not_provided&provider=google_scholar`
      );
    }

    // ================================
    // Check if user already exists
    // ================================
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    // ================================
    // HANDLE LOGIN: If user exists and is fully registered
    // ================================
    if (existingUser) {
      // Check if user is fully registered and active
      if (existingUser.is_active) {
        // User is fully registered - LOG THEM IN
        const tokens = await tokenService.generateAuthTokens(existingUser);
        
        // Hash refresh token and update AuthenticationMeta
        const hashedRefreshToken = await tokenService.hashRefreshToken(tokens.refreshToken);
        await AuthenticationMeta.update(
          { 
            current_refresh_token: hashedRefreshToken,
            refresh_token_expires_at: tokens.refreshExpires,
            last_login: new Date()
          },
          { where: { user_id: existingUser.id } }
        );

        // Encode login data for frontend
        const loginData = Buffer.from(JSON.stringify({
          type: 'login',
          accessToken: tokens.accessToken,
          user: existingUser.toSafeObject(),
        })).toString('base64');

        return res.redirect(
          `${process.env.FRONTEND_URL}/oauth-success?data=${loginData}`
        );
      } else {
        // User exists but not fully registered - redirect with error
        return res.redirect(
          `${process.env.FRONTEND_URL}/register?error=incomplete_registration&provider=google_scholar`
        );
      }
    }

    // ================================
    // Fetch normalized academic profile (UNCHANGED)
    // ================================
    const academicData =
      await academicService.processGoogleScholarProfile(
        displayName,
        email
      );

    // ================================
    // Handle private or not found profile
    // ================================
    if (academicData.isProfilePrivate) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?error=profile_not_found&provider=google_scholar`
      );
    }

    // ================================
    // NEW: Encode academic profile safely
    // ================================
    const encodedProfile = encodeProfileForRedirect({
      ...academicData,
      email, // include email for frontend convenience
    });

    if (!encodedProfile) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?error=encoding_failed&provider=google_scholar`
      );
    }

    // ================================
    // NEW: Redirect to frontend OAuth success route
    // ================================
    return res.redirect(
      `${process.env.FRONTEND_URL}/oauth-success?data=${encodedProfile}`
    );

  } catch (error) {
    console.error('Google Scholar Callback Error:', error);

    return res.redirect(
      `${process.env.FRONTEND_URL}/register?error=scholar_fetch_failed&provider=google_scholar`
    );
  }
};

export const ssoCallback = async (req, res) => {
  try {
    const ssoProfile = req.user;

    const email =
      ssoProfile.email ||
      ssoProfile.mail ||
      ssoProfile.nameID;

    // ================================
    // Email validation (UNCHANGED LOGIC)
    // ================================
    if (!email) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?error=email_not_provided&provider=saml`
      );
    }

    // ================================
    // Duplicate check (UNCHANGED LOGIC)
    // ================================
    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=account_exists&provider=saml`
      );
    }

    // ================================
    // Fetch normalized academic profile (UNCHANGED)
    // ================================
    const academicData =
      await academicService.processSSOProfile(ssoProfile);

    // ================================
    // Handle profile not found/private
    // ================================
    if (academicData.isProfilePrivate) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?error=profile_not_found&provider=saml`
      );
    }

    // ================================
    // NEW: Encode academic profile safely
    // ================================
    const encodedProfile = encodeProfileForRedirect({
      ...academicData,
      email, // include verified institutional email
    });

    if (!encodedProfile) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?error=encoding_failed&provider=saml`
      );
    }

    // ================================
    // NEW: Redirect to frontend OAuth success handler
    // ================================
    return res.redirect(
      `${process.env.FRONTEND_URL}/oauth-success?data=${encodedProfile}`
    );

  } catch (error) {
    console.error('SSO Callback Error:', error);

    return res.redirect(
      `${process.env.FRONTEND_URL}/register?error=sso_verification_failed&provider=saml`
    );
  }
};

export default {
  registerStepOne,
  verifyOTP,
  finalizeRegistration,
  resendOTP,
  orcidCallback,
  googleScholarCallback,
  ssoCallback,
};
