/**
 * Upload Newick trees to iTOL via batch_uploader.cgi (v4: zipFile + APIkey).
 * @see https://itol.embl.de/help.cgi#batch
 */

import JSZip from 'jszip';

const ITOL_BATCH_UPLOAD_URL = 'https://itol.embl.de/batch_uploader.cgi';
const ITOL_VIEWER_BASE = 'https://itol.embl.de/external.cgi';

/**
 * @param {string} treeId
 */
export function buildItolViewerUrl(treeId) {
  const params = new URLSearchParams({
    tree: treeId,
    restore_saved: '1',
  });
  return `${ITOL_VIEWER_BASE}?${params.toString()}`;
}

/**
 * @param {string} body
 */
function parseItolUploadResponse(body) {
  const lines = body
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw Object.assign(new Error('Empty response from iTOL batch uploader'), { status: 502 });
  }

  const lastLine = lines[lines.length - 1];
  if (lastLine.startsWith('ERR')) {
    let message = lastLine;
    if (/subscription|API key/i.test(lastLine)) {
      message += '. Batch upload may require an iTOL subscription — see https://itol.embl.de/infoReg.cgi';
    }
    throw Object.assign(new Error(message), { status: 422 });
  }

  const successMatch = lastLine.match(/^SUCCESS:\s*(\S+)/);
  if (successMatch) {
    return successMatch[1];
  }

  const anySuccess = lines.find(line => line.startsWith('SUCCESS:'));
  if (anySuccess) {
    const match = anySuccess.match(/^SUCCESS:\s*(\S+)/);
    if (match) return match[1];
  }

  throw Object.assign(
    new Error(lines.join(' ').slice(0, 500) || 'Unexpected iTOL upload response'),
    { status: 502 },
  );
}

/**
 * @param {string} newick
 * @param {{ treeName?: string, treeDescription?: string }} [options]
 */
export async function uploadNewickToItol(newick, options = {}) {
  const apiKey =
    process.env.ITOL_API_KEY?.trim() || process.env.ITOL_UPLOAD_ID?.trim();
  if (!apiKey) {
    throw Object.assign(
      new Error(
        'ITOL_API_KEY (or ITOL_UPLOAD_ID) not configured. Copy your API key from iTOL account settings into backend/.env. See https://itol.embl.de/help.cgi#batch',
      ),
      { status: 503 },
    );
  }

  const projectName = process.env.ITOL_PROJECT_NAME?.trim() || 'Petadex';
  const treeName = options.treeName?.trim() || 'petadex_tree';
  const treeDescription = options.treeDescription?.trim() || 'Uploaded from Petadex trees prototype';

  const treeFileName = `${treeName}.tree`;
  const zip = new JSZip();
  zip.file(treeFileName, newick);
  const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });

  const form = new FormData();
  form.append('APIkey', apiKey);
  form.append('projectName', projectName);
  form.append('treeName', treeName);
  form.append('treeDescription', treeDescription);
  form.append(
    'zipFile',
    new Blob([zipBytes], { type: 'application/zip' }),
    `${treeName}.zip`,
  );

  const started = Date.now();
  let response;
  try {
    response = await fetch(ITOL_BATCH_UPLOAD_URL, {
      method: 'POST',
      body: form,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw Object.assign(new Error(`Failed to reach iTOL: ${msg}`), { status: 502 });
  }

  const body = await response.text();
  if (!response.ok) {
    throw Object.assign(
      new Error(body.trim().slice(0, 500) || `iTOL HTTP ${response.status}`),
      { status: response.status >= 500 ? 502 : 422 },
    );
  }

  const treeId = parseItolUploadResponse(body);
  const uploadMs = Date.now() - started;

  return {
    treeId,
    viewerUrl: buildItolViewerUrl(treeId),
    uploadMs,
  };
}
