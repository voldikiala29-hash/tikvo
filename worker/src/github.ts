import { Env, HttpError } from './types';

/**
 * Déclenche un workflow GitHub Actions (workflow_dispatch).
 * Le token doit avoir le droit "Actions: Read and write" sur le dépôt.
 */
export async function dispatchWorkflow(
  env: Env,
  workflowFile: string,
  inputs: Record<string, string>,
): Promise<void> {
  if (!env.GH_DISPATCH_TOKEN) {
    throw new HttpError(503, 'not_configured', 'GH_DISPATCH_TOKEN manquant côté serveur (voir SETUP.md).');
  }
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${workflowFile}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'tikvo-api',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: env.GITHUB_REF || 'main', inputs }),
  });
  if (res.status === 204) return;
  const detail = (await res.text().catch(() => '')).slice(0, 300);
  if (res.status === 401 || res.status === 403) {
    throw new HttpError(
      502,
      'github_auth',
      `GitHub a refusé le lancement du rendu (${res.status}). Vérifie GH_DISPATCH_TOKEN (droit « Actions : Read and write » sur le dépôt). ${detail}`,
    );
  }
  if (res.status === 404) {
    throw new HttpError(
      502,
      'github_not_found',
      `Workflow ${workflowFile} introuvable sur la branche ${env.GITHUB_REF} de ${env.GITHUB_REPO}. Fusionne la branche sur main d'abord. ${detail}`,
    );
  }
  throw new HttpError(502, 'github_error', `GitHub a répondu ${res.status} au lancement du workflow. ${detail}`);
}
