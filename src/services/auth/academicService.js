// src/services/academicService.js
import axios from 'axios';

class AcademicService {
  async _fetchFromOpenAlex(url) {
    return axios.get(url, {
      headers: {
        api_key: process.env.OPENALEX_API_KEY, // Ensure this matches your .env key name
      },
    });
  }

  //To make sure these Oauths and OpenAlex data is in a consistent format for the controller to process
  _normalizeProfile({
    provider,
    id,
    firstName = null,
    lastName = null,
    institution = null,
    department = null,
    country = null,
    details = {},
    metrics = {},
    isProfilePrivate = false,
  }) {
    return {
      provider,
      id,
      first_name: firstName,
      last_name: lastName,
      institution,
      department,
      country,
      details,
      metrics,
      isProfilePrivate,
    };
  }
  //===============Orcid===============================//
  async processAcademicProfile(orcidId, token) {
    const orcidRecord = await this._fetchFromOrcid(orcidId, token);

    const works = orcidRecord['activities-summary']?.works?.group || [];
    const employments =
      orcidRecord['activities-summary']?.employments?.['affiliation-group'] ||
      [];
    const educations =
      orcidRecord['activities-summary']?.educations?.['affiliation-group'] ||
      [];

    const isProfileEmptyOrPrivate =
      works.length === 0 && employments.length === 0 && educations.length === 0;

    const metrics = await this._fetchScholarlyMetrics(orcidId, orcidRecord);

    // === Extract Profile Data ===
    const person = orcidRecord.person || {};
    const nameObj = person.name || {};

    const firstName = nameObj['given-names']?.value || null;
    const lastName = nameObj['family-name']?.value || null;

    const employment = employments[0]?.summaries?.[0]?.['employment-summary'];
    const institution = employment?.organization?.name || null;
    const country = employment?.organization?.address?.country || null;

    const department = employment?.department - name || null;

    return this._normalizeProfile({
      provider: 'orcid',
      id: orcidId,
      firstName,
      lastName,
      institution,
      department,
      country,
      details: {
        raw: orcidRecord,
      },
      metrics,
      isProfilePrivate: isProfileEmptyOrPrivate,
    });
  }

  async _fetchFromOrcid(orcidId, token) {
    const response = await axios.get(`https://pub.orcid.org/v3.0/${orcidId}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  async _fetchScholarlyMetrics(orcidId, orcidRecord) {
    try {
      const response = await axios.get(
        `https://api.openalex.org/authors/https://orcid.org/${orcidId}`
      );
      return {
        total_publications: response.data.works_count || 0,
        total_citations: response.data.cited_by_count || 0,
        h_index: response.data.summary_stats?.h_index || 0,
        source: 'OpenAlex',
      };
    } catch (error) {
      // FALLBACK: If not in OpenAlex, count works manually from ORCID record
      const orcidWorks = orcidRecord['activities-summary']?.works?.group || [];

      return {
        total_publications: orcidWorks.length,
        total_citations: 0, // ORCID doesn't track citations
        h_index: 0, // ORCID doesn't calculate H-index
        source: 'ORCID-Direct',
      };
    }
  }

  //===============Google Scholar (Optional)===============================//
  // src/services/academicService.js

  async processGoogleScholarProfile(name, email) {
    try {
      const searchUrl = `https://api.openalex.org/authors?filter=display_name.search:${encodeURIComponent(name)}&mailto=${email}`;
      const response = await axios.get(searchUrl);

      const author =
        response.data.results
          .sort((a, b) => b.cited_by_count - a.cited_by_count)
          .find((a) => a.ids.orcid || a.ids.mag) || response.data.results[0];

      if (!author) {
        return this._normalizeProfile({
          provider: 'google_scholar',
          id: null,
          isProfilePrivate: true,
        });
      }

      const scholarId = author.ids?.mag || author.id.split('/').pop();

      const [firstName, ...rest] = (author.display_name || '').split(' ');
      const lastName = rest.join(' ') || null;

      return this._normalizeProfile({
        provider: 'google_scholar',
        id: scholarId,
        firstName,
        lastName,
        institution: author.last_known_institution?.display_name || null,
        department: null,
        country: author.last_known_institution?.country_code || null,
        details: {
          openalex_id: author.id,
          orcid: author.ids?.orcid || null,
          raw: author,
        },
        metrics: {
          total_publications: author.works_count || 0,
          total_citations: author.cited_by_count || 0,
          h_index: author.summary_stats?.h_index || 0,
        },
        isProfilePrivate: false,
      });
    } catch (error) {
      return this._normalizeProfile({
        provider: 'google_scholar',
        id: null,
        isProfilePrivate: true,
      });
    }
  }

  // src/services/academicService.js

  async processSSOProfile(ssoProfile) {
    try {
      const name =
        ssoProfile.displayName ||
        ssoProfile.cn ||
        `${ssoProfile.firstName} ${ssoProfile.lastName}`;

      const email = ssoProfile.email || ssoProfile.mail || ssoProfile.nameID;

      const externalId = ssoProfile.nameID || ssoProfile.uid;

      const institution =
        ssoProfile.organization || ssoProfile.o || ssoProfile.issuer || null;

      const department = ssoProfile.department || ssoProfile.ou || null;

      const [firstName, ...rest] = name?.split(' ') || [];
      const lastName = rest?.join(' ') || null;

      const searchUrl = `https://api.openalex.org/authors?filter=display_name.search:${encodeURIComponent(name)}&mailto=${email}`;
      const response = await axios.get(searchUrl);

      const author = response.data.results.sort(
        (a, b) => b.cited_by_count - a.cited_by_count
      )[0];

      return this._normalizeProfile({
        provider: 'saml',
        id: externalId,
        firstName,
        lastName,
        institution,
        department,
        country: author?.last_known_institution?.country_code || null,
        details: {
          eduPersonAffiliation: ssoProfile.eduPersonAffiliation || [],
          title: ssoProfile.title || null,
          raw: ssoProfile,
        },
        metrics: {
          total_publications: author?.works_count || 0,
          total_citations: author?.cited_by_count || 0,
          h_index: author?.summary_stats?.h_index || 0,
        },
        isProfilePrivate: !author,
      });
    } catch (error) {
      return this._normalizeProfile({
        provider: 'saml',
        id: null,
        isProfilePrivate: true,
      });
    }
  }
}

export default new AcademicService();
