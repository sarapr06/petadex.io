/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/
 */

/**
 * Configure webpack for Molstar
 * @type {import('gatsby').GatsbyNode['onCreateWebpackConfig']}
 */
exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
    resolve: {
      fallback: {
        fs: false,
        path: false,
        crypto: false,
      }
    }
  });
};

/**
 * @type {import('gatsby').GatsbyNode['createPages']}
 */
exports.createPages = async ({ actions }) => {
  const { createPage } = actions;
  
  // Use production URL during build; skip static page generation in local dev
  const apiUrl = process.env.GATSBY_API_URL || "https://api.petadex.net/api";
  const isDev = process.env.NODE_ENV === "development";

  console.log(`Using API URL: ${apiUrl}`);

  if (isDev) {
    console.log("ℹ️  Skipping static page generation in development mode.");
    return;
  }

  // Create sequence pages
  try {
    console.log(`Fetching sequences from ${apiUrl}/fastaa`);
    const response = await fetch(`${apiUrl}/fastaa`, {
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    const sequences = await response.json();
    console.log(`Found ${sequences.length} sequences`);

    sequences.forEach(sequence => {
      createPage({
        path: `/sequence/${sequence.accession}`,
        component: require.resolve("./src/templates/sequence.js"),
        context: { sequence },
      });
    });

    console.log(`✓ Created ${sequences.length} sequence pages`);
  } catch (error) {
    console.error("❌ Error creating sequence pages:", error.message);
  }

  // Create enzyme pages
  try {
    console.log(`Fetching enzymes from ${apiUrl}/enzymes`);
    const response = await fetch(`${apiUrl}/enzymes?limit=10000`, {
      signal: AbortSignal.timeout(60000) // 60 second timeout for large dataset
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    const result = await response.json();
    const enzymes = result.data || [];
    console.log(`Found ${enzymes.length} enzymes`);

    enzymes.forEach(enzyme => {
      const accessionId = enzyme.genbank_accession_id || enzyme.enzyme_id;
      createPage({
        path: `/sequence/${accessionId}`,
        component: require.resolve("./src/templates/enzyme.js"),
        context: { 
          enzymeId: enzyme.enzyme_id,
          accessionId: accessionId,
        },
      });
    });

    console.log(`✓ Created ${enzymes.length} enzyme/sequence pages`);
  } catch (error) {
    console.error("❌ Error creating enzyme pages:", error.message);
  }

  // Create family pages
  try {
    console.log(`Fetching families from ${apiUrl}/enzymes/families/summary`);
    const response = await fetch(`${apiUrl}/enzymes/families/summary?limit=10000`, {
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const result = await response.json();
    const families = result.data || [];
    console.log(`Found ${families.length} families`);

    families.forEach(family => {
      createPage({
        path: `/family/${family.family_id}`,
        component: require.resolve("./src/templates/family.js"),
        context: {
          familyId: family.family_id,
        },
      });
    });

    console.log(`✓ Created ${families.length} family pages`);
  } catch (error) {
    console.error("❌ Error creating family pages:", error.message);
  }
};