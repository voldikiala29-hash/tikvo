import { Env, HttpError } from './types';

// Valeurs de secours si une variable n'est pas définie dans wrangler.toml.
const DEFAULT_REPO = 'voldikiala29-hash/tikvo';
const DEFAULT_BRANCH = 'main';
const DEFAULT_WORKFLOW = 'render-video.yml';
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const WORKFLOW_PATTERN = /^[A-Za-z0-9_.-]+\.ya?ml$/;

export interface GithubTarget {
  repo: string;
  branch: string;
  workflow: string;
}

/** Dépôt, branche et fichier de workflow réellement utilisés. Jamais de valeur `undefined`. */
export function githubTarget(env: Env, workflowFile?: string): GithubTarget {
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
  const workflow = workflowFile || env.GITHUB_WORKFLOW || DEFAULT_WORKFLOW;
  if (!REPO_PATTERN.test(repo)) throw new HttpError(500, 'config', `GITHUB_REPO invalide : « ${repo} ».`);
  if (!branch.trim()) throw new HttpError(500, 'config', 'GITHUB_BRANCH vide.');
  if (!WORKFLOW_PATTERN.test(workflow)) throw new HttpError(500, 'config', `Fichier de workflow invalide : « ${workflow} ».`);
  return { repo, branch, workflow };
}

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
  const { repo, branch, workflow } = githubTarget(env, workflowFile);
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'tikvo-api',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: branch, inputs }),
  });
  if (res.status === 204) return;

  const detail = (await res.text().catch(() => '')).slice(0, 300);
  console.error('[github] dispatch refusé', { status: res.status, repo, branch, workflow, detail });
  const where = `« ${workflow} » sur la branche « ${branch} » de « ${repo} »`;
  if (res.status === 401 || res.status === 403) {
    throw new HttpError(
      502,
      'github_auth',
      `GitHub a refusé le lancement de ${where} (${res.status}). Vérifie GH_DISPATCH_TOKEN (droit « Actions : Read and write »). ${detail}`,
    );
  }
  if (res.status === 404) {
    throw new HttpError(
      502,
      'github_not_found',
      `Workflow introuvable : ${where}. Vérifie que le fichier existe sur cette branche et que le dépôt est accessible. ${detail}`,
    );
  }
  throw new HttpError(502, 'github_error', `GitHub a répondu ${res.status} au lancement de ${where}. ${detail}`);
}
