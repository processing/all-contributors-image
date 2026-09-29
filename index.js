import core from "@actions/core";
import github from "@actions/github";
import { generateImage } from "./generateImage.js";

async function run() {
  const context = github.context;
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  const token = core.getInput("token", { required: true });
  const baseBranch = core.getInput("base-branch") || "main";

  const octokit = github.getOctokit(token);
  const newBranch = "update-contributors-png";
  const filePath = "contributors.png";

  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${baseBranch}/.all-contributorsrc`,
  );
  if (!res.ok) {
    throw new Error("failed to fetch .all-contributorsrc");
  }
  const data = await res.json();
  const contributors = data.contributors;

  const contentBuffer = await generateImage(contributors);
  let existingBuffer = null;

  const existing = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${baseBranch}/contributors.png`,
  );

  if (existing.ok) {
    const arrayBuffer = await existing.arrayBuffer();
    existingBuffer = Buffer.from(arrayBuffer);
  }

  if (existingBuffer && contentBuffer.equals(existingBuffer)) return;

  const content = contentBuffer.toString("base64");
  // get base branch sha
  const { data: baseRef } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  });
  const baseSha = baseRef.object.sha;

  // create branch (or reuse if exists)
  try {
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranch}`,
      sha: baseSha,
    });
  } catch (e) {
    if (e.status !== 422) throw e;
    // update branch, if already exists
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${newBranch}`,
      sha: baseSha,
      force: true,
    });
  }

  // check if file already exists on branch
  let existingSha;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: newBranch,
    });

    if (!Array.isArray(data) && data.sha) {
      existingSha = data.sha;
    }
  } catch (e) {
    if (e.status !== 404) throw e; // anything other than "doesn't exist"
  }

  // create/update file and commit
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: "Update contributors.png from .all-contributorsrc",
    content,
    branch: newBranch,
    ...(existingSha && { sha: existingSha }),
  });

  // create pull request if not exists
  const { data: prs } = await octokit.rest.pulls.list({
    owner,
    repo,
    head: `${owner}:${newBranch}`,
    base: baseBranch,
    state: "open",
  });
  if (prs.length === 0) {
    await octokit.rest.pulls.create({
      owner,
      repo,
      title: "chore: update contributors.png from .all-contributorsrc",
      head: newBranch,
      base: baseBranch,
      body: "This PR updates the contributors.png to reflect changes in .all-contributorsrc",
    });
  }
}

run().catch((e) => core.setFailed(e.message));
