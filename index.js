const core = require("@actions/core");
const github = require("@actions/github");
const exec = require("@actions/exec");

/**
 * @param {string} s
 * @param {string} searchString
 * @returns {string | null}
 */
function startsWithTail(s, searchString) {
  if (s.startsWith(searchString)) {
    return s.substring(searchString.length);
  } else {
    return null;
  }
}

async function main() {
  try {
    const imageName = core.getInput("image-name");
    const personalToken = core.getInput("personal-token");
    const {
      sha,
      ref,
      actor,
      repo: { repo, owner },
    } = github.context;

    const imageRepo = `docker.pkg.github.com/${owner}/${repo}`;
    const versionBase = sha.substr(0, 7);
    const versionSuffix = (() => {
      if (ref === "refs/heads/master") {
        return "";
      }

      if (ref == "refs/heads/develop") {
        return "-dev";
      }

      const branchName = startsWithTail(ref, "refs/heads/");
      if (branchName !== null) {
        return `-branch--${branchName.replace(/\W/g, "-")}`;
      }

      const tagName = startsWithTail(ref, "refs/tags/");
      if (tagName !== null) {
        return `-tag--${tagName.replace(/\W/g, "-")}`;
      }

      throw new Error(`unknown ref: ${ref}`);
    })();

    const version = versionBase + versionSuffix;
    const imageTag = `${imageRepo}/${imageName}:${version}`;

    await exec.exec(`docker build -t ${imageTag} .`);

    await exec.exec(
      `docker login docker.pkg.github.com -u ${actor} -p ${personalToken}`
    );

    await exec.exec(`docker push ${imageTag}`);

    core.setOutput("image-tag", imageTag);
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
