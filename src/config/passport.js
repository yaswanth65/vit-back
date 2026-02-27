import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as OrcidStrategy } from 'passport-orcid';
import { MultiSamlStrategy as SamlStrategy } from 'passport-saml';

// Google Strategy (Used for Google Scholar verification)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5001/api/v1/auth/google/callback",
    state: true, // MUST BE TRUE to prevent CSRF attacks
  },
  (accessToken, refreshToken, profile, done) => {
    // We pass the profile and token to the controller
    return done(null, { profile, accessToken, provider: 'google_scholar' });
  }
));

// ORCID Strategy
passport.use(new OrcidStrategy({
    sandbox: process.env.NODE_ENV !== 'production', // Use sandbox for dev
    clientID: process.env.ORCID_CLIENT_ID,
    clientSecret: process.env.ORCID_CLIENT_SECRET,
    callbackURL: process.env.ORCID_REDIRECT_URI || "http://localhost:5001/api/v1/auth/orcid/callback"
  },
  (accessToken, refreshToken, params, profile, done) => {
    // params contains the orcid id
    return done(null, { orcid: params.orcid, accessToken, provider: 'orcid' });
  }
));

passport.use(new SamlStrategy(
  {
    // These configurations are usually provided by the Institution's metadata
    getSamlOptions: (req, done) => {
      done(null, {
        path: '/api/auth/sso/callback',
        entryPoint: process.env.SSO_ENTRY_POINT, // Institution's Login URL
        issuer: process.env.SSO_ISSUER,         // Your App ID
        cert: process.env.SSO_CERT,             // Institution's Public Cert
      });
    }
  },
  (profile, done) => {
    // 'profile' here contains the SAML assertions (department, email, etc.)
    return done(null, { 
      ...profile, 
      provider: 'sso' 
    });
  }
));

export default passport;