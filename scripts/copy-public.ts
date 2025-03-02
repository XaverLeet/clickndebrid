import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get the project root directory (ES module compatible way)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot: string = path.join(__dirname, "..");

// Create the dist/public directory structure
const publicDir: string = path.join(projectRoot, "src", "public");
const distPublicDir: string = path.join(projectRoot, "dist", "public");

// Create directories recursively
function createDirectoryRecursive(targetDir: string): void {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`Created directory: ${targetDir}`);
  }
}

// Copy file
function copyFile(source: string, target: string): void {
  fs.copyFileSync(source, target);
  console.log(`Copied: ${source} -> ${target}`);
}

// Copy directory recursively
function copyDirectory(source: string, target: string): void {
  createDirectoryRecursive(target);

  const files: string[] = fs.readdirSync(source);

  for (const file of files) {
    const sourcePath: string = path.join(source, file);
    const targetPath: string = path.join(target, file);

    const stats: fs.Stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      copyFile(sourcePath, targetPath);
    }
  }
}

// Create the views directory structure
const viewsDir: string = path.join(projectRoot, "src", "views");
const distViewsDir: string = path.join(projectRoot, "dist", "views");

// Copy directories
try {
  // Copy public directory
  if (fs.existsSync(publicDir)) {
    copyDirectory(publicDir, distPublicDir);
    console.log("Public directory copied successfully");
  } else {
    console.log("Public directory does not exist");
  }

  // Copy views directory
  if (fs.existsSync(viewsDir)) {
    copyDirectory(viewsDir, distViewsDir);
    console.log("Views directory copied successfully");
  } else {
    console.log("Views directory does not exist");
  }
} catch (error) {
  console.error("Error copying directories:", error instanceof Error ? error.message : error);
}
