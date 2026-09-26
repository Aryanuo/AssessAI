# Contributing to AssessAI

Thank you for your interest in contributing to AssessAI! Contributions
of all kinds are welcome, including bug fixes, documentation, tests,
accessibility improvements, and new features.

Please read this guide before opening an issue or pull request.

## Before you start

-   Check the [README](README.md) for the project's purpose and current
    setup instructions.
-   Search existing [issues](../../issues) and pull requests to avoid
    duplicating work.
-   For substantial changes, open an issue first to discuss the proposed
    approach.
-   Keep contributions focused. Avoid unrelated refactors or changes
    that alter existing behavior without discussion.

## Find something to work on

Look through the repository's open issues, especially issues labeled:

-   `good first issue`
-   `help wanted`
-   `bug`
-   `enhancement`

If you want to work on an issue, leave a comment asking to be assigned
or confirming that you are taking it. If you have an idea that is not
covered by an issue, open one describing the problem, proposed solution,
and relevant context.

## Project setup

AssessAI has a React/Vite frontend in `client/` and a Node.js/Express
backend in `server/`. The application uses Supabase and Gemini AI
services.

### Requirements

-   Git
-   Node.js and npm (use a currently supported Node.js LTS version)
-   A Supabase project for features that require database,
    authentication, or storage access
-   A Gemini API key for features that call Gemini

### 1. Fork and clone

Fork the repository on GitHub, then clone your fork:

``` bash
git clone https://github.com/YOUR-USERNAME/YOUR-FORK.git
cd YOUR-FORK
```

Add the original repository as an upstream remote:

``` bash
git remote add upstream https://github.com/ORIGINAL-OWNER/ORIGINAL-REPOSITORY.git
```

Replace the example URLs with the actual repository URLs.

### 2. Set up the backend

``` bash
cd server
npm install
```

Create a local environment file using the variable names documented in
the project's README or environment example. Configure your own
development credentials.

Start the backend:

``` bash
npm run dev
```


### 3. Set up the frontend

Open a second terminal from the repository root:

``` bash
cd client
npm install
```

Configure the frontend's `VITE_API_URL` to point to your local backend,
following the README or environment example.

Start the frontend:

``` bash
npm run dev
```

Use the local URL printed by Vite to open the app.

### Environment variables and secrets

-   Never commit `.env` files, API keys, passwords, service-role keys,
    access tokens, or real user data.
-   Use your own development credentials.
-   Keep variable names consistent with the existing configuration and
    documented environment example.
-   Do not hardcode credentials or expose server-only secrets in
    frontend code.
-   If you add a new environment variable, document its purpose and
    update the example environment file with a placeholder value only.

## Development guidelines

-   Follow the existing patterns and code style in the area you are
    changing.
-   Reuse existing authentication, API utilities, and shared components
    where appropriate.
-   Keep changes limited to the issue or feature being addressed.
-   Do not introduce a new dependency unless it is needed; explain why
    in the pull request.
-   Update documentation when setup, configuration, or user-facing
    behavior changes.
-   Add or update tests when practical, and manually test affected
    flows.
-   Do not include generated files, build output, local databases, or
    personal editor settings unless the project requires them.

## Branch and commit conventions

Create a focused branch from the latest upstream default branch. Use a
descriptive name, for example:

``` bash
git fetch upstream
git checkout main
git merge upstream/main
git checkout -b fix/clear-error-message
```

Other branch name examples:

-   `feat/question-import`
-   `docs/local-setup`
-   `test/auth-flow`

Use clear commit messages, such as:

``` text
Fix validation for empty questions
Add setup instructions for local development
```

If the repository's default branch is not `main`, use its actual default
branch name.

## Before opening a pull request

1.  Review your changes and remove unrelated edits.
2.  Run the relevant frontend and/or backend checks available in the
    project.
3.  Start the affected part of the app and test the changed behavior
    where possible.
4.  Confirm that no secrets or private data are included.
5.  Update documentation if needed.

## Open a pull request

1.  Push your branch to your fork:

    ``` bash
    git push -u origin your-branch-name
    ```

2.  Open a pull request from your branch to the original repository's
    default branch.

3.  Use a clear title and explain:

    -   What changed
    -   Why the change is needed
    -   How you tested it
    -   Any related issue (for example, `Closes #123`)

4.  Add screenshots or a short recording for UI changes when helpful.

5.  Respond to review feedback and update your branch as needed.

A maintainer will review the contribution. Changes may be requested
before a pull request is merged.

## Reporting bugs

When opening a bug report, include:

-   A clear description of the issue
-   Steps to reproduce it
-   Expected and actual behavior
-   Relevant error messages or logs, with secrets and personal
    information removed
-   Browser, operating system, and relevant environment details

## Security issues

Please do not report exploitable vulnerabilities in public issues.
Contact the repository maintainer privately using the contact method
listed in the repository profile or README.

## Code of conduct

Be respectful, constructive, and welcoming. Focus feedback on the work,
assume good intent, and help keep the project inclusive for contributors
of different experience levels.

By contributing, you agree that your contributions are provided under
the license stated in the repository's `LICENSE` file.
