const fs = require("fs");
const path = "../ep-admin/src/services/git/helpers.ts";
let content = fs.readFileSync(path, "utf8");

const cleanIsGitRepository = `export const isGitRepository = (path: string): Effect.Effect<boolean> =>
        Effect.sync(() => {
                try {
                        execSync("git rev-parse --git-dir", { cwd: path, stdio: "ignore" });
                        return true;
                } catch {
                        return false;
                }
        });`;

// Find the start of the function
const startMarker = "export const isGitRepository";
const startIndex = content.indexOf(startMarker);

// Find the start of the next function
const endMarker = "export const getGitRoot";
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    
    // Check if we need to restore the comment for getGitRoot
    // The 'after' part starts with "export const getGitRoot", so we need to put the comment back before it
    const comment = `/**
 * Get git repository root directory
 */
`;
    
    const newContent = before + cleanIsGitRepository + "\n\n" + comment + after;
    fs.writeFileSync(path, newContent);
    console.log("Fixed git/helpers.ts");
} else {
    console.log("Could not find markers");
}
